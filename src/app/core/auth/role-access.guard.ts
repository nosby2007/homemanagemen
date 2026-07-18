import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, getDocs, limit, query, where } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { OrgContextService } from '../org/org-context.service';
import { AppRole } from './auth.service';
import { hasRole, roleHomePath } from './rbac';

@Injectable({ providedIn: 'root' })
export class RoleAccessGuard implements CanActivate, CanActivateChild {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private org = inject(OrgContextService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.check(route);
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.check(childRoute);
  }

  private check(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const allowed = (route.data?.['roles'] as AppRole[] | undefined) ?? [];
    if (!allowed.length) return of(true);

    return authState(this.auth).pipe(
      take(1),
      switchMap((user) => {
        if (!user) return of(this.router.parseUrl('/login'));

        const userRef = doc(this.fs, `users/${user.uid}`);
        return from(getDoc(userRef)).pipe(
          switchMap((userSnap) => {
            const userData = userSnap.exists() ? (userSnap.data() as any) : {};
            const globalRole = (userData?.role ?? null) as AppRole | null;
            const globalScope = String(userData?.globalRole || '');
            if (globalScope === 'superadmin') return of(true);
            if (hasRole(globalRole, allowed)) return of(true);

            const orgId = this.org.orgId || '';
            const resolveOrgId = async () => {
              if (orgId.trim()) return orgId.trim();
              return this.org.ensureOrgId();
            };

            return from(resolveOrgId()).pipe(
              switchMap((effectiveOrgId) => {
                if (!effectiveOrgId) {
                  return of(this.router.parseUrl('/super-admin'));
                }

                const memberRef = doc(this.fs, `orgs/${effectiveOrgId}/members/${user.uid}`);
                return from(getDoc(memberRef)).pipe(
                  switchMap(async (memberSnap) => {
                    let memberRole = (memberSnap.exists() ? (memberSnap.data() as any)?.role : null) as AppRole | null;

                    if (!memberRole) {
                      const q = query(
                        collection(this.fs, 'organizationMembers'),
                        where('orgId', '==', effectiveOrgId),
                        where('userId', '==', user.uid),
                        where('status', '==', 'active'),
                        limit(1),
                      );
                      const topMembership = await getDocs(q);
                      if (!topMembership.empty) {
                        memberRole = String((topMembership.docs[0].data() as any)?.['role'] || '') as AppRole;
                      }
                    }

                    if (hasRole(memberRole, allowed)) return true;

                    return this.router.createUrlTree(['/forbidden'], {
                      queryParams: {
                        role: memberRole ?? globalRole ?? 'unknown',
                        back: roleHomePath(memberRole ?? globalRole),
                      },
                    });
                  }),
                );
              }),
            );
          }),
        );
      }),
      catchError(() => of(this.router.parseUrl('/forbidden'))),
    );
  }
}
