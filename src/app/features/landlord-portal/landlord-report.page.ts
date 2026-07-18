import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { LandlordDashboardService, LandlordKPIs } from './landlord-dashboard.service';

@Component({
  selector: 'app-landlord-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <header class="header">
        <div>
          <h1>Portfolio Reports</h1>
          <p>Operational reporting generated from live org data.</p>
        </div>
        <button type="button" class="btn" (click)="downloadSnapshot()" [disabled]="loading || !kpis">Download snapshot</button>
      </header>

      <div class="state" *ngIf="loading">Loading report data...</div>
      <div class="state error" *ngIf="error">{{ error }}</div>

      <ng-container *ngIf="!loading && !error && kpis">
        <div class="kpis">
          <article class="kpi"><h3>{{ kpis.totalProperties }}</h3><p>Total properties</p></article>
          <article class="kpi"><h3>{{ kpis.activeTenants }}</h3><p>Active tenants</p></article>
          <article class="kpi"><h3>{{ kpis.occupancyRate }}%</h3><p>Occupancy</p></article>
          <article class="kpi"><h3>{{ kpis.openMaintenance }}</h3><p>Open maintenance</p></article>
          <article class="kpi"><h3>{{ kpis.monthlyRevenue | currency:'USD':'symbol':'1.0-0' }}</h3><p>Revenue (month)</p></article>
        </div>

        <div class="panel">
          <h2>Insights</h2>
          <ul>
            <li *ngIf="kpis.vacantProperties > 0">{{ kpis.vacantProperties }} vacant properties should be targeted for occupancy improvement.</li>
            <li *ngIf="kpis.openMaintenance > 0">{{ kpis.openMaintenance }} maintenance requests are open and can impact tenant satisfaction.</li>
            <li>Current occupancy rate: {{ kpis.occupancyRate }}%.</li>
            <li>Collected this month: {{ kpis.monthlyRevenue | currency:'USD':'symbol':'1.0-0' }}.</li>
          </ul>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page{padding:20px}
    .header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
    .header h1{margin:0 0 4px;color:#0f172a}
    .header p{margin:0;color:#475569}
    .btn{border:1px solid #94a3b8;background:#f8fafc;color:#0f172a;padding:10px 12px;border-radius:10px;cursor:pointer;font-weight:700}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .state{padding:12px;border-radius:10px;background:#f1f5f9;color:#334155}
    .state.error{background:#fee2e2;color:#991b1b}
    .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:12px 0}
    .kpi{background:#e2e8f0;border-radius:12px;padding:12px}
    .kpi h3{margin:0;color:#0f172a;font-size:24px}
    .kpi p{margin:6px 0 0;color:#475569}
    .panel{margin-top:8px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
    .panel h2{margin:0 0 8px;color:#0f172a}
    .panel ul{margin:0;padding-left:18px;color:#334155;display:grid;gap:6px}
  `],
})
export class LandlordReportPage implements OnInit, OnDestroy {
  private svc = inject(LandlordDashboardService);
  private sub = new Subscription();

  loading = true;
  error = '';
  kpis: LandlordKPIs | null = null;

  ngOnInit() {
    this.sub.add(this.svc.getKPIs().subscribe({
      next: (kpis) => {
        this.kpis = kpis;
        this.loading = false;
        this.error = '';
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load report data.';
      },
    }));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  downloadSnapshot() {
    if (!this.kpis) return;

    const payload = {
      generatedAt: new Date().toISOString(),
      kpis: this.kpis,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `landlord-report-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
