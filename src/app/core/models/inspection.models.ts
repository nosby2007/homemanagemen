export type InspectionStatus = 'new' | 'scheduled' | 'in_progress' | 'completed' | 'archived';

export interface InspectionSignature {
  path: string;
  url: string;
  name?: string;
  signedAt: number;
  signedByUid: string;
}

export interface Inspection {
  id: string;
  orgId: string;
  propertyId: string;

  status: InspectionStatus;
  scheduledAt?: number | null;
  startedAt?: number | null;

  notes?: string;

  // address snapshot (optional)
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  signatureInspector?: InspectionSignature;
  signatureClient?: InspectionSignature;

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}
