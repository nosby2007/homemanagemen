import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class DashboardScopedService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private requireOrgId(): string {
    return this.org.requireOrgId();
  }

  private async getAssignedPropertyIds(uid: string, orgId: string): Promise<string[]> {
    const snap = await getDocs(
      query(
        collection(this.fs, 'propertyAssignments'),
        where('orgId', '==', orgId),
        where('userId', '==', uid),
        where('status', '==', 'active'),
        limit(500),
      ),
    );

    const ids = new Set<string>();
    snap.docs.forEach((d) => {
      const propertyId = String((d.data() as any)?.propertyId || '').trim();
      if (propertyId) ids.add(propertyId);
    });
    return Array.from(ids);
  }

  async getTenantPortalData(userId?: string) {
    const uid = userId || this.requireUid();
    const orgId = this.requireOrgId();

    const tenantSnap = await getDocs(
      query(
        collection(this.fs, 'tenants'),
        where('orgId', '==', orgId),
        where('userId', '==', uid),
        limit(1),
      ),
    );

    if (tenantSnap.empty) return null;
    const tenant = { id: tenantSnap.docs[0].id, ...(tenantSnap.docs[0].data() as any) };

    const [leaseSnap, paymentsSnap, docsSnap, maintenanceSnap] = await Promise.all([
      getDocs(query(collection(this.fs, 'leases'), where('orgId', '==', orgId), where('tenantId', '==', tenant.id), where('status', '==', 'active'), limit(1))),
      getDocs(query(collection(this.fs, 'payments'), where('orgId', '==', orgId), where('tenantId', '==', tenant.id), limit(100))),
      getDocs(query(collection(this.fs, 'documents'), where('orgId', '==', orgId), where('tenantId', '==', tenant.id), limit(100))),
      getDocs(query(collection(this.fs, 'maintenanceRequests'), where('orgId', '==', orgId), where('tenantId', '==', tenant.id), limit(100))),
    ]);

    return {
      tenant,
      lease: leaseSnap.empty ? null : { id: leaseSnap.docs[0].id, ...(leaseSnap.docs[0].data() as any) },
      payments: paymentsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      documents: docsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
      maintenance: maintenanceSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
    };
  }

  async getLandlordPortalData(userId?: string) {
    const uid = userId || this.requireUid();
    const orgId = this.requireOrgId();
    const propertyIds = await this.getAssignedPropertyIds(uid, orgId);
    if (!propertyIds.length) return { properties: [], units: [], tenants: [], leases: [], payments: [], maintenance: [], documents: [] };

    const [properties, units, tenants, leases, payments, maintenance, documents] = await Promise.all([
      getDocs(query(collection(this.fs, 'properties'), where('orgId', '==', orgId), where('id', 'in', propertyIds.slice(0, 10)))),
      getDocs(query(collection(this.fs, 'units'), where('orgId', '==', orgId), where('propertyId', 'in', propertyIds.slice(0, 10)))),
      getDocs(query(collection(this.fs, 'tenants'), where('orgId', '==', orgId), where('propertyId', 'in', propertyIds.slice(0, 10)))),
      getDocs(query(collection(this.fs, 'leases'), where('orgId', '==', orgId), where('propertyId', 'in', propertyIds.slice(0, 10)))),
      getDocs(query(collection(this.fs, 'payments'), where('orgId', '==', orgId), where('propertyId', 'in', propertyIds.slice(0, 10)))),
      getDocs(query(collection(this.fs, 'maintenanceRequests'), where('orgId', '==', orgId), where('propertyId', 'in', propertyIds.slice(0, 10)))),
      getDocs(query(collection(this.fs, 'documents'), where('orgId', '==', orgId), where('propertyId', 'in', propertyIds.slice(0, 10)))),
    ]);

    const toRows = (snap: any) => snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    return {
      properties: toRows(properties),
      units: toRows(units),
      tenants: toRows(tenants),
      leases: toRows(leases),
      payments: toRows(payments),
      maintenance: toRows(maintenance),
      documents: toRows(documents),
    };
  }

  async getPropertyManagerPortalData(userId?: string) {
    return this.getLandlordPortalData(userId);
  }

  async getPropertyById(propertyId: string) {
    const snap = await getDoc(doc(this.fs, `properties/${propertyId}`));
    return snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null;
  }
}
