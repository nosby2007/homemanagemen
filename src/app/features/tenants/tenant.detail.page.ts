import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { TenantsService } from './tenants.service';
import { InvitationService } from '../../core/services/invitation.service';
import { OrgContextService } from '../../core/org/org-context.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="tenant$ | async as tenant">
      <section class="page">
        <header class="head">
          <div>
            <h1>Tenant Profile</h1>
            <p>Detailed contact information and account status.</p>
          </div>
          <div class="actions">
            <button type="button" (click)="edit(tenant.id)">Edit</button>
            <button type="button" class="ghost" (click)="back()">Back</button>
          </div>
        </header>

        <article class="card">
          <div class="row"><span>Name</span><strong>{{ tenant.displayName || '-' }}</strong></div>
          <div class="row"><span>Email</span><strong>{{ tenant.email || '-' }}</strong></div>
          <div class="row"><span>Phone</span><strong>{{ tenant.phone || '-' }}</strong></div>
          <div class="row"><span>Status</span><strong>{{ tenant.status || 'active' }}</strong></div>
          <div class="row"><span>Organization</span><strong>{{ tenant.orgId || '-' }}</strong></div>
          <div class="row"><span>Property</span><strong>{{ tenant.propertyId || tenant.currentPropertyId || '-' }}</strong></div>
          <div class="row"><span>Unit</span><strong>{{ tenant.unitId || tenant.currentUnitId || '-' }}</strong></div>
          <div class="row"><span>Lease</span><strong>{{ tenant.leaseId || tenant.currentLeaseId || '-' }}</strong></div>
          <div class="row"><span>Linked User ID</span><strong>{{ tenant.userId || tenant.userUid || '-' }}</strong></div>
          <div class="row"><span>Auth Status</span><strong>{{ tenant.authStatus || 'not_invited' }}</strong></div>
          <div class="row"><span>Invitation ID</span><strong>{{ tenant.invitationId || '-' }}</strong></div>
          <div class="row actions-row">
            <span>Access Actions</span>
            <div class="inline-actions">
              <button type="button" *ngIf="(tenant.authStatus || 'not_invited') === 'not_invited'" (click)="sendInvitation(tenant)">Send Invitation</button>
              <button type="button" *ngIf="tenant.authStatus === 'invited'" (click)="resendInvitation(tenant)">Resend Invitation</button>
              <button type="button" class="warn" *ngIf="tenant.authStatus === 'active'" (click)="disableAccess(tenant)">Disable Access</button>
              <button type="button" *ngIf="tenant.userId || tenant.userUid" [disabled]="repairing" (click)="repairAssignment(tenant)">
                {{ repairing ? 'Repairing...' : 'Repair Property Assignment' }}
              </button>
            </div>
          </div>
          <div class="row" *ngIf="inviteError"><span>Invite error</span><strong class="error-text">{{ inviteError }}</strong></div>
          <div class="row" *ngIf="repairError"><span>Repair error</span><strong class="error-text">{{ repairError }}</strong></div>
          <div class="row" *ngIf="repairSuccess"><span>Repair result</span><strong class="ok-text">{{ repairSuccess }}</strong></div>
          <div class="row"><span>Created</span><strong>{{ tenant.createdAt | date:'medium' }}</strong></div>
          <div class="row"><span>Updated</span><strong>{{ tenant.updatedAt | date:'medium' }}</strong></div>
        </article>
      </section>
    </ng-container>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
    .head h1 { margin:0; color:#f8fafc; }
    .head p { margin:4px 0 0; color:#94a3b8; }
    .actions { display:flex; gap:8px; }
    button { border:none; border-radius:10px; padding:10px 12px; font-weight:700; cursor:pointer; background:linear-gradient(125deg,#0ea5e9,#0284c7); color:#fff; }
    .ghost { background:rgba(148,163,184,.2); color:#e2e8f0; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:16px; background:rgba(15,23,42,.78); color:#e2e8f0; padding:14px; max-width:720px; }
    .row { display:flex; justify-content:space-between; gap:10px; border-top:1px solid rgba(148,163,184,.15); padding:12px 0; }
    .row:first-child { border-top:none; }
    .row span { color:#94a3b8; }
    .row strong { color:#f8fafc; }
    .actions-row { align-items: center; }
    .inline-actions { display:flex; gap:8px; }
    .inline-actions button.warn { background: rgba(239, 68, 68, .2); color: #fecaca; }
    .error-text { color: #fecaca; }
    .ok-text { color: #bbf7d0; }
  `],
})
export class TenantDetailPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tenants = inject(TenantsService);
  private invitations = inject(InvitationService);
  private org = inject(OrgContextService);

  tenant$ = this.route.paramMap.pipe(
    switchMap((params) => this.tenants.get(params.get('tenantId') || ''))
  );

  inviteError = '';
  repairing = false;
  repairError = '';
  repairSuccess = '';

  async edit(tenantId: string) {
    await this.router.navigateByUrl(`/tenants/${tenantId}/edit`);
  }

  async back() {
    await this.router.navigateByUrl('/tenants');
  }

  async sendInvitation(tenant: any) {
    if (!tenant?.id || !tenant?.email) return;
    this.inviteError = '';
    const propertyId = String(tenant.propertyId || tenant.currentPropertyId || '').trim();
    if (!propertyId) {
      this.inviteError = 'Tenant invitation requires a property.';
      return;
    }
    try {
      const result = await this.invitations.createInvitation({
        orgId: this.org.requireOrgId(),
        propertyId,
        unitId: String(tenant.unitId || tenant.currentUnitId || ''),
        email: String(tenant.email || ''),
        role: 'tenant',
        targetType: 'tenant',
        targetId: String(tenant.id),
      });
      tenant.authStatus = 'invited';
      tenant.invitationId = result.invitationId;
    } catch (err: any) {
      this.inviteError = err?.message || 'Failed to send invitation.';
    }
  }

  async resendInvitation(tenant: any) {
    if (!tenant?.id) return;
    this.inviteError = '';
    if (tenant.invitationId) {
      try {
        const result = await this.invitations.resendInvitation(String(tenant.invitationId));
        tenant.authStatus = 'invited';
        tenant.invitationId = result.invitationId;
      } catch (err: any) {
        this.inviteError = err?.message || 'Failed to resend invitation.';
      }
      return;
    }
    await this.sendInvitation(tenant);
  }

  async disableAccess(tenant: any) {
    if (!tenant?.id) return;
    await this.tenants.update(String(tenant.id), { authStatus: 'disabled' } as any);
  }

  async repairAssignment(tenant: any) {
    if (!tenant?.id) return;
    this.repairError = '';
    this.repairSuccess = '';
    this.repairing = true;
    try {
      const result = await this.invitations.repairTenantAssignment(this.org.requireOrgId(), String(tenant.id));
      this.repairSuccess = `Assignment fixed: property ${result.propertyId}, unit ${result.unitId}.`;
      tenant.authStatus = 'active';
    } catch (err: any) {
      this.repairError = err?.message || 'Failed to repair assignment.';
    } finally {
      this.repairing = false;
    }
  }
}
