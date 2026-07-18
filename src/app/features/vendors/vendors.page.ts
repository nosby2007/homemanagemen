import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { VendorsService } from './vendors.service';
import { InvitationService } from '../../core/services/invitation.service';
import { OrgContextService } from '../../core/org/org-context.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>Vendors</h1>
          <p>Service providers assigned to your organization.</p>
        </div>
        <button class="btn primary" (click)="showForm = true">+ Add Vendor</button>
      </header>

      <div class="state" *ngIf="loading">Loading vendors...</div>
      <div class="state error" *ngIf="!loading && error">{{ error }}</div>

      <div class="table" *ngIf="!loading && !error && rows.length">
        <div class="thead"><div>Company</div><div>Contact</div><div>Email</div><div>Service</div><div>Auth</div><div>Actions</div></div>
        <div class="row" *ngFor="let v of rows">
          <div>{{ v.companyName }}</div>
          <div>{{ v.contactName || '-' }}</div>
          <div>{{ v.email || '-' }}</div>
          <div>{{ v.serviceType || '-' }}</div>
          <div><span class="auth-badge" [class.active]="v.authStatus === 'active'" [class.invited]="v.authStatus === 'invited'" [class.disabled]="v.authStatus === 'disabled'">{{ v.authStatus || 'not_invited' }}</span></div>
          <div class="actions">
            <button *ngIf="(v.authStatus || 'not_invited') === 'not_invited'" (click)="sendInvitation(v)">Send</button>
            <button *ngIf="v.authStatus === 'invited'" (click)="resendInvitation(v)">Resend</button>
            <button class="warn" *ngIf="v.authStatus === 'active'" (click)="disableAccess(v)">Disable</button>
          </div>
        </div>
      </div>
      <div class="state" *ngIf="!loading && !error && !rows.length">No vendors found.</div>

      <div *ngIf="showForm" class="overlay" (click)="showForm = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Add Vendor</h3>
          <form (ngSubmit)="create()" class="form">
            <input [(ngModel)]="formData.companyName" name="companyName" placeholder="Company name" required />
            <input [(ngModel)]="formData.contactName" name="contactName" placeholder="Contact name" />
            <input [(ngModel)]="formData.email" name="email" type="email" placeholder="Email" />
            <input [(ngModel)]="formData.phone" name="phone" placeholder="Phone" />
            <input [(ngModel)]="formData.serviceType" name="serviceType" placeholder="Service type" />
            <input [(ngModel)]="formData.propertyIdsText" name="propertyIdsText" placeholder="Property IDs (comma separated)" required />
            <div class="actions">
              <button type="button" (click)="showForm = false">Cancel</button>
              <button type="submit" class="primary">Create</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
    h1 { margin:0; color:#f8fafc; }
    p { margin:4px 0 0; color:#94a3b8; }
    .btn { border:1px solid rgba(148,163,184,.32); border-radius:10px; padding:10px 12px; background:rgba(2,6,23,.45); color:#e2e8f0; cursor:pointer; }
    .btn.primary { background:linear-gradient(125deg,#0ea5e9,#0284c7); border-color:#0284c7; color:#fff; }
    .table { border:1px solid rgba(148,163,184,.2); border-radius:12px; overflow:hidden; background: rgba(15,23,42,.78); color:#e2e8f0; }
    .thead,.row { display:grid; grid-template-columns:1fr .8fr 1fr .8fr .8fr 1fr; gap:8px; align-items:center; padding:10px; }
    .thead { background:rgba(148,163,184,.12); font-size:12px; font-weight:800; }
    .row { border-top:1px solid rgba(148,163,184,.16); }
    .auth-badge{padding:2px 10px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:12px;text-transform:uppercase}
    .auth-badge.invited{background:#fef3c7;color:#92400e}
    .auth-badge.active{background:#dcfce7;color:#166534}
    .auth-badge.disabled{background:#fee2e2;color:#991b1b}
    .actions { display:flex; gap:6px; }
    .actions button { border:1px solid rgba(148,163,184,.3); border-radius:8px; padding:6px 8px; background:rgba(2,6,23,.45); color:#e2e8f0; cursor:pointer; }
    .actions button.warn { border-color:rgba(239,68,68,.4); color:#fecaca; }
    .state { border:1px dashed rgba(148,163,184,.35); border-radius:10px; color:#94a3b8; padding:14px; }
    .state.error { border-color: rgba(239,68,68,.4); color:#fecaca; }
    .overlay { position:fixed; inset:0; background:rgba(2,6,23,.55); display:grid; place-items:center; z-index:1000; }
    .modal { width:min(460px,95vw); border-radius:12px; background:#fff; color:#0f172a; padding:20px; }
    .form { display:grid; gap:8px; }
    .form input { border:1px solid #cbd5e1; border-radius:8px; padding:10px; }
    .form .actions { justify-content:flex-end; }
    .form .actions button { border:1px solid #cbd5e1; background:#fff; color:#1f2937; }
    .form .actions .primary { background:#0ea5e9; border-color:#0284c7; color:#fff; }
    @media (max-width: 1100px) { .thead,.row { grid-template-columns:1fr; } }
  `],
})
export class VendorsPage implements OnInit, OnDestroy {
  private svc = inject(VendorsService);
  private invitations = inject(InvitationService);
  private org = inject(OrgContextService);
  private sub?: Subscription;

  rows: any[] = [];
  loading = true;
  error = '';
  showForm = false;
  formData: any = { companyName: '', contactName: '', email: '', phone: '', serviceType: '', propertyIdsText: '' };

  ngOnInit() {
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => { this.rows = rows || []; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load vendors.'; this.loading = false; },
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async create() {
    if (!this.formData.companyName) return;
    const propertyIds = String(this.formData.propertyIdsText || '')
      .split(',')
      .map((x: string) => x.trim())
      .filter((x: string) => !!x);
    await this.svc.create({
      ...this.formData,
      propertyIds,
      defaultPropertyId: propertyIds[0] || undefined,
    });
    this.formData = { companyName: '', contactName: '', email: '', phone: '', serviceType: '', propertyIdsText: '' };
    this.showForm = false;
  }

  async sendInvitation(vendor: any) {
    if (!vendor?.id || !vendor?.email) return;
    try {
      const propertyId = String(vendor.propertyId || (Array.isArray(vendor.propertyIds) ? vendor.propertyIds[0] : '') || '').trim();
      if (!propertyId) throw new Error('Vendor must be assigned to a property before invitation.');

      const result = await this.invitations.createInvitation({
        orgId: this.org.requireOrgId(),
        propertyId,
        unitId: String(vendor.unitId || ''),
        email: String(vendor.email || ''),
        role: 'vendor',
        targetType: 'vendor',
        targetId: String(vendor.id),
      });
      vendor.authStatus = 'invited';
      vendor.invitationId = result.invitationId;
    } catch (err: any) {
      this.error = err?.message || 'Failed to send invitation.';
    }
  }

  async resendInvitation(vendor: any) {
    if (!vendor?.id) return;
    if (vendor.invitationId) {
      try {
        const result = await this.invitations.resendInvitation(String(vendor.invitationId));
        vendor.authStatus = 'invited';
        vendor.invitationId = result.invitationId;
      } catch (err: any) {
        this.error = err?.message || 'Failed to resend invitation.';
      }
      return;
    }
    await this.sendInvitation(vendor);
  }

  async disableAccess(vendor: any) {
    if (!vendor?.id) return;
    await this.svc.update(String(vendor.id), { authStatus: 'disabled' } as any);
  }
}
