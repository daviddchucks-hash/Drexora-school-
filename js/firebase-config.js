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
