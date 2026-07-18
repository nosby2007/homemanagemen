import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { MembershipService } from '../../../core/services/membership.service';
import { PropertyAssignmentService } from '../../../core/services/property-assignment.service';
import { OrgContextService } from '../../../core/org/org-context.service';
import { InviteUserDialogComponent } from './invite-user-dialog.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, InviteUserDialogComponent],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1>Organization Members</h1>
          <p>Manage role-based access to the current organization.</p>
        </div>
        <div class="head-actions">
          <a class="btn" routerLink="/property-assignments">Property assignments</a>
          <button class="btn primary" (click)="dialogOpen = true">Invite user</button>
        </div>
      </header>

      <article class="card" *ngIf="loading">Loading members...</article>
      <article class="card error" *ngIf="!loading && error">{{ error }}</article>

      <article class="card" *ngIf="!loading && !error">
        <div class="empty" *ngIf="!rows.length">No members found.</div>
        <div class="table" *ngIf="rows.length">
          <div class="thead"><div>User</div><div>Role</div><div>Status</div><div>Default Property</div><div>Properties</div><div>Assignments</div><div>User ID</div></div>
          <div class="row" *ngFor="let row of rows">
            <div>{{ row.email || '-' }}</div>
            <div>{{ row.role || '-' }}</div>
            <div><span class="badge" [class.active]="row.status === 'active'">{{ row.status || '-' }}</span></div>
            <div>{{ row.defaultPropertyId || '-' }}</div>
            <div>{{ formatPropertyIds(row.propertyIds) }}</div>
            <div>{{ row.assignmentCount || 0 }}</div>
            <div>{{ row.userId || '-' }}</div>
          </div>
        </div>
      </article>
    </section>

    <app-invite-user-dialog
      [open]="dialogOpen"
      [orgId]="orgId"
      (close)="dialogOpen = false"
      (invited)="reload()"
    />
  `,
  styles: [`
    .page { display: grid; gap: 14px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .head-actions { display: flex; gap: 8px; }
    h1 { margin: 0; color: #f8fafc; }
    p { margin: 4px 0 0; color: #94a3b8; }
    .btn { border: 1px solid rgba(148, 163, 184, .32); border-radius: 10px; padding: 10px 12px; background: rgba(2, 6, 23, .45); color: #e2e8f0; cursor: pointer; }
    .btn.primary { background: linear-gradient(125deg, #0ea5e9, #0284c7); border-color: #0284c7; color: #fff; }
    .card { border: 1px solid rgba(148, 163, 184, .2); border-radius: 14px; background: rgba(15, 23, 42, .78); color: #e2e8f0; padding: 14px; }
    .error { color: #fecaca; border-color: rgba(239, 68, 68, .35); }
    .table { border: 1px solid rgba(148, 163, 184, .2); border-radius: 12px; overflow: hidden; }
    .thead, .row { display: grid; grid-template-columns: 1.2fr .8fr .7fr 1fr 1fr; gap: 8px; align-items: center; padding: 10px; }
    .thead { background: rgba(148, 163, 184, .12); font-weight: 800; font-size: 12px; }
    .row { border-top: 1px solid rgba(148, 163, 184, .16); }
    .badge { border-radius: 999px; padding: 3px 8px; background: rgba(148, 163, 184, .22); font-size: 11px; text-transform: uppercase; }
    .badge.active { background: rgba(16, 185, 129, .2); color: #bbf7d0; }
    .empty { color: #94a3b8; }
    @media (max-width: 1100px) { .thead, .row { grid-template-columns: 1fr; } }
  `],
})
export class OrganizationMembersPage implements OnInit, OnDestroy {
  private members = inject(MembershipService);
  private assignments = inject(PropertyAssignmentService);
  private org = inject(OrgContextService);
  private sub = new Subscription();

  orgId = '';
  rows: any[] = [];
  loading = true;
  error = '';
  dialogOpen = false;

  ngOnInit() {
    this.orgId = this.org.requireOrgId();
    this.reload();
  }

  reload() {
    this.loading = true;
    this.error = '';
    this.sub.unsubscribe();
    this.sub = new Subscription();
    this.sub.add(combineLatest([
      this.members.listForCurrentOrg(),
      this.assignments.listByOrg(this.orgId),
    ]).pipe(
      map((values: any[]) => {
        const members = (values[0] || []) as any[];
        const assignments = (values[1] || []) as any[];
        const counts = new Map<string, number>();
        (assignments || []).forEach((a: any) => {
          const userId = String(a?.userId || '').trim();
          if (!userId) return;
          counts.set(userId, (counts.get(userId) || 0) + 1);
        });

        return (members || []).map((m: any) => ({
          ...m,
          assignmentCount: counts.get(String(m?.userId || '').trim()) || 0,
        }));
      }),
    ).subscribe({
      next: (rows: any[]) => { this.rows = rows; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load members.'; this.loading = false; },
    }));
  }

  formatPropertyIds(propertyIds: unknown): string {
    if (!Array.isArray(propertyIds) || !propertyIds.length) return '-';
    return propertyIds.join(', ');
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
