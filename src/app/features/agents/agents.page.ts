import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AgentsService } from './agents.service';
import { InvitationService } from '../../core/services/invitation.service';
import { OrgContextService } from '../../core/org/org-context.service';

@Component({
  standalone: true,
  selector: 'app-agents-page',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h2>Agents</h2>
          <p>Roster of agents, brokers, and assigned team members.</p>
        </div>
        <button class="btn primary" (click)="showForm = true">+ Add Agent</button>
      </header>

      <section class="toolbar">
        <input [(ngModel)]="query" placeholder="Search agent by name, email, phone, license" />
      </section>

      <section *ngIf="loading" class="state">Loading agents...</section>
      <section *ngIf="!loading && error" class="state error">{{ error }}</section>
      <section *ngIf="!loading && !error && filtered.length === 0" class="state">No agents found.</section>

      <table *ngIf="!loading && !error && filtered.length" class="table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>License</th><th>Status</th><th>Auth</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let a of filtered">
            <td>{{ a.displayName }}</td>
            <td>{{ a.email || '-' }}</td>
            <td>{{ a.phone || '-' }}</td>
            <td>{{ a.licenseNumber || '-' }}</td>
            <td><span class="badge">{{ a.status }}</span></td>
            <td><span class="auth-badge" [class.active]="a.authStatus === 'active'" [class.invited]="a.authStatus === 'invited'" [class.disabled]="a.authStatus === 'disabled'">{{ a.authStatus || 'not_invited' }}</span></td>
            <td class="table-actions">
              <button class="mini" *ngIf="(a.authStatus || 'not_invited') === 'not_invited'" (click)="sendInvitation(a)">Send</button>
              <button class="mini" *ngIf="a.authStatus === 'invited'" (click)="resendInvitation(a)">Resend</button>
              <button class="mini warn" *ngIf="a.authStatus === 'active'" (click)="disableAccess(a)">Disable</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="showForm" class="modal-overlay" (click)="showForm = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Add New Agent</h3>
          <form (ngSubmit)="submitForm()">
            <div class="form-group"><label>Name *</label><input [(ngModel)]="formData.displayName" name="displayName" placeholder="Full name" required /></div>
            <div class="form-group"><label>Email *</label><input [(ngModel)]="formData.email" name="email" type="email" placeholder="Email" required /></div>
            <div class="form-group"><label>Phone</label><input [(ngModel)]="formData.phone" name="phone" placeholder="Phone number" /></div>
            <div class="form-group"><label>License Number *</label><input [(ngModel)]="formData.licenseNumber" name="license" placeholder="License number" required /></div>
            <div class="form-group"><label>Role</label><select [(ngModel)]="formData.role" name="role"><option value="agent">Agent</option><option value="broker">Broker</option><option value="team_lead">Team Lead</option></select></div>
            <div class="form-group"><label>Property IDs (comma separated) *</label><input [(ngModel)]="formData.propertyIdsText" name="propertyIdsText" placeholder="propA, propB" required /></div>
            <div class="actions">
              <button type="button" class="btn" (click)="showForm = false">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Adding...' : 'Add Agent' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.toolbar input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.table th,.table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:left}.badge{padding:2px 10px;border-radius:999px;background:#dcfce7;color:#166534}.auth-badge{padding:2px 10px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:12px;text-transform:uppercase}.auth-badge.invited{background:#fef3c7;color:#92400e}.auth-badge.active{background:#dcfce7;color:#166534}.auth-badge.disabled{background:#fee2e2;color:#991b1b}.table-actions{display:flex;gap:6px}.mini{border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#fff;cursor:pointer}.mini.warn{border-color:#fecaca;color:#991b1b;background:#fff1f2}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{color:#b91c1c;border-color:#fecaca;background:#fff1f2}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}.modal{background:#fff;border-radius:12px;padding:24px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto}.modal h3{margin:0 0 16px;color:#0f172a}.form-group{margin-bottom:16px;display:flex;flex-direction:column}.form-group label{margin-bottom:6px;font-weight:500;color:#334155}.form-group input,.form-group select{padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px}.form-group input:focus,.form-group select:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}`],
})
export class AgentsPage implements OnInit, OnDestroy {
  private svc = inject(AgentsService);
  private invitations = inject(InvitationService);
  private org = inject(OrgContextService);
  private sub?: Subscription;

  loading = true;
  error = '';
  query = '';
  rows: any[] = [];
  showForm = false;
  submitting = false;
  formData: any = {};

  private resetForm() {
    return { displayName: '', email: '', phone: '', licenseNumber: '', role: 'agent', status: 'active', propertyIdsText: '' };
  }

  get filtered() {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter((r) =>
      [r.displayName, r.email, r.phone, r.licenseNumber].some((v: any) => String(v || '').toLowerCase().includes(q))
    );
  }

  ngOnInit() {
    this.formData = this.resetForm();
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => { this.rows = rows; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load agents.'; this.loading = false; },
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  async submitForm() {
    if (!this.formData.displayName || !this.formData.email || !this.formData.licenseNumber) return;
    try {
      this.submitting = true;
      const propertyIds = String(this.formData.propertyIdsText || '')
        .split(',')
        .map((x: string) => x.trim())
        .filter((x: string) => !!x);
      await this.svc.create({
        ...this.formData,
        propertyIds,
        defaultPropertyId: propertyIds[0] || undefined,
      } as any);
      this.showForm = false;
      this.formData = this.resetForm();
    } catch (err: any) {
      this.error = err?.message || 'Failed to add agent';
    } finally {
      this.submitting = false;
    }
  }

  async sendInvitation(agent: any) {
    if (!agent?.id || !agent?.email) return;
    try {
      const propertyId = String(agent.propertyId || (Array.isArray(agent.propertyIds) ? agent.propertyIds[0] : '') || '').trim();
      if (!propertyId) throw new Error('Agent must be assigned to a property before invitation.');

      const result = await this.invitations.createInvitation({
        orgId: this.org.requireOrgId(),
        propertyId,
        unitId: String(agent.unitId || ''),
        email: String(agent.email || ''),
        role: 'agent',
        targetType: 'agent',
        targetId: String(agent.id),
      });
      agent.authStatus = 'invited';
      agent.invitationId = result.invitationId;
    } catch (err: any) {
      this.error = err?.message || 'Failed to send invitation.';
    }
  }

  async resendInvitation(agent: any) {
    if (!agent?.id) return;
    if (agent.invitationId) {
      try {
        const result = await this.invitations.resendInvitation(String(agent.invitationId));
        agent.authStatus = 'invited';
        agent.invitationId = result.invitationId;
      } catch (err: any) {
        this.error = err?.message || 'Failed to resend invitation.';
      }
      return;
    }
    await this.sendInvitation(agent);
  }

  async disableAccess(agent: any) {
    if (!agent?.id) return;
    try {
      await this.svc.update(String(agent.id), { authStatus: 'disabled' } as any);
    } catch (err: any) {
      this.error = err?.message || 'Failed to disable access.';
    }
  }
}
