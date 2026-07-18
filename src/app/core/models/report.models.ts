export type ReportStatus = 'processing' | 'ready' | 'error';

export interface ReportInclude {
  inspections: boolean;
  findings: boolean;
  workOrders: boolean;
  photos?: boolean;
  signatures?: boolean;
  branding?: boolean;
}

export interface Report {
  id: string;
  orgId: string;

  requestedBy: string;
  from?: number;  // timestamp
  to?: number;    // timestamp
  include: ReportInclude;

  status: ReportStatus;
  storagePath?: string; // Storage path to PDF
  errorMessage?: string;

  counts?: {
    inspections?: number;
    findings?: number;
    workOrders?: number;
  };

  createdAt: number;
  updatedAt: number;
}
