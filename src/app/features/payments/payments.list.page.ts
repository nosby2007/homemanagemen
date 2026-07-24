import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PaymentsOverviewService, PaymentLedgerRow } from './payments.overview.service';
import { PaymentsService, PaymentStatus } from './payments.service';
import { PropertiesService } from '../properties/properties.service';
import { LeasesService } from '../leases/leases.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>Rent & Payment Ledger</h1>
          <p>Monitor payment status, outstanding balances, and rent collection trends.</p>
        </div>
        <button class="btn" type="button" (click)="openAdd()">+ Add Payment</button>
      </header>

      <div class="state error" *ngIf="error">{{ error }}</div>
      <div class="state error" *ngIf="rowError">{{ rowError }}</div>

      <div class="kpi-grid" *ngIf="rows$ | async as rows">
        <article class="kpi"><span>Total Payments</span><strong>{{ rows.length }}</strong></article>
        <article class="kpi"><span>Collected</span><strong>{{ totalPaid(rows) | currency:'USD':'symbol':'1.0-0' }}</strong></article>
        <article class="kpi"><span>Outstanding</span><strong>{{ totalOutstanding(rows) | currency:'USD':'symbol':'1.0-0' }}</strong></article>
      </div>

      <article class="card">
        <div class="toolbar">
          <input [(ngModel)]="query" [ngModelOptions]="{standalone: true}" placeholder="Search property, lease, tenant, reference..." />
          <select [(ngModel)]="statusFilter" [ngModelOptions]="{standalone: true}">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="new">New</option>
          </select>
        </div>

        <div class="table" *ngIf="rows$ | async as rows">
          <div class="thead">
            <div>Property / Lease</div><div>Tenant</div><div>Amount</div><div>Due date</div><div>Status</div><div>Updated</div><div>Actions</div>
          </div>

          <div class="row" *ngFor="let p of filter(rows)">
            <div>
              <div class="strong">{{ propertyName(p.propertyId) }}</div>
              <small>Lease: {{ p.leaseId | slice:0:8 }}</small>
            </div>
            <div>
              <div>{{ p.tenantId || p.tenantUid || '-' }}</div>
              <small>{{ p.reference || '-' }}</small>
            </div>
            <div>{{ p.amount || 0 | currency:'USD':'symbol':'1.0-0' }}</div>
            <div>{{ p.dueDate ? (p.dueDate | date:'mediumDate') : '-' }}</div>
            <div><span class="badge" [class]="p.status || 'new'">{{ p.status || 'new' }}</span></div>
            <div>{{ p.updatedAt ? (p.updatedAt | date:'short') : '-' }}</div>
            <div class="actions-cell">
              <button class="btn sm" type="button" (click)="openEdit(p)">Edit</button>
              <button class="btn sm danger" type="button" (click)="deletePayment(p)" [disabled]="busyId === p.id">Delete</button>
            </div>
          </div>

          <div class="empty" *ngIf="!filter(rows).length">No payments found.</div>
        </div>
      </article>

      <div *ngIf="showForm" class="modal-overlay" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editing ? 'Edit Payment' : 'Add Payment' }}</h3>
          <form (ngSubmit)="submitForm()">
            <div class="form-group">
              <label>Property *</label>
              <select [(ngModel)]="formData.propertyId" name="propertyId" (change)="onPropertyChange()" required [disabled]="!!editing"><option value="">Select property</option><option *ngFor="let p of properties" [value]="p.id">{{ p.name || p.id }}</option></select>
            </div>
            <div class="form-group">
              <label>Lease *</label>
              <select [(ngModel)]="formData.leaseId" name="leaseId" (change)="onLeaseChange()" required [disabled]="!!editing"><option value="">Select lease</option><option *ngFor="let l of leases" [value]="l.id">{{ l.id | slice:0:8 }} - {{ l.status }}</option></select>
            </div>
            <div class="form-group">
              <label>Amount *</label>
              <input [(ngModel)]="formData.amount" name="amount" type="number" min="0" step="0.01" placeholder="Amount" required />
            </div>
            <div class="form-group">
              <label>Payment Date</label>
              <input [(ngModel)]="formData.paymentDate" name="paymentDate" type="date" />
            </div>
            <div class="form-group">
              <label>Method</label>
              <select [(ngModel)]="formData.method" name="method">
                <option value="">Select...</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="zelle">Zelle</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Reference #</label>
              <input [(ngModel)]="formData.reference" name="reference" placeholder="optional" />
            </div>
            <div class="form-group">
              <label>Status *</label>
              <select [(ngModel)]="formData.status" name="status" required>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="new">New</option>
              </select>
            </div>
            <div class="form-error" *ngIf="formError">{{ formError }}</div>
            <div class="actions">
              <button type="button" class="btn" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Saving...' : (editing ? 'Save changes' : 'Add Payment') }}</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .head h1 { margin:0; color:#f8fafc; }
    .head p { margin:4px 0 0; color:#94a3b8; }
    .btn{ padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(59,130,246,.85); color:white; font-weight:800; cursor:pointer; }
    .btn.primary{ background: rgba(59,130,246,.85); }
    .btn:disabled{ opacity:.5; cursor:not-allowed; }
    .kpi-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px; }
    .kpi { border:1px solid rgba(148,163,184,.2); border-radius:14px; background:rgba(15,23,42,.78); padding:12px; color:#e2e8f0; }
    .kpi span { color:#94a3b8; font-size:12px; }
    .kpi strong { display:block; margin-top:4px; font-size:1.5rem; color:#f8fafc; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:16px; background:rgba(15,23,42,.78); color:#e2e8f0; padding:14px; }
    .toolbar { display:grid; grid-template-columns:1fr 170px; gap:8px; margin-bottom:10px; }
    input, select { width:100%; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:10px; }
    .table { border:1px solid rgba(148,163,184,.2); border-radius:12px; overflow:hidden; }
    .thead, .row { display:grid; grid-template-columns:1.3fr 1fr .8fr .8fr .7fr .8fr 1fr; gap:10px; align-items:center; padding:10px 12px; }
    .thead { background:rgba(148,163,184,.12); font-size:12px; font-weight:800; }
    .row { border-top:1px solid rgba(148,163,184,.15); }
    .strong { font-weight:800; }
    .badge { border-radius:999px; padding:5px 8px; font-size:11px; text-transform:uppercase; font-weight:700; }
    .badge.paid { background:rgba(16,185,129,.2); color:#bbf7d0; }
    .badge.pending { background:rgba(251,191,36,.2); color:#fde68a; }
    .badge.failed, .badge.cancelled { background:rgba(239,68,68,.2); color:#fecaca; }
    .badge.new { background:rgba(59,130,246,.2); color:#bfdbfe; }
    .empty { padding:14px; color:#94a3b8; }
    small { color:#94a3b8; }
    .state.error { background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.35); color:#fecaca; border-radius:10px; padding:10px 12px; }
    .actions-cell { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
    .btn.sm { padding:6px 10px; font-size:12px; border-radius:8px; }
    .btn.sm.danger { background:rgba(239,68,68,.2); color:#fecaca; border-color:rgba(239,68,68,.4); }
    .form-error { color:#fecaca; background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.35); border-radius:10px; padding:9px 10px; font-size:12px; margin-bottom:12px; }
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .modal { background:#0f172a; border:1px solid rgba(148,163,184,.25); border-radius:12px; padding:24px; max-width:400px; width:90%; max-height:90vh; overflow-y:auto; color:#e2e8f0; }
    .modal h3 { margin:0 0 16px; color:#f8fafc; }
    .form-group { margin-bottom:16px; display:flex; flex-direction:column; }
    .form-group label { margin-bottom:6px; font-weight:600; color:#cbd5e1; font-size:13px; }
    .form-group select:disabled { opacity:.6; }
    .actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }
    @media (max-width: 1200px) { .kpi-grid { grid-template-columns:1fr; } .toolbar { grid-template-columns:1fr; } .thead, .row { grid-template-columns:1fr; } }
  `],
})
export class PaymentsListPage {
  private overview = inject(PaymentsOverviewService);
  private paymentsSvc = inject(PaymentsService);
  private propertiesSvc = inject(PropertiesService);
  private leasesSvc = inject(LeasesService);

  error = '';
  rowError = '';
  rows$ = this.overview.listLatest().pipe(
    map((items: any) => items as PaymentLedgerRow[]),
    catchError((err: any) => {
      this.error = err?.message || 'Unable to load payments.';
      return of([] as PaymentLedgerRow[]);
    }),
  );
  query = '';
  statusFilter: 'all' | 'paid' | 'pending' | 'failed' | 'cancelled' | 'new' = 'all';

  properties: any[] = [];
  leases: any[] = [];
  private propertyNames = new Map<string, string>();

  showForm = false;
  submitting = false;
  formError = '';
  busyId: string | null = null;
  editing: PaymentLedgerRow | null = null;
  formData: any = {};
  private leaseTenantId = '';
  private leaseUnitId = '';

  constructor() {
    firstValueFrom(this.propertiesSvc.list()).then((rows: any) => {
      this.properties = rows;
      this.propertyNames = new Map((rows as any[]).map((p) => [p.id, p.name || p.id]));
    });
  }

  propertyName(propertyId?: string): string {
    if (!propertyId) return '-';
    return this.propertyNames.get(propertyId) || propertyId;
  }

  private resetForm() {
    return { propertyId: '', leaseId: '', amount: 0, paymentDate: '', method: '', reference: '', status: 'paid' as PaymentStatus };
  }

  filter(rows: PaymentLedgerRow[]): PaymentLedgerRow[] {
    const q = this.query.trim().toLowerCase();
    return rows.filter((row) => {
      if (this.statusFilter !== 'all' && (row.status || 'new') !== this.statusFilter) return false;
      if (!q) return true;
      return `${row.propertyId || ''} ${row.leaseId || ''} ${row.tenantId || ''} ${row.tenantUid || ''} ${row.reference || ''}`
        .toLowerCase()
        .includes(q);
    });
  }

  totalPaid(rows: PaymentLedgerRow[]) {
    return rows.filter((r) => r.status === 'paid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  totalOutstanding(rows: PaymentLedgerRow[]) {
    return rows.filter((r) => r.status === 'pending' || r.status === 'new').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  async onPropertyChange() {
    const propertyId = String(this.formData.propertyId || '').trim();
    this.formData.leaseId = '';
    if (!propertyId) {
      this.leases = [];
      return;
    }
    this.leases = (await firstValueFrom(this.leasesSvc.list(propertyId))) as any[];
  }

  async onLeaseChange() {
    const lease = this.leases.find((l) => l.id === this.formData.leaseId);
    this.leaseTenantId = lease?.tenantId || '';
    this.leaseUnitId = lease?.unitId || '';
  }

  openAdd() {
    this.editing = null;
    this.formError = '';
    this.formData = this.resetForm();
    this.leases = [];
    this.leaseTenantId = '';
    this.leaseUnitId = '';
    this.showForm = true;
  }

  async openEdit(payment: PaymentLedgerRow) {
    this.editing = payment;
    this.formError = '';
    this.formData = {
      propertyId: payment.propertyId || '',
      leaseId: payment.leaseId || '',
      amount: payment.amount || 0,
      paymentDate: payment.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 10) : '',
      method: payment.method || '',
      reference: payment.reference || '',
      status: (payment.status || 'pending') as PaymentStatus,
    };
    if (this.formData.propertyId) {
      this.leases = (await firstValueFrom(this.leasesSvc.list(this.formData.propertyId))) as any[];
    }
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editing = null;
    this.formError = '';
  }

  async submitForm() {
    if (!this.formData.propertyId || !this.formData.leaseId || !this.formData.amount) return;
    this.formError = '';
    const paidAt = this.formData.paymentDate ? new Date(this.formData.paymentDate + 'T00:00:00').getTime() : undefined;
    try {
      this.submitting = true;
      if (this.editing) {
        await this.paymentsSvc.update(this.formData.propertyId, this.formData.leaseId, this.editing.id, {
          amount: Number(this.formData.amount || 0),
          paidAt,
          method: this.formData.method || undefined,
          reference: (this.formData.reference || '').trim() || undefined,
          status: this.formData.status,
        } as any);
      } else {
        if (!this.leaseTenantId || !this.leaseUnitId) {
          await this.onLeaseChange();
        }
        if (!this.leaseTenantId || !this.leaseUnitId) {
          throw new Error('Selected lease is missing tenant or unit linkage. Fix the lease before recording a payment.');
        }
        await this.paymentsSvc.create(this.formData.propertyId, this.formData.leaseId, {
          amount: Number(this.formData.amount || 0),
          paidAt,
          tenantId: this.leaseTenantId,
          unitId: this.leaseUnitId,
          method: this.formData.method || undefined,
          reference: (this.formData.reference || '').trim() || undefined,
          status: this.formData.status,
        } as any);
      }
      this.showForm = false;
      this.editing = null;
      this.formData = this.resetForm();
    } catch (err: any) {
      this.formError = err?.message || 'Failed to save payment.';
    } finally {
      this.submitting = false;
    }
  }

  async deletePayment(payment: PaymentLedgerRow) {
    if (!payment.propertyId || !payment.leaseId) return;
    if (!confirm('Delete this payment record?')) return;
    this.rowError = '';
    this.busyId = payment.id;
    try {
      await this.paymentsSvc.remove(payment.propertyId, payment.leaseId, payment.id);
    } catch (err: any) {
      this.rowError = err?.message || 'Failed to delete payment.';
    } finally {
      this.busyId = null;
    }
  }
}
