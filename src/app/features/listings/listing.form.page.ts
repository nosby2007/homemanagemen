import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ListingsService } from './listings.service';
import { PropertiesService } from '../properties/properties.service';

@Component({
  standalone: true,
  selector: 'app-listing-form-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="head">
        <h2>{{ isEdit ? 'Edit Listing' : 'Add Listing' }}</h2>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()" class="form">
        <label>Title</label>
        <input formControlName="title" />

        <label>Listing Type</label>
        <select formControlName="listingType">
          <option value="sale">Sale</option>
          <option value="rent">Rent</option>
        </select>

        <label>Status</label>
        <select formControlName="listingStatus">
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="sold">Sold</option>
          <option value="rented">Rented</option>
          <option value="expired">Expired</option>
        </select>

        <label>Address</label>
        <input formControlName="address" />

        <label>Property</label>
        <select formControlName="propertyId">
          <option value="">Select property</option>
          <option *ngFor="let property of properties" [value]="property.id">{{ property.name || property.id }}</option>
        </select>

        <label>Price</label>
        <input type="number" formControlName="price" />

        <div class="actions">
          <button class="btn" type="button" (click)="cancel()">Cancel</button>
          <button class="btn primary" type="submit" [disabled]="saving || form.invalid">{{ saving ? 'Saving...' : 'Save Listing' }}</button>
        </div>
      </form>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px;max-width:700px}.head h2{margin:0}.form{display:grid;gap:8px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px}.form label{font-weight:600}.form input,.form select{padding:10px;border:1px solid #d1d5db;border-radius:8px}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}`],
})
export class ListingFormPage implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(ListingsService);
  private propertiesSvc = inject(PropertiesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  listingId = '';
  isEdit = false;
  saving = false;
  properties: any[] = [];

  form = this.fb.group({
    title: ['', Validators.required],
    listingType: ['sale', Validators.required],
    listingStatus: ['draft', Validators.required],
    address: [''],
    propertyId: ['', Validators.required],
    price: [0],
  });

  async ngOnInit() {
    this.properties = await firstValueFrom(this.propertiesSvc.list());
    this.listingId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit = !!this.listingId;
    if (this.isEdit) {
      this.svc.get(this.listingId).subscribe((row: any) => {
        if (!row) return;
        this.form.patchValue({
          title: row.title || '',
          listingType: row.listingType || 'sale',
          listingStatus: row.listingStatus || 'draft',
          address: row.address || '',
          propertyId: row.propertyId || '',
          price: Number(row.price || row.rentAmount || 0),
        });
      });
    }
  }

  async save() {
    if (this.form.invalid) return;
    this.saving = true;
    const payload: any = this.form.getRawValue();
    if (payload.listingType === 'rent') {
      payload.rentAmount = Number(payload.price || 0);
      delete payload.price;
    }

    if (this.isEdit) await this.svc.update(this.listingId, payload);
    else this.listingId = await this.svc.create(payload);

    this.saving = false;
    await this.router.navigate(['/listings', this.listingId]);
  }

  cancel() { this.router.navigateByUrl('/listings'); }
}
