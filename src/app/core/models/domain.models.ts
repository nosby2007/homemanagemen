export type UserRole =
  | 'super_admin'
  | 'property_manager'
  | 'agency_admin'
  | 'broker'
  | 'admin'
  | 'manager'
  | 'agent'
  | 'landlord'
  | 'tenant'
  | 'buyer'
  | 'seller'
  | 'client'
  | 'maintenance'
  | 'vendor'
  | 'staff';

export type GlobalRole = 'superadmin' | 'user';
export type AuthLinkStatus = 'not_invited' | 'invited' | 'active' | 'disabled';
export type OrganizationType = 'agency' | 'landlord' | 'property_manager' | 'brokerage';
export type OrganizationStatus = 'active' | 'disabled' | 'pending';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type MembershipStatus = 'invited' | 'active' | 'disabled' | 'revoked';
export type MembershipTargetType = 'agent' | 'landlord' | 'tenant' | 'buyer' | 'seller' | 'vendor' | 'client' | 'staff';
export type AccessLevel = 'org' | 'property' | 'unit';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  ownerUid: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrganizationMember {
  id: string;
  orgId: string;
  userId: string | null;
  email: string;
  role: UserRole;
  targetType?: MembershipTargetType;
  targetId?: string;
  status: MembershipStatus;
  invitedBy?: string;
  defaultPropertyId?: string;
  propertyIds?: string[];
  joinedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface InvitationRecord {
  id: string;
  orgId: string;
  propertyId?: string;
  unitId?: string;
  email: string;
  role: UserRole;
  targetType: MembershipTargetType;
  targetId: string;
  status: InvitationStatus;
  tokenHash: string;
  expiresAt: number;
  invitedBy: string;
  acceptedByUid?: string | null;
  acceptedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  fullName?: string;
  phone?: string;
  globalRole?: GlobalRole;
  defaultOrgId?: string;
  activeOrgId?: string;
  role: UserRole;
  status: 'active' | 'disabled' | 'invited' | 'pending';
  agencyId?: string;
  agentId?: string;
  landlordId?: string;
  tenantId?: string;
  lastOrgId?: string;
  lastLoginAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface AuthLinkableProfile {
  id: string;
  orgId: string;
  propertyId?: string;
  unitId?: string;
  propertyIds?: string[];
  userId: string | null;
  authStatus: AuthLinkStatus;
  invitationId?: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface TenantBusinessProfile extends AuthLinkableProfile {
  fullName: string;
  email: string;
  phone?: string;
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
}

export interface AgentBusinessProfile extends AuthLinkableProfile {
  fullName: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  propertyIds?: string[];
}

export interface LandlordBusinessProfile extends AuthLinkableProfile {
  fullName: string;
  email: string;
  phone?: string;
  propertyIds?: string[];
}

export interface ClientBusinessProfile extends AuthLinkableProfile {
  clientType: 'buyer' | 'seller' | 'landlord' | 'tenant' | 'investor';
  fullName: string;
  email: string;
  phone?: string;
  assignedAgentId?: string;
}

export interface VendorBusinessProfile extends AuthLinkableProfile {
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  serviceType?: string;
  propertyIds?: string[];
}

export type UnitStatus = 'occupied' | 'vacant' | 'maintenance' | 'reserved';

export interface UnitRecord {
  id: string;
  orgId: string;
  propertyId: string;
  unitNumber: string;
  floor?: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rentAmount?: number;
  monthlyRent: number;
  currency?: string;
  status: UnitStatus;
  activeTenantId?: string;
  activeLeaseId?: string;
  assignedTenantId?: string;
  leaseId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PropertyAssignment {
  id: string;
  orgId: string;
  propertyId: string;
  unitId?: string;
  userId: string;
  email: string;
  role: UserRole;
  targetType: MembershipTargetType;
  targetId: string;
  accessLevel: AccessLevel;
  status: MembershipStatus;
  invitedBy: string;
  invitationId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export type MaintenanceStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';

export interface MaintenanceRequest {
  id: string;
  orgId: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  /** Vendor profile ID for business linking */
  assignedVendorId?: string;
  /** Staff profile ID for business linking */
  assignedStaffId?: string;
  /** Firebase Auth UID resolved from assignedVendorId */
  assignedVendorUid?: string;
  /** Firebase Auth UID resolved from assignedStaffId */
  assignedStaffUid?: string;
  /** Firebase Auth UID of the tenant who submitted the request */
  tenantUid?: string;
  title: string;
  description?: string;
  category?: string;
  assignee?: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  resolvedAt?: number | null;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

export type DocumentCategory = 'lease' | 'id' | 'inspection' | 'invoice' | 'property_document' | 'other';

export interface DocumentRecord {
  id: string;
  orgId: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  leaseId?: string;
  category: DocumentCategory;
  title: string;
  fileName: string;
  contentType?: string;
  size?: number;
  fileUrl?: string;
  downloadUrl?: string;
  storagePath?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  visibility?: 'private' | 'tenant' | 'landlord' | 'property_team' | 'org';
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ActivityLog {
  id: string;
  orgId: string;
  actorUid: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  orgId: string;
  uid: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: number;
}
