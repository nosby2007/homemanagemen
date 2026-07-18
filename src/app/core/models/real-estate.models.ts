export type EntityStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'draft'
  | 'closed'
  | 'cancelled'
  | 'archived';

export interface AuditFields {
  id: string;
  orgId: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
  status: string;
  agencyId?: string;
}

export interface AgencyRecord {
  id: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  ownerUid?: string;
  plan?: 'starter' | 'pro' | 'enterprise';
  status: EntityStatus;
  createdAt: number;
  updatedAt: number;
}

export interface AgentRecord extends AuditFields {
  displayName: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  commissionRate?: number;
  defaultPropertyId?: string;
  propertyIds?: string[];
  userUid?: string;
  userId?: string | null;
  authStatus?: 'not_invited' | 'invited' | 'active' | 'disabled';
  invitationId?: string | null;
}

export type ClientType = 'buyer' | 'seller' | 'landlord' | 'tenant';

export interface ClientRecord extends AuditFields {
  fullName: string;
  clientType: ClientType;
  email?: string;
  phone?: string;
  propertyId?: string;
  unitId?: string;
  defaultPropertyId?: string;
  propertyIds?: string[];
  assignedAgentId?: string;
  userId?: string | null;
  authStatus?: 'not_invited' | 'invited' | 'active' | 'disabled';
  invitationId?: string | null;
  budget?: number;
  preferredLocation?: string;
  notes?: string;
}

export type ListingType = 'sale' | 'rent';
export type ListingStatus = 'draft' | 'active' | 'pending' | 'sold' | 'rented' | 'expired';

export interface ListingRecord extends AuditFields {
  title: string;
  description?: string;
  listingType: ListingType;
  listingStatus: ListingStatus;
  propertyType?: string;
  propertyId?: string;
  ownerId?: string;
  landlordId?: string;
  assignedAgentId?: string;
  price?: number;
  rentAmount?: number;
  depositAmount?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  amenities?: string[];
  photos?: string[];
  featured?: boolean;
  visibility?: 'public' | 'private';
  availabilityDate?: number;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'showing' | 'offer' | 'closed' | 'lost';

export interface LeadRecord extends AuditFields {
  fullName: string;
  email?: string;
  phone?: string;
  source?: string;
  interestType: 'buy' | 'sell' | 'rent' | 'lease' | 'property_management';
  budget?: number;
  preferredLocation?: string;
  assignedAgentId?: string;
  status: LeadStatus;
  notes?: string;
  nextFollowUpDate?: number;
}

export type ShowingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface ShowingRecord extends AuditFields {
  propertyId: string;
  listingId: string;
  clientId: string;
  agentId?: string;
  scheduledAt: number;
  status: ShowingStatus;
  feedback?: string;
}

export type OfferStatus = 'submitted' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';

export interface OfferRecord extends AuditFields {
  propertyId: string;
  listingId: string;
  buyerId: string;
  sellerId?: string;
  agentId?: string;
  offerAmount: number;
  earnestMoney?: number;
  contingencies?: string;
  closingDate?: number;
  status: OfferStatus;
}

export type TransactionStatus =
  | 'open'
  | 'under_contract'
  | 'financing'
  | 'closing'
  | 'closed'
  | 'cancelled';

export interface TransactionRecord extends AuditFields {
  propertyId: string;
  listingId?: string;
  buyerId?: string;
  sellerId?: string;
  agentId?: string;
  contractDate?: number;
  closingDate?: number;
  salePrice?: number;
  commissionRate?: number;
  commissionAmount?: number;
  status: TransactionStatus;
}

export interface CommissionRecord extends AuditFields {
  transactionId: string;
  agentId?: string;
  salePrice?: number;
  commissionRate?: number;
  grossCommission?: number;
  agentSplit?: number;
  agencySplit?: number;
  referralFee?: number;
  netCommission?: number;
  paymentStatus?: 'pending' | 'paid' | 'partial';
  closingDate?: number;
}
