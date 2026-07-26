// ============================================================
// DREXORA SCHOOL PORTAL — Admin: Manage Admin Accounts JS
// ============================================================

let currentAdminUser = null;
let allAdmins        = [];
let pendingDeleteUid = null;

// ─── Bootstrap ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user } = await requireAdmin();
    currentAdminUser = user;
    SidebarManager.init();
    updateSidebar(user);

    // Bind "New Admin" button immediately — works before AND after gate
    const addBtn = document.getElementById('add-admin-btn');
    if (addBtn) addBtn.addEventListener('click', () => Modal.open('create-admin-modal'));

    initPasswordGate();
  } catch (err) {
    console.error('Admin manage-admins boot error:', err);
  }
});

// ─── Password Gate ───────────────────────────────────────────
function initPasswordGate() {
  const form    = document.getElementById('password-gate-form');
  const errorEl = document.getElementById('gate-error');
  const gateEl  = document.getElementById('password-gate');
  const btn     = document.getElementById('gate-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const entered = document.getElementById('gate-password').value;
    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking…';

    // Try to get password from Firebase; fall back to default if node missing or read fails
    let correctPassword = 'advocate123'; // default fallback
    try {
      const snap = await db.ref('settings/adminPortalPassword').get();
      if (snap.exists() && snap.val()) {
        correctPassword = String(snap.val());
      }
    } catch (firebaseErr) {
      // Permission denied or network error — use the default
      console.warn('Could not read portal password from Firebase, using default:', firebaseErr.message);
    }

    if (entered === correctPassword) {
      // Correct — hide gate and load page data
      gateEl.style.display = 'none';
      await initPage();
    } else {
      errorEl.style.display = '';
      document.getElementById('gate-password').value = '';
      document.getElementById('gate-password').focus();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-unlock"></i> Unlock';
    }
  });
}

// ─── Page Init (after gate unlocked) ─────────────────────────
async function initPage() {
  await loadAdmins();
  initCreateForm();
  initDeleteModal();
  initSearch();
}

