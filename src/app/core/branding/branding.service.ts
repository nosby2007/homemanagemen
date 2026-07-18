import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData, setDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { map, Observable, of, switchMap } from 'rxjs';
import { OrgContextService } from '../org/org-context.service';

export interface OrgBrandingSettings {
  logoPath?: string;
  logoUrl?: string;
  orgName?: string;
  tagline?: string;
  updatedAt?: number;
  updatedBy?: string;
}

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private fs = inject(Firestore);
  private storage = inject(Storage);
  private auth = inject(Auth);
  private org = inject(OrgContextService);

  /** Firestore: orgs/{orgId}/branding/settings */
  settings$(): Observable<OrgBrandingSettings | null> {
    let orgId: string;
    try { orgId = this.org.orgId; } catch { return of(null); }
    const refDoc = doc(this.fs, `orgs/${orgId}/branding/settings`);
    return docData(refDoc).pipe(map(d => (d as OrgBrandingSettings) ?? null));
  }

  /** Convenience: logo url observable with fallback */
  logoUrl$(fallbackUrl: string): Observable<string> {
    return this.settings$().pipe(
      map(s => (s?.logoUrl && String(s.logoUrl).trim()) ? String(s.logoUrl) : fallbackUrl)
    );
  }

  /** Upload org logo to Storage and persist settings doc with logoUrl */
  async uploadOrgLogo(file: File): Promise<OrgBrandingSettings> {
    const orgId = this.org.orgId;
    const uid = this.auth.currentUser?.uid ?? 'system';

    // Force a predictable path used by PDF generation
    const storagePath = `orgs/${orgId}/branding/logo.png`;
    const storageRef = ref(this.storage, storagePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/png',
      cacheControl: 'public,max-age=86400',
      customMetadata: { orgId }
    });

    const logoUrl = await getDownloadURL(storageRef);
    const settings: OrgBrandingSettings = {
      logoPath: storagePath,
      logoUrl,
      updatedAt: Date.now(),
      updatedBy: uid,
    };

    const settingsRef = doc(this.fs, `orgs/${orgId}/branding/settings`);
    await setDoc(settingsRef, settings, { merge: true });

    return settings;
  }

  async updateBranding(patch: Partial<OrgBrandingSettings>): Promise<void> {
    const orgId = this.org.orgId;
    const uid = this.auth.currentUser?.uid ?? 'system';
    const settingsRef = doc(this.fs, `orgs/${orgId}/branding/settings`);
    await setDoc(settingsRef, { ...patch, updatedAt: Date.now(), updatedBy: uid } as any, { merge: true });
  }
}
