// org-member.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, getDocs, limit, query, where } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { OrgContextService } from './org-context.service';

@Injectable({ providedIn: 'root' })
export class OrgMemberGuard implements CanActivate {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);
  private router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    // ✅ WAIT for Firebase auth to be ready (critical on mobile)
    return authState(this.auth).pipe(
      take(1),
      switchMap((user) => {
        if (!user) return of(this.router.parseUrl('/login'));
        const uid = user.uid;

        return this.org.orgId$.pipe(
          take(1),
          switchMap((orgIdRaw) => {
            const orgId = (orgIdRaw || '').trim();

            const resolveOrg = async () => {
              if (orgId) return orgId;
              return this.org.ensureOrgId();
            };

            // ✅ Org not selected yet → redirect to org selection / super-admin
            return from(resolveOrg()).pipe(
              switchMap((resolvedOrgId) => {
                if (!resolvedOrgId) {
                  return of(this.router.parseUrl('/super-admin'));
                }

                const ref = doc(this.fs, `orgs/${resolvedOrgId}/members/${uid}`);
                return from(getDoc(ref)).pipe(
                  switchMap(async (snap) => {
                    let role = '';
                    let active = false;

                    if (snap.exists()) {
                      const data: any = snap.data();
                      active = data?.status === 'active' || data?.active === true || data?.active === 'true';
                      role = String(data?.role || '');
                    } else {
                      const q = query(
                        collection(this.fs, 'organizationMembers'),
                        where('orgId', '==', resolvedOrgId),
                        where('userId', '==', uid),
                        where('status', '==', 'active'),
                        limit(1),
                      );
                      const topMembership = await getDocs(q);
                      if (!topMembership.empty) {
                        active = true;
                        role = String((topMembership.docs[0].data() as any)?.['role'] || '');
                      }
                    }

                    if (!active) return this.router.parseUrl('/super-admin');
                    if (role === 'tenant') return this.router.parseUrl('/tenant');
                    if (role === 'landlord') return this.router.parseUrl('/landlord');
                    return true;
                  }),
                );
              }),
            );
          })
        );
      })
    );
  }
}
