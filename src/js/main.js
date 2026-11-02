/* Menu, FAQ, reveals. No framework, no scroll hijacking. */
(function () {
  var doc = document.documentElement;

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
    if (!menu || !menu.classList.contains('is-open')) return;
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key !== 'Tab') return;
    var f = menu.querySelectorAll('a[href], button:not([disabled])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  try {
    var wide = window.matchMedia('(min-width: 901px)');
    wide.addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  } catch (e) {}

  /* ---- FAQ: one open at a time ---- */
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

  /* ---- Reveals: fade and lift once, on the way in ---- */
  var items = [].slice.call(document.querySelectorAll('[data-reveal]'));
  [].slice.call(document.querySelectorAll('[data-stagger]')).forEach(function (group) {
    [].slice.call(group.children).forEach(function (child) { items.push(child); });
  });

  if (!items.length) return;

  var still = doc.classList.contains('reduce') || doc.classList.contains('lite') || !('IntersectionObserver' in window);
  if (still) return;

  items.forEach(function (el) { el.classList.add('reveal'); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var siblings = el.parentElement ? [].slice.call(el.parentElement.children) : [];
      var i = Math.max(0, siblings.indexOf(el));
      el.style.transitionDelay = (i * 60) + 'ms';
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  items.forEach(function (el) { io.observe(el); });
})();
