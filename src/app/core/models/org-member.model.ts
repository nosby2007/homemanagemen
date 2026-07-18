export type OrgMemberRole = 'admin' | 'manager' | 'member' | 'contractor';
export type OrgMemberStatus = 'active' | 'invited' | 'disabled';

export interface OrgMemberPermissions {
  canCreateInspections?: boolean;
  canCreateFindings?: boolean;
  canCreateWorkOrders?: boolean;
  canManageBranding?: boolean;
  canManageMembers?: boolean;
}

export interface OrgMember {
  uid: string;
  email?: string;
  displayName?: string;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  title?: string;
  permissions?: OrgMemberPermissions;
  initials?: string;

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}
