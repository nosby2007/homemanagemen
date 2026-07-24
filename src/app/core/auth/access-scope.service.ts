import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import { AppUser } from '../models/domain.models';
import { OrgContextService } from '../org/org-context.service';

export interface AccessScope {
  uid: string;
  role: AppUser['role'];
  agentId?: string;
  landlordId?: string;
  tenantId?: string;
  clientIds?: string[];
  isPrivileged: boolean;
}

const CLIENT_LINKED_ROLES = ['buyer', 'seller', 'client'];

@Injectable({ providedIn: 'root' })
export class AccessScopeService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  async getCurrentScope(): Promise<AccessScope> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const snap = await getDoc(doc(this.fs, `users/${uid}`));
    if (!snap.exists()) throw new Error('User profile not found');
    const profile = snap.data() as AppUser;

    const scope: AccessScope = {
      uid,
      role: profile.role,
      agentId: profile.agentId,
      landlordId: profile.landlordId,
      tenantId: profile.tenantId,
      isPrivileged: ['super_admin', 'agency_admin', 'admin', 'manager', 'broker', 'landlord', 'maintenance', 'vendor', 'staff'].includes(profile.role),
    };

    if (CLIENT_LINKED_ROLES.includes(profile.role)) {
      scope.clientIds = await this.resolveClientIds(uid);
    }

    return scope;
  }

  private async resolveClientIds(uid: string): Promise<string[]> {
    const orgId = this.org.orgId;
    if (!orgId) return [];
    try {
      const q = query(collection(this.fs, `orgs/${orgId}/clients`), where('userId', '==', uid));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.id);
    } catch {
      return [];
    }
  }
}
