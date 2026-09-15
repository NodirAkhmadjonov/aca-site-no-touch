/* ============================================================================
   ACA DESIGN SYSTEM — live figures (aca-appeals-results-*.html)
   The tiles and the two chart tables carry data-live-key; this script reads
   the feed named by [data-live] data-src every data-interval seconds, writes
   the numbers into those elements and asks charts.js to redraw from the
   updated tables. Every string comes from data-* on the bar.

   PROTOTYPE: data/appeals-live.json is a fixed file, so with data-demo the
   figures are advanced locally between reads to show what auto-update looks
   like. On the server the feed is GET /api/stats/appeals/live (API-site.md)
   and data-demo comes off.

   WCAG 2.2.2: anything that updates by itself can be paused — the button
   does that, and updates also stop while the tab is hidden. Only the
   "Updated at" line is a live region; the numbers are not announced every
   ten seconds.
   ============================================================================ */
(function () {
  'use strict';

  var bar = document.querySelector('[data-live]');
  if (!bar) { return; }
  var status = bar.querySelector('.live-status');
  var toggle = bar.querySelector('.live-toggle');
  var every = (parseInt(bar.dataset.interval, 10) || 30) * 1000;
  var demo = bar.hasAttribute('data-demo');
  var timer = null, paused = false, state = null;
  var RESULT_KEYS = ['granted', 'explained', 'redirected', 'refused'];
  var RESULT_SHARE = [0.41, 0.34, 0.15, 0.10];

  var fmt = function (v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var fill = function (tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; });
  };
  var num = function (s) { return parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0; };
  var clock = function () {
    var d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (x) { return (x < 10 ? '0' : '') + x; }).join(':');
  };
  var nodes = function (key) { return [].slice.call(document.querySelectorAll('[data-live-key="' + key + '"]')); };

  function fromDom() {
    var get = function (k) { var n = nodes(k)[0]; return n ? num(n.textContent) : 0; };
    var s = { today: get('today'), review: get('review'), resolved: get('resolved'), days: get('days'),
      results: {}, monthLast: get('m-last') };
    RESULT_KEYS.forEach(function (k) { s.results[k] = get('r-' + k); });
    return s;
  }
  function fromFeed(j) {
    return { today: j.today, review: j.review, resolved: j.resolved, days: j.days,
      results: j.results, monthLast: j.months[j.months.length - 1] };
  }

  function paint(s) {
    var set = function (k, v) { nodes(k).forEach(function (n) { n.textContent = fmt(v); }); };
    set('today', s.today); set('review', s.review); set('resolved', s.resolved); set('days', s.days);
    RESULT_KEYS.forEach(function (k) { set('r-' + k, s.results[k]); });
    set('m-last', s.monthLast);
    // The entrance animation is for the first draw only; replaying it every
    // ten seconds would make the charts flicker.
    document.documentElement.classList.remove('charts-animate');
    document.dispatchEvent(new Event('charts:redraw'));
    status.textContent = fill(bar.dataset.updated, { time: clock() });
    bar.classList.remove('is-offline');
  }

  // Demo only: a few appeals arrive, a few are resolved, the totals stay consistent.
  function advance(s) {
    var came = Math.floor(Math.random() * 3);
    var closed = Math.min(Math.floor(Math.random() * 3), s.review + came);
    s.today += came;
    s.review += came - closed;
    s.resolved += closed;
    s.monthLast += closed;
    for (var i = 0; i < closed; i++) {
      var r = Math.random(), acc = 0;
      for (var j = 0; j < RESULT_KEYS.length; j++) {
        acc += RESULT_SHARE[j];
        if (r < acc || j === RESULT_KEYS.length - 1) { s.results[RESULT_KEYS[j]]++; break; }
      }
    }
  }

  function load() {
    if (!window.fetch || !window.Promise || !bar.dataset.src) {
      return { then: function (ok, fail) { fail(); return { then: function (f) { f(); } }; } };
    }
    return fetch(bar.dataset.src, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.json();
    });
  }

  function refresh() {
    if (demo && state) { advance(state); paint(state); return; }
    load().then(function (j) { state = fromFeed(j); paint(state); }, function () {
      if (!state) { state = fromDom(); }
      status.textContent = bar.dataset.offline;
      bar.classList.add('is-offline');
    });
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() { stop(); timer = setInterval(refresh, every); }

  toggle.addEventListener('click', function () {
    paused = !paused;
    toggle.textContent = paused ? bar.dataset.resume : bar.dataset.pause;
    bar.classList.toggle('is-paused', paused);
    if (paused) { stop(); status.textContent = bar.dataset.paused; }
    else { refresh(); start(); }
  });
  document.addEventListener('visibilitychange', function () {
    if (paused) { return; }
    if (document.hidden) { stop(); } else { refresh(); start(); }
  });

  // First read: the feed (a file in the prototype). If it cannot be read —
  // opened from disk, say — the numbers already in the page are the baseline.
  load().then(function (j) { state = fromFeed(j); paint(state); },
              function () { state = fromDom(); })
        .then(start);
})();
