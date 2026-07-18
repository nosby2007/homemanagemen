import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { UserService } from '../../core/services/user.service';
import { TenantDashboardService } from './tenant-dashboard.service';
import { Tenant } from '../tenants/tenants.service';
import { AppUser } from '../../core/models/domain.models';

@Component({
  selector: 'app-tenant-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="header">
        <h1>My Profile</h1>
        <p class="subtitle">Manage your contact information and account details</p>
      </div>

      <div class="loading-screen" *ngIf="loading">
        <div class="spinner"></div>
      </div>

      <div class="grid" *ngIf="!loading">
        <!-- Personal Info -->
        <div class="card">
          <h2>Personal Information</h2>
          <div class="avatar-row">
            <div class="avatar">{{ initials }}</div>
            <div>
              <div class="full-name">{{ userProfile?.fullName || userProfile?.displayName || 'Tenant' }}</div>
              <div class="role-tag">Tenant</div>
            </div>
          </div>
          <div class="info-list">
            <div class="info-row">
              <span class="lbl">Email</span>
              <span>{{ userProfile?.email || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="lbl">Phone</span>
              <span>{{ tenantProfile?.phone || '—' }}</span>
            </div>
            <div class="info-row" *ngIf="tenantProfile?.emergencyContact">
              <span class="lbl">Emergency Contact</span>
              <span>{{ tenantProfile!.emergencyContact }}</span>
            </div>
            <div class="info-row" *ngIf="tenantProfile?.emergencyPhone">
              <span class="lbl">Emergency Phone</span>
              <span>{{ tenantProfile!.emergencyPhone }}</span>
            </div>
          </div>
        </div>

        <!-- Tenancy Info -->
        <div class="card" *ngIf="tenantProfile">
          <h2>Tenancy Details</h2>
          <div class="info-list">
            <div class="info-row">
              <span class="lbl">Status</span>
              <span class="badge" [ngClass]="tenantProfile.status">{{ tenantProfile.status | titlecase }}</span>
            </div>
            <div class="info-row" *ngIf="tenantProfile.currentUnitId">
              <span class="lbl">Unit</span>
              <span>{{ tenantProfile.currentUnitId }}</span>
            </div>
            <div class="info-row" *ngIf="tenantProfile.moveInDate">
              <span class="lbl">Move-in Date</span>
              <span>{{ tenantProfile.moveInDate | date:'mediumDate' }}</span>
            </div>
            <div class="info-row" *ngIf="tenantProfile.createdAt">
              <span class="lbl">Tenant since</span>
              <span>{{ tenantProfile.createdAt | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{padding:24px;background:#0f172a;min-height:100vh;color:#e5e7eb}
    .header{margin-bottom:24px}
    h1{font-size:24px;font-weight:900;color:#f8fafc;margin:0 0 6px}
    h2{font-size:16px;font-weight:700;color:#f8fafc;margin:0 0 18px}
    .subtitle{color:rgba(226,232,240,.65);margin:0;font-size:14px}
    .loading-screen{display:grid;place-items:center;padding:60px;color:#94a3b8}
    .spinner{width:36px;height:36px;border:3px solid rgba(148,163,184,.3);border-top-color:#0ea5e9;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}
    .card{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:22px}
    .avatar-row{display:flex;align-items:center;gap:16px;margin-bottom:20px}
    .avatar{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:grid;place-items:center;font-size:20px;font-weight:900;color:#fff;flex-shrink:0}
    .full-name{font-size:16px;font-weight:700;color:#f8fafc}
    .role-tag{font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600;margin-top:3px}
    .info-list{display:flex;flex-direction:column;gap:0}
    .info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px;color:#e5e7eb}
    .info-row:last-child{border-bottom:none}
    .lbl{color:rgba(226,232,240,.5);font-weight:600;font-size:12px;min-width:120px}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
    .badge.active{background:rgba(34,197,94,.18);color:#4ade80}
    .badge.inactive,.badge.past{background:rgba(148,163,184,.15);color:#94a3b8}
  `]
})
export class TenantProfilePage implements OnInit, OnDestroy {
  private userSvc = inject(UserService);
  private dashSvc = inject(TenantDashboardService);

  loading = true;
  userProfile: AppUser | null = null;
  tenantProfile: Tenant | null = null;
  initials = '?';

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.userSvc.getCurrentUserProfile().pipe(
      takeUntil(this.destroy$),
      switchMap((user) => {
        this.userProfile = user ?? null;
        if (user?.fullName) {
          const name = user.fullName;
          const parts = name.split(' ');
          this.initials = parts.length > 1
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
        }
        return this.dashSvc.getTenantProfile();
      }),
    ).subscribe({
      next: (tenant: Tenant | null) => { this.tenantProfile = tenant; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
