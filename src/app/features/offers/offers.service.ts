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
import { OFFER_TRANSITIONS } from '../../core/auth/rbac';
import { OfferRecord, OfferStatus } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requireOfferScope } from '../../core/utils/property-scope';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable({ providedIn: 'root' })
export class OffersService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private scope = inject(AccessScopeService);
  private activity = inject(ActivityLogService);
  private notifications = inject(NotificationService);
  private transactions = inject(TransactionsService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col() {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/offers`);
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

  listByStatus(status: OfferStatus) {
    const q = query(this.col(), where('status', '==', status), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(offerId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/offers/${offerId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<OfferRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const { propertyId, listingId, buyerId } = requireOfferScope(payload as Record<string, unknown>);

    const data: OfferRecord = {
      id,
      orgId,
      propertyId,
      listingId,
      buyerId,
      sellerId: payload.sellerId,
      agentId: payload.agentId,
      offerAmount: Number(payload.offerAmount || 0),
      earnestMoney: payload.earnestMoney,
      contingencies: payload.contingencies,
      closingDate: payload.closingDate,
      agencyId: payload.agencyId,
      status: payload.status ?? 'submitted',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/offers/${id}`), stripUndefined(data) as any);
    try {
      await this.activity.write({
        entityType: 'offer',
        entityId: id,
        action: 'created',
        message: `Offer submitted: $${data.offerAmount}`,
        metadata: { propertyId: data.propertyId, listingId: data.listingId, offerAmount: data.offerAmount },
      });
      await this.notifications.create({
        userUid: uid,
        title: 'Offer submitted',
        message: `Offer of $${data.offerAmount} submitted`,
        level: 'success',
        metadata: { offerId: id },
      });
    } catch (err) {
      console.error('Offer created, but activity log/notification failed', err);
    }
    return id;
  }

  async update(offerId: string, patch: Partial<OfferRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const current = await this.getSnapshot(offerId);
    const statusChanging = !!patch.status && patch.status !== current.status;
    if (statusChanging) {
      const allowed = OFFER_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(patch.status!)) {
        throw new Error(`Invalid offer status transition: ${current.status} -> ${patch.status}`);
      }
      try {
        await this.activity.write({
          entityType: 'offer',
          entityId: offerId,
          action: 'statusChanged',
          message: `Offer status changed: ${current.status} → ${patch.status}`,
          metadata: { fromStatus: current.status, toStatus: patch.status },
        });
      } catch (err) {
        console.error('Failed to log offer status change', err);
      }
    }
    await updateDoc(doc(this.fs, `orgs/${orgId}/offers/${offerId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);

    if (statusChanging && patch.status === 'accepted') {
      try {
        await this.transactions.create({
          propertyId: current.propertyId,
          listingId: current.listingId,
          buyerId: current.buyerId,
          sellerId: current.sellerId,
          agentId: current.agentId,
          salePrice: current.offerAmount,
          agencyId: current.agencyId,
        });
      } catch (err) {
        console.error('Failed to auto-create transaction from accepted offer', err);
      }
    }
  }

  private async getSnapshot(offerId: string): Promise<OfferRecord> {
    const orgId = this.org.requireOrgId();
    const snap = await getDoc(doc(this.fs, `orgs/${orgId}/offers/${offerId}`));
    if (!snap.exists()) throw new Error('Offer not found');
    return snap.data() as OfferRecord;
  }

  async remove(offerId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/offers/${offerId}`));
  }
}
