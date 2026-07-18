import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { PaymentsService } from '../payments/payments.service';
import { TenantDashboardService } from './tenant-dashboard.service';

@Component({
  selector: 'app-tenant-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <header class="header">
        <h1>Make a Payment</h1>
        <p>Submit rent payments directly to your active lease.</p>
      </header>

      <div class="state" *ngIf="loadingContext">Loading lease context...</div>
      <div class="state error" *ngIf="contextError">{{ contextError }}</div>

      <form class="card" [formGroup]="form" (ngSubmit)="submit()" *ngIf="!loadingContext && !contextError">
        <div class="row">
          <label>Amount</label>
          <input type="number" min="0" step="0.01" formControlName="amount" />
        </div>

        <div class="row">
          <label>Method</label>
          <select formControlName="method">
            <option value="card">Card</option>
            <option value="ach">Bank transfer</option>
            <option value="cash">Cash</option>
          </select>
        </div>

        <div class="row">
          <label>Reference</label>
          <input type="text" formControlName="reference" placeholder="Transaction or confirmation ID" />
        </div>

        <div class="row">
          <label>Notes</label>
          <textarea rows="3" formControlName="notes"></textarea>
        </div>

        <div class="state success" *ngIf="success">{{ success }}</div>
        <div class="state error" *ngIf="submitError">{{ submitError }}</div>

        <div class="actions">
          <button type="button" class="btn" (click)="cancel()" [disabled]="submitting">Cancel</button>
          <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Submitting...' : 'Submit payment' }}</button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .page{padding:20px;max-width:680px;margin:0 auto}
    .header{margin-bottom:14px}
    .header h1{margin:0 0 4px;color:#0f172a}
    .header p{margin:0;color:#475569}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
    .row{display:grid;gap:6px;margin-bottom:12px}
    label{font-size:13px;color:#334155;font-weight:700}
    input,select,textarea{border:1px solid #cbd5e1;border-radius:8px;padding:10px;background:#fff}
    .actions{display:flex;gap:8px;justify-content:flex-end}
    .btn{border:1px solid #cbd5e1;background:#f8fafc;color:#0f172a;padding:10px 12px;border-radius:8px;cursor:pointer}
    .btn.primary{background:#0284c7;border-color:#0369a1;color:#fff}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .state{padding:10px;border-radius:8px;background:#f1f5f9;color:#334155;margin-bottom:10px}
    .state.error{background:#fee2e2;color:#991b1b}
    .state.success{background:#dcfce7;color:#166534}
  `],
})
export class TenantPaymentPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private tenantDashboard = inject(TenantDashboardService);
  private payments = inject(PaymentsService);
  private destroy$ = new Subject<void>();

  loadingContext = true;
  contextError = '';
  submitError = '';
  success = '';
  submitting = false;

  private propertyId = '';
  private leaseId = '';
  private tenantProfileId = '';
  private unitId = '';

  readonly form = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    method: ['card', Validators.required],
    reference: [''],
    notes: [''],
  });

  ngOnInit() {
    this.tenantDashboard.getTenantProfile().pipe(
      takeUntil(this.destroy$),
      switchMap((profile) => {
        if (!profile?.id) {
          this.contextError = 'No tenant profile found for your account.';
          this.loadingContext = false;
          return of(null);
        }
        this.tenantProfileId = profile.id;
        return this.tenantDashboard.getActiveLease(profile.id);
      }),
      catchError(() => {
        this.contextError = 'Unable to resolve tenant context.';
        this.loadingContext = false;
        return of(null);
      }),
    ).subscribe((lease) => {
      if (!lease?.id || !lease.propertyId) {
        if (!this.contextError) {
          this.contextError = 'No active lease found. Contact property management.';
        }
        this.loadingContext = false;
        return;
      }

      this.propertyId = lease.propertyId;
      this.leaseId = lease.id;
      this.unitId = String(lease.unitId || '').trim();
      if (!this.unitId) {
        this.contextError = 'Active lease is missing a unit assignment. Contact property management.';
      }
      this.form.patchValue({ amount: Number(lease.monthlyRent || 0) });
      this.loadingContext = false;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async submit() {
    this.submitError = '';
    this.success = '';

    if (this.form.invalid || !this.propertyId || !this.leaseId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    try {
      const amount = Number(this.form.value.amount || 0);
      await this.payments.create(this.propertyId, this.leaseId, {
        amount,
        status: 'paid',
        paidAt: Date.now(),
        dueDate: Date.now(),
        method: String(this.form.value.method || 'card'),
        reference: String(this.form.value.reference || ''),
        notes: String(this.form.value.notes || ''),
        tenantId: this.tenantProfileId,
        unitId: this.unitId,
      });

      this.success = 'Payment submitted successfully.';
      this.form.patchValue({ reference: '', notes: '' });
    } catch {
      this.submitError = 'Payment submission failed. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  cancel() {
    this.router.navigate(['/tenant/homePage']);
  }
}
