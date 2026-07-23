import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { ClientsService } from './clients.service';
import { InvitationService } from '../../core/services/invitation.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { PropertiesService } from '../properties/properties.service';
import { UnitsService } from '../units/units.service';

@Component({
  standalone: true,
  selector: 'app-clients-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h2>Clients</h2>
          <p>Buyers, sellers, landlords, and tenant contacts managed by your team.</p>
        </div>
        <button class="btn primary" (click)="showForm = true">+ Add Client</button>
      </header>

      <section class="toolbar">
        <input [value]="query" (input)="onSearch($event)" placeholder="Search client by name, type, email, location" />
      </section>

      <section *ngIf="loading" class="state">Loading clients...</section>
      <section *ngIf="!loading && error" class="state error">{{ error }}</section>
      <section *ngIf="!loading && !error && filtered.length === 0" class="state">No clients found.</section>

      <table *ngIf="!loading && !error && filtered.length" class="table">
        <thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th>Assigned Agent</th><th>Auth</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let c of filtered">
            <td>{{ c.fullName }}</td>
            <td><span class="badge">{{ c.clientType }}</span></td>
            <td>{{ c.email || '-' }}</td>
            <td>{{ c.phone || '-' }}</td>
            <td>{{ c.assignedAgentId || '-' }}</td>
            <td><span class="auth-badge" [class.active]="c.authStatus === 'active'" [class.invited]="c.authStatus === 'invited'" [class.disabled]="c.authStatus === 'disabled'">{{ c.authStatus || 'not_invited' }}</span></td>
            <td class="table-actions">
              <button class="mini" *ngIf="(c.authStatus || 'not_invited') === 'not_invited'" (click)="sendInvitation(c)">Send</button>
              <button class="mini" *ngIf="c.authStatus === 'invited'" (click)="resendInvitation(c)">Resend</button>
              <button class="mini warn" *ngIf="c.authStatus === 'active'" (click)="disableAccess(c)">Disable</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="showForm" class="modal-overlay" (click)="showForm = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Add New Client</h3>
          <form [formGroup]="form" (ngSubmit)="submitForm()">
            <div class="form-group"><label>Name *</label><input formControlName="fullName" placeholder="Full name" required /></div>
            <div class="form-group"><label>Type *</label><select formControlName="clientType" required><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="landlord">Landlord</option><option value="tenant">Tenant</option></select></div>
            <div class="form-group"><label>Email</label><input formControlName="email" type="email" placeholder="Email" /></div>
            <div class="form-group"><label>Phone</label><input formControlName="phone" placeholder="Phone number" /></div>
            <div class="form-group"><label>Location</label><input formControlName="preferredLocation" placeholder="Preferred location" /></div>
            <div class="form-group"><label>Property *</label><select formControlName="propertyId" (change)="onPropertyChange()" required><option value="">Select a property</option><option *ngFor="let property of properties" [value]="property.id">{{ property.name || property.id }}</option></select></div>
            <div class="form-group"><label>Unit</label><select formControlName="unitId"><option value="">No unit</option><option *ngFor="let unit of units" [value]="unit.id">{{ unit.unitNumber }} ({{ unit.status }})</option></select></div>
            <div class="actions">
              <button type="button" class="btn" (click)="cancelForm()">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Adding...' : 'Add Client' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.toolbar input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.table th,.table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:left}.badge{padding:2px 10px;border-radius:999px;background:#ede9fe;color:#5b21b6}.auth-badge{padding:2px 10px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:12px;text-transform:uppercase}.auth-badge.invited{background:#fef3c7;color:#92400e}.auth-badge.active{background:#dcfce7;color:#166534}.auth-badge.disabled{background:#fee2e2;color:#991b1b}.table-actions{display:flex;gap:6px}.mini{border:1px solid #cbd5e1;border-radius:8px;padding:6px 8px;background:#fff;cursor:pointer}.mini.warn{border-color:#fecaca;color:#991b1b;background:#fff1f2}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{color:#b91c1c;border-color:#fecaca;background:#fff1f2}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}.modal{background:#fff;border-radius:12px;padding:24px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto}.modal h3{margin:0 0 16px;color:#0f172a}.form-group{margin-bottom:16px;display:flex;flex-direction:column}.form-group label{margin-bottom:6px;font-weight:500;color:#334155}.form-group input,.form-group select{padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px}.form-group input:focus,.form-group select:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}`],
})
export class ClientsPage implements OnInit, OnDestroy {
  private svc = inject(ClientsService);
  private invitations = inject(InvitationService);
  private org = inject(OrgContextService);
  private propertiesSvc = inject(PropertiesService);
  private unitsSvc = inject(UnitsService);
  private fb = inject(FormBuilder);
  private sub?: Subscription;

