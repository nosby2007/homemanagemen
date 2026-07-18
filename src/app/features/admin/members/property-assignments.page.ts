import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PropertyAssignmentService } from '../../../core/services/property-assignment.service';
import { OrgContextService } from '../../../core/org/org-context.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>Property Assignments</h1>
          <p>Visibility matrix by property, unit and role.</p>
        </div>
      </header>

      <article class="card" *ngIf="loading">Loading assignments...</article>
      <article class="card error" *ngIf="!loading && error">{{ error }}</article>

      <article class="card" *ngIf="!loading && !error">
        <div class="empty" *ngIf="!rows.length">No property assignments found.</div>
        <div class="table" *ngIf="rows.length">
          <div class="thead"><div>Org</div><div>Property</div><div>Unit</div><div>User ID</div><div>Email</div><div>Role</div><div>Target Type</div><div>Target ID</div><div>Access</div><div>Status</div></div>
          <div class="row" *ngFor="let row of rows">
            <div>{{ row.orgId || '-' }}</div>
            <div>{{ row.propertyId || '-' }}</div>
            <div>{{ row.unitId || '-' }}</div>
            <div>{{ row.userId || '-' }}</div>
            <div>{{ row.email || '-' }}</div>
            <div>{{ row.role || '-' }}</div>
            <div>{{ row.targetType || '-' }}</div>
            <div>{{ row.targetId || '-' }}</div>
            <div>{{ row.accessLevel || '-' }}</div>
            <div>{{ row.status || '-' }}</div>
          </div>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .page { display: grid; gap: 14px; }
    .head h1 { margin: 0; color: #f8fafc; }
    .head p { margin: 4px 0 0; color: #94a3b8; }
    .card { border: 1px solid rgba(148, 163, 184, .2); border-radius: 14px; background: rgba(15, 23, 42, .78); color: #e2e8f0; padding: 14px; }
    .error { color: #fecaca; border-color: rgba(239, 68, 68, .35); }
    .table { border: 1px solid rgba(148, 163, 184, .2); border-radius: 12px; overflow: hidden; }
    .thead, .row { display: grid; grid-template-columns: .8fr .8fr .8fr .9fr 1.1fr .7fr .8fr .8fr .6fr .6fr; gap: 8px; align-items: center; padding: 10px; }
    .thead { background: rgba(148, 163, 184, .12); font-weight: 800; font-size: 12px; }
    .row { border-top: 1px solid rgba(148, 163, 184, .16); }
    .empty { color: #94a3b8; }
    @media (max-width: 1100px) { .thead, .row { grid-template-columns: 1fr; } }
  `],
})
export class PropertyAssignmentsPage implements OnInit, OnDestroy {
  private assignments = inject(PropertyAssignmentService);
  private org = inject(OrgContextService);
  private sub = new Subscription();

  rows: any[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    const orgId = this.org.requireOrgId();
    this.sub.add(this.assignments.listByOrg(orgId).subscribe({
      next: (rows: any[]) => {
        this.rows = rows || [];
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.message || 'Unable to load assignments.';
        this.loading = false;
      },
    }));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
