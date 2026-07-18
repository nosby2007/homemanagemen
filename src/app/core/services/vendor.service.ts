import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class VendorService {
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
    companyName: string;
    contactName?: string;
    email: string;
    phone?: string;
    serviceType?: string;
  }) {
    const call = httpsCallable(this.fn, 'createBusinessProfile');
    const orgId = this.org.requireOrgId();
    const result: any = await call({ orgId, targetType: 'vendor', profile: input });
    return result?.data as { id: string; authStatus: 'not_invited' };
  }

  async createVendorForProperty(orgId: string, propertyId: string, input: {
    companyName: string;
    contactName?: string;
    email: string;
    phone?: string;
    serviceType?: string;
  }) {
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const payload = {
      id,
      orgId,
      userId: null,
      companyName: input.companyName,
      contactName: input.contactName || '',
      email: String(input.email || '').trim().toLowerCase(),
      phone: String(input.phone || ''),
      serviceType: input.serviceType || '',
      propertyIds: [propertyId],
      authStatus: 'not_invited',
      invitationId: null,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.fs, `vendors/${id}`), payload, { merge: true });
    await setDoc(doc(this.fs, `orgs/${orgId}/vendors/${id}`), payload, { merge: true });
    return id;
  }
}
