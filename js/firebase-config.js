// ============================================================
// DREXORA SCHOOL PORTAL — Firebase Configuration
// ============================================================

// Firebase is loaded via CDN scripts in each HTML page.
// This file initializes Firebase and exports shared services.

const firebaseConfig = {
  apiKey: "AIzaSyDwLT1mW-3ZPeFL-6HFDIWY8TdTVDa4b80",
  authDomain: "drexora-school.firebaseapp.com",
  databaseURL: "https://drexora-school-default-rtdb.firebaseio.com/",
  projectId: "drexora-school",
  storageBucket: "drexora-school.firebasestorage.app",
  messagingSenderId: "165649480886",
  appId: "1:165649480886:web:56a4d3ea7e6e65a3513a17",
  measurementId: "G-JWXJS171YQ"
};

// ---------------------------------------------------------------
// AUTHORISED DOMAINS
// Firebase Authentication only allows sign-in from domains that
// are listed in:
//   Firebase Console → Authentication → Settings → Authorised Domains
//
// If you add a custom domain (e.g. via GitHub Pages CNAME), you MUST
// also add it to that list, otherwise ALL login and registration calls
// will fail with auth/unauthorized-domain.
//
// Currently authorised (update this list when you add new domains):
//   - localhost
//   - drexora-school.firebaseapp.com
//   - advocate.drexxora.name.ng   ← MUST be added in Firebase Console
// ---------------------------------------------------------------
const _KNOWN_AUTH_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'drexora-school.firebaseapp.com',
  'drexora-school.web.app',
  'daviddchucks-hash.github.io',
  'advocate.drexxora.name.ng',
];

(function _warnIfDomainUnauthorised() {
  const host = window.location.hostname;
  const isKnown = _KNOWN_AUTH_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  if (!isKnown) {
    console.warn(
      '[Drexora] The current domain "' + host + '" may not be in the Firebase ' +
      'Authorised Domains list. Login and registration will fail with ' +
      'auth/unauthorized-domain until you add this domain at: ' +
      'Firebase Console → Authentication → Settings → Authorised Domains'
    );
  }
})();

// Initialize Firebase (compat SDK — available globally via CDN)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Shared service references
const auth = firebase.auth();
const db   = firebase.database();
const storage = firebase.storage();

// Optionally enable analytics when available
if (typeof firebase.analytics === 'function') {
  firebase.analytics();
}
