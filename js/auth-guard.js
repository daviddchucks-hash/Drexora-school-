// ============================================================
// DREXORA SCHOOL PORTAL — Authentication Guard
// Protects pages from unauthenticated access
// ============================================================

/**
 * requireAuth — call on any protected student page.
 * Redirects to login if user is not authenticated.
 * Resolves with { user, profile } when authenticated.
 * If the profile DB read fails (e.g. rules not published yet),
 * resolves with profile: null instead of crashing the page.
 */
function requireAuth() {
  return new Promise((resolve, reject) => {
    Spinner.show();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (!user) {
        Spinner.hide();
        window.location.href = getLoginUrl();
        return reject(new Error('Not authenticated'));
      }
      try {
        // Load user profile from Realtime Database
        const snap = await db.ref(`students/${user.uid}/profile`).get();
        const profile = snap.exists() ? snap.val() : null;
        Spinner.hide();
        resolve({ user, profile });
      } catch (err) {
        // DB read failed (most likely Firebase Console rules not published yet).
        // Resolve with no profile rather than crashing — the page will show
        // a "profile incomplete" state instead of redirecting to login.
        Spinner.hide();
        console.warn('Auth guard: profile read failed (check Firebase Console rules):', err.message || err);
        resolve({ user, profile: null });
      }
    });
  });
}

/**
 * requireAdmin — call on any protected admin page.
 * Redirects to login if user is not an admin.
 */
function requireAdmin() {
  return new Promise((resolve, reject) => {
    Spinner.show();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (!user) {
        Spinner.hide();
        window.location.href = '../login.html';
        return reject(new Error('Not authenticated'));
      }
      try {
        // Check admin status in Realtime Database
        const adminSnap = await db.ref(`admins/${user.uid}`).get();
        if (!adminSnap.exists()) {
          Spinner.hide();
          window.location.href = '../login.html';
          return reject(new Error('Not admin'));
        }
        Spinner.hide();
        resolve({ user, admin: adminSnap.val() });
      } catch (err) {
        // DB read failed — cannot confirm admin status, send back to login
        Spinner.hide();
        console.warn('requireAdmin: DB read failed:', err.message || err);
        window.location.href = '../login.html';
        reject(err);
      }
    });
  });
}

/**
 * redirectIfLoggedIn — call on the login page.
 * If the user is already signed in, redirect them to the right page.
 * If the DB role-check fails, redirect to student dashboard anyway
 * (auth already succeeded, so there's no reason to stay on login).
 */
function redirectIfLoggedIn() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (!user) { resolve(null); return; }

      // User is authenticated — redirect to the right destination.
      try {
        const adminSnap = await db.ref(`admins/${user.uid}`).get();
        if (adminSnap.exists()) {
          window.location.href = 'admin/index.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } catch {
        // DB check failed (rules not published, network error, etc.).
        // User IS authenticated, so send them to the student dashboard.
        window.location.href = 'dashboard.html';
      }
    });
  });
}

/**
 * getLoginUrl — returns the correct relative path to login.html
 * based on how deep the current page is inside the repo.
 */
function getLoginUrl() {
  const inAdmin = window.location.pathname.toLowerCase().includes('/admin/');
  return inAdmin ? '../login.html' : 'login.html';
}

/**
 * logout — sign out and redirect to login from any page depth.
 */
async function logout() {
  try {
    await auth.signOut();
    window.location.href = getLoginUrl();
  } catch (err) {
    Toast.error('Logout failed. Please try again.');
  }
}

/**
 * logoutFromRoot — kept for backwards compatibility; same as logout().
 */
async function logoutFromRoot() {
  return logout();
}

// Bind logout buttons (works for data-logout="student", "admin", "root", or any value)
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      logout();
    });
  });
});
