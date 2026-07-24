// ============================================================
// DREXORA SCHOOL PORTAL — Student Results Page JS
// ============================================================

let currentUser = null;
let allResultsData = {};
let currentSession = null;
let currentTerm = null;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { user, profile } = await requireAuth();
    currentUser = user;
    currentProfile = profile;
    await loadResults(user.uid);
    SidebarManager.init();
    updateSidebarUser(profile);
    initPDFDownload();
    initPrintBtn();
  } catch (err) {
    console.error('Results page error:', err);
  }
});

/* ---------- Load Results ---------- */
async function loadResults(uid) {
  const container = document.getElementById('results-container');
  const sessionSelect = document.getElementById('session-select');
  const termSelect    = document.getElementById('term-select');

  try {
    Spinner.show();
    const snap = await db.ref(`students/${uid}/results`).get();
    Spinner.hide();

    if (!snap.exists()) {
      if (container) container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-graduation-cap"></i>
          <h3>No Results Available</h3>
          <p>Your academic results have not been uploaded yet. Contact your class teacher or administrator.</p>
        </div>`;
      return;
    }

    allResultsData = snap.val();
    const sessions = Object.keys(allResultsData).sort().reverse();

    // Populate session dropdown
    if (sessionSelect) {
      sessionSelect.innerHTML = sessions.map(s =>
        `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`
      ).join('');
      sessionSelect.addEventListener('change', () => {
        currentSession = sessionSelect.value;
        populateTerms(currentSession, termSelect);
      });
    }

    currentSession = sessions[0];
    populateTerms(currentSession, termSelect);

    if (termSelect) {
      termSelect.addEventListener('change', () => {
        currentTerm = termSelect.value;
        renderResults(currentSession, currentTerm);
      });
    }
  } catch (err) {
    Spinner.hide();
    console.error('Load results error:', err);
    Toast.error('Failed to load results.');
  }
}

/* ---------- Populate Terms ---------- */
function populateTerms(session, termSelect) {
  if (!allResultsData[session]) return;
  const terms = Object.keys(allResultsData[session]).sort();
  if (termSelect) {
    termSelect.innerHTML = terms.map(t =>
      `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
    ).join('');
  }
  currentTerm = terms[terms.length - 1];
  if (termSelect) termSelect.value = currentTerm;
  renderResults(session, currentTerm);
}

