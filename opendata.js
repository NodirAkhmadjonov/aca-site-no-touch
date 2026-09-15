/* ============================================================================
   ACA DESIGN SYSTEM — open data passport page (aca-opendata-item-*.html)
   Rating, feedback form with a locally drawn captcha, phone mask.

   PROTOTYPE. There is no server: the vote and the "sent" state live in
   localStorage, the captcha is drawn and checked in the browser. The real
   endpoints are in API-site.md. Every string comes from data-* attributes
   on the component roots, so this file is the same for all four languages.
   ============================================================================ */
(function () {
  'use strict';

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  var fill = function (tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; });
  };
  var formatNumber = function (n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  /* ------------------------------------------------------------- Rating
     Five radios styled as stars; native radios give arrow-key movement and
     announce "3 of 5" for free. The aggregate shown is a demo base
     (data-count / data-avg) plus this visitor's vote. */
  var rating = document.querySelector('.rating');
  if (rating) {
    var id = rating.dataset.id;
    var key = 'aca.rating.' + id;
    var inputs = [].slice.call(rating.querySelectorAll('input[type=radio]'));
    var value = rating.querySelector('.rating-value');
    var countText = rating.querySelector('.rating-count');
    var starsFill = rating.querySelector('.stars-avg-fill');
    var thanks = rating.querySelector('.rating-thanks');
    var change = rating.querySelector('.rating-change');
    var fieldset = rating.querySelector('fieldset');
    var baseCount = parseInt(rating.dataset.count, 10) || 0;
    var baseAvg = parseFloat(rating.dataset.avg) || 0;

    var render = function () {
      var mine = parseInt(store.get(key), 10) || 0;
      var count = baseCount + (mine ? 1 : 0);
      var avg = count ? ((baseAvg * baseCount + mine) / count) : 0;
      value.textContent = avg.toFixed(1).replace('.', rating.dataset.decimal || ',');
      countText.textContent = fill(rating.dataset.ratings, { count: formatNumber(count) });
      // The filled row is clipped to the average's share of five stars, so 4.3
      // shows four stars and a third of the fifth rather than rounding.
      starsFill.style.width = (Math.max(0, Math.min(5, avg)) / 5 * 100).toFixed(1) + '%';
      inputs.forEach(function (i) { i.checked = parseInt(i.value, 10) === mine; });
      if (mine) {
        thanks.textContent = fill(rating.dataset.thanks, {
          stars: '★'.repeat(mine) + '☆'.repeat(5 - mine), n: mine
        });
        thanks.hidden = false;
        change.hidden = false;
        fieldset.hidden = true;
      } else {
        thanks.hidden = true;
        change.hidden = true;
        fieldset.hidden = false;
      }
    };
    inputs.forEach(function (i) {
      i.addEventListener('change', function () { store.set(key, i.value); render(); });
    });
    change.addEventListener('click', function () {
      store.del(key);
      render();
      inputs[0].focus();
    });
    render();
  }

  /* ------------------------------------------------------------ Phone mask
     +998 __ ___ __ __ — digits only, the country code is fixed. */
  [].slice.call(document.querySelectorAll('input[data-mask="uz-phone"]')).forEach(function (el) {
    var format = function (v) {
      var d = v.replace(/\D/g, '');
      if (d.indexOf('998') === 0) { d = d.slice(3); }
      d = d.slice(0, 9);
      var out = '+998';
      if (d.length) { out += ' ' + d.slice(0, 2); }
      if (d.length > 2) { out += ' ' + d.slice(2, 5); }
      if (d.length > 5) { out += ' ' + d.slice(5, 7); }
      if (d.length > 7) { out += ' ' + d.slice(7, 9); }
      return out;
    };
    el.addEventListener('focus', function () { if (!el.value) { el.value = '+998 '; } });
    el.addEventListener('input', function () { el.value = format(el.value); });
    el.addEventListener('blur', function () { if (el.value === '+998 ' || el.value === '+998') { el.value = ''; } });
  });

  /* --------------------------------------------------------------- Captcha
     Drawn on a canvas from an alphabet without look-alikes (no 0/O, 1/I).
     Prototype only: a server captcha must come with an audio alternative
     (WCAG 1.1.1) — see API-site.md. Redrawn on demand and whenever the
     accessibility panel changes contrast (a11y:change). */
  var captcha = document.querySelector('.captcha');
  var captchaCode = '';
  if (captcha) {
    var canvas = captcha.querySelector('canvas');
    var refresh = captcha.querySelector('.captcha-refresh');
    var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var draw = function () {
      captchaCode = '';
      for (var i = 0; i < 5; i++) { captchaCode += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length)); }
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height;
      var cs = getComputedStyle(captcha);
      var ink = cs.color, paper = cs.backgroundColor;
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.25;
      for (var l = 0; l < 6; l++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.lineTo(Math.random() * w, Math.random() * h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.textBaseline = 'middle';
      var step = w / 6;
      for (var c = 0; c < 5; c++) {
        ctx.save();
        ctx.translate(step * (c + 1), h / 2 + (Math.random() * 8 - 4));
        ctx.rotate((Math.random() * 30 - 15) * Math.PI / 180);
        ctx.font = (Math.random() > 0.5 ? '700 ' : '600 ') + (26 + Math.random() * 6) + 'px ' + cs.fontFamily;
        ctx.fillText(captchaCode.charAt(c), -9, 0);
        ctx.restore();
      }
      var input = captcha.querySelector('input');
      if (input) { input.value = ''; }
    };
    draw();
    refresh.addEventListener('click', function () { draw(); captcha.querySelector('input').focus(); });
    document.addEventListener('a11y:change', draw);
  }

  /* --------------------------------------------------------- Feedback form
     Validation on submit only (no nagging while typing). Errors are shown
     twice on purpose: a summary at the top that receives focus and lists
     the fields as links, and the message next to each field. The messages
     are authored in the HTML (p.error-msg[hidden]) — nothing is invented
     here. */
  var form = document.querySelector('.feedback-form');
  if (form) {
    var id2 = form.dataset.id;
    var doneKey = 'aca.feedback.' + id2;
    var summaryBox = form.querySelector('.error-summary');
    var summaryList = summaryBox.querySelector('ul');
    var success = document.querySelector('.feedback-done');

    var counter = form.querySelector('.char-count');
    var review = form.querySelector('textarea');
    if (counter && review) {
      var max = parseInt(review.getAttribute('maxlength'), 10) || 500;
      var tick = function () {
        counter.textContent = fill(counter.dataset.left, { n: max - review.value.length, max: max });
      };
      counter.setAttribute('aria-live', 'polite');
      review.addEventListener('input', tick);
      tick();
    }

    var setError = function (el, on) {
      var field = el.closest('.field');
      var msg = field && field.querySelector('.error-msg');
      el.setAttribute('aria-invalid', String(on));
      if (msg) {
        msg.hidden = !on;
        var ids = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        if (on && ids.indexOf(msg.id) < 0) { ids.push(msg.id); }
        if (!on) { ids = ids.filter(function (x) { return x !== msg.id; }); }
        if (ids.length) { el.setAttribute('aria-describedby', ids.join(' ')); }
        else { el.removeAttribute('aria-describedby'); }
      }
      return on;
    };

    var validate = function () {
      var bad = [];
      var name = form.querySelector('[name="name"]');
      var phone = form.querySelector('[name="phone"]');
      var text = form.querySelector('[name="review"]');
      var code = form.querySelector('[name="captcha"]');
      var consent = form.querySelector('[name="consent"]');
      if (setError(name, !name.value.trim())) { bad.push(name); }
      if (setError(phone, !/^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(phone.value))) { bad.push(phone); }
      if (setError(text, !text.value.trim() || text.value.length > 500)) { bad.push(text); }
      if (setError(code, code.value.trim().toUpperCase() !== captchaCode)) { bad.push(code); }
      if (setError(consent, !consent.checked)) { bad.push(consent); }
      return bad;
    };

    var showSummary = function (bad) {
      summaryList.innerHTML = '';
      bad.forEach(function (el) {
        var field = el.closest('.field');
        var label = field.querySelector('label, legend, .field-label');
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + el.id;
        a.textContent = (label ? label.textContent.replace(/\*/g, '').trim() : el.name) +
          ' — ' + field.querySelector('.error-msg').textContent.trim();
        a.addEventListener('click', function (e) { e.preventDefault(); el.focus(); });
        li.appendChild(a);
        summaryList.appendChild(li);
      });
      summaryBox.querySelector('h2').textContent = fill(summaryBox.dataset.title, { n: bad.length });
      summaryBox.hidden = false;
      summaryBox.focus();
    };

    var finish = function () {
      store.set(doneKey, '1');
      form.hidden = true;
      success.hidden = false;
      success.focus();
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // Honeypot: a bot that fills the hidden field gets a silent "success".
      if (form.querySelector('[name="website"]').value) { finish(); return; }
      var bad = validate();
      if (bad.length) { showSummary(bad); return; }
      summaryBox.hidden = true;
      finish();
    });
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') { setError(e.target, false); }
    });

    var again = success.querySelector('.feedback-again');
    if (again) {
      again.addEventListener('click', function () {
        store.del(doneKey);
        form.reset();
        if (captcha) { document.dispatchEvent(new Event('a11y:change')); }
        if (counter) { counter.textContent = fill(counter.dataset.left, { n: 500, max: 500 }); }
        success.hidden = true;
        form.hidden = false;
        form.querySelector('[name="name"]').focus();
      });
    }

    if (store.get(doneKey)) { form.hidden = true; success.hidden = false; }
  }

  /* ------------------------------------------------------ Openness survey
     The online survey on the open data page (aca-opendata-*.html), modelled
     on the one the list points to: name, phone, a three-step rating, the
     item the comment concerns, the comment. Same pattern as the feedback
     form — checked on submit, a focused summary plus a message by each
     field, every message authored in the HTML. Stored in localStorage in
     the prototype; POST /api/surveys/{id} on the server (API-site.md). */
  var survey = document.querySelector('.survey-form');
  if (survey) {
    var surveyKey = 'aca.survey.' + survey.dataset.id;
    var surveyBox = survey.querySelector('.error-summary');
    var surveyList = surveyBox.querySelector('ul');
    var surveyDone = survey.parentNode.querySelector('.survey-done');
    var markField = function (field, control, on) {
      var msg = field.querySelector('.error-msg');
      if (msg) { msg.hidden = !on; }
      if (control.type !== 'radio') { control.setAttribute('aria-invalid', String(on)); }
      return on;
    };
    survey.addEventListener('submit', function (e) {
      e.preventDefault();
      var finishSurvey = function () {
        store.set(surveyKey, '1');
        survey.hidden = true;
        surveyDone.hidden = false;
        surveyDone.focus();
      };
      if (survey.querySelector('[name="website"]').value) { finishSurvey(); return; }
      var bad = [];
      var need = function (name, failed) {
        var control = survey.querySelector('[name="' + name + '"]');
        var field = control.closest('.field');
        if (markField(field, control, failed)) { bad.push({ field: field, control: control }); }
      };
      var val = function (name) { return survey.querySelector('[name="' + name + '"]').value.trim(); };
      need('name', !val('name'));
      need('phone', !/^\+998 \d{2} \d{3} \d{2} \d{2}$/.test(val('phone')));
      need('score', !survey.querySelector('[name="score"]:checked'));
      need('item', !val('item'));
      need('comment', !val('comment'));
      need('consent', !survey.querySelector('[name="consent"]').checked);
      if (!bad.length) { surveyBox.hidden = true; finishSurvey(); return; }
      surveyList.innerHTML = '';
      bad.forEach(function (b) {
        var label = b.field.querySelector('legend, label');
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + b.control.id;
        a.textContent = (label ? label.textContent.replace(/\*/g, '').trim() : b.control.name) +
          ' — ' + b.field.querySelector('.error-msg').textContent.trim();
        a.addEventListener('click', function (ev) { ev.preventDefault(); b.control.focus(); });
        li.appendChild(a);
        surveyList.appendChild(li);
      });
      surveyBox.querySelector('h2').textContent = fill(surveyBox.dataset.title, { n: bad.length });
      surveyBox.hidden = false;
      surveyBox.focus();
    });
    survey.addEventListener('change', function (e) {
      var field = e.target.closest('.field');
      if (field && field.querySelector('.error-msg:not([hidden])')) { markField(field, e.target, false); }
    });
    var surveyAgain = surveyDone.querySelector('.survey-again');
    if (surveyAgain) {
      surveyAgain.addEventListener('click', function () {
        store.del(surveyKey);
        survey.reset();
        surveyDone.hidden = true;
        survey.hidden = false;
        survey.querySelector('[name="name"]').focus();
      });
    }
    if (store.get(surveyKey)) { survey.hidden = true; surveyDone.hidden = false; }
  }
})();
