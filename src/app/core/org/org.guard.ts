import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, getDocs, limit, query, where } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { OrgContextService } from './org-context.service';

@Injectable({ providedIn: 'root' })
export class OrgGuard implements CanActivate {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private router = inject(Router);
  private org = inject(OrgContextService);

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      take(1),
      switchMap((user) => {
        if (!user) return of(this.router.parseUrl('/login'));
        const orgId = this.org.orgId;
        if (!orgId) return of(this.router.parseUrl('/super-admin'));

        const q = query(
          collection(this.fs, 'organizationMembers'),
          where('orgId', '==', orgId),
          where('userId', '==', user.uid),
          where('status', '==', 'active'),
          limit(1),
        );

        return from(getDocs(q)).pipe(
          switchMap((snap) => {
            if (!snap.empty) return of(true);
            return of(this.router.parseUrl('/forbidden'));
          }),
        );
      }),
    );
  }
}
