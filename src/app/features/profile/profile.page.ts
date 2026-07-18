import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <header>
        <h1>My Profile</h1>
        <p>Manage personal details and contact information.</p>
      </header>

      <article class="card">
        <form [formGroup]="form" (ngSubmit)="save()" class="form">
          <input formControlName="fullName" placeholder="Full name" />
          <input formControlName="email" placeholder="Email" disabled />
          <input formControlName="phone" placeholder="Phone" />
          <input formControlName="jobTitle" placeholder="Role/Job title" />
          <button type="submit" [disabled]="saving">{{ saving ? 'Saving...' : 'Save profile' }}</button>
        </form>
      </article>

      <div class="feedback ok" *ngIf="successMessage">{{ successMessage }}</div>
      <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
    </section>
  `,
  styles: [`
    .page { display:grid; gap:14px; }
    header h1 { margin:0; color:#f8fafc; }
    header p { margin:4px 0 0; color:#94a3b8; }
    .card { border:1px solid rgba(148,163,184,.2); border-radius:16px; background:rgba(15,23,42,.78); color:#e2e8f0; padding:14px; max-width:600px; }
    .form { display:grid; gap:8px; }
    input { width:100%; border:1px solid rgba(148,163,184,.35); background:rgba(2,6,23,.45); color:#f8fafc; border-radius:10px; padding:10px; }
    input[disabled] { opacity: .8; }
    button { border:none; border-radius:10px; padding:10px; font-weight:700; cursor:pointer; background:linear-gradient(125deg,#22c55e,#16a34a); color:#fff; }
    button:disabled { opacity:.65; cursor:not-allowed; }
    .feedback { border-radius:10px; padding:9px 10px; font-size:12px; max-width:600px; }
    .feedback.ok { background:rgba(16,185,129,.15); border:1px solid rgba(16,185,129,.35); color:#bbf7d0; }
    .feedback.err { background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.35); color:#fecaca; }
  `],
})
export class ProfilePage {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private fs = inject(Firestore);

  saving = false;
  successMessage = '';
  errorMessage = '';

  form = this.fb.group({
    fullName: ['', [Validators.required]],
    email: [''],
    phone: [''],
    jobTitle: [''],
  });

  constructor() {
    this.load();
  }

  private async load() {
    const uid = this.auth.currentUser?.uid;
    const email = this.auth.currentUser?.email ?? '';
    this.form.patchValue({ email });
    if (!uid) return;

    const snap = await getDoc(doc(this.fs, `users/${uid}`));
    if (!snap.exists()) return;

    const data = snap.data() as any;
    this.form.patchValue({
      fullName: data.fullName ?? '',
      phone: data.phone ?? '',
      jobTitle: data.jobTitle ?? '',
      email: data.email ?? email,
    });
  }

  async save() {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) throw new Error('Not authenticated');

      const value = this.form.getRawValue();
      await setDoc(doc(this.fs, `users/${uid}`), {
        fullName: value.fullName,
        email: value.email,
        phone: value.phone,
        jobTitle: value.jobTitle,
        updatedAt: Date.now(),
      }, { merge: true });

      this.successMessage = 'Profile updated successfully.';
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Unable to save profile.';
    } finally {
      this.saving = false;
    }
  }
}
