import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, of, switchMap, map } from 'rxjs';
import { OrgContextService } from './org-context.service';

export interface OrgMemberProfile {
  role?: string;
  createdAt?: number;
  updatedAt?: number;
}

@Injectable({ providedIn: 'root' })
export class OrgMemberService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);

  member$(): Observable<OrgMemberProfile | null> {
    return authState(this.auth).pipe(
      switchMap((u) => {
        if (!u) return of(null);
        let orgId: string;
        try { orgId = this.org.orgId; } catch { return of(null); }
        const refDoc = doc(this.fs, `orgs/${orgId}/members/${u.uid}`);
        return docData(refDoc).pipe(map(d => (d as OrgMemberProfile) ?? null));
      })
    );
  }

  role$(): Observable<string | null> {
    return this.member$().pipe(map(m => (m?.role ? String(m.role) : null)));
  }
}
