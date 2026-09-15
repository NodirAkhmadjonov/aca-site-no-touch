/* ============================================================================
   ACA DESIGN SYSTEM — reception desk (aca-reception-desk-*.html)
   Staff confirm, move or decline appointment requests. The table ships with
   four sample rows; requests made on the booking page (booking.js,
   localStorage['aca.bookings']) are added above them. Decisions are kept in
   localStorage['aca.desk'] so they survive a reload.

   PROTOTYPE: on the server this page sits behind staff sign-in and every
   decision is PATCH /api/reception/bookings/{n} followed by an SMS to the
   applicant (API-site.md). Applicant data is written with textContent —
   it comes from a form and is never trusted as markup. All strings are
   data-* on the table, so this file serves all four languages.
   ============================================================================ */
(function () {
  'use strict';

  var table = document.querySelector('.desk-table');
  if (!table) { return; }
  var tbody = table.querySelector('tbody');
  var statusLine = document.querySelector('.desk-status');
  var empty = document.querySelector('.desk-empty');
  var fStatus = document.getElementById('d-status');
  var fWho = document.getElementById('d-who');
  var attr = function (name) { return table.getAttribute('data-' + name) || ''; };

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  var parse = function (k, fallback) { try { return JSON.parse(store.get(k) || '') || fallback; } catch (e) { return fallback; } };
  var decisions = parse('aca.desk', {});
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var human = function (iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; };
  var fill = function (tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; });
  };
  var actionsTemplate = tbody.querySelector('.actions-cell').innerHTML;

  function cell(content, numeric) {
    var td = document.createElement('td');
    td.setAttribute('role', 'cell');
    if (numeric) { td.className = 'num'; }
    if (typeof content === 'string') { td.textContent = content; } else { td.appendChild(content); }
    return td;
  }
  function rowFor(b) {
    var tr = document.createElement('tr');
    tr.setAttribute('role', 'row');
    tr.dataset.id = b.n; tr.dataset.status = 'new'; tr.dataset.who = b.who;
    tr.dataset.date = b.date; tr.dataset.time = b.time;
    var person = document.createDocumentFragment();
    person.appendChild(document.createTextNode(b.name));
    person.appendChild(document.createElement('br'));
    var small = document.createElement('small');
    small.textContent = b.phone;
    person.appendChild(small);
    var pill = document.createElement('span');
    pill.className = 'status-pill';
    var actions = document.createElement('span');
    actions.className = 'actions-cell';
    actions.innerHTML = actionsTemplate;   // our own static buttons, not applicant data
    [cell(b.n, true), cell(person), cell(attr('w-' + b.who)), cell('', true), cell(attr('t-' + b.topic)),
     cell(pill), cell(actions)].forEach(function (td) { tr.appendChild(td); });
    return tr;
  }

  // Requests from the booking page, newest first, above the sample rows.
  parse('aca.bookings', []).filter(function (b) { return b.status !== 'cancelled'; })
    .forEach(function (b) {
      if (!tbody.querySelector('tr[data-id="' + b.n + '"]')) { tbody.insertBefore(rowFor(b), tbody.firstChild); }
    });

  var rows = function () { return [].slice.call(tbody.querySelectorAll('tr[data-id]')); };

  function paint(tr) {
    var d = decisions[tr.dataset.id];
    if (d) { tr.dataset.status = d.status; if (d.date) { tr.dataset.date = d.date; } }
    var st = tr.dataset.status;
    var pill = tr.querySelector('.status-pill');
    pill.dataset.status = st;
    pill.textContent = attr('s-' + st);
    tr.cells[3].textContent = human(tr.dataset.date) + ', ' + tr.dataset.time;
    var show = { confirm: st === 'new' || st === 'moved', move: st === 'new' || st === 'confirmed',
                 decline: st === 'new', undo: st !== 'new' };
    [].forEach.call(tr.querySelectorAll('[data-act]'), function (b) { b.hidden = !show[b.dataset.act]; });
  }
  function counts() {
    var n = { 'new': 0, confirmed: 0, moved: 0, declined: 0 };
    rows().forEach(function (tr) { n[tr.dataset.status]++; });
    Object.keys(n).forEach(function (k) {
      var b = document.querySelector('[data-count="' + k + '"]');
      if (b) { b.textContent = n[k]; }
    });
  }
  function filter() {
    var visible = 0;
    rows().forEach(function (tr) {
      var ok = (!fStatus.value || tr.dataset.status === fStatus.value) && (!fWho.value || tr.dataset.who === fWho.value);
      tr.hidden = !ok;
      if (ok) { visible++; }
    });
    empty.hidden = visible > 0;
  }

  tbody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) { return; }
    var tr = btn.closest('tr');
    var id = tr.dataset.id;
    var d = decisions[id] || {};
    var act = btn.dataset.act;
    if (act === 'confirm') { d.status = 'confirmed'; }
    else if (act === 'decline') { d.status = 'declined'; }
    else if (act === 'undo') { d.status = 'new'; }
    else if (act === 'move') {
      var p = tr.dataset.date.split('-');
      var next = new Date(+p[0], +p[1] - 1, +p[2] + 7);
      d.status = 'moved';
      d.date = next.getFullYear() + '-' + pad(next.getMonth() + 1) + '-' + pad(next.getDate());
    }
    decisions[id] = d;
    store.set('aca.desk', JSON.stringify(decisions));
    paint(tr);
    counts();
    filter();
    statusLine.textContent = fill(attr('done'), { n: id, status: attr('s-' + d.status) });
    // The pressed button may now be hidden; keep focus in the row.
    var target = [].filter.call(tr.querySelectorAll('[data-act]'), function (b) { return !b.hidden; })[0];
    if (target && !tr.hidden) { target.focus(); } else { statusLine.setAttribute('tabindex', '-1'); statusLine.focus(); }
  });
  fStatus.addEventListener('change', filter);
  fWho.addEventListener('change', filter);

  rows().forEach(paint);
  counts();
  filter();
})();
