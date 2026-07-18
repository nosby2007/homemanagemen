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
import { Observable, from, switchMap } from 'rxjs';
import { AccessScopeService } from '../../core/auth/access-scope.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { NotificationService } from '../../core/services/notification.service';
import { TRANSACTION_TRANSITIONS } from '../../core/auth/rbac';
import { TransactionRecord, TransactionStatus } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requireTransactionScope } from '../../core/utils/property-scope';

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private scope = inject(AccessScopeService);
  private activity = inject(ActivityLogService);
  private notifications = inject(NotificationService);

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
        const agentId = scope.agentId || scope.uid;
        const q = scope.isPrivileged
          ? query(this.col(), orderBy('updatedAt', 'desc'), limit(300))
          : query(this.col(), where('agentId', '==', agentId), orderBy('updatedAt', 'desc'), limit(200));
        return collectionData(q, { idField: 'id' }) as any;
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
    return id;
  }

  async update(transactionId: string, patch: Partial<TransactionRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const current = await this.getSnapshot(transactionId);
    if (patch.status && patch.status !== current.status) {
      const allowed = TRANSACTION_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(patch.status)) {
        throw new Error(`Invalid transaction status transition: ${current.status} -> ${patch.status}`);
      }
      await this.activity.write({
        entityType: 'transaction',
        entityId: transactionId,
        action: 'statusChanged',
        message: `Transaction status changed: ${current.status} → ${patch.status}`,
        metadata: { fromStatus: current.status, toStatus: patch.status },
      });
    }
    await updateDoc(doc(this.fs, `orgs/${orgId}/transactions/${transactionId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
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
