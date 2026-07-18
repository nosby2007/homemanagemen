import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AppUser } from '../models/domain.models';

export interface AccessScope {
  uid: string;
  role: AppUser['role'];
  agentId?: string;
  landlordId?: string;
  tenantId?: string;
  isPrivileged: boolean;
}

@Injectable({ providedIn: 'root' })
export class AccessScopeService {
  private auth = inject(Auth);
  private fs = inject(Firestore);

  async getCurrentScope(): Promise<AccessScope> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const snap = await getDoc(doc(this.fs, `users/${uid}`));
    if (!snap.exists()) throw new Error('User profile not found');
    const profile = snap.data() as AppUser;

    return {
      uid,
      role: profile.role,
      agentId: profile.agentId,
      landlordId: profile.landlordId,
      tenantId: profile.tenantId,
      isPrivileged: ['super_admin', 'agency_admin', 'admin', 'manager', 'broker', 'landlord', 'maintenance', 'vendor', 'staff'].includes(profile.role),
    };
  }
}