/* ---------- Render Results ---------- */
function renderResults(session, term) {
  const container = document.getElementById('results-container');
  if (!container || !allResultsData[session] || !allResultsData[session][term]) {
    if (container) container.innerHTML = '<p class="text-muted text-center mt-3">No data for this selection.</p>';
    return;
  }

  const data = allResultsData[session][term];
  const subjects = data.subjects || data;
  const meta     = data.meta || {};

  // Calculate stats
  const scoresList = Object.entries(subjects)
    .filter(([k]) => k !== 'meta')
    .map(([subj, s]) => ({
      subj,
      ca:    parseFloat(s.ca    || 0),
      exam:  parseFloat(s.exam  || 0),
      total: parseFloat(s.total || s.score || 0)
    }));

  const total  = scoresList.reduce((a, r) => a + r.total, 0);
  const count  = scoresList.length;
  const avg    = count ? (total / count).toFixed(1) : '0';
  const highest = count ? Math.max(...scoresList.map(s => s.total)) : 0;
  const lowest  = count ? Math.min(...scoresList.map(s => s.total)) : 0;

  // Update stat cards
  setEl('stat-total-subjects', count);
  setEl('stat-total-score',   total);
  setEl('stat-average',       avg);
  setEl('stat-position',      meta.position ? Format.position(meta.position) : '—');

  const rows = scoresList.map(({ subj, ca, exam, total: t }) => `
    <tr>
      <td class="fw-700">${escapeHtml(subj)}</td>
      <td>${ca || '—'}</td>
      <td>${exam || '—'}</td>
      <td class="fw-700">${t || '—'}</td>
      <td><span class="badge ${Format.gradeColor(t)}">${Format.grade(t)}</span></td>
      <td>${Format.remark(t)}</td>
    </tr>`).join('');

  container.innerHTML = `
    <div class="results-table-wrapper">
      <div class="table-wrapper">
        <table class="table" id="results-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>C.A. (40)</th>
              <th>Exam (60)</th>
              <th>Total (100)</th>
              <th>Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6" class="text-center text-muted">No subjects.</td></tr>'}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="fw-700">CUMULATIVE TOTAL</td>
              <td class="fw-700">${total}</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td colspan="3" class="fw-700">AVERAGE</td>
              <td class="fw-700">${avg}</td>
              <td><span class="badge ${Format.gradeColor(parseFloat(avg))}">${Format.grade(parseFloat(avg))}</span></td>
              <td>${Format.remark(parseFloat(avg))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="grid-2 mt-3">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-chalkboard-teacher"></i> Teacher's Comment</span></div>
          <div class="card-body" style="color:var(--text)">
            ${escapeHtml(meta.teacherComment || 'No comment provided.')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-user-tie"></i> Principal's Comment</span></div>
          <div class="card-body" style="color:var(--text)">
            ${escapeHtml(meta.principalComment || 'No comment provided.')}
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="grid-4">
          <div class="text-center">
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total Score</div>
          </div>
          <div class="text-center">
            <div class="stat-value">${avg}</div>
            <div class="stat-label">Average</div>
          </div>
          <div class="text-center">
            <div class="stat-value">${meta.position ? Format.position(meta.position) : '—'}</div>
            <div class="stat-label">Position in Class</div>
          </div>
          <div class="text-center">
            <div class="stat-value">${escapeHtml(meta.nextTermBegins || '—')}</div>
            <div class="stat-label">Next Term Begins</div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------- PDF Download ---------- */
function initPDFDownload() {
  const btn = document.getElementById('download-pdf-btn');
  if (!btn) return;
  btn.addEventListener('click', generatePDF);
}

async function generatePDF() {
  if (!allResultsData[currentSession] || !allResultsData[currentSession][currentTerm]) {
    Toast.warning('No result data to download.');
    return;
  }

  const btn = document.getElementById('download-pdf-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…';

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const data     = allResultsData[currentSession][currentTerm];
  const subjects = data.subjects || data;
  const meta     = data.meta || {};
  const profile  = currentProfile || {};
  const W = 210, H = 297, margin = 15;

  // ---- Header Band ----
  doc.setFillColor(13, 43, 110);
  doc.rect(0, 0, W, 42, 'F');

  doc.setFillColor(249, 168, 37);
  doc.rect(0, 40, W, 4, 'F');

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('DREXORA SCHOOL', W / 2, 16, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Excellence in Education', W / 2, 23, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT ACADEMIC REPORT CARD', W / 2, 33, { align: 'center' });

  // ---- Student Info Box ----
  let y = 52;
  doc.setTextColor(30, 30, 30);
  doc.setFillColor(240, 244, 248);
  doc.rect(margin, y, W - 2*margin, 40, 'F');
  doc.setDrawColor(21, 101, 192);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, W - 2*margin, 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const col1 = margin + 5, col2 = W/2 + 5;
  const infoRows = [
    ['Full Name:', profile.fullname || '—',       'Admission No:', profile.admissionNo || '—'],
    ['Class:',    profile.class    || '—',       'Gender:',       profile.gender      || '—'],
    ['Session:',  currentSession,                  'Term:',         currentTerm],
    ['Position:', meta.position ? Format.position(meta.position) : '—', 'Date of Birth:', profile.dob || '—'],
  ];
  infoRows.forEach((row, i) => {
    const rowY = y + 8 + i * 8;
    doc.setFont('helvetica', 'bold');
    doc.text(row[0], col1, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(row[1]), col1 + 28, rowY);
    doc.setFont('helvetica', 'bold');
    doc.text(row[2], col2, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(row[3]), col2 + 28, rowY);
  });

  // ---- Results Table ----
  y += 48;
  const cols = { subj: margin, ca: 90, exam: 115, total: 140, grade: 162, remark: 175 };
  const colWidths = { subj: 72, ca: 20, exam: 20, total: 18, grade: 12, remark: 30 };

  // Table header
  doc.setFillColor(13, 43, 110);
  doc.rect(margin, y, W - 2*margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SUBJECT',  cols.subj  + 2, y + 5.5);
  doc.text('C.A.(40)', cols.ca,        y + 5.5);
  doc.text('EXAM(60)', cols.exam,       y + 5.5);
  doc.text('TOTAL',    cols.total,      y + 5.5);
  doc.text('GRADE',    cols.grade,      y + 5.5);
  doc.text('REMARK',   cols.remark,     y + 5.5);
  y += 8;

  const scoresList = Object.entries(subjects)
    .filter(([k]) => k !== 'meta')
    .map(([subj, s]) => ({ subj, ca: s.ca||'—', exam: s.exam||'—', total: parseFloat(s.total||s.score||0) }));

  scoresList.forEach((row, i) => {
    const bg = i % 2 === 0 ? [255,255,255] : [245,247,250];
    doc.setFillColor(...bg);
    doc.rect(margin, y, W - 2*margin, 7, 'F');
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(String(row.subj), cols.subj + 2, y + 5);
    doc.text(String(row.ca),   cols.ca,       y + 5);
    doc.text(String(row.exam), cols.exam,      y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(String(row.total), cols.total,    y + 5);
    const grade = Format.grade(row.total);
    const gradeColors = { A:[22,163,74], B:[21,101,192], C:[217,119,6], D:[249,115,22], E:[239,68,68], F:[220,38,38] };
    const gc = gradeColors[grade] || [100,100,100];
    doc.setTextColor(...gc);
    doc.text(grade, cols.grade, y + 5);
    doc.setTextColor(30,30,30);
    doc.setFont('helvetica', 'normal');
    doc.text(Format.remark(row.total), cols.remark, y + 5);
    y += 7;
  });

  // Summary rows
  const totScore = scoresList.reduce((a,r) => a + r.total, 0);
  const avg = scoresList.length ? (totScore / scoresList.length).toFixed(1) : 0;
  doc.setFillColor(13,43,110);
  doc.rect(margin, y, W - 2*margin, 7, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica', 'bold');
  doc.text('CUMULATIVE TOTAL', cols.subj + 2, y + 5);
  doc.text(String(totScore), cols.total, y + 5);
  y += 7;
  doc.setFillColor(249,168,37);
  doc.rect(margin, y, W - 2*margin, 7, 'F');
  doc.setTextColor(13,43,110);
  doc.text('AVERAGE', cols.subj + 2, y + 5);
  doc.text(String(avg), cols.total, y + 5);
  doc.text(Format.grade(parseFloat(avg)), cols.grade, y + 5);
  doc.text(Format.remark(parseFloat(avg)), cols.remark, y + 5);
  y += 14;

  // ---- Comments ----
  doc.setTextColor(30,30,30);
  doc.setFillColor(240,244,248);
  doc.rect(margin, y, W - 2*margin, 22, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text("TEACHER'S COMMENT:", margin + 2, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.teacherComment || 'Keep up the good work.', margin + 42, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text("PRINCIPAL'S COMMENT:", margin + 2, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(meta.principalComment || 'Approved.', margin + 45, y + 15);
  y += 30;

  // ---- Footer ----
  doc.setFillColor(13,43,110);
  doc.rect(0, H - 18, W, 18, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Drexora School — Academic Excellence Portal', W/2, H - 10, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString()}`, W/2, H - 4, { align: 'center' });

  const fname = (profile.fullname || 'Student').replace(/\s+/g, '_');
  doc.save(`Drexora_Result_${fname}_${currentSession}_${currentTerm}.pdf`);
  Toast.success('Result card downloaded as PDF!');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
}

/* ---------- Print ---------- */
function initPrintBtn() {
  const btn = document.getElementById('print-btn');
  if (btn) btn.addEventListener('click', () => window.print());
}

/* ---------- Helper ---------- */
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

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
