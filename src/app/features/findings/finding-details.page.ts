import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap, tap, shareReplay } from 'rxjs/operators';

import { FindingsService } from './findings.service';
import { Finding, FindingSeverity, FindingStatus } from '../../core/models/finding.models';

type Vm = {
  propertyId: string;
  inspectionId: string;
  findingId: string;
  finding: Finding;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <ng-container *ngIf="vm$ | async as vm">
    <div class="card">
      <div class="header">
        <div>
          <div class="h1">Finding {{ vm.findingId | slice:0:8 }}</div>
          <div class="muted">
            Inspection: <span class="mono">{{ vm.inspectionId }}</span>
            • Property: <span class="mono">{{ vm.propertyId }}</span>
          </div>
        </div>

        <div class="top-actions">
          <a class="btn secondary" [routerLink]="['/properties', vm.propertyId, 'inspections', vm.inspectionId]">Back</a>
          <button class="btn green"
                  type="button"
                  [disabled]="!!vm.finding.linkedWorkOrderId || busy"
                  (click)="convertToWO(vm.propertyId, vm.inspectionId, vm.findingId)">
            {{ vm.finding.linkedWorkOrderId ? 'Work Order Linked' : 'Convert to Work Order' }}
          </button>
        </div>
      </div>

      <div class="grid2">
        <div class="card2">
          <div class="h2">Details</div>

          <label class="lbl">Summary *</label>
          <input class="input" [(ngModel)]="summary" placeholder="Short summary" />

          <label class="lbl">Details</label>
          <textarea class="input" rows="5" [(ngModel)]="details" placeholder="What did you observe?"></textarea>

          <div class="grid2">
            <div>
              <label class="lbl">Room / Area</label>
              <input class="input" [(ngModel)]="roomArea" placeholder="e.g., Kitchen" />
            </div>
            <div>
              <label class="lbl">Severity</label>
              <select class="input" [(ngModel)]="severity">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </div>
          </div>

          <div class="grid2">
            <div>
              <label class="lbl">Section</label>
              <input class="input" [(ngModel)]="section" placeholder="e.g., Interior" />
            </div>
            <div>
              <label class="lbl">Category</label>
              <input class="input" [(ngModel)]="category" placeholder="e.g., Plumbing" />
            </div>
          </div>

          <div class="grid2">
            <div>
              <label class="lbl">Status</label>
              <select class="input" [(ngModel)]="status">
                <option value="new">new</option>
                <option value="ack">ack</option>
                <option value="converted">converted</option>
                <option value="closed">closed</option>
              </select>
            </div>
            <div class="cardMini">
              <div class="muted">Updated</div>
              <div class="strong">{{ vm.finding.updatedAt ? (vm.finding.updatedAt | date:'medium') : '-' }}</div>
            </div>
          </div>

          <div class="actionsRow">
            <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>
            <div class="status" *ngIf="statusMsg">{{ statusMsg }}</div>

            <button class="btn" type="button" [disabled]="busy" (click)="save(vm.propertyId, vm.inspectionId, vm.findingId)">
              Save
            </button>

            <button class="btn secondary" type="button" [disabled]="busy" (click)="reloadFromFinding(vm.finding)">
              Reset
            </button>
          </div>
        </div>

        <div class="card2">
          <div class="h2">Photos</div>
          <div class="muted">Upload photos for this finding.</div>

          <div class="actions" style="margin-top:10px;">
            <input class="file" type="file" accept="image/*" (change)="onFileSelected($event, vm.propertyId, vm.inspectionId, vm.findingId)" />
          </div>

          <div class="thumbs" *ngIf="vm.finding.photos?.length">
            <a class="thumbWrap" *ngFor="let p of vm.finding.photos" [href]="p.url" target="_blank" rel="noopener">
              <img [src]="p.url" class="thumbBig" alt="photo" />
              <div class="thumbLabel">{{ p.name || 'photo' }}</div>
            </a>
          </div>

          <div class="empty" *ngIf="!vm.finding.photos?.length">No photos yet.</div>

          <div class="divider"></div>

          <div class="dangerZone">
            <div class="h3">Danger zone</div>
            <div class="muted">Delete permanently (admins/managers by rules).</div>
            <button class="btn danger" type="button" [disabled]="busy" (click)="remove(vm.propertyId, vm.inspectionId, vm.findingId)">
              Delete Finding
            </button>
          </div>
        </div>
      </div>
    </div>
  </ng-container>
  `,
  styles: [`
    .card{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;margin:16px}
    .card2{background:rgba(2,6,23,.35);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px}
    .header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .top-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .h1{font-size:18px;font-weight:900;color:#e5e7eb}
    .h2{font-size:14px;font-weight:900;color:#e5e7eb;margin-bottom:10px}
    .h3{font-size:13px;font-weight:900;color:#e5e7eb;margin-bottom:6px}
    .muted{color:rgba(226,232,240,.75);font-size:12px;margin-top:4px}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
    @media (max-width: 1100px){.grid2{grid-template-columns:1fr}}
    .lbl{display:block;margin-top:10px;margin-bottom:6px;color:rgba(226,232,240,.85);font-size:12px}
    .input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(2,6,23,.25);color:#e5e7eb;outline:none}
    .actionsRow{margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
    .btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(59,130,246,.85);color:white;font-weight:800;cursor:pointer}
    .btn.secondary{background:rgba(148,163,184,.20)}
    .btn.green{background:rgba(34,197,94,.22);border-color:rgba(34,197,94,.35);color:#bbf7d0}
    .btn.danger{background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.35);color:#fecaca}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .divider{margin:14px 0;height:1px;background:rgba(255,255,255,.06)}
    .thumbs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
    .thumbWrap{display:block;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:rgba(2,6,23,.25)}
    .thumbBig{width:100%;height:140px;object-fit:cover;display:block}
    .thumbLabel{padding:8px 10px;font-size:12px;color:#94a3b8;border-top:1px solid rgba(255,255,255,.06)}
    .empty{margin-top:12px;padding:12px;border-radius:14px;border:1px dashed rgba(255,255,255,.15);color:#94a3b8;background:rgba(255,255,255,.02);text-align:center}
    .dangerZone{margin-top:14px;padding:12px;border-radius:16px;border:1px solid rgba(239,68,68,.25);background:rgba(239,68,68,.06)}
    .error{color:#fb7185;font-weight:800;font-size:12px}
    .status{color:rgba(226,232,240,.75);font-size:12px}
    .file{width:100%;max-width:240px}
    .cardMini{margin-top:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:12px}
    .strong{color:#e5e7eb;font-weight:900}
  `]
})
export class FindingDetailsPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private findings = inject(FindingsService);

  // form
  summary = '';
  details = '';
  roomArea = '';
  section = '';
  category = '';
  severity: FindingSeverity = 'medium';
  status: FindingStatus = 'new';

  errorMsg = '';
  statusMsg = '';
  busy = false;

  vm$: Observable<Vm> = this.route.paramMap.pipe(
    map(pm => {
      const propertyId = (pm.get('propertyId') || '').trim();
      const inspectionId = (pm.get('inspectionId') || '').trim();
      const findingId = (pm.get('findingId') || '').trim();
      return { propertyId, inspectionId, findingId };
    }),
    switchMap(({ propertyId, inspectionId, findingId }): Observable<Vm> =>
      this.findings.get(propertyId, inspectionId, findingId).pipe(
        map((finding: any): Vm => ({ propertyId, inspectionId, findingId, finding: { ...(finding as any), id: findingId } as Finding })),
        tap((vm: Vm) => {
          // hydrate form once per doc emission
          this.reloadFromFinding(vm.finding);
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private clean<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
    return out;
  }

  reloadFromFinding(f: any) {
    this.summary = f?.summary ?? '';
    this.details = f?.details ?? '';
    this.roomArea = f?.roomArea ?? '';
    this.section = f?.section ?? '';
    this.category = f?.category ?? '';
    this.severity = (f?.severity ?? 'medium') as any;
    this.status = (f?.status ?? 'new') as any;
  }

  async save(propertyId: string, inspectionId: string, findingId: string) {
    this.errorMsg = '';
    this.statusMsg = '';
    this.busy = true;

    try {
      const summary = (this.summary || '').trim();
      if (!summary) {
        this.errorMsg = 'Summary is required.';
        return;
      }

      const patch = this.clean({
        summary,
        details: (this.details || '').trim() || null,
        roomArea: (this.roomArea || '').trim() || null,
        section: (this.section || '').trim() || null,
        category: (this.category || '').trim() || null,
        severity: this.severity,
        status: this.status,
      } as any);

      this.statusMsg = 'Saving...';
      await this.findings.update(propertyId, inspectionId, findingId, patch as any);
      this.statusMsg = 'Saved.';
    } catch (e: any) {
      this.errorMsg = e?.message ?? String(e);
      this.statusMsg = '';
    } finally {
      this.busy = false;
    }
  }

  async onFileSelected(evt: Event, propertyId: string, inspectionId: string, findingId: string) {
    this.errorMsg = '';
    this.statusMsg = '';
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.busy = true;
    try {
      this.statusMsg = 'Uploading...';
      await this.findings.addPhoto({ propertyId, inspectionId, findingId, file });
      this.statusMsg = 'Uploaded.';
      input.value = '';
    } catch (e: any) {
      this.errorMsg = e?.message ?? String(e);
      this.statusMsg = '';
    } finally {
      this.busy = false;
    }
  }

  async convertToWO(propertyId: string, inspectionId: string, findingId: string) {
    this.errorMsg = '';
    this.statusMsg = '';
    this.busy = true;

    try {
      this.statusMsg = 'Converting...';
      // optional: wire to WorkOrders later
      await this.findings.convertToWorkOrder(propertyId, inspectionId, findingId);
      this.statusMsg = 'Converted.';
    } catch (e: any) {
      this.errorMsg = e?.message ?? String(e);
      this.statusMsg = '';
    } finally {
      this.busy = false;
    }
  }

  async remove(propertyId: string, inspectionId: string, findingId: string) {
    this.errorMsg = '';
    this.statusMsg = '';
    this.busy = true;

    try {
      this.statusMsg = 'Deleting...';
      await this.findings.remove(propertyId, inspectionId, findingId);
      this.statusMsg = 'Deleted.';
      await this.router.navigateByUrl(`/properties/${propertyId}/inspections/${inspectionId}`);
    } catch (e: any) {
      this.errorMsg = e?.message ?? String(e);
      this.statusMsg = '';
    } finally {
      this.busy = false;
    }
  }
}
