import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SaBarChartComponent, KpiSeriesPoint } from './sa-bar-chart.component';
import { BrandingDoc, MemberRow, OrgDoc, OrgTotals, SuperAdminOrgDetailService } from './super-admin-org-detail.service';


type TabKey = 'branding' | 'members' | 'kpi' | 'actions';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SaBarChartComponent],
  template: `
  <div class="page">
    <div class="top">
      <div>
        <div class="back" (click)="goBack()">← Back</div>
        <div class="h1">Organization Details</div>
        <div class="sub">
          <span class="mono">{{ orgId }}</span>
          <span class="dot">•</span>
          <span>{{ org?.name || '—' }}</span>
        </div>
      </div>

      <div class="right">
        <button class="btn" (click)="reload()">Refresh</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" [class.active]="tab==='branding'" (click)="setTab('branding')">Branding</button>
      <button class="tab" [class.active]="tab==='members'"  (click)="setTab('members')">Members</button>
      <button class="tab" [class.active]="tab==='kpi'"      (click)="setTab('kpi')">KPI</button>
      <button class="tab" [class.active]="tab==='actions'"  (click)="setTab('actions')">Actions</button>
    </div>

    <!-- BRANDING -->
    <div class="grid" *ngIf="tab==='branding'">
      <div class="panel">
        <div class="panel-title">Branding</div>
        <div class="panel-sub">Edit org name/logo/color used in the UI.</div>

        <div class="form">
          <label class="lbl">Organization name</label>
          <input class="input" [(ngModel)]="brandingDraft.name" placeholder="Organization Name" />

          <label class="lbl">Logo URL</label>
          <input class="input" [(ngModel)]="brandingDraft.logoUrl" placeholder="https://..." />

          <label class="lbl">Primary color</label>
          <input class="input" [(ngModel)]="brandingDraft.primaryColor" placeholder="#6366f1" />

          <div class="row">
            <button class="btn" (click)="saveBranding()" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Save branding' }}
            </button>
            <button class="btn ghost" (click)="resetBranding()" [disabled]="saving">Reset</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Preview</div>
        <div class="panel-sub">Quick visual check</div>

        <div class="preview">
          <div class="logo" *ngIf="brandingDraft.logoUrl">
            <img [src]="brandingDraft.logoUrl" alt="logo" />
          </div>
          <div class="pname">{{ brandingDraft.name || 'Organization Name' }}</div>
          <div class="color">
            <span class="swatch" [style.background]="brandingDraft.primaryColor || '#6366f1'"></span>
            <span class="mono">{{ brandingDraft.primaryColor || '#6366f1' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MEMBERS -->
    <div *ngIf="tab==='members'">
      <div class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">Members</div>
            <div class="panel-sub">Org members list (first {{ membersMax }}).</div>
          </div>
        </div>

        <div class="table">
          <div class="tr th">
            <div class="td">UID</div>
            <div class="td">Role</div>
            <div class="td">Status</div>
            <div class="td">Created</div>
          </div>

          <div class="tr" *ngFor="let m of members">
            <div class="td mono">{{ m.uid }}</div>
            <div class="td">{{ m.role || '—' }}</div>
            <div class="td">{{ m.status || '—' }}</div>
            <div class="td">{{ formatDate(m.createdAt) }}</div>
          </div>

          <div class="empty" *ngIf="!members?.length">No members found.</div>
        </div>
      </div>
    </div>

    <!-- KPI -->
    <div *ngIf="tab==='kpi'">
      <div class="grid kpis">
        <div class="kpi">
          <div class="kpi-l">Members</div>
          <div class="kpi-v">{{ totals?.members ?? '—' }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-l">Inspections</div>
          <div class="kpi-v">{{ totals?.inspections ?? '—' }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-l">Work Orders</div>
          <div class="kpi-v">{{ totals?.workOrders ?? '—' }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-l">Reports</div>
          <div class="kpi-v">{{ totals?.reports ?? '—' }}</div>
        </div>
      </div>

      <div class="grid charts">
        <sa-bar-chart
          title="Sample KPI (placeholder)"
          subtitle="Replace with per-day trend later"
          [data]="kpiDummy"
        ></sa-bar-chart>

        <div class="panel">
          <div class="panel-title">Setup Checklist</div>
          <ul class="list">
            <li>Branding doc exists: <b>{{ brandingExists ? 'Yes' : 'No' }}</b></li>
            <li>Members readable: <b>{{ membersLoaded ? 'Yes' : 'No' }}</b></li>
            <li>Counts (aggregation) enabled: <b>{{ totals ? 'Yes' : 'No' }}</b></li>
          </ul>
        </div>
      </div>
    </div>

   <!-- ACTIONS -->
<div *ngIf="tab==='actions'">
  <div class="panel">
    <div class="panel-title">Actions</div>
    <div class="panel-sub">Administrative actions for this organization.</div>

    <div class="actions">
      <button class="btn" (click)="setTab('branding')">Review branding</button>

     <button class="btn" (click)="manageMembers()">Manage members</button>

<button class="btn" (click)="openAsOrgMember()">Open org as member</button>


    <div class="note">
      “Open org as member” doit être fait via un flow sécurisé (impersonation) ou un rôle temporaire,
      pas juste en changeant lastOrgId côté client.
    </div>

    <div class="sub" *ngIf="actionMessage" style="margin-top:10px;">
      {{ actionMessage }}
    </div>
  </div>
</div>

  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:14px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
    .back{opacity:.75;cursor:pointer;margin-bottom:6px}
    .back:hover{opacity:1}
    .h1{font-size:22px;font-weight:900}
    .sub{opacity:.75;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .dot{opacity:.5}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:12px}
    .right{display:flex;gap:8px;align-items:center}
    .btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:#e5e7eb;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer}
    .btn:hover{background:rgba(255,255,255,.09)}
    .btn.ghost{opacity:.55;cursor:not-allowed}
    .tabs{display:flex;gap:8px;flex-wrap:wrap}
    .tab{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#e5e7eb;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer;opacity:.8}
    .tab.active{opacity:1;background:rgba(255,255,255,.07)}
    .grid{display:grid;gap:12px}
    .kpis{grid-template-columns:repeat(4,minmax(0,1fr))}
    .kpi{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
    .kpi-l{opacity:.75;font-size:12px}
    .kpi-v{font-size:22px;font-weight:900;margin-top:6px}
    .charts{grid-template-columns:2fr 1fr;align-items:start}
    .panel{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
    .panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}
    .panel-title{font-weight:900;margin-bottom:6px}
    .panel-sub{opacity:.7;font-size:12px;margin-bottom:10px}
    .form{display:flex;flex-direction:column;gap:10px}
    .lbl{font-size:12px;opacity:.8}
    .input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.20);color:#e5e7eb;outline:none}
    .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
    .preview{display:flex;flex-direction:column;gap:10px}
    .logo{width:84px;height:84px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.20);display:flex;align-items:center;justify-content:center}
    .logo img{width:100%;height:100%;object-fit:contain}
    .pname{font-size:18px;font-weight:900}
    .color{display:flex;align-items:center;gap:10px}
    .swatch{width:18px;height:18px;border-radius:6px;border:1px solid rgba(255,255,255,.15)}
    .list{margin:0;padding-left:18px;opacity:.85}
    .actions{display:flex;gap:10px;flex-wrap:wrap}
    .note{margin-top:10px;opacity:.75;font-size:12px;line-height:1.4}
    .table{display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden}
    .tr{display:grid;grid-template-columns:1.4fr .6fr .6fr .7fr;gap:10px;align-items:center;padding:10px 12px;background:rgba(255,255,255,.02)}
    .tr + .tr{border-top:1px solid rgba(255,255,255,.06)}
    .th{background:rgba(255,255,255,.04);font-weight:800;font-size:12px;opacity:.9}
    .td{min-width:0}

    .btn.ghost{
  opacity: .9;
  cursor: pointer;
  border-style: dashed;
}
.btn.ghost:hover{
  opacity: 1;
  background: rgba(255,255,255,.09);
}
.btn:disabled{
  opacity:.55;
  cursor:not-allowed;
}

    .empty{padding:12px;opacity:.75}
    .error{padding:10px 12px;border-radius:12px;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35)}
    @media (max-width: 1100px){
      .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
      .charts{grid-template-columns:1fr}
      .tr{grid-template-columns:1fr}
      .th{display:none}
    }
  `]
})
export class SuperAdminOrgDetailPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(SuperAdminOrgDetailService);

  orgId = '';
  tab: TabKey = 'branding';

  org: OrgDoc | null = null;

  branding: BrandingDoc | null = null;
  brandingDraft: BrandingDoc = { orgId: '', name: '', logoUrl: '', primaryColor: '#6366f1' };
  brandingExists = false;

  members: MemberRow[] = [];
  membersMax = 50;
  membersLoaded = false;

  totals: OrgTotals | null = null;

  // placeholder chart data (replace later with real trend)
  kpiDummy: KpiSeriesPoint[] = [
    { label: 'D-6', value: 1 },
    { label: 'D-5', value: 3 },
    { label: 'D-4', value: 2 },
    { label: 'D-3', value: 5 },
    { label: 'D-2', value: 2 },
    { label: 'D-1', value: 4 },
    { label: 'Today', value: 1 },
  ];

  saving = false;
  opening = false;
  actionMessage = '';
  error = '';

  constructor() {
    this.orgId = this.route.snapshot.paramMap.get('orgId') || '';
    const tab = (this.route.snapshot.queryParamMap.get('tab') || 'branding') as TabKey;
    this.tab = (['branding','members','kpi','actions'] as TabKey[]).includes(tab) ? tab : 'branding';
    this.reload();
  }

  setTab(tab: TabKey) {
    this.tab = tab;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
  }

  goBack() {
    this.router.navigateByUrl('/setup');
  }

  async reload() {
    this.error = '';
    this.membersLoaded = false;
    try {
      this.org = await this.svc.getOrg(this.orgId);

      this.branding = await this.svc.getBranding(this.orgId);
      this.brandingExists = !!this.branding;

      // prepare draft
      this.brandingDraft = {
        orgId: this.orgId,
        name: this.branding?.name || this.org?.name || '',
        logoUrl: this.branding?.logoUrl || '',
        primaryColor: this.branding?.primaryColor || '#6366f1',
      };

      // members + totals
      this.members = await this.svc.listMembers(this.orgId, this.membersMax);
      this.membersLoaded = true;

      // KPI totals (aggregation)
      this.totals = await this.svc.getOrgTotals(this.orgId);

    } catch (e: any) {
      this.error = e?.message ?? 'Failed to load org details';
    }
  }

  resetBranding() {
    this.brandingDraft = {
      orgId: this.orgId,
      name: this.branding?.name || this.org?.name || '',
      logoUrl: this.branding?.logoUrl || '',
      primaryColor: this.branding?.primaryColor || '#6366f1',
    };
  }

  async saveBranding() {
    this.error = '';
    this.saving = true;
    try {
      await this.svc.saveBranding(this.orgId, {
        name: (this.brandingDraft.name || '').trim(),
        logoUrl: (this.brandingDraft.logoUrl || '').trim(),
        primaryColor: (this.brandingDraft.primaryColor || '').trim() || '#6366f1',
      });

      this.branding = await this.svc.getBranding(this.orgId);
      this.brandingExists = !!this.branding;
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to save branding';
    } finally {
      this.saving = false;
    }
  }

manageMembers() {
  this.router.navigateByUrl(`/super-admin/orgs/${this.orgId}/members`);
}

async openAsOrgMember() {
  this.error = '';
  this.actionMessage = '';
  this.opening = true;
  try {
    this.svc.impersonateOrg(this.orgId); // set org + reload
  } catch (e: any) {
    this.error = e?.message ?? 'Failed to open organization.';
  } finally {
    this.opening = false;
  }
}
  formatDate(v: any): string {
    if (!v) return '—';
    const d = typeof v?.toDate === 'function' ? v.toDate() : (v instanceof Date ? v : null);
    if (!d) return '—';
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }
}
