/* ============================================================================
   ACA DESIGN SYSTEM — charts drawn from tables
   Loaded only by pages that carry [data-chart]. No library.

   Every chart is generated from the HTML <table> inside its .chart-card:
   the table is the accessible fallback (mandatory — see tokens.css: step 1
   of the ramp is 2.91:1), the chart is a picture of it. The SVG host is
   role="img", labelled by the card's heading and described by the table
   caption. Colours are CSS classes (.s1–.s3, .sk, .st) resolved in base.css
   from --aca-chart-*; an SVG fill attribute can't take var().

   Forms (data-chart=…):
     stacked  — one horizontal stacked bar per row, series from the columns
     share    — a single 100 % stacked bar from the rows (part-to-whole)
     line     — one series over time (rows are the X), crosshair tooltip
     ranked   — one bar per row, single hue, sorted as in the table
   Plus [data-spark="n,n,…"] on a .stat tile → 12-point sparkline.
   ============================================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) { n.setAttribute(k, attrs[k]); } }
    if (parent) { parent.appendChild(n); }
    return n;
  }
  function text(parent, x, y, str, cls, anchor) {
    var t = el('text', { x: x, y: y, 'class': cls || 'ct', 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    return t;
  }
  function num(s) {
    return parseFloat(String(s).replace(/[\s ]/g, '').replace(',', '.')) || 0;
  }
  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function textWidth(str, size) {
    return str.length * (size || 14) * 0.58;   // good enough to decide "does it fit"
  }

  /* Table → { series:[names], rows:[{label, values:[]}] } (tfoot ignored). */
  function readTable(table) {
    var heads = [].slice.call(table.querySelectorAll('thead th')).map(function (th) { return th.textContent.trim(); });
    var rows = [].slice.call(table.querySelectorAll('tbody tr')).map(function (tr) {
      var cells = [].slice.call(tr.children);
      return {
        label: cells[0].textContent.trim(),
        values: cells.slice(1).map(function (c) { return num(c.textContent); })
      };
    });
    return { series: heads.slice(1), rows: rows };
  }

  /* ------------------------------------------------------------ Tooltip
     One per chart host; shown on pointer hover over a mark. Keyboard users
     have the table, which carries every value (tooltips never gate). */
  function tooltip(host) {
    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    host.appendChild(tip);
    return {
      show: function (evt, title, lines) {
        tip.textContent = '';
        var h = document.createElement('strong');
        h.textContent = title;
        tip.appendChild(h);
        lines.forEach(function (l) {
          var row = document.createElement('span');
          if (l.cls) {
            var key = document.createElement('i');
            key.className = 'chart-tip-key ' + l.cls;
            row.appendChild(key);
          }
          var v = document.createElement('b');
          v.textContent = l.value;
          row.appendChild(v);
          row.appendChild(document.createTextNode(' ' + l.name));
          tip.appendChild(row);
        });
        tip.hidden = false;
        var r = host.getBoundingClientRect();
        var x = evt.clientX - r.left + 14, y = evt.clientY - r.top + 14;
        if (x + tip.offsetWidth > r.width - 4) { x = evt.clientX - r.left - tip.offsetWidth - 14; }
        tip.style.left = Math.max(0, x) + 'px';
        tip.style.top = Math.max(0, y) + 'px';
      },
      hide: function () { tip.hidden = true; }
    };
  }
  function hover(mark, tip, title, lines) {
    mark.addEventListener('pointermove', function (e) { mark.classList.add('is-hot'); tip.show(e, title, lines); });
    mark.addEventListener('pointerleave', function () { mark.classList.remove('is-hot'); tip.hide(); });
  }

  /* Charts are drawn at the host's real width, so text stays 13px on a
     phone instead of shrinking with a scaled viewBox; a resize redraws. */
  function hostWidth(h) { return Math.max(280, Math.round(h.clientWidth) || 720); }
  function isNarrow(W) { return W < 560; }

  function host(card, table) {
    var h = document.createElement('div');
    h.className = 'chart';
    var heading = card.querySelector('h2, h3');
    var caption = table.querySelector('caption');
    if (caption && !caption.id) { caption.id = 'cap-' + Math.random().toString(36).slice(2, 8); }
    h.setAttribute('role', 'img');
    if (heading && heading.id) { h.setAttribute('aria-labelledby', heading.id); }
    if (caption) { h.setAttribute('aria-describedby', caption.id); }
    var wrap = table.closest('.table-wrap') || table;
    wrap.parentNode.insertBefore(h, wrap);   // before, never inside: .table-wrap has contain:paint
    return h;
  }

  /* ---------------------------------------------------- Stacked (per row) */
  function drawStacked(card, table, share) {
    var d = readTable(table);
    var rows = d.rows;
    var nSeries = Math.min(d.series.length, 3);
    if (share) {
      // Rows are the parts of one whole: fold them into a single bar.
      rows = [{ label: '', values: d.rows.map(function (r) { return r.values[0]; }) }];
      nSeries = Math.min(d.rows.length, 3);
    }
    var hst = host(card, table);
    var W = hostWidth(hst), narrow = isNarrow(W);
    var labelW = share ? 0 : (narrow ? 48 : 64), valueW = narrow ? 48 : 64, barH = 24, gap = 2, rowH = 44;
    var H = rows.length * rowH;
    var plotW = W - labelW - valueW;
    var max = 0;
    rows.forEach(function (r) {
      var sum = 0;
      for (var i = 0; i < nSeries; i++) { sum += r.values[i]; }
      r.total = sum;
      if (sum > max) { max = sum; }
    });
    var tip = tooltip(hst);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'chart-svg', 'aria-hidden': 'true' }, hst);
    rows.forEach(function (r, ri) {
      var y = ri * rowH + (rowH - barH) / 2;
      if (!share) { text(svg, 0, y + barH / 2 + 5, r.label, 'ct ct-strong'); }
      var x = labelW;
      var lines = [];
      for (var i = 0; i < nSeries; i++) {
        var w = max ? (r.values[i] / max) * plotW : 0;
        var name = share ? d.rows[i].label : d.series[i];
        lines.push({ cls: 's' + (i + 1), value: fmt(r.values[i]), name: name });
        if (w <= 0) { continue; }
        var wv = Math.max(0, w - gap);
        var seg = el('rect', { x: x, y: y, width: wv, height: barH, 'class': 'mark s' + (i + 1) }, svg);
        // Rounded data-end on the last painted segment only, square at the baseline.
        if (i === nSeries - 1 || r.values.slice(i + 1, nSeries).every(function (v) { return !v; })) {
          seg.setAttribute('rx', 4);
          seg.setAttribute('clip-path', 'inset(0 0 0 0 round 0 4px 4px 0)');
        }
        var label = fmt(r.values[i]);
        if (textWidth(label, 13) + 16 < wv) {
          text(svg, x + wv / 2, y + barH / 2 + 5, label, 'ct ct-on', 'middle');
        }
        x += w;
      }
      if (!share) { text(svg, labelW + plotW + 12, y + barH / 2 + 5, fmt(r.total), 'ct ct-strong'); }
      // Hit area: the whole row, bigger than the marks.
      var hit = el('rect', { x: labelW, y: ri * rowH, width: plotW, height: rowH, 'class': 'hit' }, svg);
      hover(hit, tip, share ? fmt(r.total) : r.label, lines);
    });
    hst.style.setProperty('--rows', rows.length);
  }

  /* -------------------------------------------------------- Ranked bars */
  function drawRanked(card, table) {
    var d = readTable(table);
    var hst = host(card, table);
    var W = hostWidth(hst), narrow = isNarrow(W);
    // Narrow: the region name sits above its bar instead of beside it.
    var rowH = narrow ? 48 : 32, barH = narrow ? 16 : 20, labelW = narrow ? 0 : 220, valueW = 60;
    var H = d.rows.length * rowH;
    var plotW = W - labelW - valueW;
    var max = Math.max.apply(null, d.rows.map(function (r) { return r.values[0]; })) || 1;
    var tip = tooltip(hst);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'chart-svg', 'aria-hidden': 'true' }, hst);
    d.rows.forEach(function (r, ri) {
      var y = narrow ? ri * rowH + 26 : ri * rowH + (rowH - barH) / 2;
      var w = (r.values[0] / max) * plotW;
      if (narrow) { text(svg, 0, ri * rowH + 16, r.label, 'ct'); }
      else { text(svg, labelW - 12, y + barH / 2 + 5, r.label, 'ct', 'end'); }
      el('rect', { x: labelW, y: y, width: Math.max(w, 2), height: barH, rx: 4, 'class': 'mark s2' }, svg);
      text(svg, labelW + w + 10, y + barH / 2 + 5, fmt(r.values[0]), 'ct ct-strong');
      var hit = el('rect', { x: 0, y: ri * rowH, width: W, height: rowH, 'class': 'hit' }, svg);
      hover(hit, tip, r.label, [{ cls: 's2', value: fmt(r.values[0]), name: d.series[0] || '' }]);
    });
  }

  /* -------------------------------------------------------------- Line */
  function drawLine(card, table) {
    var d = readTable(table);
    var hst = host(card, table);
    var W = hostWidth(hst), H = 220, padL = 40, padR = 28, padT = 24, padB = 32;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var vals = d.rows.map(function (r) { return r.values[0]; });
    var max = Math.max.apply(null, vals) || 1;
    var top = Math.ceil(max / 5) * 5;   // clean tick ceiling
    var tip = tooltip(hst);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'chart-svg', 'aria-hidden': 'true' }, hst);
    var X = function (i) { return padL + (d.rows.length > 1 ? i * plotW / (d.rows.length - 1) : plotW / 2); };
    var Y = function (v) { return padT + plotH - (v / top) * plotH; };
    // Gridlines: hairline, recessive; ticks at 0, half, top.
    [0, top / 2, top].forEach(function (t) {
      el('line', { x1: padL, x2: W - padR, y1: Y(t), y2: Y(t), 'class': 'grid' }, svg);
      text(svg, padL - 8, Y(t) + 4, fmt(t), 'ct ct-muted', 'end');
    });
    var path = vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    el('path', { d: path + ' L' + X(vals.length - 1).toFixed(1) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(0) + ' Z', 'class': 'area s2' }, svg);
    el('path', { d: path, 'class': 'line s2' }, svg);
    var peak = vals.indexOf(Math.max.apply(null, vals));
    d.rows.forEach(function (r, i) {
      text(svg, X(i), H - 10, r.label, 'ct ct-muted', 'middle');
      var last = i === vals.length - 1;
      if (last || i === peak) {
        el('circle', { cx: X(i), cy: Y(r.values[0]), r: 5, 'class': 'dot s2' }, svg);
        text(svg, X(i), Y(r.values[0]) - 12, fmt(r.values[0]), 'ct ct-strong', 'middle');
      }
    });
    // Crosshair: snaps to the nearest X; one tooltip lists the value there.
    var cross = el('line', { x1: 0, x2: 0, y1: padT, y2: padT + plotH, 'class': 'cross' }, svg);
    cross.style.display = 'none';
    var focus = el('circle', { r: 6, 'class': 'dot s2' }, svg);
    focus.style.display = 'none';
    var hit = el('rect', { x: padL, y: 0, width: plotW, height: H, 'class': 'hit' }, svg);
    hit.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * W;
      var i = Math.round((px - padL) / (plotW / Math.max(1, d.rows.length - 1)));
      i = Math.max(0, Math.min(d.rows.length - 1, i));
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.style.display = '';
      focus.setAttribute('cx', X(i)); focus.setAttribute('cy', Y(vals[i])); focus.style.display = '';
      tip.show(e, d.rows[i].label, [{ cls: 's2', value: fmt(vals[i]), name: d.series[0] || '' }]);
    });
    hit.addEventListener('pointerleave', function () { cross.style.display = 'none'; focus.style.display = 'none'; tip.hide(); });
  }

  /* --------------------------------------------------------- Sparklines
     12 points in the de-emphasis hue, the current period marked in the
     accent. Decorative: the tile's value is the datum, the trend is context. */
  function drawSpark(tile) {
    var vals = tile.dataset.spark.split(',').map(num);
    if (vals.length < 2) { return; }
    var W = 120, H = 32, pad = 4;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var X = function (i) { return pad + i * (W - 2 * pad) / (vals.length - 1); };
    var Y = function (v) { return max === min ? H / 2 : pad + (H - 2 * pad) - (v - min) / (max - min) * (H - 2 * pad); };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'spark', 'aria-hidden': 'true' });
    var path = vals.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    el('path', { d: path, 'class': 'spark-line' }, svg);
    el('circle', { cx: X(vals.length - 1), cy: Y(vals[vals.length - 1]), r: 4, 'class': 'spark-dot' }, svg);
    tile.appendChild(svg);
    if (tile.dataset.sparkLabel) {
      var sr = document.createElement('span');
      sr.className = 'sr';
      sr.textContent = tile.dataset.sparkLabel;
      tile.appendChild(sr);
    }
  }

  var cards = [].slice.call(document.querySelectorAll('[data-chart]'));
  var drawnAt = 0;
  function render() {
    cards.forEach(function (card) {
      var table = card.querySelector('table');
      if (!table) { return; }
      var old = card.querySelector('.chart');
      if (old) { old.parentNode.removeChild(old); }
      var kind = card.dataset.chart;
      if (kind === 'stacked') { drawStacked(card, table, false); }
      else if (kind === 'share') { drawStacked(card, table, true); }
      else if (kind === 'line') { drawLine(card, table); }
      else if (kind === 'ranked') { drawRanked(card, table); }
      card.classList.add('has-chart');
    });
    drawnAt = window.innerWidth;
  }
  render();
  // A page whose table values change in place (live.js on the appeal results
  // page) asks for a redraw; the tables stay the source of every mark.
  document.addEventListener('charts:redraw', render);
  var timer = null;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { if (window.innerWidth !== drawnAt) { render(); } }, 150);
  });
  [].slice.call(document.querySelectorAll('[data-spark]')).forEach(drawSpark);
  if (!reduce) { document.documentElement.classList.add('charts-animate'); }
})();
