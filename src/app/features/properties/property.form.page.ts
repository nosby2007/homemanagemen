import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { PropertiesService } from './properties.service';
import { Property } from '../../core/models/property.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="page">
    <div class="card">
      <div class="header">
        <div>
          <div class="h1">{{ isEdit ? 'Edit Property' : 'New Property' }}</div>
          <div class="muted">All data saved under orgs/{{ '{' }}orgId{{ '}' }}/properties/{{ '{' }}propertyId{{ '}' }}</div>
        </div>
        <button class="btn secondary" type="button" (click)="back()">Back</button>
      </div>

      <!-- Basic Information -->
      <div class="section-title">Basic Information</div>
      
      <label class="lbl">Property Name*</label>
      <input class="input" [(ngModel)]="name" placeholder="e.g., 123 Main St" />

      <div class="grid2">
        <div>
          <label class="lbl">Property Type*</label>
          <select class="input" [(ngModel)]="propertyType">
            <option value="single_family">Single Family Home</option>
            <option value="multi_family">Multi-Family Building</option>
            <option value="apartment_complex">Apartment Complex</option>
            <option value="condo">Condominium</option>
            <option value="townhouse">Townhouse</option>
            <option value="commercial">Commercial</option>
            <option value="mixed_use">Mixed Use</option>
          </select>
        </div>
        <div>
          <label class="lbl">Status</label>
          <select class="input" [(ngModel)]="status">
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
            <option value="listed_for_sale">Listed for Sale</option>
            <option value="listed_for_rent">Listed for Rent</option>
          </select>
        </div>
      </div>

      <!-- Location -->
      <div class="section-title">Location</div>
      
      <label class="lbl">Address Line 1*</label>
      <input class="input" [(ngModel)]="streetAddress" placeholder="e.g., 123 Main Street" />

      <label class="lbl">Address Line 2</label>
      <input class="input" [(ngModel)]="addressLine2" placeholder="e.g., Apt 4B, Suite 200" />

      <div class="grid3">
        <div>
          <label class="lbl">City*</label>
          <input class="input" [(ngModel)]="city" placeholder="City" />
        </div>
        <div>
          <label class="lbl">State/Province*</label>
          <input class="input" [(ngModel)]="state" placeholder="State" />
        </div>
        <div>
          <label class="lbl">ZIP/Postal Code*</label>
          <input class="input" [(ngModel)]="zipCode" placeholder="ZIP" />
        </div>
      </div>

      <div class="grid2">
        <div>
          <label class="lbl">Country*</label>
          <input class="input" [(ngModel)]="country" placeholder="Country" />
        </div>
        <div>
          <label class="lbl">Year Built</label>
          <input class="input" type="number" [(ngModel)]="yearBuilt" placeholder="e.g., 2000" />
        </div>
      </div>

      <!-- Property Details -->
      <div class="section-title">Property Details</div>

      <div class="grid3">
        <div>
          <label class="lbl">Total Square Feet</label>
          <input class="input" type="number" [(ngModel)]="squareFeet" placeholder="sq ft" />
        </div>
        <div>
          <label class="lbl">Width (feet)</label>
          <input class="input" type="number" [(ngModel)]="width" placeholder="feet" />
        </div>
        <div>
          <label class="lbl">Length (feet)</label>
          <input class="input" type="number" [(ngModel)]="length" placeholder="feet" />
        </div>
      </div>

      <div class="grid3">
        <div>
          <label class="lbl">Lot Size (acres)</label>
          <input class="input" type="number" [(ngModel)]="lotSize" placeholder="acres" />
        </div>
        <div>
          <label class="lbl">Parking Spaces</label>
          <input class="input" type="number" [(ngModel)]="parkingSpaces" placeholder="0" />
        </div>
        <div></div>
      </div>

      <!-- Multi-Unit Configuration -->
      <div class="section-title">
        Multi-Unit Configuration
        <label class="checkbox-container">
          <input type="checkbox" [(ngModel)]="hasMultipleUnits" (change)="onMultiUnitToggle()" />
          <span>This property has multiple units/apartments</span>
        </label>
      </div>

      <div *ngIf="!hasMultipleUnits">
        <!-- Single Unit Details -->
        <div class="grid3">
          <div>
            <label class="lbl">Bedrooms</label>
            <input class="input" type="number" [(ngModel)]="bedrooms" placeholder="0" />
          </div>
          <div>
            <label class="lbl">Bathrooms</label>
            <input class="input" type="number" [(ngModel)]="bathrooms" placeholder="0" />
          </div>
          <div>
            <label class="lbl">Furnished</label>
            <select class="input" [(ngModel)]="furnished">
              <option [ngValue]="false">No</option>
              <option [ngValue]="true">Yes</option>
            </select>
          </div>
        </div>

        <div class="grid2">
          <div>
            <label class="lbl">Monthly Rent</label>
            <input class="input" type="number" [(ngModel)]="monthlyRent" placeholder="$" />
          </div>
          <div>
            <label class="lbl">Security Deposit</label>
            <input class="input" type="number" [(ngModel)]="securityDeposit" placeholder="$" />
          </div>
        </div>
      </div>

      <div *ngIf="hasMultipleUnits">
        <!-- Multiple Units Management -->
        <div class="units-header">
          <span>Units/Apartments ({{ units.length }})</span>
          <button class="btn-small" type="button" (click)="addUnit()">+ Add Unit</button>
        </div>

        <div class="units-list" *ngIf="units.length > 0">
          <div class="unit-card" *ngFor="let unit of units; let i = index">
            <div class="unit-header">
              <span class="unit-title">Unit {{ i + 1 }}</span>
              <button class="btn-remove" type="button" (click)="removeUnit(i)">✕</button>
            </div>

            <div class="grid2">
              <div>
                <label class="lbl-small">Unit/Apt Number*</label>
                <input class="input-small" [(ngModel)]="unit.unitNumber" placeholder="e.g., 101, A1" />
              </div>
              <div>
                <label class="lbl-small">Floor</label>
                <input class="input-small" type="number" [(ngModel)]="unit.floor" placeholder="Floor" />
              </div>
            </div>

            <div class="grid3">
              <div>
                <label class="lbl-small">Bedrooms</label>
                <input class="input-small" type="number" [(ngModel)]="unit.bedrooms" placeholder="0" />
              </div>
              <div>
                <label class="lbl-small">Bathrooms</label>
                <input class="input-small" type="number" [(ngModel)]="unit.bathrooms" placeholder="0" />
              </div>
              <div>
                <label class="lbl-small">Square Feet</label>
                <input class="input-small" type="number" [(ngModel)]="unit.squareFeet" placeholder="sq ft" />
              </div>
            </div>

            <div class="grid3">
              <div>
                <label class="lbl-small">Monthly Rent</label>
                <input class="input-small" type="number" [(ngModel)]="unit.monthlyRent" placeholder="$" />
              </div>
              <div>
                <label class="lbl-small">Security Deposit</label>
                <input class="input-small" type="number" [(ngModel)]="unit.securityDeposit" placeholder="$" />
              </div>

              <div>
                <label class="lbl-small">Status</label>
                <select class="input-small" [(ngModel)]="unit.status">
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            <div class="grid2">
              <div>
                <label class="lbl-small">Furnished</label>
                <select class="input-small" [(ngModel)]="unit.furnished">
                  <option [ngValue]="false">No</option>
                  <option [ngValue]="true">Yes</option>
                </select>
              </div>
              <div>
                <label class="lbl-small">Type</label>
                <select class="input-small" [(ngModel)]="unit.unitType">
                  <option value="studio">Studio</option>
                  <option value="apartment">Apartment</option>
                  <option value="penthouse">Penthouse</option>
                  <option value="loft">Loft</option>
                </select>
              </div>
            </div>

            <label class="lbl-small">Notes</label>
            <textarea class="input-small textarea" [(ngModel)]="unit.notes" placeholder="Additional unit details..."></textarea>
          </div>
        </div>
      </div>

      <!-- Additional Information -->
      <div class="section-title">Additional Information</div>
      
      <label class="lbl">Description</label>
      <textarea class="input textarea" [(ngModel)]="description" placeholder="Property description, amenities, special features..."></textarea>

      <div class="actions">
        <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>
        <div class="status" *ngIf="statusMsg">{{ statusMsg }}</div>
        <button class="btn" type="button" (click)="save()">Save Property</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .page{padding:24px;min-height:100vh;background:#f8fafc}
    .card{background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;max-width:900px;margin:0 auto;box-shadow:0 4px 16px rgba(0,0,0,.08)}
    .header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e2e8f0}
    .h1{font-size:28px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;margin-bottom:8px}
    .muted{color:#64748b;font-size:13px;font-weight:500}
    .section-title{font-size:16px;font-weight:700;color:#334155;margin-top:36px;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #3b82f6;letter-spacing:-0.3px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px}
    .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:12px}
    @media (max-width: 900px){.grid2,.grid3{grid-template-columns:1fr}}
    .lbl{display:block;margin-top:16px;margin-bottom:8px;color:#475569;font-size:13px;font-weight:600;letter-spacing:0.3px}
    .lbl-small{display:block;margin-top:12px;margin-bottom:6px;color:#475569;font-size:12px;font-weight:600}
    .input,.input-small{width:100%;max-width:100%;padding:12px 16px;border-radius:8px;border:1px solid #cbd5e1;background:#ffffff;color:#1e293b;outline:none;font-size:14px;transition:all 0.2s ease;font-family:inherit}
    .input:focus,.input-small:focus{border-color:#3b82f6;background:#ffffff;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
    .input:hover,.input-small:hover{border-color:#94a3b8}
    .textarea{min-height:100px;resize:vertical;font-family:inherit;line-height:1.5}
    .checkbox-container{display:flex;align-items:center;gap:10px;margin-top:12px;cursor:pointer;color:#475569;font-size:14px}
    .checkbox-container input[type="checkbox"]{width:18px;height:18px;cursor:pointer;accent-color:#3b82f6}
    .units-header{display:flex;justify-content:space-between;align-items:center;margin-top:16px;margin-bottom:16px;padding:14px 18px;background:#eff6ff;border-radius:12px;border:1px solid #bfdbfe}
    .units-header span{font-size:15px;font-weight:700;color:#1e40af}
    .btn-small{padding:8px 16px;border-radius:8px;border:none;background:#3b82f6;color:white;font-weight:700;cursor:pointer;font-size:13px;transition:all 0.2s ease}
    .btn-small:hover{background:#2563eb;transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,.3)}
    .units-list{display:flex;flex-direction:column;gap:20px}
    .unit-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;transition:all 0.2s ease}
    .unit-card:hover{border-color:#cbd5e1;box-shadow:0 4px 12px rgba(0,0,0,.06)}
    .unit-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0}
    .unit-title{font-size:14px;font-weight:700;color:#334155}
    .btn-remove{padding:4px 10px;border-radius:6px;border:none;background:#fee2e2;color:#dc2626;font-weight:700;cursor:pointer;font-size:16px;transition:all 0.2s ease}
    .btn-remove:hover{background:#fecaca;transform:scale(1.05)}
    .actions{display:flex;justify-content:flex-end;align-items:center;margin-top:40px;padding-top:24px;gap:16px;flex-wrap:wrap;border-top:2px solid #e2e8f0}
    .btn{padding:14px 28px;border-radius:8px;border:none;background:#3b82f6;color:white;font-weight:700;cursor:pointer;font-size:15px;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(59,130,246,.2)}
    .btn:hover{background:#2563eb;transform:translateY(-2px);box-shadow:0 4px 16px rgba(59,130,246,.3)}
    .btn.secondary{background:#f1f5f9;color:#475569;box-shadow:0 1px 3px rgba(0,0,0,.1)}
    .btn.secondary:hover{background:#e2e8f0}
    .error{color:#dc2626;font-weight:700;font-size:13px;padding:10px 16px;background:#fee2e2;border-radius:8px;border:1px solid #fecaca}
    .status{color:#475569;font-size:13px;font-weight:600;padding:10px 16px;background:#f1f5f9;border-radius:8px}
  `]
})
export class PropertyFormPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private props = inject(PropertiesService);

  isEdit = false;
  propertyId: string | null = null;

  name = '';
  propertyType: string = 'single_family';
  status: any = 'available';
  streetAddress = '';
  addressLine2 = '';
  city = '';
  state = '';
  zipCode = '';
  country = '';
  yearBuilt: number | null = null;
  squareFeet: number | null = null;
  width: number | null = null;
  length: number | null = null;
  lotSize: number | null = null;
  parkingSpaces: number | null = null;
  hasMultipleUnits = false;
  bedrooms: number | null = null;
  bathrooms: number | null = null;
  monthlyRent: number | null = null;
  securityDeposit: number | null = null;
  furnished = false;
  units: any[] = [];
  description = '';
  owner = '';
  manager = '';
  contactPhone = '';
  contactEmail = '';
  
  errorMsg = '';
  statusMsg = '';

  ngOnInit() {
    this.propertyId = this.route.snapshot.paramMap.get('propertyId');
    this.isEdit = !!this.propertyId;

    if (this.propertyId) {
      this.props.get(this.propertyId).subscribe((p: Property) => {
        this.name = p?.name ?? '';
        this.status = p?.status ?? 'available';
        this.monthlyRent = (p?.monthlyRent ?? null) as any;
        this.securityDeposit = (p?.securityDeposit ?? null) as any;
        this.furnished = !!p?.furnished;
        this.propertyType = p?.type ?? 'single_family';
        this.streetAddress = p?.streetAddress ?? '';
        this.city = p?.city ?? '';
        this.state = p?.state ?? '';
        this.zipCode = p?.zipCode ?? '';
        this.country = p?.country ?? '';
        this.yearBuilt = (p?.yearBuilt ?? null) as any;
        this.squareFeet = (p?.squareFeet ?? null) as any;
        this.lotSize = (p?.lotSize ?? null) as any;
        this.parkingSpaces = (p?.parkingSpaces ?? null) as any;
        this.hasMultipleUnits = !!p?.hasMultipleUnits;
        this.bedrooms = (p?.bedrooms ?? null) as any;
        this.bathrooms = (p?.bathrooms ?? null) as any;
        this.units = p?.units ? [...p.units] : [];
        this.description = p?.description ?? '';
        this.owner = p?.owner ?? '';
        this.manager = p?.manager ?? '';
        this.contactPhone = p?.contactPhone ?? '';
        this.contactEmail = p?.contactEmail ?? '';
      });
    }
  }

  onMultiUnitToggle() {
    if (!this.hasMultipleUnits) {
      this.units = [];
    }
  }

  addUnit() {
    this.units.push({
      unitNumber: '',
      floor: null,
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
      monthlyRent: null,
      securityDeposit: null,
      status: 'available',
      furnished: false,
      unitType: 'apartment',
      notes: ''
    });
  }

  removeUnit(index: number) {
    this.units.splice(index, 1);
  }

  async back() {
    await this.router.navigateByUrl('/properties');
  }

  async save() {
    this.errorMsg = '';
    this.statusMsg = '';

    try {
      const payload: Partial<Property> = {
        name: (this.name || '').trim() || undefined,
        type: this.propertyType as any,
        status: this.status,
        streetAddress: (this.streetAddress || '').trim() || undefined,
        city: (this.city || '').trim() || undefined,
        state: (this.state || '').trim() || undefined,
        zipCode: (this.zipCode || '').trim() || undefined,
        country: (this.country || '').trim() || undefined,
        yearBuilt: this.yearBuilt ?? undefined,
        squareFeet: this.squareFeet ?? undefined,
        lotSize: this.lotSize ?? undefined,
        parkingSpaces: this.parkingSpaces ?? undefined,
        hasMultipleUnits: this.hasMultipleUnits,
        bedrooms: this.bedrooms ?? undefined,
        bathrooms: this.bathrooms ?? undefined,
        monthlyRent: this.monthlyRent ?? undefined,
        securityDeposit: this.securityDeposit ?? undefined,
        furnished: !!this.furnished,
        units: this.units.length > 0 ? this.units : undefined,
        description: (this.description || '').trim() || undefined,
        owner: (this.owner || '').trim() || undefined,
        manager: (this.manager || '').trim() || undefined,
        contactPhone: (this.contactPhone || '').trim() || undefined,
        contactEmail: (this.contactEmail || '').trim() || undefined,
      };

      this.statusMsg = 'Saving...';
      if (this.propertyId) {
        await this.props.update(this.propertyId, payload);
        this.statusMsg = 'Saved.';
        await this.router.navigateByUrl(`/properties/${this.propertyId}`);
      } else {
        const id = await this.props.create(payload);
        this.statusMsg = 'Created.';
        await this.router.navigateByUrl(`/properties/${id}`);
      }
    } catch (e: any) {
      this.errorMsg = e?.message ?? String(e);
      this.statusMsg = '';
    }
  }
}
