import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../core/auth/auth.service';
import { OrganizationService } from '../../core/services/organization.service';
import { OrganizationType } from '../../core/models/domain.models';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-shell">
      <div class="bg-mesh"></div>

      <section class="auth-card">
        <header class="auth-head">
          <div class="eyebrow">PropertyFlow Pro</div>
          <h1>Create your organization</h1>
          <p>You'll be the owner and admin of this workspace.</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <label>Organization name <span>*</span></label>
          <input type="text" formControlName="name" placeholder="e.g. Riverside Realty" />
          <small class="field-error" *ngIf="form.controls.name.touched && form.controls.name.invalid">
            Organization name is required.
          </small>

          <label>Organization type <span>*</span></label>
          <select formControlName="type">
            <option value="agency">Real Estate Agency</option>
            <option value="brokerage">Brokerage Firm</option>
            <option value="property_manager">Property Management Company</option>
            <option value="landlord">Landlord / Property Owner</option>
          </select>

          <button class="cta" type="submit" [disabled]="loading">
            {{ loading ? 'Creating organization...' : 'Create organization' }}
          </button>

          <div class="feedback err" *ngIf="errorMessage">{{ errorMessage }}</div>
        </form>

        <footer class="auth-foot">
          Wrong account?
          <a href="javascript:void(0)" (click)="signOut()">Sign out</a>
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
    .feedback.err { background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; }
    .auth-foot { margin-top: 18px; color: #64748b; text-align: center; font-size: 0.9rem; }
    .auth-foot a { color: #0f4c81; font-weight: 700; text-decoration: none; }
  `],
})
export class CreateOrgPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authFire = inject(Auth);
  private auth = inject(AuthService);
  private orgService = inject(OrganizationService);

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    name: ['', [Validators.required]],
    type: ['agency' as OrganizationType, [Validators.required]],
  });

  async submit() {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const value = this.form.getRawValue();
      await this.orgService.createOrganization({
        name: value.name ?? '',
        type: (value.type ?? 'agency') as OrganizationType,
      });

      const uid = this.authFire.currentUser?.uid;
      const route = uid ? await this.auth.resolvePostLoginRoute(uid) : '/dashboard';
      await this.router.navigateByUrl(route);
    } catch (e: any) {
      this.errorMessage = e?.message ?? 'Unable to create organization. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async signOut() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
