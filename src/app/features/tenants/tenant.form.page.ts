import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TenantsService } from './tenants.service';
import { PropertiesService } from '../properties/properties.service';
import { UnitsService } from '../units/units.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <header>
        <h1>{{ tenantId ? 'Edit Tenant' : 'Add Tenant' }}</h1>
        <p>Create and manage tenant contact and portal information.</p>
      </header>

      <article class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <input formControlName="displayName" placeholder="Full name" />
          <input formControlName="email" type="email" placeholder="Email" />
          <input formControlName="phone" placeholder="Phone" />
          <select formControlName="currentPropertyId" (change)="onPropertyChange()">
            <option value="">Select property</option>
            <option *ngFor="let p of properties" [value]="p.id">{{ p.name || p.id }}</option>
          </select>
          <small class="field-error" *ngIf="form.controls.currentPropertyId.touched && form.controls.currentPropertyId.invalid">
            Property is required.
          </small>

          <select formControlName="currentUnitId">
            <option value="">Select unit</option>
            <option *ngFor="let u of units" [value]="u.id">{{ u.unitNumber }} ({{ u.status }})</option>
          </select>
          <small class="field-error" *ngIf="form.controls.currentPropertyId.value && !units.length">
            This property has no units yet. Add one on the Units page first.
          </small>
          <small class="field-error" *ngIf="form.controls.currentUnitId.touched && form.controls.currentUnitId.invalid && units.length">
            Unit is required.
          </small>

          <select formControlName="status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="lead">Lead</option>
          </select>

          <div class="feedback err" *ngIf="submitAttempted && form.invalid">
            Please fill in all required fields above before saving.
          </div>

          <div class="actions">
            <button type="submit" [disabled]="saving">{{ saving ? 'Saving...' : (tenantId ? 'Save changes' : 'Create tenant') }}</button>
            <button type="button" class="ghost" (click)="cancel()">Cancel</button>
          </div>
        </form>
      </article>

      <div class="feedback ok" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    header h1 { margin:0; color:#f8fafc; }
    header p { margin:4px 0 0; color:#94a3b8; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:16px; background:rgba(15,23,42,.78); color:#e2e8f0; padding:14px; max-width:560px; }
    .form { display:grid; gap:8px; }
    input, select { width:100%; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:10px; }
    .field-error { color:#fca5a5; font-size:12px; margin-top:-4px; }
    .actions { display:flex; gap:8px; margin-top:8px; }
    button { border:none; border-radius:10px; padding:10px 12px; font-weight:700; cursor:pointer; background:linear-gradient(125deg,#0ea5e9,#0284c7); color:#fff; }
    .ghost { background:rgba(148,163,184,.2); color:#e2e8f0; }
    .feedback { border-radius:10px; padding:9px 10px; font-size:12px; max-width:560px; }
    .feedback.ok { background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.35); color:#bbf7d0; }
    .feedback.err { background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.35); color:#fecaca; }
  `],
})
export class TenantFormPage {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tenants = inject(TenantsService);
  private propertiesSvc = inject(PropertiesService);
  private unitsSvc = inject(UnitsService);

  tenantId = this.route.snapshot.paramMap.get('tenantId');
  saving = false;
  submitAttempted = false;
  successMessage = '';
  errorMessage = '';
  properties: any[] = [];
  units: any[] = [];

  form = this.fb.group({
    displayName: ['', [Validators.required]],
    email: ['', [Validators.email]],
    phone: [''],
    currentPropertyId: ['', [Validators.required]],
    currentUnitId: ['', [Validators.required]],
    status: ['active'],
  });

  constructor() {
    this.init();
  }

  private async init() {
    this.properties = await firstValueFrom(this.propertiesSvc.list());

    if (!this.tenantId) return;
    const tenant = await firstValueFrom(this.tenants.get(this.tenantId));
    const currentPropertyId = (tenant as any)?.currentPropertyId ?? '';
    if (currentPropertyId) {
      this.units = await firstValueFrom(this.unitsSvc.listByProperty(String(currentPropertyId)));
    }
    this.form.patchValue({
      displayName: (tenant as any)?.displayName ?? '',
      email: (tenant as any)?.email ?? '',
      phone: (tenant as any)?.phone ?? '',
      currentPropertyId,
      currentUnitId: (tenant as any)?.currentUnitId ?? '',
      status: (tenant as any)?.status ?? 'active',
    });
  }

  async onPropertyChange() {
    const propertyId = String(this.form.get('currentPropertyId')?.value || '').trim();
    this.form.patchValue({ currentUnitId: '' });
    if (!propertyId) {
      this.units = [];
      return;
    }
    this.units = await firstValueFrom(this.unitsSvc.listByProperty(propertyId));
  }

  async submit() {
    this.successMessage = '';
    this.errorMessage = '';
    this.submitAttempted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      const value = this.form.getRawValue();
      if (this.tenantId) {
        await this.tenants.update(this.tenantId, value as any);
        this.successMessage = 'Tenant updated successfully.';
      } else {
        await this.tenants.create(value as any);
        this.successMessage = 'Tenant created successfully.';
        this.form.reset({ status: 'active' });
      }
      await this.router.navigateByUrl('/tenants');
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Unable to save tenant.';
    } finally {
      this.saving = false;
    }
  }

  async cancel() {
    await this.router.navigateByUrl('/tenants');
  }
}
