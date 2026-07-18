import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AgenciesService } from './agencies.service';

@Component({
  standalone: true,
  selector: 'app-agencies-page',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h2>Agencies</h2>
          <p>Manage brokerage organizations and agency profiles.</p>
        </div>
        <button class="btn primary" (click)="showForm = true">+ New Agency</button>
      </header>

      <section class="toolbar">
        <input [(ngModel)]="query" placeholder="Search agency by name, city, or plan" />
      </section>

      <section *ngIf="loading" class="state">Loading agencies...</section>
      <section *ngIf="!loading && error" class="state error">{{ error }}</section>
      <section *ngIf="!loading && !error && filtered.length === 0" class="state">No agencies found.</section>

      <table *ngIf="!loading && !error && filtered.length" class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>City</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let a of filtered">
            <td>{{ a.name || a.id }}</td>
            <td>{{ a.city || '-' }}</td>
            <td>{{ a.plan || 'starter' }}</td>
            <td><span class="badge">{{ a.status || 'active' }}</span></td>
            <td>{{ a.updatedAt ? (a.updatedAt | date:'short') : '-' }}</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="showForm" class="modal-overlay" (click)="showForm = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Create New Agency</h3>
          <form (ngSubmit)="submitForm()">
            <div class="form-group"><label>Agency Name *</label><input [(ngModel)]="formData.name" name="name" placeholder="Agency name" required /></div>
            <div class="form-group"><label>City</label><input [(ngModel)]="formData.city" name="city" placeholder="City" /></div>
            <div class="form-group"><label>State</label><input [(ngModel)]="formData.state" name="state" placeholder="State" /></div>
            <div class="form-group"><label>Plan</label><select [(ngModel)]="formData.plan" name="plan"><option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></div>
            <div class="actions">
              <button type="button" class="btn" (click)="showForm = false">Cancel</button>
              <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Creating...' : 'Create Agency' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.toolbar input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.table th,.table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:left}.badge{padding:2px 10px;border-radius:999px;background:#e0f2fe;color:#0369a1}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{color:#b91c1c;border-color:#fecaca;background:#fff1f2}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}.btn:disabled{opacity:.5;cursor:not-allowed}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}.modal{background:#fff;border-radius:12px;padding:24px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto}.modal h3{margin:0 0 16px;color:#0f172a}.form-group{margin-bottom:16px;display:flex;flex-direction:column}.form-group label{margin-bottom:6px;font-weight:500;color:#334155}.form-group input,.form-group select{padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px}.form-group input:focus,.form-group select:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}`],
})
export class AgenciesPage implements OnInit, OnDestroy {
  private svc = inject(AgenciesService);
  private sub?: Subscription;

  loading = true;
  error = '';
  query = '';
  agencies: any[] = [];
  showForm = false;
  submitting = false;
  formData: any = {};

  private resetForm() {
    return { name: '', city: '', state: '', plan: 'starter' };
  }

  get filtered() {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.agencies;
    return this.agencies.filter((a) =>
      [a.name, a.city, a.plan, a.id].some((v: any) => String(v || '').toLowerCase().includes(q))
    );
  }

  ngOnInit() {
    this.formData = this.resetForm();
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => {
        this.agencies = rows;
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.message || 'Unable to load agencies.';
        this.loading = false;
      },
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async submitForm() {
    if (!this.formData.name) return;
    try {
      this.submitting = true;
      await this.svc.create(this.formData);
      this.showForm = false;
      this.formData = this.resetForm();
    } catch (err: any) {
      this.error = err?.message || 'Failed to create agency';
    } finally {
      this.submitting = false;
    }
  }
}
