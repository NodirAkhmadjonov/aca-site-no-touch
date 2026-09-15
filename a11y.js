/* ============================================================================
   ACA DESIGN SYSTEM — accessibility panel + read-aloud
   Loaded in <head> right after base.css, NOT deferred: the first thing it
   does is put the saved settings on <html> as data-a11y-* attributes, before
   the first paint, so a visitor who chose "white on black" never sees a
   white flash. The panel itself is built on DOMContentLoaded from the
   dictionary below (this script generates the markup, so it carries the
   strings for all four languages; the language comes from <html lang>).

   Settings → attributes:
     data-a11y-font="125|150"       body zoom (base.css is px-based)
     data-a11y-contrast="light|dark|yellow"   Layer-2 token overrides in tokens.css
     data-a11y-images="off"         images hidden, alt text shown
     data-a11y-spacing="wide"       letter/word spacing
     data-a11y-lines="wide"         line-height tokens
   Persisted in localStorage['aca.a11y'] as JSON. Every change dispatches
   `a11y:change` on document (the captcha redraws on it).

   Read-aloud uses the Web Speech API when present: page text is split into
   sentence-sized chunks (Chrome silently drops utterances longer than ~15 s),
   the element being read is highlighted, voices are matched to the page
   language with Russian as the fallback for Uzbek (a note says so).
   ============================================================================ */