// ─── Load & Render Admins ─────────────────────────────────────
async function loadAdmins() {
  const tbody      = document.getElementById('admins-tbody');
  const countEl    = document.getElementById('admin-count');
  const tableCount = document.getElementById('admin-table-count');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton" style="height:40px"></div></td></tr>`;

  try {
    const snap = await db.ref('admins').get();
    allAdmins = [];

    if (snap.exists()) {
      snap.forEach(child => {
        const val = child.val();
        allAdmins.push({
          uid: child.key,
          ...(val && typeof val === 'object' ? val : { email: String(val) })
        });
      });
    }

    if (countEl)    countEl.textContent = allAdmins.length;
    if (tableCount) tableCount.textContent = `${allAdmins.length} admin${allAdmins.length !== 1 ? 's' : ''}`;
    renderAdmins(allAdmins);
  } catch (err) {
    console.error('Load admins error:', err);
    Toast.error('Failed to load admin list. ' + (err.message || ''));
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load admins. Please refresh.</td></tr>`;
  }
}

function renderAdmins(list) {
  const tbody = document.getElementById('admins-tbody');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-user-shield"></i><h3>No Admins Found</h3><p>No admin accounts exist yet.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => {
    const name     = escapeHtml(a.name || a.fullname || 'Unknown');
    const email    = escapeHtml(a.email || '—');
    const role     = escapeHtml(a.role  || 'Administrator');
    const added    = a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-NG', { year:'numeric', month:'short', day:'numeric' }) : '—';
    const initials = (a.name || a.fullname || 'A').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
    const isMe     = a.uid === currentAdminUser?.uid;

    return `
      <tr>
        <td>
          <div style="width:38px;height:38px;font-size:.85rem;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,var(--primary-dark),var(--primary));color:#fff;font-weight:700;flex-shrink:0">
            ${initials}
          </div>
        </td>
        <td class="fw-600">
          ${name}
          ${isMe ? '<span class="badge badge-primary" style="font-size:.7rem;margin-left:.4rem">You</span>' : ''}
        </td>
        <td style="font-size:.82rem;color:var(--text-muted)">${email}</td>
        <td><span class="badge badge-gold" style="font-size:.75rem">${role}</span></td>
        <td style="font-size:.82rem;color:var(--text-muted)">${added}</td>
        <td class="actions-cell">
          ${isMe
            ? `<span style="font-size:.78rem;color:var(--text-muted);font-style:italic">Current session</span>`
            : `<button class="btn btn-sm btn-danger btn-icon" title="Remove admin" onclick="promptDeleteAdmin('${escapeHtml(a.uid)}','${name}')">
                 <i class="fas fa-user-times"></i>
               </button>`
          }
        </td>
      </tr>`;
  }).join('');
}

// ─── Search ───────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('admin-search');
  if (!input) return;
  input.addEventListener('input', debounce(() => {
    const q = input.value.toLowerCase().trim();
    const filtered = q
      ? allAdmins.filter(a =>
          (a.name || a.fullname || '').toLowerCase().includes(q) ||
          (a.email || '').toLowerCase().includes(q)
        )
      : allAdmins;
    renderAdmins(filtered);
    const tc = document.getElementById('admin-table-count');
    if (tc) tc.textContent = `${filtered.length} admin${filtered.length !== 1 ? 's' : ''}`;
  }, 200));
}

// ─── Create Admin Form ────────────────────────────────────────
function initCreateForm() {
  const form = document.getElementById('create-admin-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullname = document.getElementById('admin-fullname').value.trim();
    const email    = document.getElementById('admin-email').value.trim();
    const role     = document.getElementById('admin-role').value.trim() || 'Administrator';
    const password = document.getElementById('admin-password').value;
    const confirm  = document.getElementById('admin-password-confirm').value;

    if (password !== confirm) { Toast.warning('Passwords do not match.'); return; }
    if (password.length < 8)  { Toast.warning('Password must be at least 8 characters.'); return; }

    const btn = document.getElementById('create-admin-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…';

    try {
      // Use a secondary Firebase app instance so we don't sign out the current admin
      const secondaryApp  = firebase.initializeApp(firebase.app().options, 'adminCreation_' + Date.now());
      const secondaryAuth = secondaryApp.auth();

      const cred   = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const newUid = cred.user.uid;
      await cred.user.updateProfile({ displayName: fullname });
      await secondaryAuth.signOut();
      await secondaryApp.delete();

      // Write admin record to Realtime Database
      await db.ref(`admins/${newUid}`).set({
        name:      fullname,
        email:     email,
        role:      role,
        createdAt: Date.now(),
        createdBy: currentAdminUser?.uid || 'unknown'
      });

      Toast.success(`Admin account created for ${fullname}.`);
      Modal.close('create-admin-modal');
      form.reset();
      await loadAdmins();
    } catch (err) {
      console.error('Create admin error:', err);
      Toast.error('Failed to create admin: ' + friendlyAuthError(err));
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-shield"></i> Create Admin';
    }
  });
}

// ─── Delete Admin ─────────────────────────────────────────────
function initDeleteModal() {
  const btn = document.getElementById('confirm-delete-admin-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!pendingDeleteUid) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing…';
    try {
      await db.ref(`admins/${pendingDeleteUid}`).remove();
      Toast.success('Admin privileges removed successfully.');
      Modal.close('delete-admin-modal');
      pendingDeleteUid = null;
      await loadAdmins();
    } catch (err) {
      console.error('Delete admin error:', err);
      Toast.error('Failed to remove admin. ' + (err.message || ''));
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-times"></i> Remove Admin';
    }
  });
}

function promptDeleteAdmin(uid, name) {
  pendingDeleteUid = uid;
  const nameEl = document.getElementById('delete-admin-name');
  if (nameEl) nameEl.textContent = name;
  Modal.open('delete-admin-modal');
}

// ─── Sidebar Helper ───────────────────────────────────────────
function updateSidebar(user) {
  const nameEl  = document.getElementById('sidebar-user-name');
  const roleEl  = document.getElementById('sidebar-user-role');
  const photoEl = document.getElementById('sidebar-user-photo');
  const labelEl = document.getElementById('current-admin-label');
  if (nameEl)  nameEl.textContent  = user.displayName || user.email || 'Administrator';
  if (roleEl)  roleEl.textContent  = 'Administrator';
  if (photoEl) photoEl.textContent = (user.displayName || user.email || 'A')[0].toUpperCase();
  if (labelEl) labelEl.textContent = user.displayName || user.email || 'You';
}

// ─── Friendly Firebase Auth Errors ───────────────────────────
function friendlyAuthError(err) {
  const map = {
    'auth/email-already-in-use':  'That email is already registered.',
    'auth/invalid-email':         'The email address is invalid.',
    'auth/weak-password':         'Password is too weak (min 8 characters).',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled in Firebase.',
  };
  return map[err.code] || err.message || 'Unknown error.';
}
