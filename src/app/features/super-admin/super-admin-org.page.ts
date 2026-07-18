import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="wrap">
    <a class="back" routerLink="/super-admin/setup">← Back to Setup</a>
    <div class="h1">Organization</div>
    <div class="sub">Org ID: <span class="mono">{{ orgId }}</span></div>

    <div class="card">
      <div class="title">Actions</div>
      <ul class="list">
        <li>Review branding</li>
        <li>Manage members (later)</li>
        <li>Open org as member (optional feature later)</li>
      </ul>
    </div>
  </div>
  `,
  styles: [`
    .wrap{display:flex;flex-direction:column;gap:10px}
    .back{color:#e5e7eb;opacity:.85;text-decoration:none}
    .back:hover{opacity:1}
    .h1{font-size:22px;font-weight:900}
    .sub{opacity:.75}
    .mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace}
    .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;margin-top:8px}
    .title{font-weight:900;margin-bottom:8px}
    .list{margin:0;padding-left:18px;opacity:.85}
  `]
})
export class SuperAdminOrgPage {
  private route = inject(ActivatedRoute);
  orgId = this.route.snapshot.paramMap.get('orgId') || '';
}
