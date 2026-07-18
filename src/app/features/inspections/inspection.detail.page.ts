import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { switchMap, map, shareReplay } from 'rxjs/operators';

import { InspectionsService } from './inspections.service';
import { FindingsService } from '../findings/findings.service';
import { SignaturePadComponent } from './signature-pad.component';
import { FindingSeverity } from '../../core/models/finding.models';
import { InspectionChecklistService, ChecklistSection, ChecklistItem } from './inspection-checklist.service';

type Vm = {
  propertyId: string;
  inspectionId: string;
  inspection: any;
  findings: any[];
  sections: ChecklistSection[];
  itemsBySection: Record<string, ChecklistItem[]>;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignaturePadComponent],
  template: `
  <ng-container *ngIf="vm$ | async as vm">
    <div class="grid">
      <div class="card">
        <div class="header">
          <div>
            <div class="h1">Inspection {{ vm.inspection.id | slice:0:8 }}</div>
            <div class="muted">Property: {{ vm.inspection.propertyId }} • Status: {{ vm.inspection.status }}</div>
          </div>
          <div class="headerActions">
            <button class="btn secondary" type="button" (click)="markInProgress(vm.propertyId, vm.inspection.id)">Start</button>
            <button class="btn" type="button" (click)="addSection(vm.propertyId, vm.inspection.id)">+ Section</button>
          </div>
        </div>

        <div class="card2">
          <div class="h2">Inspection Checklist</div>
          <div class="muted">Sections → items with pass/fail/notes/photos.</div>

          <div class="section" *ngFor="let s of vm.sections">
            <div class="sectionHead">
              <div class="sectionTitle">
                <input class="input sm"
                       [ngModel]="s.title"
                       (ngModelChange)="renameSection(vm.propertyId, vm.inspection.id, s.id, $event)"
                       placeholder="Section title (e.g., Kitchen)" />
              </div>

              <div class="sectionBtns">
                <button class="btn sm secondary" type="button" (click)="addItem(vm.propertyId, vm.inspection.id, s.id)">+ Item</button>
                <button class="btn sm danger" type="button" (click)="deleteSection(vm.propertyId, vm.inspection.id, s.id)">Delete</button>
              </div>
            </div>

            <div class="item" *ngFor="let it of (vm.itemsBySection[s.id] || [])">
              <div class="itemTop">
                <input class="input"
                       [ngModel]="it.label"
                       (ngModelChange)="updateItem(vm.propertyId, vm.inspection.id, s.id, it.id, { label: $event })"
                       placeholder="Item label (e.g., Sink faucet)" />

                <select class="input sm"
                        [ngModel]="it.status"
                        (ngModelChange)="updateItem(vm.propertyId, vm.inspection.id, s.id, it.id, { status: $event })">
                  <option value="open">open</option>
                  <option value="pass">pass</option>
                  <option value="fail">fail</option>
                  <option value="na">n/a</option>
                </select>

                <button class="btn sm ghost" type="button" (click)="deleteItem(vm.propertyId, vm.inspection.id, s.id, it.id)">Delete</button>
              </div>

              <textarea class="input"
                        rows="2"
                        [ngModel]="it.notes || ''"
                        (ngModelChange)="updateItem(vm.propertyId, vm.inspection.id, s.id, it.id, { notes: $event })"
                        placeholder="Notes..."></textarea>

              <div class="itemPhotosRow">
                <input class="file" type="file" accept="image/*"
                       (change)="onChecklistPhoto($event, vm.propertyId, vm.inspection.id, s.id, it.id)" />
                <div class="miniPills">
                  <span class="pill" [class.pill--pass]="it.status==='pass'" [class.pill--fail]="it.status==='fail'">
                    {{ it.status }}
                  </span>
                  <span class="muted">{{ (it.photos?.length || 0) }} photo(s)</span>
                </div>
              </div>

              <div class="thumbs" *ngIf="it.photos?.length">
                <a class="thumbWrap" *ngFor="let p of it.photos" [href]="p.url" target="_blank" rel="noopener">
                  <img [src]="p.url" class="thumb" alt="photo" />
                </a>
              </div>
            </div>

            <div class="empty" *ngIf="!(vm.itemsBySection[s.id]?.length)">
              No items yet.
            </div>
          </div>

          <div class="empty" *ngIf="!vm.sections?.length">
            No sections yet. Click “+ Section”.
          </div>
        </div>
      </div>

      <aside class="card">
        <div class="h2">Findings</div>

        <div class="card2">
          <div class="h3">New Finding</div>
          <input class="input" placeholder="Summary (required)" [(ngModel)]="newSummary" />
          <input class="input" placeholder="Room/Area (ex: Kitchen)" [(ngModel)]="newRoomArea" />
          <select class="input" [(ngModel)]="newSeverity">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
          <button class="btn" (click)="createFinding(vm.propertyId, vm.inspection.id)">Add</button>
          <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>
        </div>

        <div class="card2">
          <div class="h3">This Inspection</div>
          <div class="muted">{{ (vm.findings?.length || 0) }} finding(s)</div>

          <div class="finding" *ngFor="let f of (vm.findings || [])">
            <div class="finding__top">
              <span class="pill" [class.pill--crit]="f.severity==='critical'">{{ f.severity }}</span>
              <div class="finding__title">{{ f.summary }}</div>
            </div>
            <div class="finding__meta">
              <span class="muted">{{ f.roomArea || '-' }}</span>
              <span class="muted">{{ (f.photos?.length || 0) }} photo(s)</span>
            </div>

            <div class="thumbs" *ngIf="f.photos?.length">
              <img *ngFor="let p of f.photos" [src]="p.url" class="thumb" alt="photo" />
            </div>

            <div class="actions">
              <a class="btn secondary" [routerLink]="['/properties', vm.propertyId, 'inspections', vm.inspection.id, 'findings', f.id]">Open</a>
              <button class="btn green" type="button" [disabled]="!!f.linkedWorkOrderId" (click)="convertToWO(vm.propertyId, vm.inspection.id, f.id)">
                {{ f.linkedWorkOrderId ? 'Work Order Linked' : 'Convert to Work Order' }}
              </button>
            </div>
          </div>
        </div>

        <div class="card2">
          <div class="h3">Signatures</div>
          <div class="muted">Save signatures to include them in the branded PDF report.</div>

          <div class="sigPreview" *ngIf="vm.inspection.signatureInspector?.url">
            <div class="muted">Inspector signature saved</div>
            <img [src]="vm.inspection.signatureInspector.url" class="sigImg" alt="Inspector signature" />
          </div>

          <app-signature-pad
            title="Inspector Signature"
            hint="Draw then click Save."
            (saved)="onSignatureSaved('inspector', $event, vm.propertyId, vm.inspection.id)">
          </app-signature-pad>

          <div class="sigPreview" *ngIf="vm.inspection.signatureClient?.url">
            <div class="muted">Client signature saved</div>
            <img [src]="vm.inspection.signatureClient.url" class="sigImg" alt="Client signature" />
          </div>

          <app-signature-pad
            title="Client Signature"
            hint="Optional."
            (saved)="onSignatureSaved('client', $event, vm.propertyId, vm.inspection.id)">
          </app-signature-pad>

          <a class="btn secondary" [routerLink]="['/properties', vm.propertyId, 'inspections', vm.inspection.id, 'findings', 'new']">Add Finding</a>
        </div>
      </aside>
    </div>
  </ng-container>
  `,
  styles: [
    `
    .grid{ display:grid; grid-template-columns: 1.35fr 1fr; gap:14px; padding:16px; }
    @media (max-width: 1100px){ .grid{ grid-template-columns: 1fr; } }

    .card{ background: rgba(15,23,42,.78); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:14px; }
    .card2{ margin-top:12px; background: rgba(2,6,23,.35); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:12px; }
    .header{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .headerActions{ display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }

    .h1{ font-size:18px; font-weight:900; color:#e5e7eb; }
    .h2{ font-size:14px; font-weight:900; color:#e5e7eb; }
    .h3{ font-size:13px; font-weight:900; color:#e5e7eb; margin-bottom:8px; }
    .muted{ color: rgba(226,232,240,.75); font-size:12px; margin-top:4px; }
    .error{ color:#fb7185; font-weight:800; font-size:12px; margin-top:8px; }

    .input{
      width:100%; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10);
      background: rgba(2,6,23,.25); color:#e5e7eb; outline:none; margin-top:8px;
    }
    .input.sm{ padding:8px 10px; border-radius:10px; font-size:12px; margin-top:0; }

    .btn{
      padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10);
      background: rgba(59,130,246,.85); color:white; font-weight:800; cursor:pointer;
    }
    .btn.secondary{ background: rgba(148,163,184,.20); }
    .btn.green{ background: rgba(34,197,94,.22); border-color: rgba(34,197,94,.35); color:#bbf7d0; }
    .btn.danger{ background: rgba(239,68,68,.16); border-color: rgba(239,68,68,.35); color:#fecaca; }
    .btn.sm{ padding:8px 10px; border-radius:10px; font-size:12px; }
    .btn.ghost{ background: rgba(255,255,255,.06); }
    .btn:disabled{ opacity:.6; cursor:not-allowed; }

    .section{ margin-top:12px; border:1px solid rgba(255,255,255,.06); border-radius:14px; padding:12px; background: rgba(255,255,255,.02); }
    .sectionHead{ display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
    .sectionTitle{ flex: 1; min-width: 240px; }
    .sectionBtns{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }

    .item{ margin-top:12px; border-top:1px solid rgba(255,255,255,.06); padding-top:12px; }
    .itemTop{ display:grid; grid-template-columns: 1fr 120px 90px; gap:10px; align-items:center; }
    @media (max-width: 700px){ .itemTop{ grid-template-columns: 1fr; } }

    .itemPhotosRow{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:10px; flex-wrap:wrap; }
    .miniPills{ display:flex; gap:10px; align-items:center; }

    .pill{
      font-size:11px; padding:6px 10px; border-radius:999px;
      border:1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06);
      color:#e5e7eb; font-weight:900; text-transform: uppercase;
    }
    .pill--crit{ border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.14); color:#fecaca; }
    .pill--pass{ border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.14); color:#bbf7d0; }
    .pill--fail{ border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.14); color:#fecaca; }

    .thumbs{ display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:8px; margin-top:10px; }
    @media (max-width: 560px){ .thumbs{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
    .thumbWrap{ display:block; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,.08); background: rgba(2,6,23,.25); }
    .thumb{ width:100%; height:90px; object-fit:cover; display:block; }

    .finding{ margin-top:12px; border:1px solid rgba(255,255,255,.06); border-radius:14px; padding:12px; background: rgba(255,255,255,.02); }
    .finding__top{ display:flex; gap:10px; align-items:center; }
    .finding__title{ font-weight:900; color:#e5e7eb; }
    .finding__meta{ display:flex; justify-content:space-between; margin-top:8px; }
    .actions{ display:flex; gap:10px; align-items:center; margin-top:10px; flex-wrap:wrap; }

    .file{ width:100%; max-width: 240px; }
    .sigPreview{ margin-top:10px; padding:10px; border-radius:14px; border:1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); }
    .sigImg{ width:100%; max-height:120px; object-fit:contain; display:block; margin-top:8px; border-radius:10px; }
    .empty{ margin-top:10px; padding:10px; border-radius:14px; border:1px dashed rgba(255,255,255,.16); background: rgba(255,255,255,.02); color: rgba(226,232,240,.75); font-size:12px; text-align:center; }
    `
  ]
})
export class InspectionDetailPage {
  private route = inject(ActivatedRoute);

