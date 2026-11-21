/* Cursor / Lens: the story lies in darkness and a soft light follows the pointer to reveal it.
   Every stage has a readable "surface" layer and an aria-hidden "lens" copy masked by a radial
   gradient at --x/--y/--r. One rAF loop runs only while the pointer moves or a spring settles. */
(function () {
  'use strict';
  LT.define('cursor', { mount: function (root, M, LT) {
    var esc = M.esc, minY = M.minY, maxYear = Math.floor(M.NOW);
    var chaps = M.chapters.filter(function (c) { return !c.epi; });
    var epi = M.chapters.filter(function (c) { return c.epi; })[0] || null;
    var nYears = maxYear - minY + 1;
    var coarse = matchMedia('(hover: none)').matches;
    var RM = LT.reduced();
    LT.onReducedChange(function (v) { RM = v; kick(); });

    /* ---- slots: one per year, plus "Beyond" for the undated epilogue ---------------------- */
    var slots = [], i;
    for (i = 0; i < nYears; i++) slots.push({ label: String(minY + i), y: minY + i, items: [] });
    if (epi) slots.push({ label: 'Beyond', beyond: true, items: epi.stories.slice() });
    chaps.forEach(function (c) { c.stories.forEach(function (e) {
      var k = Math.floor(e._w) - minY; k = Math.max(0, Math.min(nYears - 1, k)); slots[k].items.push(e); }); });
    slots.forEach(function (s) { if (!s.beyond) s.items.sort(function (a, b) { return M.ORDER.indexOf(a.type) - M.ORDER.indexOf(b.type) || (a._w || 0) - (b._w || 0); }); });
    var maxCount = Math.max.apply(null, slots.map(function (s) { return s.items.length; }));
    function chapterFor(s) {
      if (s.beyond) return epi;
      var m = s.y + 0.5, hit = chaps[0];
      chaps.forEach(function (c) { if (c.from <= m) hit = c; });
      return hit;
    }
    function lastEntryYearIdx(dir, from) {
      for (var k = from + dir; k >= 0 && k < slots.length; k += dir) if (slots[k].items.length) return k;
      return -1;
    }

    /* ---- state ---------------------------------------------------------------------------- */
    var firstWith = 0; slots.forEach(function (s, k) { if (!firstWith && s.items.length && !s.beyond) firstWith = k; });
    var startIdx = slots.length - 1 - (epi ? 1 : 0);                 // open on the newest year
    while (startIdx > 0 && !slots[startIdx].items.length) startIdx--;
    var S = { focus: startIdx, type: 'all', all: false, scrub: false, openId: null };
    var all = LT.store.get('cursor.all') === '1';

    /* ---- markup --------------------------------------------------------------------------- */
    var silhouette = '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="42" r="21"/><path d="M14 120c2-30 20-46 46-46s44 16 46 46z"/></svg>';
    var scene = '<svg viewBox="0 0 160 100" aria-hidden="true" focusable="false"><path d="M0 100V70l26-24 22 18 30-40 32 36 20-16 30 28v28z"/><circle cx="122" cy="26" r="9"/></svg>';
    function photoHTML(rich, kind) {
      return '<figure class="cursor-photo"><div class="cursor-frame">' + (kind === 'scene' ? scene : silhouette) + '</div><figcaption class="cursor-cap">Photo placeholder</figcaption></figure>';
    }
    var yrs = M.experience && M.experience.full_time_years;
    /* ---- derived facts: everything below comes from the model, nothing typed in ---------- */
    var byW = function (a, b) { return (Number(b._w) || 0) - (Number(a._w) || 0); };
    var skillIdx = {}, nMetrics = 0;
    M.entries.forEach(function (e) {
      nMetrics += (e.metrics || []).length;
      (e.skills || []).forEach(function (s) { (skillIdx[s] = skillIdx[s] || []).push(e); });
    });
    Object.keys(skillIdx).forEach(function (k) { skillIdx[k].sort(byW); });
    var nSkills = Object.keys(skillIdx).length;
    var PREF = ['role', 'education', 'achievement', 'project', 'publication', 'talk', 'volunteering', 'story', 'life-event', 'vision'];
    function primary(items) {
      var best = null, bi = 99;
      (items || []).forEach(function (e) { var r = PREF.indexOf(e.type); if (r < bi) { bi = r; best = e; } });
      return best;
    }
    function num1(n, d) { return (+n).toFixed(d || 0); }
    function statsHTML() {
      var head = yrs ? { v: yrs, d: 1, t: 'years of full-time engineering', n: 'Computed from role dates, overlaps merged' } : { v: M.entries.length, d: 0, t: 'entries in this life', n: '' };
      var row = [[chaps.length, 'places'], [M.entries.length, 'entries'], [nSkills, 'skills'], [nMetrics, 'measured results']];
      return '<div class="cursor-stats"><div class="cs-main"><b data-count="' + head.v + '" data-dec="' + head.d + '">' + num1(head.v, head.d) + '</b><span>' + esc(head.t) + (head.n ? '<small>' + esc(head.n) + '</small>' : '') + '</span></div>' +
        '<ul class="cs-row">' + row.map(function (r) { return '<li><b data-count="' + r[0] + '" data-dec="0">' + r[0] + '</b><span>' + r[1] + '</span></li>'; }).join('') + '</ul></div>';
    }
    /* per-chapter sections: roles, impact, skills, stories */
    function chapterHTML(c, k) {
      var st = c.stories.slice().sort(function (a, b) { return (Number(a._w) || 0) - (Number(b._w) || 0); });
      var roles = st.filter(function (e) { return e.type === 'role' || e.type === 'education'; });
      var rest = st.filter(function (e) { return e.type !== 'role' && e.type !== 'education'; });
      var mets = [], sk = {};
      st.forEach(function (e) {
        (e.metrics || []).slice(0, 2).forEach(function (m) { mets.push({ m: m, e: e }); });
        (e.skills || []).forEach(function (s) { sk[s] = (sk[s] || 0) + 1; });
      });
      var skills = Object.keys(sk).sort(function (a, b) { return sk[b] - sk[a] || a.localeCompare(b); });
      var span = c.epi ? 'Undated · vision' : Math.floor(c.from) + ' – ' + (c.to >= M.NOW - 0.01 ? 'now' : Math.floor(c.to));
      var h = '<article class="cursor-chsec" id="cursor-ch-' + k + '" data-ci="' + k + '" style="--c:hsl(' + c.hue + ' 80% 66%)" aria-labelledby="cursor-chh-' + k + '">' +
        '<header class="cs-head rv"><p class="cs-kick">Chapter ' + (k + 1) + ' of ' + (chaps.length + (epi ? 1 : 0)) + '</p>' +
        '<h3 id="cursor-chh-' + k + '" class="cs-city"><button type="button" class="cs-city-btn" data-city="' + k + '">' + esc(c.name) + '</button></h3>' +
        '<p class="cs-span">' + esc(span) + (c.region ? ' · ' + esc(c.region) : '') + '</p>' +
        '<p class="cs-count">' + st.length + (st.length === 1 ? ' entry' : ' entries') + (skills.length ? ' · ' + skills.length + ' skills' : '') + '</p></header><div class="cs-body">';
      if (roles.length) h += '<div class="cs-col rv"><h4>Roles and study</h4><ul class="cs-roles">' + roles.map(function (e) {
        return '<li><button type="button" class="cs-role" data-open="' + esc(e.id) + '" style="--c:' + M.typeColor(e.type) + '"><span class="r-t">' + esc(e.title) + '</span><span class="r-o">' + esc([e.org, M.when(e)].filter(Boolean).join(' · ')) + '</span></button></li>'; }).join('') + '</ul></div>';
      if (mets.length) h += '<div class="cs-col rv"><h4>Impact</h4><ul class="cs-mets">' + mets.slice(0, 4).map(function (x) {
        return '<li><button type="button" class="cs-met" data-open="' + esc(x.e.id) + '"><b>' + esc(x.m.value) + '</b><span>' + esc(x.m.meaning) + '</span></button></li>'; }).join('') + '</ul></div>';
      if (skills.length) h += '<div class="cs-col rv"><h4>Skills</h4><div class="cs-skills">' + skills.slice(0, 14).map(function (s) {
        return '<button type="button" class="cs-sk" data-skill="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div></div>';
      h += '</div>';
      if (rest.length) {
        h += '<div class="cs-stories rv"><h4>Stories and projects</h4><ul class="cs-grid">' + rest.map(function (e, n) {
          return '<li' + (n >= 6 ? ' class="x"' : '') + '><button type="button" class="cs-card" data-open="' + esc(e.id) + '" style="--c:' + M.typeColor(e.type) + '"><span class="c-k">' + esc(M.typeName(e.type)) + (e.placeholder ? ' · placeholder' : '') + '</span><span class="c-t">' + esc(e.title) + '</span>' +
            (e.summary ? '<span class="c-s">' + esc(e.summary) + '</span>' : '') + '</button></li>'; }).join('') + '</ul>' +
          (rest.length > 6 ? '<button type="button" class="cursor-btn cs-more" data-more="1" aria-expanded="false">Show all ' + rest.length + '</button>' : '') + '</div>';
      }
      return h + '</article>';
    }
    function chaptersHTML() {
      var every = chaps.concat(epi ? [epi] : []);
      return '<section class="cursor-chapters" id="cursor-chapters" aria-label="Chapters"><div class="cursor-wrap"><p class="cursor-sec-kick rv">Chapter by chapter</p>' +
        '<h2 class="cs-h2 rv">Every place, with its work, results and skills.</h2>' + every.map(chapterHTML).join('') + '</div></section>';
    }
    function heroHTML(rich) {
      var nameInner = 'Akshay<br>Borse';
      return '<div class="cursor-hero-in">' +
        '<p class="cursor-eyebrow">A life in ' + chaps.length + ' places</p>' +
        (rich ? '<div class="cursor-name" aria-hidden="true">' + nameInner + '</div>' : '<h1 class="cursor-name" id="cursor-h1" aria-label="' + esc(M.owner) + '">' + nameInner + '</h1>') +
        '<p class="cursor-lede">From <em>' + esc(chaps[0].name) + '</em> in ' + Math.floor(chaps[0].from) + ' to <em>' + esc(chaps[chaps.length - 1].name) + '</em> today.</p>' + statsHTML() +
        photoHTML(rich, 'person') +
        '<ul class="cursor-route">' + chaps.map(function (c, k) {
          var inner = '<span class="cn">' + esc(c.name) + '</span><span class="cy">' + Math.floor(c.from) + '</span>';
          return '<li>' + (rich ? '<div class="cursor-chap" style="--c:hsl(' + c.hue + ' 80% 66%)">' + inner + '</div>'
            : '<button type="button" class="cursor-chap" data-chap="' + k + '" data-lit="1" style="--c:hsl(' + c.hue + ' 80% 66%)" aria-label="' + esc(c.name + ', from ' + Math.floor(c.from)) + '">' + inner + '</button>') + '</li>';
        }).join('') + '</ul>' +
        '<p class="cursor-hint"><i></i><span class="fine">Move your light</span><span class="coarse">Tap to look closer</span></p></div>';
    }
    function tileHTML(e, n, rich) {
      var c = M.typeColor(e.type), top = '<span class="ct-top"><i></i><span class="ct-type">' + esc(M.typeName(e.type)) + '</span>' +
        (e.placeholder ? '<span class="ct-badge">Placeholder</span>' : '') + '<span class="ct-when">' + esc(M.when(e)) + '</span></span>' +
        '<span class="ct-title">' + esc(e.title) + '</span><span class="ct-org">' + esc([e.org, e.location].filter(Boolean).join(' · ')) + '</span>';
      if (rich) {
        var m = (e.metrics || [])[0];
        return '<li><div class="cursor-tile" style="--c:' + c + ';--i:' + n + '">' + top + '<span class="ct-zone">' +
          (e.summary ? '<span class="ct-sum">' + esc(e.summary) + '</span>' : '') +
          (m ? '<span class="ct-met"><b>' + esc(m.value) + '</b>' + esc(m.meaning) + '</span>' : '') + '</span></div></li>';
      }
      return '<li><button type="button" class="cursor-tile" data-id="' + esc(e.id) + '" data-k="t:' + esc(e.id) + '" data-lit="1" style="--c:' + c + ';--i:' + n + '">' + top +
        '<span class="ct-zone"><span class="ct-sk"></span><span class="ct-sk"></span></span></button></li>';
    }
    function panelHTML(rich) {
      var s = slots[S.focus], c = chapterFor(s), items = s.items;
      var counts = {}; items.forEach(function (e) { counts[e.type] = (counts[e.type] || 0) + 1; });
      var types = Object.keys(counts).sort(function (a, b) { return M.ORDER.indexOf(a) - M.ORDER.indexOf(b); });
      var list = S.type === 'all' ? items : items.filter(function (e) { return e.type === S.type; });
      var limit = 9, shown = S.all ? list : list.slice(0, limit);
      var span = c.epi ? 'Undated · vision' : Math.floor(c.from) + ' – ' + (c.to >= M.NOW - 0.01 ? 'now' : Math.floor(c.to));
      var breakdown = types.map(function (t) { return counts[t] + ' ' + M.typeName(t); }).join(' · ');
      var count = items.length + (items.length === 1 ? ' entry' : ' entries');
      var h = '<header class="cursor-ph"><div><h2 class="cursor-ph-year">' + esc(s.label) + '</h2>' +
        '<p class="cursor-ph-ch">' + esc(c.name) + '<small>' + esc(span) + '</small></p>' +
        '<p class="cursor-ph-x">' + (items.length ? esc(count) + (rich && types.length > 1 ? ' · ' + esc(breakdown) : rich && types.length === 1 ? ' · ' + esc(M.typeName(types[0])) : '') : (rich ? '' : 'Nothing recorded this year')) + '</p></div>' +
        photoHTML(rich, 'scene') + '</header>';
      if (!items.length) {
        var p = lastEntryYearIdx(-1, S.focus), n = lastEntryYearIdx(1, S.focus);
        return h + '<p class="cursor-empty">This year sits inside <b>' + esc(c.name) + '</b> (' + esc(span) + '). No dated entries fall here, so the light has nothing to find. Scrub on to the next one.</p>' +
          '<div class="cursor-empty-actions">' + (p >= 0 ? '<button type="button" class="cursor-btn" data-go="' + p + '" data-k="go:p">&larr; ' + esc(slots[p].label) + '</button>' : '') +
          (n >= 0 ? '<button type="button" class="cursor-btn prime" data-go="' + n + '" data-k="go:n">' + esc(slots[n].label) + ' &rarr;</button>' : '') + '</div>';
      }
      var chips = '';
      if (types.length > 1) {
        chips = '<div class="cursor-chips" role="group" aria-label="Filter ' + esc(s.label) + ' by type"><button type="button" class="cursor-chip" data-t="all" data-k="c:all" aria-pressed="' + (S.type === 'all') + '">All ' + items.length + '</button>' +
          types.map(function (t) { return '<button type="button" class="cursor-chip" data-t="' + t + '" data-k="c:' + t + '" aria-pressed="' + (S.type === t) + '" style="--c:' + M.typeColor(t) + '"><i></i>' + esc(M.typeName(t)) + ' ' + counts[t] + '</button>'; }).join('') + '</div>';
      } else chips = '<div class="cursor-chips" style="min-height:0;margin:0"></div>';
      var more = list.length > limit ? '<p class="cursor-more"><button type="button" class="cursor-btn" data-all="1" data-k="all">' + (S.all ? 'Show fewer' : 'Show all ' + list.length) + '</button></p>' : '<p class="cursor-more"></p>';
      return h + chips + '<ul class="cursor-grid" aria-label="' + esc(s.label + ' entries') + '">' + shown.map(function (e, k) { return tileHTML(e, k, rich); }).join('') + '</ul>' + more;
    }

    root.innerHTML =
      '<div class="cursor-app">' +
      '<a class="cursor-skip" href="#cursor-list">Skip to list</a>' +
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="cursor-sil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9a1"/><stop offset="1" stop-color="#d97a2b"/></linearGradient></defs></svg>' +
      '<div class="cursor-glow" aria-hidden="true"></div><div class="cursor-ring" aria-hidden="true"></div>' +
      '<div class="cursor-bar"><button type="button" class="cursor-toggle cursor-wide" aria-pressed="false" title="Widen the lens (or hold Shift)"><i></i>Wide lens</button><button type="button" class="cursor-toggle cursor-revealall" aria-pressed="false" title="Show every hidden layer without the lens"><i></i>Reveal all</button></div>' +
      '<main>' +
      '<section class="cursor-stage cursor-hero" aria-label="Introduction"><div class="cursor-surface" style="width:100%;display:flex">' + heroHTML(false) + '</div>' +
      '<div class="cursor-lens" aria-hidden="true" data-lens="hero"><div class="cursor-lens-in" style="width:100%;display:flex;height:100%">' + heroHTML(true) + '</div></div></section>' +
      '<section class="cursor-stage cursor-tl" id="cursor-timeline" aria-label="Timeline"><div class="cursor-wrap">' +
      '<p class="cursor-sec-kick">Scrub through time</p>' +
      '<div class="cursor-axis-wrap"><div class="cursor-axis" role="toolbar" aria-label="Years. Left and right arrows move between years." aria-orientation="horizontal"><div class="cursor-track"></div><div class="cursor-needle" aria-hidden="true"></div></div>' +
      '<p class="cursor-axis-hint">' + (coarse ? 'Swipe the years to scrub.' : 'Drag the years, or use the arrow keys.') + ' Bars show how much happened each year.</p></div>' +
      '<div class="cursor-panelwrap"><div class="cursor-panel cursor-surface" data-panel></div>' +
      '<div class="cursor-lens" aria-hidden="true" data-lens="panel"><div class="cursor-lens-in cursor-panel-lens"></div></div>' +
      '<div class="cursor-card" hidden><div class="cursor-card-in" tabindex="-1" role="region"></div></div></div>' +
      '</div></section>' + chaptersHTML() + '</main>' +
      '<div class="cursor-tip" aria-hidden="true"></div>' +
      '<section class="cursor-listwrap" id="cursor-list" tabindex="-1" aria-label="All entries as a plain list"></section></div>';

    var app = root.querySelector('.cursor-app'), glow = app.querySelector('.cursor-glow'), ring = app.querySelector('.cursor-ring');
    var axis = app.querySelector('.cursor-axis'), axisWrap = app.querySelector('.cursor-axis-wrap'), track = app.querySelector('.cursor-track');
    var panel = app.querySelector('[data-panel]'), panelLens = app.querySelector('.cursor-panel-lens');
    var panelWrap = app.querySelector('.cursor-panelwrap'), card = app.querySelector('.cursor-card'), cardIn = card.firstChild;
    var toggle = app.querySelector('.cursor-revealall'), wideBtn = app.querySelector('.cursor-wide'), tip = app.querySelector('.cursor-tip'), heroEl = app.querySelector('.cursor-hero');
    var lenses = [app.querySelector('[data-lens="hero"]'), app.querySelector('[data-lens="panel"]')];
    LT.listView(app.querySelector('.cursor-listwrap'), { title: 'The plain list' });

    /* ---- axis markup ---------------------------------------------------------------------- */
    var tx = '';
    slots.forEach(function (s, k) {
      var n = s.items.length, h = n ? Math.round(6 + 34 * Math.sqrt(n / maxCount)) : 3;
      tx += '<button type="button" class="cursor-yr' + (n ? '' : ' empty') + '" data-i="' + k + '" style="--i:' + k + ';--h:' + h + 'px" tabindex="-1" aria-label="' + esc(s.label + (n ? ', ' + n + (n === 1 ? ' entry' : ' entries') : ', no entries')) + '"><span class="lbl">' + esc(s.label) + '</span><i class="bar"></i></button>';
    });
    chaps.forEach(function (c, k) {
      var f = c.from - minY, w = Math.max(0.6, Math.min(c.to, maxYear + 1) - c.from);
      tx += '<button type="button" class="cursor-band" tabindex="-1" data-year="' + Math.floor(c.from - minY) + '" style="--f:' + f.toFixed(3) + ';--w:' + w.toFixed(3) + ';--c:hsl(' + c.hue + ' 80% 66%)" aria-label="Jump to chapter ' + esc(c.name) + '">' + esc(c.name) + '</button>';
    });
    if (epi) tx += '<button type="button" class="cursor-band" tabindex="-1" data-year="' + (slots.length - 1) + '" style="--f:' + nYears + ';--w:1;--c:hsl(' + epi.hue + ' 80% 66%)" aria-label="Jump to the undated epilogue">Beyond</button>';
    track.innerHTML = tx;
    var yBtns = [].slice.call(track.querySelectorAll('.cursor-yr')), yLbls = yBtns.map(function (b) { return b.firstChild; });

    /* ---- springs + geometry ---------------------------------------------------------------- */
    function sp(x) { return { x: x, v: 0, t: x }; }
    function step(s, k, c, dt, eps) {
      if (RM) { var moved = s.x !== s.t; s.x = s.t; s.v = 0; return false; }
      s.v += (k * (s.t - s.x) - c * s.v) * dt; s.x += s.v * dt;
      if (Math.abs(s.t - s.x) < (eps || 0.002) && Math.abs(s.v) < (eps || 0.002) * 6) { s.x = s.t; s.v = 0; return false; }
      return true;
    }
    var BASE = innerWidth < 640 ? 150 : 200;
    var LX = sp(0), LY = sp(0), LR = sp(0), P = sp(startIdx), CARD = sp(0);
    var mag = yBtns.map(function () { return { x: sp(0), y: sp(0), s: sp(1), p: 0 }; });
    var G = { axisW: 0, yw: 84, lblY: 60 };
    var ptr = { x: -1, y: -1, has: false, down: false, over: 1 };
    var drag = null, clickGuard = false, visible = true, running = false, last = 0, raf = 0, dirty = true;
    var renderTimer = 0, lastRender = 0, cardGeo = null, hasMoved = false;

    function measure() {
      BASE = innerWidth < 640 ? 150 : 200;
      G.axisW = axis.clientWidth; G.yw = parseFloat(getComputedStyle(axisWrap).getPropertyValue('--yw')) || 84;
      var b = yBtns[0]; if (b) G.lblY = b.offsetTop + b.firstChild.offsetTop + b.firstChild.offsetHeight / 2;
      kick();
    }
    function trackX(pos) { return G.axisW / 2 - (pos + 0.5) * G.yw; }
    function clampIdx(v) { return Math.max(0, Math.min(slots.length - 1, v)); }

    function kick() {
      dirty = true;
      if (!running && visible && !document.hidden) { running = true; last = 0; raf = requestAnimationFrame(tick); }
    }

    function tick(now) {
      raf = 0;
      if (!visible || document.hidden) { running = false; return; }
      var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
      // reads first
      var rects = lenses.map(function (l) { return l.parentNode.getBoundingClientRect(); });
      var axr = axis.getBoundingClientRect();
      var act = dirty; dirty = false;

      // light
      act = step(LX, 260, 29, dt, 0.05) | act; act = step(LY, 260, 29, dt, 0.05) | act; act = step(LR, 170, 21, dt, 0.05) | act;
      // axis
      if (!drag) act = step(P, 110, 17, dt, 0.0008) | act;
      // card
      if (cardGeo) act = step(CARD, 170, 14, dt, 0.002) | act;

      // magnets
      var near = !coarse && !RM && ptr.has && !drag && ptr.y > axr.top - 70 && ptr.y < axr.bottom + 40;
      var tX = trackX(P.x), R = 150;
      for (i = 0; i < mag.length; i++) {
        var m = mag[i], tgx = 0, tgy = 0, tgs = 1, p = 0;
        if (near) {
          var cx = axr.left + tX + (i + 0.5) * G.yw, cy = axr.top + G.lblY, dx = ptr.x - cx, dy = ptr.y - cy, d = Math.hypot(dx, dy), f = Math.max(0, 1 - d / R); f *= f;
          tgx = Math.max(-20, Math.min(20, dx * f * 0.38)); tgy = Math.max(-10, Math.min(10, dy * f * 0.26)); tgs = 1 + 0.55 * f; p = f;
        }
        m.x.t = tgx; m.y.t = tgy; m.s.t = tgs; m.p = p;
        var a1 = step(m.x, 200, 16, dt, 0.03), a2 = step(m.y, 200, 16, dt, 0.03), a3 = step(m.s, 200, 16, dt, 0.002);
        act = (a1 | a2 | a3) | act;
      }

      // writes
      var rr = Math.max(LR.x, 0);
      glow.style.transform = 'translate3d(' + (LX.x - 500) + 'px,' + (LY.x - 500) + 'px,0) scale(' + (0.2 + rr / BASE * 0.8).toFixed(3) + ')';
      var ringK = LT.theme() === 'light' ? 0.995 : 0.9;
      ring.style.transform = 'translate3d(' + (LX.x - 260) + 'px,' + (LY.x - 260) + 'px,0) scale(' + Math.max(0.001, rr * ringK / 260).toFixed(4) + ')';
      for (i = 0; i < lenses.length; i++) {
        var st = lenses[i].style, rc = rects[i];
        st.setProperty('--x', (LX.x - rc.left).toFixed(1) + 'px'); st.setProperty('--y', (LY.x - rc.top).toFixed(1) + 'px'); st.setProperty('--r', Math.max(rr, 0.5).toFixed(1) + 'px');
      }
      track.style.transform = 'translate3d(' + tX.toFixed(2) + 'px,0,0)';
      for (i = 0; i < mag.length; i++) {
        var q = mag[i], mm = yLbls[i];
        if (q.x.x || q.y.x || q.s.x !== 1 || mm._on) {
          mm.style.transform = 'translate3d(' + q.x.x.toFixed(2) + 'px,' + q.y.x.toFixed(2) + 'px,0) scale(' + q.s.x.toFixed(3) + ')';
          mm._on = !!(q.x.x || q.y.x || q.s.x !== 1);
        }
        if (q.p !== q._p) { yBtns[i].style.setProperty('--p', q.p.toFixed(3)); q._p = q.p; }
      }
      if (tipKey) {
        var tw = tipW || 240, th = tipH || 120, tx, ty;
        if (coarse) { tx = LX.x - tw / 2; ty = LY.x - rr - th - 14; if (ty < 8) ty = LY.x + rr + 14; }
        else { tx = LX.x + rr * 0.74 + 12; ty = LY.x - th / 2; if (tx + tw > innerWidth - 8) tx = LX.x - rr * 0.74 - 12 - tw; }
        tx = Math.max(8, Math.min(innerWidth - tw - 8, tx)); ty = Math.max(8, Math.min(innerHeight - th - 8, ty));
        tip.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
      }
      if (cardGeo) writeCard();
      // focus year follows the scrub position while dragging, else the target
      var f2 = clampIdx(Math.round(drag ? P.x : P.t));
      if (f2 !== S.focus) setFocus(f2, { throttle: !!drag });

      if (act) raf = requestAnimationFrame(tick); else { running = false; last = 0; }
    }

    /* ---- light control ------------------------------------------------------------------- */
    var mode = { wide: LT.store.get('cursor.wide') === '1', shift: false, held: false };
    function want() {
      var r = BASE * ptr.over;
      if (mode.wide || mode.shift) r *= 1.65;
      if (mode.held) r *= 1.25;
      return Math.min(r, Math.min(innerWidth, innerHeight) * 0.62);
    }
    function setWide(v) { mode.wide = v; wideBtn.setAttribute('aria-pressed', v); LT.store.set('cursor.wide', v ? '1' : '0'); if (ptr.has) LR.t = want(); kick(); }
    wideBtn.onclick = function () { setWide(!mode.wide); };
    wideBtn.setAttribute('aria-pressed', mode.wide);
    function lightTo(x, y, snap) {
      ptr.x = x; ptr.y = y; LX.t = x; LY.t = y;
      if (!hasMoved || snap) { hasMoved = true; if (snap) { LX.x = x; LY.x = y; } }
      LR.t = want(); app.classList.add('cursor-on');
      kick();
    }
    function introLight() {
      var h = app.querySelector('.cursor-surface .cursor-name'), r = h.getBoundingClientRect();
      var x = coarse ? innerWidth * 0.5 : r.left + Math.min(r.width, 520) * 0.5, y = r.top + r.height * 0.45;
      LX.x = LX.t = x - 90; LY.x = LY.t = y + 60; LR.x = 0; ptr.x = x; ptr.y = y; LX.t = x; LY.t = y; LR.t = BASE * (coarse ? 1.05 : 1);
      app.classList.add('cursor-on'); kick();
    }
    function interactive(el) { return !!(el && el.closest && el.closest('.cursor-tile,.cursor-yr,.cursor-chap,.cursor-chip,.cursor-btn,.cursor-card,.cs-role,.cs-card,.cs-met,.cs-sk,.cs-city-btn')); }

    /* ---- the lens changes mode over content: year -> its events, skill -> where used, city -> the chapter */
    function yearOf(e) { return e._w != null ? String(Math.floor(e._w)) : 'undated'; }
    function ctxFor(el) {
      if (!el || !el.closest) return null;
      var n, k, l, e;
      if ((n = el.closest('[data-skill]'))) { l = skillIdx[n.getAttribute('data-skill')]; return l ? { k: 'skill', v: n.getAttribute('data-skill'), id: l[0].id, mult: 0.72 } : null; }
      if ((n = el.closest('.cursor-yr'))) { k = +n.getAttribute('data-i'); e = primary(slots[k].items); return { k: 'year', v: k, id: e && e.id, mult: 0.8 }; }
      if ((n = el.closest('[data-city]'))) { k = +n.getAttribute('data-city'); return cityCtx(k); }
      if ((n = el.closest('[data-open],[data-id]'))) { var id = n.getAttribute('data-open') || n.getAttribute('data-id'); return M.byId[id] ? { k: 'story', v: id, id: id, mult: 0.95 } : null; }
      if ((n = el.closest('[data-chap]'))) return cityCtx(+n.getAttribute('data-chap'));
      if ((n = el.closest('.cursor-chsec'))) return cityCtx(+n.getAttribute('data-ci'));
      if (el.closest('.cursor-panelwrap') && !el.closest('.cursor-card')) { e = primary(slots[S.focus].items); return { k: 'year', v: S.focus, id: e && e.id, mult: 0.9 }; }
      return null;
    }
    function cityCtx(k) {
      var c = k < chaps.length ? chaps[k] : epi; if (!c) return null;
      var e = primary(c.stories.filter(function (x) { return x.type === 'role'; })) || primary(c.stories);
      var roles = c.stories.filter(function (x) { return x.type === 'role'; });
      var latest = roles.slice().sort(byW)[0] || e;
      return { k: 'city', v: k, id: latest && latest.id, mult: 1.3 };
    }
    function tipHTML(c) {
      var lines = function (arr, max) { return '<ul>' + arr.slice(0, max).map(function (e) { return '<li><i style="--c:' + M.typeColor(e.type) + '"></i><b>' + esc(yearOf(e)) + '</b><span>' + esc(e.title) + '</span></li>'; }).join('') + '</ul>' + (arr.length > max ? '<p class="tp-more">+' + (arr.length - max) + ' more</p>' : ''); };
      var foot = '<p class="tp-go">' + (coarse ? 'Tap' : 'Click') + ' to open the story</p>';
      if (c.k === 'year') {
        var s = slots[c.v], ch = chapterFor(s);
        return '<p class="tp-k">' + esc(s.label) + ' · ' + esc(ch.name) + '</p><p class="tp-h">' + (s.items.length ? s.items.length + (s.items.length === 1 ? ' event' : ' events') : 'Nothing dated this year') + '</p>' + lines(s.items.filter(function (e) { return e.type !== 'life-event'; }).concat(s.items.filter(function (e) { return e.type === 'life-event'; })), 4) + (c.id ? foot : '');
      }
      if (c.k === 'skill') {
        var l = skillIdx[c.v], ys = l.map(function (e) { return e._w; }).filter(function (w) { return w != null; });
        var span = ys.length ? Math.floor(Math.min.apply(null, ys)) + ' to ' + Math.floor(Math.max.apply(null, ys)) : 'undated';
        return '<p class="tp-k">Skill</p><p class="tp-h">' + esc(c.v) + '</p><p class="tp-s">Used in ' + l.length + (l.length === 1 ? ' entry' : ' entries') + ', ' + esc(span) + '</p>' + lines(l, 4) + foot;
      }
      if (c.k === 'city') {
        var ch2 = c.v < chaps.length ? chaps[c.v] : epi, st = ch2.stories, roles = st.filter(function (e) { return e.type === 'role'; });
        var sp = ch2.epi ? 'Undated · vision' : Math.floor(ch2.from) + ' to ' + (ch2.to >= M.NOW - 0.01 ? 'now' : Math.floor(ch2.to));
        var sk = {}; st.forEach(function (e) { (e.skills || []).forEach(function (x) { sk[x] = (sk[x] || 0) + 1; }); });
        var top = Object.keys(sk).sort(function (a, b) { return sk[b] - sk[a]; }).slice(0, 3);
        return '<p class="tp-k">Chapter · ' + esc(sp) + '</p><p class="tp-h">' + esc(ch2.name) + '</p><p class="tp-s">' + st.length + (st.length === 1 ? ' entry' : ' entries') + (roles.length ? ', ' + roles.length + (roles.length === 1 ? ' role' : ' roles') : '') + '</p>' +
          (top.length ? '<p class="tp-s">' + esc(top.join(' · ')) + '</p>' : '') + (c.id ? foot : '');
      }
      var e = M.byId[c.v], m = (e.metrics || [])[0];
      return '<p class="tp-k">' + esc(M.typeName(e.type)) + ' · ' + esc(M.when(e)) + '</p><p class="tp-h">' + esc(e.title) + '</p>' + (e.summary ? '<p class="tp-s">' + esc(e.summary) + '</p>' : '') +
        (m ? '<p class="tp-m"><b>' + esc(m.value) + '</b> ' + esc(m.meaning) + '</p>' : '') + foot;
    }
    var tipKey = '', tipW = 0, tipH = 0, cur = null;
    function setCtx(c) {
      cur = c;
      var key = c ? c.k + ':' + c.v : '';
      if (key === tipKey) return;
      tipKey = key;
      if (!c) { tip.classList.remove('on'); return; }
      tip.innerHTML = tipHTML(c); tip.classList.add('on');
      tipW = tip.offsetWidth; tipH = tip.offsetHeight;
    }
    function applyCtx(el, ev) {
      var c = ctxFor(el);
      ptr.over = c ? c.mult : (interactive(el) ? 1.18 : 1);
      setCtx(c);
    }
    addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch') {
        if (!ev.isPrimary) return;
        if (!mode.held && hold && Math.hypot(ev.clientX - hold.x, ev.clientY - hold.y) > 10) { clearTimeout(hold.t); hold = null; }
        if (!mode.held && !ptr.down) return;
      }
      ptr.has = true; applyCtx(ev.target, ev); if (ptr.down) ptr.over *= 0.88;
      lightTo(ev.clientX, ev.clientY, false);
    }, { passive: true });
    /* touch: tap-and-hold summons the lens (and its caption); lift to let it go */
    var hold = null, holdOff = 0;
    addEventListener('pointerdown', function (ev) {
      ptr.has = true; ptr.down = true;
      applyCtx(ev.target, ev); ptr.over = interactive(ev.target) ? 1.05 : 0.9;
      if (ev.pointerType === 'touch') {
        ptr.over = 1.1; LR.x = Math.max(LR.x, BASE * 0.35); LX.x = LX.t = ev.clientX; LY.x = LY.t = ev.clientY;
        clearTimeout(holdOff); clearTimeout(hold && hold.t);
        var x = ev.clientX, y = ev.clientY, tg = ev.target;
        hold = { x: x, y: y, t: setTimeout(function () { mode.held = true; applyCtx(tg); LR.t = want(); kick(); if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* optional */ } } }, 340) };
      }
      lightTo(ev.clientX, ev.clientY, false);
    }, { passive: true });
    function liftTouch() {
      if (hold) { clearTimeout(hold.t); hold = null; }
      if (mode.held) { mode.held = false; holdOff = setTimeout(function () { setCtx(null); LR.t = 0; kick(); }, 1400); }
    }
    addEventListener('touchmove', function (ev) { if (mode.held && ev.cancelable) ev.preventDefault(); }, { passive: false });
    addEventListener('pointerup', function (ev) { ptr.down = false; if (ev.pointerType === 'touch') { liftTouch(); return; } applyCtx(ev.target); LR.t = want(); kick(); }, { passive: true });
    addEventListener('pointercancel', function (ev) { if (ev.pointerType === 'touch') liftTouch(); });
    document.documentElement.addEventListener('mouseleave', function () { ptr.has = false; LR.t = 0; setCtx(null); kick(); });
    document.documentElement.addEventListener('mouseenter', function () { LR.t = want(); kick(); });
    addEventListener('keydown', function (ev) { if (ev.key === 'Shift' && !mode.shift) { mode.shift = true; if (ptr.has) LR.t = want(); kick(); } });
    addEventListener('keyup', function (ev) { if (ev.key === 'Shift') { mode.shift = false; if (ptr.has) LR.t = want(); kick(); } });
    addEventListener('blur', function () { mode.shift = false; });
    // touch: the light belongs to the last tap; let it go dark once the page scrolls under it
    var lastY = scrollY, barEl = app.querySelector('.cursor-bar');
    addEventListener('scroll', function () { var y = scrollY; if (barEl) barEl.classList.toggle('away', y > 120 && y > lastY + 2 ? true : (y < lastY - 2 ? false : barEl.classList.contains('away'))); lastY = y; if (coarse && !ptr.down && !mode.held) { LR.t = 0; setCtx(null); } kick(); }, { passive: true });
    addEventListener('resize', measure);
    addEventListener('focusin', function (ev) {
      var t = ev.target; if (!t.matches || !t.matches(':focus-visible') || !t.closest('[data-lit]')) return;
      var rc = t.getBoundingClientRect(); ptr.has = false; ptr.over = 1; lightTo(rc.left + rc.width / 2, rc.top + rc.height / 2, false);
    });
    LT.onTheme(function () { kick(); });
    LT.whenVisible(app, function (v) { visible = v; if (v) kick(); else { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; } });

    /* ---- reveal all ---------------------------------------------------------------------- */
    function setAll(v) { all = v; app.classList.toggle('cursor-all', v); toggle.setAttribute('aria-pressed', v); LT.store.set('cursor.all', v ? '1' : '0'); kick(); }
    toggle.onclick = function () { setAll(!all); };
    setAll(all);

    /* ---- focus year, render ---------------------------------------------------------------- */
    function setFocus(f, o) {
      o = o || {};
      if (f !== S.focus) { S.focus = f; S.type = 'all'; S.all = false; closeCard(true); }
      yBtns.forEach(function (b, k) { var on = k === f; if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); b.tabIndex = on ? 0 : -1; });
      var wait = o.throttle ? 120 - (performance.now() - lastRender) : 0;
      clearTimeout(renderTimer);
      if (wait > 0) renderTimer = setTimeout(function () { render(false); }, wait); else render(!o.throttle);
    }
    function render(anim) {
      lastRender = performance.now();
      var ae = document.activeElement, key = ae && panel.contains(ae) && ae.getAttribute('data-k');
      panel.innerHTML = panelHTML(false); panelLens.innerHTML = panelHTML(true);
      panelWrap.classList.remove('cursor-in');
      if (anim && !RM) { void panelWrap.offsetWidth; panelWrap.classList.add('cursor-in'); }
      if (key) { var again = panel.querySelector('[data-k="' + key.replace(/"/g, '') + '"]'); if (again) again.focus({ preventScroll: true }); }
      kick();
    }

    /* ---- panel interactions ---------------------------------------------------------------- */
    panel.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.id) return openCard(b, b.dataset.id);
      if (b.dataset.t) { S.type = b.dataset.t; S.all = false; closeCard(true); render(true); }
      else if (b.dataset.all) { S.all = !S.all; closeCard(true); render(false); }
      else if (b.dataset.go) goTo(+b.dataset.go);
    });
    function goTo(k) { P.t = clampIdx(k); setFocus(P.t); kick(); }

    /* ---- the open card (spring) ------------------------------------------------------------ */
    function cardHTML(e) {
      var mets = (e.metrics || []).slice(0, 3), sk = (e.skills || []).slice(0, 6);
      return '<span class="ct-top" style="--c:' + M.typeColor(e.type) + '"><i></i><span>' + esc(M.typeName(e.type)) + '</span>' + (e.placeholder ? '<span class="ct-badge">Placeholder</span>' : '') + '</span>' +
        '<h3 class="cc-title">' + esc(e.title) + '</h3><p class="cc-sub">' + esc([e.org, e.location, M.when(e)].filter(Boolean).join(' · ')) + '</p><div class="cc-more">' +
        (e.summary ? '<p class="cc-sum">' + esc(e.summary) + '</p>' : '') +
        (mets.length ? '<div class="cc-met">' + mets.map(function (m) { return '<div><b>' + esc(m.value) + '</b><span>' + esc(m.meaning) + '</span></div>'; }).join('') + '</div>' : '') +
        (sk.length ? '<div class="cc-chips">' + sk.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="cc-actions"><button type="button" class="cursor-btn prime" data-full="' + esc(e.id) + '">Full story</button><button type="button" class="cursor-btn" data-close="1">Close</button></div></div>';
    }
    function openCard(tile, id) {
      var e = M.byId[id]; if (!e) return;
      if (S.openId) closeCard(true);
      var wr = panelWrap.getBoundingClientRect(), tr = tile.getBoundingClientRect();
      var narrow = wr.width < 560, W = narrow ? wr.width : Math.min(wr.width, Math.max(tr.width, 440));
      cardIn.innerHTML = cardHTML(e); cardIn.setAttribute('aria-label', e.title); cardIn.style.width = W + 'px';
      card.hidden = false; card.style.width = W + 'px'; card.style.height = 'auto';
      var H = Math.max(cardIn.offsetHeight, tr.height);
      var L = narrow ? 0 : Math.max(0, Math.min(wr.width - W, tr.left - wr.left)), T = tr.top - wr.top;
      T = Math.max(0, Math.min(T, wr.height + 120 - H));
      cardGeo = { from: { l: tr.left - wr.left, t: tr.top - wr.top, w: tr.width, h: tr.height }, to: { l: L, t: T, w: W, h: H } };
      S.openId = id; S.openKey = 't:' + id;
      CARD.x = 0; CARD.v = 0; CARD.t = 1; writeCard(); card.style.opacity = 1;
      cardIn.focus({ preventScroll: true }); kick();
    }
    function writeCard() {
      var o = CARD.x, g = cardGeo; if (!g) return;
      var l = g.from.l + (g.to.l - g.from.l) * o, t = g.from.t + (g.to.t - g.from.t) * o,
        w = Math.max(g.from.w * 0.9, g.from.w + (g.to.w - g.from.w) * o), h = Math.max(g.from.h * 0.9, g.from.h + (g.to.h - g.from.h) * o);
      card.style.transform = 'translate3d(' + l.toFixed(1) + 'px,' + t.toFixed(1) + 'px,0)'; card.style.width = w.toFixed(1) + 'px'; card.style.height = h.toFixed(1) + 'px';
      var more = cardIn.querySelector('.cc-more'); if (more) more.style.opacity = Math.max(0, Math.min(1, (o - 0.3) / 0.45)).toFixed(3);
      if (CARD.t === 0 && CARD.x < 0.01) { card.hidden = true; cardGeo = null; }
    }
    function closeCard(instant, refocus) {
      if (!S.openId) return;
      var key = S.openKey; S.openId = null;
      if (instant || RM) { card.hidden = true; cardGeo = null; CARD.x = CARD.t = 0; } else { CARD.t = 0; kick(); }
      if (refocus) { var t = panel.querySelector('[data-k="' + key + '"]'); if (t) t.focus({ preventScroll: true }); }
    }
    card.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.full) LT.openDetail(b.dataset.full); else if (b.dataset.close) closeCard(false, true);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && S.openId && !LT.isDetailOpen()) { closeCard(false, true); }
    });
    document.addEventListener('pointerdown', function (ev) {
      if (S.openId && !card.contains(ev.target) && !(ev.target.closest && ev.target.closest('.cursor-tile'))) closeCard(false);
    });

    /* ---- axis: drag to scrub (momentum), keys, magnets ------------------------------------- */
    axis.addEventListener('pointerdown', function (ev) {
      if (ev.button > 0 || !ev.isPrimary) return;
      drag = { id: ev.pointerId, x0: ev.clientX, p0: P.x, moved: false, s: [{ t: ev.timeStamp, p: P.x }] }; P.v = 0;
    });
    addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var dx = ev.clientX - drag.x0;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; try { axis.setPointerCapture(drag.id); } catch (e) { /* not capturable: drag still works on window */ } axis.classList.add('drag'); S.scrub = true; closeCard(true); }
      if (!drag.moved) return;
      var raw = drag.p0 - dx / G.yw, max = slots.length - 1;
      if (raw < 0) raw *= 0.4; else if (raw > max) raw = max + (raw - max) * 0.4;
      P.x = P.t = raw; drag.s.push({ t: ev.timeStamp, p: raw }); if (drag.s.length > 8) drag.s.shift();
      kick();
    }, { passive: true });
    function endDrag(ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var d = drag; drag = null; axis.classList.remove('drag');
      if (!d.moved) return;
      clickGuard = true; setTimeout(function () { clickGuard = false; }, 0);
      var s = d.s, a = s[0], b = s[s.length - 1], k = s.length - 1; while (k > 0 && b.t - s[k].t < 90) k--; a = s[k];
      var v = b.t > a.t ? (b.p - a.p) / (b.t - a.t) * 1000 : 0; if (RM) v = 0;
      P.v = Math.max(-18, Math.min(18, v)); P.t = clampIdx(Math.round(P.x + P.v * 0.28));
      S.scrub = false; setFocus(P.t); kick();
    }
    addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
    axis.addEventListener('click', function (ev) {
      if (clickGuard) { ev.stopPropagation(); ev.preventDefault(); return; }
      var y = ev.target.closest('.cursor-yr'), b = ev.target.closest('.cursor-band');
      if (y) { var yk = +y.dataset.i, was = yk === S.focus && !coarse; goTo(yk); y.focus({ preventScroll: true }); var pe = primary(slots[yk].items); if (was && pe) LT.openDetail(pe.id); } else if (b) goTo(clampIdx(+b.dataset.year));
    }, true);
    axis.addEventListener('keydown', function (ev) {
      var d = { ArrowLeft: -1, ArrowRight: 1, PageUp: -5, PageDown: 5 }[ev.key], t;
      if (d) t = clampIdx(S.focus + d); else if (ev.key === 'Home') t = 0; else if (ev.key === 'End') t = slots.length - 1; else return;
      ev.preventDefault(); goTo(t); yBtns[t].focus({ preventScroll: true });
    });
    axis.addEventListener('dragstart', function (ev) { ev.preventDefault(); });

    /* chapter buttons in the hero: jump into the timeline */
    app.querySelector('.cursor-hero .cursor-surface').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-chap]'); if (!b) return;
      var c = chaps[+b.dataset.chap]; goTo(clampIdx(Math.floor(c.from) - minY));
      app.querySelector('#cursor-timeline').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    });

    /* ---- more ways in: wheel scrub, arrows, click-to-open, chapters, reveal, count-up -------------- */
    var wheelAcc = 0, wheelAt = 0;
    axis.addEventListener('wheel', function (ev) {
      if (ev.ctrlKey || ev.metaKey) return;
      var d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      if (!d) return;
      ev.preventDefault();
      wheelAcc += ev.deltaMode === 1 ? d * 30 : d;
      var now = performance.now();
      if (Math.abs(wheelAcc) < 50 || now - wheelAt < 70) return;
      var dir = wheelAcc > 0 ? 1 : -1; wheelAcc = 0; wheelAt = now;
      var t = clampIdx((drag ? P.x : P.t) + dir); if (t !== S.focus) goTo(t);
    }, { passive: false });
    document.addEventListener('keydown', function (ev) {
      var ae = document.activeElement;
      if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || LT.isDetailOpen()) return;
      if (ae && ae !== document.body && ae.closest && !ae.closest('.cursor-hero,.cursor-chapters') ) return;
      if (ae && ae !== document.body && ae.matches && ae.matches('button,a,input,textarea,select,[tabindex]')) return;
      var d = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0;
      if (!d || !visible) return;
      var r = axis.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      ev.preventDefault(); goTo(clampIdx(S.focus + d));
    });
    function openPrimary(items) { var e = primary(items); if (e) LT.openDetail(e.id); }
    app.addEventListener('click', function (ev) {
      var t = ev.target; if (!t.closest) return;
      var o = t.closest('[data-open]');
      if (o && o.closest('.cursor-chapters')) { LT.openDetail(o.getAttribute('data-open')); return; }
      var sk = t.closest('[data-skill]');
      if (sk) { var l = skillIdx[sk.getAttribute('data-skill')]; if (l) LT.openDetail(l[0].id); return; }
      var cb = t.closest('[data-city]');
      if (cb) { var c = cityCtx(+cb.getAttribute('data-city')); if (c && c.id) LT.openDetail(c.id); return; }
      var mo = t.closest('[data-more]');
      if (mo) { var sec = mo.closest('.cursor-chsec'), on = sec.classList.toggle('open'); mo.setAttribute('aria-expanded', on); mo.textContent = on ? 'Show fewer' : mo.getAttribute('data-label'); return; }
      // click anywhere under the lens: open the story it is showing
      if (clickGuard || (window.getSelection && String(window.getSelection()))) return;
      if (t.closest('button,a,input,select,textarea,[data-id],.cursor-card,.cursor-yr,.cursor-band,.cursor-chap,.cursor-bar')) return;
      var cx = ctxFor(t); if (cx && cx.id && cx.k !== 'story') LT.openDetail(cx.id);
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-more]'), function (b) { if (!b.getAttribute('data-label')) b.setAttribute('data-label', b.textContent); });
    // chapter sections: a soft spotlight follows the pointer
    addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch' || !ev.target.closest) return;
      var sec = ev.target.closest('.cursor-chsec'); if (!sec) return;
      var r = sec.getBoundingClientRect(); sec.style.setProperty('--mx', (ev.clientX - r.left).toFixed(0) + 'px'); sec.style.setProperty('--my', (ev.clientY - r.top).toFixed(0) + 'px');
    }, { passive: true });
    // reveal on scroll + count-up
    function fmtCount(v, dec) { return dec ? v.toFixed(dec) : String(Math.round(v)); }
    function countUp(el) {
      var to = parseFloat(el.getAttribute('data-count')), dec = +el.getAttribute('data-dec') || 0;
      if (!isFinite(to)) return;
      if (RM) { el.textContent = fmtCount(to, dec); return; }
      var t0 = performance.now(), dur = 1400;
      (function f(now) { var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmtCount(to * e, dec); if (p < 1) requestAnimationFrame(f); else el.textContent = fmtCount(to, dec); })(t0);
    }
    var counted = false;
    function runCounts() { if (counted) return; counted = true; Array.prototype.forEach.call(app.querySelectorAll('[data-count]'), countUp); }
    if ('IntersectionObserver' in window) {
      var rvEls = Array.prototype.slice.call(app.querySelectorAll('.rv'));
      if (!RM) app.classList.add('cursor-rv-on');
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      rvEls.forEach(function (el, n) { el.style.setProperty('--d', ((n % 4) * 70) + 'ms'); io.observe(el); });
      var stats = app.querySelector('.cursor-stats');
      if (stats) { var io2 = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { runCounts(); io2.disconnect(); } }, { threshold: 0.3 }); io2.observe(stats); }
      else runCounts();
    } else runCounts();

    /* ---- boot -------------------------------------------------------------------------------- */
    new ResizeObserver(measure).observe(axis);
    measure();
    setFocus(S.focus); render(false);
    P.x = P.t = S.focus;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); introLight(); });
    introLight();
  } });
})();
