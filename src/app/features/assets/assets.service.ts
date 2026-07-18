import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, setDoc, updateDoc, deleteDoc,
  collectionData, docData, query, where, orderBy, limit, getDocs, getDoc
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { Asset, AssetCategory, AssetStatus } from '../../core/models/asset.models';
import { stripUndefined } from '../../core/utils/firestore-clean';

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private newId(): string {
    return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  listOrgLatest(propertyId?: string) {
    const orgId = this.org.orgId;
    const col = collection(this.fs, `orgs/${orgId}/assets`);
    const q = propertyId
      ? query(col, where('propertyId', '==', propertyId), orderBy('updatedAt', 'desc'), limit(200))
      : query(col, orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(assetId: string) {
    const orgId = this.org.orgId;
    const ref = doc(this.fs, `orgs/${orgId}/assets/${assetId}`);
    return docData(ref, { idField: 'id' }) as any;
  }

  async create(payload: {
    propertyId: string;
    name: string;
    category: AssetCategory;
    status?: AssetStatus;

    roomArea?: string;
    manufacturer?: string;
    model?: string;
    serial?: string;

    installedAt?: number | null;
    lastServiceAt?: number | null;
    nextServiceAt?: number | null;

    purchasePrice?: number | null;
    notes?: string;

    warranty?: {
      provider?: string;
      startAt?: number | null;
      endAt?: number | null;
      notes?: string;
    };

    tags?: string[];
  }) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const id = this.newId();
    const now = Date.now();

    const data: Asset = {
      id,
      orgId,
      propertyId: (payload.propertyId || '').trim(),
      name: (payload.name || '').trim(),
      category: payload.category,
      status: payload.status ?? 'active',

      roomArea: (payload.roomArea || '').trim() || null,
      manufacturer: (payload.manufacturer || '').trim() || null,
      model: (payload.model || '').trim() || null,
      serial: (payload.serial || '').trim() || null,

      installedAt: payload.installedAt ?? null,
      lastServiceAt: payload.lastServiceAt ?? null,
      nextServiceAt: payload.nextServiceAt ?? null,

      purchasePrice: payload.purchasePrice ?? null,
      notes: (payload.notes || '').trim() || null,

      warranty: payload.warranty ? stripUndefined({
        provider: (payload.warranty.provider || '').trim() || null,
        startAt: payload.warranty.startAt ?? null,
        endAt: payload.warranty.endAt ?? null,
        notes: (payload.warranty.notes || '').trim() || null,
      }) : null,

      tags: (payload.tags ?? []).map(x => String(x).trim()).filter(Boolean),

      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    };

    if (!data.propertyId) throw new Error('propertyId is required');
    if (!data.name) throw new Error('name is required');

    const ref = doc(this.fs, `orgs/${orgId}/assets/${id}`);
    await setDoc(ref, data as any);
    return id;
  }

  async update(assetId: string, patch: Partial<Asset>) {
    const orgId = this.org.orgId;
    const uid = this.requireUid();
    const ref = doc(this.fs, `orgs/${orgId}/assets/${assetId}`);

    const safe = stripUndefined({
      ...patch,
      updatedAt: Date.now(),
      updatedBy: uid
    } as any);

    await updateDoc(ref, safe);
  }

  async remove(assetId: string) {
    const orgId = this.org.orgId;
    const ref = doc(this.fs, `orgs/${orgId}/assets/${assetId}`);
    await deleteDoc(ref);
  }

  /** Optionnel: évite doublons serial dans une property */
  async existsSerial(propertyId: string, serial: string): Promise<boolean> {
    const orgId = this.org.orgId;
    const s = (serial || '').trim();
    if (!s) return false;

    const col = collection(this.fs, `orgs/${orgId}/assets`);
    const q = query(col, where('propertyId', '==', propertyId), where('serial', '==', s), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  async getOnce(assetId: string): Promise<Asset | null> {
    const orgId = this.org.orgId;
    const ref = doc(this.fs, `orgs/${orgId}/assets/${assetId}`);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Asset) : null;
  }
}
