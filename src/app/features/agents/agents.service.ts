import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
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
import { AgentRecord } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class AgentsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private scope = inject(AccessScopeService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col() {
    const orgId = this.org.requireOrgId();
    return collection(this.fs, `orgs/${orgId}/agents`);
  }

  list(): Observable<any[]> {
    return from(this.scope.getCurrentScope()).pipe(
      switchMap((scope) => {
        const q = scope.isPrivileged
          ? query(this.col(), orderBy('updatedAt', 'desc'), limit(200))
          : query(this.col(), where('userUid', '==', scope.uid), limit(20));
        return collectionData(q, { idField: 'id' }) as any;
      }),
    ) as any;
  }

  listActive() {
    const q = query(this.col(), where('status', '==', 'active'), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(agentId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/agents/${agentId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<AgentRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const propertyIds = Array.isArray(payload.propertyIds)
      ? payload.propertyIds.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const defaultPropertyId = String(payload.defaultPropertyId || propertyIds[0] || '').trim() || undefined;
    if (!propertyIds.length || !defaultPropertyId) {
      throw new Error('Agent must be assigned to at least one property.');
    }

    const data: AgentRecord = {
      id,
      orgId,
      displayName: String(payload.displayName || 'Agent'),
      email: payload.email,
      phone: payload.phone,
      licenseNumber: payload.licenseNumber,
      commissionRate: payload.commissionRate,
      defaultPropertyId,
      propertyIds,
      userUid: payload.userUid,
      userId: payload.userId ?? null,
      authStatus: payload.authStatus ?? 'not_invited',
      invitationId: payload.invitationId ?? null,
      agencyId: payload.agencyId,
      status: payload.status ?? 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/agents/${id}`), stripUndefined(data) as any);
    return id;
  }

  async update(agentId: string, patch: Partial<AgentRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    await updateDoc(doc(this.fs, `orgs/${orgId}/agents/${agentId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
  }

  async remove(agentId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/agents/${agentId}`));
  }
}
