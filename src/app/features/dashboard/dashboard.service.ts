import { Injectable, inject } from '@angular/core';
import { Firestore, collection } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { collectionGroup, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { OrgContextService } from '../../core/org/org-context.service';
import { AccessScopeService } from '../../core/auth/access-scope.service';
import { chunkArray } from '../../core/utils/chunk';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private scope = inject(AccessScopeService);

  private getOrgId(): string {
    // supports both patterns: requireOrgId() or orgId property
    return (this.org as any).requireOrgId?.() ?? (this.org as any).orgId;
  }

  private async listProperties() {
    const orgId = this.getOrgId();
    const colRef = collection(this.fs, `orgs/${orgId}/properties`);
    const snap = await getDocs(query(colRef as any));
    return snap.docs.map((docSnap) => docSnap.data() as any);
  }

  private async countProperties(): Promise<number> {
    return (await this.listProperties()).length;
  }

  private async countPropertiesByStatus(statuses: string[]): Promise<number> {
    if (!statuses.length) return 0;
    const properties = await this.listProperties();
    return properties.filter((property) => statuses.includes(String(property?.status || ''))).length;
  }

  private async getAccessiblePropertyIds(): Promise<string[]> {
    const orgId = this.getOrgId();
    const currentScope = await this.scope.getCurrentScope();
    const privilegedRoles = ['super_admin', 'agency_admin', 'admin', 'manager', 'broker', 'property_manager'];
    if (privilegedRoles.includes(currentScope.role)) {
      const properties = await this.listProperties();
      return properties.map((property) => String(property?.id || '')).filter(Boolean);
    }

    const uid = this.auth.currentUser?.uid;
    if (!uid) return [];
    const assignmentsSnap = await getDocs(query(
      collection(this.fs, 'propertyAssignments') as any,
      where('orgId', '==', orgId),
      where('userId', '==', uid),
      where('status', '==', 'active'),
    ));
    const ids = assignmentsSnap.docs
      .map((docSnap) => String((docSnap.data() as any)?.propertyId || '').trim())
      .filter(Boolean);
    return Array.from(new Set(ids));
  }

  private async countInspections(): Promise<number> {
    const orgId = this.getOrgId();
    const propertyIds = await this.getAccessiblePropertyIds();
    if (!propertyIds.length) return 0;

    const chunks = chunkArray(propertyIds, 10);
    let count = 0;
    for (const ids of chunks) {
      const snap = await getDocs(query(
        collectionGroup(this.fs as any, 'inspections') as any,
        where('orgId', '==', orgId),
        where('propertyId', 'in', ids),
      ));
      count += snap.size;
    }
    return count;
  }

  private async countCompletedInspections(): Promise<number> {
    const orgId = this.getOrgId();
    const propertyIds = await this.getAccessiblePropertyIds();
    if (!propertyIds.length) return 0;

    const chunks = chunkArray(propertyIds, 10);
    let count = 0;
    for (const ids of chunks) {
      const snap = await getDocs(query(
        collectionGroup(this.fs as any, 'inspections') as any,
        where('orgId', '==', orgId),
        where('propertyId', 'in', ids),
        where('status', '==', 'completed'),
      ));
      count += snap.size;
    }
    return count;
  }

  private async countPendingReviews(): Promise<number> {
    const orgId = this.getOrgId();
    const propertyIds = await this.getAccessiblePropertyIds();
    if (!propertyIds.length) return 0;

    const chunks = chunkArray(propertyIds, 10);
    let count = 0;
    for (const ids of chunks) {
      const snap = await getDocs(query(
        collectionGroup(this.fs as any, 'findings') as any,
        where('orgId', '==', orgId),
        where('propertyId', 'in', ids),
        where('status', 'in', ['new', 'ack']),
      ));
      count += snap.size;
    }
    return count;
  }

  private async countCriticalFindings(): Promise<number> {
    const orgId = this.getOrgId();
    const propertyIds = await this.getAccessiblePropertyIds();
    if (!propertyIds.length) return 0;

    const chunks = chunkArray(propertyIds, 10);
    let count = 0;
    for (const ids of chunks) {
      const snap = await getDocs(query(
        collectionGroup(this.fs as any, 'findings') as any,
        where('orgId', '==', orgId),
        where('propertyId', 'in', ids),
        where('severity', '==', 'critical'),
        where('status', 'in', ['new', 'ack', 'converted']),
      ));
      count += snap.size;
    }
    return count;
  }

  private startOfCurrentMonthMs(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  }

  /**
   * Revenue MTD + payment count.
   * Tries nested collectionGroup payments first; falls back to org-root payments.
   */
  async getPaymentsMtdKpis(): Promise<{ revenueMtd: number; totalPayments: number }> {
    const orgId = this.getOrgId();
    const startMonth = this.startOfCurrentMonthMs();

    const summarize = (docs: Array<any>) => {
      const paid = docs.filter((d) => d?.status === 'paid');
      const revenueMtd = paid.reduce((sum, d) => sum + (Number(d?.amount) || 0), 0);
      return { revenueMtd, totalPayments: paid.length };
    };

    try {
      const nestedQ = query(
        collectionGroup(this.fs as any, 'payments') as any,
        where('orgId', '==', orgId),
        where('createdAt', '>=', startMonth),
      );
      const nestedSnap = await getDocs(nestedQ as any);
      return summarize(nestedSnap.docs.map((d) => d.data()));
    } catch {
      const rootQ = query(
        collection(this.fs, `orgs/${orgId}/payments`) as any,
        where('createdAt', '>=', startMonth),
      );
      const rootSnap = await getDocs(rootQ as any);
      return summarize(rootSnap.docs.map((d) => d.data()));
    }
  }

  /**
   * KPIs used by the dashboard.
   * NOTE: This version only covers property KPIs safely.
   * You can extend later for inspections/findings/leases/payments once rules allow collectionGroup counts.
   */
  async getKpis() {
    // Define “active” vs “pending” according to your statuses
    // active: available, occupied, listed_for_sale, listed_for_rent
    // pending: maintenance
    const [
      totalProperties,
      activeProperties,
      pendingProperties,
      totalInspections,
      completedInspections,
      pendingReviews,
      criticalFindings,
      payments,
    ] = await Promise.all([
      this.countProperties(),
      this.countPropertiesByStatus(['available', 'occupied', 'listed_for_sale', 'listed_for_rent']),
      this.countPropertiesByStatus(['maintenance']),
      this.countInspections(),
      this.countCompletedInspections(),
      this.countPendingReviews(),
      this.countCriticalFindings(),
      this.getPaymentsMtdKpis(),
    ]);

    return {
      totalProperties,
      activeProperties,
      pendingProperties,
      completedInspections,
      totalInspections,
      pendingReviews,
      criticalFindings,
      revenueMtd: payments.revenueMtd,
      totalPayments: payments.totalPayments,
    };
  }

  private toMillis(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    if (value && typeof value.seconds === 'number') return value.seconds * 1000;
    return 0;
  }

  private relativeTime(ms: number): string {
    if (!ms) return 'Unknown time';
    const deltaSec = Math.max(1, Math.floor((Date.now() - ms) / 1000));

    if (deltaSec < 60) return 'Just now';
    if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)} min ago`;
    if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)} h ago`;
    if (deltaSec < 604800) return `${Math.floor(deltaSec / 86400)} d ago`;
    return new Date(ms).toLocaleDateString();
  }

  async getRecentActivity() {
    const orgId = this.getOrgId();
    const propertyIds = await this.getAccessiblePropertyIds();
    if (!propertyIds.length) return [];

    const latestByCollectionGroup = async (name: 'inspections' | 'findings', max = 5) => {
      const rows: any[] = [];
      for (const ids of chunkArray(propertyIds, 10)) {
        const snap = await getDocs(query(
          collectionGroup(this.fs as any, name) as any,
          where('orgId', '==', orgId),
          where('propertyId', 'in', ids),
          limit(max),
        ));
        rows.push(...snap.docs.map((docSnap) => docSnap.data() as any));
      }
      return rows
        .sort((a, b) => this.toMillis(b?.updatedAt ?? b?.createdAt) - this.toMillis(a?.updatedAt ?? a?.createdAt))
        .slice(0, max);
    };

    const latestByPropertyCollection = async (name: 'maintenanceRequests' | 'payments', max = 5) => {
      const rows: any[] = [];
      for (const propertyId of propertyIds.slice(0, 20)) {
        const snap = await getDocs(query(
          collection(this.fs, `orgs/${orgId}/properties/${propertyId}/${name}`) as any,
          limit(3),
        ));
        rows.push(...snap.docs.map((docSnap) => docSnap.data() as any));
      }
      return rows
        .sort((a, b) => this.toMillis(b?.updatedAt ?? b?.createdAt) - this.toMillis(a?.updatedAt ?? a?.createdAt))
        .slice(0, max);
    };

    const [inspectionsSnap, findingsSnap, maintenanceSnap, paymentsSnap] = await Promise.all([
      latestByCollectionGroup('inspections', 5),
      latestByCollectionGroup('findings', 5),
      latestByPropertyCollection('maintenanceRequests', 5),
      latestByPropertyCollection('payments', 5),
    ]);

    const activities = [
      ...inspectionsSnap.map((data) => {
        const ts = this.toMillis(data?.updatedAt ?? data?.createdAt);
        return {
          type: 'inspection',
          title: `Inspection ${data?.status ?? 'updated'}`,
          time: this.relativeTime(ts),
          ts,
        };
      }),
      ...findingsSnap.map((data) => {
        const ts = this.toMillis(data?.updatedAt ?? data?.createdAt);
        return {
          type: 'report',
          title: `Finding ${data?.severity ?? 'item'} ${data?.status ?? 'updated'}`,
          time: this.relativeTime(ts),
          ts,
        };
      }),
      ...maintenanceSnap.map((data) => {
        const ts = this.toMillis(data?.updatedAt ?? data?.createdAt);
        return {
          type: 'property',
          title: `Maintenance ${data?.status ?? 'updated'}: ${data?.title ?? 'Request'}`,
          time: this.relativeTime(ts),
          ts,
        };
      }),
      ...paymentsSnap.map((data) => {
        const ts = this.toMillis(data?.createdAt ?? data?.updatedAt);
        const amount = Number(data?.amount ?? 0).toLocaleString();
        return {
          type: 'report',
          title: `Payment ${data?.status ?? 'recorded'} - $${amount}`,
          time: this.relativeTime(ts),
          ts,
        };
      }),
    ];

    return activities
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8)
      .map(({ type, title, time }) => ({ type, title, time }));
  }
}
