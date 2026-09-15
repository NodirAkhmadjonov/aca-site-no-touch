/* ============================================================================
   ACA DESIGN SYSTEM — shared behaviour
   Loaded with `defer` by every page. Each block is guarded, so a page that
   doesn't contain a given component simply skips it.
   ============================================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------- Mobile menu */
  var toggle = document.querySelector('.nav-toggle');
  var menubar = document.getElementById('menubar');
  if (toggle && menubar) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      if (open) { menubar.setAttribute('data-open', 'true'); }
      else { menubar.removeAttribute('data-open'); closeAllPanels(); }
      // The folded chrome sits both before and after the menubar, so a sibling
      // selector cannot reach it — a class on <html> can.
      if (document.documentElement.classList) {
        if (open) { document.documentElement.classList.add('nav-open'); }
        else { document.documentElement.classList.remove('nav-open'); }
      }
    });
  }

  /* ------------------------------------------------------- Mobile chrome
     On a phone the utility bar and the header's own controls ate most of the
     first screen: four language links, the accessibility button, the previous-
     site link, a full-width search field and a call-to-action, all before the
     first heading. Below 860px they fold into the drawer instead and the header
     keeps only the emblem and the menu button, top right.

     The nodes are MOVED, not duplicated — one search field, one language list,
     no repeated ids — and moved back when the viewport grows again. */
  var navRow = document.querySelector('.nav > .container');
  var headerMain = document.querySelector('.header-main');
  if (navRow && toggle && menubar && headerMain) {
    var foldTop = document.createElement('div');
    foldTop.className = 'nav-fold nav-fold-top';
    var foldBottom = document.createElement('div');
    foldBottom.className = 'nav-fold nav-fold-bottom';
    navRow.insertBefore(foldTop, menubar);
    navRow.appendChild(foldBottom);

    // Everything in the header except the brand, then everything in the utility bar.
    var folded = [];
    [].slice.call(headerMain.children).forEach(function (el) {
      if (el !== toggle && !el.classList.contains('brand')) {
        folded.push({ node: el, home: headerMain, box: foldTop });
      }
    });
    var utilityRow = document.querySelector('.utility > .container');
    if (utilityRow) {
      [].slice.call(utilityRow.children).forEach(function (el) {
        folded.push({ node: el, home: utilityRow, box: foldBottom });
      });
    }

    var narrow = window.matchMedia('(max-width: 860px)');
    var foldedNow = null;
    var fold = function () {
      var on = narrow.matches;
      if (on === foldedNow) { return; }   // nothing to do; never move nodes twice
      foldedNow = on;
      folded.forEach(function (f) { (on ? f.box : f.home).appendChild(f.node); });
      if (on) { headerMain.appendChild(toggle); }
      else { navRow.insertBefore(toggle, navRow.firstChild); }
    };
    fold();
    // Both signals: matchMedia is the right one, but it is not delivered
    // everywhere, and a header stuck in the wrong layout is very visible.
    if (narrow.addEventListener) { narrow.addEventListener('change', fold); }
    else if (narrow.addListener) { narrow.addListener(fold); }
    var foldTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(foldTimer);
      foldTimer = setTimeout(fold, 150);
    });

    // Opening the accessibility panel from inside the drawer: close the drawer,
    // otherwise the panel unfolds above a menu that is covering it.
    var utilBtn = document.querySelector('.util-btn');
    if (utilBtn) {
      utilBtn.addEventListener('click', function () {
        if (narrow.matches && toggle.getAttribute('aria-expanded') === 'true') { toggle.click(); }
      });
    }
  }

  /* ------------------------------------------------------------ Mega menu
     Panels open on click everywhere, and additionally on hover on desktop.
     Click matters: hover alone is unreachable by keyboard and unusable on a
     touchscreen, where the first tap would only reveal and the second would
     navigate away. */
  var tops = [].slice.call(document.querySelectorAll('.mtop'));
  var backdrop = document.getElementById('backdrop');
  var isDesktop = function () { return window.matchMedia('(min-width: 861px)').matches; };

  function closeAllPanels(except) {
    tops.forEach(function (b) {
      if (b === except) { return; }
      b.setAttribute('aria-expanded', 'false');
      var pnl = document.getElementById(b.getAttribute('aria-controls'));
      if (pnl) { pnl.removeAttribute('data-open'); }
    });
    if (!except && backdrop) { backdrop.removeAttribute('data-open'); }
  }

  function togglePanel(btn, force) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) { return; }
    var open = force !== undefined ? force : btn.getAttribute('aria-expanded') !== 'true';
    closeAllPanels(btn);
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.setAttribute('data-open', 'true');
      if (backdrop && isDesktop()) { backdrop.setAttribute('data-open', 'true'); }
    } else {
      panel.removeAttribute('data-open');
      if (backdrop) { backdrop.removeAttribute('data-open'); }
    }
  }

  tops.forEach(function (btn) {
    btn.addEventListener('click', function () { togglePanel(btn); });
    var li = btn.parentElement;
    li.addEventListener('mouseenter', function () { if (isDesktop()) { togglePanel(btn, true); } });
    li.addEventListener('mouseleave', function () { if (isDesktop()) { togglePanel(btn, false); } });
  });

  if (tops.length) {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var open = document.querySelector('.mtop[aria-expanded="true"]');
        if (open) { togglePanel(open, false); open.focus(); }
      }
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav')) { closeAllPanels(); }
    });
    if (backdrop) { backdrop.addEventListener('click', function () { closeAllPanels(); }); }
  }

  /* ------------------------------------------------------- Region + map ---
     Two views of one selection. The SVG shapes are real controls
     (role="button", tabindex="0"), so Enter and Space must be handled
     explicitly — a click listener alone strands keyboard users, which is the
     bug the current live site has. */
  var shapes = [].slice.call(document.querySelectorAll('.reg'));
  var regionBtns = [].slice.call(document.querySelectorAll('.region-btn'));
  if (shapes.length || regionBtns.length) {
    var selectRegion = function (id) {
      regionBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.region === id));
      });
      shapes.forEach(function (s) {
        if (id !== 'all' && s.dataset.region === id) { s.classList.add('is-active'); }
        else { s.classList.remove('is-active'); }
      });
    };
    regionBtns.forEach(function (b) {
      b.addEventListener('click', function () { selectRegion(b.dataset.region); });
    });
    shapes.forEach(function (s) {
      s.addEventListener('click', function () { selectRegion(s.dataset.region); });
      s.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectRegion(s.dataset.region);
        }
      });
    });
  }

  /* --------------------------------------------------------------- Slider
     Auto-advance is off when the visitor prefers reduced motion (starts
     paused), and is suspended while the pointer or keyboard focus is inside
     the carousel so it can't yank content away mid-read. Any manual action
     (dot, arrow, arrow key) stops auto-advance for good; the play/pause
     button restarts it. Labels for that button come from data-label-play /
     data-label-pause on the button itself, so the script stays language-
     neutral. */
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  if (slides.length > 1) {
    var dots = [].slice.call(document.querySelectorAll('.dot'));
    var slider = document.querySelector('.slider');
    var live = document.getElementById('slides');
    var prev = document.querySelector('.sbtn[data-dir="prev"]');
    var next = document.querySelector('.sbtn[data-dir="next"]');
    var pp = document.querySelector('.sbtn[data-dir="play"]');
    var idx = 0, timer = null, playing = false;
    var DELAY = 7000;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var iconPause = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
    var iconPlay = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>';

    var show = function (n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        var on = i === idx;
        if (on) { s.setAttribute('data-active', 'true'); }
        else { s.removeAttribute('data-active'); }
        s.setAttribute('aria-hidden', String(!on));
        // keep hidden slides out of the tab order
        [].slice.call(s.querySelectorAll('a,button')).forEach(function (el) {
          if (on) { el.removeAttribute('tabindex'); }
          else { el.setAttribute('tabindex', '-1'); }
        });
      });
      dots.forEach(function (d, i) {
        if (i === idx) { d.setAttribute('aria-current', 'true'); }
        else { d.removeAttribute('aria-current'); }
      });
    };
    var tick = function () { if (!timer) { timer = setInterval(function () { show(idx + 1); }, DELAY); } };
    var untick = function () { if (timer) { clearInterval(timer); timer = null; } };
    var play = function () {
      playing = true;
      if (live) { live.setAttribute('aria-live', 'off'); }
      if (pp) {
        pp.innerHTML = iconPause;
        if (pp.dataset.labelPause) { pp.setAttribute('aria-label', pp.dataset.labelPause); }
      }
      tick();
    };
    var pause = function () {
      playing = false;
      untick();
      if (live) { live.setAttribute('aria-live', 'polite'); }
      if (pp) {
        pp.innerHTML = iconPlay;
        if (pp.dataset.labelPlay) { pp.setAttribute('aria-label', pp.dataset.labelPlay); }
      }
    };
    var go = function (n) { pause(); show(n); };

    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    if (prev) { prev.addEventListener('click', function () { go(idx - 1); }); }
    if (next) { next.addEventListener('click', function () { go(idx + 1); }); }
    if (pp) { pp.addEventListener('click', function () { if (playing) { pause(); } else { play(); } }); }

    if (slider) {
      slider.addEventListener('mouseenter', untick);
      slider.addEventListener('mouseleave', function () { if (playing) { tick(); } });
      slider.addEventListener('focusin', untick);
      slider.addEventListener('focusout', function (e) {
        if (playing && !slider.contains(e.relatedTarget)) { tick(); }
      });
      slider.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { go(idx + 1); }
        if (e.key === 'ArrowLeft') { go(idx - 1); }
      });
    }
    show(0);
    if (reduce) { pause(); } else { play(); }
  }

  /* ------------------------------------------------ Textarea char counter
     The wording lives on the element: data-min, data-below ("{n} из 50
     символов минимум"), data-ok ("{n} символов"). A page without them just
     gets the leading number replaced, so nothing is ever written in the
     wrong language. */
  var story = document.getElementById('story');
  var counter = document.querySelector('.char-count');
  if (story && counter) {
    var min = parseInt(counter.dataset.min, 10) || 50;
    counter.setAttribute('aria-live', 'polite');
    story.addEventListener('input', function () {
      var n = story.value.length;
      var tpl = n < min ? counter.dataset.below : counter.dataset.ok;
      counter.textContent = tpl ? tpl.replace('{n}', n) : counter.textContent.replace(/^\d+/, n);
      if (n >= min) { story.setAttribute('aria-invalid', 'false'); }
    });
  }

  /* ------------------------------------------------------------- Poll
     One question on the home page. After voting the form gives way to the
     results (percent bars from demo counts in data-votes plus this vote);
     the vote is remembered in localStorage and can be changed. Strings live
     on the form: data-total, data-voted, data-change, data-error. Server
     side: API-site.md, /api/polls. */
  [].slice.call(document.querySelectorAll('form.poll')).forEach(function (poll) {
    var pollKey = 'aca.poll.' + poll.dataset.id;
    var options = [].slice.call(poll.querySelectorAll('input[type=radio]'));
    var result = poll.querySelector('.poll-result');
    var fieldset = poll.querySelector('fieldset');
    var submit = poll.querySelector('[type=submit]');
    var err = poll.querySelector('.error-msg');
    var read = function () { try { return localStorage.getItem(pollKey); } catch (e) { return null; } };
    var write = function (v) { try { if (v) { localStorage.setItem(pollKey, v); } else { localStorage.removeItem(pollKey); } } catch (e) { /* private mode */ } };
    var fmtN = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

    var renderResults = function (mine) {
      var total = 0;
      var rows = options.map(function (o) {
        var n = (parseInt(o.dataset.votes, 10) || 0) + (o.value === mine ? 1 : 0);
        total += n;
        return { value: o.value, label: o.parentNode.querySelector('span').textContent, n: n };
      });
      var max = Math.max.apply(null, rows.map(function (r) { return r.n; })) || 1;
      result.textContent = '';
      // The question lives in the fieldset's legend, and the fieldset is hidden
      // once results are shown — so repeat it here, otherwise the reader is
      // looking at percentages with no idea what was asked.
      var legend = poll.querySelector('legend');
      if (legend) {
        var q = document.createElement('p');
        q.className = 'poll-question';
        q.textContent = legend.textContent;
        result.appendChild(q);
      }
      var list = document.createElement('ol');
      rows.forEach(function (r) {
        var li = document.createElement('li');
        li.className = 'poll-row';
        if (r.value === mine) { li.setAttribute('data-mine', 'true'); }
        var head = document.createElement('div');
        head.className = 'poll-row-head';
        var name = document.createElement('span');
        name.textContent = r.label + (r.value === mine ? ' ✓' : '');
        var pct = document.createElement('b');
        pct.textContent = (total ? Math.round(r.n / total * 100) : 0) + ' %';
        head.appendChild(name);
        head.appendChild(pct);
        var bar = document.createElement('span');
        bar.className = 'rbar';
        bar.style.width = Math.round(r.n / max * 100) + '%';
        var count = document.createElement('small');
        count.textContent = fmtN(r.n);
        li.appendChild(head);
        li.appendChild(bar);
        li.appendChild(count);
        list.appendChild(li);
      });
      result.appendChild(list);
      var totalP = document.createElement('p');
      totalP.className = 'poll-total';
      totalP.textContent = poll.dataset.total.replace('{n}', fmtN(total));
      result.appendChild(totalP);
      var actions = document.createElement('p');
      actions.className = 'poll-actions';
      var voted = document.createElement('span');
      voted.textContent = poll.dataset.voted + ' · ';
      var change = document.createElement('button');
      change.type = 'button';
      change.className = 'btn-link';
      change.textContent = poll.dataset.change;
      change.addEventListener('click', function () {
        write(null);
        showForm(mine);
        var current = poll.querySelector('input[value="' + mine + '"]');
        (current || options[0]).focus();
      });
      actions.appendChild(voted);
      actions.appendChild(change);
      result.appendChild(actions);
      fieldset.hidden = true;
      submit.hidden = true;
      result.hidden = false;
    };
    var showForm = function (mine) {
      options.forEach(function (o) { o.checked = o.value === mine; });
      result.hidden = true;
      fieldset.hidden = false;
      submit.hidden = false;
    };
    poll.addEventListener('submit', function (e) {
      e.preventDefault();
      var picked = poll.querySelector('input[type=radio]:checked');
      if (!picked) {
        if (err) { err.hidden = false; }
        options[0].focus();
        return;
      }
      if (err) { err.hidden = true; }
      write(picked.value);
      renderResults(picked.value);
      result.focus();
    });
    poll.addEventListener('change', function () { if (err) { err.hidden = true; } });
    var stored = read();
    if (stored) { renderResults(stored); }
  });

  /* ------------------------------------------------------- Poll navigation
     Several questions in one block: one is shown at a time, with a counter
     and prev/next. Each form keeps its own vote, so moving between questions
     never loses one. Wording comes from data-counter on the group. */
  var group = document.querySelector('[data-polls]');
  if (group) {
    var forms = [].slice.call(group.querySelectorAll('form.poll'));
    var prevBtn = group.querySelector('[data-poll-prev]');
    var nextBtn = group.querySelector('[data-poll-next]');
    var count = group.querySelector('.polls-count');
    var at = 0;
    var showPoll = function (n) {
      at = Math.max(0, Math.min(forms.length - 1, n));
      forms.forEach(function (f, i) { f.hidden = i !== at; });
      if (count) {
        count.textContent = (group.dataset.counter || '{n}/{total}')
          .replace('{n}', at + 1).replace('{total}', forms.length);
      }
      prevBtn.disabled = at === 0;
      nextBtn.disabled = at === forms.length - 1;
    };
    prevBtn.addEventListener('click', function () { showPoll(at - 1); });
    nextBtn.addEventListener('click', function () { showPoll(at + 1); });
    showPoll(0);
  }

  /* --------------------------------------------------------------- Lightbox
     The photo report's gallery opens full size in a <dialog>: the browser
     supplies modal semantics, focus containment, Esc and the backdrop. Guarded
     on showModal, so a browser without it (Safari before 15.4) keeps the inline
     gallery rather than getting a half-working overlay. Every string comes from
     data-* on the grid, so this block stays language-neutral. */
  var grid = document.querySelector('[data-lightbox]');
  var canDialog = typeof window.HTMLDialogElement === 'function' &&
    typeof window.HTMLDialogElement.prototype.showModal === 'function';
  if (grid && canDialog) {
    var shots = [].slice.call(grid.querySelectorAll('figure')).map(function (fig) {
      var img = fig.querySelector('img');
      var cap = fig.querySelector('figcaption');
      return {
        button: fig.querySelector('.gallery-open'),
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || '',
        caption: cap ? cap.textContent : ''
      };
    }).filter(function (s) { return s.button; });

    if (shots.length) {
      var icon = function (d) {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="' + d + '"/></svg>';
      };
      var box = document.createElement('dialog');
      box.className = 'lightbox';
      box.innerHTML =
        '<div class="lightbox-bar">' +
          '<div class="lightbox-nav">' +
            '<button type="button" class="lightbox-btn" data-go="-1">' + icon('M15 18l-6-6 6-6') + '</button>' +
            '<button type="button" class="lightbox-btn" data-go="1">' + icon('M9 6l6 6-6 6') + '</button>' +
          '</div>' +
          '<p class="lightbox-count" aria-live="polite"></p>' +
          '<button type="button" class="lightbox-btn lightbox-close">' + icon('M6 6l12 12M18 6L6 18') + '</button>' +
        '</div>' +
        '<figure class="lightbox-figure"><img alt=""><figcaption></figcaption></figure>';
      document.body.appendChild(box);

      var lbImg = box.querySelector('img');
      var lbCap = box.querySelector('figcaption');
      var lbCount = box.querySelector('.lightbox-count');
      var closeBtn = box.querySelector('.lightbox-close');
      var navBtns = [].slice.call(box.querySelectorAll('[data-go]'));
      closeBtn.setAttribute('aria-label', grid.dataset.close || 'Close');
      navBtns[0].setAttribute('aria-label', grid.dataset.prev || 'Previous');
      navBtns[1].setAttribute('aria-label', grid.dataset.next || 'Next');
      var at = 0, opener = null;

      // One teardown for every way out — button, backdrop, Esc. The `close`
      // event would be the elegant hook, but it is not reliably delivered, and
      // a lightbox that leaves the page unscrollable is worse than inelegant.
      var closeBox = function () {
        if (box.open) { box.close(); }
        document.documentElement.style.overflow = '';
        if (opener) { opener.focus(); }
      };

      var show = function (i) {
        at = (i + shots.length) % shots.length;   // wraps, so the arrows never dead-end
        lbImg.setAttribute('src', shots[at].src);
        lbImg.setAttribute('alt', shots[at].alt);
        lbCap.textContent = shots[at].caption;
        lbCount.textContent = (grid.dataset.counter || '{n}/{total}')
          .replace('{n}', at + 1).replace('{total}', shots.length);
      };
      shots.forEach(function (shot, i) {
        if (grid.dataset.open) { shot.button.setAttribute('title', grid.dataset.open); }
        shot.button.addEventListener('click', function () {
          opener = shot.button;
          show(i);
          box.showModal();
          // showModal() makes the page inert but does not stop it scrolling
          // behind the backdrop; this does.
          document.documentElement.style.overflow = 'hidden';
          closeBtn.focus();
        });
      });
      navBtns.forEach(function (b) {
        b.addEventListener('click', function () { show(at + parseInt(b.dataset.go, 10)); });
      });
      closeBtn.addEventListener('click', closeBox);
      box.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
      });
      // Clicking the backdrop lands on the dialog itself, never on its contents.
      box.addEventListener('click', function (e) { if (e.target === box) { closeBox(); } });
      // Esc: take over the default so the same teardown runs.
      box.addEventListener('cancel', function (e) { e.preventDefault(); closeBox(); });
      box.addEventListener('close', closeBox);   // backstop, harmless when already torn down
    }
  }

  /* ------------------------------------------------- Copy to clipboard ---
     The confirmation replaces the button's own label rather than firing a
     toast, so screen readers announce it and nobody misses it. Used by the
     ticket number (#copy + #ticket) and the article's copy-link button
     (.share-copy copies the page URL); the text comes from data-copied. */
  function copyWith(btn, getText) {
    var original = btn.innerHTML;
    var label = btn.getAttribute('aria-label');
    btn.addEventListener('click', function () {
      var text = getText();
      var done = function () {
        btn.textContent = btn.dataset.copied;
        if (label) { btn.setAttribute('aria-label', btn.dataset.copied); }
        setTimeout(function () {
          btn.innerHTML = original;
          if (label) { btn.setAttribute('aria-label', label); }
        }, 2500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* clipboard unavailable */ }
        document.body.removeChild(ta);
        done();
      }
    });
  }
  var copyBtn = document.getElementById('copy');
  var ticket = document.getElementById('ticket');
  if (copyBtn && ticket) { copyWith(copyBtn, function () { return ticket.textContent.trim(); }); }
  var copyLink = document.querySelector('.share-copy');
  if (copyLink) { copyWith(copyLink, function () { return location.href; }); }

  /* ------------------------------------------------------------ Share links
     The page URL is only known at runtime, so the targets are filled in here. */
  var here = encodeURIComponent(location.href);
  [].slice.call(document.querySelectorAll('a[data-share]')).forEach(function (a) {
    if (a.dataset.share === 'telegram') {
      a.href = 'https://t.me/share/url?url=' + here + '&text=' + encodeURIComponent(document.title);
    } else if (a.dataset.share === 'facebook') {
      a.href = 'https://www.facebook.com/sharer/sharer.php?u=' + here;
    }
  });

  /* ------------------------------------------------------- Category tabs
     aca-documents: ?cat=… marks its tab, keeps only the rows of that
     category and shows the category's own panel (draft acts link out to the
     discussion portals). Without JavaScript every tab still opens the page,
     with all documents listed. */
  var tabs = document.querySelector('.cat-tabs');
  if (tabs) {
    var cat = (location.search.match(/[?&]cat=([\w-]+)/) || [])[1] || '';
    [].forEach.call(tabs.querySelectorAll('a[data-cat]'), function (a) {
      if (a.dataset.cat === cat) { a.setAttribute('aria-current', 'page'); }
      else { a.removeAttribute('aria-current'); }
    });
    var shown = 0;
    [].forEach.call(document.querySelectorAll('tr[data-cat]'), function (tr) {
      var keep = !cat || tr.dataset.cat === cat;
      tr.hidden = !keep;
      if (keep) { shown++; }
    });
    [].forEach.call(document.querySelectorAll('[data-cat-panel]'), function (p) {
      p.hidden = p.dataset.catPanel !== cat;
    });
    var found = document.querySelector('.result-count[data-found]');
    if (found) { found.textContent = found.dataset.found.replace('{n}', shown); }
  }
})();
