
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
      <div class="settings-section">
        <h2>Account</h2>
        <div class="setting-item">
          <label for="name">Name</label>
          <input id="name" [(ngModel)]="settings.name" type="text" placeholder="Your Name" />
        </div>
        <div class="setting-item">
          <label for="email">Email</label>
          <input id="email" [(ngModel)]="settings.email" type="email" placeholder="Your Email" />
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
          <button class="change-password" (click)="changePassword()">Change Password</button>
        </div>
      </div>
      <div class="settings-footer">
        <button class="save-btn" (click)="saveSettings()">Save Changes</button>
      </div>
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
export class LandlordSettingPage {
  theme: 'light-theme' | 'dark-theme' = 'light-theme';
  settings = {
    name: '',
    email: '',
    phone: '',
    emailNotifications: true,
    smsNotifications: false
  };

  toggleTheme() {
    this.theme = this.theme === 'light-theme' ? 'dark-theme' : 'light-theme';
  }

  saveSettings() {
    // Implement save logic (e.g., API call)
    alert('Settings saved!');
  }

  changePassword() {
    // Implement password change logic (e.g., open modal)
    alert('Password change requested!');
  }
}
