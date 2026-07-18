import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from './reports.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page">
    <div class="grid">
      <section class="card">
        <div class="h1">Reports</div>
        <div class="muted">Generate a PDF report from inspections, findings and work orders. The PDF is created by Cloud Functions and stored in Firebase Storage.</div>

        <div class="box">
          <div class="h2">Build a PDF</div>

          <label class="lbl">Inspection ID (optional)</label>
          <input class="input" placeholder="If set, generates a branded single-inspection report" [(ngModel)]="inspectionId" />

          <div class="row">
            <div>
              <label class="lbl">From</label>
              <input class="input" type="date" [(ngModel)]="fromStr" />
            </div>
            <div>
              <label class="lbl">To</label>
              <input class="input" type="date" [(ngModel)]="toStr" />
            </div>
          </div>

          <label class="lbl">Include</label>
          <div class="checks">
            <label class="chk"><input type="checkbox" [(ngModel)]="incInspections" /> Inspections</label>
            <label class="chk"><input type="checkbox" [(ngModel)]="incFindings" /> Findings</label>
            <label class="chk"><input type="checkbox" [(ngModel)]="incWorkOrders" /> Work Orders</label>
            <label class="chk"><input type="checkbox" [(ngModel)]="incPhotos" /> Photos (embed)</label>
            <label class="chk"><input type="checkbox" [(ngModel)]="incSignatures" /> Signatures</label>
            <label class="chk"><input type="checkbox" [(ngModel)]="incBranding" /> Branding (logo + sections)</label>
          </div>

          <button class="btn" (click)="generate()" [disabled]="busy">{{busy ? 'Generating…' : 'Generate PDF Report'}}</button>
          <div class="err" *ngIf="err">{{err}}</div>
          <div class="ok" *ngIf="lastReportId">Requested: {{lastReportId}}</div>
        </div>
      </section>

      <aside class="card">
        <div class="h2">Recent Reports</div>
        <div class="muted">Refresh after ~3–10 seconds (emulator) or ~10–30 seconds (cloud) depending on size.</div>

        <div class="list">
          <div class="item" *ngFor="let r of reports$ | async">
            <div class="row2">
              <div class="strong">{{r.id | slice:0:10}}</div>
              <span class="pill" [class.ready]="r.status==='ready'" [class.errpill]="r.status==='error'">{{r.status}}</span>
            </div>
            <div class="muted">{{r.createdAt | date:'short'}}</div>

            <div class="muted" *ngIf="r.counts">
              Inspections: {{r.counts.inspections || 0}} • Findings: {{r.counts.findings || 0}} • WOs: {{r.counts.workOrders || 0}}
            </div>

            <div class="muted" *ngIf="r.errorMessage">{{r.errorMessage}}</div>

            <ng-container *ngIf="r.storagePath && r.status==='ready'">
              <a class="link" [href]="(downloadUrl$(r.storagePath) | async)" target="_blank">Download PDF</a>
            </ng-container>
          </div>
        </div>
      </aside>
    </div>
  </div>
  `,
  styles: [`
    .page{ max-width: 1200px; margin:0 auto; }
    .grid{ display:grid; grid-template-columns: 1fr 420px; gap:14px; }
    .card{ background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:18px; padding:16px; }
    .h1{ font-size:18px; font-weight:900; color:#f8fafc; }
    .h2{ font-size:13px; font-weight:900; color:#e2e8f0; margin-bottom:10px; }
    .muted{ color:#94a3b8; font-size:12px; margin-top:6px; }

    .box{ margin-top:12px; padding:12px; border-radius:14px; background: rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); }
    .lbl{ display:block; margin-top:10px; color:#cbd5e1; font-size:12px; font-weight:800; }
    .input{ width:100%; margin-top:6px; padding:10px 12px; border-radius:12px;
      background: rgba(2,6,23,.35); color:#e5e7eb; border:1px solid rgba(255,255,255,.08); outline:none; }
    .row{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .checks{ display:flex; gap:12px; flex-wrap:wrap; margin-top:8px; }
    .chk{ color:#e2e8f0; font-size:12px; font-weight:800; display:flex; align-items:center; gap:8px; }
    .btn{ margin-top:14px; width:100%; padding:10px 12px; border-radius:12px; border:1px solid rgba(59,130,246,.35);
      background: rgba(59,130,246,.18); color:#dbeafe; font-weight:900; cursor:pointer; }
    .btn:disabled{ opacity:.55; cursor:not-allowed; }
    .err{ margin-top:10px; color:#fecaca; font-size:12px; }
    .ok{ margin-top:10px; color:#bbf7d0; font-size:12px; }

    .list{ margin-top:12px; display:flex; flex-direction:column; gap:10px; }
    .item{ padding:12px; border-radius:14px; background: rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); }
    .row2{ display:flex; justify-content:space-between; align-items:center; gap:10px; }
    .strong{ font-weight:900; color:#f1f5f9; }
    .pill{ padding:6px 10px; border-radius:999px; border:1px solid rgba(148,163,184,.25); background: rgba(255,255,255,.02); font-size:12px; }
    .pill.ready{ border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.14); color:#dcfce7; }
    .pill.errpill{ border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.12); color:#fecaca; }
    .link{ display:inline-block; margin-top:10px; color:#93c5fd; text-decoration:none; font-weight:900; }
  `]
})
export class ReportsBuilderPage {
  private svc = inject(ReportsService);

  reports$ = this.svc.listLatest();

  fromStr = '';
  toStr = '';

  inspectionId = '';

  incInspections = true;
  incFindings = true;
  incWorkOrders = true;
  incPhotos = true;
  incSignatures = true;
  incBranding = true;

  busy = false;
  err = '';
  lastReportId = '';

  downloadUrl$(path: string) {
    return this.svc.downloadUrl$(path);
  }

  async generate() {
    this.err = '';
    this.lastReportId = '';
    this.busy = true;
    try {
      const from = this.fromStr ? new Date(this.fromStr).getTime() : undefined;
      const to = this.toStr ? (new Date(this.toStr).getTime() + 24*60*60*1000 - 1) : undefined;

      const include = {
        inspections: !!this.incInspections,
        findings: !!this.incFindings,
        workOrders: !!this.incWorkOrders,
        photos: !!this.incPhotos,
        signatures: !!this.incSignatures,
        branding: !!this.incBranding,
      };

      const inspectionId = (this.inspectionId || '').trim() || undefined;
      const res = await this.svc.requestPdf({ from, to, include, inspectionId });
      this.lastReportId = res.reportId;
    } catch (e: any) {
      this.err = e?.message ?? 'Report request failed';
    } finally {
      this.busy = false;
    }
  }
}
