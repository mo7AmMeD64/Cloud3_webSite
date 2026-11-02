/* Intro: counter, then a red circle wipes into the hero. Max ~1.3 s. */
(function () {
  var doc = document.documentElement;
  var el = document.querySelector('[data-loader]');
  var C3 = window.C3;

  if (!el || !doc.classList.contains('is-loading')) {
    if (C3) C3.fire();
    return;
  }

  var counter = el.querySelector('[data-loader-count]');
  var bar = el.querySelector('[data-loader-bar]');
  var start = 0;
  var duration = 800;
  var done = false;

  function finish() {
    if (done) return;
    done = true;
    try { window.sessionStorage.setItem('c3-intro', '1'); } catch (e) {}
    el.classList.add('is-out');
    window.setTimeout(function () {
      doc.classList.remove('is-loading');
      if (el.parentNode) el.parentNode.removeChild(el);
      if (C3) C3.fire();
    }, 480);
  }

  function step(now) {
    if (!start) start = now;
    var p = Math.min(1, (now - start) / duration);
    var value = Math.round(p * 100);
    if (counter) counter.textContent = value;
    if (bar) bar.style.transform = 'scaleX(' + p + ')';
    if (p < 1) window.requestAnimationFrame(step);
    else window.setTimeout(finish, 90);
  }

  window.requestAnimationFrame(step);
  window.setTimeout(finish, 1400); // never longer than the brief allows
})();
