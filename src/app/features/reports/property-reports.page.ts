import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PropertiesService } from '../properties/properties.service';
import { UnitsService } from '../units/units.service';
import { TenantsService } from '../tenants/tenants.service';
import { LeasesService, Lease } from '../leases/leases.service';
import { PaymentsOverviewService } from '../payments/payments.overview.service';

type RentRollRow = {
  propertyName: string;
  unitNumber: string;
  status: string;
  monthlyRent: number;
  tenantName: string;
  leaseEnd: string;
};

type ExpirationRow = {
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  monthlyRent: number;
  endDate: string;
  daysRemaining: number;
};

type CollectionsRow = {
  propertyName: string;
  collected: number;
  outstanding: number;
  paymentCount: number;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>Property Reports</h1>
          <p>Rent roll, lease expiration, and collections — generated from live org data.</p>
        </div>
      </header>

      <div class="tabs">
        <button type="button" [class.active]="tab === 'rentRoll'" (click)="tab = 'rentRoll'">Rent Roll</button>
        <button type="button" [class.active]="tab === 'expiration'" (click)="tab = 'expiration'">Lease Expiration</button>
        <button type="button" [class.active]="tab === 'collections'" (click)="tab = 'collections'">Collections</button>
      </div>

      <div class="state" *ngIf="loading">Loading report data...</div>
      <div class="state error" *ngIf="!loading && error">{{ error }}</div>

      <ng-container *ngIf="!loading && !error">
        <article class="card" *ngIf="tab === 'rentRoll'">
          <div class="card-head">
            <div>
              <div class="title">Rent Roll ({{ rentRoll.length }} units)</div>
              <div class="muted">Occupancy and rent for every unit in the portfolio.</div>
            </div>
            <button type="button" class="btn" (click)="downloadCsv('rentRoll')" [disabled]="!rentRoll.length">Download CSV</button>
          </div>
          <div class="table" *ngIf="rentRoll.length">
            <div class="thead"><div>Property</div><div>Unit</div><div>Status</div><div>Monthly Rent</div><div>Tenant</div><div>Lease Ends</div></div>
            <div class="row" *ngFor="let r of rentRoll">
              <div>{{ r.propertyName }}</div>
              <div>{{ r.unitNumber }}</div>
              <div><span class="badge" [class]="r.status">{{ r.status }}</span></div>
              <div>{{ r.monthlyRent | currency:'USD':'symbol':'1.0-0' }}</div>
              <div>{{ r.tenantName }}</div>
              <div>{{ r.leaseEnd }}</div>
            </div>
          </div>
          <div class="empty" *ngIf="!rentRoll.length">No units found.</div>
        </article>

        <article class="card" *ngIf="tab === 'expiration'">
          <div class="card-head">
            <div>
              <div class="title">Lease Expiration ({{ filteredExpirations.length }})</div>
              <div class="muted">Active leases ending within the selected window.</div>
            </div>
            <div class="head-actions">
              <select [(ngModel)]="expirationWindowDays" [ngModelOptions]="{standalone: true}">
                <option [ngValue]="30">Next 30 days</option>
                <option [ngValue]="60">Next 60 days</option>
                <option [ngValue]="90">Next 90 days</option>
              </select>
              <button type="button" class="btn" (click)="downloadCsv('expiration')" [disabled]="!filteredExpirations.length">Download CSV</button>
            </div>
          </div>
          <div class="table" *ngIf="filteredExpirations.length">
            <div class="thead"><div>Property</div><div>Unit</div><div>Tenant</div><div>Monthly Rent</div><div>Lease Ends</div><div>Days Left</div></div>
            <div class="row" *ngFor="let r of filteredExpirations">
              <div>{{ r.propertyName }}</div>
              <div>{{ r.unitNumber }}</div>
              <div>{{ r.tenantName }}</div>
              <div>{{ r.monthlyRent | currency:'USD':'symbol':'1.0-0' }}</div>
              <div>{{ r.endDate }}</div>
              <div><span class="badge" [class.urgent]="r.daysRemaining <= 30">{{ r.daysRemaining }}</span></div>
            </div>
          </div>
          <div class="empty" *ngIf="!filteredExpirations.length">No leases expiring in this window.</div>
        </article>

        <article class="card" *ngIf="tab === 'collections'">
          <div class="card-head">
            <div>
              <div class="title">Collections Summary</div>
              <div class="muted">Collected vs. outstanding across the most recent 300 payments.</div>
            </div>
            <button type="button" class="btn" (click)="downloadCsv('collections')" [disabled]="!collections.length">Download CSV</button>
          </div>
          <div class="kpi-grid">
            <article class="kpi"><span>Collected</span><strong>{{ totalCollected | currency:'USD':'symbol':'1.0-0' }}</strong></article>
            <article class="kpi"><span>Outstanding</span><strong>{{ totalOutstanding | currency:'USD':'symbol':'1.0-0' }}</strong></article>
          </div>
          <div class="table" *ngIf="collections.length">
            <div class="thead"><div>Property</div><div>Collected</div><div>Outstanding</div><div>Payments</div></div>
            <div class="row" *ngFor="let r of collections">
              <div>{{ r.propertyName }}</div>
              <div>{{ r.collected | currency:'USD':'symbol':'1.0-0' }}</div>
              <div>{{ r.outstanding | currency:'USD':'symbol':'1.0-0' }}</div>
              <div>{{ r.paymentCount }}</div>
            </div>
          </div>
          <div class="empty" *ngIf="!collections.length">No payments found.</div>
        </article>
      </ng-container>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    .head h1 { margin:0; color:#f8fafc; }
    .head p { margin:4px 0 0; color:#94a3b8; }
    .tabs { display:flex; gap:8px; }
    .tabs button { border:1px solid rgba(148,163,184,.3); background:rgba(15,23,42,.6); color:#cbd5e1; padding:8px 14px; border-radius:10px; cursor:pointer; font-weight:700; font-size:13px; }
    .tabs button.active { background:rgba(59,130,246,.25); border-color:rgba(59,130,246,.5); color:#dbeafe; }
    .card { border:1px solid rgba(148,163,184,.2); background:rgba(15,23,42,.78); border-radius:16px; padding:14px; color:#e2e8f0; }
    .card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
    .head-actions { display:flex; gap:8px; align-items:center; }
    .title { font-weight:800; }
    .muted { color:#94a3b8; font-size:12px; margin-top:2px; }
    select { border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:8px 10px; }
    .btn { border:1px solid rgba(59,130,246,.4); background:rgba(59,130,246,.2); color:#dbeafe; padding:9px 12px; border-radius:10px; font-weight:700; cursor:pointer; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .kpi-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:10px; margin-bottom:12px; }
    .kpi { border:1px solid rgba(148,163,184,.2); border-radius:14px; background:rgba(2,6,23,.35); padding:12px; }
    .kpi span { color:#94a3b8; font-size:12px; }
    .kpi strong { display:block; margin-top:4px; font-size:1.4rem; color:#f8fafc; }
    .table { border:1px solid rgba(148,163,184,.2); border-radius:12px; overflow:hidden; }
    .thead, .row { display:grid; grid-template-columns:1.3fr .8fr .8fr .9fr 1fr .8fr; gap:10px; align-items:center; padding:10px 12px; }
    .thead { background:rgba(148,163,184,.12); font-size:12px; font-weight:800; }
    .row { border-top:1px solid rgba(148,163,184,.15); }
    .badge { border-radius:999px; padding:4px 8px; font-size:11px; text-transform:uppercase; font-weight:700; background:rgba(59,130,246,.18); color:#bfdbfe; }
    .badge.occupied { background:rgba(16,185,129,.2); color:#bbf7d0; }
    .badge.vacant { background:rgba(148,163,184,.2); color:#e2e8f0; }
    .badge.maintenance { background:rgba(251,191,36,.2); color:#fde68a; }
    .badge.urgent { background:rgba(239,68,68,.2); color:#fecaca; }
    .empty { padding:14px; color:#94a3b8; }
    .state { border:1px dashed rgba(148,163,184,.35); border-radius:10px; color:#94a3b8; padding:14px; }
    .state.error { border-color: rgba(239,68,68,.4); color:#fecaca; }
    @media (max-width: 1100px) { .thead, .row { grid-template-columns:1fr; } .kpi-grid { grid-template-columns:1fr; } }
  `],
})
export class PropertyReportsPage {
  private propertiesSvc = inject(PropertiesService);
  private unitsSvc = inject(UnitsService);
  private tenantsSvc = inject(TenantsService);
  private leasesSvc = inject(LeasesService);
  private paymentsOverview = inject(PaymentsOverviewService);

  loading = true;
  error = '';
  tab: 'rentRoll' | 'expiration' | 'collections' = 'rentRoll';

  rentRoll: RentRollRow[] = [];
  expirations: ExpirationRow[] = [];
  expirationWindowDays = 60;
  collections: CollectionsRow[] = [];
  totalCollected = 0;
  totalOutstanding = 0;

  constructor() {
    this.load();
  }

  get filteredExpirations(): ExpirationRow[] {
    return this.expirations.filter((r) => r.daysRemaining <= this.expirationWindowDays);
  }

  private toMillis(value: unknown): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    return (value as any)?.toMillis?.() ?? 0;
  }

  private async load() {
    try {
      const [properties, units, tenants, leases, payments] = await Promise.all([
        firstValueFrom(this.propertiesSvc.list()) as Promise<any[]>,
        firstValueFrom(this.unitsSvc.list()) as Promise<any[]>,
        firstValueFrom(this.tenantsSvc.list()) as Promise<any[]>,
        this.leasesSvc.listAllForOrg(),
        firstValueFrom(this.paymentsOverview.listLatest()) as Promise<any[]>,
      ]);

      const propertyById = new Map(properties.map((p) => [p.id, p]));
      const tenantById = new Map(tenants.map((t) => [t.id, t]));
      const leaseById = new Map(leases.map((l) => [l.id, l]));

      this.rentRoll = units.map((u: any) => {
        const lease = u.activeLeaseId ? leaseById.get(u.activeLeaseId) : undefined;
        const tenant = u.activeTenantId ? tenantById.get(u.activeTenantId) : undefined;
        const endMs = lease ? this.toMillis(lease.endDate) : 0;
        return {
          propertyName: propertyById.get(u.propertyId)?.name || u.propertyId || '-',
          unitNumber: u.unitNumber || u.id,
          status: u.status || 'vacant',
          monthlyRent: Number(u.monthlyRent || 0),
          tenantName: tenant?.displayName || tenant?.email || (u.activeTenantId ? u.activeTenantId : '-'),
          leaseEnd: endMs ? new Date(endMs).toLocaleDateString() : '-',
        };
      });

      const now = Date.now();
      const unitById = new Map(units.map((u: any) => [u.id, u]));
      this.expirations = (leases as Lease[])
        .filter((l) => l.status === 'active')
        .map((l) => {
          const endMs = this.toMillis(l.endDate);
          const tenant = tenantById.get(l.tenantId);
          const unit = l.unitId ? unitById.get(l.unitId) : undefined;
          return {
            propertyName: propertyById.get(l.propertyId)?.name || l.propertyId || '-',
            unitNumber: unit?.unitNumber || l.unitId || '-',
            tenantName: tenant?.displayName || tenant?.email || l.tenantId || '-',
            monthlyRent: Number(l.monthlyRent || 0),
            endDate: endMs ? new Date(endMs).toLocaleDateString() : '-',
            daysRemaining: endMs ? Math.ceil((endMs - now) / (24 * 60 * 60 * 1000)) : Number.MAX_SAFE_INTEGER,
          };
        })
        .filter((r) => r.daysRemaining >= 0)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      const collectionsByProperty = new Map<string, CollectionsRow>();
      for (const p of payments as any[]) {
        const propertyId = p.propertyId || 'unknown';
        const propertyName = propertyById.get(propertyId)?.name || propertyId;
        const row = collectionsByProperty.get(propertyId) || { propertyName, collected: 0, outstanding: 0, paymentCount: 0 };
        const amount = Number(p.amount || 0);
        if (p.status === 'paid') row.collected += amount;
        else if (p.status === 'pending' || p.status === 'new') row.outstanding += amount;
        row.paymentCount += 1;
        collectionsByProperty.set(propertyId, row);
      }
      this.collections = Array.from(collectionsByProperty.values()).sort((a, b) => b.collected - a.collected);
      this.totalCollected = this.collections.reduce((sum, r) => sum + r.collected, 0);
      this.totalOutstanding = this.collections.reduce((sum, r) => sum + r.outstanding, 0);
    } catch (err: any) {
      this.error = err?.message || 'Unable to load report data.';
    } finally {
      this.loading = false;
    }
  }

  private toCsv(headers: string[], rows: (string | number)[][]): string {
    const escape = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  }

  downloadCsv(report: 'rentRoll' | 'expiration' | 'collections') {
    let csv = '';
    let filename = '';
    const today = new Date().toISOString().slice(0, 10);

    if (report === 'rentRoll') {
      csv = this.toCsv(
        ['Property', 'Unit', 'Status', 'Monthly Rent', 'Tenant', 'Lease Ends'],
        this.rentRoll.map((r) => [r.propertyName, r.unitNumber, r.status, r.monthlyRent, r.tenantName, r.leaseEnd]),
      );
      filename = `rent-roll-${today}.csv`;
    } else if (report === 'expiration') {
      csv = this.toCsv(
        ['Property', 'Unit', 'Tenant', 'Monthly Rent', 'Lease Ends', 'Days Left'],
        this.filteredExpirations.map((r) => [r.propertyName, r.unitNumber, r.tenantName, r.monthlyRent, r.endDate, r.daysRemaining]),
      );
      filename = `lease-expiration-${today}.csv`;
    } else {
      csv = this.toCsv(
        ['Property', 'Collected', 'Outstanding', 'Payments'],
        this.collections.map((r) => [r.propertyName, r.collected, r.outstanding, r.paymentCount]),
      );
      filename = `collections-${today}.csv`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
