import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  Timestamp
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requireLeaseScope } from '../../core/utils/property-scope';
import { UnitsService } from '../units/units.service';
import { TenantsService } from '../tenants/tenants.service';


export type LeaseStatus = 'active' | 'pending' | 'expired' | 'terminated';
export interface Lease {
  id: string;
  orgId: string;
  propertyId: string;
  tenantId: string;
  unitId?: string;
  landlordId?: string;
  startDate: Timestamp | number;
  endDate?: Timestamp | null;
  monthlyRent: number;
  securityDeposit: number;
  status: LeaseStatus;
  utilitiesIncluded?: boolean;
  createdAt: Timestamp | number;
  createdBy: string;
  updatedAt: Timestamp | number;
  updatedBy: string;
  paymentDueDay?: number;
  leaseTerm?: Timestamp | number;
}

@Injectable({ providedIn: 'root' })
export class LeasesService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private units = inject(UnitsService);
  private tenants = inject(TenantsService);

  private requireUid(): string {
    const u = this.auth.currentUser?.uid;
    if (!u) throw new Error('Not authenticated');
    return u;
  }

  private requireOrgId(): string {
    return this.org.requireOrgId(); // IMPORTANT: do not use this.org.orgId directly
  }

  private leasesCol(propertyId: string) {
    const orgId = this.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/properties/${propertyId}/leases`);
  }

  list(propertyId: string) {
    const q = query(this.leasesCol(propertyId), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(propertyId: string, leaseId: string) {
    const orgId = this.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}`), { idField: 'id' }) as any;
  }

  async create(propertyId: string, payload: Partial<Lease>) {
    const { propertyId: normalizedPropertyId, tenantId, unitId } = requireLeaseScope({
      propertyId,
      tenantId: payload.tenantId,
      unitId: payload.unitId,
    });

    const orgId = this.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();

    const data: Lease = {
      id,
      orgId,
      propertyId: normalizedPropertyId,
      tenantId,
      unitId,
      landlordId: payload.landlordId ? String(payload.landlordId) : undefined,
      startDate: Number(payload.startDate || now),
      endDate: payload.endDate ?? null,
      monthlyRent: Number(payload.monthlyRent || 0),
      securityDeposit: Number(payload.securityDeposit || 0),
      leaseTerm: payload.leaseTerm,
      utilitiesIncluded: Boolean(payload.utilitiesIncluded || false),
      paymentDueDay: payload.paymentDueDay,
      status: payload.status || 'active',
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    };

    await setDoc(
      doc(this.fs, `orgs/${orgId}/properties/${normalizedPropertyId}/leases/${id}`),
      stripUndefined(data) as any
    );

    if (data.unitId && data.tenantId) {
      await this.units.update(data.unitId, {
        activeTenantId: data.tenantId,
        activeLeaseId: id,
        status: 'occupied',
      });
    }

    if (data.tenantId) {
      await this.tenants.update(data.tenantId, {
        currentPropertyId: normalizedPropertyId,
        currentUnitId: data.unitId,
        currentLeaseId: id,
        status: 'active',
      });
    }

    return id;
  }

  async update(propertyId: string, leaseId: string, patch: Partial<Lease>) {
    const orgId = this.requireOrgId();
    const uid = this.requireUid();
    await updateDoc(
      doc(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}`),
      stripUndefined({
        ...patch,
        updatedAt: Date.now(),
        updatedBy: uid,
      } as any) as any
    );
  }
  async delete(propertyId: string, leaseId: string) {
    const orgId = this.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}`));
  }
  Timestamp = Timestamp;
}
