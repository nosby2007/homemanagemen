import { Component, inject, DoCheck } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { of, from } from 'rxjs';

import { AssetsService } from './assets.service';
import { AssetCategory, AssetStatus } from '../../core/models/asset.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="card" *ngIf="vm$ | async as vm">
    <div class="header">
      <div>
        <div class="h1">{{ vm.isNew ? 'Add Asset' : 'Edit Asset' }}</div>

        <!-- ✅ Escape braces -->
        <div class="muted">
          Stored at
          <span class="mono">
            orgs/{{ '{' }}orgId{{ '}' }}/assets/{{ '{' }}assetId{{ '}' }}
          </span>
        </div>
      </div>

      <button class="btn secondary" type="button" (click)="back()">Back</button>
    </div>

    <div class="grid">
      <div class="section">
        <div class="label">Property ID *</div>
        <input class="input" [(ngModel)]="propertyId" placeholder="e.g., PROP_001" />
      </div>

      <div class="section">
        <div class="label">Name *</div>
        <input class="input" [(ngModel)]="name" placeholder="e.g., Water Heater" />
      </div>

      <div class="section">
        <div class="label">Category *</div>
        <select class="input" [(ngModel)]="category">
          <option value="appliance">appliance</option>
          <option value="hvac">hvac</option>
          <option value="plumbing">plumbing</option>
          <option value="electrical">electrical</option>
          <option value="structure">structure</option>
          <option value="safety">safety</option>
          <option value="other">other</option>
        </select>
      </div>

      <div class="section">
        <div class="label">Status *</div>
        <select class="input" [(ngModel)]="status">
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="retired">retired</option>
        </select>
      </div>

      <div class="section">
        <div class="label">Room/Area</div>
        <input class="input" [(ngModel)]="roomArea" placeholder="e.g., Basement" />
      </div>

      <div class="section">
        <div class="label">Manufacturer</div>
        <input class="input" [(ngModel)]="manufacturer" placeholder="e.g., Rheem" />
      </div>

      <div class="section">
        <div class="label">Model</div>
        <input class="input" [(ngModel)]="model" placeholder="Model" />
      </div>

      <div class="section">
        <div class="label">Serial</div>
        <input class="input" [(ngModel)]="serial" placeholder="Serial number" />
      </div>

      <div class="section">
        <div class="label">Installed At</div>
        <input class="input" type="date" [(ngModel)]="installedAtDate" />
      </div>

      <div class="section">
        <div class="label">Purchase Price</div>
        <input class="input" type="number" [(ngModel)]="purchasePrice" placeholder="0" />
      </div>

      <div class="section" style="grid-column: 1 / -1;">
        <div class="label">Notes</div>
        <textarea class="input" rows="4" [(ngModel)]="notes" placeholder="Notes..."></textarea>
      </div>

      <div class="section" style="grid-column: 1 / -1;">
        <div class="label">Tags (comma separated)</div>
        <input class="input" [(ngModel)]="tagsText" placeholder="e.g., kitchen, warranty, high-priority" />
      </div>
    </div>

    <div class="actions">
      <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>
      <div class="status" *ngIf="statusMsg">{{ statusMsg }}</div>
      <button class="btn" type="button" (click)="save(vm.assetId)">
        {{ vm.isNew ? 'Create' : 'Save' }}
      </button>
    </div>
  </div>
  `,
  styles: [`
    .card{ background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:18px; padding:16px; }
    .header{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .h1{ font-size:18px; font-weight:900; color:#f8fafc; }
    .muted{ color:#94a3b8; font-size:12px; }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas; }

    .grid{ margin-top:12px; display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
    .label{ font-weight:900; font-size:12px; color:#cbd5e1; margin-bottom:8px; }
    .input{ width:100%; padding:10px 12px; border-radius:12px; background: rgba(2,6,23,.35); color:#e5e7eb;
      border:1px solid rgba(255,255,255,.08); outline:none; }
    textarea.input{ resize: vertical; }

    .actions{ margin-top:14px; display:flex; gap:12px; align-items:center; justify-content:flex-end; }
    .btn{ padding:10px 14px; border-radius:12px; border:1px solid rgba(59,130,246,.35);
      background: rgba(59,130,246,.18); color:#dbeafe; font-weight:900; cursor:pointer; }
    .btn.secondary{ border-color: rgba(148,163,184,.35); background: rgba(148,163,184,.12); color:#e2e8f0; }
    .error{ margin-right:auto; color:#fecaca; font-size:12px; }
    .status{ margin-right:auto; color:#dbeafe; font-size:12px; }

    @media (max-width: 900px){
      .grid{ grid-template-columns: 1fr; }
      .header{ flex-direction: column; align-items: stretch; }
      .actions{ flex-direction: column; align-items: stretch; }
      .actions .btn{ width:100%; }
      .error,.status{ margin-right:0; }
    }
  `]
})
export class AssetFormPage implements DoCheck {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private assets = inject(AssetsService);

  // form fields
  propertyId = '';
  name = '';
  category: AssetCategory = 'other';
  status: AssetStatus = 'active';

  roomArea = '';
  manufacturer = '';
  model = '';
  serial = '';

  installedAtDate = ''; // yyyy-mm-dd
  purchasePrice: number | null = null;
  notes = '';
  tagsText = '';

  errorMsg = '';
  statusMsg = '';

  vm$ = this.route.paramMap.pipe(
    switchMap(pm => {
      const assetId = pm.get('assetId');
      const isNew = !assetId;
      if (isNew) return of({ isNew: true, assetId: null as string | null, asset: null as any });

      return from(this.assets.getOnce(assetId)).pipe(
        switchMap(asset => of({ isNew: false, assetId, asset }))
      );
    })
  );

  async back() {
    await this.router.navigateByUrl('/assets');
  }

  private dateToMillis(d: string): number | null {
    const s = (d || '').trim();
    if (!s) return null;
    const ms = new Date(s + 'T00:00:00').getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  private parseTags(text: string): string[] {
    return (text || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
  }

  private hydrateFromAsset(a: any) {
    this.propertyId = a?.propertyId ?? '';
    this.name = a?.name ?? '';
    this.category = (a?.category ?? 'other') as any;
    this.status = (a?.status ?? 'active') as any;

    this.roomArea = a?.roomArea ?? '';
    this.manufacturer = a?.manufacturer ?? '';
    this.model = a?.model ?? '';
    this.serial = a?.serial ?? '';

    this.purchasePrice = (typeof a?.purchasePrice === 'number') ? a.purchasePrice : null;
    this.notes = a?.notes ?? '';
    this.tagsText = Array.isArray(a?.tags) ? a.tags.join(', ') : '';

    if (a?.installedAt) {
      const dt = new Date(a.installedAt);
      this.installedAtDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    } else {
      this.installedAtDate = '';
    }
  }

  async save(assetId: string | null) {
    this.errorMsg = '';
    this.statusMsg = '';

    const propertyId = (this.propertyId || '').trim();
    const name = (this.name || '').trim();

    if (!propertyId) { this.errorMsg = 'Property ID is required.'; return; }
    if (!name) { this.errorMsg = 'Name is required.'; return; }

    const payload: any = {
      propertyId,
      name,
      category: this.category,
      status: this.status,
      roomArea: (this.roomArea || '').trim() || null,
      manufacturer: (this.manufacturer || '').trim() || null,
      model: (this.model || '').trim() || null,
      serial: (this.serial || '').trim() || null,
      installedAt: this.dateToMillis(this.installedAtDate),
      purchasePrice: (this.purchasePrice === null || this.purchasePrice === undefined || Number.isNaN(Number(this.purchasePrice)))
        ? null
        : Number(this.purchasePrice),
      notes: (this.notes || '').trim() || null,
      tags: this.parseTags(this.tagsText),
    };

    try {
      this.statusMsg = 'Saving...';

      if (!assetId) {
        const id = await this.assets.create(payload);
        this.statusMsg = 'Created.';
        await this.router.navigateByUrl(`/assets/${id}`);
        return;
      }

      await this.assets.update(assetId, payload);
      this.statusMsg = 'Saved.';
    } catch (e: any) {
      this.errorMsg = e?.message ?? String(e);
      this.statusMsg = '';
    }
  }

  private _hydrated = false;

  async ngDoCheck() {
    if (this._hydrated) return;

    try {
      const assetId = this.route.snapshot.paramMap.get('assetId');
      if (!assetId) { this._hydrated = true; return; }

      const a = await this.assets.getOnce(assetId);
      if (a) this.hydrateFromAsset(a);
    } finally {
      this._hydrated = true;
    }
  }
}
