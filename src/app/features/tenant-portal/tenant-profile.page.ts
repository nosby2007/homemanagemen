import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { UserService } from '../../core/services/user.service';
import { TenantDashboardService } from './tenant-dashboard.service';
import { Tenant, TenantsService } from '../tenants/tenants.service';
import { AppUser } from '../../core/models/domain.models';

@Component({
  selector: 'app-tenant-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <div class="card-head">
            <h2>Personal Information</h2>
            <button type="button" class="edit-btn" *ngIf="tenantProfile && !editing" (click)="startEdit()">Edit</button>
          </div>
          <div class="avatar-row">
            <div class="avatar">{{ initials }}</div>
            <div>
              <div class="full-name">{{ userProfile?.fullName || userProfile?.displayName || 'Tenant' }}</div>
              <div class="role-tag">Tenant</div>
            </div>
          </div>

          <div class="info-list" *ngIf="!editing">
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

          <form class="edit-form" *ngIf="editing" (ngSubmit)="save()">
            <label>Phone</label>
            <input type="text" name="phone" [(ngModel)]="editForm.phone" placeholder="Phone number" />

            <label>Emergency Contact</label>
            <input type="text" name="emergencyContact" [(ngModel)]="editForm.emergencyContact" placeholder="Name" />

            <label>Emergency Phone</label>
            <input type="text" name="emergencyPhone" [(ngModel)]="editForm.emergencyPhone" placeholder="Phone number" />

            <div class="save-error" *ngIf="saveError">{{ saveError }}</div>

            <div class="edit-actions">
              <button type="button" class="cancel-btn" (click)="cancelEdit()" [disabled]="saving">Cancel</button>
              <button type="submit" class="save-btn" [disabled]="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
            </div>
          </form>
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
    .card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:0}
    .card-head h2{margin:0}
    .edit-btn{border:1px solid rgba(148,163,184,.35);background:rgba(148,163,184,.12);color:#e2e8f0;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer}
    .edit-form{display:grid;gap:6px;margin-top:6px}
    .edit-form label{font-size:12px;font-weight:700;color:rgba(226,232,240,.65)}
    .edit-form input{border:1px solid rgba(148,163,184,.35);background:rgba(2,6,23,.45);color:#f8fafc;border-radius:8px;padding:9px 10px;margin-bottom:8px}
    .edit-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
    .save-error{color:#fca5a5;font-size:12px;margin-bottom:4px}
    .cancel-btn{border:1px solid rgba(148,163,184,.35);background:transparent;color:#e2e8f0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}
    .save-btn{border:none;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}
    .save-btn:disabled,.cancel-btn:disabled{opacity:.5;cursor:not-allowed}
    .avatar-row{display:flex;align-items:center;gap:16px;margin:16px 0 20px}
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
  private tenantsSvc = inject(TenantsService);

  loading = true;
  userProfile: AppUser | null = null;
  tenantProfile: Tenant | null = null;
  initials = '?';

  editing = false;
  saving = false;
  saveError = '';
  editForm = { phone: '', emergencyContact: '', emergencyPhone: '' };

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

  startEdit() {
    if (!this.tenantProfile) return;
    this.editForm = {
      phone: this.tenantProfile.phone || '',
      emergencyContact: this.tenantProfile.emergencyContact || '',
      emergencyPhone: this.tenantProfile.emergencyPhone || '',
    };
    this.saveError = '';
    this.editing = true;
  }

  cancelEdit() {
    this.editing = false;
    this.saveError = '';
  }

  async save() {
    if (!this.tenantProfile?.id) return;
    this.saving = true;
    this.saveError = '';
    try {
      const patch = {
        phone: this.editForm.phone.trim(),
        emergencyContact: this.editForm.emergencyContact.trim(),
        emergencyPhone: this.editForm.emergencyPhone.trim(),
      };
      await this.tenantsSvc.update(this.tenantProfile.id, patch);
      this.tenantProfile = { ...this.tenantProfile, ...patch };
      this.editing = false;
    } catch (err: any) {
      this.saveError = err?.message || 'Unable to save changes. Please try again.';
    } finally {
      this.saving = false;
    }
  }
}
