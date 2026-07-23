import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, deleteDoc, doc, docData, query, orderBy, where, limit, setDoc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { stripUndefined } from '../../core/utils/firestore-clean';
import { Observable, map } from 'rxjs';

export interface Tenant {
  id: string;
  orgId: string;
  /** Normalized: Firebase Auth UID (formerly userUid — kept for backward read compat) */
  userId?: string | null;
  /** @deprecated use userId */
  userUid?: string;
  authStatus?: 'not_invited' | 'invited' | 'active' | 'disabled';
  invitationId?: string | null;
  email?: string;
  displayName?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  moveInDate?: number;
  leaseEndDate?: number;
  status?: 'active' | 'inactive' | 'lead';
  /** ID of the currently assigned unit */
  currentUnitId?: string;
  /** ID of the active lease */
  currentLeaseId?: string;
  /** ID of the property */
  currentPropertyId?: string;
  primaryPropertyId?: string;
  primaryUnitId?: string;
  propertyIds?: string[];
  unitIds?: string[];
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private requireUid() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private normalizeAssignmentFields(data: Partial<Tenant>) {
    const currentPropertyId = String(data.currentPropertyId || '').trim() || undefined;
    const currentUnitId = String(data.currentUnitId || '').trim() || undefined;
    const primaryPropertyId = String(data.primaryPropertyId || currentPropertyId || '').trim() || undefined;
    const primaryUnitId = String(data.primaryUnitId || currentUnitId || '').trim() || undefined;

    return {
      currentPropertyId,
      currentUnitId,
      primaryPropertyId,
      primaryUnitId,
      propertyIds: primaryPropertyId ? [primaryPropertyId] : undefined,
      unitIds: primaryUnitId ? [primaryUnitId] : undefined,
    };
  }

  private tenantsCol(orgId?: string) {
    const oid = orgId ?? this.org.requireOrgId();
    return collection(this.fs, `orgs/${oid}/tenants`);
  }

  list(): Observable<Tenant[]> {
    const q = query(this.tenantsCol(), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as Observable<Tenant[]>;
  }

  /** List tenants filtered by property */
  listByProperty(propertyId: string): Observable<Tenant[]> {
    const q = query(
      this.tenantsCol(),
      where('currentPropertyId', '==', propertyId),
      orderBy('updatedAt', 'desc'),
      limit(200),
    );
    return collectionData(q, { idField: 'id' }) as Observable<Tenant[]>;
  }

  /** Resolve a tenant profile for the currently logged-in user.
   *  Queries by userId (normalized). Falls back to userUid for legacy docs. */
  getByUserId(userId: string): Observable<Tenant | null> {
    const orgId = this.org.requireOrgId();
    const q = query(
      this.tenantsCol(orgId),
      where('userId', '==', userId),
      limit(1),
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map((docs) => (docs.length ? docs[0] as Tenant : null)),
    );
  }

  get(tenantId: string): Observable<Tenant> {
    const ref = doc(this.fs, `orgs/${this.org.requireOrgId()}/tenants/${tenantId}`);
    return docData(ref, { idField: 'id' }) as Observable<Tenant>;
  }

  async create(data: Partial<Tenant>) {
    const id = crypto.randomUUID();
    const uid = this.requireUid();
    const now = Date.now();
    const scope = this.normalizeAssignmentFields(data);
    if (!scope.currentPropertyId) throw new Error('Tenant must be linked to a property.');
    if (!scope.currentUnitId) throw new Error('Tenant must be linked to a unit.');
    const payload: Tenant = {
      id,
      orgId: this.org.requireOrgId(),
      // Normalized write: always use userId
      userId: data.userId ?? data.userUid ?? null,
      authStatus: data.authStatus ?? 'not_invited',
      invitationId: data.invitationId ?? null,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      phone: data.phone ?? '',
      status: data.status ?? 'lead',
      leaseEndDate: data.leaseEndDate,
      currentPropertyId: scope.currentPropertyId,
      currentUnitId: scope.currentUnitId,
      currentLeaseId: data.currentLeaseId,
      primaryPropertyId: scope.primaryPropertyId,
      primaryUnitId: scope.primaryUnitId,
      propertyIds: scope.propertyIds,
      unitIds: scope.unitIds,
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    };
    await setDoc(doc(this.fs, `orgs/${this.org.requireOrgId()}/tenants/${id}`), stripUndefined(payload) as any);
    return id;
  }

  async update(tenantId: string, patch: Partial<Tenant>) {
    const uid = this.requireUid();
    const scope = this.normalizeAssignmentFields(patch);
    await updateDoc(doc(this.fs, `orgs/${this.org.requireOrgId()}/tenants/${tenantId}`), {
      ...stripUndefined({
        ...patch,
        ...scope,
      } as any),
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any);
  }

  async remove(tenantId: string) {
    await deleteDoc(doc(this.fs, `orgs/${this.org.requireOrgId()}/tenants/${tenantId}`));
  }
}
