
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-landlord-setting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container" [ngClass]="theme">
      <div class="settings-header">
        <h1>Landlord Settings</h1>
        <button class="theme-toggle" (click)="toggleTheme()">
          Switch to {{ theme === 'light-theme' ? 'Dark' : 'Light' }} Theme
        </button>
      </div>
      <div class="state" *ngIf="loading">Loading your settings...</div>

      <ng-container *ngIf="!loading">
        <div class="feedback error" *ngIf="error">{{ error }}</div>
        <div class="feedback success" *ngIf="successMessage">{{ successMessage }}</div>

        <div class="settings-section">
          <h2>Account</h2>
          <div class="setting-item">
            <label for="name">Name</label>
            <input id="name" [(ngModel)]="settings.name" type="text" placeholder="Your Name" />
          </div>
          <div class="setting-item">
            <label for="email">Email</label>
            <input id="email" [ngModel]="settings.email" type="email" disabled />
          </div>
          <div class="setting-item">
            <label for="phone">Phone</label>
            <input id="phone" [(ngModel)]="settings.phone" type="tel" placeholder="Your Phone" />
          </div>
        </div>
        <div class="settings-section">
          <h2>Notifications</h2>
          <div class="setting-item">
            <label>
              <input type="checkbox" [(ngModel)]="settings.emailNotifications" />
              Email Notifications
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" [(ngModel)]="settings.smsNotifications" />
              SMS Notifications
            </label>
          </div>
        </div>
        <div class="settings-section">
          <h2>Security</h2>
          <div class="setting-item">
            <button class="change-password" (click)="changePassword()" [disabled]="sendingReset">
              {{ sendingReset ? 'Sending...' : 'Change Password' }}
            </button>
          </div>
        </div>
        <div class="settings-footer">
          <button class="save-btn" (click)="saveSettings()" [disabled]="saving">{{ saving ? 'Saving...' : 'Save Changes' }}</button>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 500px;
      margin: 40px auto;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      background: var(--background);
      color: var(--text);
      transition: background 0.3s, color 0.3s;
    }
    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 2rem;
      margin: 0;
    }
    .theme-toggle {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }
    .theme-toggle:hover {
      background: var(--primary-dark);
    }
    .settings-section {
      margin-bottom: 32px;
    }
    h2 {
      font-size: 1.2rem;
      margin-bottom: 12px;
      color: var(--primary);
    }
    .setting-item {
      display: flex;
      flex-direction: column;
      margin-bottom: 16px;
    }
    label {
      margin-bottom: 6px;
      font-weight: 500;
    }
    input[type="text"], input[type="email"], input[type="tel"] {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
      background: var(--input-bg);
      color: var(--text);
      transition: border 0.2s;
    }
    input[type="text"]:focus, input[type="email"]:focus, input[type="tel"]:focus {
      border-color: var(--primary);
      outline: none;
    }
    input:disabled {
      opacity: .6;
      cursor: not-allowed;
    }
    .state {
      text-align: center;
      padding: 24px;
      color: var(--text);
      opacity: .75;
    }
    .feedback {
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      margin-bottom: 18px;
    }
    .feedback.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }
    .feedback.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .change-password {
      background: var(--secondary);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }
    .change-password:hover {
      background: var(--secondary-dark);
    }
    .settings-footer {
      display: flex;
      justify-content: flex-end;
    }
    .save-btn {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 10px 24px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .save-btn:hover {
      background: var(--primary-dark);
    }
    /* Light Theme */
    .light-theme {
      --background: #fff;
      --text: #222;
      --primary: #2c3e50;
      --primary-dark: #1a242f;
      --secondary: #2980b9;
      --secondary-dark: #14507a;
      --input-bg: #f7f7f7;
    }
    /* Dark Theme */
    .dark-theme {
      --background: #181c23;
      --text: #f1f1f1;
      --primary: #4fc3f7;
      --primary-dark: #0288d1;
      --secondary: #00bcd4;
      --secondary-dark: #008ba3;
      --input-bg: #232a34;
    }
  `]
})
export class LandlordSettingPage implements OnInit {
  private userSvc = inject(UserService);
  private authSvc = inject(AuthService);

  theme: 'light-theme' | 'dark-theme' = 'light-theme';
  loading = true;
  saving = false;
  sendingReset = false;
  error = '';
  successMessage = '';

  settings = {
    name: '',
    email: '',
    phone: '',
    emailNotifications: true,
    smsNotifications: false
  };

  async ngOnInit() {
    try {
      const profile = await firstValueFrom(this.userSvc.getCurrentUserProfile());
      this.settings = {
        name: profile?.fullName || profile?.displayName || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        emailNotifications: profile?.emailNotifications ?? true,
        smsNotifications: profile?.smsNotifications ?? false,
      };
    } catch (err: any) {
      this.error = err?.message || 'Unable to load your settings.';
    } finally {
      this.loading = false;
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'light-theme' ? 'dark-theme' : 'light-theme';
  }

  async saveSettings() {
    this.error = '';
    this.successMessage = '';
    this.saving = true;
    try {
      await this.userSvc.updateCurrentUserProfile({
        fullName: this.settings.name,
        phone: this.settings.phone,
        emailNotifications: this.settings.emailNotifications,
        smsNotifications: this.settings.smsNotifications,
      } as any);
      this.successMessage = 'Settings saved.';
    } catch (err: any) {
      this.error = err?.message || 'Failed to save settings.';
    } finally {
      this.saving = false;
    }
  }

  async changePassword() {
    this.error = '';
    this.successMessage = '';
    if (!this.settings.email) {
      this.error = 'No email on file for this account.';
      return;
    }
    this.sendingReset = true;
    try {
      await this.authSvc.forgotPassword(this.settings.email);
      this.successMessage = `Password reset email sent to ${this.settings.email}.`;
    } catch (err: any) {
      this.error = err?.message || 'Failed to send password reset email.';
    } finally {
      this.sendingReset = false;
    }
  }
}
