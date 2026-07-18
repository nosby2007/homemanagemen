// core/super-admin/super-admin.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SuperAdminGuard implements CanActivate {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      take(1),
      switchMap(user => {
        if (!user) return of(this.router.parseUrl('/login'));

        const ref = doc(this.fs, `users/${user.uid}`);
        return from(getDoc(ref)).pipe(
          map(snap => {
            const role = (snap.exists() ? (snap.data() as any)?.role : null);
            return role === 'super_admin' ? true : this.router.parseUrl('/dashboard');
          })
        );
      })
    );
  }
}
