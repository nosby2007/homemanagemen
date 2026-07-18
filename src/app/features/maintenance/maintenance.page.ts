import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { WorkOrdersService } from '../work-orders/workorders.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header>
        <h1>Maintenance Requests</h1>
        <p>Manage work orders, assignees, priorities, and workflow statuses.</p>
      </header>

      <article class="card">
        <div class="filters">
          <input [(ngModel)]="search" placeholder="Search summary or property..." />
          <select [(ngModel)]="statusFilter">
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="closed">Closed</option>
          </select>
          <button class="btn primary" (click)="showForm = true">+ Create Request</button>
        </div>

        <div class="table" *ngIf="orders$ | async as orders">
          <div class="thead">
            <div>Summary</div><div>Property</div><div>Status</div><div>Assigned To</div><div>Updated</div><div>Actions</div>
          </div>
          <div class="row" *ngFor="let w of filter(orders)">
            <div>
              <div class="strong">{{ w.summary }}</div>
              <small>{{ w.details || '-' }}</small>
            </div>
            <div>{{ w.propertyId || '-' }}</div>
            <div><span class="badge">{{ w.status }}</span></div>
            <div>{{ w.assignedTo || 'Unassigned' }}</div>
            <div>{{ w.updatedAt | date:'short' }}</div>
            <div class="actions">
              <button (click)="setStatus(w.id, 'in_progress')">Start</button>
              <button (click)="setStatus(w.id, 'done')">Complete</button>
            </div>
          </div>
          <div class="empty" *ngIf="!filter(orders).length">No maintenance requests found.</div>
        </div>
      </article>

      <div *ngIf="showForm" class="modal-overlay" (click)="showForm = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Create Maintenance Request</h3>
          <form (ngSubmit)="submitForm()">
            <div class="form-group"><label>Property ID *</label><input [(ngModel)]="formData.propertyId" name="propertyId" placeholder="Property ID" required /></div>
            <div class="form-group"><label>Summary *</label><input [(ngModel)]="formData.summary" name="summary" placeholder="Request summary" required /></div>
            <div class="form-group"><label>Details</label><textarea [(ngModel)]="formData.details" name="details" placeholder="Additional details" rows="2"></textarea></div>
            <div class="form-group"><label>Assignee</label><input [(ngModel)]="formData.assignedTo" name="assignedTo" placeholder="Assignee (optional)" /></div>
            <div class="form-group"><label>Priority *</label><select [(ngModel)]="formData.priority" name="priority" required><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Emergency</option></select></div>
            <div class="actions">
              <button type="button" class="btn" (click)="showForm = false">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Creating...' : 'Create Request' }}</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    header h1 { margin:0; color:#f8fafc; }
    header p { margin:4px 0 0; color:#94a3b8; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:16px; background:rgba(15,23,42,.78); padding:14px; color:#e2e8f0; }
    .filters { display:grid; grid-template-columns:1fr 180px auto; gap:8px; margin-bottom:10px; }
    input, select { width:100%; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:10px; }
    .btn { border:none; border-radius:10px; padding:10px 12px; font-weight:700; cursor:pointer; background:rgba(148,163,184,.2); color:#e2e8f0; }
    .btn.primary { background:linear-gradient(125deg,#0ea5e9,#0284c7); color:#fff; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .table { border:1px solid rgba(148,163,184,.2); border-radius:12px; overflow:hidden; }
    .thead, .row { display:grid; grid-template-columns:1.4fr .8fr .7fr .8fr .8fr .8fr; gap:10px; align-items:center; padding:10px 12px; }
    .thead { background:rgba(148,163,184,.12); font-size:12px; font-weight:800; }
    .row { border-top:1px solid rgba(148,163,184,.18); }
    .strong { font-weight:800; }
    .badge { border-radius:999px; padding:5px 8px; background:rgba(59,130,246,.18); color:#bfdbfe; font-size:11px; text-transform:uppercase; font-weight:700; }
    .actions { display:flex; gap:6px; }
    .actions button { border:none; border-radius:10px; padding:8px 10px; font-weight:700; cursor:pointer; background:rgba(148,163,184,.2); color:#e2e8f0; }
    .empty { padding:14px; color:#94a3b8; }    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .modal { background:#fff; border-radius:12px; padding:24px; max-width:400px; width:90%; max-height:90vh; overflow-y:auto; }
    .modal h3 { margin:0 0 16px; color:#0f172a; }
    .form-group { margin-bottom:16px; display:flex; flex-direction:column; }
    .form-group label { margin-bottom:6px; font-weight:500; color:#334155; }
    .form-group input, .form-group textarea, .form-group select { padding:8px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; color:#1f2937; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline:none; border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,.1); }    @media (max-width: 1100px) { .thead, .row { grid-template-columns:1fr; } .filters, .compose { grid-template-columns:1fr; } }
  `],
})
export class MaintenancePage implements OnInit {
  private workOrders = inject(WorkOrdersService);
  private route = inject(ActivatedRoute);

  orders$ = this.workOrders.listOrgLatest();
  search = '';
  statusFilter = 'all';
  showForm = false;
  submitting = false;
  formData: any = {};

  private resetForm() {
    return { propertyId: '', summary: '', details: '', assignedTo: '', priority: 'medium' };
  }

  filter(list: any[]): any[] {
    const q = this.search.trim().toLowerCase();
    return list.filter((item) => {
      const statusOk = this.statusFilter === 'all' || item.status === this.statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      return `${item.summary || ''} ${item.propertyId || ''}`.toLowerCase().includes(q);
    });
  }

  async setStatus(workOrderId: string, status: 'in_progress' | 'done') {
    await this.workOrders.update(workOrderId, { status });
  }

  ngOnInit() {
    this.formData = this.resetForm();
    const propertyId = String(this.route.snapshot.queryParamMap.get('propertyId') || '').trim();
    if (propertyId) {
      this.formData.propertyId = propertyId;
    }
  }

  async submitForm() {
    if (!this.formData.propertyId || !this.formData.summary || !this.formData.priority) return;
    try {
      this.submitting = true;
      await this.workOrders.createManual(this.formData);
      this.showForm = false;
      this.formData = this.resetForm();
    } catch (err: any) {
      console.error('Failed to create maintenance request:', err);
    } finally {
      this.submitting = false;
    }
  }
}
