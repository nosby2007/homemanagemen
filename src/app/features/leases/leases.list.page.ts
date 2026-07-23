import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap, map } from 'rxjs/operators';
import { LeasesService } from './leases.service';

const styles = `
.page{padding:24px;max-width:1400px;margin:0 auto}
.card{background:linear-gradient(135deg, rgba(15,23,42,.95) 0%, rgba(30,41,59,.90) 100%);border:1px solid rgba(148,163,184,.15);border-radius:20px;padding:28px;box-shadow:0 20px 25px -5px rgba(0,0,0,.3), 0 8px 10px -6px rgba(0,0,0,.3)}
.h1{font-size:28px;font-weight:900;color:#f1f5f9;letter-spacing:-0.5px;margin-bottom:8px}
.muted{color:rgba(203,213,225,.85);font-size:13px;margin-top:6px;font-weight:500}
.mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;background:rgba(100,116,139,.2);padding:4px 10px;border-radius:6px;font-weight:600;color:#94a3b8}
.row{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}
.input{flex:1;min-width:220px;padding:12px 16px;border-radius:12px;border:1px solid rgba(148,163,184,.15);background:rgba(2,6,23,.4);color:#e5e7eb;outline:none;transition:all 0.2s;font-size:14px}
.input:focus{border-color:rgba(59,130,246,.5);background:rgba(2,6,23,.6)}
.btn{padding:12px 24px;border-radius:12px;border:none;background:linear-gradient(135deg, rgba(59,130,246,.95) 0%, rgba(37,99,235,.95) 100%);color:#fff;font-weight:700;cursor:pointer;transition:all 0.2s;font-size:14px;box-shadow:0 4px 6px -1px rgba(59,130,246,.3)}
.btn:hover{transform:translateY(-2px);box-shadow:0 10px 15px -3px rgba(59,130,246,.4)}
.list{margin-top:24px;display:grid;gap:14px}
.item{display:block;padding:0;border-radius:16px;border:1px solid rgba(148,163,184,.12);background:linear-gradient(135deg, rgba(30,41,59,.5) 0%, rgba(15,23,42,.5) 100%);text-decoration:none;transition:all 0.3s;overflow:hidden}
.item:hover{border-color:rgba(59,130,246,.4);transform:translateY(-3px);box-shadow:0 12px 24px -4px rgba(0,0,0,.3)}
.strong{font-weight:800;color:#f1f5f9;font-size:16px}
.item-content{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px}
.item-info{flex:1}
 .item-actions{display:flex;gap:8px;flex-shrink:0}
.action-btn{padding:8px 14px;border-radius:10px;border:none;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;transition:all 0.2s;white-space:nowrap}
.btn-view{background:linear-gradient(135deg, rgba(59,130,246,.90) 0%, rgba(37,99,235,.90) 100%);color:#fff;box-shadow:0 2px 4px rgba(59,130,246,.3)}
.btn-view:hover{transform:translateY(-2px);box-shadow:0 4px 8px rgba(59,130,246,.4)}
.btn-edit{background:linear-gradient(135deg, rgba(249,115,22,.90) 0%, rgba(234,88,12,.90) 100%);color:#fff;box-shadow:0 2px 4px rgba(249,115,22,.3)}
.btn-edit:hover{transform:translateY(-2px);box-shadow:0 4px 8px rgba(249,115,22,.4)}
.btn-delete{background:linear-gradient(135deg, rgba(239,68,68,.90) 0%, rgba(220,38,38,.90) 100%);color:#fff;box-shadow:0 2px 4px rgba(239,68,68,.3)}
.btn-delete:hover{transform:translateY(-2px);box-shadow:0 4px 8px rgba(239,68,68,.4)}
.empty-state{text-align:center;padding:48px 24px;color:rgba(148,163,184,.7);font-size:14px}
.state.error{border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.12);color:#fecaca;border-radius:12px;padding:12px 16px;margin-top:16px}
`;

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <ng-container *ngIf="vm$ | async as vm">
    <div class="page">
      <div class="card">
        <div class="h1">Leases</div>
        <div class="muted">Property: <span class="mono">{{ vm.propertyId }}</span></div>

        <div class="row">
          <button class="btn" (click)="navigateToCreateLease(vm.propertyId)">+ Create Lease</button>
        </div>

        <div class="state error" *ngIf="error">{{ error }}</div>

        <div class="list">
          <div class="item" *ngFor="let l of vm.leases">
            <div class="item-content">
              <div class="item-info">
                <div class="strong">{{ l.tenantName || 'Lease' }}</div>
                <div class="muted">Rent: {{ l.monthlyRent || '-' }} • Status: {{ l.status || '-' }}</div>
              </div>
              <div class="item-actions">
                <a class="action-btn btn-view" [routerLink]="['/properties', vm.propertyId, 'leases', l.id]">View</a>
                <button class="action-btn btn-edit" (click)="editLease(vm.propertyId, l.id)">Edit</button>
                <button class="action-btn btn-delete" (click)="deleteLease(vm.propertyId, l.id)">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ng-container>
  `,
  styles: [styles]
})
export class LeasesListPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private leasesSvc = inject(LeasesService);

  error = '';

  vm$ = this.route.paramMap.pipe(
    switchMap(pm => {
      const propertyId = pm.get('propertyId')!;
      return this.leasesSvc.list(propertyId).pipe(
        map(leases => ({ propertyId, leases }))
      );
    })
  );

  navigateToCreateLease(propertyId: string) {
    this.router.navigate(['/properties', propertyId, 'leases', 'new']);
  }

  editLease(propertyId: string, leaseId: string) {
    this.router.navigate(['/properties', propertyId, 'leases', leaseId, 'edit']);
  }

  async deleteLease(propertyId: string, leaseId: string) {
    if (!confirm('Are you sure you want to delete this lease?')) return;
    this.error = '';
    try {
      await this.leasesSvc.delete(propertyId, leaseId);
      // Refresh the list by re-triggering the observable
      window.location.reload();
    } catch (err: any) {
      this.error = err?.message || 'Failed to delete lease.';
    }
  }
}
