import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ListingsService } from './listings.service';

@Component({
  standalone: true,
  selector: 'app-listings-list-page',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h2>Listings</h2>
          <p>Manage active, draft, pending, sold, and rented listings.</p>
        </div>
        <a class="btn primary" routerLink="/listings/new">+ New Listing</a>
      </header>

      <section class="toolbar">
        <input [(ngModel)]="query" placeholder="Search title, address, listing type, status" />
      </section>

      <section *ngIf="loading" class="state">Loading listings...</section>
      <section *ngIf="!loading && error" class="state error">{{ error }}</section>
      <section *ngIf="!loading && !error && filtered.length === 0" class="state">No listings found.</section>

      <table *ngIf="!loading && !error && filtered.length" class="table">
        <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Price</th><th>Action</th></tr></thead>
        <tbody>
          <tr *ngFor="let l of filtered">
            <td>{{ l.title }}</td>
            <td>{{ l.listingType }}</td>
            <td><span class="badge">{{ l.listingStatus }}</span></td>
            <td>{{ l.price || l.rentAmount ? ((l.price || l.rentAmount) | currency) : '-' }}</td>
            <td><a [routerLink]="['/listings', l.id]">Open</a></td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`.page{display:grid;gap:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.head h2{margin:0}.head p{margin:4px 0 0;color:#64748b}.toolbar input{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}.table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.table th,.table td{padding:10px;border-bottom:1px solid #f1f5f9;text-align:left}.badge{padding:2px 10px;border-radius:999px;background:#dbeafe;color:#1d4ed8}.state{padding:16px;border:1px dashed #cbd5e1;border-radius:10px;color:#475569}.state.error{color:#b91c1c;border-color:#fecaca;background:#fff1f2}.btn{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;text-decoration:none;display:inline-block}.btn.primary{background:#0ea5e9;border-color:#0284c7;color:#fff}`],
})
export class ListingsListPage implements OnInit, OnDestroy {
  private svc = inject(ListingsService);
  private sub?: Subscription;

  loading = true;
  error = '';
  query = '';
  rows: any[] = [];

  get filtered() {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter((r) =>
      [r.title, r.address, r.listingType, r.listingStatus, r.city].some((v: any) => String(v || '').toLowerCase().includes(q))
    );
  }

  ngOnInit() {
    this.sub = this.svc.list().subscribe({
      next: (rows: any[]) => { this.rows = rows; this.loading = false; },
      error: (e: any) => { this.error = e?.message || 'Unable to load listings.'; this.loading = false; },
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
