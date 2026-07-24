import { Routes } from '@angular/router';

import { AuthGuard } from './core/auth/auth.guard';
import { RoleAccessGuard } from './core/auth/role-access.guard';
import { PublicOnlyGuard } from './core/auth/public-only.guard';
import { OrgMemberGuard } from './core/org/org-member.guard';
import { OrgRoleGuard } from './core/org/org-role.guard';
import { SuperAdminGuard } from './core/super-admin/super-admin.guard';  
import { LANDLORD_ROLES, MAINTENANCE_ROLES, PLATFORM_ADMIN_ROLES, SALES_ROLES } from './core/auth/rbac';

export const routes: Routes = [
  // Public auth routes
  { path: 'login', canActivate: [PublicOnlyGuard], loadComponent: () => import('./core/auth/login.page').then(m => m.LoginPage) },
  { path: 'register', canActivate: [PublicOnlyGuard], loadComponent: () => import('./core/auth/register.page').then(m => m.RegisterPage) },
  { path: 'forgot-password', canActivate: [PublicOnlyGuard], loadComponent: () => import('./core/auth/forgot-password.page').then(m => m.ForgotPasswordPage) },
  { path: 'reset-password', canActivate: [PublicOnlyGuard], loadComponent: () => import('./core/auth/reset-password.page').then(m => m.ResetPasswordPage) },
  { path: 'accept-invite', canActivate: [PublicOnlyGuard], loadComponent: () => import('./features/invitations/accept-invite.page').then(m => m.AcceptInvitePage) },
  { path: 'onboarding/create-org', canActivate: [AuthGuard], loadComponent: () => import('./features/onboarding/create-org.page').then(m => m.CreateOrgPage) },
  { path: 'forbidden', loadComponent: () => import('./features/shared/forbidden.page').then(m => m.ForbiddenPage) },

  // ✅ Super admin MUST be outside OrgMemberGuard shell
  {
    path: 'super-admin',
    canActivate: [AuthGuard, SuperAdminGuard],
    loadComponent: () => import('./features/super-admin/super-admin-shell.page').then(m => m.SuperAdminShellPage),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/super-admin/super-admin.page').then(m => m.SuperAdminPage) },
      { path: 'setup', loadComponent: () => import('./features/super-admin/super-admin-setup.page').then(m => m.SuperAdminSetupPage) },
      { path: 'users', loadComponent: () => import('./features/super-admin/sa-org-members.page').then(m => m.SaOrgMembersPage) },
      { path: 'lists', loadComponent: () => import('./features/super-admin/sa-orgs-list.component').then(m => m.SaOrgsListComponent) },
      { path: 'orgs/:orgId', loadComponent: () => import('./features/super-admin/super-admin-org-detail.page').then(m => m.SuperAdminOrgDetailPage) },
      { path: 'orgs/:orgId/members', loadComponent: () => import('./features/super-admin/sa-org-members.page').then(m => m.SaOrgMembersPage) },
      { path: 'open-org/:orgId', loadComponent: () => import('./features/super-admin/open-org-as-member.page').then(m => m.OpenOrgAsMemberPage) },
    ],
  },
  { path: 'superadmin', redirectTo: 'super-admin' },

  // Landlord
  {
    path: 'landlord',
    canActivate: [OrgRoleGuard],
    data: { roles: [...LANDLORD_ROLES] },
    loadComponent: () => import('./features/landlord-portal/landlord.page').then(m => m.LandlordPortalPage),
    children: [
        {
          path: '', pathMatch: 'full', redirectTo: 'dashboard'
        },
        { 
          path: 'dashboard', loadComponent: () => import('./features/landlord-portal/landlord-home.page').then(m => m.LandlordHomePage),
        },
        {
          path: 'properties', loadComponent: () => import('./features/landlord-portal/landlord-properties.page').then(m => m.LandlordPropertiesPage),
        },
        {
          path: 'tenants', loadComponent: () => import('./features/landlord-portal/landlord-tenant.page').then(m => m.LandlordTenantPage),
        },
        {
          path: 'inspections', loadComponent: () => import('./features/landlord-portal/landlord-inspection.page').then(m => m.LandlordInspectionPage),
        },
        { 
          path: 'reporting', loadComponent: () => import('./features/landlord-portal/landlord-report.page').then(m => m.LandlordReportPage),

        },
        {
          path: 'settings', loadComponent: () => import('./features/landlord-portal/landlord-setting.page').then(m => m.LandlordSettingPage),
        },

    ],
  },

  // Tenant
  {
    path: 'tenant',
    canActivate: [OrgRoleGuard],
    data: { roles: ['tenant', 'super_admin'] },
    loadComponent: () => import('./features/tenant-portal/tenant-shell').then(m => m.TenantShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'homePage' },
      { path: 'homePage', loadComponent: () => import('./features/tenant-portal/tenant-home.page').then(m => m.TenantHomePage) },
      { path: 'profile', loadComponent: () => import('./features/tenant-portal/tenant-profile.page').then(m => m.TenantProfilePage) },
      { path: 'payments', loadComponent: () => import('./features/tenant-portal/tenant-payment.page').then(m => m.TenantPaymentPage) },
      { path: 'maintenance', loadComponent: () => import('./features/tenant-portal/tenant-maintenance.page').then(m => m.TenantMaintenancePage) },
      { path: 'documents', loadComponent: () => import('./features/tenant-portal/tenant-document.page').then(m => m.TenantDocumentPage) },
    ],
  },

  // Protected app shell (org members only)
  {
    path: '',
    canActivate: [AuthGuard, OrgMemberGuard],
    canActivateChild: [RoleAccessGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage) },
      { path: 'organization-members', data: { roles: [...PLATFORM_ADMIN_ROLES, 'broker'] }, loadComponent: () => import('./features/admin/members/organization-members.page').then(m => m.OrganizationMembersPage) },
      { path: 'property-assignments', data: { roles: [...PLATFORM_ADMIN_ROLES, 'broker'] }, loadComponent: () => import('./features/admin/members/property-assignments.page').then(m => m.PropertyAssignmentsPage) },
      { path: 'pending-invitations', data: { roles: [...PLATFORM_ADMIN_ROLES, 'broker'] }, loadComponent: () => import('./features/admin/members/pending-invitations.page').then(m => m.PendingInvitationsPage) },

      // Real-estate business modules
      { path: 'agencies', data: { roles: ['super_admin'] }, loadComponent: () => import('./features/agencies/agencies.page').then(m => m.AgenciesPage) },
      { path: 'agents', data: { roles: [...PLATFORM_ADMIN_ROLES, 'broker'] }, loadComponent: () => import('./features/agents/agents.page').then(m => m.AgentsPage) },
      { path: 'clients', data: { roles: [...SALES_ROLES, 'admin', 'manager'] }, loadComponent: () => import('./features/clients/clients.page').then(m => m.ClientsPage) },

      // Listings
      { path: 'listings', data: { roles: [...SALES_ROLES, 'seller', 'buyer'] }, loadComponent: () => import('./features/listings/listings.list.page').then(m => m.ListingsListPage) },
      { path: 'listings/new', data: { roles: [...SALES_ROLES] }, loadComponent: () => import('./features/listings/listing.form.page').then(m => m.ListingFormPage) },
      { path: 'listings/:id', data: { roles: [...SALES_ROLES, 'seller', 'buyer'] }, loadComponent: () => import('./features/listings/listing.detail.page').then(m => m.ListingDetailPage) },
      { path: 'listings/:id/edit', data: { roles: [...SALES_ROLES] }, loadComponent: () => import('./features/listings/listing.form.page').then(m => m.ListingFormPage) },

      // CRM / Sales pipeline
      { path: 'leads', data: { roles: [...SALES_ROLES] }, loadComponent: () => import('./features/leads/leads.page').then(m => m.LeadsPage) },
      { path: 'showings', data: { roles: [...SALES_ROLES, 'seller', 'buyer'] }, loadComponent: () => import('./features/showings/showings.page').then(m => m.ShowingsPage) },
      { path: 'offers', data: { roles: [...SALES_ROLES, 'seller', 'buyer'] }, loadComponent: () => import('./features/offers/offers.page').then(m => m.OffersPage) },
      { path: 'transactions', data: { roles: [...SALES_ROLES, 'seller', 'buyer'] }, loadComponent: () => import('./features/transactions/transactions.page').then(m => m.TransactionsPage) },
      { path: 'commissions', data: { roles: [...SALES_ROLES, 'agency_admin', 'admin', 'manager'] }, loadComponent: () => import('./features/commissions/commissions.page').then(m => m.CommissionsPage) },

      // Properties
      { path: 'properties', data: { roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] }, loadComponent: () => import('./features/properties/properties.list.page').then(m => m.PropertiesListPage) },
      { path: 'properties/new', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/properties/property.form.page').then(m => m.PropertyFormPage) },
      { path: 'properties/:propertyId', data: { roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] }, loadComponent: () => import('./features/properties/property.detail.page').then(m => m.PropertyDetailPage) },
      { path: 'properties/:propertyId/edit', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/properties/property.form.page').then(m => m.PropertyFormPage) },
      { path: 'properties/:id', data: { roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] }, loadComponent: () => import('./features/properties/property.detail.page').then(m => m.PropertyDetailPage) },
      { path: 'properties/:id/edit', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/properties/property.form.page').then(m => m.PropertyFormPage) },

      // Units
      { path: 'units', data: { roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] }, loadComponent: () => import('./features/units/units.page').then(m => m.UnitsPage) },

      // Inspections
      { path: 'properties/:propertyId/inspections', data: { roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] }, loadComponent: () => import('./features/inspections/inspections.list.page').then(m => m.InspectionsListPage) },
      { path: 'properties/:propertyId/inspections/new', data: { roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] }, loadComponent: () => import('./features/inspections/inspection.form.page').then(m => m.InspectionFormPage) },
      { path: 'properties/:propertyId/inspections/:inspectionId', data: { roles: [...LANDLORD_ROLES, 'maintenance', 'vendor', 'staff'] }, loadComponent: () => import('./features/inspections/inspection.detail.page').then(m => m.InspectionDetailPage) },

      // Findings
      { path: 'properties/:propertyId/inspections/:inspectionId/findings/new', data: { roles: [...MAINTENANCE_ROLES] }, loadComponent: () => import('./features/findings/finding-form.page').then(m => m.FindingFormPage) },
      { path: 'properties/:propertyId/inspections/:inspectionId/findings/:findingId', data: { roles: [...MAINTENANCE_ROLES, 'landlord'] }, loadComponent: () => import('./features/findings/finding-details.page').then(m => m.FindingDetailsPage) },

      // Leases
      { path: 'leases', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/leases/leases.overview.page').then(m => m.LeasesOverviewPage) },
      { path: 'properties/:propertyId/leases', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/leases/leases.list.page').then(m => m.LeasesListPage) },
      { path: 'properties/:propertyId/leases/new', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/leases/lease.form.page').then(m => m.LeaseFormPage) },
      { path: 'properties/:propertyId/leases/:leaseId/edit', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/leases/lease.form.page').then(m => m.LeaseFormPage) },
      { path: 'properties/:propertyId/leases/:leaseId', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/leases/lease.detail.page').then(m => m.LeaseDetailPage) },

      // Tenants
      { path: 'tenants', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/tenants/tenants.list.page').then(m => m.TenantsListPage) },
      { path: 'tenants/new', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/tenants/tenant.form.page').then(m => m.TenantFormPage) },
      { path: 'tenants/:tenantId', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/tenants/tenant.detail.page').then(m => m.TenantDetailPage) },
      { path: 'tenants/:tenantId/edit', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/tenants/tenant.form.page').then(m => m.TenantFormPage) },

      // Payments
      { path: 'payments', data: { roles: [...LANDLORD_ROLES] }, loadComponent: () => import('./features/payments/payments.list.page').then(m => m.PaymentsListPage) },
      {
        path: 'properties/:propertyId/leases/:leaseId/payments/new',
        data: { roles: [...LANDLORD_ROLES] },
        loadComponent: () => import('./features/payments/add-payment.page').then(m => m.AddPaymentPage),
      },

      // Maintenance / Documents / Reports
      { path: 'maintenance', data: { roles: [...MAINTENANCE_ROLES, 'landlord'] }, loadComponent: () => import('./features/maintenance/maintenance.page').then(m => m.MaintenancePage) },
      { path: 'documents', data: { roles: [...LANDLORD_ROLES, ...SALES_ROLES, 'vendor', 'staff', 'maintenance'] }, loadComponent: () => import('./features/documents/documents.page').then(m => m.DocumentsPage) },
      { path: 'reports', data: { roles: [...PLATFORM_ADMIN_ROLES, 'broker', 'landlord'] }, loadComponent: () => import('./features/reports/reports.builder.page').then(m => m.ReportsBuilderPage) },

      // Profile / settings
      { path: 'profile', data: { roles: ['super_admin', 'agency_admin', 'broker', 'agent', 'admin', 'manager', 'staff', 'landlord', 'tenant', 'buyer', 'seller', 'vendor', 'maintenance'] }, loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage) },
      { path: 'settings', data: { roles: [...PLATFORM_ADMIN_ROLES, 'broker', 'landlord'] }, loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPage) },

      // Admin branding
      {
        path: 'admin/branding',
        canActivate: [OrgRoleGuard],
        data: { roles: ['admin', 'manager'] },
        loadComponent: () => import('./features/admin/branding/admin-branding.page').then(m => m.AdminBrandingPage),
      },

      // Compatibility aliases to avoid breaking existing bookmarks
      { path: 'admin', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'admin/dashboard', redirectTo: 'dashboard' },
      { path: 'admin/properties', redirectTo: 'properties' },
      { path: 'admin/tenants', redirectTo: 'tenants' },
      { path: 'admin/leases', redirectTo: 'leases' },
      { path: 'admin/payments', redirectTo: 'payments' },
      { path: 'agency/dashboard', redirectTo: 'dashboard' },
      { path: 'agent/dashboard', redirectTo: 'dashboard' },
      { path: 'client/dashboard', redirectTo: 'dashboard' },
      { path: 'vendor/dashboard', redirectTo: 'dashboard' },
      { path: 'maintenance/dashboard', redirectTo: 'maintenance' },
      { path: 'tenant/dashboard', redirectTo: '/tenant/homePage' },
    ]
  },

  { path: '**', redirectTo: 'login' },
];
