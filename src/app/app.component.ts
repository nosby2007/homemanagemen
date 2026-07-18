import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { filter } from 'rxjs/operators';
import { OrgContextService } from './core/org/org-context.service';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<router-outlet />`,
})
export class AppComponent {
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  constructor() {
    authState(this.auth)
      .pipe(filter(u => u !== undefined as any))
      .subscribe(async (user) => {
        if (user) {
          // recharge orgId depuis users/{uid}.lastOrgId
          await this.org.initFromUserProfile();
        }
      });
  }
}
