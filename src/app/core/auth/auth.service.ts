import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';
import {
  collectionGroup,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { confirmPasswordReset } from 'firebase/auth';
import { roleHomePath } from './rbac';

export type AppRole =
  | 'super_admin'
  | 'property_manager'
  | 'agency_admin'
  | 'broker'
  | 'admin'
  | 'manager'
  | 'agent'
  | 'landlord'
  | 'tenant'
  | 'buyer'
  | 'seller'
  | 'client'
  | 'maintenance'
  | 'vendor'
  | 'staff';

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role?: AppRole;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  private isPermissionDenied(error: unknown): boolean {
    const code = String((error as any)?.code || '').toLowerCase();
    const message = String((error as any)?.message || '').toLowerCase();
    return code.includes('permission-denied') || message.includes('insufficient permissions');
  }

  async login(email: string, password: string): Promise<string> {
    const normalizedEmail = email.trim().toLowerCase();
    const cred = await signInWithEmailAndPassword(this.auth, normalizedEmail, password);
    try {
      await this.bootstrapUserDoc(cred.user.uid, normalizedEmail, false);
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
    }
    return this.resolvePostLoginRoute(cred.user.uid);
  }

  async register(payload: RegisterPayload): Promise<string> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const role = payload.role;
    const cred = await createUserWithEmailAndPassword(this.auth, normalizedEmail, payload.password);
    try {
      await this.bootstrapUserDoc(cred.user.uid, normalizedEmail, true, payload.fullName, role);
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
    }
    return this.resolvePostLoginRoute(cred.user.uid);
  }

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    await sendPasswordResetEmail(this.auth, normalizedEmail);
  }

  async resetPassword(oobCode: string, newPassword: string): Promise<void> {
    await confirmPasswordReset(this.auth as any, oobCode, newPassword);
  }

  async logout(): Promise<void> {
    this.org.setOrgId('');
    await signOut(this.auth);
  }

  async resolvePostLoginRoute(uid: string): Promise<string> {
    try {
      const userRef = doc(this.fs, `users/${uid}`);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? (userSnap.data() as any) : {};
      const role = (userData?.role ?? '') as AppRole | '';
      const globalRole = String(userData?.globalRole || '');

      if (role === 'super_admin' || globalRole === 'superadmin') return '/super-admin';

      // For ALL roles that need a portal, resolve orgId first so OrgRoleGuard can validate.
      let lastOrgId =
        (String(userData?.activeOrgId || '').trim() ||
        String(userData?.defaultOrgId || '').trim() ||
        String(userData?.lastOrgId || '').trim() ||
        null);
      if (lastOrgId) {
        const active = await this.hasActiveMembership(lastOrgId, uid);
        if (!active) lastOrgId = null;
      }

      if (!lastOrgId) {
        lastOrgId = await this.findFirstActiveOrgForUser(uid);
      }

      if (lastOrgId) {
        this.org.setOrgId(lastOrgId);
        await updateDoc(userRef, {
          activeOrgId: lastOrgId,
          defaultOrgId: userData?.defaultOrgId || lastOrgId,
          lastOrgId,
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        } as any);
      }

      // No resolved organization membership yet -> send the user to create/claim one.
      if (!lastOrgId) return '/onboarding/create-org';

      // Role-based portal redirect (orgId is now set above)
      if (role === 'tenant') return '/tenant';
      if (role === 'landlord') return '/landlord';

      // All other workspace roles enter the main app shell.
      return roleHomePath(role || 'admin');
    } catch (error) {
      // Avoid surfacing transient Firestore permission glitches in the login card.
      if (this.isPermissionDenied(error)) {
        const fallbackOrgId = this.org.orgId;
        if (fallbackOrgId) return '/dashboard';
        return '/super-admin';
      }
      throw error;
    }
  }

  private async bootstrapUserDoc(
    uid: string,
    email: string,
    isNew: boolean,
    fullName?: string,
    role?: AppRole
  ): Promise<void> {
    const userRef = doc(this.fs, `users/${uid}`);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(
        userRef,
        {
          uid,
          email,
          displayName: fullName ?? '',
          fullName: fullName ?? '',
          phone: '',
          role: role ?? '',
          globalRole: 'user',
          status: 'active',
          agencyId: '',
          agentId: '',
          landlordId: '',
          tenantId: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          isNewUser: isNew,
        },
        { merge: true }
      );
      return;
    }

    await updateDoc(userRef, {
      email,
      displayName: fullName ?? (userSnap.data() as any)?.displayName ?? '',
      fullName: fullName ?? (userSnap.data() as any)?.fullName ?? '',
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    } as any);
  }

  private async hasActiveMembership(orgId: string, uid: string): Promise<boolean> {
    try {
      const topMembersQ = query(
        collection(this.fs, 'organizationMembers') as any,
        where('orgId', '==', orgId),
        where('userId', '==', uid),
        where('status', '==', 'active'),
        limit(1),
      );
      const topMembers = await getDocs(topMembersQ);
      if (!topMembers.empty) return true;
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
    }

    try {
      const memberRef = doc(this.fs, `orgs/${orgId}/members/${uid}`);
      const memberSnap = await getDoc(memberRef);
      if (!memberSnap.exists()) return false;

      const membership = memberSnap.data() as any;
      return membership?.status === 'active' || membership?.active === true || membership?.active === 'true';
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
      return false;
    }
  }

  private async findFirstActiveOrgForUser(uid: string): Promise<string | null> {
    try {
      const topMembersQ = query(
        collection(this.fs, 'organizationMembers') as any,
        where('userId', '==', uid),
        where('status', '==', 'active'),
        limit(1),
      );
      const topMembers = await getDocs(topMembersQ);
      if (!topMembers.empty) {
        return String((topMembers.docs[0].data() as any)?.orgId || '') || null;
      }
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
      return null;
    }

    const membersCg = collectionGroup(this.fs as any, 'members') as any;

    try {
      const q1 = query(membersCg, where('uid', '==', uid), where('status', '==', 'active'), limit(1));
      const s1 = await getDocs(q1);
      if (!s1.empty) return this.extractOrgIdFromMemberPath(s1.docs[0].ref.path);
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
      return null;
    }

    try {
      const q2 = query(membersCg, where('uid', '==', uid), where('active', '==', true), limit(1));
      const s2 = await getDocs(q2);
      if (!s2.empty) return this.extractOrgIdFromMemberPath(s2.docs[0].ref.path);
    } catch (error) {
      if (!this.isPermissionDenied(error)) throw error;
      return null;
    }

    return null;
  }

  private extractOrgIdFromMemberPath(path: string): string | null {
    const parts = path.split('/');
    const i = parts.indexOf('orgs');
    if (i === -1 || parts.length < i + 2) return null;
    return parts[i + 1] || null;
  }
}
