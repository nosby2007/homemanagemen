import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  getDoc,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  Timestamp
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { OrgContextService } from '../../core/org/org-context.service';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requireLeaseScope } from '../../core/utils/property-scope';
import { UnitsService } from '../units/units.service';
import { TenantsService } from '../tenants/tenants.service';
import { PropertiesService } from '../properties/properties.service';


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
  private properties = inject(PropertiesService);

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

  /** Aggregates leases across every property in the org (loops the already-ruled per-property collection). */
  async listAllForOrg(): Promise<Lease[]> {
    const properties = await firstValueFrom(this.properties.list());
    const perProperty = await Promise.all(
      (properties as any[]).map((p) =>
        firstValueFrom(this.list(String(p.id))).catch(() => [] as Lease[])
      )
    );
    return (perProperty as Lease[][]).flat();
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
    const leaseRef = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/leases/${leaseId}`);
    const leaseSnap = await getDoc(leaseRef);
    const lease = leaseSnap.exists() ? (leaseSnap.data() as Lease) : null;

    await deleteDoc(leaseRef);

    // Reverse the linkage create() applied - but only if the unit/tenant still points at
    // *this* lease, so we don't clobber a newer lease that's since taken its place.
    if (lease?.unitId) {
      try {
        const unitSnap = await getDoc(doc(this.fs, `orgs/${orgId}/units/${lease.unitId}`));
        if (unitSnap.exists() && (unitSnap.data() as any)?.activeLeaseId === leaseId) {
          await this.units.update(lease.unitId, {
            activeTenantId: null,
            activeLeaseId: null,
            status: 'vacant',
          } as any);
        }
      } catch {
        // Best-effort cleanup; the lease itself is already deleted.
      }
    }

    if (lease?.tenantId) {
      try {
        const tenantSnap = await getDoc(doc(this.fs, `orgs/${orgId}/tenants/${lease.tenantId}`));
        if (tenantSnap.exists() && (tenantSnap.data() as any)?.currentLeaseId === leaseId) {
          await this.tenants.update(lease.tenantId, {
            currentLeaseId: null,
            status: 'inactive',
          } as any);
        }
      } catch {
        // Best-effort cleanup; the lease itself is already deleted.
      }
    }
  }
  Timestamp = Timestamp;
}
