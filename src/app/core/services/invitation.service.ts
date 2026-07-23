import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Firestore, collection, collectionData, limit, orderBy, query, where } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';

export interface CreateInvitationPayload {
  orgId: string;
  propertyId: string;
  unitId?: string;
  email: string;
  role: string;
  targetType: string;
  targetId: string;
}

export interface InvitationPreview {
  orgName: string;
  orgId?: string;
  propertyId?: string;
  unitId?: string;
  email: string;
  role: string;
  targetType: string;
  targetDisplayName: string;
  expiresAt: number;
}

export interface InvitationEmailDelivery {
  status: 'sent' | 'skipped' | 'failed';
  messageId?: string | null;
  error?: string | null;
  attemptedAt?: number;
}

export interface PendingInvitationRow {
  id: string;
  orgId?: string;
  propertyId?: string;
  unitId?: string;
  email: string;
  role: string;
  status?: string;
  targetType: string;
  targetId: string;
  expiresAt: number;
  reminderCount?: number;
  lastReminderAt?: number | null;
  emailDelivery?: InvitationEmailDelivery;
}

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private functions = inject(Functions);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  listPendingForCurrentOrg(maxItems = 50) {
    const orgId = this.org.requireOrgId();
    const q = query(
      collection(this.fs, 'invitations'),
      where('orgId', '==', orgId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(maxItems),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  async createInvitation(payload: CreateInvitationPayload) {
    const call = httpsCallable(this.functions, 'createInvitation');
    const result: any = await call(payload);
    return result?.data as {
      invitationId: string;
      inviteUrl: string;
      expiresAt: number;
      emailDeliveryStatus?: 'sent' | 'skipped' | 'failed';
    };
  }

  async createInvitationForPropertyRole(
    orgId: string,
    propertyId: string,
    unitId: string | undefined,
    role: string,
    targetType: string,
    targetId: string,
    email: string,
  ) {
    return this.createInvitation({
      orgId,
      propertyId,
      unitId,
      role,
      targetType,
      targetId,
      email,
    });
  }

  async resendInvitation(invitationId: string) {
    const call = httpsCallable(this.functions, 'resendInvitation');
    const result: any = await call({ invitationId });
    return result?.data as {
      invitationId: string;
      inviteUrl: string;
      expiresAt: number;
      emailDeliveryStatus?: 'sent' | 'skipped' | 'failed';
    };
  }

  async revokeInvitation(invitationId: string) {
    const call = httpsCallable(this.functions, 'revokeInvitation');
    const result: any = await call({ invitationId });
    return result?.data as { invitationId: string; status: string };
  }

  async validateInvitation(token: string) {
    const call = httpsCallable(this.functions, 'validateInvitation');
    const result: any = await call({ token });
    return result?.data as InvitationPreview;
  }

  async acceptInvitation(payload: { token: string; password: string; displayName: string; phone?: string }) {
    const call = httpsCallable(this.functions, 'acceptInvitation');
    const result: any = await call(payload);
    return result?.data as { uid: string; orgId: string; role: string; redirect: string };
  }

  async acceptPropertyInvitation(token: string, password: string, displayName: string, phone?: string) {
    return this.acceptInvitation({ token, password, displayName, phone });
  }

  async repairTenantAssignment(orgId: string, tenantId: string) {
    const call = httpsCallable(this.functions, 'repairTenantAssignment');
    const result: any = await call({ orgId, tenantId });
    return result?.data as { assignmentId: string; propertyId: string; unitId: string };
  }
}
