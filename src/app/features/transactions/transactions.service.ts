import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  getDoc,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, from, of, switchMap } from 'rxjs';
import { AccessScopeService } from '../../core/auth/access-scope.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { NotificationService } from '../../core/services/notification.service';
import { TRANSACTION_TRANSITIONS } from '../../core/auth/rbac';
import { TransactionRecord, TransactionStatus } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requireTransactionScope } from '../../core/utils/property-scope';
import { CommissionsService } from '../commissions/commissions.service';

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private scope = inject(AccessScopeService);
  private activity = inject(ActivityLogService);
  private notifications = inject(NotificationService);
  private commissions = inject(CommissionsService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col() {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/transactions`);
  }

  list(): Observable<any[]> {
    return from(this.scope.getCurrentScope()).pipe(
      switchMap((scope) => {
        if (scope.isPrivileged) {
          return collectionData(query(this.col(), orderBy('updatedAt', 'desc'), limit(300)), { idField: 'id' }) as any;
        }
        if (scope.role === 'buyer' || scope.role === 'seller' || scope.role === 'client') {
          const ids = (scope.clientIds || []).slice(0, 10);
          if (!ids.length) return of([]);
          const field = scope.role === 'seller' ? 'sellerId' : 'buyerId';
          return collectionData(query(this.col(), where(field, 'in', ids), orderBy('updatedAt', 'desc'), limit(200)), { idField: 'id' }) as any;
        }
        const agentId = scope.agentId || scope.uid;
        return collectionData(query(this.col(), where('agentId', '==', agentId), orderBy('updatedAt', 'desc'), limit(200)), { idField: 'id' }) as any;
      }),
    ) as any;
  }

  listByStatus(status: TransactionStatus) {
    const q = query(this.col(), where('status', '==', status), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(transactionId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/transactions/${transactionId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<TransactionRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const { propertyId } = requireTransactionScope(payload as Record<string, unknown>);

    const data: TransactionRecord = {
      id,
      orgId,
      propertyId,
      listingId: payload.listingId,
      buyerId: payload.buyerId,
      sellerId: payload.sellerId,
      agentId: payload.agentId,
      contractDate: payload.contractDate,
      closingDate: payload.closingDate,
      salePrice: payload.salePrice,
      commissionRate: payload.commissionRate,
      commissionAmount: payload.commissionAmount,
      agencyId: payload.agencyId,
      status: payload.status ?? 'open',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/transactions/${id}`), stripUndefined(data) as any);
    try {
      await this.activity.write({
        entityType: 'transaction',
        entityId: id,
        action: 'created',
        message: `Transaction created: Sale Price $${data.salePrice}`,
        metadata: { propertyId: data.propertyId, listingId: data.listingId, salePrice: data.salePrice },
      });
      await this.notifications.create({
        userUid: uid,
        title: 'Transaction created',
        message: `New transaction for $${data.salePrice}`,
        level: 'success',
        metadata: { transactionId: id },
      });
    } catch (err) {
      console.error('Transaction created, but activity log/notification failed', err);
    }
    return id;
  }

  async update(transactionId: string, patch: Partial<TransactionRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const current = await this.getSnapshot(transactionId);
    const statusChanging = !!patch.status && patch.status !== current.status;
    if (statusChanging) {
      const allowed = TRANSACTION_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(patch.status!)) {
        throw new Error(`Invalid transaction status transition: ${current.status} -> ${patch.status}`);
      }
      try {
        await this.activity.write({
          entityType: 'transaction',
          entityId: transactionId,
          action: 'statusChanged',
          message: `Transaction status changed: ${current.status} → ${patch.status}`,
          metadata: { fromStatus: current.status, toStatus: patch.status },
        });
      } catch (err) {
        console.error('Failed to log transaction status change', err);
      }
    }
    await updateDoc(doc(this.fs, `orgs/${orgId}/transactions/${transactionId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);

    if (statusChanging && patch.status === 'closed') {
      try {
        const grossCommission = current.salePrice && current.commissionRate
          ? Number(current.salePrice) * (Number(current.commissionRate) / 100)
          : undefined;
        await this.commissions.create({
          transactionId,
          agentId: current.agentId,
          salePrice: current.salePrice,
          commissionRate: current.commissionRate,
          grossCommission,
          netCommission: grossCommission,
          closingDate: current.closingDate,
          agencyId: current.agencyId,
        });
      } catch (err) {
        console.error('Failed to auto-create commission from closed transaction', err);
      }
    }
  }

  private async getSnapshot(transactionId: string): Promise<TransactionRecord> {
    const orgId = this.org.requireOrgId();
    const snap = await getDoc(doc(this.fs, `orgs/${orgId}/transactions/${transactionId}`));
    if (!snap.exists()) throw new Error('Transaction not found');
    return snap.data() as TransactionRecord;
  }

  async remove(transactionId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/transactions/${transactionId}`));
  }
}
