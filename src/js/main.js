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

  /* ---- Screens: a focus strip; click or tab a plate to bring it to centre ---- */
  var screens = document.querySelector('[data-screens]');
  if (screens) {
    var screenCards = [].slice.call(screens.querySelectorAll('[data-screen-card]'));
    var screenFrames = screenCards.map(function (card) { return card.querySelector('[data-screen-focus]'); });
    var screenImgs = screenCards.map(function (card) { return card.querySelector('img'); });
    var narrow = window.matchMedia('(max-width: 820px)');
    var activeCard = -1;
    var scrollFrame = 0;
    var reduce = doc.classList.contains('reduce');

    function resetDrift() {
      screenImgs.forEach(function (img) {
        if (!img) return;
        img.style.removeProperty('--mx');
        img.style.removeProperty('--my');
      });
    }

    function setActive(i) {
      i = Math.max(0, Math.min(screenCards.length - 1, i));
      if (i === activeCard) return;
      activeCard = i;
      screens.classList.add('has-focus');
      screenCards.forEach(function (card, j) {
        card.classList.toggle('is-active', j === i);
        card.classList.toggle('is-before', j < i);
        card.classList.toggle('is-after', j > i);
        var frame = screenFrames[j];
        if (frame) frame.setAttribute('aria-current', j === i ? 'true' : 'false');
      });
      resetDrift();
    }

    function paintScroll() {
      scrollFrame = 0;
      if (!narrow.matches) return;
      var gr = screens.getBoundingClientRect();
      var mid = gr.left + gr.width / 2;
      var best = Infinity, bestI = 0;
      screenCards.forEach(function (card, i) {
        var cr = card.getBoundingClientRect();
        var d = Math.abs(cr.left + cr.width / 2 - mid);
        if (d < best) { best = d; bestI = i; }
      });
      setActive(bestI);
    }

    function scheduleScroll() {
      if (narrow.matches && !scrollFrame) scrollFrame = window.requestAnimationFrame(paintScroll);
    }

    function syncLayout() {
      if (narrow.matches) {
        screens.classList.remove('is-strip');
        paintScroll();
      } else {
        screens.classList.add('is-strip');
        if (activeCard < 0) setActive(Math.floor((screenCards.length - 1) / 2));
      }
    }

    screenFrames.forEach(function (frame, i) {
      if (!frame) return;
      var card = screenCards[i];
      frame.setAttribute('role', 'button');
      frame.setAttribute('tabindex', '0');
      frame.setAttribute('aria-label', card.querySelector('.screen-card__title').textContent.trim());
      frame.addEventListener('click', function () {
        if (!narrow.matches) { setActive(i); return; }
        var cr = card.getBoundingClientRect();
        var gr = screens.getBoundingClientRect();
        if (Math.abs(cr.left + cr.width / 2 - (gr.left + gr.width / 2)) > 2) {
          card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        }
      });
      frame.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        frame.click();
      });
      frame.addEventListener('focus', function () {
        if (!narrow.matches) setActive(i);
      });
      frame.addEventListener('pointermove', function (e) {
        if (reduce || narrow.matches || i !== activeCard || e.pointerType === 'touch') return;
        var r = frame.getBoundingClientRect();
        var x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        var y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
        if (screenImgs[i]) {
          screenImgs[i].style.setProperty('--mx', (-x * 5).toFixed(2) + 'px');
          screenImgs[i].style.setProperty('--my', (-y * 5).toFixed(2) + 'px');
        }
      }, { passive: true });
      frame.addEventListener('pointerleave', function () {
        if (!screenImgs[i]) return;
        screenImgs[i].style.removeProperty('--mx');
        screenImgs[i].style.removeProperty('--my');
      });
    });

    screens.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', function () {
      if (narrow.matches) scheduleScroll();
    });
    try { narrow.addEventListener('change', syncLayout); } catch (e) { if (narrow.addListener) narrow.addListener(syncLayout); }
    syncLayout();

    if (!reduce && !doc.classList.contains('lite') && 'IntersectionObserver' in window) {
      screens.classList.add('is-fresh');
      screenCards.forEach(function (card, i) { card.style.transitionDelay = (i * 90) + 'ms'; });
      var screenIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        screenIO.disconnect();
        screens.classList.add('is-in');
        window.setTimeout(function () {
          screens.classList.remove('is-fresh', 'is-in');
          screenCards.forEach(function (card) { card.style.transitionDelay = ''; });
        }, 1500);
      }, { threshold: 0.16 });
      screenIO.observe(screens);
    }
  }

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
