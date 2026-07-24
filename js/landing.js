// ============================================================
// DREXORA SCHOOL PORTAL — Landing Page JS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeroParticles();
  initMobileMenu();
  initScrollAnimations();
  initCounterAnimations();
  initContactForm();
  initSmoothScroll();
});

/* ---------- Sticky Nav ---------- */
function initNav() {
  const nav = document.getElementById('landing-nav');
  const handleScroll = () => {
    if (window.scrollY > 60) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ---------- Hero Particles ---------- */
function initHeroParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;
  const count = 12;
  const sizes = [20, 35, 50, 70, 90, 110];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const left = Math.random() * 100;
    const top  = Math.random() * 100;
    const delay = Math.random() * 8;
    const duration = 6 + Math.random() * 6;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${left}%;top:${top}%;
      animation-delay:${delay}s;animation-duration:${duration}s;
      opacity:${0.05 + Math.random() * 0.1};
    `;
    container.appendChild(p);
  }
}

/* ---------- Mobile Menu ---------- */
function initMobileMenu() {
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-nav-menu');
  const closeBtn   = document.getElementById('mobile-nav-close');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => mobileMenu.classList.add('open'));
  }
  if (closeBtn && mobileMenu) {
    closeBtn.addEventListener('click', () => mobileMenu.classList.remove('open'));
  }
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (mobileMenu && !mobileMenu.contains(e.target) && e.target !== hamburger) {
      mobileMenu.classList.remove('open');
    }
  });
}

/* ---------- Smooth Scroll ---------- */
function initSmoothScroll() {
  document.querySelectorAll('[data-scroll]').forEach(link => {
    link.addEventListener('click', () => {
      const target = document.getElementById(link.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile menu if open
        const mobileMenu = document.getElementById('mobile-nav-menu');
        if (mobileMenu) mobileMenu.classList.remove('open');
      }
    });
  });
}

/* ---------- Counter Animations ---------- */
function initCounterAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counters = entry.target.querySelectorAll('[data-counter]');
        counters.forEach(c => {
          const target = parseInt(c.dataset.counter);
          if (!isNaN(target) && !c.dataset.animated) {
            c.dataset.animated = '1';
            animateCounter(c, target);
          }
        });
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.stats-section').forEach(s => observer.observe(s));
}

/* ---------- Contact Form ---------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const name    = form.querySelector('#contact-name').value.trim();
    const email   = form.querySelector('#contact-email').value.trim();
    const message = form.querySelector('#contact-message').value.trim();
    if (!name || !email || !message) {
      Toast.warning('Please fill in all fields.');
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    try {
      await db.ref('contact_messages').push({
        name, email, message,
        timestamp: Date.now()
      });
      Toast.success('Message sent! We will get back to you shortly.');
      form.reset();
    } catch (err) {
      Toast.error('Failed to send message. Please try again.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    }
  });
}
