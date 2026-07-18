import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, limit, orderBy, query, where } from '@angular/fire/firestore';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class MembershipService {
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  listForCurrentOrg(maxItems = 200) {
    const orgId = this.org.requireOrgId();
    const q = query(
      collection(this.fs, 'organizationMembers'),
      where('orgId', '==', orgId),
      orderBy('updatedAt', 'desc'),
      limit(maxItems),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  listActiveForCurrentOrg(maxItems = 200) {
    const orgId = this.org.requireOrgId();
    const q = query(
      collection(this.fs, 'organizationMembers'),
      where('orgId', '==', orgId),
      where('status', '==', 'active'),
      orderBy('updatedAt', 'desc'),
      limit(maxItems),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  listByOrg(orgId: string, maxItems = 200) {
    const q = query(
      collection(this.fs, 'organizationMembers'),
      where('orgId', '==', orgId),
      orderBy('updatedAt', 'desc'),
      limit(maxItems),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }

  listByProperty(orgId: string, propertyId: string, maxItems = 200) {
    const q = query(
      collection(this.fs, 'organizationMembers'),
      where('orgId', '==', orgId),
      where('propertyIds', 'array-contains', propertyId),
      orderBy('updatedAt', 'desc'),
      limit(maxItems),
    );
    return collectionData(q, { idField: 'id' }) as any;
  }
}
