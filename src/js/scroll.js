/* Scroll: Lenis, nav, progress, reveals, pinned screens, manga wipe. */
(function () {
  var doc = document.documentElement;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var lite = doc.classList.contains('lite');
  var reduce = doc.classList.contains('reduce');
  var nav = document.querySelector('[data-nav]');
  var progress = document.querySelector('[data-progress]');
  var screens = document.querySelector('[data-screens]');
  var lenis = null;
  var lastY = window.scrollY || 0;
  var ticking = false;

  /* ---- Nav and the progress line (work with or without GSAP) ---- */
  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (nav) {
      nav.classList.toggle('is-stuck', y > 16);
      if (y > 160 && y > lastY + 4) nav.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 90) nav.classList.remove('is-hidden');
    }
    if (progress) {
      var max = doc.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
    lastY = y;
    ticking = false;
  }
  function requestScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }
  window.addEventListener('scroll', requestScroll, { passive: true });
  onScroll();

  /* ---- Smooth scrolling, only when asked for ---- */
  if (!lite && !reduce && window.Lenis) {
    try {
      lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
    } catch (e) { lenis = null; }
  }
  if (lenis && gsap && ST) {
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else if (lenis) {
    var raf = function (time) { lenis.raf(time); window.requestAnimationFrame(raf); };
    window.requestAnimationFrame(raf);
  }
  if (lenis) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -(nav ? nav.offsetHeight : 0) - 12 });
    });
  }

  /* ---- The reel ---- */
  var counter = document.querySelector('[data-screens-count]');
  var prevBtn = screens ? screens.querySelector('[data-screens-prev]') : null;
  var nextBtn = screens ? screens.querySelector('[data-screens-next]') : null;
  var viewport = screens ? screens.querySelector('[data-screens-viewport]') : null;
  var track = screens ? screens.querySelector('[data-screens-track]') : null;
  var cards = screens ? Array.prototype.slice.call(screens.querySelectorAll('[data-screen-card]')) : [];
  var total = cards.length;
  var current = 0;

  function setCount(i) {
    if (!counter) return;
    i = Math.max(0, Math.min(total - 1, i));
    if (i === current) return;
    current = i;
    counter.textContent = i < 9 ? '0' + (i + 1) : String(i + 1);
  }

  if (screens && total && gsap && ST && !lite && !reduce && window.innerWidth > 900) {
    screens.classList.add('is-pinned');
    var rtl = doc.dir === 'rtl';
    var direction = rtl ? 1 : -1;
    var distance = function () {
      return Math.max(0, track.scrollWidth - doc.clientWidth);
    };
    var tween = gsap.to(track, {
      x: function () { return direction * distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: screens,
        start: 'top top',
        end: function () { return '+=' + (distance() + window.innerHeight * 0.5); },
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (total > 1) setCount(Math.round(self.progress * (total - 1)));
        }
      }
    });
    var trigger = tween.scrollTrigger;

    function jump(i) {
      i = Math.max(0, Math.min(total - 1, i));
      if (!trigger) return;
      var p = total > 1 ? i / (total - 1) : 0;
      var y = trigger.start + (trigger.end - trigger.start) * p;
      if (lenis) lenis.scrollTo(y);
      else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { jump(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { jump(current + 1); });
  } else if (screens && total) {
    var raf = false;
    var onReel = function () {
      raf = false;
      if (!viewport) return;
      var mid = viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
      var best = 0;
      var bestDist = Infinity;
      cards.forEach(function (card, i) {
        var r = card.getBoundingClientRect();
        var d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setCount(best);
    };
    if (viewport) {
      viewport.addEventListener('scroll', function () {
        if (!raf) { raf = true; window.requestAnimationFrame(onReel); }
      }, { passive: true });
      var go = function (i) {
        i = Math.max(0, Math.min(total - 1, i));
        cards[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
      };
      if (prevBtn) prevBtn.addEventListener('click', function () { go(current - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { go(current + 1); });
    }
  }

  /* ---- Reveals and the manga wipe ---- */
  if (gsap && ST && !reduce) {
    gsap.registerPlugin(ST);

    if (!lite) {
      gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        if (el.closest('[data-hero]')) return;
        gsap.from(el, {
          opacity: 0, y: 22, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });

      gsap.utils.toArray('[data-stagger]').forEach(function (box) {
        gsap.from(box.children, {
          opacity: 0, y: 26, duration: 0.7, stagger: 0.06, ease: 'power2.out',
          scrollTrigger: { trigger: box, start: 'top 86%', once: true }
        });
      });

      gsap.utils.toArray('[data-countup]').forEach(function (el) {
        var end = parseInt(el.getAttribute('data-countup'), 10);
        if (isNaN(end)) return;
        var state = { v: 0 };
        gsap.to(state, {
          v: end, duration: 1.1, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onUpdate: function () {
            var n = Math.round(state.v);
            el.textContent = n < 10 ? '0' + n : String(n);
          }
        });
      });

      var manga = document.querySelector('.manga__grid');
      if (manga) {
        gsap.fromTo(manga,
          { clipPath: 'polygon(0 26%, 100% 0, 100% 0, 0 0)' },
          {
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            ease: 'none',
            scrollTrigger: { trigger: manga, start: 'top 92%', end: 'top 55%', scrub: 0.5 }
          }
        );
      }
    }
  } else if (gsap && ST && !reduce) {
    gsap.registerPlugin(ST);
  }

  /* ---- Keep triggers fresh ---- */
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (ST) ST.refresh();
    }, 250);
  });
  if (document.fonts && document.fonts.ready && ST) {
    document.fonts.ready.then(function () { ST.refresh(); });
  }
})();
