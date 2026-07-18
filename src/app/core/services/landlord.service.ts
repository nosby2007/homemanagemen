import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, arrayUnion, doc, setDoc, updateDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class LandlordService {
  private fs = inject(Firestore);
  private auth = inject(Auth);

  private requireUid() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
  }

  async createLandlordForProperty(orgId: string, propertyId: string, data: { fullName: string; email: string; phone?: string }) {
    const uid = this.requireUid();
    const id = crypto.randomUUID();
    const now = Date.now();
    const payload = {
      id,
      orgId,
      userId: null,
      fullName: data.fullName,
      email: String(data.email || '').trim().toLowerCase(),
      phone: String(data.phone || ''),
      propertyIds: [propertyId],
      authStatus: 'not_invited',
      invitationId: null,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(this.fs, `landlords/${id}`), payload, { merge: true });
    await setDoc(doc(this.fs, `orgs/${orgId}/landlords/${id}`), payload, { merge: true });
    return id;
  }

  async assignLandlordToProperty(landlordId: string, propertyId: string) {
    const now = Date.now();
    await updateDoc(doc(this.fs, `landlords/${landlordId}`), {
      propertyIds: arrayUnion(propertyId),
      updatedAt: now,
    } as any);
  }
}
