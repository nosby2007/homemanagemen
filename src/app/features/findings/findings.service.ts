import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, setDoc, updateDoc, deleteDoc,
  collectionData, docData, query, orderBy, limit,
  getDoc, arrayUnion
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { Finding, FindingPhoto, FindingSeverity } from '../../core/models/finding.models';
import { StorageUploadService } from '../../core/utils/storage-upload.service';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class FindingsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private uploadSvc = inject(StorageUploadService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private basePath(propertyId: string, inspectionId: string) {
    const orgId = this.org.orgId;
    return `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/findings`;
  }

  listByInspection(propertyId: string, inspectionId: string) {
    const col = collection(this.fs, this.basePath(propertyId, inspectionId));
    const q = query(col, orderBy('createdAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(propertyId: string, inspectionId: string, findingId: string) {
    const ref = doc(this.fs, `${this.basePath(propertyId, inspectionId)}/${findingId}`);
    return docData(ref, { idField: 'id' }) as any;
  }

  async createUnderInspection(propertyId: string, inspectionId: string, payload: {
    summary: string;
    details?: string;
    severity?: FindingSeverity;
    roomArea?: string;
    section?: string;
    category?: string;
  }) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();

    const data: Finding = {
      id,
      orgId,
      propertyId,
      inspectionId,
      summary: payload.summary,
      details: (payload.details ?? '').trim() || undefined,
      severity: payload.severity ?? 'medium',
      status: 'new',
      roomArea: (payload.roomArea ?? '').trim() || undefined,
      section: (payload.section ?? '').trim() || undefined,
      category: (payload.category ?? '').trim() || undefined,
      photos: [],
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    };

    const ref = doc(this.fs, `${this.basePath(propertyId, inspectionId)}/${id}`);
    await setDoc(ref, stripUndefined(data) as any);
    return id;
  }

  async update(propertyId: string, inspectionId: string, findingId: string, patch: Partial<Finding>) {
    const uid = this.requireUid();
    const ref = doc(this.fs, `${this.basePath(propertyId, inspectionId)}/${findingId}`);
    await updateDoc(ref, {
      ...stripUndefined(patch as any),
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any);
  }

  async remove(propertyId: string, inspectionId: string, findingId: string) {
    const ref = doc(this.fs, `${this.basePath(propertyId, inspectionId)}/${findingId}`);
    await deleteDoc(ref);
  }

  async addPhoto(params: { propertyId: string; inspectionId: string; findingId: string; file: File }) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();

    const upload = await this.uploadSvc.uploadFindingPhoto({
      orgId,
      propertyId: params.propertyId,
      inspectionId: params.inspectionId,
      findingId: params.findingId,
      file: params.file,
    });

    const photo: FindingPhoto = {
      path: upload.path,
      url: upload.url,
      name: upload.name,
      size: upload.size,
      contentType: upload.contentType,
      uploadedAt: Date.now(),
      uploadedBy: uid,
    };

    const ref = doc(this.fs, `${this.basePath(params.propertyId, params.inspectionId)}/${params.findingId}`);
    await updateDoc(ref, {
      photos: arrayUnion(photo as any),
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any);

    return photo;
  }

  /** Stub: you can wire this to your WorkOrders service later */
  async convertToWorkOrder(_propertyId: string, _inspectionId: string, _findingId: string) {
    throw new Error('convertToWorkOrder: wire to WorkOrders feature when ready');
  }
}
