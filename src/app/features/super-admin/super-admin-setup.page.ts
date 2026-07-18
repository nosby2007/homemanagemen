import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminOrgsService } from './super-admin-orgs.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page">
    <div class="head">
      <div>
        <div class="h1">Setup / Organizations</div>
        <div class="sub">Create organizations and initialize branding</div>
      </div>
      <button class="btn" (click)="reload()">Refresh</button>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Create Organization</div>

        <label class="lbl">Org ID (slug)</label>
        <input class="input" [(ngModel)]="orgId" placeholder="INNOVA_HOME_INSPECTIONS" />

        <label class="lbl">Name</label>
        <input class="input" [(ngModel)]="name" placeholder="Innova Home Inspections" />

        <label class="lbl">Logo URL (optional)</label>
        <input class="input" [(ngModel)]="logoUrl" placeholder="https://..." />

        <label class="lbl">Primary color (optional)</label>
        <input class="input" [(ngModel)]="primaryColor" placeholder="#6366f1" />

        <label class="lbl">Seed Admin UID (optional)</label>
        <input class="input" [(ngModel)]="seedAdminUid" placeholder="Firebase Auth UID" />

        <button class="btn primary" (click)="create()">Create</button>
        <div class="error" *ngIf="error">{{ error }}</div>
        <div class="ok" *ngIf="ok">{{ ok }}</div>
      </div>

      <div class="card">
        <div class="card-title">Organizations</div>

        <div class="table">
          <div class="row headrow">
            <div>Org ID</div>
            <div>Name</div>
            <div></div>
          </div>

          <div class="row" *ngFor="let o of orgs">
            <div class="mono">{{ o.id }}</div>
            <div>{{ o.name || '—' }}</div>
            <div class="actions">
              <button class="btn small" (click)="open(o.id)">Open</button>
            </div>
          </div>

          <div class="empty" *ngIf="!orgs.length">No organizations yet.</div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:14px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
    .h1{font-size:22px;font-weight:900}
    .sub{opacity:.85;margin-top:4px;color:#64748b}
    .grid{display:grid;grid-template-columns:1fr 1.2fr;gap:12px;align-items:start}
    .card{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:14px}
    .card-title{font-weight:900;margin-bottom:10px}
    .lbl{display:block;opacity:.8;font-size:12px;margin:10px 0 6px}
    .input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid #cbd5e1;background:#ffffff;color:#0f172a;outline:none}
    .btn{background:#ffffff;border:1px solid #cbd5e1;color:#0f172a;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer}
    .btn:hover{background:#eff6ff;border-color:#93c5fd}
    .primary{background:linear-gradient(135deg,#0f4c81,#1d8f8a);border-color:#0f4c81;color:#ffffff}
    .primary:hover{filter:brightness(1.05)}
    .small{padding:8px 10px;border-radius:10px;font-weight:800}
    .error{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35)}
    .ok{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.35)}
    .table{margin-top:8px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0}
    .row{display:grid;grid-template-columns:1.1fr 1.3fr .7fr;gap:10px;padding:10px 12px;border-top:1px solid #eef2f7;align-items:center;background:#ffffff}
    .headrow{background:#f8fafc;border-top:none;font-weight:900}
    .actions{display:flex;justify-content:flex-end}
    .mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;font-size:12px}
    .empty{padding:14px;opacity:.75}
    @media (max-width: 1100px){ .grid{grid-template-columns:1fr} }
  `]
})
export class SuperAdminSetupPage {
  private svc = inject(SuperAdminOrgsService);
  private router = inject(Router);

  orgId = '';
  name = '';
  logoUrl = '';
  primaryColor = '#0f4c81';
  seedAdminUid = '';

  orgs: OrgRow[] = [];
  error = '';
  ok = '';

  constructor() {
    this.reload();
  }

  async reload() {
    this.error = '';
    this.ok = '';
    try {
      this.orgs = await this.svc.listOrgs();
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to load orgs';
    }
  }

  async create() {
    this.error = '';
    this.ok = '';
    try {
      if (!this.orgId.trim()) throw new Error('orgId is required');
      if (!this.name.trim()) throw new Error('name is required');

      await this.svc.createOrg({
        orgId: this.orgId,
        name: this.name,
        logoUrl: this.logoUrl,
        primaryColor: this.primaryColor,
        seedAdminUid: this.seedAdminUid
      });

      this.ok = 'Organization created';
      this.orgId = '';
      this.name = '';
      this.logoUrl = '';
      this.seedAdminUid = '';
      await this.reload();
    } catch (e: any) {
      this.error = e?.message ?? 'Create failed';
    }
  }

  open(orgId: string) {
    this.router.navigate(['/super-admin/orgs', orgId]);
  }
}

interface OrgRow {
  id: string;
  name?: string;
}
