import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { SaBranding, SaOrgRow } from './sa-types';


@Injectable({ providedIn: 'root' })
export class SuperAdminOrgsService {
  private fs = inject(Firestore);

  // Normalise un orgId propre (Firestore doc id)
  normalizeOrgId(raw: string): string {
    return raw
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async createOrg(input: {
    orgId: string;
    name: string;
    logoUrl?: string;
    primaryColor?: string;
    seedAdminUid?: string; // optional existing auth user uid
  }): Promise<string> {
    const orgId = this.normalizeOrgId(input.orgId);
    if (!orgId) throw new Error('orgId invalide.');
    if (!input.name?.trim()) throw new Error('Le nom de l’organisation est requis.');

    const orgRef = doc(this.fs as any, `orgs/${orgId}`);

    // Orgs root
    await setDoc(orgRef as any, {
      orgId,
      name: input.name.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Branding default
    await setDoc(doc(this.fs as any, `orgs/${orgId}/branding/main`) as any, {
      orgId,
      name: input.name.trim(),
      logoUrl: input.logoUrl?.trim() || '',
      primaryColor: input.primaryColor?.trim() || '#6366f1',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Optional: seed an existing user as org admin
    if (input.seedAdminUid?.trim()) {
      const uid = input.seedAdminUid.trim();

      await setDoc(doc(this.fs as any, `orgs/${orgId}/members/${uid}`) as any, {
        uid,
        orgId,
        role: 'admin',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Optionnel mais utile: pousser l’utilisateur vers cette org
      await setDoc(doc(this.fs as any, `users/${uid}`) as any, {
        lastOrgId: orgId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    return orgId;
  }

  async listOrgs(max = 25): Promise<SaOrgRow[]> {
    const colRef = collection(this.fs as any, 'orgs');

    // Attention: orderBy('createdAt') exige que le champ existe sur tous les docs retournés.
    // Comme on le met à la création, c’est OK. Sinon, basculer sur 'updatedAt'.
    const q = query(colRef as any, orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q as any);

    return snap.docs.map(d => {
      const data: any = d.data();
      return {
        id: d.id,
        name: data?.name || data?.orgName || data?.displayName,
        createdAt: data?.createdAt,
      };
    });
  }

  async getOrg(orgIdRaw: string): Promise<{ orgId: string; name?: string } | null> {
    const orgId = this.normalizeOrgId(orgIdRaw);
    const ref = doc(this.fs as any, `orgs/${orgId}`);
    const snap = await getDoc(ref as any);
    if (!snap.exists()) return null;
    const data: any = snap.data();
    return { orgId, name: data?.name };
  }

  async getBranding(orgIdRaw: string): Promise<SaBranding | null> {
    const orgId = this.normalizeOrgId(orgIdRaw);
    const ref = doc(this.fs as any, `orgs/${orgId}/branding/main`);
    const snap = await getDoc(ref as any);
    if (!snap.exists()) return null;
    return snap.data() as any;
  }

  async updateBranding(orgIdRaw: string, patch: Partial<SaBranding>): Promise<void> {
    const orgId = this.normalizeOrgId(orgIdRaw);
    const ref = doc(this.fs as any, `orgs/${orgId}/branding/main`);
    await setDoc(ref as any, { ...patch, orgId, updatedAt: serverTimestamp() }, { merge: true });
  }

  /**
   * Action: "Open org as member" (optionnel)
   * - (1) Assure une membership active (si tu veux)
   * - (2) Met users/{uid}.lastOrgId = orgId
   */
  async openOrgAsUser(orgIdRaw: string, uid: string, ensureMember = false): Promise<void> {
    const orgId = this.normalizeOrgId(orgIdRaw);
    if (!uid?.trim()) throw new Error('uid requis.');

    if (ensureMember) {
      await setDoc(doc(this.fs as any, `orgs/${orgId}/members/${uid}`) as any, {
        uid,
        orgId,
        role: 'member',
        status: 'active',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
    }

    await setDoc(doc(this.fs as any, `users/${uid}`) as any, {
      lastOrgId: orgId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  /**
   * (Pour plus tard) Manage members: tu peux lister members d’une org.
   */
  async listMembers(orgIdRaw: string, max = 50): Promise<any[]> {
    const orgId = this.normalizeOrgId(orgIdRaw);
    const colRef = collection(this.fs as any, `orgs/${orgId}/members`);
    const q = query(colRef as any, orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q as any);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }
}
