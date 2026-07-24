import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { signOut } from 'firebase/auth';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="page landlord-portal">
      <header class="portal-header">
        <div class="header-row">
          <button class="hamburger" (click)="toggleMenu()" aria-label="Toggle navigation menu">
            <span [class.open]="menuOpen"></span>
            <span [class.open]="menuOpen"></span>
            <span [class.open]="menuOpen"></span>
          </button>
          <div class="header-title-group">
            <h1>Landlord Portal</h1>
            <p class="subtitle">Manage your properties, tenants, and inspections</p>
          </div>
        </div>
      </header>

      <nav class="portal-nav" [class.open]="menuOpen">
        <a routerLink="/landlord/dashboard" routerLinkActive="active" class="nav-link" (click)="closeMenuOnMobile()">
          <span class="icon">📊</span>
          Dashboard
        </a>
        <a routerLink="/landlord/properties" routerLinkActive="active" class="nav-link" (click)="closeMenuOnMobile()">
          <span class="icon">🏠</span>
          Properties
        </a>
        <a routerLink="/landlord/tenants" routerLinkActive="active" class="nav-link" (click)="closeMenuOnMobile()">
          <span class="icon">👥</span>
          Tenants
        </a>
        <a routerLink="/landlord/inspections" routerLinkActive="active" class="nav-link" (click)="closeMenuOnMobile()">
          <span class="icon">🔍</span>
          Inspections
        </a>
        <a routerLink="/landlord/reporting" routerLinkActive="active" class="nav-link" (click)="closeMenuOnMobile()">
          <span class="icon">📊</span>
          Reports
        </a>
        <a routerLink="/property-reports" routerLinkActive="active" class="nav-link" (click)="closeMenuOnMobile()">
          <span class="icon">📈</span>
          Property Reports
        </a>
        <a routerLink="/landlord/settings" routerLinkActive="active" class="nav-link" (click)="closeMenuOnMobile()">
          <span class="icon">⚙️</span>
          Settings
        </a>
        <button class="nav-link logout-btn" (click)="logout(); closeMenuOnMobile()">
          <span class="icon">🚪</span>
          Logout
        </button>
      </nav>

      <main class="portal-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .landlord-portal {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f5f7fa;
    }

    .portal-header {
      padding: 2.5rem;
      background: linear-gradient(135deg, #0f4c81 0%, #1d8f8a 100%);
      color: white;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      position: relative;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .header-title-group {
      flex: 1;
    }

    .portal-header h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .subtitle {
      margin: 0.75rem 0 0;
      opacity: 0.95;
      font-size: 1.1rem;
      font-weight: 300;
    }

    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 44px;
      height: 44px;
      background: transparent;
      border: none;
      cursor: pointer;
      margin-right: 1.25rem;
      z-index: 1002;
    }
    .hamburger span {
      display: block;
      width: 28px;
      height: 4px;
      margin: 4px 0;
      background: #fff;
      border-radius: 2px;
      transition: 0.3s;
    }
    .hamburger span.open:nth-child(1) {
      transform: translateY(8px) rotate(45deg);
    }
    .hamburger span.open:nth-child(2) {
      opacity: 0;
    }
    .hamburger span.open:nth-child(3) {
      transform: translateY(-8px) rotate(-45deg);
    }

    .portal-nav {
      display: flex;
      gap: 0.75rem;
      padding: 1.25rem;
      background: white;
      border-bottom: 2px solid #e1e8ed;
      overflow-x: auto;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transition: max-height 0.3s, opacity 0.3s;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.875rem 1.75rem;
      background: #f8f9fa;
      border: 2px solid transparent;
      border-radius: 0.625rem;
      text-decoration: none;
      color: #495057;
      font-weight: 500;
      transition: all 0.3s ease;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .nav-link:hover {
      background: #e9ecef;
      transform: translateY(-3px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      border-color: #0f4c81;
    }

    .nav-link.active {
      background: linear-gradient(135deg, #0f4c81 0%, #1d8f8a 100%);
      color: white;
      border-color: #0f4c81;
      box-shadow: 0 4px 12px rgba(15, 76, 129, 0.35);
      transform: translateY(-2px);
    }

    .icon {
      font-size: 1.4rem;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
    }

    .portal-content {
      flex: 1;
      padding: 2.5rem;
      overflow-y: auto;
      background: #f5f7fa;
    }

    .logout-btn {
      background: #ffeaea;
      color: #d7263d;
      border: 2px solid #d7263d;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    .logout-btn:hover {
      background: #d7263d;
      color: #fff;
      border-color: #d7263d;
    }

    @media (max-width: 1024px) {
      .portal-header {
        padding: 1.5rem 0.5rem;
      }
      .portal-content {
        padding: 1.5rem;
      }
    }

    @media (max-width: 768px) {
      .header-row {
        justify-content: flex-start;
      }
      .header-title-group {
        text-align: left;
      }
      .portal-header h1 {
        font-size: 1.75rem;
      }
      .subtitle {
        font-size: 0.95rem;
      }
      .hamburger {
        display: flex;
      }
      .portal-nav {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: white;
        border-bottom: 2px solid #e1e8ed;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        z-index: 2000;
        max-height: 0;
        opacity: 0;
        pointer-events: none;
        padding: 0 1rem;
        transition: max-height 0.3s, opacity 0.3s;
        overflow: hidden;
      }
      .portal-nav.open {
        max-height: 500px;
        opacity: 1;
        pointer-events: auto;
        padding: 1rem;
        transition: max-height 0.3s, opacity 0.3s;
      }
      .nav-link {
        padding: 0.75rem 1.25rem;
        font-size: 1rem;
      }
      .portal-content {
        padding: 1rem;
      }
    }
  `]
})
export class LandlordPortalPage {
  menuOpen = false;
  private auth = inject(Auth);
  private router = inject(Router);

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenuOnMobile() {
    if (window.innerWidth <= 768) {
      this.menuOpen = false;
    }
  }

  async logout() {
    await signOut(this.auth);
    await this.router.navigateByUrl('/login');
  }
}
    