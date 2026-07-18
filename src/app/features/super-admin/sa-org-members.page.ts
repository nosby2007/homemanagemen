import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

type MemberRow = {
  uid: string;
  role: 'admin' | 'manager' | 'member';
  status: 'active' | 'inactive';
  email?: string;
};

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="top">
        <div>
          <div class="h1">Manage Members</div>
          <div class="sub">Org: <span class="mono">{{ orgId }}</span></div>
        </div>
        <button class="btn" (click)="reload()">Refresh</button>
      </div>

      <div class="panel">
        <div class="panel-title">Members</div>

        <div class="table">
          <div class="tr th">
            <div class="td">UID</div>
            <div class="td">Role</div>
            <div class="td">Status</div>
            <div class="td actions">Actions</div>
          </div>

          <div class="tr" *ngFor="let m of members">
            <div class="td mono">{{ m.uid }}</div>
            <div class="td">{{ m.role }}</div>
            <div class="td">{{ m.status }}</div>

            <div class="td actions">
              <button class="btn sm" (click)="setRole(m.uid,'member')">Member</button>
              <button class="btn sm" (click)="setRole(m.uid,'manager')">Manager</button>
              <button class="btn sm" (click)="setRole(m.uid,'admin')">Admin</button>

              <button class="btn sm danger" (click)="setStatus(m.uid,'inactive')">Deactivate</button>
              <button class="btn sm" (click)="setStatus(m.uid,'active')">Activate</button>
            </div>
          </div>

          <div class="empty" *ngIf="!members.length">No members found.</div>
        </div>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>
    </div>
  `,
  styles: [`
    .page{display:flex;flex-direction:column;gap:14px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
    .h1{font-size:22px;font-weight:900}
    .sub{opacity:.75;margin-top:4px}
    .mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
    .btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:#e5e7eb;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer}
    .btn:hover{background:rgba(255,255,255,.09)}
    .btn.sm{padding:8px 10px;border-radius:10px;font-size:12px}
    .btn.danger{border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.12)}
    .panel{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px}
    .panel-title{font-weight:900;margin-bottom:10px}
    .table{display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden}
    .tr{display:grid;grid-template-columns:1.6fr .6fr .6fr 2fr;gap:10px;align-items:center;padding:10px 12px;background:rgba(255,255,255,.02)}
    .tr + .tr{border-top:1px solid rgba(255,255,255,.06)}
    .th{background:rgba(255,255,255,.04);font-weight:800;font-size:12px;opacity:.9}
    .actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
    .empty{padding:12px;opacity:.75}
    .error{padding:10px 12px;border-radius:12px;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35)}
    @media (max-width: 1100px){
      .tr{grid-template-columns:1fr}
      .actions{justify-content:flex-start}
      .th{display:none}
    }
  `]
})
export class SaOrgMembersPage implements OnInit {
  private route = inject(ActivatedRoute);
  private fs = inject(Firestore);

  orgId = '';
  members: MemberRow[] = [];
  error = '';

  ngOnInit() {
    // ✅ important: react to route param changes (Angular reuse)
    this.route.paramMap.subscribe(pm => {
      this.orgId = (pm.get('orgId') || '').trim();
      this.reload();
    });
  }

  async reload() {
    this.error = '';
    this.members = [];
    try {
      if (!this.orgId) {
        this.error = 'Missing orgId in route.';
        return;
      }

      const colRef = collection(this.fs as any, `orgs/${this.orgId}/members`);
      // ✅ use createdAt (more likely to exist); stable + same as your other SA service
      const q = query(colRef as any, orderBy('createdAt', 'desc'), limit(200));
      const snap = await getDocs(q as any);

      this.members = snap.docs.map(d => {
        const data: any = d.data();
        return {
          uid: d.id,
          role: (data?.role || 'member'),
          status: (data?.status || 'inactive'),
          email: data?.email
        } as MemberRow;
      });
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to load members';
    }
  }

  async setRole(uid: string, role: MemberRow['role']) {
    this.error = '';
    try {
      await setDoc(doc(this.fs as any, `orgs/${this.orgId}/members/${uid}`) as any, {
        role,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await this.reload();
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to update role';
    }
  }

  async setStatus(uid: string, status: MemberRow['status']) {
    this.error = '';
    try {
      await setDoc(doc(this.fs as any, `orgs/${this.orgId}/members/${uid}`) as any, {
        status,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await this.reload();
    } catch (e: any) {
      this.error = e?.message ?? 'Failed to update status';
    }
  }
}
