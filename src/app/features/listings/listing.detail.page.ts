import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ListingsService } from './listings.service';

@Component({
  standalone: true,
  selector: 'app-listing-detail-page',
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="state error" *ngIf="loadError">{{ loadError }}</div>

    <div class="page" *ngIf="listing as l; else loadingTpl">
      <header class="head">
        <div>
          <h2>{{ editMode ? 'Edit Listing' : l.title }}</h2>
          <p *ngIf="!editMode">{{ l.address || 'No address provided' }}</p>
        </div>
        <div class="actions">
          <button *ngIf="!editMode" class="btn" (click)="editMode = true">Edit</button>
          <a *ngIf="!editMode" class="btn" routerLink="/listings">Back</a>
          <button *ngIf="editMode" class="btn" (click)="cancelEdit()">Cancel</button>
          <button *ngIf="editMode" class="btn primary" (click)="saveEdit()" [disabled]="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
        </div>
      </header>

      <div class="state error" *ngIf="saveError">{{ saveError }}</div>

      <div *ngIf="!editMode" class="grid">
        <article class="card"><h4>Listing Type</h4><p>{{ l.listingType }}</p></article>
        <article class="card"><h4>Status</h4><p>{{ l.listingStatus }}</p></article>
        <article class="card"><h4>Price / Rent</h4><p>{{ (l.price || l.rentAmount || 0) | currency }}</p></article>
        <article class="card"><h4>Agent</h4><p>{{ l.assignedAgentId || '-' }}</p></article>
        <article class="card"><h4>Bedrooms</h4><p>{{ l.bedrooms || '-' }}</p></article>
        <article class="card"><h4>Bathrooms</h4><p>{{ l.bathrooms || '-' }}</p></article>
      </div>

      <section *ngIf="!editMode" class="card">
        <h4>Description</h4>
        <p>{{ l.description || 'No description yet.' }}</p>
      </section>

      <form *ngIf="editMode" class="form">
        <div class="form-group">
          <label>Title</label>
          <input [(ngModel)]="editData.title" name="title" />
        </div>
        <div class="form-group">
          <label>Address</label>
          <input [(ngModel)]="editData.address" name="address" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea [(ngModel)]="editData.description" name="description" rows="3"></textarea>
        </div>
        <div class="grid-form">
          <div class="form-group">
            <label>Price</label>
            <input [(ngModel)]="editData.price" name="price" type="number" />
          </div>
          <div class="form-group">
            <label>Bedrooms</label>
            <input [(ngModel)]="editData.bedrooms" name="bedrooms" type="number" />
          </div>
          <div class="form-group">
            <label>Bathrooms</label>
            <input [(ngModel)]="editData.bathrooms" name="bathrooms" type="number" />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select [(ngModel)]="editData.listingStatus" name="status">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </form>
    </div>

    <ng-template #loadingTpl>
      <div class="state" *ngIf="!loadError">Loading listing...</div>
    </ng-template>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px}.card h4{margin:0 0 8px}.card p{margin:0;color:#334155}.actions{display:flex;gap:8px}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;text-decoration:none;color:#0f172a;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{border:1px solid #fecdd3;background:#fff1f2;color:#9f1239;margin-bottom:10px}.form{display:grid;gap:16px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px}.grid-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}.form-group{display:flex;flex-direction:column}.form-group label{margin-bottom:6px;font-weight:500;color:#334155}.form-group input,.form-group select,.form-group textarea{padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-family:inherit}.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}`],
})
export class ListingDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(ListingsService);

  listing: any;
  editMode = false;
  saving = false;
  editData: any = {};
  loadError = '';
  saveError = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.svc.get(id).subscribe({
      next: (row: any) => {
        this.listing = row;
        this.editData = { ...row };
      },
      error: (err: any) => {
        this.loadError = err?.message || 'Unable to load this listing.';
      },
    });
  }

  cancelEdit() {
    this.editMode = false;
    if (this.listing) {
      this.editData = { ...this.listing };
    }
  }

  async saveEdit() {
    if (!this.listing) return;
    this.saveError = '';
    try {
      this.saving = true;
      await this.svc.update(this.listing.id, this.editData);
      this.listing = { ...this.editData };
      this.editMode = false;
    } catch (err: any) {
      this.saveError = err?.message || 'Failed to save listing.';
    } finally {
      this.saving = false;
    }
  }
}
