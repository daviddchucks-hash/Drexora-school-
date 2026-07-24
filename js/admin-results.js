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
    await loadAllStudents();
    initClassFilters();
    initResultsForm();
    initViewResults();
    initLogout();
  } catch (err) {
    console.error('Admin results error:', err);
  }
});

/* ---------- Load All Students ---------- */
async function loadAllStudents() {
  try {
    const snap = await db.ref('students').get();
    allStudents = [];
    if (snap.exists()) {
      snap.forEach(c => {
        const val = c.val();
        // Guard: skip null/non-object entries
        if (val && typeof val === 'object') {
          allStudents.push({ uid: c.key, ...val });
        }
      });
    }

    if (!allStudents.length) {
      // Show a notice in both dropdowns
      ['result-student-select', 'view-student-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<option value="">— No students registered yet —</option>';
      });
    }
  } catch (err) {
    console.error('Load students error:', err);

    const isPermission = err.code === 'PERMISSION_DENIED' ||
                         (err.message && err.message.includes('PERMISSION_DENIED'));

    if (isPermission) {
      Toast.error(
        'Database permission denied. Publish database.rules.json to Firebase Console → Realtime Database → Rules.',
        8000
      );
      ['result-student-select', 'view-student-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<option value="">— Permission denied — see instructions —</option>';
      });
    } else {
      Toast.error('Failed to load students. Check your connection.');
    }
  }
}

/* ---------- Tab Switcher ---------- */
function switchTab(tab) {
  const uploadPanel = document.getElementById('panel-upload');
  const viewPanel   = document.getElementById('panel-view');
  const uploadTab   = document.getElementById('tab-upload');
  const viewTab     = document.getElementById('tab-view');
  if (!uploadPanel || !viewPanel) return;

  if (tab === 'upload') {
    uploadPanel.style.display = '';
    viewPanel.style.display   = 'none';
    if (uploadTab) uploadTab.style.borderBottom = '3px solid var(--primary)';
    if (viewTab)   viewTab.style.borderBottom   = '';
    if (uploadTab) uploadTab.style.color = 'var(--primary)';
    if (viewTab)   viewTab.style.color   = '';
  } else {
    uploadPanel.style.display = 'none';
    viewPanel.style.display   = '';
    if (viewTab)   viewTab.style.borderBottom   = '3px solid var(--primary)';
    if (uploadTab) uploadTab.style.borderBottom = '';
    if (viewTab)   viewTab.style.color   = 'var(--primary)';
    if (uploadTab) uploadTab.style.color = '';
  }
}

