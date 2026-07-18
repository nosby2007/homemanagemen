import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { Firestore, collection, doc, getDoc, getDocs, limit, query, where } from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { from, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { OrgContextService } from './org-context.service';

@Injectable({ providedIn: 'root' })
export class OrgRoleGuard implements CanActivate {
  private fs = inject(Firestore);
  private router = inject(Router);
  private org = inject(OrgContextService);
  private auth = inject(Auth);

  canActivate(route: ActivatedRouteSnapshot) {
    const allowRoles = (route.data?.['roles'] as string[] | undefined) ?? ['admin'];

    // authState() waits for Firebase to FULLY restore the session after a browser refresh.
    // Using this.auth.currentUser directly is synchronous and returns null during that window.
    return authState(this.auth).pipe(
      take(1),
      switchMap((user) => {
        if (!user) {
          this.router.navigateByUrl('/login');
          return of(false);
        }
        const uid = user.uid;

        return this.org.orgId$.pipe(
          take(1),
          switchMap((orgId) => from(this.org.ensureOrgId()).pipe(
            switchMap((resolvedOrgId) => {
              const effectiveOrgId = (orgId || resolvedOrgId || '').trim();
              if (!effectiveOrgId) {
                this.router.navigateByUrl('/super-admin');
                return of(false);
              }

              const ref = doc(this.fs, `orgs/${effectiveOrgId}/members/${uid}`);
            return from(getDoc(ref)).pipe(
              switchMap(async (snap) => {
                let role = (snap.exists() ? (snap.data() as any)?.role : null) as string | null;
                if (!role) {
                  const q = query(
                    collection(this.fs, 'organizationMembers'),
                    where('orgId', '==', effectiveOrgId),
                    where('userId', '==', uid),
                    where('status', '==', 'active'),
                    limit(1),
                  );
                  const topMembership = await getDocs(q);
                  if (!topMembership.empty) {
                    role = String((topMembership.docs[0].data() as any)?.['role'] || '');
                  }
                }

                const ok = role === 'super_admin' || (!!role && allowRoles.includes(role));
                if (!ok) {
                  const back = role === 'tenant' ? '/tenant' : role === 'landlord' ? '/landlord' : '/dashboard';
                  this.router.navigate(['/forbidden'], { queryParams: { role: role ?? 'unknown', back } });
                }
                return ok;
              }),
            );
            })
          ))
        );
      }),
      catchError(() => {
        this.router.navigateByUrl('/login');
        return of(false);
      })
    );
  }
}
