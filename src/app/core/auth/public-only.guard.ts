import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PublicOnlyGuard implements CanActivate {
  private auth = inject(Auth);
  private router = inject(Router);
  private authService = inject(AuthService);

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      take(1),
      switchMap((user) => {
        if (!user) return of(true);
        return from(this.authService.resolvePostLoginRoute(user.uid)).pipe(
          map((route) => this.router.parseUrl(route)),
          catchError(() => of(this.router.parseUrl('/dashboard')))
        );
      })
    );
  }
}
