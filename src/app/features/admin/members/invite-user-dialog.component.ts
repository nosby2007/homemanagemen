import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvitationService } from '../../../core/services/invitation.service';

@Component({
  standalone: true,
  selector: 'app-invite-user-dialog',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="overlay" *ngIf="open" (click)="close.emit()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <h3>Send invitation</h3>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form">
          <label>Email</label>
          <input formControlName="email" type="email" placeholder="user@company.com" />

          <label>Role</label>
          <select formControlName="role">
            <option value="agent">Agent</option>
            <option value="broker">Broker</option>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="vendor">Vendor</option>
            <option value="maintenance">Maintenance</option>
            <option value="client">Client</option>
            <option value="staff">Staff</option>
          </select>

          <label>Target type</label>
          <select formControlName="targetType">
            <option value="agent">Agent</option>
            <option value="landlord">Landlord</option>
            <option value="tenant">Tenant</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="vendor">Vendor</option>
            <option value="client">Client</option>
            <option value="staff">Staff</option>
          </select>

          <label>Target ID</label>
          <input formControlName="targetId" type="text" placeholder="Business profile ID" />

          <label>Property ID</label>
          <input formControlName="propertyId" type="text" placeholder="Required property scope" />

          <label>Unit ID (optional)</label>
          <input formControlName="unitId" type="text" placeholder="Only for unit-level access" />

          <div class="error" *ngIf="errorMessage">{{ errorMessage }}</div>
          <div class="ok" *ngIf="inviteUrl">Invite link: {{ inviteUrl }}</div>

          <div class="actions">
            <button type="button" class="btn" (click)="close.emit()">Cancel</button>
            <button type="submit" class="btn primary" [disabled]="submitting">{{ submitting ? 'Sending...' : 'Send invite' }}</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(2, 6, 23, .55); display: grid; place-items: center; }
    .dialog { width: min(520px, 96vw); background: #fff; border-radius: 14px; padding: 20px; }
    .form { display: grid; gap: 8px; }
    label { font-size: 13px; font-weight: 700; color: #334155; }
    input, select { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    .btn { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; cursor: pointer; background: #fff; }
    .btn.primary { background: #0ea5e9; border-color: #0284c7; color: #fff; }
    .error { color: #be123c; font-size: 12px; }
    .ok { color: #0f766e; font-size: 12px; word-break: break-all; }
  `],
})
export class InviteUserDialogComponent {
  @Input() open = false;
  @Input() orgId = '';
  @Output() close = new EventEmitter<void>();
  @Output() invited = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private invitations = inject(InvitationService);

  submitting = false;
  errorMessage = '';
  inviteUrl = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['agent', [Validators.required]],
    targetType: ['agent', [Validators.required]],
    targetId: ['', [Validators.required]],
    propertyId: ['', [Validators.required]],
    unitId: [''],
  });

  constructor() {
    this.form.get('targetType')?.valueChanges.subscribe((targetType) => {
      const unitCtrl = this.form.get('unitId');
      if (targetType === 'tenant') {
        unitCtrl?.setValidators([Validators.required]);
      } else {
        unitCtrl?.clearValidators();
      }
      unitCtrl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  async submit() {
    this.errorMessage = '';
    this.inviteUrl = '';

    if (!this.orgId) {
      this.errorMessage = 'Organization context is missing.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    try {
      this.submitting = true;
      const value = this.form.getRawValue();
      const unitId = String(value.unitId || '').trim();
      const targetType = String(value.targetType || '').trim();
      if (targetType === 'tenant' && !unitId) {
        this.errorMessage = 'Unit ID is required for tenant invitations.';
        return;
      }

      const result = await this.invitations.createInvitation({
        orgId: this.orgId,
        propertyId: String(value.propertyId || '').trim(),
        unitId: unitId || undefined,
        email: String(value.email || ''),
        role: String(value.role || ''),
        targetType,
        targetId: String(value.targetId || '').trim(),
      });
      this.inviteUrl = result.inviteUrl;
      this.invited.emit();
    } catch (e: any) {
      this.errorMessage = e?.message || 'Unable to create invitation.';
    } finally {
      this.submitting = false;
    }
  }
}
