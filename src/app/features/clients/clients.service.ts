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
import { ClientRecord, ClientType } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class ClientsService {
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
    return collection(this.fs, `orgs/${orgId}/clients`);
  }

  private normalizePropertyScope(payload: Partial<ClientRecord>) {
    const propertyIds = Array.isArray(payload.propertyIds)
      ? payload.propertyIds.map((value) => String(value || '').trim()).filter(Boolean)
      : String(payload.propertyId || payload.defaultPropertyId || '').trim()
        ? [String(payload.propertyId || payload.defaultPropertyId || '').trim()]
        : [];
    const defaultPropertyId = String(payload.defaultPropertyId || propertyIds[0] || payload.propertyId || '').trim() || undefined;
    const propertyId = String(payload.propertyId || defaultPropertyId || '').trim() || undefined;
    const unitId = String(payload.unitId || '').trim() || undefined;
    return { propertyIds, defaultPropertyId, propertyId, unitId };
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

  listByType(clientType: ClientType) {
    const q = query(this.col(), where('clientType', '==', clientType), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(clientId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/clients/${clientId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<ClientRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const scope = this.normalizePropertyScope(payload);
    if (!scope.propertyIds.length) throw new Error('Client must be assigned to at least one property.');

    const data: ClientRecord = {
      id,
      orgId,
      fullName: String(payload.fullName || 'Client'),
      clientType: payload.clientType ?? 'buyer',
      email: payload.email,
      phone: payload.phone,
      propertyId: scope.propertyId,
      unitId: scope.unitId,
      defaultPropertyId: scope.defaultPropertyId,
      propertyIds: scope.propertyIds,
      assignedAgentId: payload.assignedAgentId,
      userId: payload.userId ?? null,
      authStatus: payload.authStatus ?? 'not_invited',
      invitationId: payload.invitationId ?? null,
      budget: payload.budget,
      preferredLocation: payload.preferredLocation,
      notes: payload.notes,
      agencyId: payload.agencyId,
      status: payload.status ?? 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/clients/${id}`), stripUndefined(data) as any);
    return id;
  }

  async update(clientId: string, patch: Partial<ClientRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const scope = this.normalizePropertyScope(patch);
    await updateDoc(doc(this.fs, `orgs/${orgId}/clients/${clientId}`), stripUndefined({
      ...patch,
      ...(scope.propertyIds.length ? scope : {}),
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
  }

  async remove(clientId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/clients/${clientId}`));
  }
}
