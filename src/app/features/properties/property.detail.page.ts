import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PropertiesService } from './properties.service';
import { UnitsService } from '../units/units.service';
import { TenantsService } from '../tenants/tenants.service';
import { LeasesService } from '../leases/leases.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { InspectionsService } from '../inspections/inspections.service';
import { UnitRecord } from '../../core/models/domain.models';
import { Tenant } from '../tenants/tenants.service';
import { Lease } from '../leases/leases.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <ng-container *ngIf="vm$ | async as vm">
    <div class="page">
      <div class="card">
        <div class="header">
          <div>
            <div class="h1">{{ vm.property.name || ('Property ' + (vm.property.id | slice:0:8)) }}</div>
            <div class="muted">Status: {{ vm.property.status || 'available' }} | {{ vm.property.city || '-' }}, {{ vm.property.state || '-' }}</div>
          </div>
          <div class="header-actions">
            <a class="btn secondary" routerLink="/properties">Back</a>
          </div>
        </div>

        <div class="tabs">
          <a class="tab" [routerLink]="['/properties', vm.property.id]">Overview</a>
          <a class="tab" [routerLink]="['/units']" [queryParams]="{ propertyId: vm.property.id }">Units</a>
          <a class="tab" [routerLink]="['/tenants']" [queryParams]="{ propertyId: vm.property.id }">Tenants</a>
          <a class="tab" [routerLink]="['/properties', vm.property.id, 'leases']">Leases</a>
          <a class="tab" [routerLink]="['/maintenance']" [queryParams]="{ propertyId: vm.property.id }">Maintenance</a>
          <a class="tab" [routerLink]="['/properties', vm.property.id, 'inspections']">Inspections</a>
          <a class="tab" [routerLink]="['/documents']" [queryParams]="{ propertyId: vm.property.id }">Documents</a>
        </div>

        <div class="card2">
          <div class="h2">Property Actions</div>
          <div class="header-actions" style="margin-top:8px;">
            <a class="btn" [routerLink]="['/units']" [queryParams]="{ propertyId: vm.property.id }">Manage Units</a>
            <a class="btn" [routerLink]="['/tenants']" [queryParams]="{ propertyId: vm.property.id }">Manage Tenants</a>
            <a class="btn" [routerLink]="['/properties', vm.property.id, 'leases', 'new']">Add Lease</a>
            <a class="btn" [routerLink]="['/maintenance']" [queryParams]="{ propertyId: vm.property.id }">Add Maintenance</a>
            <a class="btn" [routerLink]="['/properties', vm.property.id, 'inspections', 'new']">Add Inspection</a>
            <a class="btn" [routerLink]="['/documents']" [queryParams]="{ propertyId: vm.property.id }">Add Document</a>
          </div>
        </div>

        <div class="card2">
          <div class="h2">Property Details</div>
          <div class="details-row">
            <div class="detail-cell"><div class="detail-label">Name</div><div class="detail-value">{{ vm.property.name || 'NONE' }}</div></div>
            <div class="detail-cell"><div class="detail-label">Type</div><div class="detail-value">{{ vm.property.type || 'NONE' }}</div></div>
            <div class="detail-cell"><div class="detail-label">Address</div><div class="detail-value">{{ vm.property.streetAddress || 'NONE' }}</div></div>
            <div class="detail-cell"><div class="detail-label">Rent</div><div class="detail-value">{{ vm.property.monthlyRent ? ('$' + vm.property.monthlyRent) : 'NONE' }}</div></div>
          </div>
        </div>

        <div class="card2">
          <div class="h2">Units</div>
          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">{{ vm.totalUnits }}</div></div>
            <div class="kpi-card completed"><div class="kpi-label">Occupied</div><div class="kpi-value">{{ vm.occupiedUnits }}</div></div>
            <div class="kpi-card scheduled"><div class="kpi-label">Vacant</div><div class="kpi-value">{{ vm.vacantUnits }}</div></div>
            <div class="kpi-card pending"><div class="kpi-label">Maintenance</div><div class="kpi-value">{{ countUnitsByStatus(vm.units, 'maintenance') }}</div></div>
          </div>
        </div>

        <div class="card2">
          <div class="h2">Tenants</div>
          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">{{ vm.totalTenants }}</div></div>
            <div class="kpi-card completed"><div class="kpi-label">Active</div><div class="kpi-value">{{ vm.activeTenants }}</div></div>
            <div class="kpi-card pending"><div class="kpi-label">Inactive</div><div class="kpi-value">{{ vm.totalTenants - vm.activeTenants }}</div></div>
            <div class="kpi-card scheduled"><div class="kpi-label">Occupied Units</div><div class="kpi-value">{{ vm.occupiedUnits }}</div></div>
          </div>
        </div>

        <div class="card2">
          <div class="h2">Leases</div>
          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">{{ vm.totalLeases }}</div></div>
            <div class="kpi-card completed"><div class="kpi-label">Active</div><div class="kpi-value">{{ vm.activeLeases }}</div></div>
            <div class="kpi-card pending"><div class="kpi-label">Pending</div><div class="kpi-value">{{ vm.pendingLeases }}</div></div>
            <div class="kpi-card cancelled"><div class="kpi-label">Expired/Terminated</div><div class="kpi-value">{{ vm.expiredLeases }}</div></div>
          </div>
        </div>

        <div class="card2">
          <div class="h2">Maintenance / Work Orders</div>
          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">{{ vm.maintenance.length }}</div></div>
            <div class="kpi-card scheduled"><div class="kpi-label">Open</div><div class="kpi-value">{{ vm.openMaintenance }}</div></div>
            <div class="kpi-card pending"><div class="kpi-label">In Progress</div><div class="kpi-value">{{ vm.inProgressMaintenance }}</div></div>
            <div class="kpi-card completed"><div class="kpi-label">Completed</div><div class="kpi-value">{{ vm.completedMaintenance }}</div></div>
          </div>
        </div>

        <div class="card2">
          <div class="h2">Inspections</div>
          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">{{ vm.inspections.length }}</div></div>
            <div class="kpi-card scheduled"><div class="kpi-label">New</div><div class="kpi-value">{{ countByStatus(vm.inspections, 'new') }}</div></div>
            <div class="kpi-card pending"><div class="kpi-label">Pending</div><div class="kpi-value">{{ countByStatus(vm.inspections, 'pending') }}</div></div>
            <div class="kpi-card completed"><div class="kpi-label">Completed</div><div class="kpi-value">{{ countByStatus(vm.inspections, 'completed') }}</div></div>
          </div>
        </div>
      </div>
    </div>
  </ng-container>
  `,
  styles: [
    `.page{padding:16px;overflow-y:auto;max-height:100vh}`,
    `.card{background:#ffffff;border:1px solid rgba(198,207,228,.49);border-radius:16px;padding:14px;box-shadow:0 8px 24px rgba(15,23,42,.06)}`,
    `.card2{margin-top:12px;background:#f8fafc;border:1px solid rgba(15,23,42,.08);border-radius:16px;padding:16px}`,
    `.header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}`,
    `.header-actions{display:flex;gap:8px;flex-wrap:wrap}`,
    `.h1{font-size:18px;font-weight:900;color:#0f172a}`,
    `.h2{font-size:14px;font-weight:900;color:#0f172a}`,
    `.muted{color:rgba(15,23,42,.65);font-size:12px;margin-top:4px}`,
    `.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}`,
    `.tab{padding:8px 10px;border:1px solid rgba(57,94,182,.63);border-radius:999px;text-decoration:none;color:#0f172a;background:#8c56e27a;font-weight:800;font-size:12px}`,
    `.btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(236,37,236,.12);background:#2563eb;color:white;font-weight:800;text-decoration:none;display:inline-block}`,
    `.btn.secondary{background:#ffffff;color:#0f172a}`,
    `.details-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}`,
    `.detail-cell{display:flex;flex-direction:column;gap:4px}`,
    `.detail-label{font-size:11px;color:rgba(15,23,42,.55);font-weight:700;text-transform:uppercase}`,
    `.detail-value{font-size:13px;color:#0f172a;font-weight:600}`,
    `.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:8px}`,
    `.kpi-card{display:flex;flex-direction:column;gap:6px;padding:14px;background:#ffffff;border:1px solid rgba(15,23,42,.08);border-radius:12px;text-align:center}`,
    `.kpi-card.scheduled{border-color:rgba(37,99,235,.25);background:rgba(37,100,235,.18)}`,
    `.kpi-card.completed{border-color:rgba(34,197,94,.25);background:rgba(34,197,94,.16)}`,
    `.kpi-card.pending{border-color:rgba(245,158,11,.25);background:rgba(245,159,11,.18)}`,
    `.kpi-card.cancelled{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.16)}`,
    `.kpi-label{font-size:11px;color:rgba(15,23,42,.55);font-weight:700;text-transform:uppercase}`,
    `.kpi-value{font-size:24px;color:#0f172a;font-weight:900}`,
  ]
})
export class PropertyDetailPage {
  private route = inject(ActivatedRoute);
  private properties = inject(PropertiesService);
  private unitsSvc = inject(UnitsService);
  private tenantsSvc = inject(TenantsService);
  private leasesSvc = inject(LeasesService);
  private maintenanceSvc = inject(MaintenanceService);
  private inspectionsSvc = inject(InspectionsService);

