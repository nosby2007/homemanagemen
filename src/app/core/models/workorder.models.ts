export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type WorkOrderStatus = 'open' | 'in_progress' | 'done' | 'closed';

export interface WorkOrderTimeLog {
  minutes: number;
  note?: string;
  createdAt: number;
  createdBy: string;
}

export interface WorkOrderMaterialCost {
  label: string;
  amount: number;
  createdAt: number;
  createdBy: string;
}

export interface WorkOrder {
  id: string;
  orgId: string;

  propertyId: string;
  inspectionId: string;
  findingId: string;

  summary: string;
  details?: string;
  roomArea?: string;

  priority: WorkOrderPriority;
  status: WorkOrderStatus;

  assignedTo?: string;
  dueDate?: number;

  timeLogs?: WorkOrderTimeLog[];
  materialCosts?: WorkOrderMaterialCost[];

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}
