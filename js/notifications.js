// ============================================================
// DREXORA SCHOOL PORTAL — Notifications Page JS
// ============================================================

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user, profile } = await requireAuth();
    currentUser = user;
    updateSidebarUser(profile);
    SidebarManager.init();
    loadAllNotifications();
    initSearch();
  } catch (err) {
    console.error('Notifications page error:', err);
  }
});

/* ---------- Load Notifications ---------- */
async function loadAllNotifications(filter = '') {
  const container = document.getElementById('notifications-container');
  const countEl   = document.getElementById('notif-count');
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton" style="height:80px;margin-bottom:1rem"></div>
    <div class="skeleton" style="height:80px;margin-bottom:1rem"></div>
    <div class="skeleton" style="height:80px"></div>`;

  try {
    const snap = await db.ref('announcements').orderByChild('timestamp').get();
    if (!snap.exists()) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-bell-slash"></i>
          <h3>No Announcements</h3>
          <p>School announcements will appear here. Check back later.</p>
        </div>`;
      if (countEl) countEl.textContent = '0';
      return;
    }

    const items = [];
    snap.forEach(child => items.unshift({ id: child.key, ...child.val() }));

    const filtered = filter
      ? items.filter(n =>
          (n.title||'').toLowerCase().includes(filter) ||
          (n.message||'').toLowerCase().includes(filter))
      : items;

    if (countEl) countEl.textContent = filtered.length;

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>No Results</h3>
          <p>No announcements match your search.</p>
        </div>`;
      return;
    }

    const typeIcons = {
      urgent:  'fas fa-exclamation-circle',
      info:    'fas fa-info-circle',
      general: 'fas fa-bullhorn',
      event:   'fas fa-calendar-alt',
    };

    container.innerHTML = filtered.map(n => `
      <div class="notif-card ${escapeHtml(n.type || 'general')} animate-in">
        <div class="flex-between mb-1">
          <div class="notif-title">
            <i class="${typeIcons[n.type] || typeIcons.general} mr-1" style="color:var(--primary)"></i>
            ${escapeHtml(n.title || 'School Announcement')}
          </div>
          <span class="badge ${getTypeBadge(n.type)}">${escapeHtml(n.type || 'general')}</span>
        </div>
        <div class="notif-body">${escapeHtml(n.message || '')}</div>
        <div class="notif-meta">
          <span><i class="fas fa-clock"></i> ${Format.date(n.timestamp)}</span>
          ${n.postedBy ? `<span><i class="fas fa-user"></i> ${escapeHtml(n.postedBy)}</span>` : ''}
        </div>
      </div>`).join('');
  } catch (err) {
    console.error('Load notifications error:', err);
    container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>Failed to load announcements.</p></div>`;
  }
}

/* ---------- Search ---------- */
function initSearch() {
  const searchInput = document.getElementById('notif-search');
  if (!searchInput) return;
  searchInput.addEventListener('input', debounce(() => {
    loadAllNotifications(searchInput.value.trim().toLowerCase());
  }, 350));
}

/* ---------- Type Badge ---------- */
function getTypeBadge(type) {
  const map = { urgent:'badge-danger', info:'badge-primary', general:'badge-success', event:'badge-gold' };
  return map[type] || 'badge-primary';
}

/* ---------- Sidebar User ---------- */
function updateSidebarUser(profile) {
  if (!profile) return;
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
