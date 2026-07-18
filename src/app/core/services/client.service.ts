import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private fn = inject(Functions);
  private org = inject(OrgContextService);

  async createProfile(input: {
    clientType: 'buyer' | 'seller' | 'landlord' | 'tenant' | 'investor';
    fullName: string;
    email: string;
    phone?: string;
    assignedAgentId?: string;
  }) {
    const call = httpsCallable(this.fn, 'createBusinessProfile');
    const orgId = this.org.requireOrgId();
    const result: any = await call({ orgId, targetType: 'client', profile: input });
    return result?.data as { id: string; authStatus: 'not_invited' };
  }
}
