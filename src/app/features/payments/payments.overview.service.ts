import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collectionGroup,
  collectionData,
  query,
  where,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { OrgContextService } from '../../core/org/org-context.service';

export interface PaymentLedgerRow {
  id: string;
  orgId: string;
  propertyId?: string;
  leaseId?: string;
  tenantId?: string;
  tenantUid?: string;
  amount?: number;
  dueDate?: number;
  paidAt?: number;
  status?: 'paid' | 'pending' | 'failed' | 'cancelled' | 'new';
  method?: string;
  reference?: string;
  createdAt?: number;
  updatedAt?: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentsOverviewService {
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  listLatest() {
    const orgId = this.org.requireOrgId();
    const cg = collectionGroup(this.fs, 'payments');
    const qRef = query(cg, where('orgId', '==', orgId), orderBy('updatedAt', 'desc'), limit(300));
    return collectionData(qRef, { idField: 'id' }) as any;
  }
}
