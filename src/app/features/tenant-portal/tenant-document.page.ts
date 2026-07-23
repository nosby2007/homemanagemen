import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentsService } from '../documents/documents.service';
import { TenantDashboardService } from './tenant-dashboard.service';

@Component({
  selector: 'app-tenant-document',
  template: `
    <div class="document-page">
      <header class="page-header">
        <h1>My Documents</h1>
        <button class="upload-btn" (click)="uploadDocument()">
          <span class="icon">+</span> Upload Document
        </button>
      </header>

      <div class="loading-spinner" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading documents...</p>
      </div>

      <div class="documents-container" *ngIf="!loading">
        <div class="document-card" *ngFor="let doc of documents">
          <div class="document-icon">
            <span class="file-type">{{ doc.type }}</span>
          </div>
          <div class="document-info">
            <h3 class="document-name">{{ doc.name }}</h3>
            <div class="document-meta">
              <span class="category">{{ doc.category }}</span>
              <span class="size">{{ doc.size }}</span>
              <span class="date">{{ doc.date | date: 'MMM d, yyyy' }}</span>
            </div>
          </div>
          <div class="document-actions">
            <button class="action-btn view" (click)="viewDocument(doc)">View</button>
            <button class="action-btn download" (click)="downloadDocument(doc)">Download</button>
          </div>
        </div>

        <div class="empty-state" *ngIf="documents.length === 0">
          <p>No documents available</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .document-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .page-header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }

    .upload-btn {
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.3s;
    }

    .upload-btn:hover {
      background: #0056b3;
    }

    .upload-btn .icon {
      font-size: 20px;
      font-weight: bold;
    }

    .loading-spinner {
      text-align: center;
      padding: 60px 20px;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .documents-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .document-card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: box-shadow 0.3s, transform 0.3s;
    }

    .document-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .document-icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .file-type {
      color: white;
      font-weight: 600;
      font-size: 12px;
    }

    .document-info {
      flex: 1;
    }

    .document-name {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0 0 8px 0;
    }

    .document-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .document-meta span {
      font-size: 14px;
      color: #666;
    }

    .category {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 500;
    }

    .document-actions {
      display: flex;
      gap: 10px;
      flex-shrink: 0;
    }

    .action-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
    }

    .action-btn.view {
      background: #f0f0f0;
      color: #333;
    }

    .action-btn.view:hover {
      background: #e0e0e0;
    }

    .action-btn.download {
      background: #28a745;
      color: white;
    }

    .action-btn.download:hover {
      background: #218838;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
      font-size: 18px;
    }

    @media (max-width: 768px) {
      .document-card {
        flex-direction: column;
        align-items: flex-start;
      }

      .document-actions {
        width: 100%;
        justify-content: stretch;
      }

      .action-btn {
        flex: 1;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .upload-btn {
        width: 100%;
        justify-content: center;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TenantDocumentPage implements OnInit {
  documents: any[] = [];
  loading: boolean = false;
  private tenantProfileId: string | null = null;

  constructor(
    private docsSvc: DocumentsService,
    private tenantDashboard: TenantDashboardService,
  ) {}

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this.loading = true;

    this.tenantDashboard.getTenantProfile().subscribe({
      next: (tenant) => {
        this.tenantProfileId = tenant?.id || null;
        if (!this.tenantProfileId) {
          this.documents = [];
          this.loading = false;
          return;
        }

        this.docsSvc.listForCurrentTenant(this.tenantProfileId).subscribe({
          next: (rows: any[]) => {
            this.documents = rows.map((d) => ({
              id: d.id,
              name: d.title || d.fileName || 'Document',
              type: (d.contentType || 'file').toString().split('/')[1]?.toUpperCase() || 'FILE',
              size: d.size ? `${(Number(d.size) / (1024 * 1024)).toFixed(1)} MB` : '-',
              date: d.createdAt || Date.now(),
              category: d.category || 'other',
              url: d.downloadUrl || null,
            }));
            this.loading = false;
          },
          error: () => {
            this.documents = [];
            this.loading = false;
          },
        });
      },
      error: () => {
        this.documents = [];
        this.loading = false;
      }
    });
  }

  downloadDocument(document: any) {
    if (!document?.url) return;
    window.open(document.url, '_blank');
  }

  viewDocument(document: any) {
    if (!document?.url) return;
    window.open(document.url, '_blank');
  }

  uploadDocument() {
    // Upload workflow should use shared Documents page to capture file metadata.
    alert('Use Documents module to upload files. This tenant view is read-focused.');
  }

  refresh(event?: any) {
    this.loadDocuments();
    if (event) {
      event.target.complete();
    }
  }
}
