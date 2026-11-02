/* Hero: three scenes, autoplay with pause, swipe, arrows, word reveal. */
(function () {
  var hero = document.querySelector('[data-hero]');
  if (!hero) return;

  var doc = document.documentElement;
  var gsap = window.gsap;
  var lite = doc.classList.contains('lite');
  var reduce = doc.classList.contains('reduce');
  var rtl = doc.dir === 'rtl';
  var fine = false;
  try { fine = window.matchMedia('(pointer: fine)').matches; } catch (e) {}

  var scenes = Array.prototype.slice.call(hero.querySelectorAll('[data-scene]'));
  var tabs = Array.prototype.slice.call(hero.querySelectorAll('[data-scene-tab]'));
  var count = hero.querySelector('[data-hero-count]');
  var fill = hero.querySelector('[data-hero-fill]');
  var toggle = hero.querySelector('[data-hero-toggle]');
  var stage = hero.querySelector('[data-stage]');
  var total = scenes.length || 1;
  var index = 0;
  var playing = !reduce;
  var hover = false;
  var elapsed = 0;
  var last = 0;
  var started = false;
  var DELAY = 6000;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function setCount() {
    if (count) count.textContent = pad(index + 1) + ' / ' + pad(total);
  }

  /* Split by words, group by visual line. Never by letters (Arabic). */
  function splitTitle(el) {
    if (!el) return [];
    var words = (el.textContent || '').trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return [];
    el.textContent = '';
    var spans = words.map(function (w) {
      var s = document.createElement('span');
      s.className = 'word';
      s.textContent = w;
      return s;
    });
    var frag = document.createDocumentFragment();
    spans.forEach(function (s, i) {
      frag.appendChild(s);
      if (i < spans.length - 1) frag.appendChild(document.createTextNode(' '));
    });
    el.appendChild(frag);

    var lines = [];
    var current = [];
    var lastTop = null;
    spans.forEach(function (s) {
      var top = Math.round(s.offsetTop);
      if (lastTop === null || Math.abs(top - lastTop) < 3) current.push(s);
      else { lines.push(current); current = [s]; }
      lastTop = top;
    });
    if (current.length) lines.push(current);

    el.textContent = '';
    lines.forEach(function (line) {
      var row = document.createElement('span');
      row.className = 'line';
      line.forEach(function (s, i) {
        row.appendChild(s);
        if (i < line.length - 1) row.appendChild(document.createTextNode(' '));
      });
      el.appendChild(row);
    });
    return spans;
  }

  var words = splitTitle(hero.querySelector('[data-split]'));

  function goTo(n, auto) {
    n = ((n % total) + total) % total;
    if (!auto && n === index) { elapsed = 0; return; }
    index = n;
    scenes.forEach(function (s, i) {
      var on = i === index;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    tabs.forEach(function (t, i) {
      t.setAttribute('aria-selected', i === index ? 'true' : 'false');
      t.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    setCount();
    if (gsap && !reduce && !lite && scenes[index]) {
      var from = rtl ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
      gsap.fromTo(scenes[index], { clipPath: from }, {
        clipPath: 'inset(0 0 0 0)', duration: 0.8, ease: 'power3.inOut', overwrite: 'auto'
      });
    }
    if (!auto) elapsed = 0;
  }

  function syncToggle() {
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', playing ? 'false' : 'true');
    toggle.setAttribute('aria-label', playing ? toggle.dataset.labelPause : toggle.dataset.labelPlay);
  }

  function setPlaying(on) {
    playing = !!on;
    syncToggle();
  }

  if (toggle) {
    if (reduce) toggle.style.display = 'none';
    toggle.addEventListener('click', function () { setPlaying(!playing); });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { goTo(i); });
  });

  /* Pointer: pause on touch, pause while hovering (fine pointers). */
  if (fine && !reduce) {
    hero.addEventListener('pointerenter', function () { hover = true; });
    hero.addEventListener('pointerleave', function () { hover = false; });
  }
  var sx = 0, sy = 0, tracking = false;
  if (stage) {
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') setPlaying(false);
      tracking = true; sx = e.clientX; sy = e.clientY;
    });
    stage.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx;
      var dy = e.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        setPlaying(false);
        var dir = dx < 0 ? 1 : -1;
        goTo(index + (rtl ? -dir : dir));
      }
    });
    stage.addEventListener('pointercancel', function () { tracking = false; });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && t.closest && t.closest('input, textarea, select, [contenteditable], [data-screens], .menu.is-open')) return;
    var box = hero.getBoundingClientRect();
    var inHero = t && t.closest && t.closest('[data-hero]');
    if (!inHero && !(box.top < 80 && box.bottom > window.innerHeight * 0.4)) return;
    e.preventDefault();
    var step = e.key === 'ArrowRight' ? 1 : -1;
    goTo(index + (rtl ? -step : step));
  });

  /* Parallax on the two red circles. */
  if (gsap && fine && !lite && !reduce) {
    var circles = Array.prototype.slice.call(hero.querySelectorAll('[data-parallax]'));
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      var ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      circles.forEach(function (c) {
        var d = parseFloat(c.getAttribute('data-parallax')) || 0.05;
        gsap.to(c, {
          x: nx * d * 150, y: ny * d * 150,
          duration: 1.1, ease: 'power2.out', overwrite: 'auto'
        });
      });
    }, { passive: true });
  }

  function loop(now) {
    if (!last) last = now;
    var dt = Math.min(120, now - last);
    last = now;
    if (playing && !hover && !document.hidden) {
      elapsed += dt;
      if (fill) fill.style.transform = 'scaleX(' + Math.min(1, elapsed / DELAY) + ')';
      if (elapsed >= DELAY) {
        elapsed = 0;
        goTo(index + 1, true);
      }
    }
    window.requestAnimationFrame(loop);
  }

  function start() {
    if (started) return;
    started = true;
    setCount();
    syncToggle();
    if (fill) fill.style.transform = 'scaleX(0)';

    if (gsap && !reduce) {
      if (words.length) {
        gsap.from(words, {
          yPercent: 115, opacity: 0, duration: 1, stagger: 0.05,
          ease: 'power3.out', delay: 0.05
        });
      }
      gsap.from(hero.querySelectorAll('[data-reveal]'), {
        y: 26, opacity: 0, duration: 0.85, stagger: 0.07,
        delay: 0.2, ease: 'power3.out'
      });
      var phone = hero.querySelector('[data-phone]');
      if (phone && !lite) {
        gsap.from(phone, { y: 70, opacity: 0, rotate: -16, duration: 1.2, ease: 'power3.out', delay: 0.1 });
        gsap.to(phone, { y: '+=14', duration: 3.6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.5 });
      }
      var circlesIn = hero.querySelectorAll('.hero__circle');
      if (circlesIn.length) {
        gsap.from(circlesIn, { scale: 0.72, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out' });
      }
    }

    if (playing) window.requestAnimationFrame(loop);
  }

  if (window.C3 && window.C3.ready) window.C3.ready(start);
  else start();
})();
