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
} from '@angular/fire/firestore';
import { AgencyRecord } from '../../core/models/real-estate.models';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class AgenciesService {
  private fs = inject(Firestore);
  private auth = inject(Auth);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private agenciesCol() {
    return collection(this.fs, 'orgs');
  }

  list() {
    const q = query(this.agenciesCol(), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(agencyId: string) {
    return docData(doc(this.fs, `orgs/${agencyId}`), { idField: 'id' }) as any;
  }

  async create(payload: Partial<AgencyRecord>) {
    const uid = this.requireUid();
    const id = payload.id || crypto.randomUUID();
    const now = Date.now();

    const data: AgencyRecord = {
      id,
      name: String(payload.name || 'New Agency'),
      legalName: payload.legalName,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      zipCode: payload.zipCode,
      ownerUid: payload.ownerUid ?? uid,
      plan: payload.plan ?? 'starter',
      status: payload.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.fs, `orgs/${id}`), stripUndefined(data) as any, { merge: true });
    return id;
  }

  async update(agencyId: string, patch: Partial<AgencyRecord>) {
    await updateDoc(doc(this.fs, `orgs/${agencyId}`), stripUndefined({
      ...patch,
      updatedAt: Date.now(),
    } as any) as any);
  }

  async remove(agencyId: string) {
    await deleteDoc(doc(this.fs, `orgs/${agencyId}`));
  }
}
