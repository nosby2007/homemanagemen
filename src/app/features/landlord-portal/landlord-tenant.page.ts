import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantsService } from '../tenants/tenants.service';

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
              <input type="text" [(ngModel)]="newTenant.property" name="property" required />
            </div>
            <div class="form-group">
              <label>Unit ID</label>
              <input type="text" [(ngModel)]="newTenant.unitId" name="unitId" required />
            </div>
            <div class="form-group">
              <label>Lease End Date</label>
              <input type="date" [(ngModel)]="newTenant.leaseEndDate" name="leaseEndDate" required />
            </div>
            <div class="dialog-actions">
              <button class="btn primary" type="submit" [disabled]="addTenantForm.invalid">Add</button>
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
              <input type="text" [(ngModel)]="editTenantData.property" name="editProperty" required />
            </div>
            <div class="form-group">
              <label>Lease End Date</label>
              <input type="date" [(ngModel)]="editTenantData.leaseEndDate" name="editLeaseEndDate" required />
            </div>
            <div class="dialog-actions">
              <button class="btn primary" type="submit" [disabled]="editTenantForm.invalid">Save</button>
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
          <div class="dialog-actions">
            <button class="btn danger" (click)="confirmDeleteTenant()">Delete</button>
            <button class="btn" (click)="closeDeleteTenantDialog()">Cancel</button>
          </div>
        </div>
      </div>

      <div class="content">
        <div *ngIf="isLoading" class="loading">Loading tenants...</div>
        
        <div *ngIf="!isLoading && filteredTenants.length === 0" class="empty-state">
          <p>No tenants found.</p>
          <button class="btn primary" (click)="addTenant()">Add Your First Tenant</button>
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
    .form-group input {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
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
  showAddTenantDialog: boolean = false;
  showViewTenantDialog: boolean = false;
  showEditTenantDialog: boolean = false;
  showDeleteTenantDialog: boolean = false;
  selectedTenant: any = null;
  editTenantData: any = null;
  newTenant: any = {
    name: '',
    email: '',
    phone: '',
    property: '',
    leaseEndDate: ''
  };

  constructor(
    private router: Router,
    private tenantsSvc: TenantsService,
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.isLoading = true;
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
      error: () => {
        this.tenants = [];
        this.filteredTenants = [];
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
    this.resetNewTenant();
  }

  async submitAddTenant() {
    // Add new tenant to the list
    await this.tenantsSvc.create({
      displayName: this.newTenant.name,
      email: this.newTenant.email,
      phone: this.newTenant.phone,
      currentPropertyId: this.newTenant.property,
      currentUnitId: this.newTenant.unitId,
      status: 'active',
    });
    this.closeAddTenantDialog();
    this.loadTenants();
  }

  resetNewTenant() {
    this.newTenant = {
      name: '',
      email: '',
      phone: '',
      property: '',
      unitId: '',
      leaseEndDate: ''
    };
  }


  editTenant(tenant: any) {
    this.selectedTenant = tenant;
    this.editTenantData = {
      ...tenant,
      leaseEndDate: tenant.leaseEndDate ? this.formatDateForInput(tenant.leaseEndDate) : ''
    };
    this.showEditTenantDialog = true;
  }

  closeEditTenantDialog() {
    this.showEditTenantDialog = false;
    this.editTenantData = null;
    this.selectedTenant = null;
  }

  async submitEditTenant() {
    if (!this.selectedTenant) return;
    await this.tenantsSvc.update(this.selectedTenant.id, {
      displayName: this.editTenantData.name,
      email: this.editTenantData.email,
      phone: this.editTenantData.phone,
      currentPropertyId: this.editTenantData.property,
    });
    this.loadTenants();
    this.closeEditTenantDialog();
  }

  formatDateForInput(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().substring(0, 10);
  }


  deleteTenant(tenant: any) {
    this.selectedTenant = tenant;
    this.showDeleteTenantDialog = true;
  }

  closeDeleteTenantDialog() {
    this.showDeleteTenantDialog = false;
    this.selectedTenant = null;
  }

  async confirmDeleteTenant() {
    if (!this.selectedTenant) return;
    await this.tenantsSvc.remove(this.selectedTenant.id);
    this.loadTenants();
    this.closeDeleteTenantDialog();
  }

  goBack() {
    this.router.navigate(['/landlord']);
  }
}