  private inspections = inject(InspectionsService);
  private findings = inject(FindingsService);
  private checklist = inject(InspectionChecklistService);

  newSummary = '';
  newRoomArea = '';
  newSeverity: FindingSeverity = 'medium';
  errorMsg = '';

  vm$ = this.route.paramMap.pipe(
    switchMap(params => {
      const propertyId = (params.get('propertyId') || '').trim();
      const inspectionId = (params.get('inspectionId') || '').trim();

      const inspection$ = this.inspections.get(propertyId, inspectionId);
      const findings$ = this.findings.listByInspection(propertyId, inspectionId);
      const sections$ = this.checklist.listSections(propertyId, inspectionId);

      return combineLatest({ inspection: inspection$, findings: findings$, sections: sections$ }).pipe(
        switchMap(base => {
          const sections = (base.sections || []) as ChecklistSection[];

          if (!sections.length) {
            return of({
              propertyId,
              inspectionId,
              inspection: base.inspection,
              findings: (base.findings || []) as any[],
              sections: [],
              itemsBySection: {} as Record<string, ChecklistItem[]>
            } as Vm);
          }

          const itemStreams = sections.map(s =>
            this.checklist.listItems(propertyId, inspectionId, s.id).pipe(
              map(items => [s.id, items] as const)
            )
          );

          return combineLatest(itemStreams).pipe(
            map(pairs => {
              const itemsBySection: Record<string, ChecklistItem[]> = {};
              for (const [sid, items] of pairs) itemsBySection[sid] = items;
              return {
                propertyId,
                inspectionId,
                inspection: base.inspection,
                findings: (base.findings || []) as any[],
                sections,
                itemsBySection
              } as Vm;
            })
          );
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    })
  );

  async markInProgress(propertyId: string, inspectionId: string) {
    await this.inspections.update(propertyId, inspectionId, { status: 'in_progress', startedAt: Date.now() } as any);
  }

  // Checklist actions
  async addSection(propertyId: string, inspectionId: string) {
    await this.checklist.addSection(propertyId, inspectionId, 'New Section');
  }
  async renameSection(propertyId: string, inspectionId: string, sectionId: string, title: string) {
    const t = (title || '').trim();
    if (!t) return;
    await this.checklist.renameSection(propertyId, inspectionId, sectionId, t);
  }
  async deleteSection(propertyId: string, inspectionId: string, sectionId: string) {
    await this.checklist.deleteSection(propertyId, inspectionId, sectionId);
  }
  async addItem(propertyId: string, inspectionId: string, sectionId: string) {
    await this.checklist.addItem(propertyId, inspectionId, sectionId, 'New item');
  }
  async updateItem(propertyId: string, inspectionId: string, sectionId: string, itemId: string, patch: Partial<ChecklistItem>) {
    await this.checklist.updateItem(propertyId, inspectionId, sectionId, itemId, patch);
  }
  async deleteItem(propertyId: string, inspectionId: string, sectionId: string, itemId: string) {
    await this.checklist.deleteItem(propertyId, inspectionId, sectionId, itemId);
  }
  async onChecklistPhoto(evt: Event, propertyId: string, inspectionId: string, sectionId: string, itemId: string) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.checklist.addItemPhoto({ propertyId, inspectionId, sectionId, itemId, file });
    input.value = '';
  }

  // Findings actions
  async createFinding(propertyId: string, inspectionId: string) {
    this.errorMsg = '';
    const summary = (this.newSummary || '').trim();
    if (!summary) {
      this.errorMsg = 'Summary is required.';
      return;
    }

    await this.findings.createUnderInspection(propertyId, inspectionId, {
      propertyId,
      summary,
      roomArea: (this.newRoomArea || '').trim(),
      severity: this.newSeverity
    } as any);

    this.newSummary = '';
    this.newRoomArea = '';
    this.newSeverity = 'medium';
  }

  async convertToWO(propertyId: string, inspectionId: string, findingId: string) {
    await this.findings.convertToWorkOrder(propertyId, inspectionId, findingId);
  }

  async onSignatureSaved(kind: 'inspector' | 'client', file: File, propertyId: string, inspectionId: string) {
    await this.inspections.uploadSignature({ propertyId, inspectionId, kind, file });
  }
}
