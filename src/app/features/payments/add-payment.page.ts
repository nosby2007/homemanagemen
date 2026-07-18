import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PaymentsService, PaymentStatus } from './payments.service';
import { LeasesService } from '../leases/leases.service';



@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="card">
        <div class="h1">Add Payment</div>
        <div class="muted">
          Lease payment •
          <span class="mono">org:</span> {{ orgId || '-' }} •
          <span class="mono">property:</span> {{ propertyId || '-' }} •
          <span class="mono">lease:</span> {{ leaseId || '-' }}
        </div>

        <form [formGroup]="form" (ngSubmit)="addPayment()">
          <div class="grid">
            <div>
              <label class="lbl">Amount *</label>
              <input class="input" type="number" min="0" step="0.01" formControlName="amount" placeholder="e.g. 1200" />
              <div class="err" *ngIf="isInvalid('amount')">Amount is required and must be ≥ 0.</div>
            </div>

            <div>
              <label class="lbl">Payment Date *</label>
              <input class="input" type="date" formControlName="paymentDate" />
              <div class="err" *ngIf="isInvalid('paymentDate')">Payment date is required.</div>
            </div>

            <div>
              <label class="lbl">Payment Method *</label>
              <select class="input" formControlName="paymentMethod">
                <option value="">Select...</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="zelle">Zelle</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
              <div class="err" *ngIf="isInvalid('paymentMethod')">Payment method is required.</div>
            </div>

            <div>
              <label class="lbl">Reference #</label>
              <input class="input" type="text" formControlName="referenceNumber" placeholder="optional" />
            </div>

            <div>
              <label class="lbl">Status *</label>
              <select class="input" formControlName="status">
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="new">New</option>
              </select>
            </div>

            <div style="grid-column:1/-1;">
              <label class="lbl">Notes</label>
              <textarea class="input" rows="4" formControlName="notes" placeholder="optional"></textarea>
            </div>
          </div>

          <div class="actions">
            <button class="btn" type="submit" [disabled]="busy">
              {{ busy ? 'Saving...' : 'Add Payment' }}
            </button>
            <button class="btn secondary" type="button" (click)="cancel()" [disabled]="busy">Cancel</button>
          </div>

          <div class="status ok" *ngIf="statusMsg">{{ statusMsg }}</div>
          <div class="status bad" *ngIf="errorMsg">{{ errorMsg }}</div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page{padding:16px}
    .card{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
    .h1{font-size:18px;font-weight:900;color:#e5e7eb;margin:0 0 6px}
    .muted{color:rgba(226,232,240,.75);font-size:12px;margin-bottom:12px}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}

    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    @media (max-width: 720px){.grid{grid-template-columns:1fr}}

    .lbl{display:block;margin:10px 0 6px;color:rgba(226,232,240,.85);font-size:12px;font-weight:700}
    .input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(2,6,23,.25);color:#e5e7eb;outline:none}
    .input:focus{border-color:rgba(59,130,246,.55)}
    textarea.input{resize:vertical}

    .actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
    .btn{padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(59,130,246,.85);color:white;font-weight:800;cursor:pointer}
    .btn.secondary{background:rgba(148,163,184,.20)}
    .btn:disabled{opacity:.6;cursor:not-allowed}

    .err{margin-top:6px;font-size:12px;color:#fca5a5}
    .status{margin-top:12px;font-size:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10)}
    .status.ok{background:rgba(34,197,94,.12);color:#bbf7d0}
    .status.bad{background:rgba(239,68,68,.12);color:#fecaca}
  `]
})
export class AddPaymentPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // IMPORTANT: this service must write under lease payments:
  // orgs/{orgId}/properties/{propertyId}/leases/{leaseId}/payments/{paymentId}
  private payments = inject(PaymentsService);
  private leases = inject(LeasesService);

    orgId: string | null = null;
    propertyId: string | null = null;
    leaseId: string | null = null;
    tenantId = '';
    unitId = '';

  busy = false;
  statusMsg = '';
  errorMsg = '';

  form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0)]],
    paymentDate: ['', [Validators.required]], // yyyy-mm-dd
    paymentMethod: ['', [Validators.required]],
    referenceNumber: [''],
    notes: [''],
    status: ['paid' as PaymentStatus, [Validators.required]],
  });

  ngOnInit(): void {
    this.orgId = this.route.snapshot.paramMap.get('orgId') || this.route.snapshot.queryParamMap.get('orgId');
    this.propertyId = this.route.snapshot.paramMap.get('propertyId') || this.route.snapshot.queryParamMap.get('propertyId');
    this.leaseId = this.route.snapshot.paramMap.get('leaseId') || this.route.snapshot.queryParamMap.get('leaseId');
    void this.loadLeaseContext();
  }

  private async loadLeaseContext() {
    if (!this.propertyId || !this.leaseId) return;
    try {
      const lease = await firstValueFrom(this.leases.get(this.propertyId, this.leaseId));
      this.tenantId = String((lease as any)?.tenantId || '').trim();
      this.unitId = String((lease as any)?.unitId || '').trim();
      if (!this.tenantId || !this.unitId) {
        this.errorMsg = 'Lease is missing tenant or unit linkage. Payments cannot be created until the lease is corrected.';
      }
    } catch {
      this.errorMsg = 'Unable to load lease context.';
    }
  }

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  async addPayment() {
    this.errorMsg = '';
    this.statusMsg = '';

    if (!this.propertyId || !this.leaseId) {
      this.errorMsg = 'Missing propertyId or leaseId in route/query params.';
      return;
    }

    if (!this.tenantId || !this.unitId) {
      this.errorMsg = 'Payments require a lease with both tenant and unit assignments.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg = 'Please fill in all required fields.';
      return;
    }

    this.busy = true;
    this.statusMsg = 'Saving payment...';

    try {
      const v = this.form.getRawValue();

      // Convert date string (yyyy-mm-dd) to timestamp (ms)
      const paidAt = v.paymentDate ? new Date(v.paymentDate + 'T00:00:00').getTime() : undefined;

      // You said: payments are under lease payments (tenant portal)
      // This assumes you have (or will add) `createUnderLease(...)` in PaymentsService.
      const id = await this.payments.create(this.propertyId, this.leaseId, {
        status: v.status as PaymentStatus,
        amount: Number(v.amount || 0),
        paidAt,
        tenantId: this.tenantId,
        unitId: this.unitId,
        paymentMethod: v.paymentMethod || undefined,
        referenceNumber: (v.referenceNumber || '').trim() || undefined,
        notes: (v.notes || '').trim() || undefined,
      } as any);

      this.statusMsg = 'Payment added.';
      // Navigate back to lease payments list (adjust route to your app)
      await this.router.navigateByUrl(`/properties/${this.propertyId}/leases/${this.leaseId}/payments`);
    } catch (e: any) {
      this.errorMsg = e?.message ?? String(e);
      this.statusMsg = '';
    } finally {
      this.busy = false;
    }
  }

  async cancel() {
    if (this.propertyId && this.leaseId) {
      await this.router.navigateByUrl(`/properties/${this.propertyId}/leases/${this.leaseId}/payments`);
      return;
    }
    await this.router.navigateByUrl('/payments');
  }
}
