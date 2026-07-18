import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { PropertiesService } from '../properties/properties.service';
import { TenantsService } from '../tenants/tenants.service';

interface PropertyVm {
  id: string;
  name: string;
  address: string;
  status: string;
  monthlyRent: number;
  tenants: number;
  updatedAt: number;
}

@Component({
  selector: 'app-landlord-properties',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      <header class="header">
        <div>
          <h1>Property Portfolio</h1>
          <p>Live data from your organization inventory.</p>
        </div>
        <button type="button" class="btn primary" (click)="createProperty()">+ Add property</button>
      </header>

      <div class="toolbar">
        <input
          type="text"
          class="input"
          placeholder="Search by name or address"
          [value]="search"
          (input)="onSearch($event)"
        />
        <select class="input" [value]="statusFilter" (change)="onFilter($event)">
          <option value="all">All statuses</option>
          <option value="occupied">Occupied</option>
          <option value="available">Available</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      <div class="kpis">
        <div class="kpi"><span>{{ properties.length }}</span><small>Total properties</small></div>
        <div class="kpi"><span>{{ occupiedCount }}</span><small>Occupied</small></div>
        <div class="kpi"><span>{{ availableCount }}</span><small>Available</small></div>
        <div class="kpi"><span>{{ occupancyRate }}%</span><small>Occupancy rate</small></div>
      </div>

      <div class="state" *ngIf="loading">Loading properties...</div>
      <div class="state error" *ngIf="error">{{ error }}</div>
      <div class="state" *ngIf="!loading && !error && !filtered.length">No properties match your filters.</div>

      <div class="grid" *ngIf="!loading && !error && filtered.length">
        <article class="card" *ngFor="let property of filtered">
          <div class="card-top">
            <h3>{{ property.name }}</h3>
            <span class="badge" [ngClass]="property.status">{{ property.status }}</span>
          </div>

          <p class="address">{{ property.address }}</p>

          <div class="meta">
            <span>Tenants: {{ property.tenants }}</span>
            <span>Rent: {{ property.monthlyRent | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>

          <div class="actions">
            <button type="button" class="btn" (click)="openProperty(property.id)">Open</button>
            <button type="button" class="btn" (click)="scheduleInspection(property.id)">Schedule inspection</button>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .page{padding:20px}
    .header{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
    .header h1{margin:0 0 4px;color:#0f172a}
    .header p{margin:0;color:#475569}
    .toolbar{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:14px}
    .input{padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff}
    .kpis{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px;margin-bottom:14px}
    .kpi{padding:12px;border-radius:12px;background:#e2e8f0}
    .kpi span{display:block;font-size:22px;font-weight:800;color:#0f172a}
    .kpi small{color:#475569}
    .state{padding:14px;border-radius:10px;background:#f1f5f9;color:#334155}
    .state.error{background:#fee2e2;color:#991b1b}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
    .card{border:1px solid #e2e8f0;background:#fff;border-radius:14px;padding:14px}
    .card-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}
    .card-top h3{margin:0;color:#0f172a;font-size:16px}
    .address{margin:8px 0 10px;color:#334155;min-height:20px}
    .meta{display:flex;justify-content:space-between;color:#475569;font-size:13px;margin-bottom:12px}
    .actions{display:flex;gap:8px;flex-wrap:wrap}
    .btn{border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;padding:8px 10px;border-radius:8px;cursor:pointer}
    .btn.primary{background:#0284c7;border-color:#0369a1;color:#fff}
    .badge{padding:2px 8px;border-radius:999px;font-size:11px;text-transform:uppercase;background:#e2e8f0;color:#334155}
    .badge.occupied{background:#dcfce7;color:#166534}
    .badge.available{background:#dbeafe;color:#1d4ed8}
    .badge.maintenance{background:#fee2e2;color:#b91c1c}
    @media(max-width:720px){.toolbar{grid-template-columns:1fr}.kpis{grid-template-columns:1fr 1fr}}
  `],
})
export class LandlordPropertiesPage implements OnInit, OnDestroy {
  private propertiesSvc = inject(PropertiesService);
  private tenantsSvc = inject(TenantsService);
  private router = inject(Router);
  private sub = new Subscription();

  loading = true;
  error = '';
  search = '';
  statusFilter = 'all';

  properties: PropertyVm[] = [];
  filtered: PropertyVm[] = [];

  get occupiedCount() {
    return this.properties.filter((p) => p.status === 'occupied').length;
  }

  get availableCount() {
    return this.properties.filter((p) => p.status === 'available').length;
  }

  get occupancyRate() {
    if (!this.properties.length) return 0;
    return Math.round((this.occupiedCount / this.properties.length) * 100);
  }

  ngOnInit() {
    this.sub.add(
      combineLatest([this.propertiesSvc.list(), this.tenantsSvc.list()]).subscribe({
        next: (result: any) => {
          const [properties, tenants] = result as [any[], any[]];
          const byProperty = new Map<string, number>();
          for (const tenant of (tenants || []) as any[]) {
            const propertyId = (tenant?.currentPropertyId || '').toString();
            if (!propertyId) continue;
            byProperty.set(propertyId, (byProperty.get(propertyId) || 0) + 1);
          }

          this.properties = (properties || []).map((p: any) => {
            const address = p?.address?.line1 || p?.streetAddress || [p?.city, p?.state].filter(Boolean).join(', ') || 'Address not set';
            return {
              id: p.id,
              name: p.name || 'Unnamed property',
              address,
              status: p.status || 'available',
              monthlyRent: Number(p.monthlyRent || 0),
              tenants: byProperty.get(p.id) || 0,
              updatedAt: Number(p.updatedAt || 0),
            } as PropertyVm;
          });

          this.applyFilters();
          this.loading = false;
          this.error = '';
        },
        error: () => {
          this.loading = false;
          this.error = 'Unable to load properties right now.';
        },
      }),
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
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
    this.filtered = this.properties
      .filter((p) => this.statusFilter === 'all' || p.status === this.statusFilter)
      .filter((p) => {
        if (!this.search) return true;
        return p.name.toLowerCase().includes(this.search) || p.address.toLowerCase().includes(this.search);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  openProperty(propertyId: string) {
    this.router.navigate(['/properties', propertyId]);
  }

  createProperty() {
    this.router.navigate(['/properties/new']);
  }

  scheduleInspection(propertyId: string) {
    this.router.navigate(['/properties', propertyId, 'inspections', 'new']);
  }
}
