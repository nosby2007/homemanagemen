import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="ambient"></div>

      <section class="auth-card" aria-label="Sign in form">
        <header class="auth-head">
          <div class="eyebrow">InnovaCare Property Suite</div>
          <h1>Sign in</h1>
          <p>Access your property operations workspace securely.</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <label>Email</label>
          <input type="email" formControlName="email" placeholder="you@company.com" />
          <small class="field-error" *ngIf="form.controls.email.touched && form.controls.email.invalid">
            Enter a valid email address.
          </small>

          <label>Password</label>
          <div class="password-wrap">
            <input [type]="showPassword ? 'text' : 'password'" formControlName="password" placeholder="Your password" />
            <button type="button" class="toggle" (click)="showPassword = !showPassword">
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
          <small class="field-error" *ngIf="form.controls.password.touched && form.controls.password.invalid">
            Password is required.
          </small>

          <button class="cta" type="submit" [disabled]="loading">
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>

          <div class="feedback ok" *ngIf="successMessage">{{ successMessage }}</div>
          <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
        </form>

        <footer class="auth-foot">
          <a routerLink="/forgot-password">Forgot password?</a>
          <span>•</span>
          <a routerLink="/register">Create account</a>
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
      padding: 24px;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at 15% 20%, rgba(15, 76, 129, 0.14), transparent 40%),
        radial-gradient(circle at 85% 10%, rgba(29, 143, 138, 0.12), transparent 40%),
        linear-gradient(135deg, #ffffff, #f6f9fc 48%, #eef4fa);
    }
    .ambient {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.35;
      background-image: linear-gradient(to right, #dbe5ef 1px, transparent 1px), linear-gradient(to bottom, #dbe5ef 1px, transparent 1px);
      background-size: 30px 30px;
    }
    .auth-card {
      position: relative;
      width: min(460px, 100%);
      border-radius: 20px;
      border: 1px solid #dbe5ef;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);
      backdrop-filter: blur(14px);
      color: #0f172a;
      padding: 28px;
    }
    .eyebrow {
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 700;
      font-size: 0.78rem;
    }
    .auth-head h1 {
      margin: 6px 0;
      font-size: 2rem;
      color: #0f172a;
      letter-spacing: -0.02em;
      font-family: "Playfair Display", Georgia, serif;
    }
    .auth-head p {
      margin: 0;
      color: #64748b;
    }
    .form {
      display: grid;
      gap: 8px;
      margin-top: 18px;
    }
    label {
      font-size: 0.84rem;
      font-weight: 700;
      color: #334155;
    }
    input {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      background: #ffffff;
      color: #0f172a;
      padding: 11px 12px;
      outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    input:focus {
      border-color: #0f4c81;
      box-shadow: 0 0 0 3px rgba(15, 76, 129, 0.14);
    }
    .password-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toggle {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f4c81;
      border-radius: 10px;
      padding: 10px 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .field-error {
      color: #fda4af;
      font-size: 0.77rem;
      margin-bottom: 4px;
    }
    .cta {
      margin-top: 12px;
      border: none;
      border-radius: 12px;
      padding: 12px;
      background: linear-gradient(125deg, #0f4c81, #1d8f8a);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
      transition: transform .18s ease, filter .18s ease;
    }
    .cta:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
    .cta:disabled { opacity: 0.65; cursor: not-allowed; }
    .feedback {
      margin-top: 8px;
      border-radius: 10px;
      padding: 9px 10px;
      font-size: 0.85rem;
    }
    .feedback.ok { background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; }
    .feedback.err { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; }
    .auth-foot {
      margin-top: 16px;
      display: flex;
      justify-content: center;
      gap: 8px;
      color: #64748b;
      font-size: 0.9rem;
    }
    .auth-foot a {
      color: #0f4c81;
      text-decoration: none;
      font-weight: 700;
    }
  `],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  loading = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  private isPermissionDenied(error: any): boolean {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || error || '').toLowerCase();
    return code.includes('permission-denied') || message.includes('insufficient permissions');
  }

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
      const route = await this.auth.login(value.email ?? '', value.password ?? '');
      this.successMessage = 'Authentication successful. Redirecting...';
      await this.router.navigateByUrl(route);
    } catch (e: any) {
      if (this.isPermissionDenied(e)) {
        this.errorMessage = 'Connexion établie, chargement du profil en cours. Réessayez dans quelques secondes.';
        return;
      }
      const code = String(e?.code || '').toLowerCase();
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        this.errorMessage = 'Email ou mot de passe invalide.';
        return;
      }
      this.errorMessage = 'Connexion impossible pour le moment. Veuillez réessayer.';
    } finally {
      this.loading = false;
    }
  }
}
