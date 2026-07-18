import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';
import { stripUndefined } from '../utils/firestore-clean';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  orgId: string;
  userUid?: string;
  title: string;
  message?: string;
  level: NotificationLevel;
  read: boolean;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
  metadata?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
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

  listForCurrentUser(limitSize = 100) {
    const uid = this.uid;
    const q = query(
      collection(this.fs, `orgs/${this.orgId}/notifications`),
      where('userUid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limitSize),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  async create(payload: Omit<AppNotification, 'id' | 'orgId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'read'> & { read?: boolean }) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const docPayload: AppNotification = {
      id,
      orgId: this.orgId,
      createdAt: now,
      createdBy: this.uid,
      updatedAt: now,
      updatedBy: this.uid,
      read: payload.read ?? false,
      ...payload,
    };

    await setDoc(doc(this.fs, `orgs/${this.orgId}/notifications/${id}`), stripUndefined(docPayload) as any);
    return id;
  }

  async markRead(notificationId: string) {
    await updateDoc(doc(this.fs, `orgs/${this.orgId}/notifications/${notificationId}`), {
      read: true,
      updatedAt: Date.now(),
      updatedBy: this.uid,
    } as any);
  }
}
