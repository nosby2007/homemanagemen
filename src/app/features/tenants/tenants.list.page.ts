import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TenantsService, Tenant } from './tenants.service';
import { InvitationService } from '../../core/services/invitation.service';
import { OrgContextService } from '../../core/org/org-context.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>Tenants</h1>
          <p>Manage tenant profiles, lease links, and communication details.</p>
        </div>
        <button type="button" class="cta" (click)="create()">+ Add tenant</button>
      </header>

      <article class="card">
        <div class="toolbar">
          <input [(ngModel)]="query" [ngModelOptions]="{standalone: true}" placeholder="Search by name, email, or phone..." />
          <select [(ngModel)]="statusFilter" [ngModelOptions]="{standalone: true}">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="lead">Lead</option>
          </select>
        </div>

        <div class="table" *ngIf="tenants$ | async as tenants">
          <div class="thead">
            <div>Name</div><div>Email</div><div>Phone</div><div>Status</div><div>Auth</div><div>Actions</div>
          </div>

          <div class="row" *ngFor="let tenant of filter(tenants)">
            <div class="strong">{{ tenant.displayName || '-' }}</div>
            <div>{{ tenant.email || '-' }}</div>
            <div>{{ tenant.phone || '-' }}</div>
            <div><span class="badge">{{ tenant.status || 'active' }}</span></div>
            <div><span class="auth-badge" [class.active]="tenant.authStatus === 'active'" [class.invited]="tenant.authStatus === 'invited'" [class.disabled]="tenant.authStatus === 'disabled'">{{ tenant.authStatus || 'not_invited' }}</span></div>
            <div class="actions">
              <button type="button" (click)="open(tenant.id)">View</button>
              <button type="button" (click)="edit(tenant.id)">Edit</button>
              <button type="button" *ngIf="(tenant.authStatus || 'not_invited') === 'not_invited'" (click)="sendInvitation(tenant)">Send Invitation</button>
              <button type="button" *ngIf="tenant.authStatus === 'invited'" (click)="resendInvitation(tenant)">Resend Invitation</button>
              <button type="button" class="warn" *ngIf="tenant.authStatus === 'active'" (click)="disableAccess(tenant)">Disable Access</button>
            </div>
          </div>

          <div class="empty" *ngIf="!filter(tenants).length">No tenants found.</div>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
    .head h1 { margin:0; color:#f8fafc; }
    .head p { margin:4px 0 0; color:#94a3b8; }
    .cta { border:none; border-radius:10px; padding:10px 12px; font-weight:700; cursor:pointer; background:linear-gradient(125deg,#0ea5e9,#0284c7); color:#fff; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:16px; background:rgba(15,23,42,.78); color:#e2e8f0; padding:14px; }
    .toolbar { display:grid; grid-template-columns:1fr 180px; gap:8px; margin-bottom:10px; }
    input, select { width:100%; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:10px; }
    .table { border:1px solid rgba(148,163,184,.2); border-radius:12px; overflow:hidden; }
    .thead, .row { display:grid; grid-template-columns:1fr 1fr .8fr .6fr .7fr 1.3fr; gap:10px; align-items:center; padding:10px 12px; }
    .thead { background:rgba(148,163,184,.12); font-size:12px; font-weight:800; }
    .row { border-top:1px solid rgba(148,163,184,.15); }
    .strong { font-weight:800; }
    .badge { border-radius:999px; padding:5px 8px; background:rgba(59,130,246,.18); color:#bfdbfe; font-size:11px; text-transform:uppercase; font-weight:700; }
    .actions { display:flex; gap:6px; }
    .actions button { border:none; border-radius:10px; padding:8px 10px; font-weight:700; cursor:pointer; background:rgba(148,163,184,.2); color:#e2e8f0; }
    .actions button.warn { background: rgba(239, 68, 68, .2); color: #fecaca; }
    .auth-badge { border-radius:999px; padding:5px 8px; background:rgba(148,163,184,.2); color:#cbd5e1; font-size:11px; text-transform:uppercase; font-weight:700; }
    .auth-badge.invited { background:rgba(245,158,11,.2); color:#fde68a; }
    .auth-badge.active { background:rgba(16,185,129,.2); color:#bbf7d0; }
    .auth-badge.disabled { background:rgba(239,68,68,.2); color:#fecaca; }
    .empty { padding:14px; color:#94a3b8; }
    @media (max-width: 1100px) { .toolbar { grid-template-columns:1fr; } .thead, .row { grid-template-columns:1fr; } }
  `],
})
export class TenantsListPage {
  private svc = inject(TenantsService);
  private router = inject(Router);
  private invitations = inject(InvitationService);
  private org = inject(OrgContextService);

  tenants$: Observable<Tenant[]> = this.svc.list().pipe(map((items: any) => items as Tenant[]));
  query = '';
  statusFilter: 'all' | 'active' | 'inactive' | 'lead' = 'all';

  filter(items: Tenant[]): Tenant[] {
    const q = this.query.trim().toLowerCase();
    return items.filter((t) => {
      if (this.statusFilter !== 'all' && (t.status ?? 'active') !== this.statusFilter) return false;
      if (!q) return true;
      return `${t.displayName || ''} ${t.email || ''} ${t.phone || ''}`.toLowerCase().includes(q);
    });
  }

  async create() {
    await this.router.navigateByUrl('/tenants/new');
  }

  async open(tenantId: string) {
    await this.router.navigateByUrl(`/tenants/${tenantId}`);
  }

  async edit(tenantId: string) {
    await this.router.navigateByUrl(`/tenants/${tenantId}/edit`);
  }

  async sendInvitation(tenant: Tenant) {
    if (!tenant.id || !tenant.email) return;
    try {
      const propertyId = String((tenant as any).propertyId || (tenant as any).currentPropertyId || '').trim();
      if (!propertyId) throw new Error('Tenant must be linked to a property before invitation.');

      const result = await this.invitations.createInvitation({
        orgId: this.org.requireOrgId(),
        propertyId,
        unitId: String((tenant as any).unitId || (tenant as any).currentUnitId || ''),
        email: String(tenant.email || ''),
        role: 'tenant',
        targetType: 'tenant',
        targetId: tenant.id,
      });
      (tenant as any).authStatus = 'invited';
      (tenant as any).invitationId = result.invitationId;
    } catch (err) {
      console.error('Failed to send tenant invitation', err);
    }
  }

  async resendInvitation(tenant: Tenant) {
    if (!tenant.id) return;
    if (tenant.invitationId) {
      try {
        const result = await this.invitations.resendInvitation(tenant.invitationId);
        (tenant as any).authStatus = 'invited';
        (tenant as any).invitationId = result.invitationId;
      } catch (err) {
        console.error('Failed to resend tenant invitation', err);
      }
      return;
    }
    await this.sendInvitation(tenant);
  }

  async disableAccess(tenant: Tenant) {
    if (!tenant.id) return;
    await this.svc.update(tenant.id, { authStatus: 'disabled' } as any);
  }
}
