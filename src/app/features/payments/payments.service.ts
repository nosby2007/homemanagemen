import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requirePaymentScope } from '../../core/utils/property-scope';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'cancelled' | 'new';

export interface Payment {
  id: string;
  orgId: string;
  propertyId: string;
  leaseId: string;
  unitId?: string;
  landlordId?: string;

  status: PaymentStatus;
  amount?: number;
  dueDate?: number;
  paidAt?: number;

  // Optional but recommended for tenant portal tracking
  tenantUid?: string;      // auth uid of tenant payer (recommended)
  tenantId?: string;       // your internal tenant doc id (optional)
  method?: string;         // card, ach, cash, etc.
  reference?: string;      // external payment reference

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;

  [k: string]: any;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private activity = inject(ActivityLogService);
  private notifications = inject(NotificationService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private leasePaymentsCol(propertyId: string, leaseId: string) {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}/payments`);
  }

  list(propertyId: string, leaseId: string) {
    const q = query(this.leasePaymentsCol(propertyId, leaseId), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(propertyId: string, leaseId: string, paymentId: string) {
    const orgId = this.org.requireOrgId();
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}/payments/${paymentId}`);
    return docData(ref, { idField: 'id' }) as any;
  }

  async create(propertyId: string, leaseId: string, payload: Partial<Payment>) {
    const {
      propertyId: normalizedPropertyId,
      leaseId: normalizedLeaseId,
      tenantId,
      unitId,
    } = requirePaymentScope({ propertyId, leaseId, tenantId: payload.tenantId, unitId: payload.unitId });

    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();

    const data: Payment = {
      id,
      orgId,
      propertyId: normalizedPropertyId,
      leaseId: normalizedLeaseId,
      unitId,
      landlordId: payload.landlordId ?? undefined,

      status: (payload.status as any) ?? 'pending',
      amount: payload.amount ?? undefined,
      dueDate: payload.dueDate ?? undefined,
      paidAt: payload.paidAt ?? undefined,

      // tenant portal: record payer uid (safe + useful)
      tenantUid: payload.tenantUid ?? uid,
      tenantId,

      method: payload.method ?? undefined,
      reference: payload.reference ?? undefined,

      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,

      ...stripUndefined(payload as any),
    };

    const ref = doc(this.fs, `orgs/${orgId}/properties/${normalizedPropertyId}/leases/${normalizedLeaseId}/payments/${id}`);
    await setDoc(ref, stripUndefined(data) as any);
    await this.activity.write({
      entityType: 'payment',
      entityId: id,
      action: 'created',
      message: `Payment recorded for lease ${normalizedLeaseId}`,
      metadata: { propertyId: normalizedPropertyId, leaseId: normalizedLeaseId, amount: data.amount, status: data.status },
    });
    await this.notifications.create({
      userUid: uid,
      title: 'Payment recorded',
      message: `Amount ${Number(data.amount || 0).toFixed(2)} was saved successfully.`,
      level: 'success',
      metadata: { paymentId: id, propertyId: normalizedPropertyId, leaseId: normalizedLeaseId },
    });
    return id;
  }

  async update(propertyId: string, leaseId: string, paymentId: string, patch: Partial<Payment>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}/payments/${paymentId}`);

    await updateDoc(ref, {
      ...stripUndefined(patch as any),
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any);
  }

  async remove(propertyId: string, leaseId: string, paymentId: string) {
    const orgId = this.org.requireOrgId();
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}/payments/${paymentId}`);
    await deleteDoc(ref);
  }

  async createUnderLease(propertyId: string, leaseId: string, payload: any) {
    const {
      propertyId: normalizedPropertyId,
      leaseId: normalizedLeaseId,
      tenantId,
      unitId,
    } = requirePaymentScope({ propertyId, leaseId, tenantId: payload?.tenantId, unitId: payload?.unitId });

    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();

    const data = {
      id,
      orgId,
      propertyId: normalizedPropertyId,
      leaseId: normalizedLeaseId,
      tenantId,
      unitId,
      status: payload.status ?? 'pending',
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
      ...stripUndefined(payload),
    };

    const ref = doc(this.fs, `orgs/${orgId}/properties/${normalizedPropertyId}/leases/${normalizedLeaseId}/payments/${id}`);
    await setDoc(ref, stripUndefined(data) as any);
    return id;
  }

 listUnderLease(propertyId: string, leaseId: string) {
  const orgId = this.org.requireOrgId();
  const colRef = collection(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}/payments`);
  const q = query(colRef, orderBy('updatedAt', 'desc'), limit(200));
  return collectionData(q, { idField: 'id' }) as any;
}

}
