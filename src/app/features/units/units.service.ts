import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { UnitRecord } from '../../core/models/domain.models';
import { Observable } from 'rxjs';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class UnitsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private col() {
    return collection(this.fs, `orgs/${this.org.requireOrgId()}/units`);
  }

  list(): Observable<UnitRecord[]> {
    const qRef = query(this.col(), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(qRef, { idField: 'id' }) as Observable<UnitRecord[]>;
  }

  /** List units for a specific property */
  listByProperty(propertyId: string): Observable<UnitRecord[]> {
    const qRef = query(
      this.col(),
      where('propertyId', '==', propertyId),
      orderBy('updatedAt', 'desc'),
      limit(200),
    );
    return collectionData(qRef, { idField: 'id' }) as Observable<UnitRecord[]>;
  }

  async create(payload: Omit<UnitRecord, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const now = Date.now();
    const id = crypto.randomUUID();

    const data: UnitRecord = {
      id,
      orgId: this.org.requireOrgId(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.fs, `orgs/${this.org.requireOrgId()}/units/${id}`), stripUndefined(data) as any);
    return id;
  }

  async update(unitId: string, patch: Partial<UnitRecord>) {
    await updateDoc(doc(this.fs, `orgs/${this.org.requireOrgId()}/units/${unitId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
    }) as any);
  }

  async remove(unitId: string) {
    const ref = doc(this.fs, `orgs/${this.org.requireOrgId()}/units/${unitId}`);
    const snap = await getDoc(ref);
    const unit = snap.exists() ? (snap.data() as any) : null;
    if (unit?.activeTenantId || unit?.status === 'occupied') {
      throw new Error('Cannot delete an occupied unit. End the lease and vacate the tenant first.');
    }
    await deleteDoc(ref);
  }
}
