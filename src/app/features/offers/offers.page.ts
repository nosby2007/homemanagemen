import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { OffersService } from './offers.service';
import { PropertiesService } from '../properties/properties.service';
import { ListingsService } from '../listings/listings.service';
import { ClientsService } from '../clients/clients.service';

@Component({
  standalone: true,
  selector: 'app-offers-page',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="head"><div><h2>Offers</h2><p>Track submitted, accepted, and countered offers.</p></div><button class="btn primary" (click)="showForm = true">+ Submit Offer</button></header>
      <section *ngIf="loading" class="state">Loading offers...</section>
      <section *ngIf="!loading && error" class="state error">{{ error }}</section>
      <section *ngIf="!loading && !error && rows.length===0" class="state">No offers found.</section>
      <table *ngIf="!loading && !error && rows.length" class="table"><thead><tr><th>Listing</th><th>Buyer</th><th>Amount</th><th>Status</th></tr></thead><tbody><tr *ngFor="let r of rows"><td>{{ r.listingId }}</td><td>{{ r.buyerId }}</td><td>{{ r.offerAmount | currency }}</td><td><span class="badge">{{ r.status }}</span></td></tr></tbody></table>

      <div *ngIf="showForm" class="modal-overlay" (click)="showForm = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Submit New Offer</h3>
          <form (ngSubmit)="submitForm()">
            <div class="form-group">
              <label>Property *</label>
              <select [(ngModel)]="formData.propertyId" name="propertyId" (change)="onPropertyChange()" required><option value="">Select property</option><option *ngFor="let property of properties" [value]="property.id">{{ property.name || property.id }}</option></select>
            </div>
            <div class="form-group">
              <label>Listing *</label>
              <select [(ngModel)]="formData.listingId" name="listingId" required><option value="">Select listing</option><option *ngFor="let listing of listings" [value]="listing.id">{{ listing.title || listing.id }}</option></select>
            </div>
            <div class="form-group">
              <label>Buyer *</label>
              <select [(ngModel)]="formData.buyerId" name="buyerId" required><option value="">Select buyer</option><option *ngFor="let client of clients" [value]="client.id">{{ client.fullName || client.id }}</option></select>
            </div>
            <div class="form-group">
              <label>Offer Amount *</label>
              <input [(ngModel)]="formData.offerAmount" name="offerAmount" type="number" placeholder="Offer amount" required />
            </div>
            <div class="form-group">
              <label>Earnest Money</label>
              <input [(ngModel)]="formData.earnestMoney" name="earnestMoney" type="number" placeholder="Earnest money" />
            </div>
            <div class="actions">
              <button type="button" class="btn" (click)="showForm = false">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Submitting...' : 'Submit Offer' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.table th,.table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:left}.badge{padding:2px 10px;border-radius:999px;background:#fee2e2;color:#991b1b}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{color:#b91c1c;border-color:#fecaca;background:#fff1f2}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}.modal{background:#fff;border-radius:12px;padding:24px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto}.modal h3{margin:0 0 16px;color:#0f172a}.form-group{margin-bottom:16px;display:flex;flex-direction:column}.form-group label{margin-bottom:6px;font-weight:500;color:#334155}.form-group input{padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px}.form-group input:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}`],
})
export class OffersPage implements OnInit, OnDestroy {
  private svc = inject(OffersService);
  private propertiesSvc = inject(PropertiesService);
  private listingsSvc = inject(ListingsService);
  private clientsSvc = inject(ClientsService);
  private sub?: Subscription;

  loading = true;
  error = '';
  rows: any[] = [];
  showForm = false;
  submitting = false;
  formData: any = {};
  properties: any[] = [];
  listings: any[] = [];
  clients: any[] = [];

  private resetForm() {
    return { propertyId: '', listingId: '', buyerId: '', offerAmount: 0, earnestMoney: 0 };
  }

  async ngOnInit() {
    this.formData = this.resetForm();
    this.properties = await firstValueFrom(this.propertiesSvc.list());
    this.clients = await firstValueFrom(this.clientsSvc.list());
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => { this.rows = rows; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load offers'; this.loading = false; },
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

  async submitForm() {
    if (!this.formData.propertyId || !this.formData.listingId || !this.formData.buyerId || !this.formData.offerAmount) return;
    try {
      this.submitting = true;
      await this.svc.create(this.formData);
      this.showForm = false;
      this.formData = this.resetForm();
    } catch (err: any) {
      this.error = err?.message || 'Failed to submit offer';
    } finally {
      this.submitting = false;
    }
  }
}
