import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <section class="auth-card">
        <h1>Forgot your password?</h1>
        <p>Enter your account email and we will send a secure reset link.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <label>Email address</label>
          <input type="email" formControlName="email" placeholder="you@company.com" />
          <small class="field-error" *ngIf="form.controls.email.touched && form.controls.email.invalid">
            Enter a valid email address.
          </small>

          <button class="cta" type="submit" [disabled]="loading">
            {{ loading ? 'Sending...' : 'Send reset link' }}
          </button>

          <div class="feedback ok" *ngIf="successMessage">{{ successMessage }}</div>
          <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
        </form>

        <a routerLink="/login" class="back-link">Back to sign in</a>
      </section>
    </div>
  `,
  styles: [`
    .auth-shell { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #ffffff, #f7f9fc 60%, #edf3fa); padding: 20px; }
    .auth-card {
      width: min(460px, 100%);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #dbe5ef;
      box-shadow: 0 22px 40px rgba(15, 23, 42, 0.12);
      padding: 26px;
      color: #0f172a;
    }
    h1 { margin: 0 0 8px; font-size: 1.6rem; color: #0f172a; font-family: "Playfair Display", Georgia, serif; }
    p { margin: 0 0 16px; color: #64748b; }
    .form { display: grid; gap: 8px; }
    label { font-size: 0.85rem; font-weight: 700; color: #334155; }
    input {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: #ffffff;
      color: #0f172a;
      padding: 11px 12px;
      outline: none;
    }
    input:focus { border-color: #0f4c81; box-shadow: 0 0 0 3px rgba(15, 76, 129, 0.14); }
    .field-error { color: #fda4af; font-size: 0.77rem; }
    .cta {
      margin-top: 10px;
      border: none;
      border-radius: 12px;
      padding: 12px;
      background: linear-gradient(135deg, #0f4c81, #1d8f8a);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }
    .cta:disabled { opacity: .6; cursor: not-allowed; }
    .feedback { margin-top: 8px; padding: 10px; border-radius: 10px; font-size: 0.85rem; }
    .feedback.ok { background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; }
    .feedback.err { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; }
    .back-link { display: inline-block; margin-top: 16px; color: #0f4c81; text-decoration: none; font-weight: 700; }
  `],
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = false;
  successMessage = '';
  errorMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit() {
    this.successMessage = '';
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      await this.auth.forgotPassword(this.form.controls.email.value ?? '');
      this.successMessage = 'Password reset email sent. Check your inbox and spam folder.';
      this.form.reset();
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Unable to send reset email.';
    } finally {
      this.loading = false;
    }
  }
}
