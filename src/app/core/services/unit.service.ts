import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class UnitService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private requireUid() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  async createUnit(propertyId: string, data: any) {
    const uid = this.requireUid();
    const orgId = String(data?.orgId || this.org.requireOrgId()).trim();
    const id = crypto.randomUUID();
    const now = Date.now();
    const payload = {
      id,
      orgId,
      propertyId,
      unitNumber: String(data?.unitNumber || id.slice(0, 6)),
      floor: data?.floor ?? null,
      bedrooms: Number(data?.bedrooms || 0),
      bathrooms: Number(data?.bathrooms || 0),
      rentAmount: Number(data?.rentAmount ?? data?.monthlyRent ?? 0),
      currency: String(data?.currency || 'USD'),
      status: String(data?.status || 'vacant'),
      activeTenantId: data?.activeTenantId ?? null,
      activeLeaseId: data?.activeLeaseId ?? null,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
      ...data,
    };

    await setDoc(doc(this.fs, `units/${id}`), payload, { merge: true });
    await setDoc(doc(this.fs, `orgs/${orgId}/units/${id}`), payload, { merge: true });
    await setDoc(doc(this.fs, `orgs/${orgId}/properties/${propertyId}/units/${id}`), payload, { merge: true });
    return id;
  }

  getUnitsByProperty(propertyId: string) {
    const orgId = this.org.requireOrgId();
    const q = query(
      collection(this.fs, 'units'),
      where('orgId', '==', orgId),
      where('propertyId', '==', propertyId),
      orderBy('updatedAt', 'desc'),
      limit(400),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }
}
