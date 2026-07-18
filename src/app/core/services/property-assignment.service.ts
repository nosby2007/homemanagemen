import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../org/org-context.service';
import { MembershipStatus, MembershipTargetType, PropertyAssignment, UserRole } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class PropertyAssignmentService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  private col() {
    return collection(this.fs, 'propertyAssignments');
  }

  async assignUserToProperty(
    userId: string,
    orgId: string,
    propertyId: string,
    role: UserRole,
    targetType: MembershipTargetType,
    targetId: string,
    options?: { unitId?: string; email?: string; status?: MembershipStatus; invitationId?: string | null },
  ) {
    const actorUid = this.requireUid();
    const now = Date.now();
    const id = `${orgId}_${propertyId}_${userId}_${targetType}_${targetId}`;

    const userSnap = await getDoc(doc(this.fs, `users/${userId}`));
    const fallbackEmail = userSnap.exists() ? String((userSnap.data() as any)?.email || '') : '';

    const assignment: PropertyAssignment = {
      id,
      orgId,
      propertyId,
      unitId: options?.unitId,
      userId,
      email: String(options?.email || fallbackEmail || '').toLowerCase(),
      role,
      targetType,
      targetId,
      accessLevel: options?.unitId ? 'unit' : 'property',
      status: options?.status || 'active',
      invitedBy: actorUid,
      invitationId: options?.invitationId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.fs, `propertyAssignments/${id}`), assignment, { merge: true });
    return assignment;
  }

  getPropertyAssignmentsForUser(userId: string, orgId?: string) {
    const scopedOrgId = String(orgId || this.org.orgId || '').trim();
    if (!scopedOrgId) throw new Error('Missing orgId');
    const q = query(
      this.col(),
      where('orgId', '==', scopedOrgId),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(300),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  getPropertyAssignmentsByProperty(propertyId: string, orgId?: string) {
    const scopedOrgId = String(orgId || this.org.orgId || '').trim();
    if (!scopedOrgId) throw new Error('Missing orgId');
    const q = query(
      this.col(),
      where('orgId', '==', scopedOrgId),
      where('propertyId', '==', propertyId),
      where('status', '==', 'active'),
      limit(500),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  listByOrg(orgId?: string, maxItems = 500) {
    const scopedOrgId = String(orgId || this.org.orgId || '').trim();
    if (!scopedOrgId) throw new Error('Missing orgId');
    const q = query(
      this.col(),
      where('orgId', '==', scopedOrgId),
      where('status', '==', 'active'),
      limit(maxItems),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  async listUserPropertyIds(userId: string, orgId?: string): Promise<string[]> {
    const scopedOrgId = String(orgId || this.org.orgId || '').trim();
    if (!scopedOrgId) return [];

    const snap = await getDocs(
      query(
        this.col(),
        where('orgId', '==', scopedOrgId),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        limit(500),
      ),
    );

    const ids = new Set<string>();
    snap.docs.forEach((d) => {
      const row = d.data() as any;
      const propertyId = String(row?.propertyId || '').trim();
      if (propertyId) ids.add(propertyId);
    });
    return Array.from(ids);
  }
}