  vm$ = this.route.paramMap.pipe(
    map(pm => pm.get('propertyId') || pm.get('id') || ''),
    switchMap(propertyId =>
      combineLatest([
        this.properties.get(propertyId).pipe(catchError(() => of(null))),
        this.inspectionsSvc.list(propertyId).pipe(catchError(() => of([]))),
        this.unitsSvc.listByProperty(propertyId).pipe(catchError(() => of([]))),
        this.tenantsSvc.listByProperty(propertyId).pipe(catchError(() => of([]))),
        this.leasesSvc.list(propertyId).pipe(catchError(() => of([]))),
        this.maintenanceSvc.listByProperty(propertyId).pipe(catchError(() => of([]))),
      ]).pipe(
        map((values: any[]) => {
          const property = values[0] ?? null;
          const inspections = (values[1] ?? []) as any[];
          const units = (values[2] ?? []) as UnitRecord[];
          const tenants = (values[3] ?? []) as Tenant[];
          const leases = (values[4] ?? []) as Lease[];
          const maintenance = (values[5] ?? []) as any[];
          const u = units;
          const t = tenants;
          const l = leases;
          const m = maintenance;
          return {
            property: { ...(property || {}) as any, id: (property as any)?.id ?? propertyId },
            inspections,
            units: u,
            tenants: t,
            leases: l,
            maintenance: m,
            totalUnits: u.length,
            occupiedUnits: u.filter(x => x.status === 'occupied').length,
            vacantUnits: u.filter(x => x.status === 'vacant').length,
            totalTenants: t.length,
            activeTenants: t.filter(x => x.status === 'active').length,
            totalLeases: l.length,
            activeLeases: l.filter(x => x.status === 'active').length,
            pendingLeases: l.filter(x => x.status === 'pending').length,
            expiredLeases: l.filter(x => x.status === 'expired' || x.status === 'terminated').length,
            openMaintenance: m.filter(x => x?.status === 'new').length,
            inProgressMaintenance: m.filter(x => x?.status === 'in_progress').length,
            completedMaintenance: m.filter(x => x?.status === 'completed').length,
          };
        }),
      ),
    ),
  );

  countByStatus(list: any[] | undefined, status: string): number {
    return (list ?? []).filter(x => (x?.status ?? 'new') === status).length;
  }

  countUnitsByStatus(units: UnitRecord[], status: string): number {
    return (units ?? []).filter(u => u.status === status).length;
  }
}
