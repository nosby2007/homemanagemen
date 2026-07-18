import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UnitsService } from './units.service';
import { UnitRecord, UnitStatus } from '../../core/models/domain.models';
import { PropertiesService } from '../properties/properties.service';
import { TenantsService } from '../tenants/tenants.service';
import { LeasesService } from '../leases/leases.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Unit Management</h1>
          <p>Track occupancy, rent details, and assigned tenants.</p>
        </div>
      </header>

      <div class="grid">
        <article class="card">
          <div class="card-title">Add or Update Unit</div>
          <form [formGroup]="form" (ngSubmit)="submit()" class="form">
            <select formControlName="propertyId" (change)="onPropertyChange()">
              <option value="">Select property</option>
              <option *ngFor="let property of properties" [value]="property.id">{{ property.name || property.id }}</option>
            </select>
            <input formControlName="unitNumber" placeholder="Unit Number" />
            <div class="row-3">
              <input type="number" formControlName="bedrooms" placeholder="Bedrooms" />
              <input type="number" formControlName="bathrooms" placeholder="Bathrooms" />
              <input type="number" formControlName="squareFeet" placeholder="Sq Ft" />
            </div>
            <input type="number" formControlName="monthlyRent" placeholder="Monthly Rent" />
            <select formControlName="status">
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
            <select formControlName="assignedTenantId">
              <option value="">No assigned tenant</option>
              <option *ngFor="let tenant of tenants" [value]="tenant.id">{{ tenant.displayName || tenant.fullName || tenant.id }}</option>
            </select>
            <select formControlName="leaseId">
              <option value="">No active lease</option>
              <option *ngFor="let lease of leases" [value]="lease.id">Lease {{ lease.id }} - {{ lease.status }}</option>
            </select>

            <button class="cta" type="submit">{{ editingId ? 'Update Unit' : 'Create Unit' }}</button>
            <button class="ghost" type="button" *ngIf="editingId" (click)="cancelEdit()">Cancel edit</button>
          </form>
        </article>

        <article class="card">
          <div class="toolbar">
            <input [(ngModel)]="search" [ngModelOptions]="{standalone: true}" placeholder="Search unit or property..." />
            <select [(ngModel)]="statusFilter" [ngModelOptions]="{standalone: true}">
              <option value="all">All statuses</option>
              <option value="occupied">Occupied</option>
              <option value="vacant">Vacant</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>

          <div class="table" *ngIf="units$ | async as units">
            <div class="thead">
              <div>Unit</div><div>Property</div><div>Status</div><div>Rent</div><div>Actions</div>
            </div>
            <div class="trow" *ngFor="let unit of filter(units)">
              <div>
                <div class="strong">{{ unit.unitNumber }}</div>
                <small>{{ unit.bedrooms }} bd / {{ unit.bathrooms }} ba / {{ unit.squareFeet }} sqft</small>
              </div>
              <div>{{ unit.propertyId }}</div>
              <div><span class="badge" [class]="unit.status">{{ unit.status }}</span></div>
              <div>{{ unit.monthlyRent | currency:'USD':'symbol':'1.0-0' }}</div>
              <div class="actions">
                <button (click)="startEdit(unit)">Edit</button>
                <button class="danger" (click)="remove(unit.id)">Delete</button>
              </div>
            </div>
            <div class="empty" *ngIf="!filter(units).length">No units found for current filters.</div>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .page { display: grid; gap: 14px; }
    .page-head h1 { margin: 0; color: #f8fafc; }
    .page-head p { margin: 4px 0 0; color: #94a3b8; }
    .grid { display: grid; gap: 14px; grid-template-columns: 360px 1fr; }
    .card { border: 1px solid rgba(148,163,184,.2); background: rgba(15,23,42,.78); border-radius: 16px; padding: 14px; color: #e2e8f0; }
    .card-title { font-weight: 800; margin-bottom: 10px; }
    .form { display: grid; gap: 8px; }
    input, select { width: 100%; border: 1px solid rgba(148,163,184,.35); background: rgba(2,6,23,.45); color: #f8fafc; border-radius: 10px; padding: 10px; }
    .row-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .cta, .ghost, .actions button { border: none; border-radius: 10px; padding: 10px; font-weight: 700; cursor: pointer; }
    .cta { background: linear-gradient(125deg, #0ea5e9, #0284c7); color: #fff; }
    .ghost { background: rgba(148,163,184,.2); color: #e2e8f0; }
    .toolbar { display: grid; grid-template-columns: 1fr 200px; gap: 8px; margin-bottom: 10px; }
    .table { border: 1px solid rgba(148,163,184,.22); border-radius: 12px; overflow: hidden; }
    .thead, .trow { display: grid; grid-template-columns: 1.4fr 1fr .7fr .8fr .8fr; gap: 10px; padding: 10px 12px; align-items: center; }
    .thead { background: rgba(148,163,184,.12); font-weight: 800; font-size: 12px; }
    .trow { border-top: 1px solid rgba(148,163,184,.18); }
    .strong { font-weight: 800; }
    .badge { padding: 5px 8px; border-radius: 999px; font-size: 11px; text-transform: uppercase; font-weight: 700; }
    .badge.occupied { background: rgba(16,185,129,.18); color: #a7f3d0; }
    .badge.vacant { background: rgba(59,130,246,.18); color: #bfdbfe; }
    .badge.maintenance { background: rgba(251,191,36,.18); color: #fde68a; }
    .badge.reserved { background: rgba(168,85,247,.18); color: #e9d5ff; }
    .actions { display: flex; gap: 6px; }
    .actions button { background: rgba(148,163,184,.2); color: #e2e8f0; padding: 8px 10px; }
    .actions .danger { background: rgba(239,68,68,.2); color: #fecaca; }
    .empty { padding: 14px; color: #94a3b8; }
    @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } .thead, .trow { grid-template-columns: 1fr; } }
  `],
})
export class UnitsPage {
  private svc = inject(UnitsService);
  private fb = inject(FormBuilder);
  private propertiesSvc = inject(PropertiesService);
  private tenantsSvc = inject(TenantsService);
  private leasesSvc = inject(LeasesService);

  units$ = this.svc.list();
  editingId: string | null = null;
  search = '';
  statusFilter: UnitStatus | 'all' = 'all';
  properties: any[] = [];
  tenants: any[] = [];
  leases: any[] = [];

  form = this.fb.group({
    propertyId: ['', [Validators.required]],
    unitNumber: ['', [Validators.required]],
    bedrooms: [1, [Validators.required]],
    bathrooms: [1, [Validators.required]],
    squareFeet: [600, [Validators.required]],
    monthlyRent: [1200, [Validators.required]],
    status: ['vacant' as UnitStatus, [Validators.required]],
    assignedTenantId: [''],
    leaseId: [''],
  });

  constructor() {
    this.bootstrap();
  }

  private async bootstrap() {
    this.properties = await firstValueFrom(this.propertiesSvc.list());
  }

  async onPropertyChange() {
    const propertyId = String(this.form.get('propertyId')?.value || '').trim();
    this.form.patchValue({ assignedTenantId: '', leaseId: '' });
    if (!propertyId) {
      this.tenants = [];
      this.leases = [];
      return;
    }

    this.tenants = await firstValueFrom(this.tenantsSvc.listByProperty(propertyId));
    this.leases = await firstValueFrom(this.leasesSvc.list(propertyId));
  }

  filter(units: UnitRecord[]): UnitRecord[] {
    const q = this.search.trim().toLowerCase();
    return units.filter((u) => {
      const statusOk = this.statusFilter === 'all' || u.status === this.statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      return `${u.unitNumber} ${u.propertyId}`.toLowerCase().includes(q);
    });
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      propertyId: value.propertyId ?? '',
      unitNumber: value.unitNumber ?? '',
      bedrooms: Number(value.bedrooms ?? 1),
      bathrooms: Number(value.bathrooms ?? 1),
      squareFeet: Number(value.squareFeet ?? 0),
      monthlyRent: Number(value.monthlyRent ?? 0),
      status: (value.status ?? 'vacant') as UnitStatus,
      assignedTenantId: value.assignedTenantId?.trim() || undefined,
      leaseId: value.leaseId?.trim() || undefined,
    };

    if (this.editingId) {
      await this.svc.update(this.editingId, payload);
      this.cancelEdit();
      return;
    }

    await this.svc.create(payload as any);
    this.form.reset({ bedrooms: 1, bathrooms: 1, squareFeet: 600, monthlyRent: 1200, status: 'vacant' });
  }

  startEdit(unit: UnitRecord) {
    this.editingId = unit.id;
    this.form.patchValue({
      propertyId: unit.propertyId,
      unitNumber: unit.unitNumber,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      squareFeet: unit.squareFeet,
      monthlyRent: unit.monthlyRent,
      status: unit.status,
      assignedTenantId: unit.assignedTenantId ?? '',
      leaseId: unit.leaseId ?? '',
    });
    void this.onPropertyChange();
  }

  cancelEdit() {
    this.editingId = null;
    this.form.reset({ bedrooms: 1, bathrooms: 1, squareFeet: 600, monthlyRent: 1200, status: 'vacant' });
    this.tenants = [];
    this.leases = [];
  }

  async remove(unitId: string) {
    if (!confirm('Delete this unit?')) return;
    await this.svc.remove(unitId);
  }
}
