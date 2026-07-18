/**
 * TenantDashboardService — Phase 2 (property-scoped)
 *
 * Data access for the tenant portal:
 *  1. Resolve propertyAssignment for current user (role=tenant, status=active)
 *  2. Load tenant profile via assignment.targetId (O(1) direct lookup)
 *  3. Load assigned property and unit
 *  4. Load active lease scoped to orgId/propertyId
 *  5. Load payments, maintenance scoped to that context
 *
 * NEVER queries all-org tenants list from the tenant portal.
 */
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { OrgContextService } from '../../core/org/org-context.service';
import { Observable, of, from, combineLatest } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Tenant } from '../tenants/tenants.service';
import { Lease } from '../leases/leases.service';
import { Payment } from '../payments/payments.service';
import { MaintenanceRequest } from '../maintenance/maintenance.service';
import { Property } from '../../core/models/property.models';
import { PropertyAssignment } from '../../core/models/domain.models';

export interface TenantPortalContext {
  assignment: PropertyAssignment | null;
  tenantProfile: Tenant | null;
  property: Property | null;
  activeLease: Lease | null;
  recentPayments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
  openMaintenanceCount: number;
}

/** @deprecated use TenantPortalContext */
export interface TenantContext extends TenantPortalContext {}

@Injectable({ providedIn: 'root' })
export class TenantDashboardService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  private get uid(): string {
    const u = this.auth.currentUser?.uid;
    if (!u) throw new Error('Not authenticated');
    return u;
  }

  private get orgId(): string {
    return this.org.orgId;
  }

  // ─── Property Assignment ─────────────────────────────────────────────────

  /** Resolve the active tenant propertyAssignment for the current user. */
  getActiveAssignment(): Observable<PropertyAssignment | null> {
    if (!this.orgId) return of(null);
    const q = query(
      collection(this.fs, 'propertyAssignments'),
      where('orgId', '==', this.orgId),
      where('userId', '==', this.uid),
      where('role', '==', 'tenant'),
      where('status', '==', 'active'),
      limit(1),
    );
    return from(getDocs(q)).pipe(
      map((snap) =>
        snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as PropertyAssignment),
      ),
      catchError(() => of(null)),
    );
  }

  // ─── Tenant Profile ───────────────────────────────────────────────────────

  /**
   * Resolve tenant profile for the logged-in user.
   * Prefers propertyAssignment.targetId for O(1) lookup.
   * Falls back to querying by userId for legacy docs.
   */
  getTenantProfile(): Observable<Tenant | null> {
    if (!this.orgId) return of(null);
    return this.getActiveAssignment().pipe(
      switchMap((assignment) => {
        if (assignment?.targetId) {
          return docData(
            doc(this.fs, `orgs/${this.orgId}/tenants/${assignment.targetId}`),
            { idField: 'id' },
          ).pipe(
            map((d) => (d ? (d as Tenant) : null)),
            catchError(() => of(null)),
          );
        }
        // Fallback: query by normalized userId
        const q = query(
          collection(this.fs, `orgs/${this.orgId}/tenants`),
          where('userId', '==', this.uid),
          limit(1),
        );
        return collectionData(q, { idField: 'id' }).pipe(
          map((docs: any[]) => (docs.length ? (docs[0] as Tenant) : null)),
          catchError(() => {
            // Legacy fallback for userUid field
            const q2 = query(
              collection(this.fs, `orgs/${this.orgId}/tenants`),
              where('userUid', '==', this.uid),
              limit(1),
            );
            return collectionData(q2, { idField: 'id' }).pipe(
              map((docs: any[]) => (docs.length ? (docs[0] as Tenant) : null)),
              catchError(() => of(null)),
            );
          }),
        );
      }),
    );
  }

  // ─── Property ────────────────────────────────────────────────────────────

  getProperty(propertyId: string): Observable<Property | null> {
    if (!this.orgId || !propertyId) return of(null);
    return docData(doc(this.fs, `orgs/${this.orgId}/properties/${propertyId}`), { idField: 'id' }).pipe(
      map((d) => (d ? (d as Property) : null)),
      catchError(() => of(null)),
    );
  }

  getTenantProperty(): Observable<Property | null> {
    return this.getActiveAssignment().pipe(
      switchMap((a) => (a?.propertyId ? this.getProperty(a.propertyId) : of(null))),
    );
  }

  // ─── Unit ────────────────────────────────────────────────────────────────

  getTenantUnit(): Observable<any | null> {
    return this.getActiveAssignment().pipe(
      switchMap((a) => {
        if (!a?.propertyId || !a?.unitId) return of(null);
        return docData(
          doc(this.fs, `orgs/${this.orgId}/properties/${a.propertyId}/units/${a.unitId}`),
          { idField: 'id' },
        ).pipe(
          map((d) => d ?? null),
          catchError(() => of(null)),
        );
      }),
    );
  }

  // ─── Lease ───────────────────────────────────────────────────────────────

  /** Get active lease scoped to propertyId (from assignment). */
  getActiveLease(tenantProfileId: string): Observable<Lease | null> {
    return this.getActiveAssignment().pipe(
      switchMap((assignment) => {
        const propertyId = assignment?.propertyId;
        if (!this.orgId || !tenantProfileId || !propertyId) return of(null);
        const q = query(
          collection(this.fs, `orgs/${this.orgId}/properties/${propertyId}/leases`),
          where('tenantId', '==', tenantProfileId),
          where('status', '==', 'active'),
          limit(1),
        );
        return collectionData(q, { idField: 'id' }).pipe(
          map((docs: any[]) => (docs.length ? (docs[0] as Lease) : null)),
          catchError(() => of(null)),
        );
      }),
    );
  }

  getTenantActiveLease(): Observable<Lease | null> {
    return this.getTenantProfile().pipe(
      switchMap((profile) => (profile?.id ? this.getActiveLease(profile.id) : of(null))),
    );
  }

  // ─── Payments ────────────────────────────────────────────────────────────

  getRecentPayments(propertyId: string, leaseId: string): Observable<Payment[]> {
    if (!this.orgId || !propertyId || !leaseId) return of([]);
    const q = query(
      collection(this.fs, `orgs/${this.orgId}/properties/${propertyId}/leases/${leaseId}/payments`),
      orderBy('createdAt', 'desc'),
      limit(12),
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map((docs) => docs as Payment[]),
      catchError(() => of([])),
    );
  }

  getTenantPayments(): Observable<Payment[]> {
    return this.getTenantProfile().pipe(
      switchMap((profile) => {
        if (!profile?.id) return of([]);
        return this.getActiveLease(profile.id).pipe(
          switchMap((lease) =>
            lease?.propertyId && lease?.id
              ? this.getRecentPayments(lease.propertyId, lease.id)
              : of([]),
          ),
        );
      }),
    );
  }

  // ─── Maintenance ─────────────────────────────────────────────────────────

  getMaintenanceRequests(): Observable<MaintenanceRequest[]> {
    if (!this.orgId) return of([]);
    const q = query(
      collection(this.fs, `orgs/${this.orgId}/maintenanceRequests`),
      where('tenantUid', '==', this.uid),
      orderBy('updatedAt', 'desc'),
      limit(20),
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map((docs) => docs as MaintenanceRequest[]),
      catchError(() => of([])),
    );
  }

  getTenantMaintenanceRequests(): Observable<MaintenanceRequest[]> {
    return this.getMaintenanceRequests();
  }
}
