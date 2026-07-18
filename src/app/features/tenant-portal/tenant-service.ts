import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, query, where } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface Tenant {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  leaseStart?: Date;
  leaseEnd?: Date;
  status?: string;
  unitNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  
  constructor(private firestore: Firestore) {}

  // Get all tenants for a specific property
  getTenants(orgId: string, propertyId: string): Observable<Tenant[]> {
    const tenantsRef = collection(
      this.firestore, 
      `orgs/${orgId}/properties/${propertyId}/tenants`
    );
    return collectionData(tenantsRef, { idField: 'id' }) as Observable<Tenant[]>;
  }

  // Get a single tenant by ID
  getTenant(orgId: string, propertyId: string, tenantId: string): Observable<Tenant> {
    const tenantRef = doc(
      this.firestore, 
      `orgs/${orgId}/properties/${propertyId}/tenants/${tenantId}`
    );
    return docData(tenantRef, { idField: 'id' }) as Observable<Tenant>;
  }
}
