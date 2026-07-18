import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, collectionData, doc, limit, orderBy, query, setDoc } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';
import { stripUndefined } from '../utils/firestore-clean';

export interface ActivityLogEntry {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  action: string;
  message?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  createdBy: string;
}

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private get orgId() {
    return this.org.requireOrgId();
  }

  private get uid() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  list(limitSize = 100) {
    const q = query(
      collection(this.fs, `orgs/${this.orgId}/activityLogs`),
      orderBy('createdAt', 'desc'),
      limit(limitSize),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  async write(entry: Omit<ActivityLogEntry, 'id' | 'orgId' | 'createdAt' | 'createdBy'>) {
    const id = crypto.randomUUID();
    const payload: ActivityLogEntry = {
      id,
      orgId: this.orgId,
      createdAt: Date.now(),
      createdBy: this.uid,
      ...entry,
    };

    await setDoc(doc(this.fs, `orgs/${this.orgId}/activityLogs/${id}`), stripUndefined(payload) as any);
    return id;
  }
}
