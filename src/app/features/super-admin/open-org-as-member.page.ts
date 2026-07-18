import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap">
      <div class="card">
        <div class="h1">Opening organization…</div>
        <div class="sub">Switching context to <span class="mono">{{ orgId }}</span></div>
        <div class="hint" *ngIf="!error">Please wait.</div>
        <div class="error" *ngIf="error">{{ error }}</div>
        <button class="btn" *ngIf="error" (click)="goBack()">Back</button>
      </div>
    </div>
  `,
  styles: [`
    .wrap{min-height:70vh;display:flex;align-items:center;justify-content:center;padding:18px}
    .card{width:min(560px,100%);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px}
    .h1{font-weight:900;font-size:18px}
    .sub{opacity:.8;margin-top:6px}
    .hint{opacity:.7;margin-top:10px}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
    .error{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35)}
    .btn{margin-top:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:#e5e7eb;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer}
  `]
})
export class OpenOrgAsMemberPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private fs = inject(Firestore);

  orgId = '';
  error = '';

  constructor() {
    this.run();
  }

  async run() {
    this.error = '';
    try {
      const orgId = (this.route.snapshot.paramMap.get('orgId') || '').trim();
      this.orgId = orgId;
      if (!orgId) throw new Error('Missing orgId');

      const uid = this.auth.currentUser?.uid;
      if (!uid) throw new Error('Not authenticated');

      // 1) switch context
      await setDoc(doc(this.fs as any, `users/${uid}`) as any, {
        lastOrgId: orgId,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2) ensure membership exists (so OrgMemberGuard passes)
      await setDoc(doc(this.fs as any, `orgs/${orgId}/members/${uid}`) as any, {
        uid,
        orgId,
        role: 'admin',      // or 'manager' if you prefer
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 3) go to the normal org app
      await this.router.navigateByUrl('/dashboard');
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to open organization';
    }
  }

  goBack() {
    this.router.navigateByUrl('/super-admin');
  }
}
