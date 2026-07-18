import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';

export type OrgDoc = {
  orgId: string;
  name?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type BrandingDoc = {
  orgId: string;
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt?: any;
  updatedAt?: any;
};

export type MemberRow = {
  uid: string;
  role?: string;
  status?: string;
  createdAt?: any;
};

export type OrgTotals = {
  members: number;
  inspections: number;
  workOrders: number;
  reports: number;
};

@Injectable({ providedIn: 'root' })
export class SuperAdminOrgDetailService {
  private fs = inject(Firestore);

  async getOrg(orgId: string): Promise<OrgDoc | null> {
    const ref = doc(this.fs as any, `orgs/${orgId}`);
    const snap = await getDoc(ref as any);
    if (!snap.exists()) return null;
    return { ...(snap.data() as any), orgId } as OrgDoc;
  }

  async getBranding(orgId: string): Promise<BrandingDoc | null> {
    const ref = doc(this.fs as any, `orgs/${orgId}/branding/main`);
    const snap = await getDoc(ref as any);
    if (!snap.exists()) return null;
    return { ...(snap.data() as any), orgId } as BrandingDoc;
  }

  async saveBranding(orgId: string, patch: Partial<BrandingDoc>): Promise<void> {
    const ref = doc(this.fs as any, `orgs/${orgId}/branding/main`);
    await setDoc(ref as any, {
      orgId,
      ...patch,
      updatedAt: serverTimestamp(),
      createdAt: (patch as any)?.createdAt ?? serverTimestamp(),
    }, { merge: true });
  }

  async listMembers(orgId: string, max = 50): Promise<MemberRow[]> {
    const colRef = collection(this.fs as any, `orgs/${orgId}/members`);
    const q = query(colRef as any, orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q as any);
    return snap.docs.map(d => {
      const data: any = d.data();
      return {
        uid: d.id,
        role: data?.role,
        status: data?.status,
        createdAt: data?.createdAt,
      } as MemberRow;
    });
  }

  async getOrgTotals(orgId: string): Promise<OrgTotals> {
    const membersCol = collection(this.fs as any, `orgs/${orgId}/members`);
    const inspectionsCol = collection(this.fs as any, `orgs/${orgId}/inspections`);
    const workOrdersCol = collection(this.fs as any, `orgs/${orgId}/workOrders`);
    const reportsCol = collection(this.fs as any, `orgs/${orgId}/reports`);

    const [m, i, w, r] = await Promise.all([
      getCountFromServer(query(membersCol as any) as any),
      getCountFromServer(query(inspectionsCol as any) as any),
      getCountFromServer(query(workOrdersCol as any) as any),
      getCountFromServer(query(reportsCol as any) as any),
    ]);

    return {
      members: m.data().count,
      inspections: i.data().count,
      workOrders: w.data().count,
      reports: r.data().count,
    };
  }
impersonateOrg(orgId: string): void {
  // ✅ IMPORTANT: align with OrgContextService storage key
  localStorage.setItem('pm_orgId', (orgId || '').trim());

  // optional audit
  localStorage.setItem('impersonationTimestamp', new Date().toISOString());

  console.log(`[SA] Impersonating org: ${orgId}`);

  // reload to re-evaluate guards + context
  window.location.assign('/');
}

}
