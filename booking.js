/* ============================================================================
   ACA DESIGN SYSTEM — appointment booking (aca-booking-*.html)
   Official → date → time, then the applicant's details. Dates follow each
   official's schedule rule on the <option> (data-rule="first:1" = first
   Monday of the month, "weekly:2" = every Tuesday; JS getDay numbering),
   times run every 30 minutes from data-from to data-to.

   PROTOTYPE: bookings are kept in localStorage['aca.bookings'], where the
   reception desk page (desk.js) reads them. A few times show as taken — the
   same ones on every load, derived from the date — so the disabled state is
   visible. The real endpoints are in API-site.md (GET /api/reception/slots,
   POST /api/reception/bookings). The phone mask comes from opendata.js.
   Every string is in data-* or in the HTML, so this file serves all four
   languages.
   ============================================================================ */
(function () {
  'use strict';

  var form = document.querySelector('.booking-form');
  if (!form) { return; }
  var done = form.parentNode.querySelector('.booking-done');
  var who = form.querySelector('[name="who"]');
  var dateBox = form.querySelector('[data-slots="date"]');
  var timeBox = form.querySelector('[data-slots="time"]');
  var summaryBox = form.querySelector('.error-summary');
  var summaryList = summaryBox.querySelector('ul');
  var KEY = form.dataset.store || 'aca.bookings';
  var months = form.dataset.months.split(',');
  var weekdays = form.dataset.weekdays.split(',');

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  var bookings = function () { try { return JSON.parse(store.get(KEY) || '[]') || []; } catch (e) { return []; } };
  var pad = function (n, w) { n = String(n); while (n.length < (w || 2)) { n = '0' + n; } return n; };
  var isoOf = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var human = function (iso) { var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; };
  var fill = function (tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; });
  };

  /* ------------------------------------------------------------ Slots */
  function nextDates(rule, count) {
    var parts = rule.split(':');
    var weekday = parseInt(parts[1], 10);
    var out = [];
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);   // from tomorrow: today's reception is already planned
    for (var guard = 0; out.length < count && guard < 500; guard++) {
      if (d.getDay() === weekday && (parts[0] !== 'first' || d.getDate() <= 7)) { out.push(new Date(d.getTime())); }
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  function timesBetween(from, to) {
    var toMin = function (t) { var p = t.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); };
    var out = [];
    for (var m = toMin(from); m < toMin(to); m += 30) { out.push(pad(Math.floor(m / 60)) + ':' + pad(m % 60)); }
    return out;
  }
  function isTaken(whoValue, iso, time) {
    var booked = bookings().some(function (b) {
      return b.status !== 'cancelled' && b.who === whoValue && b.date === iso && b.time === time;
    });
    var h = 0, key = whoValue + iso + time;
    for (var i = 0; i < key.length; i++) { h = (h * 31 + key.charCodeAt(i)) % 997; }
    return booked || h % 4 === 0;
  }
  function slot(name, value, label, sub, disabled) {
    var id = 'bk-' + name + '-' + value.replace(/[^\w]/g, '');
    var wrap = document.createElement('label');
    wrap.className = 'slot';
    wrap.setAttribute('for', id);
    var input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.id = id; input.value = value;
    input.disabled = !!disabled;
    var box = document.createElement('span');
    box.className = 'slot-box';
    box.appendChild(document.createTextNode(label));
    if (sub) {
      var small = document.createElement('small');
      small.textContent = sub;
      box.appendChild(small);
    }
    wrap.appendChild(input);
    wrap.appendChild(box);
    return wrap;
  }
  function note(text) {
    var p = document.createElement('p');
    p.className = 'slots-note';
    p.textContent = text;
    return p;
  }
  function currentOption() { return who.options[who.selectedIndex]; }

  function renderDates() {
    dateBox.innerHTML = '';
    timeBox.innerHTML = '';
    var opt = currentOption();
    if (!opt || !opt.value) { return; }
    var count = opt.dataset.rule.indexOf('first') === 0 ? 3 : 6;
    nextDates(opt.dataset.rule, count).forEach(function (d) {
      dateBox.appendChild(slot('date', isoOf(d), d.getDate() + ' ' + months[d.getMonth()], weekdays[(d.getDay() + 6) % 7]));
    });
    timeBox.appendChild(note(form.dataset.chooseDate));
  }
  function renderTimes() {
    timeBox.innerHTML = '';
    var opt = currentOption();
    var picked = dateBox.querySelector('input:checked');
    if (!opt || !opt.value || !picked) { timeBox.appendChild(note(form.dataset.chooseDate)); return; }
    var free = 0;
    timesBetween(opt.dataset.from, opt.dataset.to).forEach(function (t) {
      var taken = isTaken(opt.value, picked.value, t);
      if (!taken) { free++; }
      timeBox.appendChild(slot('time', t, t, taken ? form.dataset.taken : '', taken));
    });
    if (!free) { timeBox.appendChild(note(form.dataset.noSlots)); }
  }
  who.addEventListener('change', renderDates);
  dateBox.addEventListener('change', renderTimes);

  // ?to=dir|dep|heads — the "Book" button on a leadership card preselects the official.
  var wanted = (location.search.match(/[?&]to=(\w+)/) || [])[1];
  if (wanted && who.querySelector('option[value="' + wanted + '"]')) { who.value = wanted; }
  renderDates();

  /* --------------------------------------------------------- Counter */
  var counter = form.querySelector('.char-count');
  var question = form.querySelector('textarea');
  if (counter && question) {
    var max = parseInt(question.getAttribute('maxlength'), 10) || 500;
    var tick = function () { counter.textContent = fill(counter.dataset.left, { n: max - question.value.length, max: max }); };
    counter.setAttribute('aria-live', 'polite');
    question.addEventListener('input', tick);
    tick();
  }

  /* ------------------------------------------------------ Validation
     On submit only. A summary at the top takes focus and links each problem
     to its field; the message also appears next to the field. Messages are
     authored in the HTML. */
  function mark(container, control, on) {
    var msg = container.querySelector('.error-msg');
    if (msg) { msg.hidden = !on; }
    if (control && control.type !== 'radio') {
      control.setAttribute('aria-invalid', String(on));
      var ids = (control.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      ids = ids.filter(function (x) { return !msg || x !== msg.id; });
      if (on && msg) { ids.push(msg.id); }
      if (ids.length) { control.setAttribute('aria-describedby', ids.join(' ')); }
      else { control.removeAttribute('aria-describedby'); }
    }
    return on;
  }
  function check() {
    var bad = [];
    var add = function (name, failed) {
      var control = form.querySelector('[name="' + name + '"]');
      var container = control ? (control.closest('.field') || control.closest('fieldset')) : null;
      if (!container) { return; }
      if (mark(container, control, failed)) { bad.push({ container: container, focus: control }); }
    };
    var group = function (key) {
      var container = form.querySelector('[data-slot-field="' + key + '"]');
      var picked = container.querySelector('input:checked');
      var first = container.querySelector('input:not(:disabled)') || who;
      if (mark(container, null, !picked)) { bad.push({ container: container, focus: first }); }
    };
    var val = function (name) { return (form.querySelector('[name="' + name + '"]').value || '').trim(); };
    add('who', !who.value);
    group('date');
    group('time');
    add('topic', !val('topic'));
    add('question', !val('question') || val('question').length > 500);
    add('name', !val('name'));
    add('phone', !/^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(val('phone')));
    add('email', !!val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')));
    add('consent', !form.querySelector('[name="consent"]').checked);
    return bad;
  }
  function showSummary(bad) {
    summaryList.innerHTML = '';
    bad.forEach(function (b) {
      var label = b.container.querySelector('legend, label');
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + (b.focus.id || '');
      a.textContent = (label ? label.textContent.replace(/\*/g, '').trim() : '') + ' — ' +
        b.container.querySelector('.error-msg').textContent.trim();
      a.addEventListener('click', function (e) { e.preventDefault(); b.focus.focus(); });
      li.appendChild(a);
      summaryList.appendChild(li);
    });
    summaryBox.querySelector('h2').textContent = fill(summaryBox.dataset.title, { n: bad.length });
    summaryBox.hidden = false;
    summaryBox.focus();
  }
  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true') {
      var container = e.target.closest('.field');
      if (container) { mark(container, e.target, false); }
    }
  });
  form.addEventListener('change', function (e) {
    var group = e.target.closest('[data-slot-field]');
    if (group) { mark(group, null, false); }
  });

  /* ---------------------------------------------------------- Submit */
  function showDone(b) {
    var opt = who.querySelector('option[value="' + b.who + '"]');
    var topic = form.querySelector('[name="topic"] option[value="' + b.topic + '"]');
    done.querySelector('.booking-number').textContent = fill(done.dataset.number, { n: b.n });
    var dl = done.querySelector('.booking-summary');
    dl.innerHTML = '';
    [[done.dataset.lWho, opt ? opt.dataset.short : b.who],
     [done.dataset.lWhen, human(b.date) + ', ' + b.time],
     [done.dataset.lTopic, topic ? topic.textContent : b.topic],
     [done.dataset.lName, b.name],
     [done.dataset.lPhone, b.phone]].forEach(function (pair) {
      var dt = document.createElement('dt'); dt.textContent = pair[0];
      var dd = document.createElement('dd'); dd.textContent = pair[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    dl.hidden = false;
    done.querySelector('.booking-cancel').hidden = false;
    done.dataset.current = b.n;
    form.hidden = true;
    done.hidden = false;
    done.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.querySelector('[name="website"]').value) { form.hidden = true; done.hidden = false; return; }
    var bad = check();
    if (bad.length) { showSummary(bad); return; }
    summaryBox.hidden = true;
    var now = new Date();
    var list = bookings();
    var b = {
      n: 'Q-' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + pad(list.length + 11, 3),
      who: who.value,
      date: dateBox.querySelector('input:checked').value,
      time: timeBox.querySelector('input:checked').value,
      topic: form.querySelector('[name="topic"]').value,
      question: form.querySelector('[name="question"]').value.trim(),
      prev: form.querySelector('[name="prev"]').value.trim(),
      name: form.querySelector('[name="name"]').value.trim(),
      phone: form.querySelector('[name="phone"]').value.trim(),
      email: form.querySelector('[name="email"]').value.trim(),
      created: now.toISOString(),
      status: 'new'
    };
    list.push(b);
    store.set(KEY, JSON.stringify(list));
    showDone(b);
  });

  done.querySelector('.booking-cancel').addEventListener('click', function () {
    var id = done.dataset.current;
    var list = bookings().map(function (b) { if (b.n === id) { b.status = 'cancelled'; } return b; });
    store.set(KEY, JSON.stringify(list));
    done.querySelector('.booking-number').textContent = done.dataset.cancelled;
    done.querySelector('.booking-summary').hidden = true;
    done.querySelector('.booking-cancel').hidden = true;
    form.reset();
    renderDates();
    if (counter) { counter.textContent = fill(counter.dataset.left, { n: 500, max: 500 }); }
    form.hidden = false;
    done.focus();
  });
})();
