import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

export type UploadResult = {
  path: string;
  url: string;
  name: string;
  size: number;
  contentType: string;
};

@Injectable({ providedIn: 'root' })
export class StorageUploadService {
  private storage = inject(Storage);

  private async upload(path: string, file: File): Promise<UploadResult> {
    const storageRef = ref(this.storage, path);
    const snap = await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(snap.ref);
    return {
      path,
      url,
      name: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
    };
  }

  uploadDocument(path: string, file: File) {
    return this.upload(path, file);
  }

  uploadSignature(params: { orgId: string; propertyId: string; inspectionId: string; kind: 'inspector' | 'client'; file: File; }) {
    const ts = Date.now();
    const safeName = params.kind + '_' + ts + '_signature.png';
    const path = `orgs/${params.orgId}/properties/${params.propertyId}/inspections/${params.inspectionId}/signatures/${safeName}`;
    return this.upload(path, params.file);
  }

  uploadFindingPhoto(params: { orgId: string; propertyId: string; inspectionId: string; findingId: string; file: File; }) {
    const ts = Date.now();
    const path = `orgs/${params.orgId}/properties/${params.propertyId}/inspections/${params.inspectionId}/findings/${params.findingId}/photos/${ts}_${params.file.name}`;
    return this.upload(path, params.file);
  }

  uploadChecklistItemPhoto(params: { orgId: string; propertyId: string; inspectionId: string; sectionId: string; itemId: string; file: File; }) {
    const ts = Date.now();
    const path = `orgs/${params.orgId}/properties/${params.propertyId}/inspections/${params.inspectionId}/checklistSections/${params.sectionId}/items/${params.itemId}/photos/${ts}_${params.file.name}`;
    return this.upload(path, params.file);
  }
  uploadInspectionSignature(params: { orgId: string; propertyId: string; inspectionId: string; kind: 'inspector' | 'client'; file: File; }) {
    const ts = Date.now();
    const safeName = params.kind + '_' + ts + '_signature.png';
    const path = `orgs/${params.orgId}/properties/${params.propertyId}/inspections/${params.inspectionId}/signatures/${safeName}`;
    return this.upload(path, params.file);
  }
}
