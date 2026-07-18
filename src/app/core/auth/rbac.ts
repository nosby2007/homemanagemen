import { AppRole } from './auth.service';

export type RoleGroup = AppRole | 'anonymous';

export const PLATFORM_ADMIN_ROLES: AppRole[] = ['super_admin', 'agency_admin', 'property_manager', 'admin', 'manager'];
export const SALES_ROLES: AppRole[] = ['super_admin', 'agency_admin', 'broker', 'agent'];
export const LANDLORD_ROLES: AppRole[] = ['super_admin', 'agency_admin', 'admin', 'manager', 'landlord'];
export const TENANT_ROLES: AppRole[] = ['super_admin', 'tenant'];
export const MAINTENANCE_ROLES: AppRole[] = ['super_admin', 'agency_admin', 'admin', 'manager', 'maintenance', 'vendor', 'staff'];

export function hasRole(role: RoleGroup | null | undefined, allowed: readonly RoleGroup[]): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  return allowed.includes(role);
}

export function roleHomePath(role: AppRole | null | undefined): string {
  if (!role) return '/login';
  if (role === 'super_admin') return '/super-admin';
  if (role === 'agency_admin' || role === 'broker' || role === 'property_manager' || role === 'admin' || role === 'manager') return '/agency/dashboard';
  if (role === 'agent') return '/agent/dashboard';
  if (role === 'tenant') return '/tenant/dashboard';
  if (role === 'landlord') return '/landlord/dashboard';
  if (role === 'buyer' || role === 'seller' || role === 'client') return '/client/dashboard';
  if (role === 'vendor') return '/vendor/dashboard';
  if (role === 'maintenance') return '/maintenance/dashboard';
  return '/dashboard';
}

export const LEAD_TRANSITIONS: Record<string, string[]> = {
  new: ['contacted', 'qualified', 'lost'],
  contacted: ['qualified', 'showing', 'lost'],
  qualified: ['showing', 'offer', 'lost'],
  showing: ['offer', 'closed', 'lost'],
  offer: ['closed', 'lost'],
  closed: [],
  lost: [],
};

export const OFFER_TRANSITIONS: Record<string, string[]> = {
  submitted: ['countered', 'accepted', 'rejected', 'withdrawn'],
  countered: ['accepted', 'rejected', 'withdrawn'],
  accepted: [],
  rejected: [],
  withdrawn: [],
};

export const TRANSACTION_TRANSITIONS: Record<string, string[]> = {
  open: ['under_contract', 'cancelled'],
  under_contract: ['financing', 'closing', 'cancelled'],
  financing: ['closing', 'cancelled'],
  closing: ['closed', 'cancelled'],
  closed: [],
  cancelled: [],
};

export const COMMISSION_TRANSITIONS: Record<string, string[]> = {
  pending: ['partial', 'paid'],
  partial: ['paid'],
  paid: [],
};
