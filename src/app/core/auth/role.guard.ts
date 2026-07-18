import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, getDocs, limit, query, where } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { OrgContextService } from '../org/org-context.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private router = inject(Router);
  private org = inject(OrgContextService);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const allowedRoles = (route.data?.['roles'] as string[] | undefined) ?? [];
    if (!allowedRoles.length) return of(true);

    return authState(this.auth).pipe(
      take(1),
      switchMap((user) => {
        if (!user) return of(this.router.parseUrl('/login'));

        return from(getDoc(doc(this.fs, `users/${user.uid}`))).pipe(
          switchMap((userSnap) => {
            const globalRole = userSnap.exists() ? String((userSnap.data() as any)?.globalRole || '') : '';
            if (globalRole === 'superadmin') return of(true);

            const orgId = this.org.orgId;
            if (!orgId) return of(this.router.parseUrl('/forbidden'));

            const q = query(
              collection(this.fs, 'organizationMembers'),
              where('orgId', '==', orgId),
              where('userId', '==', user.uid),
              where('status', '==', 'active'),
              limit(1),
            );

            return from(getDocs(q)).pipe(
              switchMap((memberSnap) => {
                if (memberSnap.empty) return of(this.router.parseUrl('/forbidden'));
                const role = String((memberSnap.docs[0].data() as any)?.['role'] || '');
                return of(allowedRoles.includes(role) ? true : this.router.parseUrl('/forbidden'));
              }),
            );
          }),
        );
      }),
    );
  }
}
