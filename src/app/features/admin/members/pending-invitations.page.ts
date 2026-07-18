import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { InvitationService, PendingInvitationRow } from '../../../core/services/invitation.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <header>
        <h1>Pending Invitations</h1>
        <p>Track invitation lifecycle and copy links when email provider is not configured.</p>
      </header>

      <article class="card" *ngIf="loading">Loading invitations...</article>
      <article class="card error" *ngIf="!loading && error">{{ error }}</article>

      <article class="card" *ngIf="!loading && !error">
        <div class="empty" *ngIf="!rows.length">No pending invitations.</div>
        <div class="table" *ngIf="rows.length">
          <div class="thead"><div>Org</div><div>Email</div><div>Role</div><div>Property</div><div>Unit</div><div>Target Type</div><div>Target Profile</div><div>Status</div><div>Delivery</div><div>Expires</div><div>Actions</div></div>
          <div class="row" *ngFor="let row of rows">
            <div>{{ row.orgId || '-' }}</div>
            <div>{{ row.email }}</div>
            <div>{{ row.role }}</div>
            <div>{{ row.propertyId || '-' }}</div>
            <div>{{ row.unitId || '-' }}</div>
            <div>{{ row.targetType }}</div>
            <div>{{ row.targetId }}</div>
            <div><span class="delivery" [class.ok]="row.status === 'pending'">{{ row.status || '-' }}</span></div>
            <div>
              <div class="delivery" [class.ok]="deliveryStatus(row) === 'sent'" [class.warn]="deliveryStatus(row) === 'skipped'" [class.err]="deliveryStatus(row) === 'failed'">
                {{ deliveryStatusLabel(row) }}
              </div>
              <div class="meta" *ngIf="row.emailDelivery?.messageId">{{ row.emailDelivery?.messageId }}</div>
              <div class="meta err-text" *ngIf="row.emailDelivery?.error">{{ row.emailDelivery?.error }}</div>
            </div>
            <div>{{ row.expiresAt | date:'medium' }}</div>
            <div class="actions">
              <button (click)="resend(row.id)">Resend</button>
              <button class="warn" (click)="revoke(row.id)">Revoke</button>
            </div>
          </div>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .page { display: grid; gap: 14px; }
    h1 { margin: 0; color: #f8fafc; }
    p { margin: 4px 0 0; color: #94a3b8; }
    .card { border: 1px solid rgba(148, 163, 184, .2); border-radius: 14px; background: rgba(15, 23, 42, .78); color: #e2e8f0; padding: 14px; }
    .error { color: #fecaca; border-color: rgba(239, 68, 68, .35); }
    .table { border: 1px solid rgba(148, 163, 184, .2); border-radius: 12px; overflow: hidden; }
    .thead, .row { display: grid; grid-template-columns: .9fr 1.1fr .7fr .8fr .7fr .8fr .9fr .7fr 1fr .8fr .7fr; gap: 8px; align-items: center; padding: 10px; }
    .thead { background: rgba(148, 163, 184, .12); font-weight: 800; font-size: 12px; }
    .row { border-top: 1px solid rgba(148, 163, 184, .16); }
    .actions { display: flex; gap: 6px; }
    .delivery { display: inline-flex; padding: 3px 8px; border-radius: 999px; font-size: 11px; border: 1px solid rgba(148,163,184,.3); color: #cbd5e1; }
    .delivery.ok { border-color: rgba(34,197,94,.45); color: #86efac; }
    .delivery.warn { border-color: rgba(250,204,21,.45); color: #fde68a; }
    .delivery.err { border-color: rgba(239,68,68,.45); color: #fecaca; }
    .meta { font-size: 11px; color: #94a3b8; margin-top: 4px; overflow-wrap: anywhere; }
    .err-text { color: #fecaca; }
    button { border: 1px solid rgba(148,163,184,.32); border-radius: 8px; padding: 8px 10px; background: rgba(2,6,23,.45); color: #e2e8f0; cursor: pointer; }
    .warn { border-color: rgba(239,68,68,.4); color: #fecaca; }
    .empty { color: #94a3b8; }
    @media (max-width: 1100px) { .thead, .row { grid-template-columns: 1fr; } }
  `],
})
export class PendingInvitationsPage implements OnInit, OnDestroy {
  private invitations = inject(InvitationService);
  private sub = new Subscription();

  rows: PendingInvitationRow[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.error = '';
    this.sub.unsubscribe();
    this.sub = new Subscription();
    this.sub.add(this.invitations.listPendingForCurrentOrg().subscribe({
      next: (rows: PendingInvitationRow[]) => { this.rows = rows || []; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load invitations.'; this.loading = false; },
    }));
  }

  async resend(invitationId: string) {
    try {
      const res = await this.invitations.resendInvitation(invitationId);
      if (res?.inviteUrl) {
        await navigator.clipboard.writeText(res.inviteUrl);
      }
      if (res?.emailDeliveryStatus === 'failed') {
        this.error = 'Invitation recreee mais echec de l\'envoi email. Verifiez SendGrid.';
      }
      this.reload();
    } catch (e: any) {
      this.error = e?.message || 'Unable to resend invitation.';
    }
  }

  deliveryStatus(row: PendingInvitationRow): 'sent' | 'skipped' | 'failed' | 'unknown' {
    const status = row?.emailDelivery?.status;
    if (status === 'sent' || status === 'skipped' || status === 'failed') return status;
    return 'unknown';
  }

  deliveryStatusLabel(row: PendingInvitationRow): string {
    const status = this.deliveryStatus(row);
    if (status === 'sent') return 'Envoye';
    if (status === 'skipped') return 'Ignore';
    if (status === 'failed') return 'Echec';
    return 'N/A';
  }

  async revoke(invitationId: string) {
    try {
      await this.invitations.revokeInvitation(invitationId);
      this.reload();
    } catch (e: any) {
      this.error = e?.message || 'Unable to revoke invitation.';
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
