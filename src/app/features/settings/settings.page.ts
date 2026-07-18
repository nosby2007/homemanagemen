import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { OrgContextService } from '../../core/org/org-context.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <header>
        <h1>Settings</h1>
        <p>Company profile, notification preferences, and property defaults.</p>
      </header>

      <div class="grid">
        <article class="card">
          <div class="title">Company Settings</div>
          <form [formGroup]="companyForm" (ngSubmit)="saveCompany()" class="form">
            <input formControlName="companyName" placeholder="Company name" />
            <input formControlName="supportEmail" placeholder="Support email" />
            <input formControlName="contactPhone" placeholder="Contact phone" />
            <button type="submit">Save company settings</button>
          </form>
        </article>

        <article class="card">
          <div class="title">Notification Preferences</div>
          <form [formGroup]="notificationForm" (ngSubmit)="saveNotifications()" class="form">
            <label><input type="checkbox" formControlName="leaseExpiring" /> Lease expiration alerts</label>
            <label><input type="checkbox" formControlName="maintenanceEmergency" /> Emergency maintenance alerts</label>
            <label><input type="checkbox" formControlName="rentLate" /> Late rent reminders</label>
            <button type="submit">Save notification settings</button>
          </form>
        </article>
      </div>

      <div class="feedback ok" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    header h1 { margin:0; color:#f8fafc; }
    header p { margin:4px 0 0; color:#94a3b8; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:16px; background:rgba(15,23,42,.78); color:#e2e8f0; padding:14px; }
    .title { font-weight:800; margin-bottom:10px; }
    .form { display:grid; gap:8px; }
    input { width:100%; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:10px; }
    label { display:flex; align-items:center; gap:8px; color:#cbd5e1; }
    button { border:none; border-radius:10px; padding:10px; font-weight:700; cursor:pointer; background:linear-gradient(125deg,#0ea5e9,#0284c7); color:#fff; }
    .feedback { border-radius:10px; padding:9px 10px; font-size:12px; }
    .feedback.ok { background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.35); color:#bbf7d0; }
    .feedback.err { background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.35); color:#fecaca; }
    @media (max-width: 980px) { .grid { grid-template-columns:1fr; } }
  `],
})
export class SettingsPage {
  private fs = inject(Firestore);
  private auth = inject(Auth);
  private org = inject(OrgContextService);
  private fb = inject(FormBuilder);

  successMessage = '';
  errorMessage = '';

  companyForm = this.fb.group({
    companyName: ['', [Validators.required]],
    supportEmail: ['', [Validators.email]],
    contactPhone: [''],
  });

  notificationForm = this.fb.group({
    leaseExpiring: [true],
    maintenanceEmergency: [true],
    rentLate: [true],
  });

  async saveCompany() {
    await this.save('company', this.companyForm.getRawValue());
  }

  async saveNotifications() {
    await this.save('notifications', this.notificationForm.getRawValue());
  }

  private async save(section: string, data: any) {
    this.successMessage = '';
    this.errorMessage = '';
    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) throw new Error('Not authenticated');
      const orgId = this.org.requireOrgId();

      await setDoc(doc(this.fs, `orgs/${orgId}/settings/${section}`), {
        ...data,
        updatedAt: Date.now(),
        updatedBy: uid,
      }, { merge: true });

      this.successMessage = 'Settings saved successfully.';
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Unable to save settings.';
    }
  }
}
