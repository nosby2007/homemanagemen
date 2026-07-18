import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';

import { WorkOrdersService } from './workorders.service';
import { WorkOrderMaterialCost, WorkOrderTimeLog, WorkOrderPriority, WorkOrderStatus } from '../../core/models/workorder.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <ng-container *ngIf="wo$ | async as wo">
    <div class="page">
      <div class="top">
        <div>
          <div class="h1">Work Order {{ wo.id | slice:0:8 }}</div>
          <div class="muted">From finding {{ wo.findingId | slice:0:8 }} • Inspection {{ wo.inspectionId | slice:0:8 }}</div>
        </div>
        <a class="link" routerLink="/work-orders">Back to list</a>
      </div>

      <div class="grid">
        <section class="card">
          <div class="h2">Details</div>

          <label class="lbl">Summary</label>
          <input class="input" [(ngModel)]="edit.summary" />

          <label class="lbl">Details</label>
          <textarea class="input" rows="4" [(ngModel)]="edit.details"></textarea>

          <div class="row">
            <div>
              <label class="lbl">Priority</label>
              <select class="input" [(ngModel)]="edit.priority">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </div>
            <div>
              <label class="lbl">Status</label>
              <select class="input" [(ngModel)]="edit.status">
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
                <option value="closed">closed</option>
              </select>
            </div>
          </div>

          <div class="row">
            <div>
              <label class="lbl">Room/Area</label>
              <input class="input" [(ngModel)]="edit.roomArea" placeholder="Kitchen" />
            </div>
            <div>
              <label class="lbl">Assigned To (uid)</label>
              <input class="input" [(ngModel)]="edit.assignedTo" placeholder="user uid" />
            </div>
          </div>

          <label class="lbl">Due Date</label>
          <input class="input" type="date" [(ngModel)]="dueDateStr" />

          <button class="btn" (click)="save(wo.id)">Save Changes</button>
          <div class="err" *ngIf="err">{{ err }}</div>
        </section>

        <aside class="stack">
          <section class="card">
            <div class="h2">Time Logs</div>

            <div class="inline">
              <input class="input" type="number" min="1" [(ngModel)]="timeMinutes" placeholder="Minutes" />
              <input class="input" [(ngModel)]="timeNote" placeholder="Note (optional)" />
            </div>
            <button class="btn2" (click)="addTimeLog(wo.id)">Add Time</button>

            <div class="list" *ngIf="(wo.timeLogs?.length || 0) > 0">
              <div class="item" *ngFor="let t of wo.timeLogs">
                <div class="strong">{{ t.minutes }} min</div>
                <div class="muted">{{ t.note || '-' }}</div>
                <div class="muted">{{ t.createdAt | date:'short' }}</div>
              </div>
            </div>
            <div class="muted" *ngIf="!(wo.timeLogs?.length)">No time logs yet.</div>
          </section>

          <section class="card">
            <div class="h2">Materials</div>

            <div class="inline">
              <input class="input" [(ngModel)]="matLabel" placeholder="Item" />
              <input class="input" type="number" min="0" step="0.01" [(ngModel)]="matAmount" placeholder="Amount" />
            </div>
            <button class="btn2" (click)="addMaterial(wo.id)">Add Material</button>

            <div class="list" *ngIf="(wo.materialCosts?.length || 0) > 0">
              <div class="item" *ngFor="let m of wo.materialCosts">
                <div class="strong">{{ m.label }}</div>
                <div class="muted">$ {{ m.amount | number:'1.2-2' }}</div>
                <div class="muted">{{ m.createdAt | date:'short' }}</div>
              </div>
            </div>
            <div class="totals">
              <div class="muted">Total Materials</div>
              <div class="strong">$ {{ totalMaterials(wo.materialCosts) | number:'1.2-2' }}</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </ng-container>
  `,
  styles: [`
    .page{ max-width: 1200px; margin:0 auto; }
    .top{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .h1{ font-size:18px; font-weight:900; color:#f8fafc; }
    .h2{ font-size:13px; font-weight:900; color:#e2e8f0; margin-bottom:10px; }
    .muted{ color:#94a3b8; font-size:12px; }
    .link{ color:#93c5fd; text-decoration:none; font-weight:800; }

    .grid{ display:grid; grid-template-columns: 1fr 420px; gap:14px; }
    .stack{ display:flex; flex-direction:column; gap:14px; }
    .card{ background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:18px; padding:16px; }

    .lbl{ display:block; margin-top:10px; color:#cbd5e1; font-size:12px; font-weight:800; }
    .input{
      width:100%; margin-top:6px; padding:10px 12px; border-radius:12px;
      background: rgba(2,6,23,.35); color:#e5e7eb;
      border:1px solid rgba(255,255,255,.08); outline:none;
    }
    textarea.input{ resize: vertical; }
    .row{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .inline{ display:grid; grid-template-columns: 120px 1fr; gap:10px; }
    .btn{ margin-top:14px; padding:10px 12px; border-radius:12px; border:1px solid rgba(59,130,246,.35);
      background: rgba(59,130,246,.18); color:#dbeafe; font-weight:900; cursor:pointer; width:100%; }
    .btn2{ margin-top:10px; padding:10px 12px; border-radius:12px; border:1px solid rgba(34,197,94,.35);
      background: rgba(34,197,94,.14); color:#dcfce7; font-weight:900; cursor:pointer; width:100%; }

    .list{ margin-top:12px; display:flex; flex-direction:column; gap:8px; }
    .item{ padding:10px 12px; border-radius:14px; background: rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); }
    .strong{ font-weight:900; color:#f1f5f9; }
    .totals{ display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,.06); }
    .err{ margin-top:10px; color:#fecaca; font-size:12px; }
  `]
})
export class WorkOrderDetailPage {
  private route = inject(ActivatedRoute);
  private workOrders = inject(WorkOrdersService);

  err = '';

  edit: {
    summary: string;
    details?: string;
    roomArea?: string;
    priority: WorkOrderPriority;
    status: WorkOrderStatus;
    assignedTo?: string;
  } = {
    summary: '',
    details: '',
    roomArea: '',
    priority: 'medium',
    status: 'open',
    assignedTo: ''
  };

  dueDateStr = '';

  timeMinutes: number | null = null;
  timeNote = '';

  matLabel = '';
  matAmount: number | null = null;

  wo$ = this.route.paramMap.pipe(
    switchMap(params => this.workOrders.get(params.get('workOrderId')!)),
    tap((wo: any) => this.initFromWo(wo)),
  );

  private _initedId: string | null = null;
  private initFromWo(wo: any) {
    if (!wo || !wo.id) return;
    if (this._initedId === wo.id) return;
    this._initedId = wo.id;

    this.edit = {
      summary: wo.summary ?? '',
      details: wo.details ?? '',
      roomArea: wo.roomArea ?? '',
      priority: wo.priority ?? 'medium',
      status: wo.status ?? 'open',
      assignedTo: wo.assignedTo ?? '',
    };
    this.dueDateStr = wo.dueDate ? new Date(wo.dueDate).toISOString().slice(0, 10) : '';
  }

  async save(workOrderId: string) {
    this.err = '';
    try {
      const patch: any = {
        summary: (this.edit.summary || '').trim(),
        details: (this.edit.details || '').trim() || undefined,
        roomArea: (this.edit.roomArea || '').trim() || undefined,
        priority: this.edit.priority,
        status: this.edit.status,
        assignedTo: (this.edit.assignedTo || '').trim() || undefined,
        dueDate: this.dueDateStr ? new Date(this.dueDateStr).getTime() : undefined,
      };
      if (!patch.summary) {
        this.err = 'Summary is required.';
        return;
      }
      await this.workOrders.update(workOrderId, patch);
    } catch (e: any) {
      this.err = e?.message ?? 'Save failed';
    }
  }

  async addTimeLog(workOrderId: string) {
    this.err = '';
    try {
      const minutes = Number(this.timeMinutes);
      if (!minutes || minutes <= 0) {
        this.err = 'Time minutes must be > 0.';
        return;
      }
      const now = Date.now();
      const log = {
        startTime: now,
        endTime: now + minutes * 60 * 1000,
        description: (this.timeNote || '').trim() || undefined,
        userId: '', // TODO: Set current user ID
      };
      await this.workOrders.addTimeLog(workOrderId, log);
      this.timeMinutes = null;
      this.timeNote = '';
    } catch (e: any) {
      this.err = e?.message ?? 'Add time failed';
    }
  }

  async addMaterial(workOrderId: string) {
    this.err = '';
    try {
      const label = (this.matLabel || '').trim();
      const amount = Number(this.matAmount);
      if (!label) {
        this.err = 'Material label is required.';
        return;
      }
      if (isNaN(amount) || amount < 0) {
        this.err = 'Material amount must be >= 0.';
        return;
      }
      const mat = {
        item: label,
        quantity: 1,
        cost: amount,
        userId: '', // TODO: Set current user ID
      };
      await this.workOrders.addMaterialLog(workOrderId, mat);
      this.matLabel = '';
      this.matAmount = null;
    } catch (e: any) {
      this.err = e?.message ?? 'Add material failed';
    }
  }

  totalMaterials(list?: WorkOrderMaterialCost[]) {
    return (list || []).reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  }
}
