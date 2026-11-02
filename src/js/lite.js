/* Runs in <head>: JS flag, motion classes. Nothing is hidden without JS. */
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

  window.__c3 = { lite: !!lite, reduced: !!reduced };
})();
