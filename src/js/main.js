/* Boot, menu, FAQ, cursor and small details. */
(function () {
  var doc = document.documentElement;
  var C3 = window.C3 = window.C3 || {};
  var fine = false;
  try { fine = window.matchMedia('(pointer: fine)').matches; } catch (e) {}

  C3.ready = function (fn) {
    if (C3._ready) { fn(); return; }
    (C3._q = C3._q || []).push(fn);
  };
  C3.fire = function () {
    if (C3._ready) return;
    C3._ready = true;
    window.__c3 && (window.__c3.ready = true);
    var queue = C3._q || [];
    C3._q = [];
    queue.forEach(function (fn) {
      try { fn(); } catch (e) { /* one broken effect must not stop the rest */ }
    });
  };

  /* ---- Menu ---- */
  var menu = document.querySelector('[data-menu]');
  var openBtn = document.querySelector('[data-menu-open]');
  var closeBtn = document.querySelector('[data-menu-close]');
  var lastFocus = null;

  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    doc.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      lastFocus = document.activeElement;
      var first = menu.querySelector('a, button');
      if (first) first.focus();
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
      lastFocus = null;
    }
  }

  if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
  if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) setMenu(false);
  });
  try {
    var wide = window.matchMedia('(min-width: 901px)');
    wide.addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  } catch (e) {}

  /* ---- FAQ ---- */
  var faqButtons = Array.prototype.slice.call(document.querySelectorAll('[data-faq-btn]'));
  faqButtons.forEach(function (btn, i) {
    var item = btn.closest('[data-faq]');
    if (i > 0) {
      item.classList.add('is-collapsed');
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function () {
      var wasOpen = btn.getAttribute('aria-expanded') === 'true';
      faqButtons.forEach(function (other) {
        var otherItem = other.closest('[data-faq]');
        var open = other === btn && !wasOpen;
        other.setAttribute('aria-expanded', open ? 'true' : 'false');
        otherItem.classList.toggle('is-collapsed', !open);
      });
    });
  });

  /* ---- Details that need a fine pointer and motion ---- */
  var gsap = window.gsap;
  var motion = !doc.classList.contains('lite') && !doc.classList.contains('reduce');

  if (gsap && fine && motion) {
    var ring = document.createElement('div');
    var dot = document.createElement('div');
    ring.className = 'cursor';
    ring.setAttribute('aria-hidden', 'true');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    var rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });
    var dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3.out' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3.out' });
    gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });

    // Only take over the cursor once it has actually moved.
    function activate(e) {
      gsap.set([ring, dot], { x: e.clientX, y: e.clientY });
      doc.classList.add('has-cursor');
      window.removeEventListener('pointermove', activate);
    }
    window.addEventListener('pointermove', activate, { passive: true });

    window.addEventListener('pointermove', function (e) {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerover', function (e) {
      var hot = e.target.closest && e.target.closest('a, button, .screen-card, .feature');
      doc.classList.toggle('is-hovering', !!hot);
    });

    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - r.left - r.width / 2) * 0.16,
          y: (e.clientY - r.top - r.height / 2) * 0.24,
          duration: 0.4, ease: 'power2.out', overwrite: 'auto'
        });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
      });
    });

    document.querySelectorAll('.screen-card').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        if (el.closest('.is-pinned')) return;
        var r = el.getBoundingClientRect();
        gsap.to(el, {
          rotateY: ((e.clientX - r.left) / r.width - 0.5) * 6,
          rotateX: ((e.clientY - r.top) / r.height - 0.5) * -6,
          transformPerspective: 900,
          duration: 0.5, overwrite: 'auto'
        });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
      });
    });
  }

  if (!doc.classList.contains('is-loading')) C3.fire();
})();
