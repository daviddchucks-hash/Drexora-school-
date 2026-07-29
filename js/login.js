// ============================================================
// DREXORA SCHOOL PORTAL — Login Page JS
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // If already logged in, redirect
  await redirectIfLoggedIn();
  initLoginForm();
  initPasswordToggle();
});

/* ---------- Login Form ---------- */
function initLoginForm() {
  const form       = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passInput  = document.getElementById('login-password');
  const btn        = document.getElementById('login-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      showError('Please enter your email and password.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
    Spinner.show();

    // ── Step 1: Firebase Authentication ────────────────────────
    let user;
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      user = cred.user;
    } catch (authErr) {
      // Auth itself failed (wrong password, network error, unauthorised domain, etc.)
      Spinner.hide();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
      showError(getAuthError(authErr.code));
      return;
    }

    // ── Step 2: Check admin / student role ─────────────────────
    // DB permission errors here must NOT block the user — auth already
    // succeeded, so we redirect to the right page regardless.
    try {
      const adminSnap = await db.ref(`admins/${user.uid}`).get();
      if (adminSnap.exists()) {
        Toast.success('Welcome, Administrator!');
        window.location.href = 'admin/index.html';
        return;
      }
    } catch (_) {
      // Cannot read admins node — Firebase Console rules probably not published yet.
      // Fall through and send the user to the student dashboard anyway.
    }

    // Student (or couldn't verify admin status) → dashboard
    Toast.success('Login successful! Welcome back.');
    window.location.href = 'dashboard.html';
  });

  // Forgot password
  const forgotBtn = document.getElementById('forgot-password-btn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', handleForgotPassword);
  }
}

/* ---------- Password Toggle ---------- */
function initPasswordToggle() {
  document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-group').querySelector('input');
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.innerHTML = isText
        ? '<i class="fas fa-eye"></i>'
        : '<i class="fas fa-eye-slash"></i>';
    });
  });
}

/* ---------- Forgot Password ---------- */
async function handleForgotPassword() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) {
    Toast.warning('Enter your email address first, then click Forgot Password.');
    return;
  }
  try {
    Spinner.show();
    await auth.sendPasswordResetEmail(email);
    Spinner.hide();
    Toast.success('Password reset email sent! Check your inbox.');
  } catch (err) {
    Spinner.hide();
    Toast.error(getAuthError(err.code));
  }
}

/* ---------- Error Helpers ---------- */
function showError(msg) {
  const el = document.getElementById('login-error');
  if (!el) return;
  const span = el.querySelector('span') || el;
  span.textContent = msg;
  el.classList.remove('d-none');
  // Scroll error into view so it's visible on mobile
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  const el = document.getElementById('login-error');
  if (el) el.classList.add('d-none');
}

function getAuthError(code) {
  const errors = {
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/user-disabled':          'This account has been disabled. Contact admin.',
    'auth/too-many-requests':      'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/invalid-credential':     'Invalid email or password. Please try again.',
    'auth/unauthorized-domain':    'Login is blocked on this domain. The administrator must add "' + window.location.hostname + '" to Firebase Console → Authentication → Settings → Authorised Domains.',
  };
  return errors[code] || `Login failed (${code || 'unknown error'}). Please try again.`;
}
