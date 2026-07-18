import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private fn = inject(Functions);
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  async createProfile(input: {
    fullName: string;
    email: string;
    phone?: string;
    propertyId?: string;
    unitId?: string;
    leaseId?: string;
  }) {
    const call = httpsCallable(this.fn, 'createBusinessProfile');
    const orgId = this.org.requireOrgId();
    const result: any = await call({ orgId, targetType: 'tenant', profile: input });
    return result?.data as { id: string; authStatus: 'not_invited' };
  }

  async createTenantForProperty(orgId: string, propertyId: string, unitId: string, data: {
    fullName: string;
    email: string;
    phone?: string;
    leaseId?: string;
  }) {
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();

    const payload = {
      id,
      orgId,
      propertyId,
      unitId,
      userId: null,
      fullName: data.fullName,
      email: String(data.email || '').trim().toLowerCase(),
      phone: String(data.phone || ''),
      leaseId: data.leaseId || null,
      authStatus: 'not_invited',
      invitationId: null,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.fs, `tenants/${id}`), payload, { merge: true });
    await setDoc(doc(this.fs, `orgs/${orgId}/tenants/${id}`), payload, { merge: true });
    await setDoc(doc(this.fs, `orgs/${orgId}/properties/${propertyId}/tenants/${id}`), payload, { merge: true });
    return id;
  }
}
