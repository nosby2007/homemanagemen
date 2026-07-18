import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { InspectionsService } from './inspections.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="card">
        <div class="h1">New Inspection</div>
        <div class="muted">Creates an inspection under the current property.</div>

        <label class="lbl">Status</label>
        <select class="input" [(ngModel)]="status">
          <option value="new">new</option>
          <option value="scheduled">scheduled</option>
        </select>

        <label class="lbl">Scheduled At (optional epoch ms)</label>
        <input class="input" [(ngModel)]="scheduledAt" placeholder="e.g. 1769193991728" />

        <div class="actions">
          <button class="btn" (click)="create()">Create</button>
          <button class="btn secondary" (click)="back()">Back</button>
        </div>

        <div class="muted" *ngIf="errorMessage">{{ errorMessage }}</div>
      </div>
    </div>
  `,
  styles: [`
    .page{ padding:16px; }
    .card{ background: rgba(15,23,42,.78); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:14px; }
    .h1{ font-size:18px; font-weight:900; color:#e5e7eb; }
    .muted{ color: rgba(226,232,240,.75); font-size:12px; margin-top:4px; }
    .lbl{ display:block; margin-top:12px; margin-bottom:6px; color: rgba(226,232,240,.85); font-size:12px; }
    .input{ width:100%; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(2,6,23,.25); color:#e5e7eb; outline:none; }
    .actions{ display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }
    .btn{ padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(59,130,246,.85); color:white; font-weight:800; cursor:pointer; }
    .btn.secondary{ background: rgba(148,163,184,.20); }
  `]
})
export class InspectionFormPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspections = inject(InspectionsService);

  status: any = 'new';
  scheduledAt = '';
  errorMessage = '';

  async create() {
    this.errorMessage = '';
    const propertyId = String(this.route.snapshot.paramMap.get('propertyId') || '').trim();
    if (!propertyId) {
      this.errorMessage = 'Missing property context for inspection creation.';
      return;
    }
    const inspectionId = await this.inspections.create(propertyId, {
      status: this.status,
      scheduledAt: this.scheduledAt ? Number(this.scheduledAt) : null
    });
    await this.router.navigateByUrl(`/properties/${propertyId}/inspections/${inspectionId}`);
  }

  async back() {
    const propertyId = String(this.route.snapshot.paramMap.get('propertyId') || '').trim();
    if (!propertyId) {
      await this.router.navigateByUrl('/properties');
      return;
    }
    await this.router.navigateByUrl(`/properties/${propertyId}/inspections`);
  }
}
