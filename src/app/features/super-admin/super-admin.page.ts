import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SuperAdminMetricsService } from './super-admin-metrics.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="dashboard">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <a class="back" routerLink="/super-admin/setup">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
           Setup
        </a>
        <div class="header-info">
          <h1 class="org-name">{{ orgData.name }}</h1>
          <div class="org-meta">
            <span class="badge" [class.active]="orgData.status === 'active'">{{ orgData.status }}</span>
            <span class="org-id">ID: {{ orgId }}</span>
            <span class="org-date">Since {{ orgData.createdDate }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-primary">
        <div class="kpi-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Total Members</div>
          <div class="kpi-value">{{ kpis.totalMembers }}</div>
          <div class="kpi-trend">Across all active organizations</div>
        </div>
      </div>

      <div class="kpi-card kpi-success">
        <div class="kpi-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Active Inspections</div>
          <div class="kpi-value">{{ kpis.activeInspections }}</div>
          <div class="kpi-trend">Current inspection volume</div>
        </div>
      </div>

      <div class="kpi-card kpi-warning">
        <div class="kpi-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Organizations</div>
          <div class="kpi-value">{{ kpis.totalOrgs }}</div>
          <div class="kpi-trend">Total onboarded organizations</div>
        </div>
      </div>

      <div class="kpi-card kpi-info">
        <div class="kpi-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Open Work Orders</div>
          <div class="kpi-value">{{ kpis.workOrders }}</div>
          <div class="kpi-trend">Cross-organization backlog</div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid">
      <!-- Chart Section -->
      <div class="card chart-card">
        <div class="card-header">
          <h2 class="card-title">Activity Overview</h2>
          <div class="chart-legend">
            <span class="legend-item"><span class="dot dot-primary"></span>Inspections</span>
            <span class="legend-item"><span class="dot dot-success"></span>Reports</span>
          </div>
        </div>
        <div class="chart-container">
          <div class="chart-bars">
            <div *ngFor="let data of chartData" class="bar-group">
              <div class="bar-stack">
                <div class="bar bar-primary" [style.height.%]="data.inspections"></div>
                <div class="bar bar-success" [style.height.%]="data.reports"></div>
              </div>
              <div class="bar-label">{{ data.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card activity-card">
        <div class="card-header">
          <h2 class="card-title">Recent Activity</h2>
          <button class="btn-link">View All</button>
        </div>
        <div class="activity-list">
          <div *ngFor="let activity of recentActivity" class="activity-item">
            <div class="activity-icon" [class]="'icon-' + activity.type">
              <svg *ngIf="activity.type === 'user'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <svg *ngIf="activity.type === 'inspection'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <svg *ngIf="activity.type === 'settings'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m5.2-14.8l-4.2 4.2m-2 2l-4.2 4.2m12.2-.8l-4.2-4.2m-2-2L2.8 7.2"/>
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-text">{{ activity.text }}</div>
              <div class="activity-time">{{ activity.time }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Audit Log -->
    <div class="card audit-card">
      <div class="card-header">
        <h2 class="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Audit Log
        </h2>
        <div class="audit-filters">
          <button class="filter-btn active">All</button>
          <button class="filter-btn">Security</button>
          <button class="filter-btn">Changes</button>
          <button class="filter-btn">Access</button>
        </div>
      </div>
      <div class="audit-table">
        <div class="table-header">
          <div class="col-time">Timestamp</div>
          <div class="col-user">User</div>
          <div class="col-action">Action</div>
          <div class="col-details">Details</div>
          <div class="col-status">Status</div>
        </div>
        <div class="table-body">
          <div *ngFor="let log of auditLogs" class="table-row">
            <div class="col-time">{{ log.timestamp }}</div>
            <div class="col-user">
              <div class="user-info">
                <div class="user-avatar">{{ log.userInitials }}</div>
                <span>{{ log.userName }}</span>
              </div>
            </div>
            <div class="col-action">
              <span class="action-badge" [class]="'action-' + log.actionType">{{ log.action }}</span>
            </div>
            <div class="col-details">{{ log.details }}</div>
            <div class="col-status">
              <span class="status-badge" [class]="'status-' + log.status">{{ log.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-bar">
      <button class="btn btn-primary" disabled title="Coming soon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit Organization
      </button>
      <button class="btn btn-secondary" disabled title="Coming soon">Manage Branding</button>
      <button class="btn btn-secondary" disabled title="Coming soon">Export Data</button>
      <button class="btn btn-danger" disabled title="Coming soon">Suspend Organization</button>
    </div>
  </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      background: linear-gradient(135deg, #ffffff 0%, #f7f9fc 100%);
      min-height: 100vh;
      color: #0f172a;
    }

    /* Header */
    .header {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.2s;
    }

    .back:hover {
      color: #60a5fa;
      transform: translateX(-4px);
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .org-name {
      font-size: 32px;
      font-weight: 800;
      margin: 0;
      background: linear-gradient(135deg, #0f4c81 0%, #1d8f8a 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .org-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background: #e2e8f0;
      color: #334155;
    }

    .badge.active {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
    }

    .org-id, .org-date {
      font-size: 14px;
      color: #94a3b8;
      font-family: ui-monospace, monospace;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 24px;
      display: flex;
      gap: 16px;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #0f4c81, #1d8f8a);
    }

    .kpi-card.kpi-primary::before { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
    .kpi-card.kpi-success::before { background: linear-gradient(90deg, #10b981, #059669); }
    .kpi-card.kpi-warning::before { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .kpi-card.kpi-info::before { background: linear-gradient(90deg, #0f766e, #14b8a6); }

    .kpi-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
      border-color: #cbd5e1;
    }

    .kpi-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-primary .kpi-icon { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
    .kpi-success .kpi-icon { background: linear-gradient(135deg, #10b981, #059669); }
    .kpi-warning .kpi-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .kpi-info .kpi-icon { background: linear-gradient(135deg, #0f766e, #14b8a6); }

    .kpi-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kpi-label {
      font-size: 13px;
      color: #94a3b8;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .kpi-value {
      font-size: 32px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1;
    }

    .kpi-trend {
      font-size: 13px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .kpi-trend.positive {
      color: #10b981;
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Card Styles */
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 24px;
      backdrop-filter: blur(10px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #0f172a;
    }

    .btn-link {
      background: none;
      border: none;
      color: #60a5fa;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: color 0.2s;
    }

    .btn-link:hover {
      color: #3b82f6;
    }

    /* Chart */
    .chart-legend {
      display: flex;
      gap: 16px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #94a3b8;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot-primary { background: #60a5fa; }
    .dot-success { background: #10b981; }

    .chart-container {
      height: 280px;
      position: relative;
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      height: 100%;
      gap: 12px;
      padding-top: 20px;
    }

    .bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      height: 100%;
    }

    .bar-stack {
      flex: 1;
      width: 100%;
      max-width: 60px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 4px;
    }

    .bar {
      width: 100%;
      border-radius: 8px 8px 0 0;
      transition: all 0.3s;
      min-height: 20px;
    }

    .bar-primary {
      background: linear-gradient(180deg, #60a5fa, #3b82f6);
    }

    .bar-success {
      background: linear-gradient(180deg, #10b981, #059669);
    }

    .bar:hover {
      opacity: 0.8;
      transform: scaleY(1.05);
    }

    .bar-label {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }

    /* Activity List */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .activity-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }

    .activity-item:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
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

    .icon-user { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
    .icon-inspection { background: linear-gradient(135deg, #10b981, #059669); }
    .icon-settings { background: linear-gradient(135deg, #f59e0b, #d97706); }

    .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .activity-text {
      font-size: 14px;
      color: #1e293b;
    }

    .activity-time {
      font-size: 12px;
      color: #64748b;
    }

    /* Audit Table */
    .audit-card {
      margin-bottom: 24px;
    }

    .audit-filters {
      display: flex;
      gap: 8px;
    }

    .filter-btn {
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: #eff6ff;
      color: #0f172a;
    }

    .filter-btn.active {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      color: white;
      border-color: transparent;
    }

    .audit-table {
      overflow-x: auto;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 140px 180px 150px 1fr 120px;
      gap: 16px;
      padding: 12px 16px;
      align-items: center;
    }

    .table-header {
      background: #f1f5f9;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .table-row {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 8px;
      transition: all 0.2s;
      font-size: 14px;
    }

    .table-row:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .col-time {
      font-family: ui-monospace, monospace;
      color: #94a3b8;
      font-size: 13px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0f4c81, #1d8f8a);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    .action-badge {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    .action-create { background: #10b98133; color: #10b981; }
    .action-update { background: #60a5fa33; color: #60a5fa; }
    .action-delete { background: #ef444433; color: #ef4444; }
    .action-access { background: #f59e0b33; color: #f59e0b; }

    .status-badge {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-success { background: #10b98133; color: #10b981; }
    .status-warning { background: #f59e0b33; color: #f59e0b; }
    .status-error { background: #ef444433; color: #ef4444; }

    /* Action Bar */
    .action-bar {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 14px 24px;
      border-radius: 12px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }

    .btn-primary {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      color: white;
      box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(96, 165, 250, 0.4);
    }

    .btn-secondary {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }

    .btn-secondary:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.3);
    }
  `]
})
export class SuperAdminPage implements OnInit {
  private route = inject(ActivatedRoute);
  private metrics = inject(SuperAdminMetricsService);
  orgId = this.route.snapshot.paramMap.get('orgId') || '';

  orgData = {
    name: 'Platform Overview',
    status: 'active',
    createdDate: 'Live'
  };

  kpis = {
    totalMembers: 0,
    activeInspections: 0,
    totalOrgs: 0,
    workOrders: 0,
  };

  chartData: Array<{ label: string; inspections: number; reports: number }> = [];

  recentActivity: Array<{ type: 'user' | 'inspection' | 'settings'; text: string; time: string }> = [];

  auditLogs = [
    {
      timestamp: '2024-01-15 14:32',
      userName: 'John Smith',
      userInitials: 'JS',
      action: 'User Created',
      actionType: 'create',
      details: 'New member added to organization',
      status: 'success'
    },
    {
      timestamp: '2024-01-15 14:20',
      userName: 'Admin User',
      userInitials: 'AU',
      action: 'Settings Updated',
      actionType: 'update',
      details: 'Organization branding configuration changed',
      status: 'success'
    },
    {
      timestamp: '2024-01-15 13:45',
      userName: 'Sarah Johnson',
      userInitials: 'SJ',
      action: 'Access Granted',
      actionType: 'access',
      details: 'Premium features access enabled',
      status: 'warning'
    },
    {
      timestamp: '2024-01-15 12:30',
      userName: 'Mike Davis',
      userInitials: 'MD',
      action: 'Report Deleted',
      actionType: 'delete',
      details: 'Inspection report #1825 permanently removed',
      status: 'success'
    },
    {
      timestamp: '2024-01-15 11:15',
      userName: 'System',
      userInitials: 'SY',
      action: 'Backup Failed',
      actionType: 'update',
      details: 'Automated backup process encountered an error',
      status: 'error'
    }
  ];

  ngOnInit() {
    this.loadDashboard();
  }

  private async loadDashboard() {
    try {
      const totals = await this.metrics.getTotals();
      this.kpis = {
        totalMembers: totals.members,
        activeInspections: totals.inspections,
        totalOrgs: totals.orgs,
        workOrders: totals.workOrders,
      };

      const trend = await this.metrics.inspectionsLast7Days();
      const max = Math.max(1, ...trend.map((p) => p.value));
      this.chartData = trend.map((point) => {
        const inspections = Math.max(8, Math.round((point.value / max) * 100));
        const reports = Math.max(6, Math.round(inspections * 0.65));
        return { label: point.label, inspections, reports };
      });

      this.recentActivity = [
        { type: 'user', text: `${totals.members} active members on the platform`, time: 'Live' },
        { type: 'inspection', text: `${totals.inspections} inspections tracked`, time: 'Live' },
        { type: 'settings', text: `${totals.orgs} organizations configured`, time: 'Live' },
        { type: 'inspection', text: `${totals.reports} reports generated`, time: 'Live' },
        { type: 'settings', text: `${totals.workOrders} work orders in workflow`, time: 'Live' },
      ];
    } catch {
      this.recentActivity = [
        { type: 'settings', text: 'Unable to load live metrics (check permissions).', time: 'Now' },
      ];
    }
  }
}
