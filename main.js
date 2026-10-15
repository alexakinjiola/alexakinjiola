/* ============================================================
   main.js — Alex Akinjiola Portfolio
   Single JS file for all pages
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
  /* Hide ASAP on DOMContentLoaded — don't wait for images */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(hideLoader, 400);
  });
  /* Absolute fallback */
  setTimeout(hideLoader, 1800);

  /* Show on internal navigation clicks */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('mailto') ||
        href.startsWith('tel') || href.startsWith('http') ||
        href.startsWith('//') || href.indexOf('.pdf') > -1 ||
        a.target === '_blank') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    showLoader();
  });

  /* ── SCROLL PROGRESS ──────────────────────────────────────── */
  var prog = document.getElementById('scroll-progress');
  function updateProgress() {
    if (!prog) return;
    var total = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = (total > 0 ? (window.scrollY / total) * 100 : 0) + '%';
  }

  /* ── NAV SCROLL ───────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
    updateProgress();
    /* Back to top */
    var btt = document.getElementById('back-to-top');
    if (btt) btt.classList.toggle('visible', window.scrollY > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── BACK TO TOP ──────────────────────────────────────────── */
  var btt = document.getElementById('back-to-top');
  if (btt) {
    btt.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── MOBILE MENU ──────────────────────────────────────────── */
  var overlay  = document.getElementById('mobileOverlay');
  var hamburger = document.getElementById('hamburger');

  var lockY = 0;
  window.openMobileMenu = function () {
    if (!overlay || !hamburger) return;
    lockY = window.scrollY || 0;
    overlay.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Close menu');
    document.body.style.top = (-lockY) + 'px';
    document.body.classList.add('menu-open');
  };
  window.closeMobileMenu = function () {
    if (!overlay || !hamburger) return;
    var wasOpen = overlay.classList.contains('open');
    overlay.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
    document.body.style.top = '';
    if (wasOpen) window.scrollTo(0, lockY);
  };
  /* close the menu if the window grows past the tablet breakpoint */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1024) window.closeMobileMenu();
  });
  if (hamburger) {
    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      overlay && overlay.classList.contains('open')
        ? window.closeMobileMenu()
        : window.openMobileMenu();
    });
  }
  if (overlay) {
    overlay.querySelectorAll('a[href]').forEach(function (link) {
      link.addEventListener('click', function () { window.closeMobileMenu(); });
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) window.closeMobileMenu();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeMobileMenu();
  });

  /* ── SCROLL REVEAL ────────────────────────────────────────── */
  /* every element whose CSS starts at opacity:0 and needs .visible */
  var REVEAL_SEL = '.reveal, .featured-panel, .skill-card, .learning-card';
  if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(REVEAL_SEL).forEach(function (el) { revObs.observe(el); });
  } else {
    document.querySelectorAll(REVEAL_SEL).forEach(function (el) { el.classList.add('visible'); });
  }

  /* ── LAZY LOADING ─────────────────────────────────────────── */
  document.querySelectorAll('img').forEach(function (img) {
    if (img.closest('#hero') || img.closest('.page-hero') || img.closest('#page-loader')) return;
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
  });

  /* ── PROFICIENCY BARS ─────────────────────────────────────── */
  function triggerBars() {
    document.querySelectorAll('.prof-fill').forEach(function (fill) {
      var item = fill.closest('.prof-item');
      if (item && item.getBoundingClientRect().top < window.innerHeight) {
        fill.style.width = (fill.dataset.width || '0') + '%';
      }
    });
  }

  /* ── LEARNING RINGS ───────────────────────────────────────── */
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
  window.addEventListener('scroll', function () {
    triggerBars(); triggerRings();
  }, { passive: true });

  /* ── SKILLS TAB SWITCHER ──────────────────────────────────── */
  window.switchTab = function (id, btn) {
    document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    var panel = document.getElementById('tab-' + id);
    if (panel) {
      panel.classList.add('active');
      /* panels were display:none, so the scroll observer never saw their content */
      panel.querySelectorAll(REVEAL_SEL).forEach(function (el, i) {
        setTimeout(function () { el.classList.add('visible'); }, 40 + i * 60);
      });
    }
    setTimeout(function () { triggerBars(); triggerRings(); }, 50);
  };

  /* ── RESUME SIDEBAR ───────────────────────────────────────── */
  window.jumpTo = function (id, btn) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.sidebar-link').forEach(function (l) { l.classList.remove('active'); });
    if (btn) btn.classList.add('active');
  };
  var resSections = ['experience', 'education', 'certifications', 'skills'];
  window.addEventListener('scroll', function () {
    resSections.forEach(function (id, i) {
      var el = document.getElementById(id);
      var links = document.querySelectorAll('.sidebar-link');
      if (el && links[i] && window.scrollY >= el.offsetTop - 160) {
        links.forEach(function (l) { l.classList.remove('active'); });
        links[i].classList.add('active');
      }
    });
  }, { passive: true });

  /* ── COPY TO CLIPBOARD ────────────────────────────────────── */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.dataset.copy;
      if (!text) return;
      var doIt = function () {
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
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(doIt).catch(fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        doIt();
      }
    });
  });

  /* ── CONTACT FORM (Formspree AJAX) ───────────────────────── */
  var form = document.getElementById('contactForm');
  if (form) {
    /* Show success if redirected back with ?submitted=true */
    if (window.location.search.includes('submitted=true')) {
      form.style.display = 'none';
      var s = document.getElementById('formSuccess');
      if (s) s.style.display = 'block';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err  = document.getElementById('formError');
      var succ = document.getElementById('formSuccess');
      var btn  = document.getElementById('submitBtn');
      if (err)  { err.style.display  = 'none'; err.textContent = ''; }
      if (succ) { succ.style.display = 'none'; }

      var firstName = (document.getElementById('firstName') || {}).value || '';
      var email     = (document.getElementById('email')     || {}).value || '';
      var message   = (document.getElementById('message')   || {}).value || '';
      firstName = firstName.trim(); email = email.trim(); message = message.trim();

      if (!firstName) { showErr('Please enter your name.'); return; }
      if (!email || !email.includes('@') || !email.includes('.')) {
        showErr('Please enter a valid email address.'); return;
      }
      if (message.length < 10) { showErr('Please write a short message (at least 10 characters).'); return; }

      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
      .then(function (res) {
        if (res.ok) {
          showSuccess();
        } else {
          res.json().then(function (d) {
            showErr(d.errors
              ? d.errors.map(function (e) { return e.message; }).join(', ')
              : 'Something went wrong. Please email me directly: tayoalex7@gmail.com');
          }).catch(function () {
            showErr('Something went wrong. Please email me directly: tayoalex7@gmail.com');
          });
        }
      })
      .catch(function () {
        showErr('Network error. Please email me directly at tayoalex7@gmail.com');
      })
      .finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Send Message <span class="material-symbols-outlined" style="font-size:18px">send</span>';
        }
      });

      function showErr(msg) {
        if (!err) return;
        err.textContent = msg; err.style.display = 'block';
        err.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      function showSuccess() {
        form.reset(); form.style.display = 'none';
        if (succ) { succ.style.display = 'block'; succ.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }
    });
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  triggerBars();
  triggerRings();
  onScroll();


  /* Ensure the active capabilities panel animates in on load and tab changes. */
  function revealActiveCapabilityPanel() {
    var activePanel = document.querySelector('.tab-panel.active');
    if (!activePanel) return;
    activePanel.querySelectorAll('.reveal, .skill-card, .featured-panel, .prof-item').forEach(function(el,i){
      setTimeout(function(){el.classList.add('visible');}, Math.min(i*35,280));
    });
    triggerBars(); triggerRings();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',revealActiveCapabilityPanel,{once:true});
  else revealActiveCapabilityPanel();
  window.addEventListener('load',revealActiveCapabilityPanel,{once:true});
})();
