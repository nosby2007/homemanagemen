import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';

import { AssetsService } from './assets.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="card">
    <div class="header">
      <div>
        <div class="h1">Assets</div>
        <div class="muted">Property assets inventory</div>
      </div>
      <a class="btn secondary" routerLink="/assets/new">Add Asset</a>
    </div>

    <div class="toolbar">
      <input class="input" placeholder="Search name / serial / room / manufacturer..."
             [(ngModel)]="q" />
    </div>

    <div class="list" *ngIf="vm$ | async as vm">
      <div class="row head">
        <div>Name</div>
        <div>Property</div>
        <div>Category</div>
        <div>Status</div>
        <div>Updated</div>
        <div></div>
      </div>

      <a class="row" *ngFor="let a of vm.items" [routerLink]="['/assets', a.id]">
        <div class="name">
          <div class="title">{{a.name}}</div>
          <div class="sub">
            {{a.roomArea || '-'}} • {{a.manufacturer || '-'}} • {{a.model || '-'}} • SN: {{a.serial || '-'}}
          </div>
        </div>
        <div class="mono">{{a.propertyId}}</div>
        <div class="pill">{{a.category}}</div>
        <div class="pill" [class.pill--ok]="a.status==='active'" [class.pill--off]="a.status!=='active'">{{a.status}}</div>
        <div class="muted">{{a.updatedAt ? (a.updatedAt | date:'short') : '-'}}</div>

        <button class="btn danger" type="button" (click)="del($event, a.id)">Delete</button>
      </a>

      <div class="empty" *ngIf="!vm.items.length">
        No assets yet. Click “Add Asset”.
      </div>
    </div>
  </div>
  `,
  styles: [`
    .card{ background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:18px; padding:16px; }
    .header{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .h1{ font-size:18px; font-weight:900; color:#f8fafc; }
    .muted{ color:#94a3b8; font-size:12px; }
    .toolbar{ margin-top:12px; }
    .input{ width:100%; padding:10px 12px; border-radius:12px; background: rgba(2,6,23,.35); color:#e5e7eb;
      border:1px solid rgba(255,255,255,.08); outline:none; }
    .btn{ padding:10px 14px; border-radius:12px; border:1px solid rgba(59,130,246,.35);
      background: rgba(59,130,246,.18); color:#dbeafe; font-weight:900; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
    .btn.secondary{ border-color: rgba(148,163,184,.35); background: rgba(148,163,184,.12); color:#e2e8f0; }
    .btn.danger{ border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.12); color:#fecaca; }

    .list{ margin-top:12px; display:flex; flex-direction:column; gap:8px; }
    .row{ display:grid; grid-template-columns: 2.2fr 1.4fr 1fr 1fr 1.2fr auto;
      gap:10px; align-items:center; padding:12px; border-radius:14px; text-decoration:none;
      background: rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); }
    .row:hover{ border-color: rgba(255,255,255,.10); }
    .row.head{ background: transparent; border:none; padding:0 12px; color:#94a3b8; font-size:11px; font-weight:900; }
    .name .title{ color:#f8fafc; font-weight:900; }
    .name .sub{ color:#94a3b8; font-size:11px; margin-top:2px; }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas; color:#e2e8f0; font-size:12px; }
    .pill{ display:inline-flex; padding:6px 10px; border-radius:999px; font-size:11px; font-weight:900;
      border:1px solid rgba(255,255,255,.08); color:#e2e8f0; justify-self:start; }
    .pill--ok{ border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.10); color:#bbf7d0; }
    .pill--off{ border-color: rgba(148,163,184,.35); background: rgba(148,163,184,.10); color:#e2e8f0; }
    .empty{ margin-top:12px; padding:14px; border-radius:14px; border:1px dashed rgba(255,255,255,.12); color:#94a3b8; }
  `]
})
export class AssetsListPage {
  private assets = inject(AssetsService);

  q = '';

  private items$ = this.assets.listOrgLatest();
  vm$ = this.items$.pipe(
    map((items: any[]) => {
      const query = (this.q || '').trim().toLowerCase();
      const filtered = !query ? items : items.filter(a => {
        const hay = [
          a?.name, a?.serial, a?.roomArea, a?.manufacturer, a?.model, a?.propertyId, a?.category, a?.status
        ].map(x => String(x ?? '').toLowerCase()).join(' ');
        return hay.includes(query);
      });
      return { items: filtered };
    }),
    startWith({ items: [] })
  );

  async del(ev: MouseEvent, id: string) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!confirm('Delete this asset?')) return;
    await this.assets.remove(id);
  }
}
