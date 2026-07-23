import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  query,
  orderBy,
  where,
  limit,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { StorageUploadService } from '../../core/utils/storage-upload.service';
import { DocumentCategory, DocumentRecord } from '../../core/models/domain.models';
import { Observable } from 'rxjs';
import { requireDocumentScope } from '../../core/utils/property-scope';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private upload = inject(StorageUploadService);

  private col() {
    return collection(this.fs, `orgs/${this.org.requireOrgId()}/documents`);
  }

  list(): Observable<DocumentRecord[]> {
    const qRef = query(this.col(), orderBy('createdAt', 'desc'), limit(200));
    return collectionData(qRef, { idField: 'id' }) as Observable<DocumentRecord[]>;
  }

  listByProperty(propertyId: string): Observable<DocumentRecord[]> {
    const qRef = query(
      this.col(),
      where('propertyId', '==', propertyId),
      orderBy('createdAt', 'desc'),
      limit(200),
    );
    return collectionData(qRef, { idField: 'id' }) as Observable<DocumentRecord[]>;
  }

  listForCurrentTenant(tenantId: string): Observable<DocumentRecord[]> {
    const qRef = query(
      this.col(),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc'),
      limit(200),
    );
    return collectionData(qRef, { idField: 'id' }) as Observable<DocumentRecord[]>;
  }

  async uploadDocument(payload: {
    title: string;
    category: DocumentCategory;
    file: File;
    visibility: NonNullable<DocumentRecord['visibility']>;
    tenantId?: string;
    propertyId?: string;
    unitId?: string;
    leaseId?: string;
  }) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const { propertyId, tenantId, leaseId, visibility } = requireDocumentScope(payload);
    const unitId = String(payload.unitId || '').trim() || undefined;

    const orgId = this.org.requireOrgId();
    const id = crypto.randomUUID();
    const now = Date.now();

    const storagePath = `orgs/${orgId}/documents/${id}/${payload.file.name}`;
    const uploaded = await this.upload.uploadDocument(storagePath, payload.file);

    const docDataValue: DocumentRecord = {
      id,
      orgId,
      title: payload.title,
      category: payload.category,
      fileName: payload.file.name,
      contentType: payload.file.type,
      size: payload.file.size,
      storagePath: uploaded.path,
      downloadUrl: uploaded.url,
      tenantId,
      propertyId,
      unitId,
      leaseId,
      visibility: visibility as DocumentRecord['visibility'],
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/documents/${id}`), docDataValue as any);
    return id;
  }
}
