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
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passInput  = document.getElementById('login-password');
  const btn        = document.getElementById('login-btn');
  const errorEl    = document.getElementById('login-error');

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

    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const user = cred.user;

      // Check if admin
      const adminSnap = await db.ref(`admins/${user.uid}`).get();
      if (adminSnap.exists()) {
        Toast.success('Welcome, Administrator!');
        window.location.href = 'admin/index.html';
      } else {
        // Check student profile exists
        const profileSnap = await db.ref(`students/${user.uid}/profile`).get();
        if (!profileSnap.exists()) {
          // Profile not set up yet — still let them in
          Toast.info('Profile not fully set up. Contact admin.');
        }
        Toast.success('Login successful! Welcome back.');
        window.location.href = 'dashboard.html';
      }
    } catch (err) {
      Spinner.hide();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
      showError(getAuthError(err.code));
    }
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
  if (el) { el.textContent = msg; el.classList.remove('d-none'); }
}

function hideError() {
  const el = document.getElementById('login-error');
  if (el) el.classList.add('d-none');
}

function getAuthError(code) {
  const errors = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password. Please try again.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/user-disabled':        'This account has been disabled. Contact admin.',
    'auth/too-many-requests':    'Too many failed attempts. Please try again later.',
    'auth/network-request-failed':'Network error. Check your connection.',
    'auth/invalid-credential':   'Invalid email or password. Please try again.',
  };
  return errors[code] || 'Login failed. Please try again.';
}
