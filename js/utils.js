// ============================================================
// DREXORA SCHOOL PORTAL — Shared Utilities
// ============================================================

/* ---------- Theme Management ---------- */
const ThemeManager = {
  init() {
    const saved = localStorage.getItem('drexora-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateIcons(saved);
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('drexora-theme', next);
    this.updateIcons(next);
  },
  updateIcons(theme) {
    document.querySelectorAll('.theme-icon').forEach(el => {
      el.className = el.className.replace(/fa-sun|fa-moon/, theme === 'dark' ? 'fa-sun' : 'fa-moon');
    });
  }
};

/* ---------- Loading Spinner ---------- */
const Spinner = {
  show() {
    const overlay = document.getElementById('spinner-overlay');
    if (overlay) { overlay.classList.add('active'); }
  },
  hide() {
    const overlay = document.getElementById('spinner-overlay');
    if (overlay) { overlay.classList.remove('active'); }
  }
};

/* ---------- Toast Notifications ---------- */
const Toast = {
  _container: null,
  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
      if (!this._container) {
        this._container = document.createElement('div');
        this._container.id = 'toast-container';
        document.body.appendChild(this._container);
      }
    }
    return this._container;
  },
  show(message, type = 'info', duration = 4000) {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const container = this._getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info} toast-icon"></i>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 20);
    const remove = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    };
    toast.querySelector('.toast-close').addEventListener('click', remove);
    if (duration > 0) setTimeout(remove, duration);
    return toast;
  },
  success(msg, dur) { return this.show(msg, 'success', dur); },
  error(msg, dur)   { return this.show(msg, 'error', dur); },
  info(msg, dur)    { return this.show(msg, 'info', dur); },
  warning(msg, dur) { return this.show(msg, 'warning', dur); }
};

/* ---------- Modal Helpers ---------- */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active');
      document.body.style.overflow = '';
    }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    Modal.closeAll();
  }
});

/* ---------- Sidebar Toggle ---------- */
const SidebarManager = {
  init() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => this.open());
    }
    if (overlay) {
      overlay.addEventListener('click', () => this.close());
    }
    // Highlight active link
    this.setActiveLink();
  },
  open() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
  },
  close() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  },
  setActiveLink() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
      if (link.dataset.page === path) {
        link.classList.add('active');
      }
    });
  }
};

/* ---------- Formatting Helpers ---------- */
const Format = {
  date(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleDateString('en-NG', { year:'numeric', month:'short', day:'numeric' });
    } catch { return ts; }
  },
  grade(score) {
    score = parseFloat(score);
    if (isNaN(score)) return '—';
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  },
  gradeColor(score) {
    score = parseFloat(score);
    if (isNaN(score)) return '';
    if (score >= 70) return 'badge-success';
    if (score >= 60) return 'badge-primary';
    if (score >= 50) return 'badge-warning';
    if (score >= 40) return 'badge-gold';
    return 'badge-danger';
  },
  remark(score) {
    score = parseFloat(score);
    if (isNaN(score)) return '—';
    if (score >= 70) return 'Excellent';
    if (score >= 60) return 'Very Good';
    if (score >= 50) return 'Good';
    if (score >= 45) return 'Average';
    if (score >= 40) return 'Below Average';
    return 'Fail';
  },
  position(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }
};

/* ---------- Avatar Initials ---------- */
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() || 'ST';
}

/* ---------- File Size Helper ---------- */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

/* ---------- Debounce ---------- */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- Escape HTML ---------- */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ---------- Counter Animation ---------- */
function animateCounter(el, target, duration = 1500) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = Math.floor(start).toLocaleString();
  }, 16);
}

/* ---------- Intersection Observer for Animations ---------- */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        // Counter animation
        const counters = entry.target.querySelectorAll('[data-counter]');
        counters.forEach(c => {
          const target = parseInt(c.dataset.counter);
          if (!isNaN(target)) animateCounter(c, target);
        });
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

/* ---------- Confirm Dialog ---------- */
function confirmDialog(message) {
  return new Promise(resolve => {
    // Use browser confirm as a fallback (could be enhanced with a custom modal)
    resolve(window.confirm(message));
  });
}

/* ---------- Copy to Clipboard ---------- */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    Toast.success('Copied to clipboard!');
  } catch {
    Toast.error('Failed to copy.');
  }
}

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  // Bind all theme toggle buttons
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => ThemeManager.toggle());
  });
});
