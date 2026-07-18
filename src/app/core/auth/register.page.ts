import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AppRole } from './auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="bg-mesh"></div>

      <section class="auth-card">
        <header class="auth-head">
          <div class="eyebrow">PropertyFlow Pro</div>
          <h1>Create your account</h1>
          <p>Set up your workspace with a role-aware profile.</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <label>Full name <span>*</span></label>
          <input type="text" formControlName="fullName" placeholder="e.g. Alex Morgan" />
          <small class="field-error" *ngIf="form.controls.fullName.touched && form.controls.fullName.invalid">
            Full name is required.
          </small>

          <label>Email address <span>*</span></label>
          <input type="email" formControlName="email" placeholder="you@company.com" />
          <small class="field-error" *ngIf="form.controls.email.touched && form.controls.email.invalid">
            Enter a valid email address.
          </small>

          <label>Role <span>*</span></label>
          <select formControlName="role">
            <option value="agency_admin">Agency Admin</option>
            <option value="broker">Broker</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
            <option value="manager">Property Manager</option>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="maintenance">Maintenance Staff</option>
            <option value="vendor">Vendor</option>
          </select>

          <label>Password <span>*</span></label>
          <div class="password-wrap">
            <input [type]="showPassword ? 'text' : 'password'" formControlName="password" placeholder="Minimum 8 characters" />
            <button type="button" class="toggle" (click)="showPassword = !showPassword">
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
          <small class="field-error" *ngIf="form.controls.password.touched && form.controls.password.invalid">
            Password must be at least 8 characters.
          </small>

          <label>Confirm password <span>*</span></label>
          <input [type]="showPassword ? 'text' : 'password'" formControlName="confirmPassword" placeholder="Repeat your password" />
          <small class="field-error" *ngIf="form.touched && form.errors?.['passwordMismatch']">
            Passwords do not match.
          </small>

          <button class="cta" type="submit" [disabled]="loading">
            {{ loading ? 'Creating account...' : 'Create account' }}
          </button>

          <div class="feedback ok" *ngIf="successMessage">{{ successMessage }}</div>
          <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
        </form>

        <footer class="auth-foot">
          Already have an account?
          <a routerLink="/login">Sign in</a>
        </footer>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .auth-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 20px;
      background:
        radial-gradient(circle at 18% 18%, rgba(29, 143, 138, 0.14), transparent 45%),
        radial-gradient(circle at 85% 15%, rgba(15, 76, 129, 0.16), transparent 45%),
        linear-gradient(140deg, #ffffff, #f7f9fc 65%, #edf3fa);
      position: relative;
      overflow: hidden;
    }
    .bg-mesh {
      position: absolute;
      inset: 0;
      opacity: 0.35;
      background-image: linear-gradient(to right, #dbe5ef 1px, transparent 1px), linear-gradient(to bottom, #dbe5ef 1px, transparent 1px);
      background-size: 34px 34px;
      pointer-events: none;
    }
    .auth-card {
      position: relative;
      width: min(500px, 100%);
      border-radius: 20px;
      border: 1px solid #dbe5ef;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);
      padding: 28px;
      color: #0f172a;
    }
    .auth-head h1 { margin: 4px 0 6px; font-size: 2rem; color: #0f172a; font-family: "Playfair Display", Georgia, serif; }
    .auth-head p { margin: 0; color: #64748b; }
    .eyebrow { color: #0f766e; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; }
    .form { display: grid; gap: 8px; margin-top: 20px; }
    label { font-size: 0.85rem; font-weight: 700; color: #334155; }
    label span { color: #fca5a5; }
    input, select {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: #ffffff;
      color: #0f172a;
      padding: 11px 12px;
      outline: none;
    }
    input:focus, select:focus { border-color: #0f4c81; box-shadow: 0 0 0 3px rgba(15, 76, 129, 0.14); }
    .password-wrap { display: flex; align-items: center; gap: 8px; }
    .toggle {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f4c81;
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-weight: 700;
      white-space: nowrap;
    }
    .cta {
      margin-top: 12px;
      border: none;
      border-radius: 12px;
      padding: 12px;
      background: linear-gradient(125deg, #0f4c81, #1d8f8a);
      color: white;
      font-weight: 800;
      cursor: pointer;
      transition: transform .18s ease, filter .18s ease;
    }
    .cta:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
    .cta:disabled { opacity: 0.6; cursor: not-allowed; }
    .field-error { color: #fda4af; font-size: 0.77rem; margin-bottom: 4px; }
    .feedback { margin-top: 8px; padding: 10px 12px; border-radius: 10px; font-size: 0.85rem; }
    .feedback.ok { background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; }
    .feedback.err { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; }
    .auth-foot { margin-top: 18px; color: #64748b; text-align: center; font-size: 0.9rem; }
    .auth-foot a { color: #0f4c81; font-weight: 700; text-decoration: none; }
  `],
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  loading = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role: ['agency_admin' as AppRole, [Validators.required]],
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

  async submit() {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const value = this.form.getRawValue();
      const route = await this.auth.register({
        fullName: value.fullName ?? '',
        email: value.email ?? '',
        password: value.password ?? '',
        role: (value.role ?? 'manager') as AppRole,
      });
      this.successMessage = 'Account created successfully. Redirecting...';
      await this.router.navigateByUrl(route);
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Registration failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
