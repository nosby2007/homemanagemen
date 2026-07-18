import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap, map } from 'rxjs/operators';
import { InspectionsService } from './inspections.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <ng-container *ngIf="vm$ | async as vm">
    <div class="page">
      <div class="header">
        <div>
          <div class="h1">Inspections</div>
          <div class="muted">Property: <span class="mono">{{ vm.propertyId }}</span></div>
        </div>
        <div class="actions">
          <a class="btn secondary" [routerLink]="['/properties', vm.propertyId]">Back</a>
          <button class="btn" type="button" (click)="create(vm.propertyId)">+ New Inspection</button>
        </div>
      </div>

      <div class="grid">
        <a class="card" *ngFor="let i of vm.inspections" [routerLink]="['/properties', vm.propertyId, 'inspections', i.id]">
          <div class="row">
            <div class="strong">{{ i.id | slice:0:8 }}</div>
            <span class="pill">{{ i.status || 'new' }}</span>
          </div>
          <div class="muted">Updated: {{ (i.updatedAt || i.createdAt) | date:'medium' }}</div>
        </a>
      </div>
    </div>
  </ng-container>
  `,
  styles: [`
    .page{padding:16px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
    .actions{display:flex;gap:10px;flex-wrap:wrap}
    .h1{font-size:18px;font-weight:900;color:#e5e7eb}
    .muted{color:rgba(226,232,240,.75);font-size:12px;margin-top:4px}
    .mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}
    @media (max-width: 1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
    @media (max-width: 640px){.grid{grid-template-columns:1fr;}}
    .card{display:block;text-decoration:none;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px}
    .row{display:flex;justify-content:space-between;align-items:center;gap:10px}
    .strong{color:#e5e7eb;font-weight:900}
    .pill{font-size:11px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#e5e7eb;font-weight:900;text-transform:uppercase}
    .btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(59,130,246,.85);color:white;font-weight:800;cursor:pointer}
    .btn.secondary{background:rgba(148,163,184,.20)}
  `]
})
export class InspectionsListPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspections = inject(InspectionsService);

  vm$ = this.route.paramMap.pipe(
    switchMap(pm => {
      const propertyId = pm.get('propertyId')!;
      return this.inspections.list(propertyId).pipe(
        map(inspections => ({ propertyId, inspections }))
      );
    })
  );

  async create(propertyId: string) {
    const id = await this.inspections.create(propertyId, {});
    await this.router.navigateByUrl(`/properties/${propertyId}/inspections/${id}`);
  }
}
