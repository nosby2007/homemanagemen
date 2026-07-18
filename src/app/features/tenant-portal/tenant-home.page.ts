import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { combineLatest, of, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil, map } from 'rxjs/operators';
import { TenantDashboardService } from './tenant-dashboard.service';
import { Tenant } from '../tenants/tenants.service';
import { Lease } from '../leases/leases.service';
import { Payment } from '../payments/payments.service';
import { MaintenanceRequest } from '../maintenance/maintenance.service';
import { Property } from '../../core/models/property.models';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-screen" *ngIf="loading">
      <div class="spinner"></div>
      <p>Loading your portal…</p>
    </div>

    <div class="page" *ngIf="!loading">
      <div class="header">
        <h1>Welcome{{ tenantProfile?.displayName ? ', ' + tenantProfile!.displayName : '' }}</h1>
        <p class="subtitle">Your rental overview at a glance</p>
      </div>

      <div class="grid">
        <!-- Quick Actions -->
        <div class="card">
          <h2>Quick Actions</h2>
          <div class="action-buttons">
            <button class="action-btn primary" (click)="router.navigate(['/tenant/payments'])">
              <span class="icon">💳</span><span>Pay Rent</span>
            </button>
            <button class="action-btn" (click)="router.navigate(['/tenant/maintenance'])">
              <span class="icon">🔧</span><span>Request Maintenance</span>
            </button>
            <button class="action-btn" (click)="router.navigate(['/tenant/documents'])">
              <span class="icon">📄</span><span>My Documents</span>
            </button>
          </div>
        </div>

        <!-- Rent Status -->
        <div class="card">
          <h2>Rent Status</h2>
          <ng-container *ngIf="activeLease; else noLease">
            <div class="rent-info">
              <div class="rent-amount">\${{ activeLease.monthlyRent | number:'1.2-2' }}</div>
              <div class="rent-label">Monthly rent</div>
              <div class="rent-label" *ngIf="activeLease.paymentDueDay">
                Due on day {{ activeLease.paymentDueDay }} of each month
              </div>
              <div class="status-badge" [class.active]="activeLease.status === 'active'"
                   [class.expired]="activeLease.status === 'expired'">
                {{ activeLease.status | titlecase }}
              </div>
            </div>
            <div class="lease-dates">
              <div class="info-item">
                <div class="info-label">Lease Start</div>
                <div class="info-value">{{ activeLease.startDate | date:'mediumDate' }}</div>
              </div>
              <div class="info-item" *ngIf="activeLease.endDate">
                <div class="info-label">Lease End</div>
                <div class="info-value">{{ activeLease.endDate | date:'mediumDate' }}</div>
              </div>
            </div>
          </ng-container>
          <ng-template #noLease>
            <div class="empty">No active lease found.</div>
          </ng-template>
        </div>

        <!-- Maintenance Requests -->
        <div class="card full-width">
          <h2>Recent Maintenance Requests</h2>
          <div class="maintenance-list" *ngIf="maintenanceRequests.length; else noMaintenance">
            <div class="maintenance-item" *ngFor="let req of maintenanceRequests">
              <div class="maintenance-icon">🔧</div>
              <div class="maintenance-details">
                <div class="maintenance-title">{{ req.title }}</div>
                <div class="maintenance-date">{{ req.createdAt | date:'mediumDate' }}</div>
                <div class="maintenance-cat" *ngIf="req.category">{{ req.category }}</div>
              </div>
              <div class="status-badge" [ngClass]="req.status">{{ req.status | titlecase }}</div>
            </div>
          </div>
          <ng-template #noMaintenance>
            <div class="empty">No maintenance requests yet.
              <button class="link-btn" (click)="router.navigate(['/tenant/maintenance'])">Submit one</button>
            </div>
          </ng-template>
        </div>

        <!-- Property Information -->
        <div class="card full-width" *ngIf="property">
          <h2>Property Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Property</div>
              <div class="info-value">{{ property.name || 'N/A' }}</div>
            </div>
            <div class="info-item" *ngIf="property.address?.line1 || property.streetAddress">
              <div class="info-label">Address</div>
              <div class="info-value">{{ property.address?.line1 || property.streetAddress }}</div>
            </div>
            <div class="info-item" *ngIf="property.contactPhone">
              <div class="info-label">Contact Phone</div>
              <div class="info-value">{{ property.contactPhone }}</div>
            </div>
            <div class="info-item" *ngIf="property.contactEmail">
              <div class="info-label">Contact Email</div>
              <div class="info-value">{{ property.contactEmail }}</div>
            </div>
          </div>
        </div>

        <!-- Recent Payments -->
        <div class="card full-width" *ngIf="recentPayments.length">
          <h2>Recent Payments</h2>
          <div class="payment-table">
            <div class="payment-row header-row">
              <span>Amount</span><span>Date</span><span>Method</span><span>Status</span>
            </div>
            <div class="payment-row" *ngFor="let p of recentPayments">
              <span class="amount">\${{ p.amount | number:'1.2-2' }}</span>
              <span>{{ (p.paidAt || p.createdAt) | date:'mediumDate' }}</span>
              <span>{{ p.method || 'N/A' }}</span>
              <span class="status-badge" [ngClass]="p.status">{{ p.status | titlecase }}</span>
            </div>
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
    .header{margin-bottom:28px}
    h1{font-size:26px;font-weight:900;color:#f8fafc;margin:0 0 6px}
    .subtitle{color:rgba(226,232,240,.7);margin:0;font-size:14px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}
    .card{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px}
    .card.full-width{grid-column:1/-1}
    h2{font-size:16px;font-weight:700;margin:0 0 16px;color:#f8fafc}
    .action-buttons{display:flex;flex-direction:column;gap:10px}
    .action-btn{display:flex;align-items:center;gap:12px;padding:13px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#e5e7eb;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
    .action-btn:hover{background:rgba(255,255,255,.1)}
    .action-btn.primary{background:linear-gradient(135deg,#3b82f6,#2563eb);border-color:#3b82f6}
    .icon{font-size:22px}
    .rent-info{text-align:center;padding:14px 0 8px}
    .rent-amount{font-size:32px;font-weight:900;color:#f8fafc;margin-bottom:4px}
    .rent-label{color:rgba(226,232,240,.65);font-size:12px;margin-bottom:6px}
    .lease-dates{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
    .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(148,163,184,.15);color:#94a3b8}
    .status-badge.active,.status-badge.paid,.status-badge.completed{background:rgba(34,197,94,.18);color:#4ade80}
    .status-badge.expired,.status-badge.failed,.status-badge.cancelled{background:rgba(239,68,68,.18);color:#f87171}
    .status-badge.pending,.status-badge.new,.status-badge.in_progress{background:rgba(251,191,36,.18);color:#fbbf24}
    .maintenance-list{display:flex;flex-direction:column;gap:12px}
    .maintenance-item{display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,.03);border-radius:12px;border:1px solid rgba(255,255,255,.05)}
    .maintenance-icon{font-size:22px;flex-shrink:0}
    .maintenance-details{flex:1}
    .maintenance-title{font-weight:600;color:#f8fafc;margin-bottom:3px;font-size:13px}
    .maintenance-date,.maintenance-cat{font-size:11px;color:rgba(226,232,240,.55)}
    .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
    .info-item{padding:12px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid rgba(255,255,255,.05)}
    .info-label{font-size:10px;color:rgba(226,232,240,.5);text-transform:uppercase;font-weight:600;margin-bottom:5px}
    .info-value{font-size:13px;color:#f8fafc;font-weight:500}
    .empty{color:#94a3b8;font-size:13px;text-align:center;padding:20px 0}
    .link-btn{background:none;border:none;color:#0ea5e9;cursor:pointer;text-decoration:underline;font-size:inherit}
    .payment-table{display:grid;gap:0}
    .payment-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;padding:9px 10px;border-bottom:1px solid rgba(148,163,184,.1);font-size:12px;align-items:center}
    .payment-row.header-row{color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase}
    .amount{font-weight:700;color:#f8fafc}
  `]
})
export class TenantHomePage implements OnInit, OnDestroy {
  private svc = inject(TenantDashboardService);
  router = inject(Router);

  loading = true;
  tenantProfile: Tenant | null = null;
  activeLease: Lease | null = null;
  property: Property | null = null;
  recentPayments: Payment[] = [];
  maintenanceRequests: MaintenanceRequest[] = [];

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.svc.getTenantProfile().pipe(
      takeUntil(this.destroy$),
      switchMap((profile) => {
        this.tenantProfile = profile;
        if (!profile) return of({ property: null, payments: [] as Payment[], maintenance: [] as MaintenanceRequest[] });

        return this.svc.getActiveLease(profile.id).pipe(
          switchMap((lease) => {
            this.activeLease = lease;
            const maintenance$ = this.svc.getMaintenanceRequests();
            if (!lease) return maintenance$.pipe(map((m) => ({ property: null, payments: [] as Payment[], maintenance: m })));

            return combineLatest([
              this.svc.getProperty(lease.propertyId),
              this.svc.getRecentPayments(lease.propertyId, lease.id),
              maintenance$,
            ]).pipe(map(([property, payments, maintenance]) => ({ property, payments, maintenance })));
          }),
        );
      }),
      catchError(() => of({ property: null, payments: [] as Payment[], maintenance: [] as MaintenanceRequest[] })),
    ).subscribe((result) => {
      this.property = result.property;
      this.recentPayments = result.payments;
      this.maintenanceRequests = result.maintenance;
      this.loading = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
