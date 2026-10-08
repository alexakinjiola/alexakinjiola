/* ============================================================
   main.js — Alex Akinjiola Portfolio
   Shared JavaScript across all pages
   ============================================================ */

(function () {
  'use strict';

  /* ── PAGE LOADER ──────────────────────────────────────────── */
  var loader = document.getElementById('page-loader');

  function hideLoader() {
    if (!loader) return;
    loader.classList.add('hidden');
  }

  function showLoader() {
    if (!loader) return;
    loader.classList.remove('hidden');
  }

  /* Hide after content ready */
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 700);
  } else {
    window.addEventListener('load', function () {
      setTimeout(hideLoader, 700);
    });
  }
  /* Safety: always hide within 2s */
  setTimeout(hideLoader, 2000);

  /* Show loader on internal page navigations */
  document.addEventListener('click', function (e) {
    var anchor = e.target.closest('a[href]');
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href) return;
    /* Skip anchors, mailto, tel, external, PDFs, new-tab */
    if (
      href.startsWith('#') ||
      href.startsWith('mailto') ||
      href.startsWith('tel') ||
      href.startsWith('http') ||
      href.startsWith('//') ||
      href.indexOf('.pdf') > -1 ||
      anchor.target === '_blank'
    ) return;
    /* Skip modifier keys */
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    showLoader();
  });

  /* ── NAV SCROLL ───────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  /* ── MOBILE MENU ──────────────────────────────────────────── */
  var overlay    = document.getElementById('mobileOverlay');
  var hamburger  = document.getElementById('hamburger');

  window.openMobileMenu = function () {
    if (!overlay || !hamburger) return;
    overlay.classList.add('open');
    hamburger.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeMobileMenu = function () {
    if (!overlay || !hamburger) return;
    overlay.classList.remove('open');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeMobileMenu();
  });

  /* ── SCROLL REVEAL ────────────────────────────────────────── */
  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObs.observe(el);
  });

  /* ── PROFICIENCY BARS (skills page) ──────────────────────── */
  function triggerBars() {
    document.querySelectorAll('.prof-fill').forEach(function (fill) {
      var rect = fill.closest('.prof-item');
      if (!rect) return;
      if (rect.getBoundingClientRect().top < window.innerHeight) {
        fill.style.width = (fill.dataset.width || '0') + '%';
      }
    });
  }

  /* ── LEARNING RINGS (skills page) ────────────────────────── */
  function triggerRings() {
    document.querySelectorAll('.learning-card').forEach(function (card) {
      if (card.getBoundingClientRect().top < window.innerHeight - 60) {
        var pct  = parseInt(card.dataset.progress || '0', 10);
        var fill = card.querySelector('.progress-fill');
        if (fill) {
          var circ = 2 * Math.PI * 18;
          fill.style.strokeDashoffset = circ - (circ * pct / 100);
        }
        card.classList.add('visible');
      }
    });
  }

  /* ── SKILLS TAB SWITCHER (skills page) ───────────────────── */
  window.switchTab = function (id, btn) {
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.classList.remove('active');
    });
    btn.classList.add('active');
    var panel = document.getElementById('tab-' + id);
    if (panel) panel.classList.add('active');
    setTimeout(function () {
      triggerBars();
      triggerRings();
    }, 50);
  };

  /* ── RESUME SIDEBAR NAV (resume page) ────────────────────── */
  window.jumpTo = function (id, btn) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.sidebar-link').forEach(function (l) {
      l.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
  };

  /* Highlight sidebar link on scroll (resume page) */
  var resumeSections = ['experience', 'education', 'certifications', 'skills'];
  window.addEventListener('scroll', function () {
    triggerBars();
    triggerRings();
    /* Resume sidebar highlight */
    resumeSections.forEach(function (id, i) {
      var el = document.getElementById(id);
      var links = document.querySelectorAll('.sidebar-link');
      if (el && links[i] && window.scrollY >= el.offsetTop - 160) {
        links.forEach(function (l) { l.classList.remove('active'); });
        links[i].classList.add('active');
      }
    });
  }, { passive: true });

  /* ── CONTACT FORM (contact page) ─────────────────────────── */
  window.handleSubmit = function (e) {
    e.preventDefault();
    var err  = document.getElementById('formError');
    var succ = document.getElementById('formSuccess');
    var btn  = document.getElementById('submitBtn');
    if (err)  err.style.display  = 'none';
    if (succ) succ.style.display = 'none';

    var firstName = (document.getElementById('firstName') || {}).value || '';
    var email     = (document.getElementById('email') || {}).value || '';
    var message   = (document.getElementById('message') || {}).value || '';

    firstName = firstName.trim();
    email     = email.trim();
    message   = message.trim();

    if (!firstName) {
      if (err) { err.textContent = 'Please enter your name.'; err.style.display = 'block'; }
      return;
    }
    if (!email || !email.includes('@')) {
      if (err) { err.textContent = 'Please enter a valid email address.'; err.style.display = 'block'; }
      return;
    }
    if (!message) {
      if (err) { err.textContent = 'Please add a message.'; err.style.display = 'block'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    setTimeout(function () {
      if (succ) succ.style.display = 'block';
      if (btn)  btn.textContent = 'Sent ✓';
    }, 1400);
  };

  /* Initial trigger */
  triggerBars();
  triggerRings();

})();

