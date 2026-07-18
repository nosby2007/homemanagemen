import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { StorageUploadService } from '../../core/utils/storage-upload.service';
import { Inspection, InspectionSignature } from '../../core/models/inspection.models';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { catchError, Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InspectionsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private uploadSvc = inject(StorageUploadService);
  private activity = inject(ActivityLogService);
  private notifications = inject(NotificationService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col(propertyId: string) {
    const orgId = this.org.orgId;
    return collection(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections`);
  }

  list(propertyId: string) {
    const q = query(this.col(propertyId), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(propertyId: string, inspectionId: string) {
    const orgId = this.org.orgId;
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}`);
    return docData(ref, { idField: 'id' }) as any;
  }

  async create(propertyId: string, payload: Partial<Inspection>) {
    const normalizedPropertyId = String(propertyId || '').trim();
    if (!normalizedPropertyId) throw new Error('Inspection must be created under a property.');
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();

    const data: Inspection = {
      id,
      orgId,
      propertyId: normalizedPropertyId,
      status: 'new',
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
      ...stripUndefined(payload as any)
    } as any;

    const ref = doc(this.fs, `orgs/${orgId}/properties/${normalizedPropertyId}/inspections/${id}`);
    await setDoc(ref, stripUndefined(data) as any);
    return id;
  }

  async update(propertyId: string, inspectionId: string, patch: Partial<Inspection>) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const ref = doc(this.fs, `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}`);
    await updateDoc(ref, {
      ...stripUndefined(patch as any),
      updatedAt: Date.now(),
      updatedBy: uid
    } as any);

    if (patch.status) {
      await this.activity.write({
        entityType: 'inspection',
        entityId: inspectionId,
        action: 'status_updated',
        message: `Inspection ${inspectionId} moved to ${patch.status}`,
        metadata: { propertyId, status: patch.status },
      });
      await this.notifications.create({
        userUid: uid,
        title: 'Inspection updated',
        message: `Inspection status is now ${patch.status}.`,
        level: patch.status === 'completed' ? 'success' : 'info',
        metadata: { inspectionId, propertyId },
      });
    }
  }

  async uploadSignature(params: { propertyId: string; inspectionId: string; kind: 'inspector' | 'client'; file: File }) {
    const uid = this.requireUid();
    const orgId = this.org.orgId;

    const upload = await this.uploadSvc.uploadInspectionSignature({
      orgId,
      propertyId: params.propertyId,
      inspectionId: params.inspectionId,
      kind: params.kind,
      file: params.file
    });

    const sig: InspectionSignature = {
      path: upload.path,
      url: upload.url,
      name: upload.name,
      signedAt: Date.now(),
      signedByUid: uid
    };

    const ref = doc(this.fs, `orgs/${orgId}/properties/${params.propertyId}/inspections/${params.inspectionId}`);
    await updateDoc(ref, {
      ...(params.kind === 'inspector' ? { signatureInspector: sig } : { signatureClient: sig }),
      updatedAt: Date.now(),
      updatedBy: uid
    } as any);

    return sig;
  }

   // ✅ NEW: findings sous inspection
  listFindings(propertyId: string, inspectionId: string) {
    const orgId = this.org.orgId;
    const ref = collection(
      this.fs,
      `orgs/${orgId}/properties/${propertyId}/inspections/${inspectionId}/findings`
    );

    // si tu as un champ createdAt/updatedAt tu peux orderBy
    const q = query(ref, orderBy('updatedAt', 'desc'), limit(500));

    return collectionData(q, { idField: 'id' }).pipe(
      catchError(() => of([])) // évite que 1 inspection casse tout
    ) as Observable<any[]>;
  }
}
