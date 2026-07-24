import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DocumentsService } from './documents.service';
import { DocumentCategory, DocumentRecord } from '../../core/models/domain.models';
import { PropertiesService } from '../properties/properties.service';
import { UnitsService } from '../units/units.service';
import { TenantsService } from '../tenants/tenants.service';
import { LeasesService } from '../leases/leases.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>Documents</h1>
          <p>Upload and organize documents by tenant, property, unit, and lease.</p>
        </div>
      </header>

      <div class="grid">
        <article class="card">
          <div class="card-title">Upload document</div>
          <form [formGroup]="form" (ngSubmit)="submit()" class="form">
            <input formControlName="title" placeholder="Document title" />
            <select formControlName="category">
              <option value="lease">Lease</option>
              <option value="id">ID</option>
              <option value="inspection">Inspection</option>
              <option value="invoice">Invoice</option>
              <option value="property_document">Property document</option>
              <option value="other">Other</option>
            </select>
            <select formControlName="visibility">
              <option value="private">Private</option>
              <option value="tenant">Tenant</option>
              <option value="landlord">Landlord</option>
              <option value="property_team">Property team</option>
              <option value="org">Org</option>
            </select>
            <select formControlName="propertyId" (change)="onPropertyChange()">
              <option value="">Select property *</option>
              <option *ngFor="let p of properties" [value]="p.id">{{ p.name || p.id }}</option>
            </select>
            <select formControlName="unitId">
              <option value="">Unit (optional)</option>
              <option *ngFor="let u of units" [value]="u.id">{{ u.unitNumber || u.id }}</option>
            </select>
            <select formControlName="tenantId">
              <option value="">Tenant (optional)</option>
              <option *ngFor="let t of tenants" [value]="t.id">{{ t.displayName || t.email || t.id }}</option>
            </select>
            <select formControlName="leaseId">
              <option value="">Lease (optional)</option>
              <option *ngFor="let l of leases" [value]="l.id">{{ l.id | slice:0:8 }} - {{ l.status }}</option>
            </select>
            <input type="file" (change)="onFileChange($event)" />

            <button class="cta" type="submit" [disabled]="uploading || !selectedFile">
              {{ uploading ? 'Uploading...' : 'Upload document' }}
            </button>

            <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
            <div class="feedback ok" *ngIf="successMessage">{{ successMessage }}</div>
          </form>
        </article>

        <article class="card">
          <div class="toolbar">
            <input [(ngModel)]="search" [ngModelOptions]="{standalone: true}" placeholder="Search title or file name..." />
            <select [(ngModel)]="categoryFilter" [ngModelOptions]="{standalone: true}">
              <option value="all">All categories</option>
              <option value="lease">Lease</option>
              <option value="id">ID</option>
              <option value="inspection">Inspection</option>
              <option value="invoice">Invoice</option>
              <option value="property_document">Property document</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="feedback err" *ngIf="rowError">{{ rowError }}</div>

          <div class="table" *ngIf="docs$ | async as docs">
            <div class="thead">
              <div>Title</div><div>Category</div><div>Linked to</div><div>Created</div><div>Action</div>
            </div>
            <div class="row" *ngFor="let d of filter(docs)">
              <div>
                <div class="strong">{{ d.title }}</div>
                <small>{{ d.fileName }}</small>
              </div>
              <div><span class="badge">{{ d.category }}</span></div>
              <div>
                <small>Property: {{ propertyName(d.propertyId) }}</small><br />
                <small>Tenant: {{ tenantName(d.tenantId) }}</small><br />
                <small>Visibility: {{ d.visibility || 'property_team' }}</small>
              </div>
              <div>{{ d.createdAt | date:'short' }}</div>
              <div class="actions-cell">
                <a *ngIf="d.downloadUrl" [href]="d.downloadUrl" target="_blank" rel="noopener">Open</a>
                <button class="btn sm danger" type="button" (click)="deleteDocument(d)" [disabled]="busyId === d.id">Delete</button>
              </div>
            </div>
            <div class="empty" *ngIf="!filter(docs).length">No documents found.</div>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    .head h1 { margin:0; color:#f8fafc; }
    .head p { margin:4px 0 0; color:#94a3b8; }
    .grid { display:grid; grid-template-columns: 360px 1fr; gap:14px; }
    .card { border:1px solid rgba(148,163,184,.2); background:rgba(15,23,42,.78); border-radius:16px; padding:14px; color:#e2e8f0; }
    .card-title { font-weight:800; margin-bottom:10px; }
    .form { display:grid; gap:8px; }
    input, select { width:100%; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:10px; }
    .cta { border:none; border-radius:10px; padding:10px; font-weight:700; cursor:pointer; background:linear-gradient(125deg,#22c55e,#16a34a); color:#fff; }
    .cta:disabled { opacity:.65; cursor:not-allowed; }
    .feedback { margin-top:8px; border-radius:10px; padding:9px 10px; font-size:12px; }
    .feedback.ok { background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.35); color:#bbf7d0; }
    .feedback.err { background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.35); color:#fecaca; }
    .toolbar { display:grid; grid-template-columns:1fr 180px; gap:8px; margin-bottom:10px; }
    .table { border:1px solid rgba(148,163,184,.2); border-radius:12px; overflow:hidden; }
    .thead, .row { display:grid; grid-template-columns:1.4fr .8fr 1fr .8fr .9fr; gap:10px; padding:10px 12px; align-items:center; }
    .thead { background:rgba(148,163,184,.12); font-size:12px; font-weight:800; }
    .row { border-top:1px solid rgba(148,163,184,.15); }
    .strong { font-weight:800; }
    .badge { display:inline-block; border-radius:999px; padding:5px 8px; background:rgba(59,130,246,.18); color:#bfdbfe; font-size:11px; text-transform:uppercase; }
    .empty { padding:14px; color:#94a3b8; }
    a { color:#7dd3fc; font-weight:700; text-decoration:none; }
    .actions-cell { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .btn.sm { padding:6px 10px; font-size:12px; border-radius:8px; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; cursor:pointer; }
    .btn.sm.danger { color:#fecaca; border-color:rgba(239,68,68,.4); }
    .btn.sm:disabled { opacity:.5; cursor:not-allowed; }
    @media (max-width: 1100px) { .grid { grid-template-columns:1fr; } .thead, .row { grid-template-columns:1fr; } }
  `],
})
export class DocumentsPage {
  private svc = inject(DocumentsService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private propertiesSvc = inject(PropertiesService);
  private unitsSvc = inject(UnitsService);
  private tenantsSvc = inject(TenantsService);
  private leasesSvc = inject(LeasesService);

  docs$ = this.route.queryParamMap.pipe(
    switchMap((params) => {
      const propertyId = String(params.get('propertyId') || '').trim();
      return propertyId ? this.svc.listByProperty(propertyId) : this.svc.list();
    }),
  );
  selectedFile: File | null = null;
  uploading = false;
  search = '';
  categoryFilter: DocumentCategory | 'all' = 'all';
  errorMessage = '';
  successMessage = '';
  rowError = '';
  busyId: string | null = null;

  properties: any[] = [];
  units: any[] = [];
  tenants: any[] = [];
  leases: any[] = [];
  private propertyNames = new Map<string, string>();
  private tenantNames = new Map<string, string>();

  form = this.fb.group({
    title: ['', [Validators.required]],
    category: ['lease' as DocumentCategory, [Validators.required]],
    visibility: ['property_team', [Validators.required]],
    propertyId: ['', [Validators.required]],
    unitId: [''],
    tenantId: [''],
    leaseId: [''],
  });

  constructor() {
    firstValueFrom(this.propertiesSvc.list()).then((rows: any) => {
      this.properties = rows;
      this.propertyNames = new Map((rows as any[]).map((p) => [p.id, p.name || p.id]));
    });
    firstValueFrom(this.tenantsSvc.list()).then((rows: any) => {
      this.tenantNames = new Map((rows as any[]).map((t) => [t.id, t.displayName || t.email || t.id]));
    });

    const propertyId = String(this.route.snapshot.queryParamMap.get('propertyId') || '').trim();
    if (propertyId) {
      this.form.patchValue({ propertyId });
      this.onPropertyChange();
    }
  }

  propertyName(propertyId?: string): string {
    if (!propertyId) return '-';
    return this.propertyNames.get(propertyId) || propertyId;
  }

  tenantName(tenantId?: string): string {
    if (!tenantId) return '-';
    return this.tenantNames.get(tenantId) || tenantId;
  }

  async onPropertyChange() {
    const propertyId = String(this.form.value.propertyId || '').trim();
    this.form.patchValue({ unitId: '', tenantId: '', leaseId: '' });
    if (!propertyId) {
      this.units = [];
      this.tenants = [];
      this.leases = [];
      return;
    }
    const [units, tenants, leases] = await Promise.all([
      firstValueFrom(this.unitsSvc.listByProperty(propertyId)),
      firstValueFrom(this.tenantsSvc.listByProperty(propertyId)),
      firstValueFrom(this.leasesSvc.list(propertyId)).catch(() => []),
    ]);
    this.units = units as any[];
    this.tenants = tenants as any[];
    this.leases = leases as any[];
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  filter(items: DocumentRecord[]): DocumentRecord[] {
    const q = this.search.trim().toLowerCase();
    return items.filter((item) => {
      if (this.categoryFilter !== 'all' && item.category !== this.categoryFilter) return false;
      if (!q) return true;
      return `${item.title} ${item.fileName}`.toLowerCase().includes(q);
    });
  }

  async submit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.uploading = true;
    try {
      const value = this.form.getRawValue();
      await this.svc.uploadDocument({
        title: value.title ?? '',
        category: (value.category ?? 'other') as DocumentCategory,
        visibility: (value.visibility ?? 'property_team') as NonNullable<DocumentRecord['visibility']>,
        propertyId: value.propertyId?.trim() || undefined,
        unitId: value.unitId?.trim() || undefined,
        tenantId: value.tenantId?.trim() || undefined,
        leaseId: value.leaseId?.trim() || undefined,
        file: this.selectedFile,
      });
      this.successMessage = 'Document uploaded successfully.';
      const propertyId = value.propertyId ?? '';
      this.form.reset({ category: 'lease', visibility: 'property_team', propertyId });
      this.selectedFile = null;
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Upload failed.';
    } finally {
      this.uploading = false;
    }
  }

  async deleteDocument(document: DocumentRecord) {
    if (!confirm(`Delete "${document.title}"?`)) return;
    this.rowError = '';
    this.busyId = document.id;
    try {
      await this.svc.remove(document.id);
    } catch (err: any) {
      this.rowError = err?.message || 'Failed to delete document.';
    } finally {
      this.busyId = null;
    }
  }
}
