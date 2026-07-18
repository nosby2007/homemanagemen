import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <section class="auth-card">
        <h1>Reset password</h1>
        <p>Create a new password for your account.</p>

        <div class="feedback err" *ngIf="invalidCode">This reset link is invalid or expired.</div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form" *ngIf="!invalidCode">
          <label>New password</label>
          <input [type]="showPassword ? 'text' : 'password'" formControlName="password" placeholder="Minimum 8 characters" />

          <label>Confirm password</label>
          <input [type]="showPassword ? 'text' : 'password'" formControlName="confirmPassword" placeholder="Repeat password" />

          <button type="button" class="toggle" (click)="showPassword = !showPassword">
            {{ showPassword ? 'Hide password' : 'Show password' }}
          </button>

          <small class="field-error" *ngIf="form.controls.password.touched && form.controls.password.invalid">
            Password must be at least 8 characters.
          </small>
          <small class="field-error" *ngIf="form.touched && form.errors?.['passwordMismatch']">
            Passwords do not match.
          </small>

          <button class="cta" type="submit" [disabled]="loading">
            {{ loading ? 'Updating...' : 'Update password' }}
          </button>

          <div class="feedback ok" *ngIf="successMessage">{{ successMessage }}</div>
          <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
        </form>

        <a class="back-link" routerLink="/login">Back to sign in</a>
      </section>
    </div>
  `,
  styles: [`
    .auth-shell { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: linear-gradient(130deg, #ffffff, #f7f9fc 60%, #edf3fa); }
    .auth-card {
      width: min(460px, 100%);
      border-radius: 18px;
      padding: 24px;
      color: #0f172a;
      border: 1px solid #dbe5ef;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 22px 42px rgba(15, 23, 42, 0.12);
    }
    h1 { margin: 0 0 8px; color: #0f172a; font-family: "Playfair Display", Georgia, serif; }
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
    .toggle {
      justify-self: start;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f4c81;
      border-radius: 10px;
      padding: 8px 10px;
      cursor: pointer;
      font-weight: 700;
    }
    .field-error { color: #fda4af; font-size: 0.77rem; }
    .cta {
      margin-top: 10px;
      border: none;
      border-radius: 12px;
      padding: 12px;
      background: linear-gradient(125deg, #0f4c81, #1d8f8a);
      color: white;
      font-weight: 800;
      cursor: pointer;
    }
    .cta:disabled { opacity: 0.65; cursor: not-allowed; }
    .feedback { margin-top: 8px; padding: 10px; border-radius: 10px; font-size: 0.85rem; }
    .feedback.ok { background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; }
    .feedback.err { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; }
    .back-link { display: inline-block; margin-top: 16px; color: #0f4c81; font-weight: 700; text-decoration: none; }
  `],
})
export class ResetPasswordPage {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  loading = false;
  showPassword = false;
  invalidCode = false;
  successMessage = '';
  errorMessage = '';

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (group) => {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { passwordMismatch: true };
      },
    }
  );

  private get oobCode(): string {
    return (this.route.snapshot.queryParamMap.get('oobCode') || '').trim();
  }

  async submit() {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.oobCode) {
      this.invalidCode = true;
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      await this.auth.resetPassword(this.oobCode, this.form.controls.password.value ?? '');
      this.successMessage = 'Password updated successfully. Redirecting to sign in...';
      await this.router.navigateByUrl('/login');
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Unable to reset password. The link may have expired.';
    } finally {
      this.loading = false;
    }
  }
}
