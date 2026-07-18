import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { FindingsService } from './findings.service';
import { FindingSeverity } from '../../core/models/finding.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="card">
    <div class="header">
      <div>
        <div class="h1">New Finding</div>
        <div class="muted">Create a finding for this inspection.</div>
      </div>
      <button class="btn secondary" type="button" (click)="back()">Back</button>
    </div>

    <div class="grid2">
      <div class="card2">
        <div class="h2">Context</div>

        <label class="lbl">Property</label>
        <input class="input" [value]="propertyId" disabled />

        <label class="lbl">Inspection</label>
        <input class="input" [value]="inspectionId" disabled />

        <label class="lbl">Summary *</label>
        <input class="input" [(ngModel)]="summary" placeholder="Short summary" />

        <label class="lbl">Severity</label>
        <select class="input" [(ngModel)]="severity">
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </div>

      <div class="card2">
        <div class="h2">Optional</div>

        <label class="lbl">Details</label>
        <textarea class="input" rows="5" [(ngModel)]="details" placeholder="Details..."></textarea>

        <div class="grid2" style="margin-top:10px;">
          <div>
            <label class="lbl">Room/Area</label>
            <input class="input" [(ngModel)]="roomArea" placeholder="e.g., Kitchen" />
          </div>
          <div>
            <label class="lbl">Section</label>
            <input class="input" [(ngModel)]="section" placeholder="e.g., Interior" />
          </div>
        </div>

        <label class="lbl">Category</label>
        <input class="input" [(ngModel)]="category" placeholder="e.g., Plumbing" />
      </div>
    </div>

    <div class="actions">
      <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>
      <div class="status" *ngIf="statusMsg">{{ statusMsg }}</div>

      <button class="btn" type="button" [disabled]="busy" (click)="create()">
        Create Finding
      </button>
    </div>
  </div>
  `,
  styles: [`
    .card{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
    .card2{background:rgba(2,6,23,.35);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px}
    .header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .h1{font-size:18px;font-weight:900;color:#e5e7eb}
    .h2{font-size:14px;font-weight:900;color:#e5e7eb;margin-bottom:10px}
    .muted{color:rgba(226,232,240,.75);font-size:12px;margin-top:4px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
    @media (max-width: 1100px){.grid2{grid-template-columns:1fr}}
    .lbl{display:block;margin-top:10px;margin-bottom:6px;color:rgba(226,232,240,.85);font-size:12px}
    .input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(2,6,23,.25);color:#e5e7eb;outline:none}
    .actions{display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:12px;flex-wrap:wrap}
    .btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(59,130,246,.85);color:white;font-weight:800;cursor:pointer}
    .btn.secondary{background:rgba(148,163,184,.20)}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .error{color:#fb7185;font-weight:800;font-size:12px}
    .status{color:rgba(226,232,240,.75);font-size:12px}
  `]
})
export class FindingFormPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private findings = inject(FindingsService);

  propertyId = '';
  inspectionId = '';

  summary = '';
  details = '';
  roomArea = '';
  section = '';
  category = '';
  severity: FindingSeverity = 'medium';

  errorMsg = '';
  statusMsg = '';
  busy = false;

  ngOnInit() {
    this.propertyId = (this.route.snapshot.paramMap.get('propertyId') || '').trim();
    this.inspectionId = (this.route.snapshot.paramMap.get('inspectionId') || '').trim();
  }

  async back() {
    await this.router.navigateByUrl(`/properties/${this.propertyId}/inspections/${this.inspectionId}`);
  }

  async create() {
    this.errorMsg = '';
    this.statusMsg = '';
    this.busy = true;

    try {
      const propertyId = (this.propertyId || '').trim();
      const inspectionId = (this.inspectionId || '').trim();
      const summary = (this.summary || '').trim();

      if (!propertyId) { this.errorMsg = 'Missing propertyId.'; return; }
      if (!inspectionId) { this.errorMsg = 'Missing inspectionId.'; return; }
      if (!summary) { this.errorMsg = 'Summary is required.'; return; }

      this.statusMsg = 'Creating...';
      const id = await this.findings.createUnderInspection(propertyId, inspectionId, {
        summary,
        details: (this.details || '').trim() || undefined,
        severity: this.severity,
        roomArea: (this.roomArea || '').trim() || undefined,
        section: (this.section || '').trim() || undefined,
        category: (this.category || '').trim() || undefined,
      });

      this.statusMsg = 'Created.';
      await this.router.navigateByUrl(`/properties/${propertyId}/inspections/${inspectionId}/findings/${id}`);
    } catch (e: any) {
      this.errorMsg = e?.message ?? String(e);
      this.statusMsg = '';
    } finally {
      this.busy = false;
    }
  }
}
