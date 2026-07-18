import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { StorageUploadService } from '../../core/utils/storage-upload.service';
import { stripUndefined } from '../../core/utils/firestore-clean';

export type ChecklistStatus = 'open' | 'pass' | 'fail' | 'na';

export interface ChecklistPhoto {
  path: string;
  url: string;
  name?: string;
  uploadedAt: number;
  uploadedBy: string;
}

export interface ChecklistSection {
  id: string;
  orgId: string;
  propertyId: string;
  inspectionId: string;
  title: string;
  order: number;
  createdAt: number;
  createdBy: string;
}

export interface ChecklistItem {
  id: string;
  orgId: string;
  propertyId: string;
  inspectionId: string;
  sectionId: string;
  label: string;
  status: ChecklistStatus;
  notes?: string | null;
  photos?: ChecklistPhoto[];
  order: number;
  updatedAt: number;
  updatedBy: string;
  createdAt: number;
  createdBy: string;
}

@Injectable({ providedIn: 'root' })
export class InspectionChecklistService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private uploadSvc = inject(StorageUploadService);

  private requireUid() {
    const u = this.auth.currentUser?.uid;
    if (!u) throw new Error('Not authenticated');
    return u;
  }

  private sectionsCol(propertyId: string, inspectionId: string) {
    const orgId = this.org.orgId;
    return collection(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/checklistSections`);
  }

  private itemsCol(propertyId: string, inspectionId: string, sectionId: string) {
    const orgId = this.org.orgId;
    return collection(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/checklistSections/${sectionId}/items`);
  }

  listSections(propertyId: string, inspectionId: string) {
    const q = query(this.sectionsCol(propertyId, inspectionId), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' }) as any;
  }

  async addSection(propertyId: string, inspectionId: string, title: string) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/checklistSections/${id}`);

    const data: ChecklistSection = {
      id,
      orgId,
      propertyId,
      inspectionId,
      title: (title || 'New Section').trim(),
      order: now,
      createdAt: now,
      createdBy: uid,
    };

    await setDoc(ref, stripUndefined(data) as any);
    return id;
  }

  async renameSection(propertyId: string, inspectionId: string, sectionId: string, title: string) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/checklistSections/${sectionId}`);
    await updateDoc(ref, { title: (title || '').trim(), updatedAt: Date.now(), updatedBy: uid } as any);
  }

  async deleteSection(propertyId: string, inspectionId: string, sectionId: string) {
    const orgId = this.org.orgId;
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/checklistSections/${sectionId}`);
    await deleteDoc(ref);
  }

  listItems(propertyId: string, inspectionId: string, sectionId: string) {
    const q = query(this.itemsCol(propertyId, inspectionId, sectionId), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' }) as any;
  }

  async addItem(propertyId: string, inspectionId: string, sectionId: string, label: string) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();

    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/checklistSections/${sectionId}/items/${id}`);
    const data: ChecklistItem = {
      id,
      orgId,
      propertyId,
      inspectionId,
      sectionId,
      label: (label || 'New item').trim(),
      status: 'open',
      notes: null,
      photos: [],
      order: now,
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    };

    await setDoc(ref, stripUndefined(data) as any);
    return id;
  }

  async updateItem(propertyId: string, inspectionId: string, sectionId: string, itemId: string, patch: Partial<ChecklistItem>) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/checklistSections/${sectionId}/items/${itemId}`);
    await updateDoc(ref, {
      ...stripUndefined(patch as any),
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any);
  }

  async deleteItem(propertyId: string, inspectionId: string, sectionId: string, itemId: string) {
    const orgId = this.org.orgId;
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/checklistSections/${sectionId}/items/${itemId}`);
    await deleteDoc(ref);
  }

  async addItemPhoto(params: { propertyId: string; inspectionId: string; sectionId: string; itemId: string; file: File }) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();

    const upload = await this.uploadSvc.uploadChecklistItemPhoto({
      orgId,
      propertyId: params.propertyId,
      inspectionId: params.inspectionId,
      sectionId: params.sectionId,
      itemId: params.itemId,
      file: params.file,
    });

    const photo: ChecklistPhoto = {
      path: upload.path,
      url: upload.url,
      name: upload.name,
      uploadedAt: Date.now(),
      uploadedBy: uid,
    };

    const ref = doc(this.fs, `orgs/${orgId}/properties/${params.propertyId}/inspections/${params.inspectionId}/checklistSections/${params.sectionId}/items/${params.itemId}`);
    await updateDoc(ref, {
      photos: arrayUnion(photo as any),
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any);

    return photo;
  }
}
