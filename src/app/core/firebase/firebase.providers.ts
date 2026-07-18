import { EnvironmentProviders, importProvidersFrom } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';
import { connectFunctionsEmulator } from 'firebase/functions';
import { environment } from '../../../environments/environment';

export function provideFirebase(): EnvironmentProviders {
  return importProvidersFrom(
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
        const { host, port } = environment.emulators.auth;
        connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
      }
      return auth;
    }),

    provideFirestore(() => {
      const fs = getFirestore();
      if (environment.useEmulators) {
        const { host, port } = environment.emulators.firestore;
        connectFirestoreEmulator(fs, host, port);
      }
      return fs;
    }),

    provideStorage(() => {
      const st = getStorage();
      if (environment.useEmulators) {
        const { host, port } = environment.emulators.storage;
        connectStorageEmulator(st, host, port);
      }
      return st;
    }),

    provideFunctions(() => {
      const fn = getFunctions();
      if (environment.useEmulators) {
        const { host, port } = environment.emulators.functions;
        connectFunctionsEmulator(fn, host, port);
      }
      return fn;
    })
  );
}
