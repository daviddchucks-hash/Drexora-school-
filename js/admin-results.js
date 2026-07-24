// ============================================================
// DREXORA SCHOOL PORTAL — Admin: Manage Results JS
// ============================================================

let adminUser = null;
let allStudents = [];
let currentSubjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user } = await requireAdmin();
    adminUser = user;
    SidebarManager.init();
    updateAdminSidebar(user);
    loadStudentDropdown();
    initResultsForm();
    initViewResults();
    initLogout();
  } catch (err) {
    console.error('Admin results error:', err);
  }
});

/* ---------- Load Students into Dropdown ---------- */
async function loadStudentDropdown() {
  const select = document.getElementById('result-student-select');
  if (!select) return;
  try {
    const snap = await db.ref('students').get();
    allStudents = [];
    if (snap.exists()) {
      snap.forEach(c => allStudents.push({ uid: c.key, ...c.val() }));
    }
    select.innerHTML = `<option value="">— Select Student —</option>` +
      allStudents.map(s => {
        const p = s.profile || {};
        return `<option value="${s.uid}">${escapeHtml(p.fullname || s.uid)} (${escapeHtml(p.admissionNo || '')})</option>`;
      }).join('');

    // Also populate view dropdown
    const viewSelect = document.getElementById('view-student-select');
    if (viewSelect) {
      viewSelect.innerHTML = select.innerHTML;
      viewSelect.addEventListener('change', () => loadStudentResults(viewSelect.value));
    }
  } catch (err) {
    console.error('Student dropdown error:', err);
  }
}

/* ---------- Add Subject Row ---------- */
function addSubjectRow(subjectName = '', ca = '', exam = '', remark = '') {
  const container = document.getElementById('subjects-container');
  if (!container) return;
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className = 'subject-entry';
  div.dataset.idx = idx;
  div.innerHTML = `
    <input type="text" class="form-control subj-name" placeholder="Subject name" value="${escapeHtml(subjectName)}" required>
    <input type="number" class="form-control subj-ca" placeholder="C.A. (0-40)" min="0" max="40" step="0.5" value="${ca}">
    <input type="number" class="form-control subj-exam" placeholder="Exam (0-60)" min="0" max="60" step="0.5" value="${exam}">
    <input type="text" class="form-control subj-total" placeholder="Total" readonly>
    <button type="button" class="btn btn-sm btn-danger btn-icon" onclick="removeSubjectRow(this)"><i class="fas fa-times"></i></button>`;

  // Auto-calculate total
  const caInput   = div.querySelector('.subj-ca');
  const examInput = div.querySelector('.subj-exam');
  const totalInput = div.querySelector('.subj-total');
  const calcTotal = () => {
    const c = parseFloat(caInput.value) || 0;
    const e = parseFloat(examInput.value) || 0;
    totalInput.value = (c + e).toFixed(1);
  };
  caInput.addEventListener('input', calcTotal);
  examInput.addEventListener('input', calcTotal);
  if (ca || exam) calcTotal();

  container.appendChild(div);
  return div;
}

function removeSubjectRow(btn) {
  btn.closest('.subject-entry').remove();
}

/* ---------- Results Form ---------- */
function initResultsForm() {
  const form = document.getElementById('upload-results-form');
  if (!form) return;

  // Add subject button
  const addBtn = document.getElementById('add-subject-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => addSubjectRow());
    // Add default rows
    ['English Language','Mathematics','Basic Science','Social Studies','Civic Education'].forEach(s => addSubjectRow(s));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uid = document.getElementById('result-student-select')?.value;
    if (!uid) { Toast.warning('Select a student.'); return; }

    const session = document.getElementById('result-session')?.value.trim();
    const term    = document.getElementById('result-term')?.value;
    if (!session || !term) { Toast.warning('Fill in session and term.'); return; }

    const rows = document.querySelectorAll('.subject-entry');
    if (!rows.length) { Toast.warning('Add at least one subject.'); return; }

    // Collect subjects
    const subjects = {};
    let valid = true;
    rows.forEach(row => {
      const name  = row.querySelector('.subj-name')?.value.trim();
      const ca    = parseFloat(row.querySelector('.subj-ca')?.value) || 0;
      const exam  = parseFloat(row.querySelector('.subj-exam')?.value) || 0;
      const total = parseFloat(row.querySelector('.subj-total')?.value) || ca + exam;
      if (!name) { valid = false; return; }
      subjects[name] = { ca, exam, total };
    });
    if (!valid) { Toast.warning('All subjects must have a name.'); return; }

    const position       = parseInt(document.getElementById('result-position')?.value) || null;
    const nextTermBegins = document.getElementById('result-next-term')?.value.trim() || '';
    const teacherComment = document.getElementById('result-teacher-comment')?.value.trim() || '';
    const principalComment = document.getElementById('result-principal-comment')?.value.trim() || '';

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';
    try {
      await db.ref(`students/${uid}/results/${session}/${term}`).set({
        subjects,
        meta: { position, nextTermBegins, teacherComment, principalComment, uploadedAt: Date.now() }
      });
      Toast.success('Results uploaded successfully!');
      form.reset();
      document.getElementById('subjects-container').innerHTML = '';
      ['English Language','Mathematics','Basic Science','Social Studies','Civic Education'].forEach(s => addSubjectRow(s));
    } catch (err) {
      Toast.error('Failed to upload results.');
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-upload"></i> Upload Results';
    }
  });
}

