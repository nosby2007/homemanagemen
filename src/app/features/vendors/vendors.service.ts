import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { OrgContextService } from '../../core/org/org-context.service';
import { stripUndefined } from '../../core/utils/firestore-clean';

export interface VendorRecord {
  id: string;
  orgId: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  serviceType?: string;
  defaultPropertyId?: string;
  propertyIds?: string[];
  status: 'active' | 'inactive';
  userId?: string | null;
  authStatus?: 'not_invited' | 'invited' | 'active' | 'disabled';
  invitationId?: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

@Injectable({ providedIn: 'root' })
export class VendorsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private requireUid() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col() {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/vendors`);
  }

  list() {
    const q = query(this.col(), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  async create(payload: Partial<VendorRecord>) {
    const uid = this.requireUid();
    const orgId = this.org.requireOrgId();
    const id = crypto.randomUUID();
    const now = Date.now();
    const propertyIds = Array.isArray(payload.propertyIds)
      ? payload.propertyIds.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const defaultPropertyId = String(payload.defaultPropertyId || propertyIds[0] || '').trim() || undefined;
    if (!propertyIds.length || !defaultPropertyId) {
      throw new Error('Vendor must be assigned to at least one property.');
    }

    await setDoc(doc(this.fs, `orgs/${orgId}/vendors/${id}`), stripUndefined({
      id,
      orgId,
      companyName: String(payload.companyName || 'Vendor'),
      contactName: payload.contactName || '',
      email: payload.email || '',
      phone: payload.phone || '',
      serviceType: payload.serviceType || '',
      defaultPropertyId,
      propertyIds,
      status: payload.status || 'active',
      userId: payload.userId ?? null,
      authStatus: payload.authStatus ?? 'not_invited',
      invitationId: payload.invitationId ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    }) as any);
    return id;
  }

  async update(vendorId: string, patch: Partial<VendorRecord>) {
    const uid = this.requireUid();
    const orgId = this.org.requireOrgId();
    await updateDoc(doc(this.fs, `orgs/${orgId}/vendors/${vendorId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
  }

  async remove(vendorId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/vendors/${vendorId}`));
  }
}
