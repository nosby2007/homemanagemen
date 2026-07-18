import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, RouterLinkActive, Router } from '@angular/router';
import { signOut } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  template: `
  <div class="sa-shell">
    <aside class="sa-side">
      <div class="sa-brand">
        <div class="sa-title">InnovaProInspec</div>
        <div class="sa-sub">Super Admin</div>
      </div>

      <nav class="sa-nav">
        <a routerLink="/super-admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
        <a routerLink="/super-admin/setup" routerLinkActive="active">Setup / Orgs</a>
        <a routerLink="/super-admin/users" routerLinkActive="active">Users</a>
        <a routerLink="/super-admin/billing" routerLinkActive="active">Billing</a>
        <a routerLink="/super-admin/logs" routerLinkActive="active">Logs</a>
        <a routerLink="/super-admin/settings" routerLinkActive="active">Settings</a>
        <a routerLink="/super-admin/lists" routerLinkActive="active">Organizations</a>
        <a href="#" (click)="logout()">Logout</a>
      </nav>
    </aside>

    <main class="sa-main">
      <router-outlet></router-outlet>
    </main>
  </div>
  `,
  styles: [`
    .sa-shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh;background:#f6f8fc;color:#0f172a;}
    .sa-side{border-right:1px solid #e2e8f0;padding:18px 14px;background:#ffffff;}
    .sa-brand{padding:10px 12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:16px;}
    .sa-title{font-weight:800;letter-spacing:.3px;color:#0f172a}
    .sa-sub{font-size:12px;margin-top:4px;color:#64748b}
    .sa-nav{display:flex;flex-direction:column;gap:8px;margin-top:10px}
    .sa-nav a{padding:10px 12px;border-radius:12px;text-decoration:none;color:#334155;border:1px solid transparent}
    .sa-nav a:hover{background:#eff6ff;border-color:#bfdbfe}
    .sa-nav a.active{background:#e0f2fe;border-color:#93c5fd;color:#0c4a6e}
    .sa-main{padding:18px;background:#f8fafc}
    @media (max-width: 860px){
      .sa-shell{grid-template-columns:1fr}
      .sa-side{position:sticky;top:0;z-index:10}
    }
  `]
})
export class SuperAdminShellPage {
  private auth = signOut;
  private router = inject(Router);
  private authInstance = inject(Auth);
  async logout() {
    await signOut(this.authInstance);
    await this.router.navigateByUrl('/login');
  }
  
}