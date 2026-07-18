import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, collectionData, doc, docData, query, where } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { OrgContextService } from '../org/org-context.service';
import { PropertyService } from './property.service';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private fn = inject(Functions);
  private orgContext = inject(OrgContextService);
  private properties = inject(PropertyService);

  listMyMemberships() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return of([] as any[]);
    const q = query(collection(this.fs, 'organizationMembers'), where('userId', '==', uid), where('status', '==', 'active'));
    return collectionData(q, { idField: 'id' }) as any;
  }

  listMyOrganizations() {
    return this.listMyMemberships().pipe(
      switchMap((rows: any[]) => {
        if (!rows.length) return of([] as any[]);
        const docs$ = rows.map((row) =>
          docData(doc(this.fs, `organizations/${row.orgId}`), { idField: 'id' }).pipe(
            map((org: any) => ({ ...org, id: row.orgId, membershipRole: row.role })),
          ),
        );
        return docs$.length ? combineLatest(docs$) : of([] as any[]);
      }),
    );
  }

  getOrganization(orgId: string) {
    return docData(doc(this.fs, `organizations/${orgId}`), { idField: 'id' }) as any;
  }

  async switchOrganization(orgId: string) {
    const call = httpsCallable(this.fn, 'switchOrganization');
    const result: any = await call({ orgId });
    this.orgContext.setOrgId(orgId);
    return result?.data as { orgId: string; role: string; redirect: string };
  }

  createProperty(orgId: string, data: any) {
    return this.properties.createProperty(orgId, data);
  }

  getPropertiesByOrg(orgId: string) {
    return this.properties.getPropertiesByOrg(orgId);
  }

  getPropertyById(propertyId: string) {
    return this.properties.getPropertyById(propertyId);
  }
}
