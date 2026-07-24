// ============================================================
// DREXORA SCHOOL PORTAL — Authentication Guard
// Protects pages from unauthenticated access
// ============================================================

/**
 * requireAuth — call on any protected student page.
 * Redirects to login if user is not authenticated.
 * Resolves with { user, profile } when authenticated.
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
        Spinner.hide();
        console.error('Auth guard error:', err);
        reject(err);
      }
    });
  });
}

/**
 * requireAdmin — call on any protected admin page.
 * Redirects to login if user is not admin.
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
        Spinner.hide();
        window.location.href = '../login.html';
        reject(err);
      }
    });
  });
}

/**
 * redirectIfLoggedIn — call on login page.
 * Redirects to dashboard if already authenticated.
 */
function redirectIfLoggedIn() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (!user) { resolve(null); return; }
      try {
        // Check if admin — redirect accordingly
        const adminSnap = await db.ref(`admins/${user.uid}`).get();
        if (adminSnap.exists()) {
          window.location.href = 'admin/index.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * getLoginUrl — returns the correct relative path to login.html
 * based on how deep the current page is inside the repo.
 * Works for both local file access and GitHub Pages hosting.
 */
function getLoginUrl() {
  const inAdmin = window.location.pathname.toLowerCase().includes('/admin/');
  return inAdmin ? '../login.html' : 'login.html';
}

/**
 * logout — sign out and redirect to login from any page depth
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
 * logoutFromRoot — kept for backwards compatibility; same as logout()
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