  loading = true;
  error = '';
  query = '';
  rows: any[] = [];
  showForm = false;
  submitting = false;
  properties: any[] = [];
  units: any[] = [];

  form = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.email]],
    phone: [''],
    clientType: ['buyer', [Validators.required]],
    preferredLocation: [''],
    propertyId: ['', [Validators.required]],
    unitId: [''],
  });

  get filtered() {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter((r) =>
      [r.fullName, r.clientType, r.email, r.phone, r.preferredLocation].some((v: any) => String(v || '').toLowerCase().includes(q))
    );
  }

  async ngOnInit() {
    this.properties = await firstValueFrom(this.propertiesSvc.list());
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => { this.rows = rows; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load clients.'; this.loading = false; },
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.query = target?.value ?? '';
  }

  async onPropertyChange() {
    const propertyId = String(this.form.get('propertyId')?.value || '').trim();
    this.form.patchValue({ unitId: '' });
    if (!propertyId) {
      this.units = [];
      return;
    }
    this.units = await firstValueFrom(this.unitsSvc.listByProperty(propertyId));
  }

  cancelForm() {
    this.showForm = false;
    this.form.reset({ clientType: 'buyer' });
    this.units = [];
  }

  async submitForm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    try {
      this.submitting = true;
      const value = this.form.getRawValue();
      const propertyId = String(value.propertyId || '').trim();
      await this.svc.create({
        fullName: String(value.fullName || '').trim(),
        email: String(value.email || '').trim() || undefined,
        phone: String(value.phone || '').trim() || undefined,
        clientType: value.clientType as any,
        preferredLocation: String(value.preferredLocation || '').trim() || undefined,
        propertyIds: [propertyId],
        defaultPropertyId: propertyId,
        propertyId,
        unitId: String(value.unitId || '').trim() || undefined,
        status: 'active',
      });
      this.cancelForm();
    } catch (err: any) {
      this.error = err?.message || 'Failed to add client';
    } finally {
      this.submitting = false;
    }
  }

  private clientRole(clientType: string): string {
    if (clientType === 'buyer') return 'buyer';
    if (clientType === 'seller') return 'seller';
    if (clientType === 'landlord') return 'landlord';
    if (clientType === 'tenant') return 'tenant';
    return 'client';
  }

  async sendInvitation(client: any) {
    if (!client?.id || !client?.email) return;
    try {
      const propertyId = String(client.propertyId || client.currentPropertyId || (Array.isArray(client.propertyIds) ? client.propertyIds[0] : '') || '').trim();
      if (!propertyId) throw new Error('Client must be assigned to a property before invitation.');

      const result = await this.invitations.createInvitation({
        orgId: this.org.requireOrgId(),
        propertyId,
        unitId: String(client.unitId || ''),
        email: String(client.email || ''),
        role: this.clientRole(String(client.clientType || 'client')),
        targetType: 'client',
        targetId: String(client.id),
      });
      client.authStatus = 'invited';
      client.invitationId = result.invitationId;
    } catch (err: any) {
      this.error = err?.message || 'Failed to send invitation.';
    }
  }

  async resendInvitation(client: any) {
    if (!client?.id) return;
    if (client.invitationId) {
      try {
        const result = await this.invitations.resendInvitation(String(client.invitationId));
        client.authStatus = 'invited';
        client.invitationId = result.invitationId;
      } catch (err: any) {
        this.error = err?.message || 'Failed to resend invitation.';
      }
      return;
    }
    await this.sendInvitation(client);
  }

  async disableAccess(client: any) {
    if (!client?.id) return;
    try {
      await this.svc.update(String(client.id), { authStatus: 'disabled' } as any);
    } catch (err: any) {
      this.error = err?.message || 'Failed to disable access.';
    }
  }
}
