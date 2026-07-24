import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { CommissionsService } from './commissions.service';
import { TransactionsService } from '../transactions/transactions.service';
import { COMMISSION_TRANSITIONS } from '../../core/auth/rbac';

@Component({
  standalone: true,
  selector: 'app-commissions-page',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="head"><div><h2>Commissions</h2><p>Track gross, net, and payout status for each deal.</p></div><button class="btn primary" (click)="openAdd()">+ Add Commission</button></header>
      <section *ngIf="loading" class="state">Loading commissions...</section>
      <section *ngIf="!loading && error" class="state error">{{ error }}</section>
      <section *ngIf="!loading && !error && rowError" class="state error">{{ rowError }}</section>
      <section *ngIf="!loading && !error && rows.length===0" class="state">No commissions found.</section>
      <table *ngIf="!loading && !error && rows.length" class="table">
        <thead><tr><th>Transaction</th><th>Gross</th><th>Net</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let r of rows">
            <td>{{ r.transactionId || '-' }}</td>
            <td>{{ r.grossCommission ? (r.grossCommission | currency) : '-' }}</td>
            <td>{{ r.netCommission ? (r.netCommission | currency) : '-' }}</td>
            <td><span class="badge">{{ r.paymentStatus || 'pending' }}</span></td>
            <td class="actions-cell">
              <select *ngIf="nextStatuses(r.paymentStatus).length" [ngModel]="''" (ngModelChange)="changeStatus(r, $event)" [disabled]="busyId === r.id">
                <option value="" disabled>Change status...</option>
                <option *ngFor="let s of nextStatuses(r.paymentStatus)" [value]="s">{{ s }}</option>
              </select>
              <button class="btn sm" (click)="openEdit(r)">Edit</button>
              <button class="btn sm danger" (click)="deleteCommission(r)" [disabled]="busyId === r.id">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="showForm" class="modal-overlay" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editingId ? 'Edit Commission' : 'Add New Commission' }}</h3>
          <form (ngSubmit)="submitForm()">
            <div class="form-group">
              <label>Transaction *</label>
              <select [(ngModel)]="formData.transactionId" name="transactionId" required [disabled]="!!editingId"><option value="">Select transaction</option><option *ngFor="let tx of transactions" [value]="tx.id">{{ tx.listingId || tx.id }} - {{ tx.status }}</option></select>
            </div>
            <div class="form-group">
              <label>Gross Commission *</label>
              <input [(ngModel)]="formData.grossCommission" name="gross" type="number" placeholder="Gross commission" required />
            </div>
            <div class="form-group">
              <label>Net Commission *</label>
              <input [(ngModel)]="formData.netCommission" name="net" type="number" placeholder="Net commission" required />
            </div>
            <div class="form-group">
              <label>Agent Split</label>
              <input [(ngModel)]="formData.agentSplit" name="agentSplit" type="number" placeholder="Agent split amount" />
            </div>
            <div class="form-group">
              <label>Agency Split</label>
              <input [(ngModel)]="formData.agencySplit" name="agencySplit" type="number" placeholder="Agency split amount" />
            </div>
            <div class="form-group">
              <label>Referral Fee</label>
              <input [(ngModel)]="formData.referralFee" name="referralFee" type="number" placeholder="Referral fee amount" />
            </div>
            <div class="form-error" *ngIf="formError">{{ formError }}</div>
            <div class="actions">
              <button type="button" class="btn" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Saving...' : (editingId ? 'Save changes' : 'Add Commission') }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.table th,.table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:left}.badge{padding:2px 10px;border-radius:999px;background:#f0fdf4;color:#166534}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{color:#b91c1c;border-color:#fecaca;background:#fff1f2}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.btn.sm{padding:6px 10px;font-size:12px}.btn.sm.danger{color:#b91c1c;border-color:#fecaca}.actions-cell{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.actions-cell select{padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px}.form-error{color:#b91c1c;background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;font-size:13px;margin-bottom:12px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}.modal{background:#fff;border-radius:12px;padding:24px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto}.modal h3{margin:0 0 16px;color:#0f172a}.form-group{margin-bottom:16px;display:flex;flex-direction:column}.form-group label{margin-bottom:6px;font-weight:500;color:#334155}.form-group input,.form-group select{padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px}.form-group select:disabled{background:#f1f5f9;color:#64748b}.form-group input:focus,.form-group select:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}`],
})
export class CommissionsPage implements OnInit, OnDestroy {
  private svc = inject(CommissionsService);
  private txSvc = inject(TransactionsService);
  private sub?: Subscription;

  loading = true;
  error = '';
  rowError = '';
  rows: any[] = [];
  showForm = false;
  submitting = false;
  formError = '';
  editingId: string | null = null;
  busyId: string | null = null;
  formData: any = {};
  transactions: any[] = [];

  private resetForm() {
    return { transactionId: '', grossCommission: 0, netCommission: 0, agentSplit: 0, agencySplit: 0, referralFee: 0 };
  }

  nextStatuses(paymentStatus: string): string[] {
    return COMMISSION_TRANSITIONS[paymentStatus || 'pending'] ?? [];
  }

  async ngOnInit() {
    this.formData = this.resetForm();
    this.transactions = await firstValueFrom(this.txSvc.list());
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => { this.rows = rows; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load commissions'; this.loading = false; },
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  openAdd() {
    this.editingId = null;
    this.formError = '';
    this.formData = this.resetForm();
    this.showForm = true;
  }

  openEdit(commission: any) {
    this.editingId = commission.id;
    this.formError = '';
    this.formData = {
      transactionId: commission.transactionId || '',
      grossCommission: commission.grossCommission || 0,
      netCommission: commission.netCommission || 0,
      agentSplit: commission.agentSplit || 0,
      agencySplit: commission.agencySplit || 0,
      referralFee: commission.referralFee || 0,
    };
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
    this.formError = '';
  }

  async submitForm() {
    if (!this.formData.transactionId || !this.formData.grossCommission || !this.formData.netCommission) return;
    this.formError = '';
    try {
      this.submitting = true;
      if (this.editingId) {
        await this.svc.update(this.editingId, this.formData);
      } else {
        await this.svc.create({ ...this.formData, paymentStatus: 'pending' });
      }
      this.showForm = false;
      this.editingId = null;
      this.formData = this.resetForm();
    } catch (err: any) {
      this.formError = err?.message || 'Failed to save commission.';
    } finally {
      this.submitting = false;
    }
  }

  async changeStatus(commission: any, paymentStatus: string) {
    if (!paymentStatus) return;
    this.rowError = '';
    this.busyId = commission.id;
    try {
      await this.svc.update(commission.id, { paymentStatus } as any);
    } catch (err: any) {
      this.rowError = err?.message || 'Failed to update status.';
    } finally {
      this.busyId = null;
    }
  }

  async deleteCommission(commission: any) {
    if (!confirm('Delete this commission?')) return;
    this.rowError = '';
    this.busyId = commission.id;
    try {
      await this.svc.remove(commission.id);
    } catch (err: any) {
      this.rowError = err?.message || 'Failed to delete commission.';
    } finally {
      this.busyId = null;
    }
  }
}
