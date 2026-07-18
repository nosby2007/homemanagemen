import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  async createProperty(orgId: string, data: any) {
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const payload = {
      id,
      orgId,
      name: String(data?.name || 'New Property'),
      propertyType: String(data?.propertyType || data?.type || 'residential'),
      address: String(data?.address || data?.streetAddress || ''),
      city: String(data?.city || ''),
      state: String(data?.state || ''),
      country: String(data?.country || ''),
      ownerLandlordIds: Array.isArray(data?.ownerLandlordIds) ? data.ownerLandlordIds : [],
      assignedManagerIds: Array.isArray(data?.assignedManagerIds) ? data.assignedManagerIds : [],
      assignedAgentIds: Array.isArray(data?.assignedAgentIds) ? data.assignedAgentIds : [],
      status: String(data?.status || 'active'),
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
      ...data,
    };

    await setDoc(doc(this.fs, `properties/${id}`), payload, { merge: true });
    await setDoc(doc(this.fs, `orgs/${orgId}/properties/${id}`), payload, { merge: true });
    return id;
  }

  getPropertiesByOrg(orgId: string) {
    const q = query(
      collection(this.fs, 'properties'),
      where('orgId', '==', orgId),
      orderBy('updatedAt', 'desc'),
      limit(300),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  getPropertyById(propertyId: string) {
    return docData(doc(this.fs, `properties/${propertyId}`), { idField: 'id' }) as any;
  }

  getPropertiesByCurrentOrg() {
    const orgId = this.org.requireOrgId();
    return this.getPropertiesByOrg(orgId);
  }
}
