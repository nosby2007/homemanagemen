import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AppRole, AuthService } from '../core/auth/auth.service';
import { OrgContextService } from '../core/org/org-context.service';
import { hasRole, LANDLORD_ROLES, MAINTENANCE_ROLES, PLATFORM_ADMIN_ROLES, SALES_ROLES } from '../core/auth/rbac';
import { AppNotification, NotificationService } from '../core/services/notification.service';
import { OrganizationSwitcherComponent } from './organization-switcher.component';

type MenuItem = { label: string; route: string; roles?: AppRole[] };

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, OrganizationSwitcherComponent],
  template: `
    <div class="shell">
      <aside class="sidebar" [class.open]="menuOpen">
        <div class="brand">
          <div class="brand-mark">IC</div>
          <div>
            <div class="brand-name">InnovaCare PM</div>
            <div class="brand-sub">Enterprise Workspace</div>
          </div>
        </div>

        <nav class="nav">
          <a *ngFor="let item of visibleMenu" [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }">{{ item.label }}</a>
        </nav>

        <div class="sidebar-foot">
          <a routerLink="/profile" routerLinkActive="active" class="profile-link">My profile</a>
          <button class="logout" type="button" (click)="logout()">Log out</button>
        </div>
      </aside>

      <main class="content">
        <header class="topbar">
          <button class="menu-btn" type="button" (click)="toggleMenu()">☰</button>
          <div>
            <div class="crumb">{{ breadcrumb }}</div>
            <h1>{{ pageTitle }}</h1>
            <div class="role-chip" *ngIf="effectiveRole">Role: {{ effectiveRole }}</div>
          </div>
          <div class="top-actions">
            <app-organization-switcher *ngIf="effectiveRole !== 'super_admin'"></app-organization-switcher>
            <button type="button" class="notif-btn" (click)="toggleNotifications()">
              Notifications
              <span class="notif-count" *ngIf="unreadCount">{{ unreadCount }}</span>
            </button>
            <a routerLink="/profile">Profile</a>
            <button type="button" (click)="logout()">Sign out</button>
          </div>
        </header>

        <section class="notifications-panel" *ngIf="notificationsOpen">
          <div class="notif-empty" *ngIf="!notifications.length">No notifications yet.</div>
          <button type="button" class="notif-item" *ngFor="let notification of notifications | slice:0:5" (click)="markNotificationRead(notification)">
            <div class="notif-title">{{ notification.title }}</div>
            <div class="notif-meta">{{ notification.message || 'No details' }}</div>
          </button>
        </section>

        <section class="content-body" (click)="closeMenuOnMobile()">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .shell { min-height: 100vh; display: grid; grid-template-columns: 280px 1fr; background: #f6f8fc; color: #0f172a; }
    .sidebar {
      border-right: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .brand { display: flex; gap: 10px; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; }
    .brand-mark {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-weight: 900;
      background: linear-gradient(130deg, #0f4c81, #1d8f8a);
      color: #fff;
    }
    .brand-name { font-weight: 900; color: #0f172a; }
    .brand-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .nav { display: flex; flex-direction: column; gap: 6px; }
    .nav a {
      text-decoration: none;
      color: #334155;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid transparent;
      transition: all .16s ease;
    }
    .nav a:hover { background: #eff6ff; border-color: #bfdbfe; }
    .nav a.active { background: #e0f2fe; border-color: #93c5fd; color: #0c4a6e; }
    .sidebar-foot { margin-top: auto; display: grid; gap: 8px; }
    .profile-link, .logout {
      text-align: left;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      color: #0f172a;
      text-decoration: none;
      padding: 10px 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .logout { background: #fff1f2; border-color: #fecdd3; color: #9f1239; }

    .content { display: flex; flex-direction: column; min-width: 0; }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 8;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 14px 18px;
      border-bottom: 1px solid #e2e8f0;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
    }
    .menu-btn {
      display: none;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #0f172a;
      padding: 8px 10px;
      cursor: pointer;
    }
    .crumb { color: #0f766e; font-size: 12px; text-transform: uppercase; letter-spacing: .07em; }
    h1 { margin: 2px 0 0; font-size: 1.25rem; color: #0f172a; }
    .role-chip { margin-top: 6px; display: inline-block; border: 1px solid #99f6e4; border-radius: 999px; padding: 2px 10px; font-size: 11px; color: #0f766e; background: #f0fdfa; }
    .top-actions { display: flex; gap: 8px; }
    .top-actions a,
    .top-actions button {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #ffffff;
      color: #0f172a;
      text-decoration: none;
      padding: 8px 10px;
      font-weight: 700;
      cursor: pointer;
    }
    .notif-btn { position: relative; }
    .notif-count { margin-left: 6px; display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; background: #0f766e; color: #fff; font-size: 11px; }
    .notifications-panel { display: grid; gap: 8px; padding: 10px 18px 0; background: #f8fafc; }
    .notif-item { text-align: left; border: 1px solid #e2e8f0; background: #ffffff; color: #0f172a; padding: 10px 12px; border-radius: 10px; cursor: pointer; }
    .notif-title { font-weight: 700; margin-bottom: 2px; }
    .notif-meta, .notif-empty { color: #64748b; font-size: 12px; }
    .content-body { padding: 16px 18px 24px; }

    @media (max-width: 1024px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar {
        position: fixed;
        z-index: 20;
        inset: 0 auto 0 0;
        width: 280px;
        transform: translateX(-100%);
        transition: transform .18s ease;
      }
      .sidebar.open { transform: translateX(0); }
      .menu-btn { display: inline-flex; }
    }
  `],
})
export class LayoutComponent implements OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  private fbAuth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);
  private notificationSvc = inject(NotificationService);
  private sub = new Subscription();

  menuOpen = false;
  pageTitle = 'Dashboard';
  breadcrumb = 'Operations';
  effectiveRole: AppRole | null = null;
  notificationsOpen = false;
  notifications: AppNotification[] = [];

  readonly menuItems: MenuItem[] = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Agencies', route: '/agencies', roles: ['super_admin'] },
    { label: 'Agents', route: '/agents', roles: [...PLATFORM_ADMIN_ROLES, 'broker'] },
    { label: 'Clients', route: '/clients', roles: [...SALES_ROLES, 'admin', 'manager'] },
    { label: 'Properties', route: '/properties', roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] },
    { label: 'Listings', route: '/listings', roles: [...SALES_ROLES, 'seller', 'buyer'] },
    { label: 'Leads', route: '/leads', roles: [...SALES_ROLES, 'seller', 'buyer'] },
    { label: 'Showings', route: '/showings', roles: [...SALES_ROLES, 'seller', 'buyer'] },
    { label: 'Offers', route: '/offers', roles: [...SALES_ROLES, 'seller', 'buyer'] },
    { label: 'Transactions', route: '/transactions', roles: [...SALES_ROLES, 'seller', 'buyer'] },
    { label: 'Commissions', route: '/commissions', roles: [...SALES_ROLES, 'agency_admin', 'admin', 'manager'] },
    { label: 'Units', route: '/units', roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] },
    { label: 'Tenants', route: '/tenants', roles: [...LANDLORD_ROLES] },
    { label: 'Leases', route: '/leases', roles: [...LANDLORD_ROLES] },
    { label: 'Payments', route: '/payments', roles: [...LANDLORD_ROLES, 'tenant'] },
    { label: 'Maintenance', route: '/maintenance', roles: [...MAINTENANCE_ROLES, 'landlord'] },
    { label: 'Org Members', route: '/organization-members', roles: [...PLATFORM_ADMIN_ROLES, 'broker'] },
    { label: 'Invitations', route: '/pending-invitations', roles: [...PLATFORM_ADMIN_ROLES, 'broker'] },
    { label: 'Documents', route: '/documents', roles: ['super_admin', 'agency_admin', 'broker', 'agent', 'admin', 'manager', 'staff', 'landlord', 'tenant', 'buyer', 'seller', 'vendor', 'maintenance'] },
    { label: 'Reports', route: '/reports', roles: [...PLATFORM_ADMIN_ROLES, 'broker', 'landlord'] },
    { label: 'Property Reports', route: '/property-reports', roles: [...LANDLORD_ROLES] },
    { label: 'Settings', route: '/settings', roles: [...PLATFORM_ADMIN_ROLES, 'broker', 'landlord'] },
  ];

  get visibleMenu(): MenuItem[] {
    return this.menuItems.filter((item) => {
      if (!item.roles?.length) return true;
      return hasRole(this.effectiveRole, item.roles);
    });
  }

  constructor() {
    this.updateHeader(this.router.url);
    this.sub.add(this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.updateHeader(e.urlAfterRedirects || e.url);
      this.menuOpen = false;
    }));

    this.sub.add(authState(this.fbAuth).subscribe(async (user) => {
      this.effectiveRole = null;
      this.notifications = [];
      if (!user) return;

      const userSnap = await getDoc(doc(this.fs, `users/${user.uid}`));
      const globalRole = (userSnap.exists() ? (userSnap.data() as any)?.role : null) as AppRole | null;
      if (globalRole === 'super_admin') {
        this.effectiveRole = 'super_admin';
        return;
      }

      const orgId = this.org.orgId;
      if (!orgId) {
        this.effectiveRole = globalRole;
        return;
      }

      const memberSnap = await getDoc(doc(this.fs, `orgs/${orgId}/members/${user.uid}`));
      const memberRole = (memberSnap.exists() ? (memberSnap.data() as any)?.role : null) as AppRole | null;
      this.effectiveRole = memberRole ?? globalRole;

      this.sub.add(this.notificationSvc.listForCurrentUser(10).subscribe((rows: AppNotification[]) => {
        this.notifications = rows || [];
      }));
    }));
  }

  get unreadCount() {
    return this.notifications.filter((item) => !item.read).length;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  async markNotificationRead(notification: AppNotification) {
    if (!notification.read) {
      await this.notificationSvc.markRead(notification.id);
    }
    this.notificationsOpen = false;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenuOnMobile() {
    this.menuOpen = false;
  }

  private updateHeader(url: string) {
    const clean = (url || '/dashboard').split('?')[0].replace(/^\//, '');
    const segment = clean.split('/')[0] || 'dashboard';
    this.pageTitle = segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    this.breadcrumb = clean ? `Workspace / ${this.pageTitle}` : 'Workspace';
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
