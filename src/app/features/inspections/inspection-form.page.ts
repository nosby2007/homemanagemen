import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { InspectionsService } from './inspections.service';
import { Inspection } from '../../core/models/inspection.models';

type InspectionForm = {
  propertyId: string;
  status: 'new' | 'scheduled' | 'in_progress' | 'completed' | 'archived';
  scheduledAt: string; // datetime-local
  notes: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
};

@Component({
  standalone: true,
  selector: 'app-inspection-form-page',
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page">
    <div class="card">
      <div class="header">
        <div>
          <div class="h1">{{ isEdit ? 'Edit Inspection' : 'New Inspection' }}</div>
          <div class="muted">Create or update an inspection record for the current organization.</div>
        </div>

        <div class="header-actions">
          <button class="btn secondary" type="button" (click)="back()">Back</button>
          <button class="btn" type="button" [disabled]="saving" (click)="save()">
            {{ saving ? 'Saving...' : (isEdit ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>

      <div class="grid">
        <div class="card2">
          <div class="h2">Core</div>

          <label class="lbl">Property ID <span class="req">*</span></label>
          <input class="input" [(ngModel)]="form.propertyId" placeholder="ex: PROPERTY_001" />

          <label class="lbl">Status</label>
          <select class="input" [(ngModel)]="form.status">
            <option value="new">new</option>
            <option value="scheduled">scheduled</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="archived">archived</option>
          </select>

          <label class="lbl">Scheduled At</label>
          <input class="input" type="datetime-local" [(ngModel)]="form.scheduledAt" />

          <label class="lbl">Notes</label>
          <textarea class="input" rows="4" [(ngModel)]="form.notes" placeholder="Optional notes..."></textarea>
        </div>

        <div class="card2">
          <div class="h2">Client</div>

          <label class="lbl">Client Name</label>
          <input class="input" [(ngModel)]="form.clientName" placeholder="Optional" />

          <label class="lbl">Client Email</label>
          <input class="input" [(ngModel)]="form.clientEmail" placeholder="Optional" />

          <label class="lbl">Client Phone</label>
          <input class="input" [(ngModel)]="form.clientPhone" placeholder="Optional" />
        </div>

        <div class="card2">
          <div class="h2">Property Address</div>

          <label class="lbl">Address Line 1</label>
          <input class="input" [(ngModel)]="form.addressLine1" placeholder="Optional" />

          <label class="lbl">Address Line 2</label>
          <input class="input" [(ngModel)]="form.addressLine2" placeholder="Optional" />

          <div class="row">
            <div>
              <label class="lbl">City</label>
              <input class="input" [(ngModel)]="form.city" placeholder="Optional" />
            </div>
            <div>
              <label class="lbl">State</label>
              <input class="input" [(ngModel)]="form.state" placeholder="Optional (GA)" />
            </div>
            <div>
              <label class="lbl">ZIP</label>
              <input class="input" [(ngModel)]="form.zip" placeholder="Optional" />
            </div>
          </div>
        </div>
      </div>

      <div class="bar">
        <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>
        <div class="muted" *ngIf="successMsg">{{ successMsg }}</div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .page{ padding:16px; }
    .grid{ display:grid; grid-template-columns: 1.25fr 1fr; gap:14px; margin-top:14px; }
    @media (max-width: 1100px){ .grid{ grid-template-columns: 1fr; } }

    .card{ background: rgba(15,23,42,.78); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:14px; }
    .card2{ background: rgba(2,6,23,.35); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:12px; }
    .header{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .header-actions{ display:flex; gap:10px; }

    .h1{ font-size:18px; font-weight:800; color:#e5e7eb; }
    .h2{ font-size:14px; font-weight:800; color:#e5e7eb; margin-bottom:10px; }
    .muted{ color: rgba(226,232,240,.75); font-size:12px; margin-top:4px; }
    .lbl{ display:block; margin-top:10px; margin-bottom:6px; color: rgba(226,232,240,.85); font-size:12px; }
    .req{ color:#fb7185; font-weight:700; }

    .input{
      width:100%;
      padding:10px 12px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background: rgba(2,6,23,.25);
      color:#e5e7eb;
      outline:none;
    }
    textarea.input{ resize: vertical; }

    .row{ display:grid; grid-template-columns: 1fr 140px 140px; gap:10px; }
    @media (max-width: 600px){ .row{ grid-template-columns: 1fr; } }

    .btn{
      padding:10px 12px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background: rgba(59,130,246,.85);
      color:white;
      font-weight:700;
      cursor:pointer;
    }
    .btn.secondary{ background: rgba(148,163,184,.20); }
    .btn:disabled{ opacity:.6; cursor:not-allowed; }

    .bar{ display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:12px; }
    .error{ color:#fb7185; font-weight:700; font-size:12px; }
  `]
})
export class InspectionFormPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspections = inject(InspectionsService);

  saving = false;
  errorMsg = '';
  successMsg = '';

  inspectionId: string | null = null;
  isEdit = false;

  form: InspectionForm = this.emptyForm();

  async ngOnInit() {
    this.inspectionId = this.route.snapshot.paramMap.get('inspectionId');
    this.isEdit = !!this.inspectionId;

    if (this.isEdit && this.inspectionId) {
      const insp = await firstValueFrom(this.inspections.get(this.inspectionId, this.inspectionId));
      this.form = this.fromInspection(insp);
    }
  }

  back() {
    // adapte selon tes routes
    this.router.navigateByUrl('/inspections');
  }

  async save() {
    this.errorMsg = '';
    this.successMsg = '';

    const propertyId = (this.form.propertyId || '').trim();
    if (!propertyId) {
      this.errorMsg = 'Property ID is required.';
      return;
    }

    this.saving = true;
    try {
      const payload = this.toInspectionPayload();

      if (this.isEdit && this.inspectionId) {
        await this.inspections.update(this.inspectionId, this.inspectionId, payload as any);
        this.successMsg = 'Inspection updated.';
      } else {
        const id = await this.inspections.create(this.inspectionId!, payload as any);
        this.successMsg = 'Inspection created.';
        // navigate to detail
        this.router.navigate(['/inspections', id]);
      }
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Save failed.';
    } finally {
      this.saving = false;
    }
  }

  // ---------- mapping helpers ----------

  private emptyForm(): InspectionForm {
    return {
      propertyId: '',
      status: 'new',
      scheduledAt: '',
      notes: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zip: '',
    };
  }

  private fromInspection(insp: any): InspectionForm {
    const scheduledAt = insp?.scheduledAt ? this.toDateTimeLocal(insp.scheduledAt) : '';
    return {
      propertyId: String(insp?.propertyId ?? ''),
      status: (insp?.status ?? 'new'),
      scheduledAt,
      notes: String(insp?.notes ?? ''),
      clientName: String(insp?.clientName ?? ''),
      clientEmail: String(insp?.clientEmail ?? ''),
      clientPhone: String(insp?.clientPhone ?? ''),
      addressLine1: String(insp?.address?.line1 ?? ''),
      addressLine2: String(insp?.address?.line2 ?? ''),
      city: String(insp?.address?.city ?? ''),
      state: String(insp?.address?.state ?? ''),
      zip: String(insp?.address?.zip ?? ''),
    };
  }

  /**
   * Build payload WITHOUT undefined fields:
   * - empty strings => omitted (or kept if you prefer)
   * - scheduledAt => number (ms) or omitted
   */
  private toInspectionPayload(): Partial<Inspection> {
    const scheduledAtMs = this.form.scheduledAt ? this.fromDateTimeLocal(this.form.scheduledAt) : null;

    const address = this.cleanObj({
      line1: this.cleanStr(this.form.addressLine1),
      line2: this.cleanStr(this.form.addressLine2),
      city: this.cleanStr(this.form.city),
      state: this.cleanStr(this.form.state),
      zip: this.cleanStr(this.form.zip),
    });

    const payload = this.cleanObj({
      propertyId: this.cleanStr(this.form.propertyId)!, // required already validated
      status: this.form.status,
      scheduledAt: scheduledAtMs ?? undefined, // will be removed by cleanObj
      notes: this.cleanStr(this.form.notes),

      clientName: this.cleanStr(this.form.clientName),
      clientEmail: this.cleanStr(this.form.clientEmail),
      clientPhone: this.cleanStr(this.form.clientPhone),

      address: Object.keys(address).length ? address : undefined,
    });

    return payload as any;
  }

  private cleanStr(v: any): string | undefined {
    const s = String(v ?? '').trim();
    return s ? s : undefined;
  }

  private cleanObj<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      // remove empty objects
      if (typeof v === 'object' && !Array.isArray(v)) {
        const inner = this.cleanObj(v);
        if (Object.keys(inner).length) out[k] = inner;
        continue;
      }
      out[k] = v;
    }
    return out;
  }

  // ---------- datetime helpers ----------
  private toDateTimeLocal(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  }

  private fromDateTimeLocal(v: string): number {
    // v like "2026-01-21T13:45"
    const ms = new Date(v).getTime();
    return Number.isFinite(ms) ? ms : Date.now();
  }
}
