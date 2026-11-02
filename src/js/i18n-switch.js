/* Language memory and the first-visit redirect. Loaded in <head>. */
(function () {
  var doc = document.documentElement;
  var here = doc.lang === 'ar' ? 'ar' : 'en';
  var stored = null;

  try { stored = window.localStorage.getItem('c3-lang'); } catch (e) {}

  var navLang = '';
  try {
    var list = window.navigator.languages;
    navLang = (list && list[0]) || window.navigator.language || '';
  } catch (e) {}
  var want = stored === 'ar' || stored === 'en' ? stored : (/^ar/i.test(navLang) ? 'ar' : 'en');

  var path = window.location.pathname;
  var isHome = /\/(index\.html)?$/.test(path) && !/\/legal(\/|$)/.test(path);

  if (isHome && want !== here) {
    var target = here === 'ar' ? 'en/' : '../';
    window.location.replace(target + window.location.search + window.location.hash);
    return;
  }

  // Remember the choice; keep the reader on the same section.
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('[data-lang-switch]') : null;
    if (!link) return;
    try { window.localStorage.setItem('c3-lang', here === 'ar' ? 'en' : 'ar'); } catch (err) {}
    var hash = window.location.hash;
    if (hash) link.href = link.href.split('#')[0] + hash;
  });
})();
