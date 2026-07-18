import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { MaintenanceRequest } from '../maintenance/maintenance.service';
import { TenantDashboardService } from './tenant-dashboard.service';

@Component({
  selector: 'app-tenant-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="header">
        <h1>Maintenance Requests</h1>
        <p class="subtitle">Submit and track your maintenance requests</p>
      </div>

      <!-- Success / Error banner -->
      <div class="banner success" *ngIf="successMsg">{{ successMsg }}</div>
      <div class="banner error" *ngIf="errorMsg">{{ errorMsg }}</div>

      <!-- Submit new request -->
      <div class="card new-request-card">
        <h2>Submit New Request</h2>
        <form (ngSubmit)="submitRequest()" #f="ngForm">
          <div class="form-row">
            <div class="form-group">
              <label>Title *</label>
              <input [(ngModel)]="newRequest.title" name="title" required placeholder="Brief description of issue" />
            </div>
            <div class="form-group">
              <label>Category</label>
              <select [(ngModel)]="newRequest.category" name="category">
                <option *ngFor="let c of categories" [value]="c.value">{{ c.label }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Description *</label>
            <textarea [(ngModel)]="newRequest.description" name="description" rows="4" required
              placeholder="Provide as much detail as possible…"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Priority</label>
              <select [(ngModel)]="newRequest.priority" name="priority">
                <option *ngFor="let p of priorities" [value]="p.value">{{ p.label }}</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn-primary" [disabled]="submitting || !newRequest.title || !newRequest.description || !propertyId || !unitId || !tenantId">
            {{ submitting ? 'Submitting…' : 'Submit Request' }}
          </button>
        </form>
      </div>

      <!-- Requests list -->
      <div class="requests-section">
        <h2>My Requests <span class="count" *ngIf="requests.length">({{ requests.length }})</span></h2>

        <div class="loading-wrap" *ngIf="loading">
          <div class="spinner"></div>
        </div>

        <div class="empty" *ngIf="!loading && !requests.length">
          No maintenance requests yet. Submit your first one above.
        </div>

        <div class="request-card card" *ngFor="let r of requests">
          <div class="req-header">
            <h3>{{ r.title }}</h3>
            <span class="badge" [ngClass]="r.status">{{ r.status | titlecase }}</span>
          </div>
          <p class="req-desc">{{ r.description }}</p>
          <div class="req-meta">
            <span *ngIf="r.category"><b>Category:</b> {{ r.category }}</span>
            <span><b>Priority:</b>
              <span class="badge sm" [ngClass]="r.priority">{{ r.priority | titlecase }}</span>
            </span>
            <span><b>Submitted:</b> {{ r.createdAt | date:'mediumDate' }}</span>
            <span *ngIf="r.assignee"><b>Assigned to:</b> {{ r.assignee }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{padding:24px;background:#0f172a;min-height:100vh;color:#e5e7eb}
    .header{margin-bottom:24px}
    h1{font-size:24px;font-weight:900;color:#f8fafc;margin:0 0 6px}
    .subtitle{color:rgba(226,232,240,.65);margin:0;font-size:14px}
    h2{font-size:16px;font-weight:700;color:#f8fafc;margin:0 0 16px}
    h3{font-size:14px;font-weight:700;color:#f8fafc;margin:0}
    .card{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:22px;margin-bottom:16px}
    .banner{padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:13px;font-weight:600}
    .banner.success{background:rgba(34,197,94,.15);color:#4ade80;border:1px solid rgba(34,197,94,.3)}
    .banner.error{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3)}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
    label{font-size:12px;font-weight:600;color:rgba(226,232,240,.7);text-transform:uppercase}
    input,textarea,select{background:rgba(30,41,59,.9);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;color:#f8fafc;font-size:13px;outline:none;resize:vertical}
    input:focus,textarea:focus,select:focus{border-color:#3b82f6}
    option{background:#1e293b;color:#f8fafc}
    .btn-primary{padding:11px 24px;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;transition:opacity .2s}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .requests-section h2{margin-bottom:16px;color:#f8fafc}
    .count{color:#64748b;font-weight:400;font-size:13px}
    .loading-wrap{display:grid;place-items:center;padding:32px}
    .spinner{width:32px;height:32px;border:3px solid rgba(148,163,184,.3);border-top-color:#0ea5e9;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty{color:#64748b;text-align:center;padding:32px;font-size:14px}
    .request-card{margin-bottom:12px}
    .req-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
    .req-desc{font-size:13px;color:rgba(226,232,240,.7);margin:0 0 10px;line-height:1.5}
    .req-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:rgba(226,232,240,.6)}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(148,163,184,.15);color:#94a3b8}
    .badge.new,.badge.low{background:rgba(148,163,184,.15);color:#94a3b8}
    .badge.in_progress,.badge.medium{background:rgba(251,191,36,.18);color:#fbbf24}
    .badge.completed,.badge.resolved{background:rgba(34,197,94,.18);color:#4ade80}
    .badge.high{background:rgba(249,115,22,.18);color:#fb923c}
    .badge.emergency{background:rgba(239,68,68,.18);color:#f87171}
    .badge.sm{font-size:10px;padding:2px 8px}
    @media(max-width:600px){.form-row{grid-template-columns:1fr}}
  `]
})
export class TenantMaintenancePage implements OnInit, OnDestroy {
  private maintenance = inject(MaintenanceService);
  private tenantDashboard = inject(TenantDashboardService);

  loading = true;
  submitting = false;
  successMsg = '';
  errorMsg = '';
  requests: MaintenanceRequest[] = [];
  propertyId = '';
  unitId = '';
  tenantId = '';

  newRequest: Partial<MaintenanceRequest> = {
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
  };

  categories = [
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'appliance', label: 'Appliance' },
    { value: 'structural', label: 'Structural' },
    { value: 'general', label: 'General' },
  ];

  priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'emergency', label: 'Emergency' },
  ];

  private destroy$ = new Subject<void>();

  ngOnInit() {
    combineLatest([
      this.tenantDashboard.getActiveAssignment(),
      this.tenantDashboard.getTenantProfile(),
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([assignment, profile]) => {
        this.propertyId = String(assignment?.propertyId || '').trim();
        this.unitId = String(assignment?.unitId || profile?.currentUnitId || '').trim();
        this.tenantId = String(profile?.id || '').trim();
        if (!this.propertyId || !this.unitId || !this.tenantId) {
          this.errorMsg = 'Your account is missing an active property/unit assignment. Contact property management.';
        }
      },
    });

    this.maintenance.listForCurrentTenant().pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (reqs) => { this.requests = reqs; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  async submitRequest() {
    if (!this.newRequest.title?.trim() || !this.newRequest.description?.trim()) return;
    if (!this.propertyId || !this.unitId || !this.tenantId) {
      this.errorMsg = 'Your account is missing an active property/unit assignment. Contact property management.';
      return;
    }
    this.submitting = true;
    this.successMsg = '';
    this.errorMsg = '';

    try {
      await this.maintenance.create({
        title: this.newRequest.title!,
        description: this.newRequest.description!,
        category: this.newRequest.category ?? 'general',
        priority: (this.newRequest.priority as any) ?? 'medium',
        propertyId: this.propertyId,
        unitId: this.unitId,
        tenantId: this.tenantId,
      });
      this.successMsg = 'Request submitted successfully!';
      this.newRequest = { title: '', description: '', category: 'general', priority: 'medium' };
    } catch (err: any) {
      this.errorMsg = 'Failed to submit request. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
