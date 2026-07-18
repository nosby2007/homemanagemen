export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'new' | 'ack' | 'converted' | 'closed';

export interface FindingPhoto {
  path: string;
  url: string;
  name?: string;
  size?: number;
  contentType?: string;
  uploadedAt: number;
  uploadedBy: string;
}

export interface Finding {
  id: string;
  orgId: string;
  propertyId: string;
  inspectionId: string;

  summary: string;
  details?: string | null;
  severity: FindingSeverity;
  status: FindingStatus;

  roomArea?: string | null;
  section?: string | null;
  category?: string | null;

  photos?: FindingPhoto[];
  linkedWorkOrderId?: string | null;

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}
