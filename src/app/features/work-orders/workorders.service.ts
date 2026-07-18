import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, docData, collectionData, query, orderBy, limit } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';
import { stripUndefined } from '../../core/utils/firestore-clean';

export interface WorkOrder {
  id: string;
  orgId: string;
  propertyId: string;
  inspectionId?: string;
  findingId?: string;
  summary: string;
  details?: string | null;
  status: 'new' | 'assigned' | 'in_progress' | 'done' | 'closed';
  assignedTo?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

@Injectable({ providedIn: 'root' })
export class WorkOrdersService {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  listLatest() {
    const orgId = this.org.orgId;
    const col = collection(this.fs, `orgs/${orgId}/workOrders`);
    const q = query(col, orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  }

  get(id: string) {
    const orgId = this.org.orgId;
    const ref = doc(this.fs, `orgs/${orgId}/workOrders/${id}`);
    return docData(ref, { idField: 'id' }) as any;
  }

  async createFromFinding(params: {
    findingId: string;
    finding: { propertyId: string; inspectionId?: string; summary: string; details?: string | null; roomArea?: string | null; severity?: string };
  }): Promise<{ workOrderId: string; existed: boolean }>{
    const orgId = this.org.orgId;
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const propertyId = String(params.finding.propertyId || '').trim();
    const summary = String(params.finding.summary || '').trim();
    if (!propertyId) throw new Error('Work order must be linked to a property.');
    if (!summary) throw new Error('Work order summary is required.');

    const id = crypto.randomUUID();
    const now = Date.now();
    const data: WorkOrder = {
      id,
      orgId,
      propertyId,
      inspectionId: params.finding.inspectionId,
      findingId: params.findingId,
      summary,
      details: params.finding.details ?? null,
      status: 'new',
      assignedTo: null,
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    };

    const ref = doc(this.fs, `orgs/${orgId}/workOrders/${id}`);
    await setDoc(ref, stripUndefined(data) as any);
    return { workOrderId: id, existed: false };
  }

  async createManual(payload: {
    propertyId: string;
    summary: string;
    details?: string | null;
    assignedTo?: string | null;
    priority?: 'low' | 'medium' | 'high' | 'emergency';
  }) {
    const orgId = this.org.orgId;
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const propertyId = String(payload.propertyId || '').trim();
    const summary = String(payload.summary || '').trim();
    if (!propertyId) throw new Error('Maintenance request must be linked to a property.');
    if (!summary) throw new Error('Maintenance request summary is required.');

    const id = crypto.randomUUID();
    const now = Date.now();

    await setDoc(doc(this.fs, `orgs/${orgId}/workOrders/${id}`), {
      id,
      orgId,
      propertyId,
      summary,
      details: payload.details ?? null,
      assignedTo: payload.assignedTo ?? null,
      priority: payload.priority ?? 'medium',
      status: 'new',
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    } as any);

    return id;
  }

  async update(id: string, patch: Partial<WorkOrder>) {
    const orgId = this.org.orgId;
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const ref = doc(this.fs, `orgs/${orgId}/workOrders/${id}`);
    await updateDoc(ref, { ...stripUndefined(patch as any), updatedAt: Date.now(), updatedBy: uid } as any);
  }
  listOrgLatest() {
    const orgId = this.org.orgId;
    const col = collection(this.fs, `orgs/${orgId}/workOrders`);
    const q = query(col, orderBy('updatedAt', 'desc'), limit(200));
    return collectionData(q, { idField: 'id' }) as any;
  } 
  addTimeLog(id: string, timeLog: { startTime: number; endTime: number; description?: string | null; userId: string }) {
    const orgId = this.org.orgId;
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const ref = doc(this.fs, `orgs/${orgId}/workOrders/${id}/timeLogs/${crypto.randomUUID()}`);
    return setDoc(ref, stripUndefined({ ...timeLog, createdAt: Date.now(), createdBy: uid }) as any);
  } 
  addMaterialLog(id: string, materialLog: { item: string; quantity: number; cost?: number | null; userId: string }) {
    const orgId = this.org.orgId;
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    const ref = doc(this.fs, `orgs/${orgId}/workOrders/${id}/materialLogs/${crypto.randomUUID()}`);
    return setDoc(ref, stripUndefined({ ...materialLog, createdAt: Date.now(), createdBy: uid }) as any);
  } 
  
}
