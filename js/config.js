// ============================================================
// DREXORA SCHOOL PORTAL — API Configuration
// ============================================================
//
// CLOUDINARY_UPLOAD_API_URL points to the backend endpoint that
// handles profile-photo uploads via Cloudinary.
//
// In development (Replit):  use the Replit dev-domain URL.
// In production (Firebase): replace this with your deployed
//   Replit/server URL, e.g.:
//   "https://your-project.replit.app/api/upload/profile-photo"
//
// The value intentionally falls back to the relative path so
// that it works out-of-the-box when served from the same origin.
// ============================================================

const DREXORA_CONFIG = {
  // Update this to your deployed API server URL for production:
  CLOUDINARY_UPLOAD_API_URL: '/api/upload/profile-photo',
};

// Freeze to prevent accidental mutation
Object.freeze(DREXORA_CONFIG);
