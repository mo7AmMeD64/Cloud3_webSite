/* Runs in <head>: feature flags, motion classes, intro gate. */
(function () {
  var h = document.documentElement;
  h.classList.add('js');

  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var nav = window.navigator || {};
  var lite = reduced ||
    (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
    (nav.deviceMemory && nav.deviceMemory <= 4) ||
    window.innerWidth < 600;

  if (lite) h.classList.add('lite');
  if (reduced) h.classList.add('reduce');

  var intro = false;
  if (!reduced) {
    try { intro = !window.sessionStorage.getItem('c3-intro'); } catch (e) { intro = true; }
  }
  if (intro) h.classList.add('is-loading');

  window.__c3 = { lite: !!lite, reduced: !!reduced, ready: false };

  // Safety net: the page must never stay behind the loader if a script fails.
  window.setTimeout(function () {
    if (!window.__c3.ready) h.classList.remove('is-loading');
  }, 2600);
})();
