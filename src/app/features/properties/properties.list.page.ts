import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertiesService } from './properties.service';
import { Observable } from 'rxjs';
import { Property } from '../../core/models/property.models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <div class="h1">Properties</div>
          <div class="muted">All properties in the current org.</div>
        </div>
        <button class="btn" type="button" (click)="create()">+ New Property</button>

      </div>

      <div class="filters">
        <input class="input" placeholder="Search by name/address..." [(ngModel)]="q" />
      </div>

      <div class="list" *ngIf="(props$ | async) as props">
        <div class="row" *ngFor="let p of filter(props)">
          <div>
            <div class="title">{{ p.name || ('Property ' + (p.id | slice:0:8)) }}</div>
            <div class="muted">{{ p.streetAddress}}{{ p.addressLine2 ? ', ' + p.addressLine2 : '' }}, {{ p.city }}, {{ p.state }} {{ p.zipCode }}</div>
          </div>
          <div class="right">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="pill">{{ p.status || 'available' }}</span>
              <span class="muted">{{ p.furnished ? 'Furnished' : 'Unfurnished' }}</span>
            </div>
            <div class="actions">
              <button class="action-btn" type="button" (click)="open(p.id)" title="Open">
                <span>👁️</span>
              </button>
              <button class="action-btn" type="button" (click)="edit(p.id)" title="Edit">
                <span>✏️</span>
              </button>
              <button class="action-btn danger" type="button" (click)="delete(p.id)" title="Delete">
                <span>🗑️</span>
              </button>
            </div>
          </div>
        </div>
        <div style="position: relative;">&nbsp;</div>


        <div class="empty" *ngIf="!props.length">No properties yet.</div>
      </div>
    </div>
  `,
  styles: [`
    .page{ padding:16px; }
    .header{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .h1{ font-size:20px; font-weight:900; color:#e5e7eb; }
    .muted{ color: rgba(226,232,240,.75); font-size:12px; margin-top:4px; }
    .filters{ margin-top:12px; }
    .input{ width:100%; max-width:520px; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(2,6,23,.25); color:#e5e7eb; outline:none; }
    .btn{ padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.10); background: rgba(59,130,246,.85); color:white; font-weight:800; cursor:pointer; }
    .list{ margin-top:12px; display:flex; flex-direction:column; gap:10px; }
    .row{ display:flex; justify-content:space-between; gap:12px; padding:12px; border-radius:16px; border:1px solid rgba(255,255,255,.08); background: rgba(15,23,42,.78); }
    .row:hover{ border-color: rgba(255,255,255,.14); }
    .title{ font-weight:900; color:#e5e7eb; }
    .right{ display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
    .pill{ font-size:11px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color:#e5e7eb; font-weight:900; text-transform: uppercase; }
    .actions{ display:flex; gap:6px; }
    .action-btn{ padding:6px 10px; border-radius:8px; border:1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.06); color:#e5e7eb; cursor:pointer; font-size:14px; transition: all 0.2s; }
    .action-btn:hover{ background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.18); }
    .action-btn.danger:hover{ background: rgba(239,68,68,.25); border-color: rgba(239,68,68,.5); }
    .empty{ padding:14px; border:1px dashed rgba(255,255,255,.16); background: rgba(255,255,255,.02); border-radius:16px; color: rgba(226,232,240,.75); text-align:center; }
  `]
})
export class PropertiesListPage {
  private svc = inject(PropertiesService);
  private router = inject(Router);

  q = '';
  props$: Observable<Property[]> = this.svc.list();
  activeDropdown: string | null = null;

  filter(list: Property[]) {
    const q = (this.q || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(p => {
      const hay = `${p.name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  async create() {
    
    await this.router.navigate(['/properties/new']); 
  }

  open(id: string) {
    this.router.navigate(['/properties', id]);
  }

  edit(id: string) {
    this.router.navigate(['/properties', id, 'edit']);
  }

  async delete(id: string) {
    if (confirm('Are you sure you want to delete this property?')) {
      await this.svc.delete(id);
    }
  }
}
