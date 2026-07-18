// org-context.service.ts
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, getDocs, limit, query, where } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

const LS_ORG_ID = 'pm_orgId';

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private auth = inject(Auth);
  private fs = inject(Firestore);

  private orgIdSubject = new BehaviorSubject<string>(localStorage.getItem(LS_ORG_ID) || '');
  orgId$ = this.orgIdSubject.asObservable();

  /** SAFE getter: never throws */
  get orgId(): string {
    return (this.orgIdSubject.value || '').trim();
  }

  setOrgId(orgId: string) {
    const v = (orgId || '').trim();
    this.orgIdSubject.next(v);
    if (v) localStorage.setItem(LS_ORG_ID, v);
    else localStorage.removeItem(LS_ORG_ID);
  }

  /** only services that truly require org can call this */
  requireOrgId(): string {
    const v = this.orgId;
    if (!v) throw new Error('OrgContext not initialized');
    return v;
  }

  get uid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }
  get uidOrEmpty(): string {
    return this.uid ?? '';
  }

  /** Initialize orgId from users/{uid}.lastOrgId */
  async initFromUserProfile() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.setOrgId('');
      return;
    }
    // load users/{uid}
    const userRef = doc(this.fs, `users/${uid}`);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data: any = snap.data();
      const lastOrgId = (data?.lastOrgId || '').trim();
      this.setOrgId(lastOrgId);
    } else {
      this.setOrgId('');
    }
  }

  private isPermissionDenied(error: unknown): boolean {
    const code = String((error as any)?.code || '');
    const message = String((error as any)?.message || '');
    return code.includes('permission-denied') || message.includes('Missing or insufficient permissions');
  }

  /**
   * Ensure an orgId is available for guards right after login/refresh.
   * Priority: current context -> user profile fields -> active top-level membership.
   */
  async ensureOrgId(): Promise<string> {
    if (this.orgId) return this.orgId;

    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.setOrgId('');
      return '';
    }

    try {
      const userRef = doc(this.fs, `users/${uid}`);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data: any = snap.data() || {};
        const candidate =
          String(data?.activeOrgId || '').trim() ||
          String(data?.defaultOrgId || '').trim() ||
          String(data?.lastOrgId || '').trim();
        if (candidate) {
          this.setOrgId(candidate);
          return candidate;
        }
      }
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
    }

    try {
      const topMembershipQ = query(
        collection(this.fs, 'organizationMembers'),
        where('userId', '==', uid),
        where('status', '==', 'active'),
        limit(1),
      );
      const topMembership = await getDocs(topMembershipQ);
      if (!topMembership.empty) {
        const orgId = String((topMembership.docs[0].data() as any)?.orgId || '').trim();
        if (orgId) {
          this.setOrgId(orgId);
          return orgId;
        }
      }
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
    }

    return '';
  }

  /** Initialize orgId to empty or other default */
  async init() {
    this.setOrgId('');
  }
}
