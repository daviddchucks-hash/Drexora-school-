// ============================================================
// DREXORA SCHOOL PORTAL — Admin: Manage Announcements JS
// ============================================================

let adminUser = null;
let selectedType = 'general';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user } = await requireAdmin();
    adminUser = user;
    SidebarManager.init();
    updateAdminSidebar(user);
    loadAnnouncements();
    initAnnouncementForm();
    initTypeSelector();
    initLogout();
  } catch (err) {
    console.error('Announcements page error:', err);
  }
});

/* ---------- Type Selector ---------- */
function initTypeSelector() {
  document.querySelectorAll('.ann-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ann-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
      const input = document.getElementById('ann-type-hidden');
      if (input) input.value = selectedType;
    });
  });
}

/* ---------- Announcement Form ---------- */
function initAnnouncementForm() {
  const form = document.getElementById('announcement-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title   = document.getElementById('ann-title')?.value.trim();
    const message = document.getElementById('ann-message')?.value.trim();
    const type    = selectedType || 'general';

    if (!title || !message) {
      Toast.warning('Please fill in title and message.');
      return;
    }

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…';
    try {
      const adminSnap = await db.ref(`admins/${adminUser.uid}`).get();
      const adminName = adminSnap.exists() ? (adminSnap.val().name || adminUser.email) : adminUser.email;

      await db.ref('announcements').push({
        title, message, type,
        postedBy: adminName,
        timestamp: Date.now()
      });

      Toast.success('Announcement published successfully!');
      form.reset();
      // Reset type selection
      document.querySelectorAll('.ann-type-btn').forEach(b => b.classList.remove('active'));
      const generalBtn = document.querySelector('.ann-type-btn[data-type="general"]');
      if (generalBtn) generalBtn.classList.add('active');
      selectedType = 'general';
      loadAnnouncements();
    } catch (err) {
      Toast.error('Failed to publish announcement.');
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-bullhorn"></i> Publish Announcement';
    }
  });
}

/* ---------- Load Announcements ---------- */
async function loadAnnouncements(filter = '') {
  const container = document.getElementById('announcements-list');
  const countEl   = document.getElementById('ann-count');
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton" style="height:90px;margin-bottom:1rem"></div>
    <div class="skeleton" style="height:90px;margin-bottom:1rem"></div>
    <div class="skeleton" style="height:90px"></div>`;

  try {
    const snap = await db.ref('announcements').orderByChild('timestamp').get();
    const items = [];
    if (snap.exists()) {
      snap.forEach(c => items.unshift({ id: c.key, ...c.val() }));
    }

    const filtered = filter
      ? items.filter(n => (n.title||'').toLowerCase().includes(filter) || (n.message||'').toLowerCase().includes(filter))
      : items;

    if (countEl) countEl.textContent = filtered.length;

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-bullhorn"></i>
          <h3>${filter ? 'No matching announcements' : 'No Announcements Yet'}</h3>
          <p>${filter ? 'Try a different search term.' : 'Use the form above to publish your first announcement.'}</p>
        </div>`;
      return;
    }

    const typeIcons = { urgent:'fa-exclamation-circle text-danger', info:'fa-info-circle text-info', general:'fa-bullhorn text-success', event:'fa-calendar-alt text-secondary' };
    const typeBadges = { urgent:'badge-danger', info:'badge-primary', general:'badge-success', event:'badge-gold' };

    container.innerHTML = filtered.map(n => `
      <div class="card mb-2">
        <div class="card-header">
          <div class="flex" style="align-items:center;gap:.75rem">
            <i class="fas ${typeIcons[n.type] || typeIcons.general}"></i>
            <div>
              <div class="fw-700" style="font-size:.95rem">${escapeHtml(n.title||'Announcement')}</div>
              <div style="font-size:.75rem;color:var(--text-muted)">
                ${Format.date(n.timestamp)} &nbsp;·&nbsp; 
                ${n.postedBy ? `By ${escapeHtml(n.postedBy)}` : ''}
              </div>
            </div>
          </div>
          <div class="flex gap-1" style="align-items:center">
            <span class="badge ${typeBadges[n.type] || 'badge-primary'}">${escapeHtml(n.type||'general')}</span>
            <button class="btn btn-sm btn-ghost btn-icon" onclick="editAnnouncement('${n.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteAnnouncement('${n.id}','${escapeHtml(n.title||'')}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="card-body" style="color:var(--text)">
          ${escapeHtml(n.message||'')}
        </div>
      </div>`).join('');

    // Search
    const searchInput = document.getElementById('ann-search');
    if (searchInput && !searchInput._bound) {
      searchInput._bound = true;
      searchInput.addEventListener('input', debounce(() => loadAnnouncements(searchInput.value.trim().toLowerCase()), 300));
    }
  } catch (err) {
    console.error('Load announcements error:', err);
    container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>Failed to load announcements.</p></div>';
  }
}

/* ---------- Delete Announcement ---------- */
async function deleteAnnouncement(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    await db.ref(`announcements/${id}`).remove();
    Toast.success('Announcement deleted.');
    loadAnnouncements();
  } catch { Toast.error('Failed to delete announcement.'); }
}

/* ---------- Edit Announcement ---------- */
function editAnnouncement(id) {
  // Open edit modal and pre-populate
  db.ref(`announcements/${id}`).get().then(snap => {
    if (!snap.exists()) return;
    const n = snap.val();
    const modal = document.getElementById('edit-ann-modal');
    if (!modal) return;
    const titleInput   = document.getElementById('edit-ann-title');
    const messageInput = document.getElementById('edit-ann-message');
    const idInput      = document.getElementById('edit-ann-id');
    if (titleInput)   titleInput.value   = n.title   || '';
    if (messageInput) messageInput.value = n.message || '';
    if (idInput)      idInput.value      = id;
    // Set type
    const typeBtn = modal.querySelector(`.ann-type-btn[data-type="${n.type||'general'}"]`);
    if (typeBtn) {
      modal.querySelectorAll('.ann-type-btn').forEach(b => b.classList.remove('active'));
      typeBtn.classList.add('active');
    }
    Modal.open('edit-ann-modal');
  }).catch(() => Toast.error('Failed to load announcement.'));
}

// Edit form submission
document.addEventListener('DOMContentLoaded', () => {
  const editForm = document.getElementById('edit-ann-form');
  if (!editForm) return;

  // Type selection in edit modal
  editForm.querySelectorAll?.('.ann-type-btn')?.forEach(btn => {
    btn.addEventListener('click', () => {
      editForm.querySelectorAll('.ann-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id      = document.getElementById('edit-ann-id')?.value;
    const title   = document.getElementById('edit-ann-title')?.value.trim();
    const message = document.getElementById('edit-ann-message')?.value.trim();
    const typeBtn = document.querySelector('#edit-ann-modal .ann-type-btn.active');
    const type    = typeBtn ? typeBtn.dataset.type : 'general';
    if (!id || !title || !message) { Toast.warning('Fill in all fields.'); return; }
    const btn = editForm.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
    try {
      await db.ref(`announcements/${id}`).update({ title, message, type, updatedAt: Date.now() });
      Toast.success('Announcement updated!');
      Modal.close('edit-ann-modal');
      loadAnnouncements();
    } catch { Toast.error('Failed to update announcement.'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Changes'; }
  });
});

/* ---------- Helpers ---------- */
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
