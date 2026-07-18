export type AssetStatus = 'active' | 'inactive' | 'retired';
export type AssetCategory =
  | 'appliance'
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'structure'
  | 'safety'
  | 'other';

export interface AssetWarranty {
  provider?: string | null;
  startAt?: number | null;
  endAt?: number | null;
  notes?: string | null;
}

export interface Asset {
  id: string;
  orgId: string;

  propertyId: string;
  name: string;              // required
  category: AssetCategory;   // required
  status: AssetStatus;       // required

  roomArea?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial?: string | null;

  installedAt?: number | null;
  lastServiceAt?: number | null;
  nextServiceAt?: number | null;

  purchasePrice?: number | null;
  notes?: string | null;

  warranty?: AssetWarranty | null;

  tags?: string[]; // stored as [] if empty

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}