/* ══════════════════════════════════════════════════════
   IMPROVEMENTS — all 12 features
   ══════════════════════════════════════════════════════ */

(function () {

  /* 1. SCROLL PROGRESS BAR */
  var progressBar = document.getElementById('scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', function () {
      var scrolled = window.scrollY;
      var total    = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    }, { passive: true });
  }

  /* 2. BACK TO TOP BUTTON */
  var btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', function () {
      btt.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btt.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* 3. COPY EMAIL TO CLIPBOARD */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.dataset.copy;
      if (!text) return;
      navigator.clipboard.writeText(text).then(function () {
        var tooltip = btn.querySelector('.copy-tooltip');
        var icon    = btn.querySelector('.material-symbols-outlined');
        btn.classList.add('copied');
        if (tooltip) tooltip.textContent = 'Copied!';
        if (icon)    icon.textContent    = 'check';
        setTimeout(function () {
          btn.classList.remove('copied');
          if (tooltip) tooltip.textContent = 'Copy';
          if (icon)    icon.textContent    = 'content_copy';
        }, 2200);
      }).catch(function () {
        /* Fallback for older browsers */
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'absolute';
        ta.style.opacity  = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
    });
  });

  /* 4. SCROLLSPY — highlight nav item based on scroll position */
  var spySections = document.querySelectorAll('section[id], div[id].work-section, div[id].cap-section');
  var navLinks    = document.querySelectorAll('.nav-links a');
  if (spySections.length && navLinks.length) {
    var spyObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id   = entry.target.id;
          var href = id ? id + '.html' : '';
          navLinks.forEach(function (a) {
            a.classList.remove('scrollspy-active');
            if (a.getAttribute('href') === href) {
              a.classList.add('scrollspy-active');
            }
          });
        }
      });
    }, { threshold: 0.3 });
    spySections.forEach(function (s) { spyObs.observe(s); });
  }

  /* 5. LAZY LOADING — add loading=lazy to all non-hero images dynamically */
  document.querySelectorAll('img').forEach(function (img) {
    /* Skip the hero photo and loader logo */
    if (img.closest('#hero') || img.closest('.page-hero') || img.closest('#page-loader')) return;
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });

  /* 6. FORM HONEYPOT — auto-reject submissions if honeypot filled */
  var form = document.getElementById('contactForm');
  if (form) {
    var hpField = form.querySelector('.hp-field input');
    form.addEventListener('submit', function (e) {
      if (hpField && hpField.value) {
        e.preventDefault();
        return false;
      }
    });
  }

  /* 7. READ TIME — calculate and inject on case study blocks */
  document.querySelectorAll('.case-large-body, .case-body').forEach(function (block) {
    var text  = block.innerText || block.textContent || '';
    var words = text.trim().split(/\s+/).length;
    var mins  = Math.max(1, Math.ceil(words / 200));
    var badge = block.querySelector('.read-time');
    if (badge) {
      badge.innerHTML = '<span class="material-symbols-outlined">schedule</span>' + mins + ' min read';
    }
  });

})();
