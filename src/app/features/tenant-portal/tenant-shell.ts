import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { signOut } from 'firebase/auth';

@Component({
  selector: 'app-tenant-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="tenant-shell">
      <header class="tenant-header">
        <div class="header-top">
          <div class="branding">
            <img src="assets/logo.svg" alt="Innovacare Logo" class="logo" />
            <span class="brand-title">Tenant Portal</span>
          </div>
          <button class="menu-toggle" (click)="toggleMenu()" aria-label="Toggle menu">
            <span class="hamburger"></span>
          </button>
        </div>
        <nav [class.open]="isMenuOpen">
          <button class="close-btn" (click)="closeMenu()" aria-label="Close menu">&times;</button>
          <a routerLink="/tenant/homePage" routerLinkActive="active" (click)="closeMenu()">
            <span class="nav-icon">🏠</span> Dashboard
          </a>
          <a routerLink="/tenant/maintenance" routerLinkActive="active" (click)="closeMenu()">
            <span class="nav-icon">🛠️</span> Maintenance
          </a>
          <a routerLink="/tenant/payments" routerLinkActive="active" (click)="closeMenu()">
            <span class="nav-icon">💳</span> Payments
          </a>
          <a routerLink="/tenant/documents" routerLinkActive="active" (click)="closeMenu()">
            <span class="nav-icon">📄</span> Documents
          </a>
          <a routerLink="/tenant/profile" routerLinkActive="active" (click)="closeMenu()">
            <span class="nav-icon">👤</span> Profile
          </a>
          <button class="logout-btn" (click)="logout()">
            <span class="nav-icon">🚪</span> Logout
          </button>
        </nav>
      </header>

      <main class="tenant-content">
        <router-outlet></router-outlet>
      </main>

      <footer class="tenant-footer">
        <div class="footer-content">
          <span>&copy; {{ currentYear }} Innovacare Architecture Pro</span>
          <span class="footer-links">
            <a href="#" tabindex="-1">Privacy Policy</a> | <a href="#" tabindex="-1">Terms</a>
          </span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .tenant-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }

    .tenant-header {
      background: #fff;
      padding: 0.5rem 2rem 0 2rem;
      border-bottom: 1px solid #e5e7eb;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 64px;
    }

    .branding {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo {
      height: 36px;
      width: 36px;
      border-radius: 8px;
      background: #f0f0f0;
      object-fit: contain;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .brand-title {
      font-size: 1.35rem;
      font-weight: 600;
      color: #1a202c;
      letter-spacing: 0.01em;
      font-family: "Playfair Display", Georgia, serif;
    }

    .menu-toggle {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      z-index: 1001;
    }

    .hamburger {
      display: block;
      width: 28px;
      height: 3px;
      background-color: #1a202c;
      position: relative;
      border-radius: 2px;
      transition: background-color 0.3s;
    }
    .hamburger::before,
    .hamburger::after {
      content: '';
      position: absolute;
      width: 28px;
      height: 3px;
      background-color: #1a202c;
      border-radius: 2px;
      transition: transform 0.3s;
    }
    .hamburger::before {
      top: -9px;
    }
    .hamburger::after {
      top: 9px;
    }

    .close-btn {
      display: none;
      background: none;
      border: none;
      font-size: 2.2rem;
      cursor: pointer;
      color: #1a202c;
      position: absolute;
      top: 1.2rem;
      right: 1.2rem;
      z-index: 1002;
      line-height: 1;
    }

    .tenant-header nav {
      margin-top: 0.5rem;
      display: flex;
      gap: 1.2rem;
      align-items: center;
      position: relative;
    }

    .tenant-header nav a,
    .tenant-header nav .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #1a202c;
      text-decoration: none;
      padding: 0.45rem 1.1rem;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      background: none;
      border: none;
      transition: background 0.18s, color 0.18s;
      cursor: pointer;
      outline: none;
      box-shadow: none;
    }

    .tenant-header nav a:hover,
    .tenant-header nav .logout-btn:hover {
      background: #f0f4fa;
      color: #007bff;
    }

    .tenant-header nav a.active {
      background: linear-gradient(135deg, #0f4c81, #1d8f8a);
      color: #fff;
      box-shadow: 0 6px 14px rgba(15, 76, 129, 0.2);
    }

    .nav-icon {
      font-size: 1.15em;
      margin-right: 0.25em;
      opacity: 0.85;
    }

    .tenant-content {
      flex: 1;
      padding: 2.5rem 2rem 2rem 2rem;
      max-width: 100%;
      margin: 0 auto;
      width: 100%;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px 0 rgba(0,0,0,0.06);
      margin-top: 2rem;
      margin-bottom: 2rem;
    }

    .tenant-footer {
      background: #ffffff;
      padding: 1.2rem 2rem;
      border-top: 1px solid #e5e7eb;
      box-shadow: 0 -4px 14px rgba(15, 23, 42, 0.04);
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      font-size: 0.98rem;
      color: #6c757d;
    }

    .footer-links a {
      color: #007bff;
      text-decoration: none;
      margin: 0 0.2rem;
      font-weight: 500;
      opacity: 0.85;
      transition: color 0.18s;
    }
    .footer-links a:hover {
      color: #0056b3;
      text-decoration: underline;
    }

    @media (max-width: 900px) {
      .tenant-content {
        padding: 1.2rem 0.5rem 1.2rem 0.5rem;
      }
      .tenant-header {
        padding: 0.5rem 1rem 0 1rem;
      }
      .tenant-footer {
        padding: 1rem 1rem;
      }
    }

    @media (max-width: 768px) {
      .menu-toggle {
        display: block;
      }

      .tenant-header nav {
        position: fixed;
        top: 0;
        right: -100%;
        width: 80%;
        max-width: 320px;
        height: 100vh;
        background: #fff;
        flex-direction: column;
        align-items: flex-start;
        padding: 4.5rem 2rem 2rem 2rem;
        box-shadow: -2px 0 16px rgba(0,0,0,0.13);
        transition: right 0.3s cubic-bezier(.4,0,.2,1);
        z-index: 1000;
        margin-top: 0;
      }

      .tenant-header nav.open {
        right: 0;
      }

      .tenant-header nav.open .close-btn {
        display: block;
      }

      .tenant-header nav a,
      .tenant-header nav .logout-btn {
        width: 100%;
        text-align: left;
        font-size: 1.08rem;
        padding: 0.8rem 0.5rem;
        margin-bottom: 0.2rem;
      }
    }

    @media (max-width: 500px) {
      .tenant-content {
        margin-top: 1rem;
        margin-bottom: 1rem;
        border-radius: 0;
        box-shadow: none;
      }
      .footer-content {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }
    }
  `]
})
export class TenantShellComponent {
  currentYear = new Date().getFullYear();

  isMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
  closeMenu() {
    this.isMenuOpen = false;
  }

  private auth = inject(Auth);
  private router = inject(Router);

  async logout() {
    this.closeMenu();
    await signOut(this.auth);
    await this.router.navigateByUrl('/login');
  }
}
