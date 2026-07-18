import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, limit, query, where } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class LeaseService {
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  getLeaseByTenantAndUnit(tenantId: string, unitId: string) {
    const orgId = this.org.requireOrgId();
    const q = query(
      collection(this.fs, 'leases'),
      where('orgId', '==', orgId),
      where('tenantId', '==', tenantId),
      where('unitId', '==', unitId),
      where('status', '==', 'active'),
      limit(1),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }
}
