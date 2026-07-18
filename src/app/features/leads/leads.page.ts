import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LeadsService } from './leads.service';

@Component({
  standalone: true,
  selector: 'app-leads-page',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h2>Leads</h2>
          <p>Track pipeline from first contact to qualified deal.</p>
        </div>
        <button class="btn primary" (click)="showForm = true">+ Add Lead</button>
      </header>

      <section class="toolbar">
        <input [(ngModel)]="query" placeholder="Search lead by name, source, location, status" />
      </section>

      <section *ngIf="loading" class="state">Loading leads...</section>
      <section *ngIf="!loading && error" class="state error">{{ error }}</section>
      <section *ngIf="!loading && !error && filtered.length === 0" class="state">No leads found.</section>

      <table *ngIf="!loading && !error && filtered.length" class="table">
        <thead><tr><th>Name</th><th>Interest</th><th>Source</th><th>Status</th><th>Budget</th></tr></thead>
        <tbody>
          <tr *ngFor="let l of filtered">
            <td>{{ l.fullName }}</td>
            <td>{{ l.interestType }}</td>
            <td>{{ l.source || '-' }}</td>
            <td><span class="badge">{{ l.status }}</span></td>
            <td>{{ l.budget ? (l.budget | currency) : '-' }}</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="showForm" class="modal-overlay" (click)="showForm = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Add New Lead</h3>
          <form (ngSubmit)="submitForm()" [formGroup]="false">
            <div class="form-group">
              <label>Name *</label>
              <input [(ngModel)]="formData.fullName" name="fullName" placeholder="Full name" required />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input [(ngModel)]="formData.email" name="email" type="email" placeholder="Email" />
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input [(ngModel)]="formData.phone" name="phone" placeholder="Phone number" />
            </div>
            <div class="form-group">
              <label>Interest Type *</label>
              <select [(ngModel)]="formData.interestType" name="interestType" required>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
                <option value="rent">Rent</option>
              </select>
            </div>
            <div class="form-group">
              <label>Source</label>
              <input [(ngModel)]="formData.source" name="source" placeholder="e.g., Referral, Web" />
            </div>
            <div class="form-group">
              <label>Budget</label>
              <input [(ngModel)]="formData.budget" name="budget" type="number" placeholder="Budget amount" />
            </div>
            <div class="actions">
              <button type="button" class="btn" (click)="showForm = false">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Adding...' : 'Add Lead' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.toolbar input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.table th,.table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:left}.badge{padding:2px 10px;border-radius:999px;background:#fff7ed;color:#c2410c}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{color:#b91c1c;border-color:#fecaca;background:#fff1f2}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}.modal{background:#fff;border-radius:12px;padding:24px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto}.modal h3{margin:0 0 16px;color:#0f172a}.form-group{margin-bottom:16px;display:flex;flex-direction:column}.form-group label{margin-bottom:6px;font-weight:500;color:#334155}.form-group input,.form-group select{padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px}.form-group input:focus,.form-group select:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}`],
})
export class LeadsPage implements OnInit, OnDestroy {
  private svc = inject(LeadsService);
  private sub?: Subscription;

  loading = true;
  error = '';
  query = '';
  rows: any[] = [];
  showForm = false;
  submitting = false;
  formData: any = { fullName: '', email: '', phone: '', interestType: 'buy' as any, source: '', budget: 0 };

  private resetForm() {
    return { fullName: '', email: '', phone: '', interestType: 'buy' as any, source: '', budget: 0 };
  }

  get filtered() {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter((r) =>
      [r.fullName, r.source, r.interestType, r.status, r.preferredLocation].some((v: any) => String(v || '').toLowerCase().includes(q))
    );
  }

  ngOnInit() {
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => { this.rows = rows; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load leads.'; this.loading = false; },
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  async submitForm() {
    if (!this.formData.fullName) return;
    try {
      this.submitting = true;
      await this.svc.create(this.formData);
      this.showForm = false;
      this.formData = this.resetForm();
    } catch (err: any) {
      this.error = err?.message || 'Failed to add lead';
    } finally {
      this.submitting = false;
    }
  }
}
