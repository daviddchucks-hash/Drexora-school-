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
        window.location.href = '../login.html';
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
 * logout — sign out and redirect to login
 */
async function logout() {
  try {
    await auth.signOut();
    window.location.href = '../login.html';
  } catch (err) {
    Toast.error('Logout failed. Please try again.');
  }
}

/**
 * logoutFromRoot — sign out from root-level pages
 */
async function logoutFromRoot() {
  try {
    await auth.signOut();
    window.location.href = 'login.html';
  } catch (err) {
    Toast.error('Logout failed. Please try again.');
  }
}

// Bind logout buttons
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isRoot = btn.dataset.logout === 'root';
      isRoot ? logoutFromRoot() : logout();
    });
  });
});
