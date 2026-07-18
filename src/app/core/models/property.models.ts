export type PropertyStatus = 'available' | 'occupied' | 'maintenance' | 'listed_for_sale' | 'listed_for_rent' | 'archived';

export type PropertyType = 'single_family' | 'multi_family' | 'apartment_complex' | 'condo' | 'townhouse' | 'commercial' | 'mixed_use' | 'land' | 'other';

export type UnitType = 'studio' | 'apartment' | 'penthouse' | 'loft';

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface Unit {
  unitNumber: string;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  monthlyRent?: number;
  securityDeposit?: number;
  status?: PropertyStatus;
  furnished?: boolean;
  unitType?: UnitType;
  notes?: string;
}

export interface Property {
  id: string;
  orgId: string;

  name?: string;
  type?: PropertyType;
  status?: PropertyStatus;

  furnished?: boolean;
  beds?: number;
  baths?: number;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;


  askingPrice?: number;
  monthlyRent?: number;
  securityDeposit?: number;

  address?: Address;
  
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
  
  hasMultipleUnits?: boolean;
  units?: Unit[];
  
  description?: string;
  notes?: string;

  owner?: string;
  manager?: string;
  contactPhone?: string;
  contactEmail?: string;

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: Address;
}

export interface SpouseInfo {
  name: string;
  email?: string;
  phone?: string;
  ssn?: string; // encrypted
}

export interface Tenant {
  id: string;
  orgId: string;
  
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ssn?: string; // encrypted
  dateOfBirth?: number;
  
  // Current Address
  currentAddress?: Address;
  
  // Spouse Information
  spouse?: SpouseInfo;
  
  // Emergency Contact
  emergencyContact?: EmergencyContact;
  
  // Employment Information
  employer?: string;
  jobTitle?: string;
  employmentStartDate?: number;
  annualIncome?: number;
  employerPhone?: string;
  
  // Additional Qualification Info
  creditScore?: number;
  hasPets?: boolean;
  petDetails?: string;
  numberOfOccupants?: number;
  vehicleCount?: number;
  
  // References
  previousLandlordName?: string;
  previousLandlordPhone?: string;
  previousLandlordEmail?: string;
  
  // Status
  status?: 'prospect' | 'applicant' | 'approved' | 'active' | 'former';
  notes?: string;
  
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

export interface Lease {
  id: string;
  propertyId: string;
  unitNumber?: string;
  tenantId: string;
  startDate: number;
  endDate: number;
  monthlyRent: number;
  securityDeposit: number;
  status: 'active' | 'pending' | 'expired' | 'terminated';
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}
