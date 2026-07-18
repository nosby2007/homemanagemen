import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, query, orderBy, limit } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Storage, ref, getDownloadURL } from '@angular/fire/storage';
import { from, map } from 'rxjs';

import { OrgContextService } from '../../core/org/org-context.service';
import { Report, ReportInclude } from '../../core/models/report.models';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private fs = inject(Firestore);
  private functions = inject(Functions);
  private storage = inject(Storage);
  private org = inject(OrgContextService);

  listLatest() {
    const orgId = this.org.orgId;
    const col = collection(this.fs, `orgs/${orgId}/reports`);
    const q = query(col, orderBy('createdAt', 'desc'), limit(30));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(reportId: string) {
    const orgId = this.org.orgId;
    const r = doc(this.fs, `orgs/${orgId}/reports/${reportId}`);
    return docData(r, { idField: 'id' }) as any;
  }

  async requestPdf(params: { from?: number; to?: number; include: ReportInclude; inspectionId?: string }) {
    const orgId = this.org.orgId;
    const call = httpsCallable(this.functions, 'generateReportPdf');
    const res: any = await call({ orgId, ...params });
    return res?.data as { reportId: string };
  }

  downloadUrl$(storagePath: string) {
    const r = ref(this.storage, storagePath);
    return from(getDownloadURL(r)).pipe(map(url => url));
  }
}
