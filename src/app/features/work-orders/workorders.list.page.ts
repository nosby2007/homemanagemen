import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkOrdersService } from './workorders.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="card">
    <div class="header">
      <div>
        <div class="h1">Work Orders</div>
        <div class="muted">Repairs and actions generated from findings</div>
      </div>
    </div>

    <div class="table">
      <div class="row head">
        <div>Priority</div><div>Summary</div><div>Room</div><div>Status</div><div>Finding</div><div>Updated</div>
      </div>

      <div class="row" *ngFor="let w of workOrders$ | async">
        <div><span class="pill">{{w.priority}}</span></div>
        <div><a class="link" [routerLink]="['/work-orders', w.id]">{{w.summary}}</a></div>
        <div>{{w.roomArea || '-'}}</div>
        <div class="muted">{{w.status}}</div>
        <div class="mono">{{(w.findingId || '') | slice:0:8}}</div>
        <div class="muted">{{w.updatedAt | date:'short'}}</div>
      </div>
    </div>
  </div>
  `
})
export class WorkOrdersListPage {
  private svc = inject(WorkOrdersService);
  workOrders$ = this.svc.listOrgLatest();
}
