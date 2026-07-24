// ============================================================
// DREXORA SCHOOL PORTAL — Admin Dashboard JS
// ============================================================

let adminUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user } = await requireAdmin();
    adminUser = user;
    loadDashboardStats();
    loadRecentStudents();
    loadRecentAnnouncements();
    SidebarManager.init();
    updateAdminSidebar(user);
    initLogout();
  } catch (err) {
    console.error('Admin dashboard error:', err);
  }
});

/* ---------- Dashboard Stats ---------- */
async function loadDashboardStats() {
  try {
    const [studentsSnap, announcementsSnap] = await Promise.all([
      db.ref('students').get(),
      db.ref('announcements').get()
    ]);

    const studentCount = studentsSnap.exists() ? Object.keys(studentsSnap.val()).length : 0;
    const announcCount = announcementsSnap.exists() ? Object.keys(announcementsSnap.val()).length : 0;

    // Count students with results
    let resultsCount = 0;
    if (studentsSnap.exists()) {
      Object.values(studentsSnap.val()).forEach(s => {
        if (s.results) resultsCount++;
      });
    }

    setEl('stat-students', studentCount);
    setEl('stat-results',  resultsCount);
    setEl('stat-announcements', announcCount);

    // Animate
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = parseInt(el.dataset.counter);
      if (!isNaN(target)) animateCounter(el, target);
    });
  } catch (err) {
    console.error('Stats error:', err);
  }
}

/* ---------- Recent Students ---------- */
async function loadRecentStudents() {
  const container = document.getElementById('recent-students-table');
  if (!container) return;
  try {
    const snap = await db.ref('students').get();
    if (!snap.exists()) {
      container.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No students registered.</td></tr>';
      return;
    }
    const students = [];
    snap.forEach(c => students.push({ uid: c.key, ...c.val() }));
    students.sort((a,b) => (b.profile?.createdAt||0) - (a.profile?.createdAt||0));
    const recent = students.slice(0, 8);
    container.innerHTML = recent.map(s => {
      const p = s.profile || {};
      return `
        <tr>
          <td>
            <div class="flex" style="align-items:center;gap:.6rem">
              ${p.photo
                ? `<img src="${escapeHtml(p.photo)}" class="avatar avatar-sm" alt="">`
                : `<div class="avatar avatar-sm avatar-placeholder" style="width:36px;height:36px;font-size:.75rem">${getInitials(p.fullname)}</div>`
              }
              <span class="fw-700">${escapeHtml(p.fullname || '—')}</span>
            </div>
          </td>
          <td>${escapeHtml(p.admissionNo || '—')}</td>
          <td>${escapeHtml(p.class || '—')}</td>
          <td>${escapeHtml(p.gender || '—')}</td>
          <td>
            <a href="students.html" class="btn btn-sm btn-outline"><i class="fas fa-eye"></i></a>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    console.error('Recent students error:', err);
    container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load.</td></tr>';
  }
}

/* ---------- Recent Announcements ---------- */
async function loadRecentAnnouncements() {
  const container = document.getElementById('recent-announcements');
  if (!container) return;
  try {
    const snap = await db.ref('announcements').orderByChild('timestamp').limitToLast(4).get();
    if (!snap.exists()) {
      container.innerHTML = '<p class="text-muted text-center">No announcements yet.</p>';
      return;
    }
    const items = [];
    snap.forEach(c => items.unshift({ id: c.key, ...c.val() }));
    container.innerHTML = items.map(n => `
      <div class="notif-card ${escapeHtml(n.type||'general')}">
        <div class="notif-title">${escapeHtml(n.title||'Announcement')}</div>
        <div class="notif-body" style="font-size:.8rem">${escapeHtml((n.message||'').substring(0,120))}${(n.message||'').length > 120 ? '…' : ''}</div>
        <div class="notif-meta"><span><i class="fas fa-clock"></i> ${Format.date(n.timestamp)}</span></div>
      </div>`).join('');
  } catch (err) {
    console.error('Announcements error:', err);
  }
}

/* ---------- Helpers ---------- */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

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
