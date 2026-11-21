/* Life timeline shell: one registry, one data model, a compact design picker, a shared detail
   panel and a plain list fallback. Designs live in designs/<id>.js + .css and register with
   LT.define(id, { mount(root, model, ctx) }). Plain scripts only, so file:// keeps working. */
(function () {
  'use strict';
  var root = document.documentElement;
  var LT = window.LT = window.LT || {};

  // ---- Registry: the only place that lists designs. ------------------------------------
  LT.registry = window.LT_REGISTRY; // defined in boot.js so compare.html can share it
  LT.design = root.dataset.design;
  LT.embed = root.dataset.embed === '1';

  // ---- Small utilities. -------------------------------------------------------------------
  var store = LT.store = {
    get: function (k) { try { return localStorage.getItem('lt.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('lt.' + k, v); } catch (e) { /* storage blocked: choice just isn't remembered */ } }
  };
  var esc = LT.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  LT.reduced = function () { return rmq.matches; };
  LT.onReducedChange = function (cb) { rmq.addEventListener('change', function () { cb(rmq.matches); }); };
  LT.loadScript = function (src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = ok; s.onerror = function () { fail(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  };
  LT.loadCSS = function (href) {
    return new Promise(function (ok, fail) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
      l.onload = ok; l.onerror = function () { fail(new Error('Could not load ' + href)); };
      document.head.appendChild(l);
    });
  };
  /* Run cb(true/false) when el enters/leaves the viewport AND the tab is visible.
     Designs use this to pause rAF loops offscreen. Returns a stop function. */
  LT.whenVisible = function (el, cb, opts) {
    var inView = false, last = null;
    var fire = function () { var v = inView && !document.hidden; if (v !== last) { last = v; cb(v); } };
    var io = new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; fire(); }, opts || { threshold: 0 });
    io.observe(el); document.addEventListener('visibilitychange', fire);
    return function () { io.disconnect(); document.removeEventListener('visibilitychange', fire); };
  };

  // ---- Theme (shared key with classic). -------------------------------------------------
  var themeCbs = [];
  LT.theme = function () { return root.dataset.theme; };
  LT.setTheme = function (t) { root.dataset.theme = t; store.set('theme', t); themeCbs.forEach(function (cb) { cb(t); }); };
  LT.onTheme = function (cb) { themeCbs.push(cb); };
  // Classic toggles data-theme itself; mirror that to listeners.
  new MutationObserver(function () { themeCbs.forEach(function (cb) { cb(root.dataset.theme); }); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // ---- Data model (same derivation as classic, shared by every new design). -------------
  var data = window.CAREER;
  if (!data || !data.entries) {
    document.body.insertAdjacentHTML('afterbegin', '<p class="lt-error" role="alert">No data: run <code>python tools/build.py</code> first.</p>');
    console.error('career.public.js missing');
    return;
  }
  var TYPE = { role: ['Work', '#8b5cf6'], education: ['Education', '#22d3ee'], project: ['Project', '#2dd4bf'], achievement: ['Achievement', '#f59e0b'],
    story: ['Story', '#f472b6'], 'life-event': ['Turning point', '#94a3b8'], talk: ['Talk', '#60a5fa'], publication: ['Publication', '#60a5fa'],
    volunteering: ['Volunteering', '#a3e635'], vision: ['Vision', '#c4b5fd'] };
  var ORDER = ['life-event', 'education', 'role', 'achievement', 'publication', 'talk', 'project', 'volunteering', 'story', 'vision'];
  var num = function (s) { return s ? (+String(s).slice(0, 4) + (String(s).length >= 7 ? (+String(s).slice(5, 7) - 1) / 12 : 0)) : null; };
  var d0 = new Date(), NOW = d0.getFullYear() + d0.getMonth() / 12;
  var fmt = function (s) { return !s ? '' : s === 'present' ? 'now' : (s.length >= 7 ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1).toLocaleString('en', { month: 'short' }) + ' ' + s.slice(0, 4) : s); };
  var span = function (e) { return e.start ? fmt(e.start) + (e.end && e.end !== e.start ? ' – ' + fmt(e.end) : '') : ''; };
  var E = data.entries, byId = {};
  E.forEach(function (e) { byId[e.id] = e; });
  var when = function (e, seen) {
    seen = seen || {};
    if (e.start) return num(e.start);
    for (var i = 0; i < (e.related || []).length; i++) {
      var r = e.related[i], x = byId[r];
      if (x && !seen[r]) { seen[r] = 1; var w = when(x, seen); if (w != null) return w; }
    }
    return null;
  };
  var shown = E.filter(function (e) { return TYPE[e.type] && !e.possible_duplicate_of; });
  var turns = E.filter(function (e) { return e.type === 'life-event' && e.start && /^city-/.test(e.id); })
    .sort(function (a, b) { return num(a.start) - num(b.start); });
  var place = function (t) { return t.title.replace(/^Moved to /, '').replace(/^Transition to /, '').split(',')[0]; };
  var chapters = turns.map(function (t, i) {
    return { id: t.id, t: t, from: num(t.start), to: turns[i + 1] ? num(turns[i + 1].start) : NOW, name: place(t),
      region: (t.title.split(',')[1] || '').trim(), location: t.location || '', items: [] };
  });
  var epilogue = { id: 'beyond', name: 'Beyond the timeline', region: 'Undated · vision', from: NOW, to: NOW, items: [], epi: true };
  shown.forEach(function (e) {
    var w = when(e), c = null;
    if (w == null) c = epilogue;
    else { for (var i = chapters.length - 1; i >= 0; i--) if (chapters[i].from <= w + 1e-6) { c = chapters[i]; break; } c = c || chapters[0]; }
    e._w = w; e._inferred = !e.start && w != null; e._chapter = c.id; c.items.push(e);
  });
  if (epilogue.items.length) chapters.push(epilogue);
  chapters.forEach(function (c, i) {
    c.index = i; c.hue = (250 + i * 37) % 360;
    c.items.sort(function (a, b) { return ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || (a._w || 0) - (b._w || 0); });
    // `stories` = what a chapter shows (the city-move entry itself is the chapter, not a card).
    c.stories = c.items.filter(function (e) { return !(e.type === 'life-event' && /^city-/.test(e.id)); });
  });

  LT.model = {
    entries: shown, byId: byId, chapters: chapters, TYPE: TYPE, ORDER: ORDER,
    num: num, fmt: fmt, span: span, esc: esc, NOW: NOW,
    minY: Math.floor(chapters[0].from), maxY: Math.ceil(NOW),
    experience: data.meta && data.meta.experience,        // computed by build.py, never typed in
    owner: 'Akshay Borse',
    typeName: function (t) { return (TYPE[t] || [t])[0]; },
    typeColor: function (t) { return (TYPE[t] || [0, '#94a3b8'])[1]; },
    when: function (e) { return span(e) || (e._inferred ? '≈' + Math.floor(e._w) : ''); }
  };

  // ---- Shared detail panel (styled by the active design's --lt-* tokens). --------------
  LT.detailHTML = function (e) {
    var M = LT.model;
    var bullets = (e.resume_bullets || []).map(function (b) { return typeof b === 'string' ? { text: b, verified: true } : b; });
    var rel = (e.related || []).map(function (r) { return byId[r]; }).filter(function (x) { return x && x.visibility !== 'private' && TYPE[x.type]; });
    return '<span class="lt-kicker" style="--c:' + M.typeColor(e.type) + '">' + esc(M.typeName(e.type)) + (e.placeholder ? ' <span class="lt-badge">Placeholder</span>' : '') + '</span>' +
      '<h2>' + esc(e.title) + '</h2>' +
      '<p class="lt-sub">' + esc([e.org, e.location, span(e) || (e._inferred ? 'about ' + Math.floor(e._w) + ' (from linked role)' : '')].filter(Boolean).join(' · ')) + '</p>' +
      (e.summary ? '<h3>Summary</h3><p>' + esc(e.summary) + '</p>' : '') +
      (e.body ? '<h3>Story</h3><p style="white-space:pre-line">' + esc(e.body) + '</p>' : '') +
      ((e.metrics || []).length ? '<h3>Impact</h3>' + e.metrics.map(function (m) { return '<div class="lt-metric"><b>' + esc(m.value) + '</b><small>' + esc(m.meaning) + (m.verified === false ? ' <span class="lt-unv" title="Not found word-for-word in a source file yet">unverified</span>' : '') + '</small></div>'; }).join('') : '') +
      (bullets.length ? '<h3>Resume lines</h3><ul>' + bullets.map(function (b) { return '<li>' + esc(b.text) + (b.verified === false ? ' <span class="lt-unv">unverified</span>' : '') + '</li>'; }).join('') + '</ul>' : '') +
      ((e.skills || []).length ? '<h3>Skills</h3><div class="lt-chips">' + e.skills.map(function (s) { return '<span class="lt-chip">' + esc(s) + '</span>'; }).join('') + '</div>' : '') +
      (rel.length ? '<h3>Connected</h3><div class="lt-rel">' + rel.map(function (x) { return '<button type="button" class="lt-rel-item" data-id="' + esc(x.id) + '"><i style="--c:' + M.typeColor(x.type) + '"></i>' + esc(x.title) + '</button>'; }).join('') + '</div>' : '');
  };
  var panel, panelBody, lastFocus;
  LT.openDetail = function (id) {
    var e = byId[id]; if (!e) { console.error('openDetail: unknown id ' + id); return; }
    if (!panel) {
      document.body.insertAdjacentHTML('beforeend', '<div class="lt-scrim" hidden></div><aside class="lt-panel" role="dialog" aria-modal="true" aria-label="Details" tabindex="-1" hidden><button type="button" class="lt-btn lt-close">Close</button><div class="lt-panel-body"></div></aside>');
      panel = document.querySelector('.lt-panel'); panelBody = panel.querySelector('.lt-panel-body');
      panel.querySelector('.lt-close').onclick = LT.closeDetail;
      document.querySelector('.lt-scrim').onclick = LT.closeDetail;
      panelBody.addEventListener('click', function (ev) { var b = ev.target.closest('[data-id]'); if (b) LT.openDetail(b.dataset.id); });
      addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !panel.hidden) { ev.stopPropagation(); LT.closeDetail(); } }, true);
    }
    if (panel.hidden) lastFocus = document.activeElement;
    panelBody.innerHTML = LT.detailHTML(e); panel.scrollTop = 0;
    panel.hidden = false; document.querySelector('.lt-scrim').hidden = false;
    requestAnimationFrame(function () { root.classList.add('lt-detail-open'); panel.focus(); });
  };
  LT.closeDetail = function () {
    if (!panel || panel.hidden) return;
    root.classList.remove('lt-detail-open');
    setTimeout(function () { panel.hidden = true; document.querySelector('.lt-scrim').hidden = true; }, LT.reduced() ? 0 : 280);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  LT.isDetailOpen = function () { return !!panel && !panel.hidden; };

  // ---- Plain list view: the accessible floor (game's "skip to list", error fallback). ---
  LT.listView = function (container, opts) {
    opts = opts || {};
    var M = LT.model;
    container.classList.add('lt-list');
    container.innerHTML = (opts.title ? '<h2 class="lt-list-title">' + esc(opts.title) + '</h2>' : '') +
      chapters.map(function (c) {
        return '<section class="lt-list-ch" aria-labelledby="lt-ch-' + c.index + '"><h3 id="lt-ch-' + c.index + '">' + esc(c.name) +
          ' <small>' + (c.epi ? 'undated' : Math.floor(c.from) + ' – ' + (c.to >= NOW - 0.01 ? 'now' : Math.floor(c.to))) + '</small></h3><ul>' +
          c.stories.map(function (e) {
            return '<li><button type="button" class="lt-list-item" data-id="' + esc(e.id) + '"><i style="--c:' + M.typeColor(e.type) + '"></i><span>' + esc(e.title) +
              (e.placeholder ? ' <span class="lt-badge">Placeholder</span>' : '') + '</span><small>' + esc(M.when(e)) + '</small></button></li>';
          }).join('') + '</ul></section>';
      }).join('');
    container.addEventListener('click', function (ev) { var b = ev.target.closest('.lt-list-item'); if (b) LT.openDetail(b.dataset.id); });
    return container;
  };

  // ---- Picker dock: one compact control on every design. --------------------------------
  function buildDock() {
    if (LT.embed) return;
    var cur = LT.registry.filter(function (d) { return d.id === LT.design; })[0];
    var item = function (list) { return list.map(function (d) {
      return '<a role="menuitemradio" aria-checked="' + (d.id === LT.design) + '" href="?design=' + d.id + '" data-d="' + d.id + '"><b>' + esc(d.label) + '</b><small>' + esc(d.pitch) + '</small></a>';
    }).join(''); };
    var main = LT.registry.filter(function (d) { return !d.legacy; }), old = LT.registry.filter(function (d) { return d.legacy; });
    var curOld = !!cur.legacy;
    var dock = document.createElement('div');
    dock.className = 'lt-dock';
    dock.innerHTML =
      '<button type="button" class="lt-btn lt-pick" aria-haspopup="true" aria-expanded="false"><span class="lt-pick-k">Design</span> ' + esc(cur.label) + ' <span aria-hidden="true">▾</span></button>' +
      (LT.design === 'classic' ? '' : '<button type="button" class="lt-btn lt-theme" aria-label="Toggle light or dark theme">◐</button>') +
      '<div class="lt-menu" role="menu" hidden>' + item(main) +
      (old.length ? '<button type="button" role="menuitem" class="lt-menu-old" aria-expanded="' + curOld + '"><b>Old themes</b><small>' + esc(old.map(function (d) { return d.label; }).join(', ')) + '</small></button>' +
        '<div class="lt-menu-oldlist"' + (curOld ? '' : ' hidden') + '>' + item(old) + '</div>' : '') +
      '<a role="menuitem" class="lt-menu-compare" href="compare.html"><b>Compare all designs →</b></a></div>';
    document.body.appendChild(dock);
    var btn = dock.querySelector('.lt-pick'), menu = dock.querySelector('.lt-menu');
    var open = function (v) { menu.hidden = !v; btn.setAttribute('aria-expanded', v); if (v) menu.querySelector('[aria-checked="true"]').focus(); };
    btn.onclick = function () { open(menu.hidden); };
    var ob = menu.querySelector('.lt-menu-old');
    if (ob) ob.onclick = function () { var v = ob.getAttribute('aria-expanded') !== 'true'; ob.setAttribute('aria-expanded', v); ob.nextElementSibling.hidden = !v; };
    menu.addEventListener('click', function (ev) { var a = ev.target.closest('[data-d]'); if (a) store.set('design', a.dataset.d); });
    menu.addEventListener('keydown', function (ev) {
      var items = [].slice.call(menu.querySelectorAll('a, .lt-menu-old')).filter(function (x) { return x.offsetParent; }), i = items.indexOf(document.activeElement);
      if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (ev.key === 'Escape') { ev.stopPropagation(); open(false); btn.focus(); }
    });
    document.addEventListener('click', function (ev) { if (!dock.contains(ev.target)) open(false); });
    var tb = dock.querySelector('.lt-theme');
    if (tb) tb.onclick = function () { LT.setTheme(LT.theme() === 'dark' ? 'light' : 'dark'); };
  }

  // ---- Loud failure: banner + list, never a blank page. ---------------------------------
  LT.fail = function (msg, err) {
    console.error('[life-timeline] ' + msg, err || '');
    var r = document.getElementById('design-root');
    r.innerHTML = '<p class="lt-error" role="alert">This design failed to load: ' + esc(msg) + '. Showing the plain list instead.</p><div></div>';
    LT.listView(r.lastChild, { title: 'Life timeline' });
  };

  // ---- Mount the active design. ---------------------------------------------------------
  var defs = {};
  LT.define = function (id, def) { defs[id] = def; };
  document.addEventListener('DOMContentLoaded', function () {
    buildDock();
    if (LT.design === 'classic') return;   // classic runs its own inline script
    var r = document.getElementById('design-root');
    var base = 'designs/' + LT.design;
    Promise.all([LT.loadCSS(base + '.css'), LT.loadScript(base + '.js')]).then(function () {
      var def = defs[LT.design];
      if (!def || typeof def.mount !== 'function') throw new Error(base + '.js did not call LT.define("' + LT.design + '", {mount})');
      return def.mount(r, LT.model, LT);
    }).catch(function (err) { LT.fail(err && err.message || String(err), err); });
  });
})();
