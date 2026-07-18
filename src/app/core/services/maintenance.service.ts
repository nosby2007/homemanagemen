import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, limit, orderBy, query, where } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class MaintenanceScopedService {
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  getMaintenanceByTenantProperty(tenantId: string, propertyId: string, unitId?: string) {
    const orgId = this.org.requireOrgId();
    const constraints: any[] = [
      where('orgId', '==', orgId),
      where('propertyId', '==', propertyId),
      where('tenantId', '==', tenantId),
      orderBy('updatedAt', 'desc'),
      limit(200),
    ];
    if (unitId) constraints.splice(3, 0, where('unitId', '==', unitId));
    const q = query(collection(this.fs, 'maintenanceRequests'), ...(constraints as []));
    return collectionData(q, { idField: 'id' }) as any;
  }
}
