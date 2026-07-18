export type SaOrgRow = {
  id: string;
  name?: string;
  createdAt?: any;
};

export type SaBranding = {
  orgId: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt?: any;
  updatedAt?: any;
};
