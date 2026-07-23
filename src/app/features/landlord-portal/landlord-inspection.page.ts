import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { Inspection } from '../../core/models/inspection.models';
import { InspectionsService } from '../inspections/inspections.service';
import { LandlordDashboardService } from './landlord-dashboard.service';

interface InspectionVm extends Inspection {
  propertyName: string;
  propertyAddress: string;
}

@Component({
  selector: 'app-landlord-inspection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="header">
        <div>
          <h1>Inspections</h1>
          <p>Follow scheduling and completion status in real time.</p>
        </div>
        <button type="button" class="btn primary" (click)="goToProperties()">Schedule inspection</button>
      </header>

      <div class="toolbar">
        <input class="input" type="text" placeholder="Search by property" [value]="search" (input)="onSearch($event)" />
        <select class="input" [value]="statusFilter" (change)="onFilter($event)">
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div class="kpis">
        <div class="kpi"><span>{{ inspections.length }}</span><small>Total</small></div>
        <div class="kpi"><span>{{ countBy('scheduled') }}</span><small>Scheduled</small></div>
        <div class="kpi"><span>{{ countBy('in_progress') }}</span><small>In progress</small></div>
        <div class="kpi"><span>{{ countBy('completed') }}</span><small>Completed</small></div>
      </div>

      <div class="state" *ngIf="loading">Loading inspections...</div>
      <div class="state error" *ngIf="error">{{ error }}</div>
      <div class="state" *ngIf="!loading && !error && !filtered.length">No inspections found.</div>

      <div class="list" *ngIf="!loading && !error && filtered.length">
        <article class="card" *ngFor="let item of filtered">
          <div class="top">
            <div>
              <h3>{{ item.propertyName }}</h3>
              <p>{{ item.propertyAddress }}</p>
            </div>
            <span class="badge" [ngClass]="item.status">{{ item.status }}</span>
          </div>

          <div class="meta">
            <span>Scheduled: {{ item.scheduledAt ? (item.scheduledAt | date:'mediumDate') : '-' }}</span>
            <span>Updated: {{ item.updatedAt | date:'mediumDate' }}</span>
          </div>

          <p class="notes" *ngIf="item.notes">{{ item.notes }}</p>

          <div class="actions">
            <button type="button" class="btn" (click)="openInspection(item)">Open</button>
            <button type="button" class="btn" *ngIf="item.status !== 'completed'" (click)="markCompleted(item)">Mark completed</button>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .page{padding:20px}
    .header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
    .header h1{margin:0 0 4px;color:#0f172a}
    .header p{margin:0;color:#475569}
    .toolbar{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:12px}
    .input{padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff}
    .kpis{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:10px;margin-bottom:12px}
    .kpi{padding:12px;background:#e2e8f0;border-radius:12px}
    .kpi span{display:block;font-size:22px;font-weight:800;color:#0f172a}
    .kpi small{color:#475569}
    .state{padding:12px;border-radius:10px;background:#f1f5f9;color:#334155}
    .state.error{background:#fee2e2;color:#991b1b}
    .list{display:grid;gap:12px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px}
    .top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .top h3{margin:0;color:#0f172a}
    .top p{margin:4px 0 0;color:#475569}
    .meta{margin:10px 0;display:flex;gap:14px;flex-wrap:wrap;color:#64748b;font-size:13px}
    .notes{margin:0 0 10px;color:#334155}
    .actions{display:flex;gap:8px;flex-wrap:wrap}
    .btn{border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;padding:8px 10px;border-radius:8px;cursor:pointer}
    .btn.primary{background:#0284c7;border-color:#0369a1;color:#fff}
    .badge{padding:2px 8px;border-radius:999px;font-size:11px;text-transform:uppercase;background:#e2e8f0;color:#334155}
    .badge.new{background:#e2e8f0;color:#334155}
    .badge.scheduled{background:#dbeafe;color:#1d4ed8}
    .badge.in_progress{background:#fef3c7;color:#92400e}
    .badge.completed{background:#dcfce7;color:#166534}
    .badge.archived{background:#e5e7eb;color:#4b5563}
    @media(max-width:720px){.toolbar{grid-template-columns:1fr}.kpis{grid-template-columns:1fr 1fr}}
  `],
})
export class LandlordInspectionPage implements OnInit, OnDestroy {
  private dashboardSvc = inject(LandlordDashboardService);
  private inspectionsSvc = inject(InspectionsService);
  private router = inject(Router);
  private sub = new Subscription();

  loading = true;
  error = '';
  search = '';
  statusFilter = 'all';

  inspections: InspectionVm[] = [];
  filtered: InspectionVm[] = [];

  ngOnInit() {
    this.sub.add(this.dashboardSvc.getProperties().subscribe({
      next: (properties: any[]) => {
        const rows = properties || [];
        if (!rows.length) {
          this.inspections = [];
          this.filtered = [];
          this.loading = false;
          return;
        }

        const streams = rows.map((property) => this.inspectionsSvc.list(property.id));
        this.sub.add(combineLatest(streams).subscribe({
          next: (groups: any[][]) => {
            const flat: InspectionVm[] = [];
            for (let i = 0; i < groups.length; i++) {
              const property = rows[i];
              const propertyAddress = property?.address?.line1 || property?.streetAddress || [property?.city, property?.state].filter(Boolean).join(', ') || 'Address not set';
              for (const inspection of groups[i] || []) {
                flat.push({
                  ...(inspection as Inspection),
                  propertyName: property?.name || 'Unnamed property',
                  propertyAddress,
                });
              }
            }
            this.inspections = flat.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
            this.applyFilters();
            this.loading = false;
            this.error = '';
          },
          error: () => {
            this.loading = false;
            this.error = 'Unable to load inspections.';
          },
        }));
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load properties for inspections.';
      },
    }));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  countBy(status: string) {
    return this.inspections.filter((r) => r.status === status).length;
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value || '';
    this.search = value.toLowerCase();
    this.applyFilters();
  }

  onFilter(event: Event) {
    this.statusFilter = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  private applyFilters() {
    this.filtered = this.inspections
      .filter((row) => this.statusFilter === 'all' || row.status === this.statusFilter)
      .filter((row) => {
        if (!this.search) return true;
        return row.propertyName.toLowerCase().includes(this.search) || row.propertyAddress.toLowerCase().includes(this.search);
      });
  }

  openInspection(item: InspectionVm) {
    this.router.navigate(['/properties', item.propertyId, 'inspections', item.id]);
  }

  goToProperties() {
    this.router.navigate(['/properties']);
  }

  async markCompleted(item: InspectionVm) {
    this.error = '';
    try {
      await this.inspectionsSvc.update(item.propertyId, item.id, { status: 'completed' });
    } catch (err: any) {
      this.error = err?.message || 'Failed to mark inspection completed.';
    }
  }
}
