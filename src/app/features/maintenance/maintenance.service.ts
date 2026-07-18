import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { MaintenanceRequest, MaintenancePriority } from '../../core/models/domain.models';
import { Observable } from 'rxjs';
import { requireMaintenanceScope } from '../../core/utils/property-scope';

export { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '../../core/models/domain.models';

export type MaintenanceAssigneeType = 'vendor' | 'staff';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private activity = inject(ActivityLogService);
  private notifications = inject(NotificationService);

  private col() {
    return collection(this.fs, `orgs/${this.org.requireOrgId()}/maintenanceRequests`);
  }

  /** All requests for the org (admin/manager view) */
  list(): Observable<MaintenanceRequest[]> {
    const q = query(this.col(), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as Observable<MaintenanceRequest[]>;
  }

  /** Only the requests submitted by the current tenant (tenant portal view) */
  listForCurrentTenant(): Observable<MaintenanceRequest[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const q = query(this.col(), where('tenantUid', '==', uid), orderBy('updatedAt', 'desc'), limit(50));
    return collectionData(q, { idField: 'id' }) as Observable<MaintenanceRequest[]>;
  }

  /** Requests filtered by property (landlord view) */
  listByProperty(propertyId: string): Observable<MaintenanceRequest[]> {
    const q = query(this.col(), where('propertyId', '==', propertyId), orderBy('updatedAt', 'desc'), limit(100));
    return collectionData(q, { idField: 'id' }) as Observable<MaintenanceRequest[]>;
  }

  /** Open requests count for dashboard KPI */
  listOpen(): Observable<MaintenanceRequest[]> {
    const q = query(this.col(), where('status', 'in', ['new', 'in_progress']), orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as Observable<MaintenanceRequest[]>;
  }

  async create(payload: {
    title: string;
    description?: string;
    category?: string;
    priority?: MaintenancePriority;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
  }): Promise<string> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const { title, propertyId, tenantId, unitId } = requireMaintenanceScope(payload);
    const orgId = this.org.requireOrgId();
    const id = crypto.randomUUID();
    const now = Date.now();

    const data: MaintenanceRequest = {
      id,
      orgId,
      tenantUid: uid,
      tenantId,
      propertyId,
      unitId,
      title,
      description: payload.description ?? '',
      category: payload.category ?? 'general',
      priority: payload.priority ?? 'medium',
      status: 'new',
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    };

    await setDoc(doc(this.fs, `orgs/${orgId}/maintenanceRequests/${id}`), data as any);
    await this.activity.write({
      entityType: 'maintenanceRequest',
      entityId: id,
      action: 'created',
      message: `Maintenance request created: ${title}`,
      metadata: { priority: data.priority, propertyId: data.propertyId },
    });
    await this.notifications.create({
      userUid: uid,
      title: 'Maintenance request submitted',
      message: title,
      level: 'success',
      metadata: { requestId: id },
    });
    return id;
  }

  async updateStatus(requestId: string, status: MaintenanceRequest['status']): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const orgId = this.org.requireOrgId();
    await updateDoc(doc(this.fs, `orgs/${orgId}/maintenanceRequests/${requestId}`), {
      status,
      updatedAt: Date.now(),
      updatedBy: uid,
      ...(status === 'completed' ? { resolvedAt: Date.now() } : {}),
    } as any);
  }

  private async resolveAssigneeUid(type: MaintenanceAssigneeType, profileId: string): Promise<string> {
    const orgId = this.org.requireOrgId();
    const collectionName = type === 'vendor' ? 'vendors' : 'staff';
    const snap = await getDoc(doc(this.fs, `orgs/${orgId}/${collectionName}/${profileId}`));
    if (!snap.exists()) {
      throw new Error(`${type} profile not found`);
    }
    const profile = snap.data() as Record<string, unknown>;
    const authUid = String(profile['userId'] || '').trim();
    if (!authUid) {
      throw new Error(`${type} profile is not linked to an active user`);
    }
    return authUid;
  }

  async assignRequest(
    requestId: string,
    payload: { assigneeType: MaintenanceAssigneeType; profileId: string },
  ): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const orgId = this.org.requireOrgId();
    const profileId = String(payload.profileId || '').trim();
    if (!profileId) throw new Error('Assignee profileId is required');

    const assigneeUid = await this.resolveAssigneeUid(payload.assigneeType, profileId);
    const now = Date.now();

    const patch: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: uid,
      status: 'in_progress',
    };

    if (payload.assigneeType === 'vendor') {
      patch['assignedVendorId'] = profileId;
      patch['assignedVendorUid'] = assigneeUid;
      patch['assignedStaffId'] = null;
      patch['assignedStaffUid'] = null;
    } else {
      patch['assignedStaffId'] = profileId;
      patch['assignedStaffUid'] = assigneeUid;
      patch['assignedVendorId'] = null;
      patch['assignedVendorUid'] = null;
    }

    await updateDoc(doc(this.fs, `orgs/${orgId}/maintenanceRequests/${requestId}`), patch as any);
  }

  async unassignRequest(requestId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const orgId = this.org.requireOrgId();

    await updateDoc(doc(this.fs, `orgs/${orgId}/maintenanceRequests/${requestId}`), {
      assignedVendorId: null,
      assignedVendorUid: null,
      assignedStaffId: null,
      assignedStaffUid: null,
      updatedAt: Date.now(),
      updatedBy: uid,
    } as any);
  }
}
