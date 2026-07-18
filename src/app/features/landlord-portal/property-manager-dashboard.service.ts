/**
 * PropertyManagerDashboardService — Phase 2.5
 *
 * Property managers see only their assigned properties (via propertyAssignments).
 * Roles covered: property_manager, manager
 */
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { OrgContextService } from '../../core/org/org-context.service';
import { Observable, of, from, combineLatest } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Property } from '../../core/models/property.models';
import { PropertyAssignment } from '../../core/models/domain.models';
import { MaintenanceRequest } from '../maintenance/maintenance.service';
import { Tenant } from '../tenants/tenants.service';

export interface PropertyManagerKPIs {
  totalProperties: number;
  occupiedUnits: number;
  vacantUnits: number;
  activeTenants: number;
  openMaintenance: number;
  pendingInvitations: number;
}

@Injectable({ providedIn: 'root' })
export class PropertyManagerDashboardService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  private get uid(): string {
    return this.auth.currentUser?.uid ?? '';
  }

  private get orgId(): string {
    return this.org.orgId;
  }

  // ─── Assigned Property IDs ───────────────────────────────────────────────

  getAssignedPropertyIds(): Observable<string[]> {
    if (!this.orgId || !this.uid) return of([]);
    const q = query(
      collection(this.fs, 'propertyAssignments'),
      where('orgId', '==', this.orgId),
      where('userId', '==', this.uid),
      where('role', 'in', ['property_manager', 'manager']),
      where('status', '==', 'active'),
      limit(300),
    );
    return from(getDocs(q)).pipe(
      map((snap) => {
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const pid = String((d.data() as any)?.propertyId ?? '').trim();
          if (pid) ids.add(pid);
        });
        return Array.from(ids);
      }),
      catchError(() => of([])),
    );
  }

  getAssignments(): Observable<PropertyAssignment[]> {
    if (!this.orgId || !this.uid) return of([]);
    const q = query(
      collection(this.fs, 'propertyAssignments'),
      where('orgId', '==', this.orgId),
      where('userId', '==', this.uid),
      where('role', 'in', ['property_manager', 'manager']),
      where('status', '==', 'active'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<PropertyAssignment[]>;
  }

  // ─── Properties ──────────────────────────────────────────────────────────

  getProperties(): Observable<Property[]> {
    if (!this.orgId) return of([]);
    return this.getAssignedPropertyIds().pipe(
      switchMap((ids) => {
        if (!ids.length) return of([]);
        const q = query(
          collection(this.fs, `orgs/${this.orgId}/properties`),
          where('id', 'in', ids.slice(0, 10)),
          orderBy('updatedAt', 'desc'),
          limit(100),
        );
        return collectionData(q, { idField: 'id' }) as Observable<Property[]>;
      }),
      catchError(() => of([])),
    );
  }

  // ─── Tenants ─────────────────────────────────────────────────────────────

  getActiveTenants(): Observable<Tenant[]> {
    if (!this.orgId) return of([]);
    return this.getAssignedPropertyIds().pipe(
      switchMap((ids) => {
        if (!ids.length) return of([]);
        const q = query(
          collection(this.fs, `orgs/${this.orgId}/tenants`),
          where('currentPropertyId', 'in', ids.slice(0, 10)),
          where('status', '==', 'active'),
          orderBy('updatedAt', 'desc'),
          limit(100),
        );
        return collectionData(q, { idField: 'id' }) as Observable<Tenant[]>;
      }),
      catchError(() => of([])),
    );
  }

  // ─── Maintenance ─────────────────────────────────────────────────────────

  getOpenMaintenance(): Observable<MaintenanceRequest[]> {
    if (!this.orgId) return of([]);
    return this.getAssignedPropertyIds().pipe(
      switchMap((ids) => {
        if (!ids.length) return of([]);
        const q = query(
          collection(this.fs, `orgs/${this.orgId}/maintenanceRequests`),
          where('propertyId', 'in', ids.slice(0, 10)),
          where('status', 'in', ['new', 'in_progress']),
          orderBy('updatedAt', 'desc'),
          limit(50),
        );
        return collectionData(q, { idField: 'id' }) as Observable<MaintenanceRequest[]>;
      }),
      catchError(() => of([])),
    );
  }

  // ─── KPIs ────────────────────────────────────────────────────────────────

  getKPIs(): Observable<PropertyManagerKPIs> {
    return combineLatest([
      this.getProperties(),
      this.getActiveTenants(),
      this.getOpenMaintenance(),
    ]).pipe(
      map(([properties, tenants, maintenance]) => ({
        totalProperties: properties.length,
        occupiedUnits: properties.filter((p) => p.status === 'occupied').length,
        vacantUnits: properties.filter((p) => p.status === 'available').length,
        activeTenants: tenants.length,
        openMaintenance: maintenance.length,
        pendingInvitations: 0, // loaded separately if needed
      })),
      catchError(() =>
        of({
          totalProperties: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          activeTenants: 0,
          openMaintenance: 0,
          pendingInvitations: 0,
        }),
      ),
    );
  }
}
