import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  getDoc,
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
import { ActivityLogService } from '../../core/services/activity-log.service';
import { NotificationService } from '../../core/services/notification.service';
import { LEAD_TRANSITIONS } from '../../core/auth/rbac';
import { LeadRecord, LeadStatus } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class LeadsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private scope = inject(AccessScopeService);
  private activity = inject(ActivityLogService);
  private notifications = inject(NotificationService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col() {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/leads`);
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

  listByStatus(status: LeadStatus) {
    const q = query(this.col(), where('status', '==', status), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(leadId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/leads/${leadId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<LeadRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();

    const data: LeadRecord = {
      id,
      orgId,
      fullName: String(payload.fullName || 'Lead'),
      email: payload.email,
      phone: payload.phone,
      source: payload.source,
      interestType: payload.interestType ?? 'buy',
      budget: payload.budget,
      preferredLocation: payload.preferredLocation,
      assignedAgentId: payload.assignedAgentId,
      status: payload.status ?? 'new',
      notes: payload.notes,
      nextFollowUpDate: payload.nextFollowUpDate,
      agencyId: payload.agencyId,
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/leads/${id}`), stripUndefined(data) as any);
    await this.activity.write({
      entityType: 'lead',
      entityId: id,
      action: 'created',
      message: `Lead created: ${data.fullName}`,
      metadata: { source: data.source, interestType: data.interestType },
    });
    await this.notifications.create({
      userUid: uid,
      title: 'Lead created',
      message: `${data.fullName} added to your pipeline`,
      level: 'success',
      metadata: { leadId: id },
    });
    return id;
  }

  async update(leadId: string, patch: Partial<LeadRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const current = await this.getSnapshot(leadId);
    if (patch.status && patch.status !== current.status) {
      const allowed = LEAD_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(patch.status)) {
        throw new Error(`Invalid lead status transition: ${current.status} -> ${patch.status}`);
      }
      await this.activity.write({
        entityType: 'lead',
        entityId: leadId,
        action: 'statusChanged',
        message: `Lead status changed: ${current.status} → ${patch.status}`,
        metadata: { fromStatus: current.status, toStatus: patch.status },
      });
    }
    await updateDoc(doc(this.fs, `orgs/${orgId}/leads/${leadId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
  }

  private async getSnapshot(leadId: string): Promise<LeadRecord> {
    const orgId = this.org.requireOrgId();
    const snap = await getDoc(doc(this.fs, `orgs/${orgId}/leads/${leadId}`));
    if (!snap.exists()) throw new Error('Lead not found');
    return snap.data() as LeadRecord;
  }

  async remove(leadId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/leads/${leadId}`));
  }
}
