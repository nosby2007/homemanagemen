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
import { COMMISSION_TRANSITIONS } from '../../core/auth/rbac';
import { CommissionRecord } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requireCommissionScope } from '../../core/utils/property-scope';

@Injectable({ providedIn: 'root' })
export class CommissionsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private scope = inject(AccessScopeService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col() {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/commissions`);
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

  listByPaymentStatus(paymentStatus: 'pending' | 'paid' | 'partial') {
    const q = query(this.col(), where('paymentStatus', '==', paymentStatus), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(commissionId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/commissions/${commissionId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<CommissionRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const { transactionId } = requireCommissionScope(payload as Record<string, unknown>);

    const grossCommission = Number(payload.grossCommission ?? 0);
    const referralFee = Number(payload.referralFee ?? 0);
    const agentSplit = Number(payload.agentSplit ?? 0);
    const agencySplit = Number(payload.agencySplit ?? 0);
    const netCommission = Number(payload.netCommission ?? grossCommission - referralFee);

    const data: CommissionRecord = {
      id,
      orgId,
      transactionId,
      agentId: payload.agentId,
      salePrice: payload.salePrice,
      commissionRate: payload.commissionRate,
      grossCommission,
      agentSplit,
      agencySplit,
      referralFee,
      netCommission,
      paymentStatus: payload.paymentStatus ?? 'pending',
      closingDate: payload.closingDate,
      agencyId: payload.agencyId,
      status: payload.status ?? 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/commissions/${id}`), stripUndefined(data) as any);
    return id;
  }

  async update(commissionId: string, patch: Partial<CommissionRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    if (patch.paymentStatus) {
      const current = await this.getSnapshot(commissionId);
      const currentStatus = current.paymentStatus ?? 'pending';
      const allowed = COMMISSION_TRANSITIONS[currentStatus] ?? [];
      if (patch.paymentStatus !== currentStatus && !allowed.includes(patch.paymentStatus)) {
        throw new Error(`Invalid commission payment transition: ${currentStatus} -> ${patch.paymentStatus}`);
      }
    }
    await updateDoc(doc(this.fs, `orgs/${orgId}/commissions/${commissionId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
  }

  private async getSnapshot(commissionId: string): Promise<CommissionRecord> {
    const orgId = this.org.requireOrgId();
    const snap = await getDoc(doc(this.fs, `orgs/${orgId}/commissions/${commissionId}`));
    if (!snap.exists()) throw new Error('Commission not found');
    return snap.data() as CommissionRecord;
  }

  async remove(commissionId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/commissions/${commissionId}`));
  }
}
