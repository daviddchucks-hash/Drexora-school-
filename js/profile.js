// ============================================================
// DREXORA SCHOOL PORTAL — Student Profile Page JS
// ============================================================

let currentUser = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user, profile } = await requireAuth();
    currentUser = user;
    currentProfile = profile || {};
    renderProfile(user, currentProfile);
    updateSidebarUser(currentProfile);
    SidebarManager.init();
    initPasswordChange();
    initProfileEdit();
    initPhotoUpload();
  } catch (err) {
    console.error('Profile page error:', err);
  }
});

/* ---------- Render Profile ---------- */
function renderProfile(user, profile) {
  // Photo
  const photoEl = document.getElementById('profile-photo-display');
  if (photoEl) {
    if (profile.photo) {
      photoEl.innerHTML = `<img src="${escapeHtml(profile.photo)}" alt="Passport" class="avatar avatar-lg">`;
    } else {
      photoEl.innerHTML = `<div class="avatar avatar-lg avatar-placeholder">${getInitials(profile.fullname)}</div>`;
    }
  }

  // Info fields
  const fields = {
    'disp-fullname':    profile.fullname    || '—',
    'disp-admission':   profile.admissionNo || '—',
    'disp-class':       profile.class       || '—',
    'disp-gender':      profile.gender      || '—',
    'disp-dob':         profile.dob         || '—',
    'disp-email':       user.email          || profile.email || '—',
    'disp-parent':      profile.parent      || '—',
    'disp-phone':       profile.phone       || '—',
  };
  Object.entries(fields).forEach(([id, val]) => setEl(id, val));

  // Populate edit form with editable fields
  setInput('edit-phone',  profile.phone  || '');
  setInput('edit-parent', profile.parent || '');
}

/* ---------- Profile Edit Form ---------- */
function initProfileEdit() {
  const form = document.getElementById('edit-profile-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone  = document.getElementById('edit-phone')?.value.trim();
    const parent = document.getElementById('edit-parent')?.value.trim();
    const btn    = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
    try {
      await db.ref(`students/${currentUser.uid}/profile`).update({ phone, parent });
      currentProfile.phone  = phone;
      currentProfile.parent = parent;
      setEl('disp-phone',  phone  || '—');
      setEl('disp-parent', parent || '—');
      Toast.success('Profile updated successfully!');
      Modal.close('edit-profile-modal');
    } catch (err) {
      Toast.error('Failed to update profile. Please try again.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
  });

  // Edit button
  const editBtn = document.getElementById('edit-profile-btn');
  if (editBtn) editBtn.addEventListener('click', () => Modal.open('edit-profile-modal'));
}

/* ---------- Password Change ---------- */
function initPasswordChange() {
  const form = document.getElementById('change-password-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('current-password')?.value;
    const newPass = document.getElementById('new-password')?.value;
    const confirm = document.getElementById('confirm-password')?.value;
    const btn     = form.querySelector('[type=submit]');

    if (!current || !newPass || !confirm) {
      Toast.warning('Please fill in all password fields.');
      return;
    }
    if (newPass.length < 8) {
      Toast.warning('New password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirm) {
      Toast.error('New passwords do not match.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating…';
    try {
      // Re-authenticate first
      const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, current);
      await currentUser.reauthenticateWithCredential(credential);
      await currentUser.updatePassword(newPass);
      Toast.success('Password changed successfully!');
      form.reset();
      Modal.close('change-password-modal');
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        Toast.error('Current password is incorrect.');
      } else if (err.code === 'auth/weak-password') {
        Toast.error('New password is too weak.');
      } else {
        Toast.error('Failed to change password. Try again.');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-key"></i> Change Password';
    }
  });

  // Open button
  document.querySelectorAll('[data-open-change-pass]').forEach(btn => {
    btn.addEventListener('click', () => Modal.open('change-password-modal'));
  });
}

/* ---------- Photo Upload ---------- */
function initPhotoUpload() {
  const input    = document.getElementById('photo-input');
  const uploadBtn = document.getElementById('upload-photo-btn');
  if (!input || !uploadBtn) return;

  uploadBtn.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Toast.error('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Toast.error('Image must be smaller than 5MB.');
      return;
    }
    Spinner.show();
    try {
      const ref  = storage.ref(`passports/${currentUser.uid}`);
      await ref.put(file);
      const url  = await ref.getDownloadURL();
      await db.ref(`students/${currentUser.uid}/profile`).update({ photo: url });
      currentProfile.photo = url;
      const photoEl = document.getElementById('profile-photo-display');
      if (photoEl) photoEl.innerHTML = `<img src="${escapeHtml(url)}" alt="Passport" class="avatar avatar-lg">`;
      Toast.success('Passport photo updated!');
    } catch (err) {
      Toast.error('Failed to upload photo. Please try again.');
    } finally {
      Spinner.hide();
      input.value = '';
    }
  });
}

/* ---------- Helpers ---------- */
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setInput(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function updateSidebarUser(profile) {
  const name  = document.getElementById('sidebar-user-name');
  const role  = document.getElementById('sidebar-user-role');
  const photo = document.getElementById('sidebar-user-photo');
  if (name)  name.textContent  = profile.fullname || 'Student';
  if (role)  role.textContent  = profile.class    || 'Student';
  if (photo && profile.photo) {
    photo.outerHTML = `<img src="${escapeHtml(profile.photo)}" alt="avatar" class="user-pill-avatar avatar-sm">`;
  } else if (photo) {
    photo.textContent = getInitials(profile.fullname);
  }
}
