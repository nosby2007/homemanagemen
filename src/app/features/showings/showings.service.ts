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
import { ShowingRecord, ShowingStatus } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { requireShowingScope } from '../../core/utils/property-scope';

@Injectable({ providedIn: 'root' })
export class ShowingsService {
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
    return collection(this.fs, `orgs/${orgId}/showings`);
  }

  list(): Observable<any[]> {
    return from(this.scope.getCurrentScope()).pipe(
      switchMap((scope) => {
        const agentId = scope.agentId || scope.uid;
        const q = scope.isPrivileged
          ? query(this.col(), orderBy('scheduledAt', 'desc'), limit(300))
          : query(this.col(), where('agentId', '==', agentId), orderBy('scheduledAt', 'desc'), limit(200));
        return collectionData(q, { idField: 'id' }) as any;
      }),
    ) as any;
  }

  listByStatus(status: ShowingStatus) {
    const q = query(this.col(), where('status', '==', status), orderBy('scheduledAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(showingId: string) {
    const orgId = this.org.requireOrgId();
    return docData(doc(this.fs, `orgs/${orgId}/showings/${showingId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<ShowingRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const { propertyId, listingId, clientId } = requireShowingScope(payload as Record<string, unknown>);

    const data: ShowingRecord = {
      id,
      orgId,
      propertyId,
      listingId,
      clientId,
      agentId: payload.agentId,
      scheduledAt: Number(payload.scheduledAt || now),
      feedback: payload.feedback,
      agencyId: payload.agencyId,
      status: payload.status ?? 'scheduled',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/showings/${id}`), stripUndefined(data) as any);
    return id;
  }

  async update(showingId: string, patch: Partial<ShowingRecord>) {
    const orgId = this.org.requireOrgId();
    const uid = this.requireUid();
    await updateDoc(doc(this.fs, `orgs/${orgId}/showings/${showingId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any) as any);
  }

  async remove(showingId: string) {
    const orgId = this.org.requireOrgId();
    await deleteDoc(doc(this.fs, `orgs/${orgId}/showings/${showingId}`));
  }
}
