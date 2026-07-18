import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from './dashboard.service';
import { from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="vm$ | async as vm">
      <div class="dashboard">
        <!-- Header Section -->
        <div class="dashboard-header">
          <div class="header-content">
            <div>
              <h1 class="dashboard-title">Dashboard</h1>
              <p class="dashboard-subtitle">Welcome back! Here's your property management overview</p>
              <p class="dashboard-subtitle" *ngIf="vm.loadError">Live KPI data temporarily unavailable.</p>
            </div>
            <div class="header-actions">
              <button class="btn-secondary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Search
              </button>
              <button class="btn-primary" (click)="create()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add New Property
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">Total Properties</div>
              <div class="kpi-value">{{ vm.kpis.totalProperties ?? '—' }}</div>
              <div class="kpi-trend positive">
                <span>{{ vm.kpis.activeProperties ?? '—' }} active • {{ vm.kpis.pendingProperties ?? '—' }} pending</span>
              </div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">Completed Inspections</div>
              <div class="kpi-value">{{ vm.kpis.completedInspections ?? '—' }}</div>
              <div class="kpi-trend positive">
                <span>{{ vm.kpis.totalInspections ?? '—' }} total</span>
              </div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">Pending Reviews</div>
              <div class="kpi-value">{{ vm.kpis.pendingReviews ?? '—' }}</div>
              <div class="kpi-trend neutral">
                <span>{{ vm.kpis.criticalFindings ?? '—' }} critical findings</span>
              </div>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">Revenue (MTD)</div>
              <div class="kpi-value">{{ vm.kpis.revenueMtd == null ? '—' : ('$' + (vm.kpis.revenueMtd | number:'1.0-0')) }}</div>
              <div class="kpi-trend positive">
                <span>{{ vm.kpis.totalPayments ?? '—' }} payments</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts and Activity Section -->
        <div class="content-grid">
          <!-- Chart Card (optional: replace with real chart later) -->
          <div class="card chart-card">
            <div class="card-header">
              <h2 class="card-title">Inspections Overview</h2>
              <select class="time-selector" disabled>
                <option>Last 7 days</option>
              </select>
            </div>
            <div class="chart-container">
              <div class="muted" style="opacity:.8;">
                Chart can be wired next: by querying inspections by date range and status.
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="card activity-card">
            <div class="card-header">
              <h2 class="card-title">Recent Activity</h2>
              <a href="#" class="view-all">View All</a>
            </div>
            <div class="activity-list">
              <div class="activity-item" *ngFor="let activity of vm.recentActivity">
                <div class="activity-icon" [ngClass]="activity.type">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                </div>
                <div class="activity-content">
                  <div class="activity-title">{{activity.title}}</div>
                  <div class="activity-time">{{activity.time}}</div>
                </div>
              </div>

              <div class="muted" *ngIf="!vm.recentActivity?.length" style="margin-top:8px;">
                No activity yet.
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom grid left as-is (still static buttons / tasks) -->
        <!-- You can wire tasks later to Work Orders, upcoming inspections, etc. -->

        <div class="bottom-grid">
          <!-- keep your existing bottom grid template exactly (omitted here for brevity) -->
        </div>
      </div>
    </ng-container>
  `,
 styles: [`
    .dashboard {
      padding: 24px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
    }

    /* Header */
    .dashboard-header {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .dashboard-title {
      font-size: 32px;
      font-weight: 900;
      color: #f8fafc;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .dashboard-subtitle {
      color: rgba(226, 232, 240, 0.7);
      margin: 8px 0 0 0;
      font-size: 15px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn-primary, .btn-secondary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 10px;
      border: none;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      gap: 16px;
      transition: all 0.3s;
    }

    .kpi-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .kpi-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon.blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .kpi-icon.green { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .kpi-icon.orange { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .kpi-icon.purple { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

    .kpi-content {
      flex: 1;
    }

    .kpi-label {
      font-size: 13px;
      color: rgba(226, 232, 240, 0.7);
      margin-bottom: 8px;
      font-weight: 500;
    }

    .kpi-value {
      font-size: 28px;
      font-weight: 900;
      color: #f8fafc;
      margin-bottom: 8px;
    }

    .kpi-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
    }

    .kpi-trend.positive { color: #10b981; }
    .kpi-trend.neutral { color: rgba(226, 232, 240, 0.6); }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    @media (max-width: 1024px) {
      .content-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
    }

    .time-selector {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 6px 12px;
      color: #e2e8f0;
      font-size: 13px;
      cursor: pointer;
    }

    .view-all {
      color: #3b82f6;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
    }

    /* Chart */
    .chart-container {
      margin-top: 24px;
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 200px;
      gap: 8px;
      padding: 0 8px;
      margin-bottom: 16px;
    }

    .bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .bar-stack {
      width: 100%;
      max-width: 40px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 2px;
    }

    .bar {
      width: 100%;
      border-radius: 4px;
      transition: all 0.3s;
      min-height: 4px;
    }

    .bar.completed { background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%); }
    .bar.pending { background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%); }

    .bar-label {
      font-size: 11px;
      color: rgba(226, 232, 240, 0.6);
      font-weight: 600;
    }

    .chart-legend {
      display: flex;
      gap: 24px;
      justify-content: center;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: rgba(226, 232, 240, 0.8);
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .legend-color.completed { background: #3b82f6; }
    .legend-color.pending { background: #f59e0b; }

    /* Activity */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .activity-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      transition: all 0.2s;
    }

    .activity-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .activity-icon.inspection { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .activity-icon.report { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .activity-icon.property { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

    .activity-content {
      flex: 1;
    }

    .activity-title {
      font-size: 14px;
      color: #e2e8f0;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .activity-time {
      font-size: 12px;
      color: rgba(226, 232, 240, 0.5);
    }

    /* Bottom Grid */
    .bottom-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }

    /* Quick Actions */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(59, 130, 246, 0.4);
      color: #3b82f6;
    }

    /* Status Chart */
    .status-chart {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .donut-chart {
      position: relative;
    }

    .donut-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .donut-total {
      font-size: 28px;
      font-weight: 900;
      color: #f8fafc;
    }

    .donut-label {
      font-size: 12px;
      color: rgba(226, 232, 240, 0.6);
    }

    .status-legend {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .status-dot.active { background: #3b82f6; }
    .status-dot.inspected { background: #10b981; }
    .status-dot.pending { background: #f59e0b; }

    .status-name {
      flex: 1;
      font-size: 14px;
      color: rgba(226, 232, 240, 0.8);
    }

    .status-count {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
    }

    /* Tasks */
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .task-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      align-items: flex-start;
    }

    .task-checkbox {
      margin-top: 2px;
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .task-content {
      flex: 1;
    }

    .task-title {
      font-size: 14px;
      color: #e2e8f0;
      margin-bottom: 6px;
    }

    .task-meta {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .task-date {
      font-size: 12px;
      color: rgba(226, 232, 240, 0.5);
    }

    .task-priority {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }

    .task-priority.high {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .task-priority.medium {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .task-priority.low {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    @media (max-width: 768px) {
      .dashboard { padding: 16px; }
      .dashboard-title { font-size: 24px; }
      .header-actions { width: 100%; }
      .btn-primary, .btn-secondary { flex: 1; justify-content: center; }
      .kpi-grid { grid-template-columns: 1fr; }
      .quick-actions { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardPage {
  private dash = inject(DashboardService);

  private router = inject(Router);
  async create() {
    await this.router.navigate(['/properties/new']); 
  }

vm$ = from(
  Promise.all([
    this.dash.getKpis(),
    this.dash.getRecentActivity(),
  ])
).pipe(
  map(([kpis, recentActivity]) => ({ kpis, recentActivity, loadError: false })),
  catchError(err => {
    console.error('Dashboard error:', err);
    return from([{
      kpis: {
        totalProperties: null,
        activeProperties: null,
        pendingProperties: null,
        completedInspections: null,
        totalInspections: null,
        pendingReviews: null,
        criticalFindings: null,
        revenueMtd: null,
        totalPayments: null,
      },
      recentActivity: [],
      loadError: true,
    }]);
  })
);


}
