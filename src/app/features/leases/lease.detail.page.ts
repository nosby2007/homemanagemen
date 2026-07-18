import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, map, catchError, startWith } from 'rxjs/operators';
import { of, combineLatest } from 'rxjs';
import { LeasesService } from './leases.service';
import { PaymentsService } from '../payments/payments.service'; // ✅ adjust path if needed

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ng-container *ngIf="vm$ | async as vm">
      <div class="page">
        <div class="header-card">
          <div class="h1">Lease Details</div>
          <div class="lease-id">ID: {{ vm.leaseId | slice:0:8 }}</div>
        </div>
        <!-- add-payment button here -->
        <div style="margin-bottom:20px;">
          <a class="btn" [routerLink]="['/properties', vm.propertyId, 'leases', vm.leaseId, 'payments', 'new']">+ Add Payment</a>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Monthly Rent</div>
            <div class="kpi-value">\${{ vm.lease?.monthlyRent || 0 | number:'1.2-2' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Security Deposit</div>
            <div class="kpi-value">\${{ vm.lease?.securityDeposit || 0 | number:'1.2-2' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Annual Revenue</div>
            <div class="kpi-value">\${{ (vm.lease?.monthlyRent || 0) * 12 | number:'1.2-2' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Lease Status</div>
            <div class="kpi-badge" [class.active]="vm.lease?.status === 'active'">{{ vm.lease?.status || 'N/A' }}</div>
          </div>
        </div>

        <!-- Lease Information -->
        <div class="card">
          <div class="section-title">Lease Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="lbl">Tenant ID</span>
              <span class="val">{{ vm.lease?.tenantId || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Start Date</span>
              <span class="val">{{ (vm.lease?.startDate?.toDate ? vm.lease?.startDate?.toDate() : vm.lease?.startDate) | date:'MMM d, y' || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">End Date</span>
              <span class="val">{{ (vm.lease?.endDate?.toDate ? vm.lease?.endDate?.toDate() : vm.lease?.endDate) | date:'MMM d, y' || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Lease Term</span>
              <span class="val">{{ leaseTermInMonths(vm.lease) }} months</span>
            </div>
            <div class="info-item">
              <span class="lbl">Payment Due Date</span>
              <span class="val">{{ vm.lease?.paymentDueDay || '-' }} of each month</span>
            </div>
            <div class="info-item">
              <span class="lbl">Late Fee</span>
              <span class="val">\${{ vm.lease?.lateFee || 0 | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Financial Details -->
        <div class="card">
          <div class="section-title">Financial Summary</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="lbl">Monthly Rent</span>
              <span class="val mono">\${{ vm.lease?.monthlyRent || 0 | number:'1.2-2' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Security Deposit</span>
              <span class="val mono">\${{ vm.lease?.securityDeposit || 0 | number:'1.2-2' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Pet Deposit</span>
              <span class="val mono">\${{ vm.lease?.petDeposit || 0 | number:'1.2-2' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Total Deposits</span>
              <span class="val mono highlight">\${{ (vm.lease?.securityDeposit || 0) + (vm.lease?.petDeposit || 0) | number:'1.2-2' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Payment Method</span>
              <span class="val">{{ vm.lease?.paymentMethod || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Auto-Renewal</span>
              <span class="val">{{ vm.lease?.autoRenewal ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>

        <!-- Additional Details -->
        <div class="card">
          <div class="section-title">Additional Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="lbl">Pets Allowed</span>
              <span class="val">{{ vm.lease?.petsAllowed ? 'Yes' : 'No' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Smoking Allowed</span>
              <span class="val">{{ vm.lease?.smokingAllowed ? 'Yes' : 'No' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Utilities Included</span>
              <span class="val">{{ vm.lease?.utilitiesIncluded || 'None' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Parking Spaces</span>
              <span class="val">{{ vm.lease?.parkingSpaces || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Last Inspection</span>
              <span class="val">{{ (vm.lease?.lastInspectionDate?.toDate ? vm.lease?.lastInspectionDate?.toDate() : vm.lease?.lastInspectionDate) | date:'MMM d, y' || 'Not conducted' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Notes</span>
              <span class="val">{{ vm.lease?.notes || 'No notes' }}</span>
            </div>
          </div>
        </div>

        <!-- Payments -->
        <div class="payments-list">
          <div class="payment-item" *ngFor="let payment of vm.payments">
            <div class="payment-info">
              <div class="payment-date">
                {{ (payment.paidAt ? (payment.paidAt | date:'MMM d, y') : '-') }}
              </div>
              <div class="payment-amount">\${{ payment.amount || 0 | number:'1.2-2' }}</div>
            </div>

            <div class="payment-details">
              <span class="payment-method-badge">{{ payment.paymentMethod || 'N/A' }}</span>
              <span class="payment-status-badge"
                    [class.paid]="payment.status === 'paid'"
                    [class.pending]="payment.status === 'pending'">
                {{ payment.status || 'N/A' }}
              </span>
            </div>
          </div>

          <div class="no-payments" *ngIf="!vm.payments?.length">
            <div class="no-payments-text">No payment records yet</div>
          </div>
        </div>

        <a class="btn secondary" [routerLink]="['/properties', vm.propertyId, 'leases']">← Back to Leases</a>
      </div>
    </ng-container>
  `,
  styles: [`
    .page{ padding:24px; max-width:1400px; margin:0 auto; background: linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 100%); min-height:100vh; height:100vh; overflow-y:scroll; box-sizing:border-box; }
    .page::-webkit-scrollbar{ width:12px; }
    .page::-webkit-scrollbar-track{ background:rgba(15,23,42,0.5); border-radius:10px; }
    .page::-webkit-scrollbar-thumb{ background:rgba(139,92,246,0.4); border-radius:10px; border:2px solid rgba(15,23,42,0.5); }
    .page::-webkit-scrollbar-thumb:hover{ background:rgba(139,92,246,0.6); }

    .header-card{ background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%); border:1px solid rgba(139,92,246,.25); border-radius:20px; padding:24px; margin-bottom:24px; box-shadow: 0 8px 32px rgba(0,0,0,.3); }
    .h1{ font-size:32px; font-weight:900; color:#f8fafc; letter-spacing:-0.5px; margin-bottom:8px; background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .lease-id{ color:rgba(226,232,240,.65); font-size:13px; font-family:ui-monospace,monospace; letter-spacing:0.5px; }

    .kpi-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; margin-bottom:24px; }
    .kpi-card{ background: rgba(15,23,42,.85); border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:20px; transition: all 0.3s ease; box-shadow: 0 4px 16px rgba(0,0,0,.2); }
    .kpi-card:hover{ transform:translateY(-4px); box-shadow: 0 8px 24px rgba(99,102,241,.3); border-color:rgba(139,92,246,.4); }
    .kpi-label{ font-size:12px; font-weight:600; color:rgba(226,232,240,.7); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
    .kpi-value{ font-size:28px; font-weight:800; color:#f1f5f9; font-family:ui-monospace,monospace; }
    .kpi-badge{ display:inline-block; padding:6px 14px; border-radius:20px; background:rgba(100,116,139,.3); color:#94a3b8; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
    .kpi-badge.active{ background:linear-gradient(135deg, rgba(34,197,94,.25) 0%, rgba(16,185,129,.25) 100%); color:#86efac; border:1px solid rgba(34,197,94,.4); }

    .card{ background: linear-gradient(135deg, rgba(15,23,42,.88) 0%, rgba(30,41,59,.88) 100%); border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:24px; margin-bottom:20px; box-shadow: 0 4px 24px rgba(0,0,0,.25); transition: all 0.3s ease; }
    .card:hover{ border-color:rgba(139,92,246,.3); box-shadow: 0 8px 32px rgba(99,102,241,.2); }

    .section-title{ font-size:20px; font-weight:800; color:#e2e8f0; margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid rgba(139,92,246,.3); letter-spacing:-0.3px; }

    .info-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; }
    .info-item{ display:flex; flex-direction:column; gap:6px; padding:12px; border-radius:12px; background:rgba(255,255,255,.02); transition: all 0.2s ease; }
    .info-item:hover{ background:rgba(139,92,246,.08); }

    .lbl{ color:rgba(226,232,240,.75); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1px; }
    .val{ color:#f1f5f9; font-size:15px; font-weight:600; }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; color:#e5e7eb; }
    .highlight{ color:#fbbf24; font-weight:700; }

    .btn{ display:inline-block; margin-top:20px; padding:12px 24px; border-radius:12px; border:1px solid rgba(139,92,246,.3); background: linear-gradient(135deg, rgba(99,102,241,.2) 0%, rgba(139,92,246,.2) 100%); color:#e0e7ff; font-weight:700; text-decoration:none; transition: all 0.3s ease; font-size:14px; letter-spacing:0.3px; }
    .btn:hover{ background: linear-gradient(135deg, rgba(99,102,241,.35) 0%, rgba(139,92,246,.35) 100%); transform:translateX(-4px); box-shadow: 0 4px 16px rgba(99,102,241,.3); }
    .btn.secondary{ border-color:rgba(148,163,184,.3); background:rgba(71,85,105,.25); color:#cbd5e1; }
    .btn.secondary:hover{ background:rgba(71,85,105,.4); border-color:rgba(148,163,184,.5); }

    /* Minimal payments styling (keeps your structure) */
    .payments-list{ margin-top: 18px; display:flex; flex-direction:column; gap:12px; }
    .payment-item{ display:flex; justify-content:space-between; gap:12px; padding:12px; border-radius:12px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); }
    .payment-info{ display:flex; flex-direction:column; gap:6px; }
    .payment-date{ color:rgba(226,232,240,.75); font-size:12px; font-weight:700; }
    .payment-amount{ color:#f8fafc; font-size:16px; font-weight:900; font-family:ui-monospace,monospace; }
    .payment-details{ display:flex; gap:10px; align-items:center; }
    .payment-method-badge{ padding:4px 10px; border-radius:999px; background:rgba(59,130,246,.14); color:#bfdbfe; font-size:12px; font-weight:800; }
    .payment-status-badge{ padding:4px 10px; border-radius:999px; background:rgba(100,116,139,.25); color:#cbd5e1; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.5px; }
    .payment-status-badge.paid{ background:rgba(34,197,94,.16); color:#bbf7d0; }
    .payment-status-badge.pending{ background:rgba(245,158,11,.16); color:#fde68a; }
    .no-payments{ padding:14px; border-radius:12px; border:1px dashed rgba(255,255,255,.18); background:rgba(255,255,255,.02); }
    .no-payments-text{ color:rgba(226,232,240,.7); font-weight:700; font-size:13px; }
  `]
})
export class LeaseDetailPage {
  private route = inject(ActivatedRoute);
  private leases = inject(LeasesService);
  private payments = inject(PaymentsService); // ✅

  vm$ = this.route.paramMap.pipe(
    switchMap(pm => {
      const propertyId = pm.get('propertyId')!;
      const leaseId = pm.get('leaseId')!;

      return combineLatest({
        lease: this.leases.get(propertyId, leaseId),
        payments: this.payments.listUnderLease(propertyId, leaseId).pipe(
          catchError(() => of([])),
          startWith([])
        )
      }).pipe(
        map(({ lease, payments }) => ({ propertyId, leaseId, lease, payments } as any))
      );
    })
  );

  leaseTermInMonths(lease: any): number {
    if (!lease?.startDate || !lease?.endDate) return 0;
    const start = lease.startDate.toDate ? lease.startDate.toDate() : new Date(lease.startDate);
    const end = lease.endDate.toDate ? lease.endDate.toDate() : new Date(lease.endDate);
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months += end.getMonth() - start.getMonth();
    return months <= 0 ? 0 : months;
  }
}
