/* The record player: one audio element, three tracks, a spinning disc. */
(function () {
  var root = document.querySelector('[data-player]');
  if (!root) return;

  var audio = root.querySelector('[data-audio]');
  var playBtn = root.querySelector('[data-play]');
  var tracks = Array.prototype.slice.call(root.querySelectorAll('[data-track]'));
  var now = root.querySelector('[data-now]');
  var bar = root.querySelector('[data-bar]');
  var time = root.querySelector('[data-time]');
  if (!audio || !playBtn || !tracks.length) return;

  var startLabel = now ? now.textContent : '';
  var current = -1;

  function fmt(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function paint(state) {
    root.classList.toggle('is-playing', state === 'play');
    playBtn.setAttribute('aria-pressed', state === 'play' ? 'true' : 'false');
    playBtn.setAttribute('aria-label', playBtn.getAttribute(state === 'play' ? 'data-label-pause' : 'data-label-play') || '');
  }

  function select(i, autoplay) {
    if (i === current) { if (autoplay) audio.play(); return; }
    current = i;
    var btn = tracks[i];
    tracks.forEach(function (other, j) {
      other.setAttribute('aria-pressed', j === i ? 'true' : 'false');
    });
    audio.src = btn.getAttribute('data-src');
    if (now) now.textContent = btn.querySelector('.track__t').textContent;
    if (bar) bar.style.width = '0%';
    if (time) time.textContent = '0:00';
    if (autoplay) audio.play();
  }

  playBtn.addEventListener('click', function () {
    if (audio.paused) select(current < 0 ? 0 : current, true);
    else audio.pause();
  });

  tracks.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      if (i === current && !audio.paused) { audio.pause(); return; }
      select(i, true);
    });
  });

  audio.addEventListener('play', function () { paint('play'); });
  audio.addEventListener('pause', function () { paint('pause'); });
  audio.addEventListener('timeupdate', function () {
    var d = audio.duration || 0;
    if (bar && d) bar.style.width = Math.min(100, (audio.currentTime / d) * 100) + '%';
    if (time) time.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', function () {
    if (time && isFinite(audio.duration)) time.textContent = fmt(audio.duration);
  });
  audio.addEventListener('ended', function () {
    if (current < tracks.length - 1) select(current + 1, true);
    else {
      current = -1;
      paint('pause');
      if (bar) bar.style.width = '0%';
      if (time) time.textContent = '0:00';
      if (now) now.textContent = startLabel;
      tracks.forEach(function (t) { t.setAttribute('aria-pressed', 'false'); });
      audio.removeAttribute('src');
    }
  });
  paint('pause');
})();
