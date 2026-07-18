import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DocumentsService } from './documents.service';
import { DocumentCategory, DocumentRecord } from '../../core/models/domain.models';

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
            <input formControlName="propertyId" placeholder="Property ID *" />
            <input formControlName="unitId" placeholder="Unit ID (optional)" />
            <input formControlName="tenantId" placeholder="Tenant ID (optional)" />
            <input formControlName="leaseId" placeholder="Lease ID (optional)" />
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
                <small>Property: {{ d.propertyId || '-' }}</small><br />
                <small>Tenant: {{ d.tenantId || '-' }}</small><br />
                <small>Visibility: {{ d.visibility || 'property_team' }}</small>
              </div>
              <div>{{ d.createdAt | date:'short' }}</div>
              <div>
                <a *ngIf="d.downloadUrl" [href]="d.downloadUrl" target="_blank" rel="noopener">Open</a>
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
    .thead, .row { display:grid; grid-template-columns:1.4fr .8fr 1fr .8fr .5fr; gap:10px; padding:10px 12px; align-items:center; }
    .thead { background:rgba(148,163,184,.12); font-size:12px; font-weight:800; }
    .row { border-top:1px solid rgba(148,163,184,.15); }
    .strong { font-weight:800; }
    .badge { display:inline-block; border-radius:999px; padding:5px 8px; background:rgba(59,130,246,.18); color:#bfdbfe; font-size:11px; text-transform:uppercase; }
    .empty { padding:14px; color:#94a3b8; }
    a { color:#7dd3fc; font-weight:700; text-decoration:none; }
    @media (max-width: 1100px) { .grid { grid-template-columns:1fr; } .thead, .row { grid-template-columns:1fr; } }
  `],
})
export class DocumentsPage {
  private svc = inject(DocumentsService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

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
    const propertyId = String(this.route.snapshot.queryParamMap.get('propertyId') || '').trim();
    if (propertyId) {
      this.form.patchValue({ propertyId });
    }
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
      this.form.reset({ category: 'lease', visibility: 'property_team', propertyId: value.propertyId ?? '' });
      this.selectedFile = null;
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Upload failed.';
    } finally {
      this.uploading = false;
    }
  }
}
