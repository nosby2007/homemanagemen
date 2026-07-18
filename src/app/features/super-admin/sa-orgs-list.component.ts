import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SaOrgRow = {
  id: string;               // orgId (doc id)
  name?: string;
  createdAt?: any;
};

@Component({
  standalone: true,
  selector: 'sa-orgs-list',
  imports: [CommonModule],
  template: `
    <div class="panel">
      <div class="panel-head">
        <div>
          <div class="panel-title">Organizations</div>
          <div class="panel-sub">OrgId, key details, and actions</div>
        </div>
      </div>

      <div class="table">
        <div class="tr th">
          <div class="td">OrgId</div>
          <div class="td">Name</div>
          <div class="td">Created</div>
          <div class="td actions">Actions</div>
        </div>

        <div class="tr" *ngFor="let o of orgs">
          <div class="td mono">{{ o.id }}</div>
          <div class="td">{{ o.name || '—' }}</div>
          <div class="td">{{ formatDate(o.createdAt) }}</div>

          <div class="td actions">
            <button class="btn sm" (click)="reviewBranding(o.id)">Review branding</button>
            <button class="btn sm" (click)="manageMembers(o.id)">Manage members</button>
            <button class="btn sm" (click)="openOrgAsMember(o.id)">Open org as member</button>
          </div>
        </div>

        <div class="empty" *ngIf="!orgs?.length">
          No organizations found.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:14px}
    .panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}
    .panel-title{font-weight:900}
    .panel-sub{opacity:.85;font-size:12px;margin-top:3px;color:#64748b}
    .table{display:flex;flex-direction:column;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
    .tr{display:grid;grid-template-columns:1.2fr 1fr .8fr 1.9fr;gap:10px;align-items:center;padding:10px 12px;background:#ffffff}
    .tr + .tr{border-top:1px solid #eef2f7}
    .th{background:#f8fafc;font-weight:800;font-size:12px;opacity:.95}
    .td{min-width:0}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:12px; opacity:.95}
    .actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
    .btn{background:#ffffff;border:1px solid #cbd5e1;color:#0f172a;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer}
    .btn:hover{background:#eff6ff;border-color:#93c5fd}
    .btn.sm{padding:8px 10px;border-radius:10px;font-size:12px}
    .empty{padding:12px;opacity:.75}
    @media (max-width: 1100px){
      .tr{grid-template-columns:1fr}
      .actions{justify-content:flex-start}
      .th{display:none}
    }
  `]
})
export class SaOrgsListComponent {
  @Input() orgs: SaOrgRow[] = [];

  @Input() onNavigateToBranding?: (orgId: string) => void;
  @Input() onManageMembers?: (orgId: string) => void;
  @Input() onOpenOrgAsMember?: (orgId: string) => void;

  reviewBranding(orgId: string) {
    this.onNavigateToBranding?.(orgId);
  }

  manageMembers(orgId: string) {
    this.onManageMembers?.(orgId);
  }

  openOrgAsMember(orgId: string) {
    this.onOpenOrgAsMember?.(orgId);
  }

  formatDate(v: any): string {
    if (!v) return '—';
    const d = typeof v?.toDate === 'function' ? v.toDate() : (v instanceof Date ? v : null);
    if (!d) return '—';
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }
}
