// ============================================================
// DREXORA SCHOOL PORTAL — Student Registration JS
// ============================================================

// Subject combinations per class type
const SUBJECT_SETS = {
  JSS: [
    'English Language', 'Mathematics', 'Basic Science', 'Social Studies',
    'Civic Education', 'Basic Technology', 'Home Economics',
    'Cultural & Creative Arts', 'Agricultural Science', 'Computer Studies',
    'French Language', 'Islamic/Christian Religious Studies', 'Physical & Health Education'
  ],
  'SS Science': [
    'English Language', 'Mathematics', 'Physics', 'Chemistry',
    'Biology', 'Further Mathematics', 'Agricultural Science',
    'Computer Studies', 'Technical Drawing', 'Physical & Health Education'
  ],
  'SS Arts': [
    'English Language', 'Mathematics', 'Literature in English',
    'Government', 'Christian/Islamic Religious Studies', 'History',
    'Economics', 'French Language', 'Fine Arts', 'Music'
  ],
  'SS Commercial': [
    'English Language', 'Mathematics', 'Commerce', 'Economics',
    'Financial Accounting', 'Office Practice', 'Computer Studies',
    'Marketing', 'Entrepreneurship', 'Business Studies'
  ]
};

function getClassType(cls) {
  if (!cls) return null;
  if (cls.startsWith('JSS')) return 'JSS';
  if (cls.includes('Science')) return 'SS Science';
  if (cls.includes('Arts')) return 'SS Arts';
  if (cls.includes('Commercial')) return 'SS Commercial';
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  await redirectIfLoggedIn();
  initPasswordToggle();
  initPasswordStrength();
  initClassSubjects();
  initRegisterForm();
});

/* ---------- Class → Subjects ---------- */
function initClassSubjects() {
  const classSelect = document.getElementById('reg-class');
  if (!classSelect) return;

  classSelect.addEventListener('change', () => {
    const cls = classSelect.value;
    const section = document.getElementById('subjects-section');
    const grid = document.getElementById('subjects-grid');
    const placeholder = document.getElementById('subjects-placeholder');

    if (!cls) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = '';

    const type = getClassType(cls);
    const subjects = type ? SUBJECT_SETS[type] : [];

    if (!subjects.length) {
      if (placeholder) placeholder.classList.remove('d-none');
      if (grid) grid.classList.add('d-none');
      return;
    }

    if (placeholder) placeholder.classList.add('d-none');
    if (grid) {
      grid.classList.remove('d-none');
      grid.innerHTML = subjects.map((subj, i) => `
        <label class="subject-check" id="subj-label-${i}">
          <input type="checkbox" name="subjects" value="${escapeHtml(subj)}" onchange="toggleSubjectStyle(this)">
          ${escapeHtml(subj)}
        </label>
      `).join('');
    }
  });
}

function toggleSubjectStyle(checkbox) {
  const label = checkbox.closest('.subject-check');
  if (label) label.classList.toggle('selected', checkbox.checked);
}

/* ---------- Password Toggle ---------- */
function initPasswordToggle() {
  document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-group').querySelector('input');
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
  });
}

/* ---------- Password Strength ---------- */
function initPasswordStrength() {
  const passInput = document.getElementById('reg-password');
  const fill = document.getElementById('strength-fill');
  if (!passInput || !fill) return;

  passInput.addEventListener('input', () => {
    const val = passInput.value;
    let strength = 0;
    if (val.length >= 8) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
    const widths = ['25%', '50%', '75%', '100%'];
    fill.style.width = strength > 0 ? widths[strength - 1] : '0';
    fill.style.background = strength > 0 ? colors[strength - 1] : '';
  });
}

/* ---------- Registration Form ---------- */
function initRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const fullname = document.getElementById('reg-fullname')?.value.trim();
    const dob      = document.getElementById('reg-dob')?.value;
    const email    = document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const confirm  = document.getElementById('reg-confirm-password')?.value;
    const gender   = document.getElementById('reg-gender')?.value;
    const phone    = document.getElementById('reg-phone')?.value.trim();
    const parent   = document.getElementById('reg-parent')?.value.trim();
    const cls      = document.getElementById('reg-class')?.value;
    const terms    = document.getElementById('reg-terms')?.checked;

    // Collect selected subjects
    const selectedSubjects = Array.from(
      document.querySelectorAll('input[name="subjects"]:checked')
    ).map(cb => cb.value);

    // Validation
    if (!fullname)  { showError('Please enter your full name.'); return; }
    if (!dob)       { showError('Please enter your date of birth.'); return; }
    if (!email)     { showError('Please enter your email address.'); return; }
    if (!password)  { showError('Please enter a password.'); return; }
    if (password.length < 8) { showError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { showError('Passwords do not match.'); return; }
    if (!gender)    { showError('Please select your gender.'); return; }
    if (!parent)    { showError('Please enter your parent/guardian name.'); return; }
    if (!cls)       { showError('Please select your class.'); return; }
    if (selectedSubjects.length === 0) { showError('Please select at least one subject.'); return; }
    if (!terms)     { showError('Please accept the terms to continue.'); return; }

    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account…';
    Spinner.show();

    try {
      // Create Firebase Auth account
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const user = cred.user;

      // Save profile to Realtime Database
      // Fields saved at registration are permanently locked for student editing
      await db.ref(`students/${user.uid}/profile`).set({
        fullname,
        dob,
        email,
        gender,
        phone:  phone  || '',
        parent: parent || '',
        class: cls,
        subjects: selectedSubjects,
        photo: '',
        admissionNo: '',
        // Track that these fields are locked (cannot be self-edited later)
        lockedFields: ['fullname', 'dob', 'email', 'class', 'subjects'],
        registeredBySelf: true,
        createdAt: Date.now()
      });

      Spinner.hide();
      Toast.success('Account created successfully! Redirecting to your portal…');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    } catch (err) {
      Spinner.hide();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Create My Account';
      showError(getRegError(err.code));
    }
  });
}

/* ---------- Error Helpers ---------- */
function showError(msg) {
  const el = document.getElementById('reg-error');
  const text = document.getElementById('reg-error-text');
  if (el) el.classList.remove('d-none');
  if (text) text.textContent = msg;
}

function hideError() {
  const el = document.getElementById('reg-error');
  if (el) el.classList.add('d-none');
}

function getRegError(code) {
  const errors = {
    'auth/email-already-in-use':    'This email is already registered. Please sign in instead.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password is too weak. Use at least 8 characters.',
    'auth/network-request-failed':  'Network error. Check your connection and try again.',
    'auth/too-many-requests':       'Too many attempts. Please try again later.',
  };
  return errors[code] || 'Registration failed. Please try again.';
}
