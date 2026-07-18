import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LandlordDashboardService, LandlordKPIs } from './landlord-dashboard.service';
import { Property } from '../../core/models/property.models';
import { MaintenanceRequest } from '../maintenance/maintenance.service';

@Component({
  selector: 'app-landlord-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-screen" *ngIf="loading">
      <div class="spinner"></div>
      <p>Loading dashboard…</p>
    </div>

    <div class="page" *ngIf="!loading">
      <div class="header">
        <h1>Landlord Dashboard</h1>
        <p class="subtitle">Your portfolio at a glance</p>
        <p class="subtitle" *ngIf="kpis.loadError">Live KPI data temporarily unavailable.</p>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon">🏠</div>
          <div class="kpi-value">{{ kpis.totalProperties < 0 ? '—' : kpis.totalProperties }}</div>
          <div class="kpi-label">Total Properties</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">✅</div>
          <div class="kpi-value">{{ kpis.occupiedProperties < 0 ? '—' : kpis.occupiedProperties }}</div>
          <div class="kpi-label">Occupied</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🔓</div>
          <div class="kpi-value">{{ kpis.vacantProperties < 0 ? '—' : kpis.vacantProperties }}</div>
          <div class="kpi-label">Vacant</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📊</div>
          <div class="kpi-value">{{ kpis.occupancyRate < 0 ? '—' : (kpis.occupancyRate + '%') }}</div>
          <div class="kpi-label">Occupancy Rate</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">👥</div>
          <div class="kpi-value">{{ kpis.activeTenants < 0 ? '—' : kpis.activeTenants }}</div>
          <div class="kpi-label">Active Tenants</div>
        </div>
        <div class="kpi-card alert" [class.has-alert]="kpis.openMaintenance > 0">
          <div class="kpi-icon">🔧</div>
          <div class="kpi-value">{{ kpis.openMaintenance < 0 ? '—' : kpis.openMaintenance }}</div>
          <div class="kpi-label">Open Maintenance</div>
        </div>
      </div>

      <!-- Properties List -->
      <div class="section">
        <div class="section-header">
          <h2>My Properties</h2>
          <button class="btn-sm" (click)="router.navigate(['/landlord/properties'])">View All</button>
        </div>
        <div class="properties-grid" *ngIf="properties.length; else noProperties">
          <div class="property-card card" *ngFor="let p of properties | slice:0:6">
            <div class="prop-status-dot" [ngClass]="p.status"></div>
            <div class="prop-name">{{ p.name }}</div>
            <div class="prop-addr" *ngIf="p.address?.line1 || p.streetAddress">
              {{ p.address?.line1 || p.streetAddress }}, {{ p.address?.city || p.city }}
            </div>
            <div class="prop-meta">
              <span class="badge" [ngClass]="p.status">{{ p.status | titlecase }}</span>
              <span class="prop-type" *ngIf="p.type">{{ p.type }}</span>
            </div>
          </div>
        </div>
        <ng-template #noProperties>
          <div class="empty">No properties found. <button class="link-btn" (click)="router.navigate(['/properties/new'])">Add one</button></div>
        </ng-template>
      </div>

      <!-- Open Maintenance -->
      <div class="section" *ngIf="openMaintenance.length">
        <div class="section-header">
          <h2>Open Maintenance Requests</h2>
          <button class="btn-sm" (click)="router.navigate(['/landlord/maintenance'])">View All</button>
        </div>
        <div class="maint-list">
          <div class="maint-item card" *ngFor="let m of openMaintenance | slice:0:5">
            <div class="maint-icon">🔧</div>
            <div class="maint-body">
              <div class="maint-title">{{ m.title }}</div>
              <div class="maint-meta">
                <span *ngIf="m.category">{{ m.category }}</span>
                <span>{{ m.createdAt | date:'mediumDate' }}</span>
              </div>
            </div>
            <span class="badge" [ngClass]="m.priority">{{ m.priority | titlecase }}</span>
            <span class="badge" [ngClass]="m.status">{{ m.status | titlecase }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loading-screen{display:grid;place-items:center;min-height:60vh;color:#94a3b8;gap:12px}
    .spinner{width:40px;height:40px;border:3px solid rgba(148,163,184,.3);border-top-color:#0ea5e9;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .page{padding:24px;background:#0f172a;min-height:100vh;color:#e5e7eb}
    .header{margin-bottom:24px}
    h1{font-size:26px;font-weight:900;color:#f8fafc;margin:0 0 6px}
    h2{font-size:16px;font-weight:700;color:#f8fafc;margin:0}
    .subtitle{color:rgba(226,232,240,.65);margin:0;font-size:14px}
    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:28px}
    .kpi-card{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px;text-align:center;transition:border-color .2s}
    .kpi-card.has-alert{border-color:rgba(251,191,36,.4)}
    .kpi-icon{font-size:28px;margin-bottom:8px}
    .kpi-value{font-size:28px;font-weight:900;color:#f8fafc;line-height:1}
    .kpi-label{font-size:11px;color:rgba(226,232,240,.55);text-transform:uppercase;font-weight:600;margin-top:6px}
    .section{margin-bottom:28px}
    .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
    .btn-sm{padding:6px 14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e5e7eb;font-size:12px;font-weight:600;cursor:pointer}
    .btn-sm:hover{background:rgba(255,255,255,.12)}
    .properties-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
    .card{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px}
    .property-card{position:relative;overflow:hidden}
    .prop-status-dot{position:absolute;top:12px;right:12px;width:10px;height:10px;border-radius:50%;background:#94a3b8}
    .prop-status-dot.occupied{background:#4ade80}
    .prop-status-dot.available{background:#fbbf24}
    .prop-status-dot.maintenance{background:#f87171}
    .prop-name{font-weight:700;color:#f8fafc;font-size:14px;margin-bottom:4px}
    .prop-addr{font-size:12px;color:rgba(226,232,240,.55);margin-bottom:10px}
    .prop-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .prop-type{font-size:11px;color:#64748b;text-transform:uppercase}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(148,163,184,.15);color:#94a3b8}
    .badge.occupied,.badge.active,.badge.completed{background:rgba(34,197,94,.18);color:#4ade80}
    .badge.available,.badge.new,.badge.low{background:rgba(251,191,36,.18);color:#fbbf24}
    .badge.in_progress,.badge.medium{background:rgba(59,130,246,.18);color:#60a5fa}
    .badge.high{background:rgba(249,115,22,.18);color:#fb923c}
    .badge.emergency{background:rgba(239,68,68,.18);color:#f87171}
    .maint-list{display:flex;flex-direction:column;gap:10px}
    .maint-item{display:flex;align-items:center;gap:12px}
    .maint-icon{font-size:20px;flex-shrink:0}
    .maint-body{flex:1}
    .maint-title{font-size:13px;font-weight:600;color:#f8fafc;margin-bottom:2px}
    .maint-meta{font-size:11px;color:rgba(226,232,240,.5);display:flex;gap:8px}
    .empty{color:#64748b;font-size:14px;padding:24px;text-align:center}
    .link-btn{background:none;border:none;color:#0ea5e9;cursor:pointer;text-decoration:underline;font-size:inherit}
  `]
})
export class LandlordHomePage implements OnInit, OnDestroy {
  private svc = inject(LandlordDashboardService);
  router = inject(Router);

  loading = true;
  kpis: LandlordKPIs = {
    totalProperties: 0, occupiedProperties: 0, vacantProperties: 0,
    occupancyRate: 0, activeTenants: 0, openMaintenance: 0, monthlyRevenue: 0,
  };
  properties: Property[] = [];
  openMaintenance: MaintenanceRequest[] = [];

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.svc.getKPIs().pipe(takeUntil(this.destroy$))
      .subscribe((k) => { this.kpis = k; this.loading = false; });

    this.svc.getProperties().pipe(takeUntil(this.destroy$))
      .subscribe((p) => { this.properties = p; });

    this.svc.getOpenMaintenance().pipe(takeUntil(this.destroy$))
      .subscribe((m) => { this.openMaintenance = m; });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
