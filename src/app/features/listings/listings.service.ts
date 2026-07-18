import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, from, switchMap } from 'rxjs';
import { AccessScopeService } from '../../core/auth/access-scope.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { ListingRecord, ListingStatus } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class ListingsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private scope = inject(AccessScopeService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col() {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/listings`);
  }

  list(): Observable<any[]> {
    return from(this.scope.getCurrentScope()).pipe(
      switchMap((scope) => {
        const agentId = scope.agentId || scope.uid;
        const q = scope.isPrivileged
          ? query(this.col(), orderBy('updatedAt', 'desc'), limit(300))
          : query(this.col(), where('assignedAgentId', '==', agentId), orderBy('updatedAt', 'desc'), limit(200));
        return collectionData(q, { idField: 'id' }) as any;
      }),
    ) as any;
  }

  listByStatus(status: ListingStatus) {
    const q = query(this.col(), where('listingStatus', '==', status), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(listingId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/listings/${listingId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<ListingRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const propertyId = String(payload.propertyId || '').trim();
    if (!propertyId) throw new Error('Listing must be linked to a property.');

    const data: ListingRecord = {
      id,
      orgId,
      title: String(payload.title || 'New Listing'),
      description: payload.description,
      listingType: payload.listingType ?? 'sale',
      listingStatus: payload.listingStatus ?? 'draft',
      propertyType: payload.propertyType,
      propertyId,
      ownerId: payload.ownerId,
      landlordId: payload.landlordId,
      assignedAgentId: payload.assignedAgentId,
      price: payload.price,
      rentAmount: payload.rentAmount,
      depositAmount: payload.depositAmount,
      bedrooms: payload.bedrooms,
      bathrooms: payload.bathrooms,
      squareFeet: payload.squareFeet,
      lotSize: payload.lotSize,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      zipCode: payload.zipCode,
      country: payload.country,
      amenities: payload.amenities,
      photos: payload.photos,
      featured: payload.featured ?? false,
      visibility: payload.visibility ?? 'private',
      availabilityDate: payload.availabilityDate,
      agencyId: payload.agencyId,
      status: payload.status ?? 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/listings/${id}`), stripUndefined(data) as any);
    return id;
  }

  async update(listingId: string, patch: Partial<ListingRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    await updateDoc(doc(this.fs, `orgs/${orgId}/listings/${listingId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
  }

  async remove(listingId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/listings/${listingId}`));
  }
}