(function () {
  'use strict';

  var KEY = 'aca.a11y';
  var FIELDS = ['font', 'contrast', 'images', 'spacing', 'lines'];
  var root = document.documentElement;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(s) {
    try {
      var keep = {};
      FIELDS.forEach(function (f) { if (s[f]) { keep[f] = s[f]; } });
      if (Object.keys(keep).length) { localStorage.setItem(KEY, JSON.stringify(keep)); }
      else { localStorage.removeItem(KEY); }
    } catch (e) { /* private mode */ }
  }
  function apply(s) {
    FIELDS.forEach(function (f) {
      if (s[f]) { root.setAttribute('data-a11y-' + f, s[f]); }
      else { root.removeAttribute('data-a11y-' + f); }
    });
  }

  var settings = load();
  apply(settings);   // before first paint

  /* ------------------------------------------------------------ Strings */
  var T = {
    ru: {
      title: 'Версия для слабовидящих', close: 'Закрыть', reset: 'Сбросить настройки',
      font: 'Размер шрифта', contrast: 'Цветовая схема', images: 'Изображения',
      spacing: 'Межбуквенный интервал', lines: 'Межстрочный интервал',
      normal: 'Обычная', light: 'Чёрный на белом', dark: 'Белый на чёрном', yellow: 'Жёлтый на чёрном',
      show: 'Показывать', hide: 'Скрыть', usual: 'Обычный', wide: 'Увеличенный',
      read: 'Озвучивание', play: 'Прослушать страницу', pause: 'Пауза', resume: 'Продолжить',
      stop: 'Стоп', selection: 'Читать выделенное', reading: 'Идёт озвучивание…', finished: 'Озвучивание завершено',
      noSelection: 'Сначала выделите текст на странице', noSpeech: 'Озвучивание не поддерживается этим браузером',
      noVoice: 'Голос для узбекского языка недоступен на этом устройстве — используется русский'
    },
    uz: {
      title: 'Ko‘rish qiyin bo‘lganlar uchun', close: 'Yopish', reset: 'Sozlamalarni tiklash',
      font: 'Shrift o‘lchami', contrast: 'Rang sxemasi', images: 'Tasvirlar',
      spacing: 'Harflar oralig‘i', lines: 'Qatorlar oralig‘i',
      normal: 'Oddiy', light: 'Oq fonda qora', dark: 'Qora fonda oq', yellow: 'Qora fonda sariq',
      show: 'Ko‘rsatish', hide: 'Yashirish', usual: 'Oddiy', wide: 'Kengaytirilgan',
      read: 'Ovozli o‘qish', play: 'Sahifani tinglash', pause: 'Pauza', resume: 'Davom ettirish',
      stop: 'To‘xtatish', selection: 'Belgilanganni o‘qish', reading: 'O‘qilmoqda…', finished: 'O‘qish tugadi',
      noSelection: 'Avval sahifadagi matnni belgilang', noSpeech: 'Bu brauzer ovozli o‘qishni qo‘llamaydi',
      noVoice: 'Bu qurilmada o‘zbek tili uchun ovoz yo‘q — rus tili ishlatiladi'
    },
    'uz-Cyrl': {
      title: 'Кўриш қийин бўлганлар учун', close: 'Ёпиш', reset: 'Созламаларни тиклаш',
      font: 'Шрифт ўлчами', contrast: 'Ранг схемаси', images: 'Тасвирлар',
      spacing: 'Ҳарфлар оралиғи', lines: 'Қаторлар оралиғи',
      normal: 'Оддий', light: 'Оқ фонда қора', dark: 'Қора фонда оқ', yellow: 'Қора фонда сариқ',
      show: 'Кўрсатиш', hide: 'Яшириш', usual: 'Оддий', wide: 'Кенгайтирилган',
      read: 'Овозли ўқиш', play: 'Саҳифани тинглаш', pause: 'Пауза', resume: 'Давом эттириш',
      stop: 'Тўхтатиш', selection: 'Белгиланганни ўқиш', reading: 'Ўқилмоқда…', finished: 'Ўқиш тугади',
      noSelection: 'Аввал саҳифадаги матнни белгиланг', noSpeech: 'Бу браузер овозли ўқишни қўлламайди',
      noVoice: 'Бу қурилмада ўзбек тили учун овоз йўқ — рус тили ишлатилади'
    },
    en: {
      title: 'Accessibility version', close: 'Close', reset: 'Reset settings',
      font: 'Font size', contrast: 'Colour scheme', images: 'Images',
      spacing: 'Letter spacing', lines: 'Line spacing',
      normal: 'Standard', light: 'Black on white', dark: 'White on black', yellow: 'Yellow on black',
      show: 'Show', hide: 'Hide', usual: 'Normal', wide: 'Wide',
      read: 'Read aloud', play: 'Listen to the page', pause: 'Pause', resume: 'Resume',
      stop: 'Stop', selection: 'Read the selection', reading: 'Reading…', finished: 'Finished reading',
      noSelection: 'Select some text on the page first', noSpeech: 'This browser cannot read aloud',
      noVoice: 'No Uzbek voice on this device — Russian is used instead'
    }
  };
  var lang = root.getAttribute('lang') || 'ru';
  var t = T[lang] || T[lang.split('-')[0]] || T.ru;

  /* ------------------------------------------------------------- Panel */
  var GROUPS = [
    { field: 'font', label: t.font, options: [['', '100 %'], ['125', '125 %'], ['150', '150 %']] },
    { field: 'contrast', label: t.contrast, options: [['', t.normal], ['light', t.light], ['dark', t.dark], ['yellow', t.yellow]] },
    { field: 'images', label: t.images, options: [['', t.show], ['off', t.hide]] },
    { field: 'spacing', label: t.spacing, options: [['', t.usual], ['wide', t.wide]] },
    { field: 'lines', label: t.lines, options: [['', t.usual], ['wide', t.wide]] }
  ];

  function h(tag, attrs, children) {
    var n = document.createElement(tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) { n.setAttribute(k, attrs[k]); } }
    (children || []).forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function buildPanel(trigger) {
    var panel = h('section', { 'class': 'a11y-panel', id: 'a11y-panel', role: 'region', 'aria-label': t.title, hidden: '' });
    var inner = h('div', { 'class': 'container' });
    var head = h('div', { 'class': 'a11y-head' }, [h('h2', {}, [t.title])]);
    var closeBtn = h('button', { type: 'button', 'class': 'btn btn-outline a11y-close' }, [t.close]);
    head.appendChild(closeBtn);
    inner.appendChild(head);
    var groups = h('div', { 'class': 'a11y-groups' });
    var buttons = {};
    GROUPS.forEach(function (g) {
      var fs = h('fieldset', { 'class': 'a11y-group' }, [h('legend', {}, [g.label])]);
      var row = h('div', { 'class': 'a11y-opts', role: 'group' });
      buttons[g.field] = [];
      g.options.forEach(function (o) {
        var b = h('button', { type: 'button', 'class': 'a11y-opt', 'data-field': g.field, 'data-value': o[0], 'aria-pressed': 'false' }, [o[1]]);
        b.addEventListener('click', function () { set(g.field, o[0]); });
        row.appendChild(b);
        buttons[g.field].push(b);
      });
      fs.appendChild(row);
      groups.appendChild(fs);
    });
    inner.appendChild(groups);

    // Read-aloud lives in the same drawer; hidden when the browser can't speak.
    var speech = buildReader();
    if (speech) { inner.appendChild(speech); }

    var foot = h('div', { 'class': 'a11y-foot' });
    var resetBtn = h('button', { type: 'button', 'class': 'btn-link' }, [t.reset]);
    resetBtn.addEventListener('click', function () {
      settings = {};
      save(settings); apply(settings); reflect();
      document.dispatchEvent(new Event('a11y:change'));
    });
    foot.appendChild(resetBtn);
    inner.appendChild(foot);
    panel.appendChild(inner);

    function reflect() {
      FIELDS.forEach(function (f) {
        (buttons[f] || []).forEach(function (b) {
          b.setAttribute('aria-pressed', String((settings[f] || '') === b.dataset.value));
        });
      });
    }
    function set(field, value) {
      if (value) { settings[field] = value; } else { delete settings[field]; }
      save(settings); apply(settings); reflect();
      document.dispatchEvent(new Event('a11y:change'));
    }
    function open() {
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      closeBtn.focus();
    }
    function close() {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'a11y-panel');
    trigger.addEventListener('click', function () { if (panel.hidden) { open(); } else { close(); } });
    closeBtn.addEventListener('click', close);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    reflect();
    return panel;
  }

  /* ---------------------------------------------------------- Read-aloud */
  function buildReader() {
    var synth = window.speechSynthesis;
    var wantLang = lang.split('-')[0];
    // Browsers ship no Uzbek voice, so an Uzbek page is otherwise read with a
    // Russian one. With a speech service configured on the page —
    // <meta name="aca-tts" content="/api/tts"> (API-site.md) — Uzbek pages are
    // read by that service, chunk by chunk; other languages keep the browser's
    // own voices. No meta, no change: the prototype has no service.
    var meta = document.querySelector('meta[name="aca-tts"]');
    var server = (meta && meta.content && wantLang === 'uz' && typeof window.Audio === 'function') ? meta.content : '';
    var hasSynth = !!(synth && window.SpeechSynthesisUtterance);
    if (!server && !hasSynth) { return null; }
    var box = h('div', { 'class': 'a11y-read' }, [h('h3', {}, [t.read])]);
    var row = h('div', { 'class': 'a11y-opts' });
    var playBtn = h('button', { type: 'button', 'class': 'btn btn-primary' }, ['▶ ' + t.play]);
    var pauseBtn = h('button', { type: 'button', 'class': 'btn btn-outline', hidden: '' }, [t.pause]);
    var stopBtn = h('button', { type: 'button', 'class': 'btn btn-outline', hidden: '' }, [t.stop]);
    var selBtn = h('button', { type: 'button', 'class': 'btn btn-outline' }, [t.selection]);
    [playBtn, pauseBtn, stopBtn, selBtn].forEach(function (b) { row.appendChild(b); });
    var status = h('p', { 'class': 'a11y-status', 'aria-live': 'polite' });
    box.appendChild(row);
    box.appendChild(status);

    var queue = [], index = 0, paused = false, current = null, speaking = false;
    var voice = null, voiceNote = '', audio = null;

    function pickVoice() {
      var voices = synth.getVoices();
      if (!voices.length) { return; }
      var exact = voices.filter(function (v) { return v.lang.toLowerCase().indexOf(wantLang) === 0; });
      if (exact.length) { voice = exact[0]; voiceNote = ''; return; }
      if (wantLang === 'uz') {
        var ru = voices.filter(function (v) { return v.lang.toLowerCase().indexOf('ru') === 0; });
        if (ru.length) { voice = ru[0]; voiceNote = t.noVoice; return; }
      }
      voice = null; voiceNote = '';
    }
    if (hasSynth && !server) {
      pickVoice();
      if (typeof synth.addEventListener === 'function') { synth.addEventListener('voiceschanged', pickVoice); }
      else { synth.onvoiceschanged = pickVoice; }
    }

    // Sentence-sized chunks (≈180 chars) so no utterance runs past Chrome's cutoff.
    // Split by matching sentences rather than a lookbehind: Safari before 16.4
    // throws a SyntaxError on (?<=…) while PARSING the file, which would take
    // this whole script — panel and saved settings included — down with it.
    function chunks(text) {
      var out = [];
      var sentences = text.replace(/\s+/g, ' ').match(/[^.!?…;:]+[.!?…;:]*/g) || [];
      sentences.forEach(function (s) {
        s = s.trim();
        if (!s) { return; }
        while (s.length > 180) {
          var cut = s.lastIndexOf(' ', 180);
          if (cut < 60) { cut = 180; }
          out.push(s.slice(0, cut));
          s = s.slice(cut).trim();
        }
        out.push(s);
      });
      return out;
    }
    function collect() {
      var scope = document.querySelector('main') || document.body;
      var nodes = [].slice.call(scope.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,th,td,legend,label,figcaption,blockquote,caption'));
      var items = [];
      nodes.forEach(function (n) {
        if (n.closest('.a11y-panel, [hidden], .sr, script, style')) { return; }
        if (n.querySelector('p,li,dt,dd,th,td,h2,h3,h4')) { return; }   // container: its children are listed
        if (!n.offsetParent && n.tagName !== 'CAPTION') { return; }     // hidden
        var txt = n.innerText || n.textContent;
        chunks(txt).forEach(function (c) { items.push({ el: n, text: c }); });
      });
      return items;
    }
    function highlight(el) {
      if (current && current !== el) { current.classList.remove('a11y-reading'); }
      current = el;
      if (el) {
        el.classList.add('a11y-reading');
        var r = el.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      }
    }
    function ui(state) {
      playBtn.hidden = state !== 'idle';
      pauseBtn.hidden = state === 'idle';
      stopBtn.hidden = state === 'idle';
      pauseBtn.textContent = state === 'paused' ? t.resume : t.pause;
      status.textContent = state === 'idle' ? '' : (state === 'paused' ? t.pause : t.reading + (voiceNote ? ' ' + voiceNote : ''));
    }
    function stop(finished) {
      speaking = false; paused = false; queue = []; index = 0;
      if (hasSynth) { synth.cancel(); }
      if (audio) { audio.pause(); audio = null; }
      highlight(null);
      ui('idle');
      if (finished) { status.textContent = t.finished; }
    }
    function next() {
      if (!speaking || index >= queue.length) { stop(speaking); return; }
      var item = queue[index++];
      highlight(item.el);
      if (server) {
        audio = new Audio(server + (server.indexOf('?') < 0 ? '?' : '&') + 'lang=' + encodeURIComponent(lang) +
          '&text=' + encodeURIComponent(item.text));
        audio.onended = function () { if (speaking && !paused) { next(); } };
        audio.onerror = function () { if (speaking) { next(); } };
        var played = audio.play();
        if (played && played.catch) { played.catch(function () { if (speaking) { next(); } }); }
        return;
      }
      var u = new SpeechSynthesisUtterance(item.text);
      u.lang = voice ? voice.lang : lang;
      if (voice) { u.voice = voice; }
      u.onend = function () { if (speaking && !paused) { next(); } };
      u.onerror = function () { if (speaking) { next(); } };
      synth.speak(u);
    }
    function start(items) {
      stop(false);
      if (!items.length) { return; }
      queue = items; index = 0; speaking = true; paused = false;
      if (hasSynth && !server) { pickVoice(); }
      ui('reading');
      next();
    }
    playBtn.addEventListener('click', function () { start(collect()); });
    selBtn.addEventListener('click', function () {
      var sel = window.getSelection ? String(window.getSelection()).trim() : '';
      if (!sel) { status.textContent = t.noSelection; return; }
      var node = window.getSelection().anchorNode;
      var el = node && (node.nodeType === 1 ? node : node.parentElement);
      start(chunks(sel).map(function (c) { return { el: el, text: c }; }));
    });
    pauseBtn.addEventListener('click', function () {
      if (!speaking) { return; }
      if (paused) { paused = false; if (audio) { audio.play(); } else { synth.resume(); } ui('reading'); }
      else { paused = true; if (audio) { audio.pause(); } else { synth.pause(); } ui('paused'); }
    });
    stopBtn.addEventListener('click', function () { stop(false); });
    window.addEventListener('pagehide', function () {
      if (hasSynth) { synth.cancel(); }
      if (audio) { audio.pause(); }
    });
    ui('idle');
    return box;
  }

  /* --------------------------------------------------------------- Mount */
  document.addEventListener('DOMContentLoaded', function () {
    var trigger = document.querySelector('.util-btn');
    if (!trigger) { return; }
    var panel = buildPanel(trigger);
    var utility = document.querySelector('.utility');
    if (utility && utility.parentNode) { utility.parentNode.insertBefore(panel, utility.nextSibling); }
    else { document.body.insertBefore(panel, document.body.firstChild); }
  });
})();
