import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PaymentsOverviewService, PaymentLedgerRow } from './payments.overview.service';

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
      </header>

      <div class="state error" *ngIf="error">{{ error }}</div>

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
            <div>Property / Lease</div><div>Tenant</div><div>Amount</div><div>Due date</div><div>Status</div><div>Updated</div>
          </div>

          <div class="row" *ngFor="let p of filter(rows)">
            <div>
              <div class="strong">{{ p.propertyId || '-' }}</div>
              <small>Lease: {{ p.leaseId || '-' }}</small>
            </div>
            <div>
              <div>{{ p.tenantId || p.tenantUid || '-' }}</div>
              <small>{{ p.reference || '-' }}</small>
            </div>
            <div>{{ p.amount || 0 | currency:'USD':'symbol':'1.0-0' }}</div>
            <div>{{ p.dueDate ? (p.dueDate | date:'mediumDate') : '-' }}</div>
            <div><span class="badge" [class]="p.status || 'new'">{{ p.status || 'new' }}</span></div>
            <div>{{ p.updatedAt ? (p.updatedAt | date:'short') : '-' }}</div>
          </div>

          <div class="empty" *ngIf="!filter(rows).length">No payments found.</div>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    .head h1 { margin:0; color:#f8fafc; }
    .head p { margin:4px 0 0; color:#94a3b8; }
    .kpi-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px; }
    .kpi { border:1px solid rgba(148,163,184,.2); border-radius:14px; background:rgba(15,23,42,.78); padding:12px; color:#e2e8f0; }
    .kpi span { color:#94a3b8; font-size:12px; }
    .kpi strong { display:block; margin-top:4px; font-size:1.5rem; color:#f8fafc; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:16px; background:rgba(15,23,42,.78); color:#e2e8f0; padding:14px; }
    .toolbar { display:grid; grid-template-columns:1fr 170px; gap:8px; margin-bottom:10px; }
    input, select { width:100%; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:10px; }
    .table { border:1px solid rgba(148,163,184,.2); border-radius:12px; overflow:hidden; }
    .thead, .row { display:grid; grid-template-columns:1.3fr 1fr .8fr .8fr .7fr .8fr; gap:10px; align-items:center; padding:10px 12px; }
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
    @media (max-width: 1200px) { .kpi-grid { grid-template-columns:1fr; } .toolbar { grid-template-columns:1fr; } .thead, .row { grid-template-columns:1fr; } }
  `],
})
export class PaymentsListPage {
  private overview = inject(PaymentsOverviewService);

  error = '';
  rows$ = this.overview.listLatest().pipe(
    map((items: any) => items as PaymentLedgerRow[]),
    catchError((err: any) => {
      this.error = err?.message || 'Unable to load payments.';
      return of([] as PaymentLedgerRow[]);
    }),
  );
  query = '';
  statusFilter: 'all' | 'paid' | 'pending' | 'failed' | 'cancelled' | 'new' = 'all';

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
}
