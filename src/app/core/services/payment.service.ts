import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, limit, orderBy, query, where } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  getPaymentsByTenantAndProperty(tenantId: string, propertyId: string) {
    const orgId = this.org.requireOrgId();
    const q = query(
      collection(this.fs, 'payments'),
      where('orgId', '==', orgId),
      where('propertyId', '==', propertyId),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc'),
      limit(200),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }
}
