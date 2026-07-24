import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { TransactionsService } from './transactions.service';
import { PropertiesService } from '../properties/properties.service';
import { ListingsService } from '../listings/listings.service';
import { ClientsService } from '../clients/clients.service';
import { TRANSACTION_TRANSITIONS } from '../../core/auth/rbac';

@Component({
  standalone: true,
  selector: 'app-transactions-page',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="head"><div><h2>Transactions</h2><p>Manage deal lifecycle through closing pipeline.</p></div><button class="btn primary" (click)="openAdd()">+ New Transaction</button></header>
      <section *ngIf="loading" class="state">Loading transactions...</section>
      <section *ngIf="!loading && error" class="state error">{{ error }}</section>
      <section *ngIf="!loading && !error && rowError" class="state error">{{ rowError }}</section>
      <section *ngIf="!loading && !error && rows.length===0" class="state">No transactions found.</section>
      <table *ngIf="!loading && !error && rows.length" class="table">
        <thead><tr><th>Listing</th><th>Status</th><th>Sale Price</th><th>Closing Date</th><th>Actions</th></tr></thead>
        <tbody>
          <tr *ngFor="let r of rows">
            <td>{{ r.listingId || '-' }}</td>
            <td><span class="badge">{{ r.status }}</span></td>
            <td>{{ r.salePrice ? (r.salePrice | currency) : '-' }}</td>
            <td>{{ r.closingDate ? (r.closingDate | date:'shortDate') : '-' }}</td>
            <td class="actions-cell">
              <select *ngIf="nextStatuses(r.status).length" [ngModel]="''" (ngModelChange)="changeStatus(r, $event)" [disabled]="busyId === r.id">
                <option value="" disabled>Change status...</option>
                <option *ngFor="let s of nextStatuses(r.status)" [value]="s">{{ s }}</option>
              </select>
              <button class="btn sm" (click)="openEdit(r)">Edit</button>
              <button class="btn sm danger" (click)="deleteTransaction(r)" [disabled]="busyId === r.id">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="showForm" class="modal-overlay" (click)="closeForm()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editingId ? 'Edit Transaction' : 'Create New Transaction' }}</h3>
          <form (ngSubmit)="submitForm()">
            <div class="form-group">
              <label>Property *</label>
              <select [(ngModel)]="formData.propertyId" name="propertyId" (change)="onPropertyChange()" required [disabled]="!!editingId"><option value="">Select property</option><option *ngFor="let property of properties" [value]="property.id">{{ property.name || property.id }}</option></select>
            </div>
            <div class="form-group">
              <label>Listing</label>
              <select [(ngModel)]="formData.listingId" name="listingId"><option value="">Select listing (optional)</option><option *ngFor="let listing of listings" [value]="listing.id">{{ listing.title || listing.id }}</option></select>
            </div>
            <div class="form-group">
              <label>Buyer</label>
              <select [(ngModel)]="formData.buyerId" name="buyerId"><option value="">Select buyer (optional)</option><option *ngFor="let client of clients" [value]="client.id">{{ client.fullName || client.id }}</option></select>
            </div>
            <div class="form-group">
              <label>Sale Price *</label>
              <input [(ngModel)]="formData.salePrice" name="salePrice" type="number" placeholder="Sale price" required />
            </div>
            <div class="form-group">
              <label>Contract Date</label>
              <input [(ngModel)]="formData.contractDate" name="contractDate" type="date" />
            </div>
            <div class="form-group">
              <label>Closing Date</label>
              <input [(ngModel)]="formData.closingDate" name="closingDate" type="date" />
            </div>
            <div class="form-group">
              <label>Commission Rate (%)</label>
              <input [(ngModel)]="formData.commissionRate" name="commissionRate" type="number" placeholder="Commission rate" />
            </div>
            <div class="form-error" *ngIf="formError">{{ formError }}</div>
            <div class="actions">
              <button type="button" class="btn" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Saving...' : (editingId ? 'Save changes' : 'Create Transaction') }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.table th,.table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:left}.badge{padding:2px 10px;border-radius:999px;background:#ecfeff;color:#0f766e}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{color:#b91c1c;border-color:#fecaca;background:#fff1f2}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.btn.sm{padding:6px 10px;font-size:12px}.btn.sm.danger{color:#b91c1c;border-color:#fecaca}.actions-cell{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.actions-cell select{padding:6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px}.form-error{color:#b91c1c;background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;font-size:13px;margin-bottom:12px}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}.modal{background:#fff;border-radius:12px;padding:24px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto}.modal h3{margin:0 0 16px;color:#0f172a}.form-group{margin-bottom:16px;display:flex;flex-direction:column}.form-group label{margin-bottom:6px;font-weight:500;color:#334155}.form-group input,.form-group select{padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px}.form-group select:disabled{background:#f1f5f9;color:#64748b}.form-group input:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}`],
})
export class TransactionsPage implements OnInit, OnDestroy {
  private svc = inject(TransactionsService);
  private propertiesSvc = inject(PropertiesService);
  private listingsSvc = inject(ListingsService);
  private clientsSvc = inject(ClientsService);
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
  properties: any[] = [];
  listings: any[] = [];
  clients: any[] = [];

