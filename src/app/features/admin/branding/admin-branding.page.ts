import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandingService } from '../../../core/branding/branding.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="grid">
    <div class="card">
      <div class="header">
        <div>
          <div class="h1">Branding</div>
          <div class="sub">Organization branding for the app and PDF reports</div>
        </div>
      </div>

      <div class="section">
        <div class="label">Logo</div>
        <div class="logo-row">
          <img class="logo-preview" [src]="logoUrl" alt="Org logo" />
          <div class="logo-actions">
            <input type="file" accept="image/png,image/jpeg" (change)="onLogoSelected($event)" />
            <div class="hint">
              Recommended: PNG, square (512×512). This file is stored at
              <span class="mono">orgs/&#123;orgId&#125;/branding/logo.png</span>.
            </div>
            <div class="status" *ngIf="status">{{status}}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="label">Organization Name</div>
        <input class="input" [(ngModel)]="orgName" placeholder="e.g., InnovaProInspec" />
      </div>

      <div class="section">
        <div class="label">Tagline</div>
        <input class="input" [(ngModel)]="tagline" placeholder="e.g., Home Inspection Platform" />
      </div>

      <div class="actions">
        <button class="btn" (click)="saveText()">Save</button>
      </div>
    </div>

    <div class="card">
      <div class="h2">Preview</div>
      <div class="preview">
        <div class="brand">
          <img class="brand-logo" [src]="logoUrl" alt="Org logo" />
          <div>
            <div class="brand-name">{{ orgName || 'Organization Name' }}</div>
            <div class="brand-tagline">{{ tagline || 'Tagline' }}</div>
          </div>
        </div>
        <div class="muted">This preview matches the sidebar brand block.</div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .grid{ display:grid; grid-template-columns: 1fr 420px; gap:14px; }
    .card{ background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:18px; padding:16px; }
    .header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .h1{ font-size:18px; font-weight:900; color:#f8fafc; }
    .h2{ font-size:13px; font-weight:900; color:#e2e8f0; margin-bottom:10px; }
    .sub{ color:#94a3b8; font-size:12px; margin-top:2px; }

    .section{ margin-top:14px; }
    .label{ font-weight:900; font-size:12px; color:#cbd5e1; margin-bottom:8px; }
    .input{ width:100%; padding:10px 12px; border-radius:12px; background: rgba(2,6,23,.35); color:#e5e7eb;
      border:1px solid rgba(255,255,255,.08); outline:none; }

    .logo-row{ display:flex; gap:12px; align-items:flex-start; }
    .logo-preview{ width:76px; height:76px; border-radius:18px; object-fit:cover; border:1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.04); }
    .logo-actions{ flex:1; display:flex; flex-direction:column; gap:8px; }
    .hint{ color:#94a3b8; font-size:12px; }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas; }
    .status{ color:#dbeafe; font-size:12px; }

    .actions{ margin-top:16px; display:flex; justify-content:flex-end; }
    .btn{ padding:10px 14px; border-radius:12px; border:1px solid rgba(59,130,246,.35);
      background: rgba(59,130,246,.18); color:#dbeafe; font-weight:900; cursor:pointer; }

    .preview{ padding:12px; border-radius:14px; background: rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); }
    .brand{ display:flex; align-items:center; gap:10px; }
    .brand-logo{ width:44px; height:44px; border-radius:12px; object-fit:cover; border:1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.04); }
    .brand-name{ font-weight:900; font-size:13px; color:#f8fafc; }
    .brand-tagline{ margin-top:3px; font-size:11px; color:#94a3b8; }
    .muted{ margin-top:10px; color:#94a3b8; font-size:12px; }
  `]
})
export class AdminBrandingPage {
  private branding = inject(BrandingService);

  logoUrl = 'assets/brand/default-logo.svg';
  orgName = '';
  tagline = '';
  status = '';

  constructor() {
    this.branding.settings$().subscribe((s) => {
      this.logoUrl = (s?.logoUrl && String(s.logoUrl).trim()) ? String(s.logoUrl) : 'assets/brand/default-logo.svg';
      this.orgName = s?.orgName ?? this.orgName;
      this.tagline = s?.tagline ?? this.tagline;
    });
  }

  async onLogoSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.status = 'Uploading logo...';
    try {
      await this.branding.uploadOrgLogo(file);
      this.status = 'Logo updated.';
    } catch (e: any) {
      this.status = `Upload failed: ${e?.message ?? e}`;
    } finally {
      input.value = '';
    }
  }

  async saveText() {
    this.status = 'Saving...';
    try {
      await this.branding.updateBranding({
        orgName: (this.orgName || '').trim() || null,
        tagline: (this.tagline || '').trim() || null,
      } as any);
      this.status = 'Saved.';
    } catch (e: any) {
      this.status = `Save failed: ${e?.message ?? e}`;
    }
  }
}
