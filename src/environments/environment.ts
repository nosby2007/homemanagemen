export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyCB9kYRyYXwf76_chl6y5zy0GOyl597nDo",
  authDomain: "management-eb9fc.firebaseapp.com",
  projectId: "management-eb9fc",
  storageBucket: "management-eb9fc.firebasestorage.app",
  messagingSenderId: "81249591279",
  appId: "1:81249591279:web:4e12760688bc2749a4601a"
  },
  useEmulators: false,
  emulators: {
    auth: { host: 'localhost', port: 9099 },
    firestore: { host: 'localhost', port: 8080 },
    storage: { host: 'localhost', port: 9199 },
    functions: { host: 'localhost', port: 5001 }
  }
};
