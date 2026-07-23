import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TenantsService } from '../tenants/tenants.service';
import { PropertiesService } from '../properties/properties.service';
import { UnitsService } from '../units/units.service';

@Component({
  selector: 'app-landlord-tenant',
  template: `
    <div class="page landlord-tenant-page">
      <div class="top-bar"> 
        <button class="btn sm" (click)="goBack()">← Back to Portal</button>
        <h1>Tenants</h1>
      </div>
      

      <div class="controls">
        <input
          type="text"
          [(ngModel)]="searchTerm"
          (input)="filterTenants()"
          placeholder="Search tenants by name, email, or phone..."
          class="search-input"
        />
        <button class="btn primary" (click)="showAddTenantDialog = true">+ Add Tenant</button>
      </div>


      <!-- Add Tenant Dialog -->
      <div class="dialog-backdrop" *ngIf="showAddTenantDialog">
        <div class="dialog add-tenant-dialog">
          <h2>Add Tenant</h2>
          <form (ngSubmit)="submitAddTenant()" #addTenantForm="ngForm">
            <div class="form-group">
              <label>Name</label>
              <input type="text" [(ngModel)]="newTenant.name" name="name" required />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="newTenant.email" name="email" required />
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input type="text" [(ngModel)]="newTenant.phone" name="phone" required />
            </div>
            <div class="form-group">
              <label>Property</label>
              <select [(ngModel)]="newTenant.propertyId" name="propertyId" required (ngModelChange)="onAddPropertyChange()">
                <option value="" disabled>Select property</option>
                <option *ngFor="let p of properties" [value]="p.id">{{ p.name || p.id }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Unit</label>
              <select [(ngModel)]="newTenant.unitId" name="unitId" required [disabled]="!newTenant.propertyId">
                <option value="" disabled>Select unit</option>
                <option *ngFor="let u of addUnits" [value]="u.id">{{ u.unitNumber || u.id }}</option>
              </select>
              <small *ngIf="newTenant.propertyId && !addUnits.length">This property has no units yet. Add one on the Units page first.</small>
            </div>
            <div class="form-group">
              <label>Lease End Date</label>
              <input type="date" [(ngModel)]="newTenant.leaseEndDate" name="leaseEndDate" required />
            </div>
            <div class="form-error" *ngIf="addError">{{ addError }}</div>
            <div class="dialog-actions">
              <button class="btn primary" type="submit" [disabled]="addTenantForm.invalid || addSaving">{{ addSaving ? 'Adding...' : 'Add' }}</button>
              <button class="btn" type="button" (click)="closeAddTenantDialog()">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- View Tenant Dialog -->
      <div class="dialog-backdrop" *ngIf="showViewTenantDialog">
        <div class="dialog view-tenant-dialog">
          <h2>Tenant Details</h2>
          <div *ngIf="selectedTenant">
            <div class="form-group"><label>Name</label><div>{{ selectedTenant.name }}</div></div>
            <div class="form-group"><label>Email</label><div>{{ selectedTenant.email }}</div></div>
            <div class="form-group"><label>Phone</label><div>{{ selectedTenant.phone }}</div></div>
            <div class="form-group"><label>Property</label><div>{{ selectedTenant.property }}</div></div>
            <div class="form-group"><label>Lease End Date</label><div>{{ selectedTenant.leaseEndDate | date }}</div></div>
          </div>
          <div class="dialog-actions">
            <button class="btn" type="button" (click)="closeViewTenantDialog()">Close</button>
          </div>
        </div>
      </div>

      <!-- Edit Tenant Dialog -->
      <div class="dialog-backdrop" *ngIf="showEditTenantDialog">
        <div class="dialog edit-tenant-dialog">
          <h2>Edit Tenant</h2>
          <form (ngSubmit)="submitEditTenant()" #editTenantForm="ngForm">
            <div class="form-group">
              <label>Name</label>
              <input type="text" [(ngModel)]="editTenantData.name" name="editName" required />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="editTenantData.email" name="editEmail" required />
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input type="text" [(ngModel)]="editTenantData.phone" name="editPhone" required />
            </div>
            <div class="form-group">
              <label>Property</label>
              <select [(ngModel)]="editTenantData.propertyId" name="editPropertyId" required (ngModelChange)="onEditPropertyChange()">
                <option value="" disabled>Select property</option>
                <option *ngFor="let p of properties" [value]="p.id">{{ p.name || p.id }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Unit</label>
              <select [(ngModel)]="editTenantData.unitId" name="editUnitId" required [disabled]="!editTenantData.propertyId">
                <option value="" disabled>Select unit</option>
                <option *ngFor="let u of editUnits" [value]="u.id">{{ u.unitNumber || u.id }}</option>
              </select>
              <small *ngIf="editTenantData.propertyId && !editUnits.length">This property has no units yet. Add one on the Units page first.</small>
            </div>
            <div class="form-group">
              <label>Lease End Date</label>
              <input type="date" [(ngModel)]="editTenantData.leaseEndDate" name="editLeaseEndDate" required />
            </div>
            <div class="form-error" *ngIf="editError">{{ editError }}</div>
            <div class="dialog-actions">
              <button class="btn primary" type="submit" [disabled]="editTenantForm.invalid || editSaving">{{ editSaving ? 'Saving...' : 'Save' }}</button>
              <button class="btn" type="button" (click)="closeEditTenantDialog()">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Tenant Dialog -->
      <div class="dialog-backdrop" *ngIf="showDeleteTenantDialog">
        <div class="dialog delete-tenant-dialog">
          <h2>Delete Tenant</h2>
          <p>Are you sure you want to delete <strong>{{ selectedTenant?.name }}</strong>?</p>
          <div class="form-error" *ngIf="deleteError">{{ deleteError }}</div>
          <div class="dialog-actions">
            <button class="btn danger" (click)="confirmDeleteTenant()" [disabled]="deleteSaving">{{ deleteSaving ? 'Deleting...' : 'Delete' }}</button>
            <button class="btn" (click)="closeDeleteTenantDialog()">Cancel</button>
          </div>
        </div>
      </div>

      <div class="content">
        <div *ngIf="!isLoading && error" class="page-error">{{ error }}</div>
        <div *ngIf="isLoading" class="loading">Loading tenants...</div>
        
        <div *ngIf="!isLoading && filteredTenants.length === 0" class="empty-state">
          <p>No tenants found.</p>
          <button class="btn primary" (click)="showAddTenantDialog = true">Add Your First Tenant</button>
        </div>

        <div *ngIf="!isLoading && filteredTenants.length > 0" class="tenant-grid">
          <div *ngFor="let tenant of filteredTenants" class="tenant-card">
            <div class="tenant-info">
              <h3>{{ tenant.name }}</h3>
              <p><strong>Email:</strong> {{ tenant.email }}</p>
              <p><strong>Phone:</strong> {{ tenant.phone }}</p>
              <p><strong>Property:</strong> {{ tenant.property }}</p>
              <p><strong>Lease Ends:</strong> {{ tenant.leaseEndDate | date }}</p>
            </div>
            <div class="tenant-actions">
              <button class="btn sm" (click)="viewTenantDetails(tenant)">View</button>
              <button class="btn sm" (click)="editTenant(tenant)">Edit</button>
              <button class="btn sm danger" (click)="deleteTenant(tenant)">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: #fff;
      border-radius: 12px;
      padding: 32px 24px 24px 24px;
      min-width: 340px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      max-width: 95vw;
    }
    .dialog h2 {
      margin-top: 0;
      margin-bottom: 24px;
      font-size: 22px;
      color: #333;
    }
    .form-group {
      margin-bottom: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 14px;
      color: #444;
    }
    .form-group input, .form-group select {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    .form-group small {
      color: #b91c1c;
      font-size: 12px;
    }
    .form-error, .page-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      margin-bottom: 12px;
    }
    .dialog-actions {
      display: flex;
      gap: 12px;
      margin-top: 18px;
      justify-content: flex-end;
    }
    .landlord-tenant-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .top-bar {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 30px;
    }

    .top-bar h1 {
      margin: 0;
      font-size: 28px;
      color: #333;
    }

    .controls {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
      align-items: center;
    }

    .search-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }

    .search-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn.sm {
      padding: 8px 16px;
      font-size: 13px;
    }

    .btn.primary {
      background-color: #007bff;
      color: white;
    }

    .btn.primary:hover {
      background-color: #0056b3;
    }

    .btn.danger {
      background-color: #dc3545;
      color: white;
    }

    .btn.danger:hover {
      background-color: #c82333;
    }

    .btn:not(.primary):not(.danger) {
      background-color: #f8f9fa;
      color: #333;
      border: 1px solid #ddd;
    }

    .btn:not(.primary):not(.danger):hover {
      background-color: #e2e6ea;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-state p {
      color: #666;
      font-size: 16px;
      margin-bottom: 20px;
    }

    .tenant-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .tenant-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .tenant-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .tenant-info h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 20px;
    }

    .tenant-info p {
      margin: 8px 0;
      color: #666;
      font-size: 14px;
    }

    .tenant-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #f0f0f0;
    }

    .content {
      min-height: 400px;
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class LandlordTenantPage implements OnInit {
  tenants: any[] = [];
  filteredTenants: any[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  error: string = '';
  showAddTenantDialog: boolean = false;
  showViewTenantDialog: boolean = false;
  showEditTenantDialog: boolean = false;
  showDeleteTenantDialog: boolean = false;
  selectedTenant: any = null;
  editTenantData: any = null;

  properties: any[] = [];
  addUnits: any[] = [];
  editUnits: any[] = [];

  addError = '';
  addSaving = false;
  editError = '';
  editSaving = false;
  deleteError = '';
  deleteSaving = false;

  newTenant: any = {
    name: '',
    email: '',
    phone: '',
    propertyId: '',
    unitId: '',
    leaseEndDate: ''
  };

  constructor(
    private router: Router,
    private tenantsSvc: TenantsService,
    private propertiesSvc: PropertiesService,
    private unitsSvc: UnitsService,
  ) {}

  ngOnInit() {
    this.loadTenants();
    this.loadProperties();
  }

  private async loadProperties() {
    try {
      this.properties = await firstValueFrom(this.propertiesSvc.list());
    } catch {
      this.properties = [];
    }
  }

  async onAddPropertyChange() {
    this.newTenant.unitId = '';
    this.addUnits = [];
    if (!this.newTenant.propertyId) return;
    try {
      this.addUnits = await firstValueFrom(this.unitsSvc.listByProperty(this.newTenant.propertyId));
    } catch {
      this.addUnits = [];
    }
  }

  async onEditPropertyChange() {
    this.editTenantData.unitId = '';
    this.editUnits = [];
    if (!this.editTenantData.propertyId) return;
    try {
      this.editUnits = await firstValueFrom(this.unitsSvc.listByProperty(this.editTenantData.propertyId));
    } catch {
      this.editUnits = [];
    }
  }

  loadTenants() {
    this.isLoading = true;
    this.error = '';
    this.tenantsSvc.list().subscribe({
      next: (rows: any[]) => {
        this.tenants = rows.map((row) => ({
          ...row,
          name: row.displayName || row.name || '',
          property: row.currentPropertyId || '-',
          leaseEndDate: row.leaseEndDate || null,
        }));
        this.filteredTenants = [...this.tenants];
        this.isLoading = false;
      },
      error: (err: any) => {
        this.tenants = [];
        this.filteredTenants = [];
        this.error = err?.message || 'Unable to load tenants.';
        this.isLoading = false;
      }
    });
  }

  filterTenants() {
    if (!this.searchTerm.trim()) {
      this.filteredTenants = [...this.tenants];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredTenants = this.tenants.filter(tenant =>
      tenant.name?.toLowerCase().includes(term) ||
      tenant.email?.toLowerCase().includes(term) ||
      tenant.phone?.toLowerCase().includes(term)
    );
  }


  viewTenantDetails(tenant: any) {
    this.selectedTenant = { ...tenant };
    this.showViewTenantDialog = true;
  }

  closeViewTenantDialog() {
    this.showViewTenantDialog = false;
    this.selectedTenant = null;
  }


  closeAddTenantDialog() {
    this.showAddTenantDialog = false;
    this.addError = '';
    this.resetNewTenant();
  }

  async submitAddTenant() {
    this.addError = '';
    this.addSaving = true;
    try {
      await this.tenantsSvc.create({
        displayName: this.newTenant.name,
        email: this.newTenant.email,
        phone: this.newTenant.phone,
        currentPropertyId: this.newTenant.propertyId,
        currentUnitId: this.newTenant.unitId,
        leaseEndDate: this.dateInputToMs(this.newTenant.leaseEndDate),
        status: 'active',
      });
      this.closeAddTenantDialog();
      this.loadTenants();
    } catch (err: any) {
      this.addError = err?.message || 'Failed to add tenant.';
    } finally {
      this.addSaving = false;
    }
  }

  resetNewTenant() {
    this.newTenant = {
      name: '',
      email: '',
      phone: '',
      propertyId: '',
      unitId: '',
      leaseEndDate: ''
    };
    this.addUnits = [];
  }


  async editTenant(tenant: any) {
    this.selectedTenant = tenant;
    this.editError = '';
    this.editTenantData = {
      ...tenant,
      propertyId: tenant.currentPropertyId || '',
      unitId: tenant.currentUnitId || '',
      leaseEndDate: tenant.leaseEndDate ? this.formatDateForInput(tenant.leaseEndDate) : ''
    };
    this.editUnits = [];
    if (this.editTenantData.propertyId) {
      try {
        this.editUnits = await firstValueFrom(this.unitsSvc.listByProperty(this.editTenantData.propertyId));
      } catch {
        this.editUnits = [];
      }
    }
    this.showEditTenantDialog = true;
  }

  closeEditTenantDialog() {
    this.showEditTenantDialog = false;
    this.editError = '';
    this.editTenantData = null;
    this.selectedTenant = null;
  }

  async submitEditTenant() {
    if (!this.selectedTenant) return;
    this.editError = '';
    this.editSaving = true;
    try {
      await this.tenantsSvc.update(this.selectedTenant.id, {
        displayName: this.editTenantData.name,
        email: this.editTenantData.email,
        phone: this.editTenantData.phone,
        currentPropertyId: this.editTenantData.propertyId,
        currentUnitId: this.editTenantData.unitId,
        leaseEndDate: this.dateInputToMs(this.editTenantData.leaseEndDate),
      });
      this.loadTenants();
      this.closeEditTenantDialog();
    } catch (err: any) {
      this.editError = err?.message || 'Failed to save tenant.';
    } finally {
      this.editSaving = false;
    }
  }

  formatDateForInput(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().substring(0, 10);
  }

  private dateInputToMs(value: string): number | undefined {
    if (!value) return undefined;
    return new Date(value + 'T00:00:00').getTime();
  }


  deleteTenant(tenant: any) {
    this.selectedTenant = tenant;
    this.deleteError = '';
    this.showDeleteTenantDialog = true;
  }

  closeDeleteTenantDialog() {
    this.showDeleteTenantDialog = false;
    this.deleteError = '';
    this.selectedTenant = null;
  }

  async confirmDeleteTenant() {
    if (!this.selectedTenant) return;
    this.deleteError = '';
    this.deleteSaving = true;
    try {
      await this.tenantsSvc.remove(this.selectedTenant.id);
      this.loadTenants();
      this.closeDeleteTenantDialog();
    } catch (err: any) {
      this.deleteError = err?.message || 'Failed to delete tenant.';
    } finally {
      this.deleteSaving = false;
    }
  }

  goBack() {
    this.router.navigate(['/landlord']);
  }
}
