import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { InvitationService, InvitationPreview } from '../../core/services/invitation.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="shell">
      <article class="card" *ngIf="loading">Validating invitation...</article>

      <article class="card" *ngIf="!loading && errorState">
        <h1>Invitation invalid or expired</h1>
        <p>{{ errorMessage || 'This invitation cannot be used anymore.' }}</p>
        <a class="btn" routerLink="/login">Go to login</a>
      </article>

      <article class="card" *ngIf="!loading && !errorState && invite">
        <h1>Complete your registration</h1>
        <p class="sub">Organization: <strong>{{ invite.orgName }}</strong></p>
        <p class="sub">Role: <strong>{{ invite.role }}</strong></p>
        <p class="sub">Email: <strong>{{ invite.email }}</strong></p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <label>Display name</label>
          <input type="text" formControlName="displayName" placeholder="Your full name" />

          <label>Phone (optional)</label>
          <input type="text" formControlName="phone" placeholder="Phone number" />

          <label>Password</label>
          <input type="password" formControlName="password" placeholder="Create password" />

          <label>Confirm password</label>
          <input type="password" formControlName="confirmPassword" placeholder="Confirm password" />

          <div class="error" *ngIf="submitError">{{ submitError }}</div>
          <div class="ok" *ngIf="submitOk">{{ submitOk }}</div>

          <button class="btn primary" type="submit" [disabled]="submitting">
            {{ submitting ? 'Creating account...' : 'Complete registration' }}
          </button>
        </form>
      </article>
    </section>
  `,
  styles: [`
    .shell { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #0b1220, #1e293b); padding: 20px; }
    .card { width: min(520px, 100%); background: #fff; border-radius: 14px; padding: 24px; box-shadow: 0 18px 40px rgba(2, 6, 23, .24); }
    h1 { margin: 0 0 8px; color: #0f172a; }
    .sub { margin: 4px 0; color: #334155; }
    .form { margin-top: 16px; display: grid; gap: 8px; }
    label { font-size: 13px; color: #334155; font-weight: 700; }
    input { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
    input:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, .14); }
    .btn { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; cursor: pointer; background: #fff; color: #1f2937; text-decoration: none; display: inline-block; text-align: center; }
    .btn.primary { background: #0ea5e9; border-color: #0284c7; color: #fff; font-weight: 700; }
    .error { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; border-radius: 8px; padding: 8px; }
    .ok { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; border-radius: 8px; padding: 8px; }
  `],
})
export class AcceptInvitePage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private invitations = inject(InvitationService);

  loading = true;
  errorState = false;
  errorMessage = '';
  submitError = '';
  submitOk = '';
  submitting = false;
  token = '';
  invite: InvitationPreview | null = null;

  form = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  async ngOnInit() {
    this.token = String(this.route.snapshot.queryParamMap.get('token') || '').trim();
    if (!this.token) {
      this.loading = false;
      this.errorState = true;
      this.errorMessage = 'Missing invitation token.';
      return;
    }

    try {
      this.invite = await this.invitations.validateInvitation(this.token);
    } catch (e: any) {
      this.errorState = true;
      this.errorMessage = e?.message || 'Unable to validate invitation.';
    } finally {
      this.loading = false;
    }
  }

  async submit() {
    this.submitError = '';
    this.submitOk = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword, displayName, phone } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.submitError = 'Passwords do not match.';
      return;
    }

    try {
      this.submitting = true;
      const result = await this.invitations.acceptInvitation({
        token: this.token,
        password: String(password || ''),
        displayName: String(displayName || ''),
        phone: String(phone || ''),
      });
      this.submitOk = 'Registration complete. Redirecting...';
      await this.router.navigateByUrl(result.redirect || '/dashboard');
    } catch (e: any) {
      this.submitError = e?.message || 'Unable to complete registration.';
    } finally {
      this.submitting = false;
    }
  }
}
