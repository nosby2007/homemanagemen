import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OrganizationService } from '../core/services/organization.service';
import { OrgContextService } from '../core/org/org-context.service';

@Component({
  standalone: true,
  selector: 'app-organization-switcher',
  imports: [CommonModule],
  template: `
    <label class="switcher">
      <span>Organization</span>
      <select [value]="orgId" (change)="onChange($event)">
        <option *ngFor="let item of orgs" [value]="item.id">{{ item.name || item.id }} ({{ item.membershipRole || 'member' }})</option>
      </select>
    </label>
  `,
  styles: [`
    .switcher { display: grid; gap: 4px; min-width: 220px; }
    .switcher span { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; }
    .switcher select { border: 1px solid rgba(148,163,184,.35); border-radius: 10px; background: rgba(2,6,23,.45); color: #e2e8f0; padding: 8px 10px; }
  `],
})
export class OrganizationSwitcherComponent implements OnInit, OnDestroy {
  private orgService = inject(OrganizationService);
  private orgContext = inject(OrgContextService);
  private router = inject(Router);
  private sub = new Subscription();

  orgs: any[] = [];
  orgId = '';

  ngOnInit() {
    this.orgId = this.orgContext.orgId;
    this.sub.add(this.orgService.listMyOrganizations().subscribe((rows: any[]) => {
      this.orgs = rows || [];
    }));
  }

  async onChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (!value || value === this.orgContext.orgId) return;
    const result = await this.orgService.switchOrganization(value);
    this.orgId = value;
    await this.router.navigateByUrl(result.redirect || '/dashboard');
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
