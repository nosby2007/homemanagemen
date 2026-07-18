import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-forbidden-page',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="forbidden">
      <div class="card">
        <p class="code">403</p>
        <h1>Access denied</h1>
        <p>
          Your current role (<strong>{{ roleLabel }}</strong>) does not have permission to access this page.
        </p>
        <div class="actions">
          <a class="btn primary" [routerLink]="backRoute">Return to workspace</a>
          <button class="btn" type="button" (click)="goLogin()">Switch account</button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .forbidden { min-height: calc(100vh - 80px); display: grid; place-items: center; padding: 20px; background: #020617; }
    .card { width: min(560px, 100%); padding: 28px; border-radius: 16px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; }
    .code { margin: 0 0 4px; font-size: 14px; color: #7dd3fc; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 0 0 10px; color: #f8fafc; }
    p { margin: 0; color: #cbd5e1; }
    .actions { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
    .btn { border: 1px solid #475569; border-radius: 10px; padding: 10px 12px; background: #0b1220; color: #e2e8f0; cursor: pointer; text-decoration: none; font-weight: 700; }
    .btn.primary { background: #0ea5e9; border-color: #0284c7; color: #fff; }
  `],
})
export class ForbiddenPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  get roleLabel() {
    return this.route.snapshot.queryParamMap.get('role') || 'unknown';
  }

  get backRoute() {
    return this.route.snapshot.queryParamMap.get('back') || '/dashboard';
  }

  async goLogin() {
    await this.router.navigateByUrl('/login');
  }
}