/* ---------- View/Edit Results ---------- */
function initViewResults() {
  const viewForm = document.getElementById('view-results-form');
  if (!viewForm) return;
}

async function loadStudentResults(uid) {
  const container = document.getElementById('view-results-container');
  if (!container || !uid) return;
  container.innerHTML = `<div class="skeleton" style="height:60px;margin-bottom:1rem"></div><div class="skeleton" style="height:200px"></div>`;
  try {
    const snap = await db.ref(`students/${uid}/results`).get();
    if (!snap.exists()) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><h3>No Results</h3><p>No results uploaded for this student.</p></div>`;
      return;
    }
    const data = snap.val();
    const sessions = Object.keys(data).sort().reverse();
    let html = '';
    sessions.forEach(session => {
      const terms = Object.keys(data[session]).sort();
      terms.forEach(term => {
        const tData = data[session][term];
        const subjects = tData.subjects || tData;
        const meta = tData.meta || {};
        const rows = Object.entries(subjects).filter(([k]) => k !== 'meta').map(([subj, s]) => {
          const total = parseFloat(s.total || s.score || 0);
          return `
            <tr>
              <td>${escapeHtml(subj)}</td>
              <td>${s.ca || '—'}</td>
              <td>${s.exam || '—'}</td>
              <td class="fw-700">${total || '—'}</td>
              <td><span class="badge ${Format.gradeColor(total)}">${Format.grade(total)}</span></td>
              <td>
                <button class="btn btn-sm btn-danger btn-icon" onclick="deleteResult('${uid}','${escapeHtml(session)}','${escapeHtml(term)}','${escapeHtml(subj)}')">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>`;
        }).join('');
        html += `
          <div class="card mb-2">
            <div class="card-header">
              <span class="card-title">${escapeHtml(session)} — ${escapeHtml(term)}</span>
              <div class="flex gap-1">
                <span class="badge badge-primary">${Object.keys(subjects).filter(k=>k!=='meta').length} subjects</span>
                <button class="btn btn-sm btn-danger" onclick="deleteTerm('${uid}','${escapeHtml(session)}','${escapeHtml(term)}')">
                  <i class="fas fa-trash"></i> Delete Term
                </button>
              </div>
            </div>
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>Subject</th><th>C.A.</th><th>Exam</th><th>Total</th><th>Grade</th><th>Action</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6" class="text-center text-muted">No subjects.</td></tr>'}</tbody>
              </table>
            </div>
            <div class="mt-2" style="font-size:.82rem;color:var(--text-muted)">
              <b>Position:</b> ${meta.position ? Format.position(meta.position) : '—'} &nbsp;
              <b>Teacher:</b> ${escapeHtml(meta.teacherComment || '—')} &nbsp;
              <b>Principal:</b> ${escapeHtml(meta.principalComment || '—')}
            </div>
          </div>`;
      });
    });
    container.innerHTML = html || '<p class="text-muted text-center">No results.</p>';
  } catch (err) {
    console.error('Load student results error:', err);
    container.innerHTML = '<p class="text-danger text-center">Failed to load results.</p>';
  }
}

/* ---------- Delete Result / Term ---------- */
async function deleteResult(uid, session, term, subject) {
  if (!confirm(`Delete "${subject}" from ${session} ${term}?`)) return;
  try {
    await db.ref(`students/${uid}/results/${session}/${term}/subjects/${subject}`).remove();
    Toast.success('Subject deleted.');
    loadStudentResults(uid);
  } catch { Toast.error('Failed to delete subject.'); }
}

async function deleteTerm(uid, session, term) {
  if (!confirm(`Delete ALL results for ${session} ${term}? This cannot be undone.`)) return;
  try {
    await db.ref(`students/${uid}/results/${session}/${term}`).remove();
    Toast.success(`${session} ${term} results deleted.`);
    loadStudentResults(uid);
  } catch { Toast.error('Failed to delete term results.'); }
}

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
