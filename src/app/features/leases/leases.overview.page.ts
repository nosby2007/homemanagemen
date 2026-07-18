import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <header>
        <h1>Lease Management</h1>
        <p>Use this view to monitor lease health, expirations, and renewal actions.</p>
      </header>

      <div class="kpi-grid">
        <article class="kpi"><h3>Active Leases</h3><strong>0</strong><small>Synced when lease aggregation is enabled.</small></article>
        <article class="kpi"><h3>Expiring in 60 Days</h3><strong>0</strong><small>Add alerts and automations from Cloud Functions.</small></article>
        <article class="kpi"><h3>Pending Renewals</h3><strong>0</strong><small>Track follow-up by manager.</small></article>
      </div>

      <article class="card">
        <div class="title">Operational Notes</div>
        <ul>
          <li>Create leases from each property detail screen for accurate property-unit binding.</li>
          <li>Use status values: active, pending, expired, terminated.</li>
          <li>Enable lease expiration notifications in Settings to alert managers.</li>
        </ul>
      </article>
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
    .kpi small { color:#94a3b8; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:14px; background:rgba(15,23,42,.78); padding:14px; color:#e2e8f0; }
    .title { font-weight:800; margin-bottom:10px; }
    ul { margin:0; padding-left:20px; color:#cbd5e1; }
    li { margin-bottom:8px; }
    @media (max-width: 980px) { .kpi-grid { grid-template-columns:1fr; } }
  `],
})
export class LeasesOverviewPage {}
