/**
 * LandlordDashboardService
 *
 * Fetches KPI data for the landlord portal. Scoped to the current org
 * (all properties in the org are treated as the landlord's portfolio).
 *
 * If needed, filter by a landlordUid field on properties for multi-landlord orgs.
 */
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from '@angular/fire/firestore';
import { OrgContextService } from '../../core/org/org-context.service';
import { Observable, of, combineLatest, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Property } from '../../core/models/property.models';
import { MaintenanceRequest } from '../maintenance/maintenance.service';
import { chunkArray } from '../../core/utils/chunk';

interface UnitSummary {
  id: string;
  propertyId?: string;
  status?: string;
}

export interface LandlordKPIs {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  occupancyRate: number;
  activeTenants: number;
  openMaintenance: number;
  /** Payments collected this calendar month */
  monthlyRevenue: number;
  loadError?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LandlordDashboardService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  private get orgId(): string {
    return this.org.orgId;
  }

  private get uid(): string {
    return this.auth.currentUser?.uid || '';
  }

  private sortByUpdatedDesc<T extends { updatedAt?: number }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }

  private dedupeById<T extends { id: string }>(rows: T[]): T[] {
    const byId = new Map<string, T>();
    rows.forEach((row) => byId.set(row.id, row));
    return Array.from(byId.values());
  }

  private getAssignedPropertyIds(): Observable<string[]> {
    if (!this.orgId || !this.uid) return of([]);
    const q = query(
      collection(this.fs, 'propertyAssignments'),
      where('orgId', '==', this.orgId),
      where('userId', '==', this.uid),
      where('status', '==', 'active'),
      limit(300),
    );

    return from(getDocs(q)).pipe(
      map((snap) => {
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const propertyId = String((d.data() as any)?.propertyId || '').trim();
          if (propertyId) ids.add(propertyId);
        });
        return Array.from(ids);
      }),
      catchError(() => of([])),
    );
  }

  /** Stream all properties for the org */
  getProperties(): Observable<Property[]> {
    if (!this.orgId) return of([]);
    return this.getAssignedPropertyIds().pipe(
      switchMap((propertyIds) => {
        if (!propertyIds.length) return of([] as Property[]);
        const batches = chunkArray(propertyIds, 10);
        return from(Promise.all(
          batches.map((batch) =>
            getDocs(query(
              collection(this.fs, `orgs/${this.orgId}/properties`),
              where('id', 'in', batch),
              orderBy('updatedAt', 'desc'),
              limit(200),
            )),
          ),
        )).pipe(
          map((snaps) => {
            const allRows = snaps.flatMap((snap) =>
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as Property)),
            );
            return this.sortByUpdatedDesc(this.dedupeById(allRows));
          }),
        );
      }),
      catchError(() => of([])),
    );
  }

  /** Stream units scoped to assigned properties using chunked IN queries */
  getUnits(): Observable<UnitSummary[]> {
    if (!this.orgId) return of([]);
    return this.getAssignedPropertyIds().pipe(
      switchMap((propertyIds) => {
        if (!propertyIds.length) return of([] as UnitSummary[]);
        const batches = chunkArray(propertyIds, 10);
        return from(Promise.all(
          batches.map((batch) =>
            getDocs(query(
              collection(this.fs, `orgs/${this.orgId}/units`),
              where('propertyId', 'in', batch),
              limit(500),
            )),
          ),
        )).pipe(
          map((snaps) => {
            const allRows = snaps.flatMap((snap) =>
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as UnitSummary)),
            );
            return this.dedupeById(allRows);
          }),
        );
      }),
      catchError(() => of([])),
    );
  }

  /** Stream recent maintenance requests (open) */
  getOpenMaintenance(): Observable<MaintenanceRequest[]> {
    if (!this.orgId) return of([]);
    return this.getAssignedPropertyIds().pipe(
      switchMap((propertyIds) => {
        if (!propertyIds.length) return of([] as MaintenanceRequest[]);
        const batches = chunkArray(propertyIds, 10);
        return from(Promise.all(
          batches.map((batch) =>
            getDocs(query(
              collection(this.fs, `orgs/${this.orgId}/maintenanceRequests`),
              where('propertyId', 'in', batch),
              orderBy('updatedAt', 'desc'),
              limit(100),
            )),
          ),
        )).pipe(
          map((snaps) => {
            const allRows = snaps.flatMap((snap) =>
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as MaintenanceRequest)),
            );
            const openRows = allRows.filter((row) => row.status === 'new' || row.status === 'in_progress');
            return this.sortByUpdatedDesc(this.dedupeById(openRows)).slice(0, 50);
          }),
        );
      }),
      catchError(() => of([])),
    );
  }

  /** Stream active tenants count — scoped to landlord's assigned properties */
  getActiveTenants(): Observable<number> {
    if (!this.orgId) return of(0);
    return this.getAssignedPropertyIds().pipe(
      switchMap((propertyIds) => {
        if (!propertyIds.length) return of(0);
        const batches = chunkArray(propertyIds, 10);
        return from(Promise.all(
          batches.map((batch) =>
            getDocs(query(
              collection(this.fs, `orgs/${this.orgId}/tenants`),
              where('currentPropertyId', 'in', batch),
              where('status', '==', 'active'),
              limit(500),
            )),
          ),
        )).pipe(
          map((snaps) => {
            const ids = new Set<string>();
            snaps.forEach((snap) => {
              snap.docs.forEach((d) => ids.add(d.id));
            });
            return ids.size;
          }),
          catchError(() => of(0)),
        );
      }),
      catchError(() => of(0)),
    );
  }

  private getMonthlyRevenue(): Observable<number> {
    if (!this.orgId) return of(0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return this.getAssignedPropertyIds().pipe(
      switchMap((propertyIds) => {
        if (!propertyIds.length) return of(0);
        const batches = chunkArray(propertyIds, 10);
        return from(Promise.all(
          batches.map((batch) =>
            getDocs(query(
              collectionGroup(this.fs, 'payments'),
              where('orgId', '==', this.orgId),
              where('propertyId', 'in', batch),
              where('status', '==', 'paid'),
              where('createdAt', '>=', monthStart),
            )),
          ),
        )).pipe(
          map((snaps) => snaps.reduce((sum, snap) => {
            return sum + snap.docs.reduce((chunkSum, d) => {
              const amount = Number((d.data() as Record<string, unknown>)['amount'] ?? 0);
              return chunkSum + (Number.isFinite(amount) ? amount : 0);
            }, 0);
          }, 0)),
        );
      }),
      catchError(() => of(0)),
    );
  }

  /**
   * KPI summary derived from live Firestore streams.
   * Combines properties + tenants + maintenance into one observable.
   */
  getKPIs(): Observable<LandlordKPIs> {
    return combineLatest([
      this.getProperties(),
      this.getUnits(),
      this.getActiveTenants(),
      this.getOpenMaintenance(),
      this.getMonthlyRevenue(),
    ]).pipe(
      map(([properties, units, activeTenants, openMaintenance, monthlyRevenue]) => {
        const totalProperties = properties.length;
        const occupiedFromUnits = units.filter((u) => u.status === 'occupied').length;
        const vacantFromUnits = units.filter((u) => u.status === 'vacant').length;
        const occupiedProperties = occupiedFromUnits || properties.filter((p) => p.status === 'occupied').length;
        const vacantProperties = vacantFromUnits || properties.filter((p) => p.status === 'available').length;
        const occupancyDenominator = occupiedFromUnits + vacantFromUnits;
        const occupancyRate = occupancyDenominator > 0
          ? Math.round((occupiedFromUnits / occupancyDenominator) * 100)
          : (totalProperties > 0
            ? Math.round((occupiedProperties / totalProperties) * 100)
            : 0);

        return {
          totalProperties,
          occupiedProperties,
          vacantProperties,
          occupancyRate,
          activeTenants,
          openMaintenance: openMaintenance.length,
          monthlyRevenue,
          loadError: false,
        };
      }),
      catchError(() => of({
        totalProperties: -1,
        occupiedProperties: -1,
        vacantProperties: -1,
        occupancyRate: -1,
        activeTenants: -1,
        openMaintenance: -1,
        monthlyRevenue: -1,
        loadError: true,
      })),
    );
  }
}
