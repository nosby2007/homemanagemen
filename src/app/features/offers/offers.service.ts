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
import { OFFER_TRANSITIONS } from '../../core/auth/rbac';
import { OfferRecord, OfferStatus } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requireOfferScope } from '../../core/utils/property-scope';

@Injectable({ providedIn: 'root' })
export class OffersService {
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
    return collection(this.fs, `orgs/${orgId}/offers`);
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
    return id;
  }

  async update(offerId: string, patch: Partial<OfferRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const current = await this.getSnapshot(offerId);
    if (patch.status && patch.status !== current.status) {
      const allowed = OFFER_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(patch.status)) {
        throw new Error(`Invalid offer status transition: ${current.status} -> ${patch.status}`);
      }
      await this.activity.write({
        entityType: 'offer',
        entityId: offerId,
        action: 'statusChanged',
        message: `Offer status changed: ${current.status} → ${patch.status}`,
        metadata: { fromStatus: current.status, toStatus: patch.status },
      });
    }
    await updateDoc(doc(this.fs, `orgs/${orgId}/offers/${offerId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
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