/* ---------- Class Filters ---------- */
function initClassFilters() {
  // Upload tab class filter
  const uploadClassFilter = document.getElementById('upload-class-filter');
  if (uploadClassFilter) {
    uploadClassFilter.addEventListener('change', () => {
      const cls = uploadClassFilter.value;
      const step2 = document.getElementById('upload-step2');
      if (!cls) {
        if (step2) step2.style.display = 'none';
        return;
      }
      if (step2) step2.style.display = '';
      populateStudentDropdown('result-student-select', cls);
    });
  }

  // View tab class filter
  const viewClassFilter = document.getElementById('view-class-filter');
  if (viewClassFilter) {
    viewClassFilter.addEventListener('change', () => {
      const cls = viewClassFilter.value;
      populateStudentDropdown('view-student-select', cls);
      // Clear results when class changes
      const container = document.getElementById('view-results-container');
      if (container) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Select a Student</h3><p>Choose a student above to view and manage their results.</p></div>`;
      }
    });
  }

  // View tab student selection
  const viewSelect = document.getElementById('view-student-select');
  if (viewSelect) {
    viewSelect.addEventListener('change', () => {
      if (viewSelect.value) loadStudentResults(viewSelect.value);
    });
  }
}

/* ---------- Populate Student Dropdown by Class ---------- */
function populateStudentDropdown(selectId, classFilter) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const filtered = classFilter
    ? allStudents.filter(s => (s.profile?.class || '') === classFilter)
    : allStudents;

  if (!filtered.length) {
    select.innerHTML = classFilter
      ? `<option value="">— No students in ${escapeHtml(classFilter)} —</option>`
      : `<option value="">— No students registered yet —</option>`;
    return;
  }

  select.innerHTML = `<option value="">— Select Student —</option>` +
    filtered.map(s => {
      const p = s.profile || {};
      const name = p.fullname || s.uid;
      const adm  = p.admissionNo ? ` (${p.admissionNo})` : '';
      return `<option value="${escapeHtml(s.uid)}">${escapeHtml(name)}${escapeHtml(adm)}</option>`;
    }).join('');
}

/* ---------- Firebase Key Sanitiser ---------- */
// Firebase keys cannot contain . # $ / [ ]
// We replace each with a short token and also store displayName in the value.
function sanitizeKey(str) {
  return str
    .replace(/\./g,  '_dot_')
    .replace(/#/g,   '_hash_')
    .replace(/\$/g,  '_dollar_')
    .replace(/\//g,  '_slash_')
    .replace(/\[/g,  '_lbr_')
    .replace(/\]/g,  '_rbr_');
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
  const caInput    = div.querySelector('.subj-ca');
  const examInput  = div.querySelector('.subj-exam');
  const totalInput = div.querySelector('.subj-total');
  const calcTotal  = () => {
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

/* ---------- Get Default Subjects by Class ---------- */
function getDefaultSubjects(cls) {
  if (!cls) return ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Civic Education'];
  if (cls.startsWith('JSS')) {
    return ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Civic Education', 'Basic Technology', 'Home Economics', 'Agricultural Science', 'Computer Studies'];
  }
  if (cls.includes('Science')) {
    return ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Further Mathematics'];
  }
  if (cls.includes('Arts')) {
    return ['English Language', 'Mathematics', 'Literature in English', 'Government', 'Christian/Islamic Religious Studies', 'Economics'];
  }
  if (cls.includes('Commercial')) {
    return ['English Language', 'Mathematics', 'Commerce', 'Economics', 'Financial Accounting', 'Office Practice', 'Computer Studies'];
  }
  return ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Civic Education'];
}

/* ---------- Results Form ---------- */
function initResultsForm() {
  const form = document.getElementById('upload-results-form');
  if (!form) return;

  // Add subject button
  const addBtn = document.getElementById('add-subject-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => addSubjectRow());
  }

  // When a student is selected in upload tab, pre-populate subjects from their profile
  const studentSelect = document.getElementById('result-student-select');
  if (studentSelect) {
    studentSelect.addEventListener('change', () => {
      const uid = studentSelect.value;
      const student = allStudents.find(s => s.uid === uid);
      const container = document.getElementById('subjects-container');
      if (!container) return;

      // Get their subjects from profile or fall back to class defaults
      let subjects = [];
      if (student?.profile?.subjects && Array.isArray(student.profile.subjects)) {
        subjects = student.profile.subjects;
      } else {
        const cls = document.getElementById('upload-class-filter')?.value || '';
        subjects = getDefaultSubjects(cls);
      }

      container.innerHTML = '';
      subjects.forEach(s => addSubjectRow(s));
    });
  }

  // Reset button
  const resetBtn = document.getElementById('reset-upload-form');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      const container = document.getElementById('subjects-container');
      if (container) container.innerHTML = '';
      const step2 = document.getElementById('upload-step2');
      if (step2) step2.style.display = 'none';
    });
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

    // Collect subjects — sanitize names for Firebase keys, store original as displayName
    const subjects = {};
    let valid = true;
    rows.forEach(row => {
      const name  = row.querySelector('.subj-name')?.value.trim();
      const ca    = parseFloat(row.querySelector('.subj-ca')?.value) || 0;
      const exam  = parseFloat(row.querySelector('.subj-exam')?.value) || 0;
      const total = parseFloat(row.querySelector('.subj-total')?.value) || ca + exam;
      if (!name) { valid = false; return; }
      const key = sanitizeKey(name);
      subjects[key] = { ca, exam, total, displayName: name };
    });
    if (!valid) { Toast.warning('All subjects must have a name.'); return; }

    const position         = parseInt(document.getElementById('result-position')?.value) || null;
    const nextTermBegins   = document.getElementById('result-next-term')?.value.trim() || '';
    const teacherComment   = document.getElementById('result-teacher-comment')?.value.trim() || '';
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
      const container = document.getElementById('subjects-container');
      if (container) container.innerHTML = '';
      const step2 = document.getElementById('upload-step2');
      if (step2) step2.style.display = 'none';
    } catch (err) {
      console.error('Upload results error:', err);
      Toast.error('Failed to upload results. ' + (err.message || ''));
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-upload"></i> Upload Results';
    }
  });
}

/* ---------- View/Edit Results ---------- */
function initViewResults() {
  // Handled via initClassFilters -> viewSelect change event
}

async function loadStudentResults(uid) {
  const container = document.getElementById('view-results-container');
  if (!container || !uid) return;
  container.innerHTML = `<div class="skeleton" style="height:60px;margin-bottom:1rem"></div><div class="skeleton" style="height:200px"></div>`;
  try {
    const snap = await db.ref(`students/${uid}/results`).get();
    if (!snap.exists()) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><h3>No Results</h3><p>No results uploaded for this student yet.</p></div>`;
      return;
    }
    const data = snap.val();
    const sessions = Object.keys(data).sort().reverse();
    let html = '';
    sessions.forEach(session => {
      const terms = Object.keys(data[session]).sort();
      terms.forEach(term => {
        const tData    = data[session][term];
        const subjects = tData.subjects || tData;
        const meta     = tData.meta || {};
        const rows     = Object.entries(subjects).filter(([k]) => k !== 'meta').map(([key, s]) => {
          const total       = parseFloat(s.total || s.score || 0);
          // Use stored displayName if present (new uploads), fall back to raw key (legacy data)
          const displayName = s.displayName || key;
          return `
            <tr>
              <td>${escapeHtml(displayName)}</td>
              <td>${s.ca !== undefined ? s.ca : '—'}</td>
              <td>${s.exam !== undefined ? s.exam : '—'}</td>
              <td class="fw-700">${total || '—'}</td>
              <td><span class="badge ${Format.gradeColor(total)}">${Format.grade(total)}</span></td>
              <td>
                <button class="btn btn-sm btn-danger btn-icon" onclick="deleteResult('${escapeHtml(uid)}','${escapeHtml(session)}','${escapeHtml(term)}','${escapeHtml(key)}')">
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
                <button class="btn btn-sm btn-danger" onclick="deleteTerm('${escapeHtml(uid)}','${escapeHtml(session)}','${escapeHtml(term)}')">
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
    container.innerHTML = html || '<p class="text-muted text-center">No results found.</p>';
  } catch (err) {
    console.error('Load student results error:', err);
    container.innerHTML = '<p class="text-danger text-center">Failed to load results. Check your connection.</p>';
  }
}

/* ---------- Delete Result / Term ---------- */
async function deleteResult(uid, session, term, subject) {
  if (!confirm(`Delete "${subject}" from ${session} ${term}?`)) return;
  try {
    await db.ref(`students/${uid}/results/${session}/${term}/subjects/${subject}`).remove();
    Toast.success('Subject deleted.');
    loadStudentResults(uid);
  } catch (err) {
    console.error('Delete result error:', err);
    Toast.error('Failed to delete subject.');
  }
}

async function deleteTerm(uid, session, term) {
  if (!confirm(`Delete ALL results for ${session} ${term}? This cannot be undone.`)) return;
  try {
    await db.ref(`students/${uid}/results/${session}/${term}`).remove();
    Toast.success(`${session} ${term} results deleted.`);
    loadStudentResults(uid);
  } catch (err) {
    console.error('Delete term error:', err);
    Toast.error('Failed to delete term results.');
  }
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
