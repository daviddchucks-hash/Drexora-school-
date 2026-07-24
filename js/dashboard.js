// ============================================================
// DREXORA SCHOOL PORTAL — Student Dashboard JS
// ============================================================

let currentUser = null;
let studentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user, profile } = await requireAuth();
    currentUser = user;
    studentProfile = profile;
    renderDashboard(user, profile);
    loadRecentResults(user.uid);
    loadNotifications();
    SidebarManager.init();
  } catch (err) {
    console.error('Dashboard error:', err);
  }
});

/* ---------- Render Dashboard ---------- */
function renderDashboard(user, profile) {
  if (!profile) {
    // Profile not set up
    document.getElementById('profile-incomplete').classList.remove('d-none');
    return;
  }

  // Topbar greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (profile.fullname || '').split(' ')[0];
  setEl('topbar-greeting', `${greeting}, ${firstName}!`);
  setEl('topbar-title', `${greeting}, ${firstName}!`);

  // Profile card
  renderProfileCard(user, profile);

  // Sidebar user pill
  const pillName  = document.getElementById('sidebar-user-name');
  const pillRole  = document.getElementById('sidebar-user-role');
  const pillPhoto = document.getElementById('sidebar-user-photo');
  if (pillName)  pillName.textContent  = profile.fullname || 'Student';
  if (pillRole)  pillRole.textContent  = profile.class    || 'Student';
  if (pillPhoto && profile.photo) {
    pillPhoto.outerHTML = `<img src="${profile.photo}" alt="avatar" class="user-pill-avatar avatar-sm">`;
  } else if (pillPhoto) {
    pillPhoto.textContent = getInitials(profile.fullname);
  }
}

/* ---------- Profile Card ---------- */
function renderProfileCard(user, profile) {
  const photoEl = document.getElementById('profile-photo');
  if (photoEl) {
    if (profile.photo) {
      photoEl.innerHTML = `<img src="${profile.photo}" alt="Passport Photo" class="avatar avatar-lg">`;
    } else {
      photoEl.innerHTML = `
        <div class="avatar avatar-lg avatar-placeholder">
          ${getInitials(profile.fullname)}
        </div>`;
    }
  }

  setEl('profile-fullname',    profile.fullname    || '—');
  setEl('profile-admission',   profile.admissionNo || '—');
  setEl('profile-class',       profile.class       || '—');
  setEl('profile-gender',      profile.gender      || '—');
  setEl('profile-dob',         profile.dob         || '—');
  setEl('profile-email',       user.email          || profile.email || '—');
  setEl('profile-parent',      profile.parent      || '—');
  setEl('profile-phone',       profile.phone       || '—');
}

/* ---------- Load Recent Results ---------- */
async function loadRecentResults(uid) {
  const container = document.getElementById('recent-results');
  if (!container) return;
  try {
    const snap = await db.ref(`students/${uid}/results`).get();
    if (!snap.exists()) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-chart-bar"></i>
          <h3>No Results Yet</h3>
          <p>Your academic results will appear here once uploaded by admin.</p>
        </div>`;
      return;
    }
    const data = snap.val();
    // Get the latest session/term
    const sessions = Object.keys(data).sort().reverse();
    if (!sessions.length) { container.innerHTML = '<p class="text-muted text-center mt-2">No results.</p>'; return; }
    const latestSession = sessions[0];
    const terms = Object.keys(data[latestSession]).sort();
    const latestTerm = terms[terms.length - 1];
    const subjects = data[latestSession][latestTerm] || {};
    const rows = Object.entries(subjects).map(([subj, scores]) => {
      const total = parseFloat(scores.total || scores.score || 0);
      return `
        <tr>
          <td>${escapeHtml(subj)}</td>
          <td>${escapeHtml(scores.ca || '—')}</td>
          <td>${escapeHtml(scores.exam || '—')}</td>
          <td class="fw-700">${total || '—'}</td>
          <td><span class="badge ${Format.gradeColor(total)}">${Format.grade(total)}</span></td>
          <td>${escapeHtml(scores.remark || Format.remark(total))}</td>
        </tr>`;
    }).join('');
    container.innerHTML = `
      <div class="flex-between mb-2">
        <h4>${escapeHtml(latestSession)} — ${escapeHtml(latestTerm)}</h4>
        <a href="results.html" class="btn btn-sm btn-outline"><i class="fas fa-eye"></i> View All</a>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" class="text-center text-muted">No subjects.</td></tr>'}</tbody>
        </table>
      </div>`;

    // Update stat card
    const scores = Object.values(subjects).map(s => parseFloat(s.total || s.score || 0)).filter(n => !isNaN(n));
    if (scores.length) {
      const avg = (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1);
      setEl('stat-avg', avg);
      setEl('stat-subjects', scores.length);
    }
    setEl('stat-session', `${latestSession} ${latestTerm}`);
  } catch (err) {
    console.error('Results error:', err);
    container.innerHTML = '<p class="text-muted text-center mt-2">Failed to load results.</p>';
  }
}

/* ---------- Load Notifications ---------- */
async function loadNotifications() {
  try {
    const snap = await db.ref('announcements').orderByChild('timestamp').limitToLast(5).get();
    if (!snap.exists()) return;
    const el = document.getElementById('notif-dot');
    if (el) el.style.display = 'block';
    const notifs = [];
    snap.forEach(c => notifs.unshift(c.val()));
    const container = document.getElementById('recent-notifications');
    if (!container) return;
    container.innerHTML = notifs.map(n => `
      <div class="notif-card ${n.type || 'general'}">
        <div class="notif-title">${escapeHtml(n.title || 'Announcement')}</div>
        <div class="notif-body">${escapeHtml(n.message || '')}</div>
        <div class="notif-meta">
          <span><i class="fas fa-clock"></i> ${Format.date(n.timestamp)}</span>
          ${n.type ? `<span class="badge badge-primary">${escapeHtml(n.type)}</span>` : ''}
        </div>
      </div>`).join('');
  } catch (err) {
    console.error('Notifications error:', err);
  }
}

/* ---------- Helper ---------- */
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
