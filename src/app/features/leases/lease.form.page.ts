import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { LeasesService } from './leases.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="card">
        <div class="h1">New Lease</div>
        <div class="muted">Create a comprehensive lease agreement for this property.</div>

        <label class="lbl">Tenant NAME *</label>
        <input class="input" [(ngModel)]="tenantId" placeholder="Enter tenant NAME" />

        <label class="lbl">Unit ID *</label>
        <input class="input" [(ngModel)]="unitId" placeholder="Enter unit ID" />

        <label class="lbl">Landlord ID</label>
        <input class="input" [(ngModel)]="landlordId" placeholder="Optional landlord ID" />

        <label class="lbl">Lease Start Date *</label>
        <input class="input" type="date" [(ngModel)]="startDate" />

        <label class="lbl">Lease End Date *</label>
        <input class="input" type="date" [(ngModel)]="endDate" />

        <label class="lbl">Lease Term</label>
        <input class="input" [(ngModel)]="leaseTerm" placeholder="e.g. 12 months" />

        <label class="lbl">Monthly Rent *</label>
        <input class="input" type="number" [(ngModel)]="monthlyRent" placeholder="e.g. 1200" />

        <label class="lbl">Security Deposit *</label>
        <input class="input" type="number" [(ngModel)]="securityDeposit" placeholder="e.g. 1200" />

        <label class="lbl">Payment Due Day</label>
        <input class="input" type="number" [(ngModel)]="paymentDueDay" placeholder="e.g. 1 (1st of month)" min="1" max="31" />

        <label class="lbl">Late Fee Amount</label>
        <input class="input" type="number" [(ngModel)]="lateFee" placeholder="e.g. 50" />

        <label class="lbl">Lease Type</label>
        <select class="input" [(ngModel)]="leaseType">
          <option value="">Select lease type</option>
          <option value="fixed">Fixed Term</option>
          <option value="month-to-month">Month-to-Month</option>
          <option value="yearly">Yearly</option>
        </select>

        <label class="lbl">Number of Occupants</label>
        <input class="input" type="number" [(ngModel)]="numberOfOccupants" placeholder="e.g. 2" min="1" />

        <label class="lbl">Pet Policy</label>
        <select class="input" [(ngModel)]="petPolicy">
          <option value="">Select pet policy</option>
          <option value="no-pets">No Pets</option>
          <option value="cats-only">Cats Only</option>
          <option value="dogs-only">Dogs Only</option>
          <option value="cats-and-dogs">Cats and Dogs Allowed</option>
        </select>

        <label class="lbl">Pet Deposit</label>
        <input class="input" type="number" [(ngModel)]="petDeposit" placeholder="e.g. 300" />

        <label class="lbl">Utilities Included</label>
        <div class="checkbox-group">
          <label class="checkbox-lbl">
            <input type="checkbox" [(ngModel)]="utilitiesIncluded.water" />
            <span>Water</span>
          </label>
          <label class="checkbox-lbl">
            <input type="checkbox" [(ngModel)]="utilitiesIncluded.electricity" />
            <span>Electricity</span>
          </label>
          <label class="checkbox-lbl">
            <input type="checkbox" [(ngModel)]="utilitiesIncluded.gas" />
            <span>Gas</span>
          </label>
          <label class="checkbox-lbl">
            <input type="checkbox" [(ngModel)]="utilitiesIncluded.internet" />
            <span>Internet</span>
          </label>
          <label class="checkbox-lbl">
            <input type="checkbox" [(ngModel)]="utilitiesIncluded.trash" />
            <span>Trash</span>
          </label>
        </div>

        <label class="lbl">Parking Spaces</label>
        <input class="input" type="number" [(ngModel)]="parkingSpaces" placeholder="e.g. 1" min="0" />

        <label class="lbl">Storage Unit</label>
        <select class="input" [(ngModel)]="storageUnit">
          <option value="">No storage unit</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>

        <label class="lbl">Renewal Options</label>
        <select class="input" [(ngModel)]="renewalOption">
          <option value="">Select renewal option</option>
          <option value="automatic">Automatic Renewal</option>
          <option value="negotiable">Negotiable</option>
          <option value="no-renewal">No Renewal</option>
        </select>

        <label class="lbl">Special Terms & Conditions</label>
        <textarea class="input textarea" [(ngModel)]="specialTerms" placeholder="Enter any special terms, conditions, or notes..." rows="4"></textarea>

        <label class="lbl">Maintenance Responsibilities</label>
        <textarea class="input textarea" [(ngModel)]="maintenanceResponsibilities" placeholder="Outline tenant maintenance responsibilities..." rows="3"></textarea>

        <div class="actions">
          <button class="btn" (click)="create()">Create Lease</button>
          <button class="btn secondary" (click)="back()">Cancel</button>
        </div>

        <div class="muted" *ngIf="errorMessage">{{ errorMessage }}</div>
      </div>
    </div>
  `,
  styles: [`
    .page{ padding:16px; }
    .card{ background: rgba(15,23,42,.78); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:14px; }
    .h1{ font-size:18px; font-weight:900; color:#e5e7eb; }
    .muted{ color: rgba(226,232,240,.75); font-size:12px; margin-top:4px; }
    .lbl{ display:block; margin-top:12px; margin-bottom:6px; color: rgba(226,232,240,.85); font-size:12px; }
    .input{ width:100%; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(2,6,23,.25); color:#e5e7eb; outline:none; }
    .actions{ display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }
    .btn{ padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(59,130,246,.85); color:white; font-weight:800; cursor:pointer; }
    .btn.secondary{ background: rgba(148,163,184,.20); }
  `]
})
export class LeaseFormPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private leases = inject(LeasesService);

  tenantId = '';
  unitId = '';
  landlordId = '';
  startDate = '';
  endDate = '';
  leaseTerm = '';
  monthlyRent = '';
  securityDeposit = '';
  paymentDueDay = '';
  lateFee = '';
  leaseType = '';
  numberOfOccupants = '';
  petPolicy = '';
  petDeposit = '';
  utilitiesIncluded = {
    water: false,
    electricity: false,
    gas: false,
    internet: false,
    trash: false
  };
  parkingSpaces = '';
  storageUnit = '';
  renewalOption = '';
  specialTerms = '';
  maintenanceResponsibilities = '';
  errorMessage = '';

  private toTimestamp(dateString: string): number | undefined {
    if (!dateString) return undefined;
    return new Date(dateString).getTime();
  }

  async create() {
    this.errorMessage = '';
    const propertyId = String(this.route.snapshot.paramMap.get('propertyId') || '').trim();
    if (!propertyId) {
      this.errorMessage = 'Missing property context for lease creation.';
      return;
    }
    if (!String(this.tenantId || '').trim()) {
      this.errorMessage = 'Tenant is required.';
      return;
    }
    if (!String(this.unitId || '').trim()) {
      this.errorMessage = 'Unit is required.';
      return;
    }
    const leaseId = await this.leases.create(propertyId, {
      tenantId: (this.tenantId || '').trim() || undefined,
      unitId: (this.unitId || '').trim() || undefined,
      landlordId: (this.landlordId || '').trim() || undefined,
      monthlyRent: this.monthlyRent ? Number(this.monthlyRent) : 0,
      securityDeposit: this.securityDeposit ? Number(this.securityDeposit) : 0
    });
    await this.router.navigateByUrl(`/properties/${propertyId}/leases/${leaseId}`);
  }

  async back() {
    const propertyId = this.route.snapshot.paramMap.get('propertyId')!;
    await this.router.navigateByUrl(`/properties/${propertyId}/leases`);
  }
}
