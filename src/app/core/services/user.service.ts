import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { AppUser } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private auth = inject(Auth);
  private fs = inject(Firestore);

  /** Stream the profile of the currently authenticated user */
  getCurrentUserProfile(): Observable<AppUser | undefined> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return docData(doc(this.fs, `users/${uid}`), { idField: 'uid' }) as Observable<AppUser | undefined>;
  }

  /** Get any user's profile by UID */
  getUserProfile(uid: string): Observable<AppUser | undefined> {
    return docData(doc(this.fs, `users/${uid}`), { idField: 'uid' }) as Observable<AppUser | undefined>;
  }

  /** Update the current user's profile fields */
  async updateCurrentUserProfile(patch: Partial<Omit<AppUser, 'uid' | 'role' | 'createdAt'>>): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    await updateDoc(doc(this.fs, `users/${uid}`), {
      ...patch,
      updatedAt: serverTimestamp(),
    } as any);
  }
}
