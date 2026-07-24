import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { Property } from '../../core/models/property.models';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class PropertiesService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private col() {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/properties`);
  }

  list() {
    const q = query(this.col(), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(propertyId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/properties/${propertyId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<Property>) {
    const orgId = this.org.requireOrgId();
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const id = crypto.randomUUID();
    const now = Date.now();

    const data: Property = {
      ...payload,
      id,
      orgId,
      name: payload.name ?? 'New Property',
      status: payload.status ?? 'available',
      city: payload.city ?? '',
      state: payload.state ?? '',
      zipCode: payload.zipCode ?? '',
      country: payload.country ?? '',
      furnished: payload.furnished ?? false,
      owner: payload.owner ?? '',
      manager: payload.manager ?? '',
      notes: payload.notes ?? '',
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/properties/${id}`), stripUndefined(data) as any);
    return id;
  }

  async update(propertyId: string, patch: Partial<Property>) {
    const orgId = this.org.requireOrgId();
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    await updateDoc(doc(this.fs, `orgs/${orgId}/properties/${propertyId}`), {
      ...stripUndefined(patch as any),
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any);
  }

  async delete(propertyId: string) {
    const orgId = this.org.requireOrgId();

    const activeLeasesSnap = await getDocs(query(
      collection(this.fs, `orgs/${orgId}/properties/${propertyId}/leases`),
      where('status', 'in', ['active', 'pending']),
      limit(1),
    ));
    if (!activeLeasesSnap.empty) {
      throw new Error('Cannot delete a property with active leases. End or archive the lease(s) first.');
    }

    const occupiedUnitsSnap = await getDocs(query(
      collection(this.fs, `orgs/${orgId}/units`),
      where('propertyId', '==', propertyId),
      where('status', '==', 'occupied'),
      limit(1),
    ));
    if (!occupiedUnitsSnap.empty) {
      throw new Error('Cannot delete a property with occupied units. Vacate the unit(s) first.');
    }

    await deleteDoc(doc(this.fs, `orgs/${orgId}/properties/${propertyId}`));
  }
} 