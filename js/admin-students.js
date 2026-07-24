// ============================================================
// DREXORA SCHOOL PORTAL — Admin: Manage Students JS
// ============================================================

let adminUser = null;
let allStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user } = await requireAdmin();
    adminUser = user;
    SidebarManager.init();
    updateAdminSidebar(user);
    loadStudents();
    initCreateStudentForm();
    initPhotoUpload();
    initSearch();
    initDeleteModal();
    initResetPasswordModal();
    initLogout();
  } catch (err) {
    console.error('Admin students error:', err);
  }
});

/* ---------- Load Students ---------- */
async function loadStudents(filter = '') {
  const tbody = document.getElementById('students-tbody');
  const countEl = document.getElementById('student-count');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8"><div class="skeleton" style="height:36px"></div></td></tr>';

  try {
    const snap = await db.ref('students').get();
    allStudents = [];
    if (snap.exists()) {
      snap.forEach(c => allStudents.push({ uid: c.key, ...c.val() }));
    }

    const filtered = filter
      ? allStudents.filter(s => {
          const p = s.profile || {};
          return (p.fullname||'').toLowerCase().includes(filter) ||
                 (p.admissionNo||'').toLowerCase().includes(filter) ||
                 (p.class||'').toLowerCase().includes(filter);
        })
      : allStudents;

    if (countEl) countEl.textContent = `${filtered.length} students`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8">
        <div class="empty-state" style="padding:2rem">
          <i class="fas fa-users" style="font-size:2rem"></i>
          <h3>No Students Found</h3>
          <p>${filter ? 'Try a different search.' : 'Click "Add Student" to register the first student.'}</p>
        </div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const p = s.profile || {};
      return `
        <tr>
          <td>
            ${p.photo
              ? `<img src="${escapeHtml(p.photo)}" class="avatar avatar-sm" alt="" style="width:36px;height:36px">`
              : `<div class="avatar avatar-sm avatar-placeholder" style="width:36px;height:36px;font-size:.7rem">${getInitials(p.fullname)}</div>`
            }
          </td>
          <td class="fw-700">${escapeHtml(p.fullname || '—')}</td>
          <td>${escapeHtml(p.admissionNo || '—')}</td>
          <td>${escapeHtml(p.class || '—')}</td>
          <td>${escapeHtml(p.gender || '—')}</td>
          <td>${escapeHtml(p.email || '—')}</td>
          <td>${escapeHtml(p.phone || '—')}</td>
          <td>
            <div class="flex" style="gap:.4rem">
              <button class="btn btn-sm btn-outline" onclick="openViewStudent('${s.uid}')">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-primary" onclick="openEditStudent('${s.uid}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-ghost" onclick="openResetPassword('${s.uid}','${escapeHtml(p.email||'')}')">
                <i class="fas fa-key"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="openDeleteStudent('${s.uid}','${escapeHtml(p.fullname||'')}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    console.error('Load students error:', err);
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load students.</td></tr>';
  }
}

/* ---------- Create Student ---------- */
function initCreateStudentForm() {
  const form = document.getElementById('create-student-form');
  if (!form) return;

  // Open modal
  const openBtn = document.getElementById('add-student-btn');
  if (openBtn) openBtn.addEventListener('click', () => {
    form.reset();
    clearPhotoPreview();
    Modal.open('create-student-modal');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…';

    const fullname    = v('create-fullname');
    const admissionNo = v('create-admission');
    const email       = v('create-email');
    const password    = v('create-password');
    const cls         = v('create-class');
    const gender      = v('create-gender');
    const dob         = v('create-dob');
    const parent      = v('create-parent');
    const phone       = v('create-phone');

    if (!fullname || !email || !password || !cls) {
      Toast.warning('Please fill all required fields.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
      return;
    }
    if (password.length < 8) {
      Toast.warning('Password must be at least 8 characters.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
      return;
    }

    try {
      // Create Firebase Auth account using REST API (secondary app trick)
      const secondaryApp = firebase.initializeApp(firebase.app().options, `secondary-${Date.now()}`);
      const secAuth = secondaryApp.auth();
      const cred = await secAuth.createUserWithEmailAndPassword(email, password);
      const uid  = cred.user.uid;
      await secAuth.signOut();
      await secondaryApp.delete();

      // Upload photo if selected
      let photoUrl = '';
      const photoFile = document.getElementById('create-photo')?.files[0];
      if (photoFile) {
        const ref = storage.ref(`passports/${uid}`);
        await ref.put(photoFile);
        photoUrl = await ref.getDownloadURL();
      }

      // Save profile to Realtime Database
      await db.ref(`students/${uid}/profile`).set({
        fullname, admissionNo, email, class: cls, gender, dob, parent, phone,
        photo: photoUrl, createdAt: Date.now()
      });

      Toast.success(`Account created for ${fullname}!`);
      Modal.close('create-student-modal');
      form.reset();
      clearPhotoPreview();
      loadStudents();
    } catch (err) {
      console.error('Create student error:', err);
      if (err.code === 'auth/email-already-in-use') {
        Toast.error('Email is already registered.');
      } else {
        Toast.error('Failed to create account: ' + err.message);
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  });
}

/* ---------- View Student ---------- */
function openViewStudent(uid) {
  const s = allStudents.find(x => x.uid === uid);
  if (!s) return;
  const p = s.profile || {};
  const modal = document.getElementById('view-student-modal');
  if (!modal) return;
  const photoEl = modal.querySelector('#view-photo');
  if (photoEl) {
    if (p.photo) photoEl.innerHTML = `<img src="${escapeHtml(p.photo)}" class="avatar avatar-lg" alt="">`;
    else photoEl.innerHTML = `<div class="avatar avatar-lg avatar-placeholder">${getInitials(p.fullname)}</div>`;
  }
  const fields = { 'view-fullname':p.fullname,'view-admission':p.admissionNo,'view-class':p.class,'view-gender':p.gender,'view-dob':p.dob,'view-email':p.email,'view-parent':p.parent,'view-phone':p.phone };
  Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if(el) el.textContent = val||'—'; });
  Modal.open('view-student-modal');
}

/* ---------- Edit Student ---------- */
function openEditStudent(uid) {
  const s = allStudents.find(x => x.uid === uid);
  if (!s) return;
  const p = s.profile || {};
  const form = document.getElementById('edit-student-form');
  if (!form) return;
  form.dataset.uid = uid;
  setInput('edit-fullname',    p.fullname    || '');
  setInput('edit-admission',   p.admissionNo || '');
  setInput('edit-class',       p.class       || '');
  setInput('edit-gender',      p.gender      || '');
  setInput('edit-dob',         p.dob         || '');
  setInput('edit-parent',      p.parent      || '');
  setInput('edit-phone',       p.phone       || '');
  Modal.open('edit-student-modal');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('edit-student-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = form.dataset.uid;
    if (!uid) return;
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
    try {
      await db.ref(`students/${uid}/profile`).update({
        fullname:    v('edit-fullname'),
        admissionNo: v('edit-admission'),
        class:       v('edit-class'),
        gender:      v('edit-gender'),
        dob:         v('edit-dob'),
        parent:      v('edit-parent'),
        phone:       v('edit-phone'),
      });
      Toast.success('Student profile updated!');
      Modal.close('edit-student-modal');
      loadStudents();
    } catch (err) {
      Toast.error('Failed to update profile.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
  });
});

/* ---------- Delete Student ---------- */
let pendingDeleteUid = null;

function openDeleteStudent(uid, name) {
  pendingDeleteUid = uid;
  const nameEl = document.getElementById('delete-student-name');
  if (nameEl) nameEl.textContent = name;
  Modal.open('delete-student-modal');
}

function initDeleteModal() {
  const confirmBtn = document.getElementById('confirm-delete-btn');
  if (!confirmBtn) return;
  confirmBtn.addEventListener('click', async () => {
    if (!pendingDeleteUid) return;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting…';
    try {
      await db.ref(`students/${pendingDeleteUid}`).remove();
      Toast.success('Student record deleted.');
      Modal.close('delete-student-modal');
      pendingDeleteUid = null;
      loadStudents();
    } catch (err) {
      Toast.error('Failed to delete student record.');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    }
  });
}

/* ---------- Reset Password ---------- */
function openResetPassword(uid, email) {
  const emailEl = document.getElementById('reset-student-email');
  if (emailEl) emailEl.value = email;
  Modal.open('reset-password-modal');
}

function initResetPasswordModal() {
  const form = document.getElementById('reset-password-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-student-email')?.value.trim();
    if (!email) { Toast.warning('No email found.'); return; }
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    try {
      await auth.sendPasswordResetEmail(email);
      Toast.success(`Password reset email sent to ${email}`);
      Modal.close('reset-password-modal');
    } catch (err) {
      Toast.error('Failed to send reset email.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-key"></i> Send Reset Email';
    }
  });
}

/* ---------- Photo Upload Preview ---------- */
function initPhotoUpload() {
  const input   = document.getElementById('create-photo');
  const preview = document.getElementById('photo-preview');
  if (!input || !preview) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) { clearPhotoPreview(); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.innerHTML = `<img src="${ev.target.result}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--primary)">`;
    };
    reader.readAsDataURL(file);
  });
}
function clearPhotoPreview() {
  const preview = document.getElementById('photo-preview');
  if (preview) preview.innerHTML = `<div style="width:80px;height:80px;border-radius:50%;background:var(--bg);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-muted)"><i class="fas fa-camera"></i></div>`;
}

/* ---------- Search ---------- */
function initSearch() {
  const input = document.getElementById('student-search');
  if (!input) return;
  input.addEventListener('input', debounce(() => loadStudents(input.value.trim().toLowerCase()), 350));
}

/* ---------- Helpers ---------- */
function v(id) { return document.getElementById(id)?.value.trim() || ''; }
function setInput(id, val) { const el = document.getElementById(id); if(el) el.value = val; }
function updateAdminSidebar(user) {
  const name  = document.getElementById('sidebar-user-name');
  const role  = document.getElementById('sidebar-user-role');
  const photo = document.getElementById('sidebar-user-photo');
  if (name)  name.textContent  = user.displayName || user.email || 'Administrator';
  if (role)  role.textContent  = 'Administrator';
  if (photo) photo.textContent = (user.displayName || user.email || 'A')[0].toUpperCase();
}
function initLogout() {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try { await auth.signOut(); window.location.href = '../login.html'; }
      catch { Toast.error('Logout failed.'); }
    });
  });
}