  private resetForm() {
    return { propertyId: '', listingId: '', buyerId: '', salePrice: 0, contractDate: '', closingDate: '', commissionRate: 0 };
  }

  nextStatuses(status: string): string[] {
    return TRANSACTION_TRANSITIONS[status] ?? [];
  }

  async ngOnInit() {
    this.formData = this.resetForm();
    this.properties = await firstValueFrom(this.propertiesSvc.list());
    this.clients = await firstValueFrom(this.clientsSvc.list());
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => { this.rows = rows; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load transactions'; this.loading = false; },
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  async onPropertyChange() {
    const propertyId = String(this.formData.propertyId || '').trim();
    this.formData.listingId = '';
    if (!propertyId) { this.listings = []; return; }
    const all: any[] = await firstValueFrom(this.listingsSvc.list());
    this.listings = all.filter((l) => l.propertyId === propertyId);
  }

  openAdd() {
    this.editingId = null;
    this.formError = '';
    this.formData = this.resetForm();
    this.listings = [];
    this.showForm = true;
  }

  async openEdit(tx: any) {
    this.editingId = tx.id;
    this.formError = '';
    this.formData = {
      propertyId: tx.propertyId || '',
      listingId: tx.listingId || '',
      buyerId: tx.buyerId || '',
      salePrice: tx.salePrice || 0,
      contractDate: tx.contractDate || '',
      closingDate: tx.closingDate || '',
      commissionRate: tx.commissionRate || 0,
    };
    if (this.formData.propertyId) {
      const all: any[] = await firstValueFrom(this.listingsSvc.list());
      this.listings = all.filter((l) => l.propertyId === this.formData.propertyId);
    }
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
    this.formError = '';
  }

  async submitForm() {
    if (!this.formData.propertyId || !this.formData.salePrice) return;
    this.formError = '';
    try {
      this.submitting = true;
      if (this.editingId) {
        await this.svc.update(this.editingId, this.formData);
      } else {
        await this.svc.create(this.formData);
      }
      this.showForm = false;
      this.editingId = null;
      this.formData = this.resetForm();
    } catch (err: any) {
      this.formError = err?.message || 'Failed to save transaction.';
    } finally {
      this.submitting = false;
    }
  }

  async changeStatus(tx: any, status: string) {
    if (!status) return;
    this.rowError = '';
    this.busyId = tx.id;
    try {
      await this.svc.update(tx.id, { status } as any);
    } catch (err: any) {
      this.rowError = err?.message || 'Failed to update status.';
    } finally {
      this.busyId = null;
    }
  }

  async deleteTransaction(tx: any) {
    if (!confirm('Delete this transaction?')) return;
    this.rowError = '';
    this.busyId = tx.id;
    try {
      await this.svc.remove(tx.id);
    } catch (err: any) {
      this.rowError = err?.message || 'Failed to delete transaction.';
    } finally {
      this.busyId = null;
    }
  }
}
