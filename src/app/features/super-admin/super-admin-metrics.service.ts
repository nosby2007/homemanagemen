import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  collection,
  collectionGroup,
  query,
  where,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore';

export type KpiTotals = {
  orgs: number;
  members: number;
  inspections: number;
  workOrders: number;
  reports: number;
};

export type KpiSeriesPoint = { label: string; value: number };

@Injectable({ providedIn: 'root' })
export class SuperAdminMetricsService {
  private fs = inject(Firestore);

  async getTotals(): Promise<KpiTotals> {
    // orgs root
    const orgsCol = collection(this.fs as any, 'orgs');
    const orgsCount = await getCountFromServer(query(orgsCol as any));

    // collectionGroup counts (requires fields exist + rules allow super admin read)
    const membersCount = await getCountFromServer(query(collectionGroup(this.fs as any, 'members') as any));
    const inspectionsCount = await getCountFromServer(query(collectionGroup(this.fs as any, 'inspections') as any));
    const workOrdersCount = await getCountFromServer(query(collectionGroup(this.fs as any, 'workOrders') as any));
    const reportsCount = await getCountFromServer(query(collectionGroup(this.fs as any, 'reports') as any));

    return {
      orgs: orgsCount.data().count,
      members: membersCount.data().count,
      inspections: inspectionsCount.data().count,
      workOrders: workOrdersCount.data().count,
      reports: reportsCount.data().count,
    };
  }

  // Simple trend: inspections created last 7 days (by createdAt)
  async inspectionsLast7Days(): Promise<KpiSeriesPoint[]> {
    const now = new Date();
    const points: KpiSeriesPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const start = Timestamp.fromDate(dayStart);
      const end = Timestamp.fromDate(dayEnd);

      const q = query(
        collectionGroup(this.fs as any, 'inspections') as any,
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
      );

      const count = await getCountFromServer(q as any);
      points.push({
        label: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
        value: count.data().count
      });
    }

    return points;
  }
}
