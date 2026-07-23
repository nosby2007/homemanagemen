import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Lease, LeasesService } from './leases.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      <header>
        <h1>Lease Management</h1>
        <p>Use this view to monitor lease health, expirations, and renewal actions.</p>
      </header>

      <div class="state" *ngIf="loading">Loading leases...</div>
      <div class="state error" *ngIf="!loading && error">{{ error }}</div>

      <ng-container *ngIf="!loading && !error">
        <div class="kpi-grid">
          <article class="kpi"><h3>Active Leases</h3><strong>{{ activeCount }}</strong></article>
          <article class="kpi"><h3>Expiring in 60 Days</h3><strong>{{ expiringCount }}</strong></article>
          <article class="kpi"><h3>Pending Renewals</h3><strong>{{ pendingCount }}</strong></article>
        </div>

        <article class="card">
          <div class="title">All Leases ({{ leases.length }})</div>
          <div class="table" *ngIf="leases.length">
            <div class="thead"><div>Property</div><div>Unit</div><div>Rent</div><div>Status</div><div>Ends</div><div></div></div>
            <div class="row" *ngFor="let l of leases">
              <div>{{ l.propertyId }}</div>
              <div>{{ l.unitId || '-' }}</div>
              <div>{{ l.monthlyRent | currency:'USD':'symbol':'1.0-0' }}</div>
              <div><span class="badge" [class]="l.status">{{ l.status }}</span></div>
              <div>{{ toDate(l.endDate) }}</div>
              <div><a [routerLink]="['/properties', l.propertyId, 'leases', l.id]">View</a></div>
            </div>
          </div>
          <div class="empty" *ngIf="!leases.length">No leases found yet. Create leases from each property detail screen.</div>
        </article>
      </ng-container>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    header h1 { margin:0; color:#f8fafc; }
    header p { margin:4px 0 0; color:#94a3b8; }
    .kpi-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; }
    .kpi { border:1px solid rgba(148,163,184,.2); border-radius:14px; background:rgba(15,23,42,.78); padding:14px; color:#e2e8f0; }
    .kpi h3 { margin:0 0 8px; font-size:13px; color:#cbd5e1; }
    .kpi strong { display:block; font-size:32px; color:#f8fafc; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:14px; background:rgba(15,23,42,.78); padding:14px; color:#e2e8f0; }
    .title { font-weight:800; margin-bottom:10px; }
    .table { border:1px solid rgba(148,163,184,.2); border-radius:12px; overflow:hidden; }
    .thead, .row { display:grid; grid-template-columns:1.2fr .8fr .8fr .8fr .8fr .6fr; gap:10px; align-items:center; padding:10px 12px; }
    .thead { background:rgba(148,163,184,.12); font-size:12px; font-weight:800; }
    .row { border-top:1px solid rgba(148,163,184,.15); }
    .row a { color:#7dd3fc; }
    .badge { border-radius:999px; padding:4px 8px; font-size:11px; text-transform:uppercase; font-weight:700; background:rgba(59,130,246,.18); color:#bfdbfe; }
    .badge.expired, .badge.terminated { background:rgba(239,68,68,.18); color:#fecaca; }
    .badge.pending { background:rgba(251,191,36,.18); color:#fde68a; }
    .empty { color:#94a3b8; padding:10px 0; }
    .state { border:1px dashed rgba(148,163,184,.35); border-radius:10px; color:#94a3b8; padding:14px; }
    .state.error { border-color: rgba(239,68,68,.4); color:#fecaca; }
    @media (max-width: 980px) { .kpi-grid { grid-template-columns:1fr; } .thead, .row { grid-template-columns:1fr; } }
  `],
})
export class LeasesOverviewPage {
  private svc = inject(LeasesService);

  loading = true;
  error = '';
  leases: Lease[] = [];
  activeCount = 0;
  expiringCount = 0;
  pendingCount = 0;

  constructor() {
    this.load();
  }

  private async load() {
    try {
      this.leases = await this.svc.listAllForOrg();
      const now = Date.now();
      const in60Days = now + 60 * 24 * 60 * 60 * 1000;
      this.activeCount = this.leases.filter((l) => l.status === 'active').length;
      this.pendingCount = this.leases.filter((l) => l.status === 'pending').length;
      this.expiringCount = this.leases.filter((l) => {
        if (l.status !== 'active') return false;
        const endMs = this.toMillis(l.endDate);
        return endMs > 0 && endMs <= in60Days && endMs >= now;
      }).length;
    } catch (err: any) {
      this.error = err?.message || 'Unable to load leases.';
    } finally {
      this.loading = false;
    }
  }

  private toMillis(value: unknown): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    return (value as any)?.toMillis?.() ?? 0;
  }

  toDate(value: unknown): string {
    const ms = this.toMillis(value);
    return ms ? new Date(ms).toLocaleDateString() : '-';
  }
}
