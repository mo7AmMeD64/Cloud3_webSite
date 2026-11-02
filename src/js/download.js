/* Latest release: live API, one-hour cache, build snapshot, plain link. */
(function () {
  var card = document.querySelector('[data-release]');
  if (!card) return;

  var api = card.getAttribute('data-api');
  var fallback = card.getAttribute('data-fallback');
  var releases = card.getAttribute('data-releases');
  var lang = document.documentElement.lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB';
  var els = {
    version: card.querySelector('[data-rel="version"]'),
    date: card.querySelector('[data-rel="date"]'),
    size: card.querySelector('[data-rel="size"]'),
    notes: card.querySelector('[data-rel="notes"]'),
    link: card.querySelector('[data-rel="link"]'),
    label: card.querySelector('[data-rel="link-label"]'),
    offline: card.querySelector('[data-offline]')
  };
  var KEY = 'c3-release-v1';
  var TTL = 3600000;
  var done = false;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pick(rel) {
    if (!rel || typeof rel !== 'object') return null;
    var assets = Array.isArray(rel.assets) ? rel.assets : [];
    var apk = null;
    for (var i = 0; i < assets.length; i++) {
      if (/\.apk$/i.test(assets[i].name || '') && !/debug/i.test(assets[i].name || '')) { apk = assets[i]; break; }
    }
    if (!apk) {
      for (var j = 0; j < assets.length; j++) {
        if (/\.apk$/i.test(assets[j].name || '')) { apk = assets[j]; break; }
      }
    }
    var version = rel.tag_name || rel.version || '';
    if (!version) return null;
    return {
      version: version,
      date: rel.published_at || rel.date || '',
      size: apk ? apk.size : (rel.size || 0),
      url: (apk && apk.browser_download_url) || rel.html_url || releases,
      page: rel.html_url || releases,
      notes: rel.body || rel.notes || ''
    };
  }

  function formatDate(value) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function formatSize(bytes) {
    var n = Number(bytes);
    if (!n || n < 1024) return '';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function set(name, text) {
    var el = els[name];
    if (!el) return;
    el.textContent = text || '—';
    el.classList.remove('is-loading');
  }

  function inline(s) {
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
      if (!/^https?:\/\//i.test(url)) return text;
      return '<a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
    });
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return s;
  }

  function notesHtml(md) {
    if (!md) return '';
    var lines = String(md).replace(/\r/g, '').split('\n');
    var kept = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (/^!\[/.test(line)) continue;
      if (/full changelog/i.test(line)) continue;
      if (/^#{1,6}\s*(what'?s changed|whats new|changes)\s*$/i.test(line)) continue;
      kept.push(line);
      if (kept.length >= 12) break;
    }
    if (!kept.length) return '';

    var out = '';
    var list = '';
    kept.forEach(function (line) {
      var ordered = /^\d+[.)]\s+/.test(line);
      var bullet = /^[-*]\s+/.test(line);
      if (ordered || bullet) {
        var type = ordered ? 'ol' : 'ul';
        if (list !== type) {
          if (list) out += '</' + list + '>';
          out += '<' + type + '>';
          list = type;
        }
        out += '<li>' + inline(line.replace(/^(\d+[.)]|[-*])\s+/, '')) + '</li>';
        return;
      }
      if (list) { out += '</' + list + '>'; list = ''; }
      if (/^#{1,6}\s/.test(line)) out += '<h3>' + inline(line.replace(/^#{1,6}\s+/, '')) + '</h3>';
      else out += '<p>' + inline(line) + '</p>';
    });
    if (list) out += '</' + list + '>';
    return out;
  }

  var seeHtml = '';
  if (els.notes) {
    var existing = els.notes.querySelector('a');
    seeHtml = existing ? existing.outerHTML : '';
  }

  function render(rel) {
    if (!rel) return false;
    done = true;
    set('version', rel.version);
    set('date', formatDate(rel.date));
    set('size', formatSize(rel.size));
    if (els.link) {
      els.link.href = rel.url || rel.page || releases;
      if (els.label) {
        var plain = els.link.getAttribute('data-plain') || '';
        var tpl = els.link.getAttribute('data-template') || plain;
        els.label.textContent = rel.version ? tpl.replace('{version}', rel.version) : plain;
      }
    }
    if (els.notes) {
      var html = notesHtml(rel.notes);
      if (html) {
        els.notes.innerHTML = html;
        els.notes.classList.remove('notes--empty');
      } else {
        els.notes.innerHTML = seeHtml || '';
        els.notes.classList.add('notes--empty');
      }
    }
    if (els.offline) els.offline.classList.add('hide');
    return true;
  }

  function offline() {
    if (done) return;
    done = true;
    ['version', 'date', 'size'].forEach(function (name) {
      var el = els[name];
      if (el) { el.classList.remove('is-loading'); el.textContent = '—'; }
    });
    if (els.link) els.link.href = releases;
    if (els.label) els.label.textContent = els.link.getAttribute('data-plain') || '';
    if (els.notes) {
      els.notes.innerHTML = seeHtml || '';
      els.notes.classList.add('notes--empty');
    }
    if (els.offline) els.offline.classList.remove('hide');
  }

  function readCache() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || !saved.t || Date.now() - saved.t > TTL) return null;
      return saved.rel || null;
    } catch (e) { return null; }
  }

  function writeCache(rel) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), rel: rel })); } catch (e) {}
  }

  function getJSON(url, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = window.setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, ms);
    var opts = { headers: { Accept: 'application/vnd.github+json' } };
    if (ctrl) opts.signal = ctrl.signal;
    return window.fetch(url, opts).then(function (res) {
      window.clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).catch(function (err) {
      window.clearTimeout(timer);
      throw err;
    });
  }

  var cached = readCache();
  if (cached) render(cached);

  getJSON(api, 6000).then(function (rel) {
    var clean = pick(rel);
    if (!clean) throw new Error('empty release');
    writeCache(clean);
    render(clean);
  }).catch(function () {
    if (done) return;
    getJSON(fallback, 6000).then(function (rel) {
      var clean = pick(rel);
      if (!clean) throw new Error('empty release');
      render(clean);
    }).catch(offline);
  });
})();
