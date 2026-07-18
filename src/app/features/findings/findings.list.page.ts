import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, Observable } from 'rxjs';
import { map, switchMap, shareReplay } from 'rxjs/operators';

import { FindingsService } from './findings.service';
import { Finding } from '../../core/models/finding.models';

type Vm = {
  propertyId: string;
  inspectionId: string;
  findings: Finding[];
};

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <ng-container *ngIf="vm$ | async as vm">
    <div class="page">
      <div class="head">
        <div>
          <div class="h1">Findings</div>
          <div class="muted">Property: <span class="mono">{{ vm.propertyId | slice:0:10 }}</span> • Inspection: <span class="mono">{{ vm.inspectionId | slice:0:10 }}</span></div>
        </div>
        <a class="btn" [routerLink]="['/properties', vm.propertyId, 'inspections', vm.inspectionId, 'findings', 'new']">+ New Finding</a>
      </div>

      <div class="list" *ngIf="vm.findings.length; else empty">
        <div class="row" *ngFor="let f of vm.findings">
          <div class="rowMain">
            <div class="title">
              <span class="pill" [class.pill--crit]="f.severity==='critical'">{{ f.severity }}</span>
              <span class="txt">{{ f.summary }}</span>
            </div>
            <div class="meta">
              <span>{{ f.roomArea || '-' }}</span>
              <span>Photos: {{ f.photos?.length || 0 }}</span>
              <span *ngIf="f.linkedWorkOrderId">WO: {{ f.linkedWorkOrderId | slice:0:10 }}</span>
            </div>
          </div>

          <div class="rowActions">
            <a class="btn sm secondary" [routerLink]="['/properties', vm.propertyId, 'inspections', vm.inspectionId, 'findings', f.id]">Open</a>
            <button class="btn sm green" type="button" [disabled]="!!f.linkedWorkOrderId" (click)="convert(vm.propertyId, vm.inspectionId, f.id)">
              {{ f.linkedWorkOrderId ? 'Converted' : 'To Work Order' }}
            </button>
            <button class="btn sm danger" type="button" (click)="remove(vm.propertyId, vm.inspectionId, f.id)">Delete</button>
          </div>
        </div>
      </div>

      <ng-template #empty>
        <div class="empty">No findings yet.</div>
      </ng-template>
    </div>
  </ng-container>
  `,
  styles: [`
    .page{ padding:16px; }
    .head{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap; }
    .h1{ font-size:18px; font-weight:900; color:#e5e7eb; }
    .muted{ color: rgba(226,232,240,.75); font-size:12px; margin-top:4px; }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

    .list{ margin-top:12px; display:flex; flex-direction:column; gap:10px; }
    .row{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;
          background: rgba(15,23,42,.78); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:12px; }
    .rowMain{ flex:1; min-width: 280px; }
    .title{ display:flex; gap:10px; align-items:center; }
    .txt{ color:#e5e7eb; font-weight:900; }
    .meta{ margin-top:8px; display:flex; gap:12px; flex-wrap:wrap; color: rgba(226,232,240,.75); font-size:12px; }

    .rowActions{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

    .pill{ font-size:11px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.12);
           background: rgba(255,255,255,.06); color:#e5e7eb; font-weight:900; text-transform: uppercase; }
    .pill--crit{ border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.14); color:#fecaca; }

    .btn{ padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(59,130,246,.85);
          color:white; font-weight:800; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
    .btn.secondary{ background: rgba(148,163,184,.20); }
    .btn.green{ background: rgba(34,197,94,.22); border-color: rgba(34,197,94,.35); color:#bbf7d0; }
    .btn.danger{ background: rgba(239,68,68,.16); border-color: rgba(239,68,68,.35); color:#fecaca; }
    .btn.sm{ padding:8px 10px; border-radius:10px; font-size:12px; }
    .btn:disabled{ opacity:.6; cursor:not-allowed; }

    .empty{ margin-top:12px; padding:12px; border-radius:14px; border:1px dashed rgba(255,255,255,.15); color:#94a3b8;
            background: rgba(255,255,255,.02); text-align:center; }
  `]
})
export class FindingsListPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private findingsSvc = inject(FindingsService);

  vm$: Observable<Vm> = this.route.paramMap.pipe(
    map(pm => ({
      propertyId: (pm.get('propertyId') || '').trim(),
      inspectionId: (pm.get('inspectionId') || '').trim()
    })),
    switchMap(({ propertyId, inspectionId }) =>
      combineLatest([
        this.findingsSvc.listByInspection(propertyId, inspectionId)
      ]).pipe(
        map(([findings]) => ({ propertyId, inspectionId, findings: (findings as any) || [] } as Vm))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  async convert(propertyId: string, inspectionId: string, findingId: string) {
    await this.findingsSvc.convertToWorkOrder(propertyId, inspectionId, findingId);
  }

  async remove(propertyId: string, inspectionId: string, findingId: string) {
    await this.findingsSvc.remove(propertyId, inspectionId, findingId);
  }
}
