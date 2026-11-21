/* Scrapbook: "Desk". A desk of keepsakes you can pick up, flip and throw.
   Custom spring + friction integrator on DOM transforms (translate3d / rotate), no canvas, no libraries.
   Each chapter is one spread; the spread is generated from window.CAREER via LT.model. */
LT.define('scrapbook', {
  mount: function (root, M, LT) {
    'use strict';
    var esc = M.esc, chapters = M.chapters;
    var reduced = LT.reduced();
    var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    var hash = function (s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    var rng = function (seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

    var SIZE = { photo: [172, 214], card: [258, 160], note: [204, 204], stamp: [120, 144], ticket: [322, 122], box: [214, 150], titlecard: [292, 178], yearstamp: [132, 132], skillnote: [198, 212] };
    var GROUP = { photo: 'photos', chapterphoto: 'photos', card: 'cards', ticket: 'cards', titlecard: 'cards', note: 'notes', skillnote: 'notes', stamp: 'awards', yearstamp: 'awards', box: 'box' };
    var GL = { photos: 'photos', cards: 'cards', notes: 'notes', awards: 'awards', box: 'box' };
    var DECKLE = { card: 1, note: 1, titlecard: 1, skillnote: 1 };
    var PINSVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="9" r="6.2" fill="currentColor"/><circle cx="10" cy="7" r="2" fill="#fff" opacity=".5"/><path d="M12 14.5V22" stroke="#555" stroke-width="1.8" stroke-linecap="round"/></svg>';
    var T_SHOW = 1250, T_HIDE = 2150;   // keep in step with the envelope transitions in scrapbook.css
    var BACK = [270, 220];
    var KIND_OF = { achievement: 'stamp', role: 'card', education: 'card', publication: 'card', story: 'note', 'life-event': 'note', vision: 'note', project: 'photo', talk: 'photo', volunteering: 'photo' };
    var WEIGHT = { role: 5, achievement: 4, education: 4, life: 3, 'life-event': 3, project: 3, publication: 3, talk: 2, story: 2, volunteering: 2, vision: 2 };
    var MAX_ON_DESK = 10;           // chapters with more stories than this show 9 + a box
    var CAM = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/></svg>';
    var STAR = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="currentColor"><path d="M12 2.5l2.6 6 6.4.6-4.9 4.3 1.5 6.3L12 16.4 6.4 19.7l1.5-6.3L3 9.1l6.4-.6z"/></svg>';

    var items = [], zTop = 10, cur = -1, cols = 0, drag = null, lastTap = null, raf = 0, last = 0, visible = true;
    var opened = false, trayFor = null, deskW = 0, deskH = 0;
    var seedStr = '', shuf = 0, pileOn = false, fan = -1, piles = [], hovO = null, sw = null, turnEl = null, turnAnim = null;

    // ---- Skeleton ------------------------------------------------------------------------
    var last0 = chapters.filter(function (c) { return !c.epi; }).slice(-1)[0] || chapters[0];
    var fy = M.experience && M.experience.full_time_years;
    root.innerHTML =
      '<div class="sb-app">' +
      '<div class="sb-wood" aria-hidden="true"></div>' +
      '<button type="button" class="sb-skip">Skip to list</button>' +
      '<header class="sb-head"><div class="sb-title"><h1>' + esc(M.owner) + '</h1><p>A desk of keepsakes · ' + M.minY + ' to now</p></div>' +
      '<div class="sb-ctrl"><button type="button" class="sb-btn sb-tidy">Tidy desk</button><button type="button" class="sb-btn sb-shuf">Shuffle</button><button type="button" class="sb-btn sb-pile" aria-pressed="false">Pile up</button><button type="button" class="sb-btn sb-listbtn">List view</button></div></header>' +
      '<nav class="sb-tabs" role="tablist" aria-label="Chapters (use the left and right arrow keys)">' + chapters.map(function (c, i) {
        return '<button type="button" role="tab" class="sb-tab" id="sb-tab-' + i + '" data-i="' + i + '" aria-selected="false" aria-controls="sb-desk" tabindex="-1"><span class="sb-tab-y">' + (c.epi ? '&infin;' : Math.floor(c.from)) + '</span><span class="sb-tab-n">' + esc(c.epi ? 'Beyond' : c.name) + '</span></button>';
      }).join('') + '</nav>' +
      '<p class="sb-hint"><span class="sb-hint-mouse">Drag to pick up and throw. Double-click or Enter to flip. Space lifts, arrows nudge, P pins, left and right switch chapters. Pile up stacks like with like; click a pile to fan it out.</span><span class="sb-hint-touch">Press and hold to grab, then drag or throw. Double-tap to flip. Swipe the desk left or right to change chapter.</span></p>' +
      '<main class="sb-blotter"><div class="sb-label" aria-hidden="true"></div>' +
      '<div class="sb-desk" id="sb-desk" role="tabpanel" aria-labelledby="sb-tab-0">' +
      '<span class="sb-prop sb-pencil" aria-hidden="true"></span><span class="sb-prop sb-ring" aria-hidden="true"></span><span class="sb-prop sb-clip" aria-hidden="true"></span>' +
      '<div class="sb-items"></div><div class="sb-tray" hidden></div><div class="sb-turn" aria-hidden="true" hidden><b></b><span></span><i></i></div>' +
      '<div class="sb-cover" role="region" aria-label="Cover"><div class="sb-env"><div class="sb-env-back"></div>' +
      '<div class="sb-letter"><p>Pick things up.<br>Turn them over.<br>Throw them if you like.</p></div>' +
      '<div class="sb-env-front"><span class="sb-stamp-mini">' + (fy ? '<b>' + esc(fy) + '</b><i>yrs</i>' : '<b>&#9733;</b>') + '</span><span class="sb-postmark" aria-hidden="true"></span>' +
      '<div class="sb-addr"><b>' + esc(M.owner) + '</b><span>A life, in keepsakes</span><em>' + esc(chapters[0].name) + ' &rarr; ' + esc(last0.name) + '</em></div></div>' +
      '<div class="sb-flap"></div><button type="button" class="sb-seal" aria-label="Break the seal and open the desk"><span>Open</span></button></div>' +
      '<p class="sb-cover-hint">' + (fy ? esc(fy) + ' years of full-time work, ' : '') + chapters.length + ' chapters, ' + M.entries.length + ' keepsakes.</p></div>' +
      '</div></main>' +
      '<div class="sb-live" aria-live="polite" role="status"></div><p id="sb-desc" hidden>Press Enter to flip, Space to pick up or put down, arrow keys to move it.</p>' +
      '<section class="sb-listwrap" id="sb-list" hidden tabindex="-1"><button type="button" class="sb-btn sb-back-desk">Back to the desk</button><div class="sb-listbox"></div></section></div>';

    var $ = function (s) { return root.querySelector(s); };
    var app = $('.sb-app'), desk = $('.sb-desk'), layer = $('.sb-items'), tray = $('.sb-tray'), cover = $('.sb-cover'), live = $('.sb-live'), label = $('.sb-label');
    turnEl = $('.sb-turn');
    var pileBtn = $('.sb-pile');
    var tabsEl = $('.sb-tabs'), blotter = $('.sb-blotter'), listWrap = $('#sb-list');
    var yrs = function (ch) { return ch.epi ? 'undated' : Math.floor(ch.from) + (Math.floor(ch.to) > Math.floor(ch.from) ? ' to ' + (ch.to >= M.NOW - 0.01 ? 'now' : Math.floor(ch.to)) : ''); };
    var skillsOf = function (e) { return (e && Array.isArray(e.skills)) ? e.skills.filter(Boolean) : []; };
    var say = function (m) { live.textContent = ''; setTimeout(function () { live.textContent = m; }, 30); };

    // ---- Item content --------------------------------------------------------------------
    function chapterSpecs(ch) {
      var i = ch.index, prev = chapters[i - 1];
      var specs = [];
      specs.push({ kind: 'ticket', ch: ch, e: ch.t || null, title: (prev ? prev.name : 'Start') + ' to ' + (ch.epi ? 'Beyond' : ch.name), from: prev ? prev.name : 'Start', to: ch.epi ? 'Beyond' : ch.name, year: ch.epi ? 'Next' : String(Math.floor(ch.from)), when: ch.epi ? 'what comes next' : String(Math.floor(ch.from)), typeLabel: 'Move' });
      specs.push({ kind: 'chapterphoto', ch: ch, e: null, title: ch.epi ? 'Beyond the timeline' : ch.name, when: ch.epi ? 'undated' : Math.floor(ch.from) + (ch.to - ch.from > 1.5 ? ' to ' + (ch.to >= M.NOW - 0.01 ? 'now' : Math.floor(ch.to)) : ''), typeLabel: 'Photo' });
      var list = ch.stories.slice(), pick = list, rest = [];
      if (list.length > MAX_ON_DESK) {
        var N = MAX_ON_DESK - 1, byType = {};
        list.forEach(function (e) { (byType[e.type] = byType[e.type] || []).push(e); });
        var sc = function (e) { return (e.metrics || []).length * 2 + (WEIGHT[e.type] || 1) + Math.min(2, (e.summary || '').length / 160) + (e.placeholder ? -1 : 0); };
        Object.keys(byType).forEach(function (t) { byType[t].sort(function (a, b) { return sc(b) - sc(a); }); });
        var chosen = [], types = Object.keys(byType).sort(function (a, b) { return (WEIGHT[b] || 0) - (WEIGHT[a] || 0); });
        while (chosen.length < N) { var any = false; for (var k = 0; k < types.length && chosen.length < N; k++) { var e = byType[types[k]].shift(); if (e) { chosen.push(e); any = true; } } if (!any) break; }
        pick = chosen.sort(function (a, b) { return (a._w || 0) - (b._w || 0); });
        rest = list.filter(function (e) { return pick.indexOf(e) < 0; });
      }
      pick.forEach(function (e) { specs.push({ kind: KIND_OF[e.type] || 'note', ch: ch, e: e, title: e.title, when: M.when(e), typeLabel: M.typeName(e.type) }); });
      var real = specs.length;
      if (rest.length) specs.push({ kind: 'box', ch: ch, e: null, rest: rest, title: 'Box of ' + rest.length + ' more', typeLabel: 'Box' });
      if (real < 9) {      // sparse spread: fill the mat with real chapter facts, never invented ones
        var nonEpi = chapters.filter(function (c) { return !c.epi; }).length, cnt = {}, sk = {};
        ch.stories.forEach(function (e) { cnt[e.type] = (cnt[e.type] || 0) + 1; skillsOf(e).forEach(function (k) { sk[k] = (sk[k] || 0) + 1; }); });
        var skl = Object.keys(sk).sort(function (a, b) { return sk[b] - sk[a] || (a < b ? -1 : 1); });
        specs.unshift({ kind: 'titlecard', ch: ch, e: null, title: ch.epi ? 'Beyond the timeline' : ch.name, when: yrs(ch), typeLabel: 'Chapter', counts: Object.keys(cnt).map(function (t) { return [M.typeName(t), cnt[t]]; }) });
        if (!ch.epi) specs.push({ kind: 'yearstamp', ch: ch, e: null, title: 'Chapter ' + (ch.index + 1) + ' of ' + nonEpi, when: yrs(ch), typeLabel: 'Year stamp', n: ch.index + 1, of: nonEpi });
        if (skl.length) specs.push({ kind: 'skillnote', ch: ch, e: null, title: 'Skills in ' + ch.name, when: skl.length + ' skill' + (skl.length === 1 ? '' : 's') + ' from ' + ch.stories.length + ' keepsake' + (ch.stories.length === 1 ? '' : 's'), typeLabel: 'Skills', skills: skl });
      }
      return specs;
    }
    var chips = function (list, max) { if (!list.length) return ''; return '<span class="sb-chips">' + list.slice(0, max).map(function (k) { return '<i>' + esc(k) + '</i>'; }).join('') + (list.length > max ? '<i class="sb-chip-more">+' + (list.length - max) + '</i>' : '') + '</span>'; };
    var metsOf = function (e) { var m = (e && e.metrics || []).slice(); return m.filter(function (x) { return x.verified; }).concat(m.filter(function (x) { return !x.verified; })); };
    var entryOf = function (o) { var k = o.s.kind; return (k === 'ticket' || k === 'titlecard') ? o.s.ch.t : o.s.e; };
    var dot = function (e) { return e ? '<i class="sb-dot" style="--c:' + M.typeColor(e.type) + '" title="' + esc(M.typeName(e.type)) + '"></i>' : ''; };
    var badge = function (e) { return e && e.placeholder ? '<span class="sb-ph">Placeholder</span>' : ''; };
    function frontHTML(s) {
      var e = s.e, h = hash(s.title) % 360;
      switch (s.kind) {
        case 'photo': case 'chapterphoto':
          return '<span class="sb-pic" style="--h:' + (s.kind === 'chapterphoto' ? 28 + s.ch.index * 23 : 200 + h % 40) + '"><span class="sb-pic-l">' + CAM + '<b>Photo placeholder</b></span>' + badge(e) + chips(skillsOf(e), 3) + '</span>' +
            '<span class="sb-cap">' + esc(s.title) + '</span><span class="sb-date">' + esc(s.when) + '</span>';
        case 'card': {
          var ms = metsOf(e).slice(0, 2);
          return '<span class="sb-card-top"><span class="sb-org">' + esc((e && (e.org || s.typeLabel)) || s.typeLabel) + '</span>' + dot(e) + '</span><span class="sb-card-t' + (ms.length ? ' has-m' : '') + '">' + esc(s.title) + '</span>' +
            (ms.length ? '<span class="sb-mets">' + ms.map(function (m, i) { return '<span class="sb-met' + (i ? '' : ' is-first') + (m.verified ? '' : ' is-unv') + '"><b>' + esc(m.value) + '</b><em>' + esc(m.meaning) + '</em>' + (m.verified ? '' : '<u>unverified</u>') + '</span>'; }).join('') + '</span>' : '') +
            '<span class="sb-card-b"><span>' + esc(s.when) + '</span><span>' + esc(s.typeLabel) + '</span></span>' + badge(e);
        }
        case 'note':
          return '<span class="sb-note-k">' + dot(e) + esc(s.typeLabel) + '</span><span class="sb-note-t">' + esc(s.title) + '</span>' + chips(skillsOf(e), 3) + '<span class="sb-note-d">' + esc(s.when) + '</span>' + badge(e);
        case 'stamp':
          return '<span class="sb-st-in"><span class="sb-st-k">Award</span>' + STAR + '<span class="sb-st-t">' + esc(s.title) + '</span><span class="sb-st-y">' + esc(s.when) + '</span></span><span class="sb-pmark" aria-hidden="true"></span>' + badge(e);
        case 'ticket':
          return '<span class="sb-tk-main"><span class="sb-tk-top"><span>Boarding pass</span><span>Move</span></span><span class="sb-tk-route"><span class="sb-tk-c"><small>From</small><b>' + esc(s.from) + '</b></span><span class="sb-tk-ar" aria-hidden="true">&rarr;</span><span class="sb-tk-c"><small>To</small><b>' + esc(s.to) + '</b></span></span></span>' +
            '<span class="sb-tk-stub"><small>Year</small><b>' + esc(s.year) + '</b><span class="sb-bars" aria-hidden="true"></span></span>';
        case 'titlecard':
          return '<span class="sb-tc-k">' + (s.ch.epi ? 'Epilogue' : 'Chapter ' + (s.ch.index + 1)) + '</span><span class="sb-tc-t">' + esc(s.title) + '</span><span class="sb-tc-r">' + esc([s.ch.epi ? '' : s.ch.region, s.when].filter(Boolean).join(' \u00b7 ')) + '</span><span class="sb-tc-n">' + s.ch.stories.length + ' keepsake' + (s.ch.stories.length === 1 ? '' : 's') + '</span><span class="sb-tc-h" aria-hidden="true">turn me over</span>';
        case 'yearstamp':
          return '<span class="sb-ys"><span class="sb-st-k">Chapter</span><b>' + esc(Math.floor(s.ch.from)) + '</b><span class="sb-ys-s">' + esc(s.n + ' of ' + s.of) + '</span></span><span class="sb-pmark" aria-hidden="true"></span>';
        case 'skillnote':
          return '<span class="sb-note-k">Skills</span><span class="sb-sk-t">' + esc(s.title) + '</span><span class="sb-sk-l">' + s.skills.slice(0, 8).map(function (k) { return '<i>' + esc(k) + '</i>'; }).join('') + (s.skills.length > 8 ? '<i class="sb-chip-more">+' + (s.skills.length - 8) + ' more</i>' : '') + '</span><span class="sb-note-d">' + esc(s.when) + '</span>';
        case 'box':
          return '<span class="sb-box-lid"></span><span class="sb-box-band" aria-hidden="true"></span><span class="sb-box-label"><b>' + esc(s.title) + '</b><small>Open the box</small></span>';
      }
    }
    function backHTML(s) {
      if (s.kind === 'titlecard') {
        var tt = s.ch.t;
        return '<span class="sb-bk-k">Chapter</span><span class="sb-bk-t">' + esc(s.title) + '</span><span class="sb-bk-s">' + esc([s.ch.location, s.when].filter(Boolean).join(' \u00b7 ')) + '</span>' +
          '<span class="sb-bk-m">' + (s.counts.length ? s.counts.map(function (c) { return '<span><b>' + c[1] + '</b> ' + esc(c[0]) + '</span>'; }).join('') : '<span>No keepsakes yet</span>') + '</span>' +
          '<span class="sb-bk-act">' + (tt ? '<button type="button" class="sb-more">Full story</button>' : '') + '<button type="button" class="sb-unflip">Flip back</button></span>';
      }
      if (s.kind === 'yearstamp') return '<span class="sb-bk-k">Year stamp</span><span class="sb-bk-t">' + esc(s.when) + '</span><span class="sb-bk-s">' + esc(s.ch.name + (s.ch.region ? ' \u00b7 ' + s.ch.region : '')) + '</span><span class="sb-bk-p">' + esc(s.title) + ' on the timeline.</span><span class="sb-bk-act"><button type="button" class="sb-unflip">Flip back</button></span>';
      if (s.kind === 'skillnote') return '<span class="sb-bk-k">Skills</span><span class="sb-bk-t">' + esc(s.title) + '</span><span class="sb-bk-sk">' + s.skills.map(function (k) { return '<i>' + esc(k) + '</i>'; }).join('') + '</span><span class="sb-bk-act"><button type="button" class="sb-unflip">Flip back</button></span>';
      var e = s.e, t = s.kind === 'ticket' ? s.ch.t : e, sum = (t && t.summary) || '', mets = ((t && t.metrics) || []).slice(0, 2);
      var sub = e ? [e.org, e.location].filter(Boolean).join(' · ') : '';
      var body;
      if (e || s.kind === 'ticket') {
        body = '<span class="sb-bk-k">' + esc(s.typeLabel) + (e && e.placeholder ? '<span class="sb-ph">Placeholder</span>' : '') + '</span><span class="sb-bk-t">' + esc(e ? e.title : s.title) + '</span>' +
          '<span class="sb-bk-s">' + esc([sub, s.when].filter(Boolean).join(' · ')) + '</span>' + (sum ? '<span class="sb-bk-p">' + esc(sum) + '</span>' : '') +
          (mets.length ? '<span class="sb-bk-m">' + mets.map(function (m) { return '<span><b>' + esc(m.value) + '</b> ' + esc(m.meaning) + '</span>'; }).join('') + '</span>' : '');
      } else {
        body = '<span class="sb-bk-k">Photo placeholder</span><span class="sb-bk-t">' + esc(s.title) + '</span><span class="sb-bk-s">' + esc([s.ch.location, s.when].filter(Boolean).join(' · ')) + '</span>' +
          '<span class="sb-bk-p">' + (s.ch.epi ? 'Undated notes and ideas about what comes next.' : s.ch.stories.length + (s.ch.stories.length === 1 ? ' keepsake lives' : ' keepsakes live') + ' on this spread. A real photo of ' + esc(s.ch.name) + ' goes in this frame.') + '</span>';
      }
      return body + '<span class="sb-bk-act">' + (t ? '<button type="button" class="sb-more">Full story</button>' : '') + '<button type="button" class="sb-unflip">Flip back</button></span>';
    }

    var DECO = ['tape', 'washi-v', 'washi-b', 'washi-o', 'washi-s'];
    var DECO_KIND = { photo: 1, chapterphoto: 1, card: 1, note: 1, titlecard: 1, skillnote: 1 };
    function deckle(w, h, seed) {        // slightly irregular torn-paper edge as a clip-path polygon
      var r = rng(hash(seed)), st = 15, j = 1.4, pts = [], i, n, f = function (v) { return v.toFixed(1) + 'px'; };
      n = Math.max(2, Math.round(w / st)); for (i = 0; i < n; i++) pts.push([w * i / n, r() * j]);
      n = Math.max(2, Math.round(h / st)); for (i = 0; i < n; i++) pts.push([w - r() * j, h * i / n]);
      n = Math.max(2, Math.round(w / st)); for (i = n; i > 0; i--) pts.push([w * i / n, h - r() * j]);
      n = Math.max(2, Math.round(h / st)); for (i = n; i > 0; i--) pts.push([r() * j, h * i / n]);
      return 'polygon(' + pts.map(function (p) { return f(p[0]) + ' ' + f(p[1]); }).join(',') + ')';
    }
    function makeItem(s, idx) {
      var sz = SIZE[s.kind === 'chapterphoto' ? 'photo' : s.kind];
      var el = document.createElement('div');
      el.className = 'sb-item sb-k-' + s.kind;
      if (s.e) el.dataset.id = s.e.id;
      el.style.width = sz[0] + 'px'; el.style.height = sz[1] + 'px'; el.style.margin = -sz[1] / 2 + 'px 0 0 ' + -sz[0] / 2 + 'px';
      var hasBack = s.kind !== 'box';
      var aria = s.title + (s.when && s.kind !== 'box' ? ', ' + s.when : '') + ', ' + s.typeLabel;
      var hh = hash(s.title + s.kind);
      var deco = DECO_KIND[s.kind] ? '<span class="sb-deco sb-deco-' + DECO[hh % DECO.length] + '" style="--dr:' + ((hh >> 3) % 15 - 7) + 'deg;--dx:' + ((hh >> 7) % 50 - 25) + 'px" aria-hidden="true"></span>' : '';
      el.innerHTML = '<span class="sb-shadow"></span><span class="sb-flip"><button type="button" class="sb-face sb-front" aria-label="' + esc(aria) + '" aria-describedby="sb-desc"' + (hasBack ? ' aria-pressed="false"' : '') + '>' + frontHTML(s) + '</button>' +
        (hasBack ? '<div class="sb-face sb-back" inert>' + backHTML(s) + '</div>' : '') + deco + '</span>' +
        '<button type="button" class="sb-pin" aria-pressed="false" aria-label="Pin to the desk: ' + esc(s.title) + '" title="Pin (P)">' + PINSVG + '</button>';
      layer.appendChild(el);
      var o = { s: s, el: el, flipEl: el.firstChild.nextSibling, front: el.querySelector('.sb-front'), back: el.querySelector('.sb-back'), pinBtn: el.querySelector('.sb-pin'), aria: aria, w: sz[0], h: sz[1], bw: BACK[0], bh: BACK[1],
        x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, l: 0, vl: 0, f: 0, vf: 0, t: 0, vt: 0, tx: 0, ty: 0, hx: 0, hy: 0, hr: 0, px: 0, py: 0, qx: 0, qy: 0, hv: false, pinned: false, mode: 'rest', flipped: false, held: false, drag: false, delay: 0, z: idx + 1, hasBack: hasBack };
      if (DECKLE[s.kind]) { o.front.style.clipPath = deckle(sz[0], sz[1], s.title + 'f'); if (o.back) o.back.style.clipPath = deckle(BACK[0], BACK[1], s.title + 'b'); }
      el.style.zIndex = o.z; el._o = o;
      return o;
    }

    // ---- Layout (home positions) ---------------------------------------------------------
    function measure() { deskW = desk.clientWidth; deskH = desk.clientHeight; }
    function layout(list, seed) {
      measure();
      var r = rng(hash(seed)), n = list.length, W = deskW, stack = W < 640;
      cols = stack ? 1 : W < 960 ? 3 : 4;
      desk.dataset.mode = stack ? 'stack' : 'wide';
      if (stack) {
        var y = 74, i = 0;
        list.forEach(function (o) {
          var hw = o.w / 2, room = Math.max(0, W / 2 - hw - 10), side = (i++ % 2 ? 1 : -1);
          o.hx = W / 2 + side * Math.min(room, 26) * (0.5 + r() * 0.5); o.hy = y + o.h / 2; o.hr = (r() - 0.5) * 9; y += o.h * 0.8 + 16;
        });
        desk.style.height = Math.max(520, y + 70) + 'px'; measure();
      } else {
        desk.style.height = '';
        measure();
        var top = 64, rows = Math.ceil(n / cols), cw = W / cols, chh = (deskH - top - 8) / rows;
        list.forEach(function (o, k) {
          var c = k % cols, rr = Math.floor(k / cols);
          // The last row of a ragged grid is centred; ticket and box get their own corners.
          var inRow = rr === rows - 1 ? n - rr * cols : cols, off = rr === rows - 1 ? (cols - inRow) * cw / 2 : 0;
          var jx = (r() - 0.5) * Math.min(48, cw - o.w - 4 > 0 ? cw - o.w : 24), jy = (r() - 0.5) * Math.min(40, Math.max(14, chh - o.h));
          o.hx = clamp(off + cw * (c + 0.5) + jx, o.w / 2 + 20, W - o.w / 2 - 20);
          o.hy = clamp(top + chh * (rr + 0.5) + jy, o.h / 2 + 16, deskH - o.h / 2 - 16);
          o.hr = (r() - 0.5) * 11;
        });
      }
    }
    function place() {        // home positions for the current seed; a shuffle permutes the order the grid is filled in
      var list = items.slice();
      if (shuf > 0) { var rr = rng(hash(seedStr) ^ 99); for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(rr() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t; } }
      layout(list, seedStr);
    }
    // Half-size of the rotated box, including the lift scale and the flip pop, so a card never pokes out of the blotter.
    function extent(o) {
      var w = o.flipped ? o.bw : o.w, h = o.flipped ? o.bh : o.h, a = (o.r + o.t) * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
      return [(w * c + h * s) / 2 * 1.08 + 4, (w * s + h * c) / 2 * 1.08 + 4];
    }

    // ---- Physics -------------------------------------------------------------------------
    function render(o) {
      var tilt = (o.px || o.py) ? ' perspective(900px) rotateX(' + (-o.py * 7).toFixed(2) + 'deg) rotateY(' + (o.px * 9).toFixed(2) + 'deg)' : '';
      o.el.style.transform = 'translate3d(' + o.x.toFixed(2) + 'px,' + o.y.toFixed(2) + 'px,0) rotate(' + (o.r + o.t).toFixed(2) + 'deg) scale(' + (1 + 0.075 * o.l).toFixed(4) + ')' + tilt;
      o.el.style.setProperty('--l', clamp(o.l, -0.2, 1.4).toFixed(3));
      if (tilt) { o.el.style.setProperty('--px', o.px.toFixed(3)); o.el.style.setProperty('--py', o.py.toFixed(3)); }
      if (o.hasBack) {
        var pop = Math.sin(clamp(o.f, 0, 180) * Math.PI / 180);
        o.flipEl.style.transform = 'perspective(1100px) rotateY(' + o.f.toFixed(2) + 'deg) scale(' + (1 + 0.12 * pop).toFixed(4) + ')';
      }
    }
    var CUSHION = 18, BOUNCE = 0.4;
    function step(dt) {
      var awake = false, kt = 1 - Math.exp(-dt * 14);
      items.forEach(function (o) {
        if (o.delay > 0) { o.delay -= dt; awake = true; if (o.delay <= 0) { o.el.classList.remove('sb-wait'); } else return; }
        var tl = (o.drag || o.held) ? 1 : (o.hv && !o.pinned && !reduced && !drag) ? 0.4 : 0;
        o.vl += ((tl - o.l) * 340 - o.vl * 25) * dt; o.l += o.vl * dt;
        var tf = o.flipped ? 180 : 0;
        o.vf += ((tf - o.f) * 150 - o.vf * 15.5) * dt; o.f += o.vf * dt;
        var tt = clamp(o.vx * 0.011, -15, 15);
        o.vt += ((tt - o.t) * 230 - o.vt * 19) * dt; o.t += o.vt * dt;
        o.px += (o.qx - o.px) * kt; o.py += (o.qy - o.py) * kt;
        var m = o.mode, ex, pen;
        if (m === 'drag' || m === 'follow') {
          var k = 1 - Math.exp(-dt * 26), px = o.x, py = o.y;
          o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k;
          o.vx = o.vx * 0.55 + 0.45 * (o.x - px) / dt; o.vy = o.vy * 0.55 + 0.45 * (o.y - py) / dt;
          if (m === 'follow' && Math.abs(o.tx - o.x) < 0.3 && Math.abs(o.ty - o.y) < 0.3) { o.x = o.tx; o.y = o.ty; o.vx = o.vy = 0; o.mode = 'rest'; }
        } else if (m === 'free') {
          var fr = Math.exp(-dt * 2.5);
          o.x += o.vx * dt; o.y += o.vy * dt; o.r += o.vr * dt; o.vx *= fr; o.vy *= fr; o.vr *= Math.exp(-dt * 2.1);
          ex = extent(o);
          // A soft cushion near each edge, then a damped bounce, so a throw never clips or slams.
          if ((pen = ex[0] + CUSHION - o.x) > 0 && o.vx < 0) o.vx += pen * 90 * dt; else if ((pen = o.x - (deskW - ex[0] - CUSHION)) > 0 && o.vx > 0) o.vx -= pen * 90 * dt;
          if ((pen = ex[1] + CUSHION - o.y) > 0 && o.vy < 0) o.vy += pen * 90 * dt; else if ((pen = o.y - (deskH - ex[1] - CUSHION)) > 0 && o.vy > 0) o.vy -= pen * 90 * dt;
          if (o.x < ex[0]) { o.x = ex[0]; o.vx = Math.abs(o.vx) * BOUNCE; o.vr *= -0.5; } else if (o.x > deskW - ex[0]) { o.x = deskW - ex[0]; o.vx = -Math.abs(o.vx) * BOUNCE; o.vr *= -0.5; }
          if (o.y < ex[1]) { o.y = ex[1]; o.vy = Math.abs(o.vy) * BOUNCE; o.vr *= -0.5; } else if (o.y > deskH - ex[1]) { o.y = deskH - ex[1]; o.vy = -Math.abs(o.vy) * BOUNCE; o.vr *= -0.5; }
          if (Math.hypot(o.vx, o.vy) < 9 && Math.abs(o.vr) < 2) { o.vx = o.vy = o.vr = 0; o.mode = 'rest'; }
        } else if (m === 'spring') {
          var ax = (o.hx - o.x) * 150 - o.vx * 17, ay = (o.hy - o.y) * 150 - o.vy * 17, ar = (o.hr - o.r) * 150 - o.vr * 17;
          o.vx += ax * dt; o.vy += ay * dt; o.vr += ar * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.r += o.vr * dt;
          if (Math.abs(o.hx - o.x) < 0.25 && Math.abs(o.hy - o.y) < 0.25 && Math.abs(o.hr - o.r) < 0.1 && Math.hypot(o.vx, o.vy) < 4 && Math.abs(o.vr) < 1) {
            o.x = o.hx; o.y = o.hy; o.r = o.hr; o.vx = o.vy = o.vr = 0; o.mode = 'rest';
          }
        }
        render(o);
        if (o.mode !== 'rest' || Math.abs(tl - o.l) > 0.002 || Math.abs(o.vl) > 0.02 || Math.abs(tf - o.f) > 0.05 || Math.abs(o.vf) > 0.5 || Math.abs(o.t) > 0.02 || Math.abs(o.vt) > 0.05 || Math.abs(o.qx - o.px) > 0.002 || Math.abs(o.qy - o.py) > 0.002) awake = true;
        else { o.l = tl; o.vl = 0; o.f = tf; o.vf = 0; o.t = 0; o.vt = 0; o.px = o.qx; o.py = o.qy; render(o); }
      });
      return awake;
    }
    function frame(ts) {
      raf = 0;
      if (!visible) { last = 0; return; }
      var dt = last ? Math.min((ts - last) / 1000, 1 / 30) : 1 / 60; last = ts;
      if (step(dt)) raf = requestAnimationFrame(frame); else last = 0;     // sleeps when nothing moves
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }
    LT.whenVisible(desk, function (v) { visible = v; if (v) kick(); });

    function settleInstant(o) { o.mode = 'rest'; o.x = o.hx; o.y = o.hy; o.r = o.hr; o.vx = o.vy = o.vr = 0; o.delay = 0; o.el.classList.remove('sb-wait'); o.held = false; o.drag = false; o.flipped = false; syncFace(o); o.f = 0; o.l = 0; o.t = 0; o.px = o.py = 0; render(o); }
    LT.onReducedChange(function (r) { reduced = r; if (r) { items.forEach(function (o) { o.mode = 'rest'; o.vx = o.vy = o.vr = 0; o.f = o.flipped ? 180 : 0; o.l = (o.held || o.drag) ? 1 : 0; o.t = 0; o.px = o.py = o.qx = o.qy = 0; render(o); }); } });

    // ---- Actions -------------------------------------------------------------------------
    function syncFace(o) {
      if (!o.hasBack) return;
      o.front.toggleAttribute('inert', o.flipped); o.back.toggleAttribute('inert', !o.flipped);
      o.front.setAttribute('aria-pressed', 'false'); o.el.classList.toggle('is-flipped', o.flipped);
    }
    function raise(o) { o.z = ++zTop; o.el.style.zIndex = o.z; }
    function flip(o, toFront, focus) {
      if (!o.hasBack) return;
      o.flipped = toFront === true ? false : !o.flipped; o.held = false; syncFace(o); raise(o);
      var ex = extent(o), nx = clamp(o.x, ex[0], deskW - ex[0]), ny = clamp(o.y, ex[1], deskH - ex[1]);
      if (reduced) { o.f = o.flipped ? 180 : 0; o.x = nx; o.y = ny; o.vf = 0; render(o); }
      else if (nx !== o.x || ny !== o.y) { o.tx = nx; o.ty = ny; o.mode = 'follow'; }
      if (focus) (o.flipped ? (o.back.querySelector('.sb-more') || o.back.querySelector('.sb-unflip')) : o.front).focus({ preventScroll: true });
      say(o.flipped ? 'Flipped over: ' + o.s.title : 'Flipped back');
      kick();
    }
    function springAll(instant) {
      items.forEach(function (o) {
        if (o.pinned) return;
        if (o.flipped) { o.flipped = false; syncFace(o); }
        o.held = false; o.drag = false;
        if (reduced || instant) settleInstant(o); else { o.mode = 'spring'; o.delay = 0; }
      });
      kick();
    }
    function tidy(silent) {
      closeTray(true);
      exitPile(true);
      place();
      items.forEach(function (o, i) {
        if (o.pinned) return;
        o.held = false; o.drag = false; o.flipped = false; syncFace(o); raise(o); o.el.style.zIndex = o.z = i + 1;
      });
      zTop = items.length + 10;
      springAll();
      if (!silent) say('Desk tidied');
    }
    function shuffle() {
      if (!opened || !items.length) return;
      closeTray(true); exitPile(true);
      shuf++; seedStr = chapters[cur].id + '#' + shuf;
      place();
      var rr = rng(hash(seedStr) ^ 5), zs = items.map(function (o, i) { return i + 1; });
      for (var i = zs.length - 1; i > 0; i--) { var j = Math.floor(rr() * (i + 1)), t = zs[i]; zs[i] = zs[j]; zs[j] = t; }
      items.forEach(function (o, i) {
        if (o.pinned) return;
        o.z = zs[i]; o.el.style.zIndex = o.z; o.held = false; o.drag = false;
        if (o.flipped) { o.flipped = false; syncFace(o); }
        if (reduced) settleInstant(o); else { o.mode = 'spring'; o.delay = i * 0.03; }
      });
      zTop = items.length + 10;
      say('Desk shuffled');
      kick();
    }

    // ---- Piles: stack like with like, click a pile to fan it out --------------------------
    var PORDER = ['photos', 'cards', 'notes', 'awards', 'box'];
    function syncPileBtn() { pileBtn.textContent = pileOn ? 'Spread out' : 'Pile up'; pileBtn.setAttribute('aria-pressed', pileOn ? 'true' : 'false'); }
    function clearPileAttrs() {
      items.forEach(function (o) {
        o.el.removeAttribute('data-pile'); o.front.removeAttribute('tabindex'); o.pinBtn.removeAttribute('tabindex');
        o.front.setAttribute('aria-label', o.aria); o.el.classList.remove('is-hov');
      });
    }
    function exitPile(silent) {
      if (!pileOn && fan < 0) return;
      pileOn = false; fan = -1; delete desk.dataset.fan; piles = []; clearPileAttrs(); syncPileBtn();
    }
    function pileLayout() {
      measure();
      var W = deskW, stack = W < 640, groups = {};
      desk.dataset.mode = stack ? 'stack' : 'wide'; cols = stack ? 1 : W < 960 ? 3 : 4;
      items.forEach(function (o) { if (o.pinned) return; var g = GROUP[o.s.kind]; (groups[g] = groups[g] || []).push(o); });
      piles = PORDER.filter(function (g) { return groups[g]; }).map(function (g) { return { key: g, items: groups[g] }; });
      if (fan >= piles.length) fan = -1;
      clearPileAttrs();
      var n = piles.length, mx = function (p, f) { return Math.max.apply(null, p.items.map(function (o) { return o[f]; })); };
      if (stack) {
        var y = 78;
        piles.forEach(function (p, gi) {
          var m = p.items.length, mh = mx(p, 'h'), open = fan === gi;
          p.items.forEach(function (o, k) {
            var rr = rng(hash(o.s.title + 'p'));
            if (open) { o.hx = W / 2 + (k % 2 ? 1 : -1) * 12; o.hy = y + o.h / 2 + k * 58; o.hr = (rr() - 0.5) * 6; }
            else { o.hx = W / 2 + (rr() - 0.5) * 14; o.hy = y + mh / 2 + (rr() - 0.5) * 5; o.hr = (rr() - 0.5) * 12; }
            o.z = gi * 20 + k + 1; o.el.style.zIndex = o.z;
          });
          y += (open ? (m - 1) * 58 + mh : mh) + 26;
        });
        desk.style.height = Math.max(520, y + 44) + 'px'; measure();
      } else {
        desk.style.height = ''; measure();
        var H = deskH, others = piles.filter(function (p, gi) { return gi !== fan; });
        piles.forEach(function (p, gi) {
          var m = p.items.length, mh = mx(p, 'h'), mw = mx(p, 'w'), open = fan === gi, oi = others.indexOf(p);
          p.items.forEach(function (o, k) {
            var rr = rng(hash(o.s.title + 'p')), cx, cy;
            if (open) {
              var rows = m > 8 ? 2 : 1, per = Math.ceil(m / rows), row = Math.floor(k / per), c = k - row * per, cn = row === rows - 1 ? m - row * per : per;
              var step = cn > 1 ? Math.min(mw * 0.9, (W - mw - 40) / (cn - 1)) : 0, t = cn > 1 ? c / (cn - 1) : 0.5;
              cx = W / 2 + (c - (cn - 1) / 2) * step; cy = (rows === 1 ? H * 0.4 : H * (0.3 + row * 0.27)) - 14 * (1 - Math.pow(2 * t - 1, 2)); o.hr = (t - 0.5) * 14;
            } else if (fan < 0) { cx = W * (gi + 0.5) / n + (rr() - 0.5) * 8; cy = H * 0.52 + (rr() - 0.5) * 8; o.hr = (rr() - 0.5) * 12; }
            else { cx = W * (oi + 0.5) / others.length + (rr() - 0.5) * 8; cy = H - mh / 2 - 22 + (rr() - 0.5) * 6; o.hr = (rr() - 0.5) * 12; }
            o.hx = clamp(cx, o.w / 2 + 12, W - o.w / 2 - 12); o.hy = clamp(cy, o.h / 2 + 12, H - o.h / 2 - 12);
            o.z = gi * 20 + k + 1; o.el.style.zIndex = o.z;
          });
        });
      }
      zTop = 130;
      piles.forEach(function (p, gi) {
        var m = p.items.length; if (m < 2 || fan === gi) return;
        p.items.forEach(function (o, k) {
          if (k === m - 1) { o.el.dataset.pile = m; o.front.setAttribute('aria-label', o.aria + ', top of a pile of ' + m + '. Press Enter to fan it out'); }
          else { o.front.tabIndex = -1; o.pinBtn.tabIndex = -1; }
        });
      });
    }
    function setPile(on) {
      if (!opened) return;
      closeTray(true);
      if (on === pileOn) return;
      if (on) { pileOn = true; fan = -1; delete desk.dataset.fan; syncPileBtn(); pileLayout(); say('Stacked into piles. Click a pile to fan it out.'); }
      else {
        exitPile(true); place();
        items.forEach(function (o, i) { if (!o.pinned) { o.z = i + 1; o.el.style.zIndex = o.z; } }); zTop = items.length + 10;
        say('Spread back out');
      }
      springAll();
    }
    function setFan(gi) {
      if (!pileOn || gi === fan) return;
      fan = gi;
      if (gi < 0) delete desk.dataset.fan; else desk.dataset.fan = piles[gi].key;
      pileLayout(); springAll();
      say(gi < 0 ? 'Pile closed' : 'Pile fanned out: ' + piles[gi].items.length + ' ' + GL[piles[gi].key]);
    }
    function pileTap(o) {
      if (!pileOn || o.pinned) return false;
      var gi = -1; piles.forEach(function (p, i) { if (p.items.indexOf(o) >= 0) gi = i; });
      if (gi < 0 || gi === fan || piles[gi].items.length < 2) return false;
      setFan(gi); return true;
    }
    function setPin(o, on) {
      if (o.pinned === on) return;
      o.pinned = on; o.el.classList.toggle('is-pinned', on); o.pinBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) { o.held = false; o.mode = 'rest'; o.vx = o.vy = o.vr = 0; o.hv = false; o.qx = o.qy = 0; raise(o); }
      say(on ? 'Pinned: ' + o.s.title : 'Unpinned: ' + o.s.title);
      if (pileOn) { fan = -1; delete desk.dataset.fan; pileLayout(); springAll(); }
      kick();
    }
    function openTray(o) {
      var s = o.s, rest = s.rest;
      tray.innerHTML = '<div class="sb-tray-h"><b>' + esc(s.title) + ' <small>in ' + esc(s.ch.name) + '</small></b><button type="button" class="sb-btn sb-tray-x">Close the box</button></div><div class="sb-tray-g">' +
        rest.map(function (e) { return '<button type="button" class="sb-mini" data-id="' + esc(e.id) + '"><span class="sb-mini-k">' + dot(e) + esc(M.typeName(e.type)) + '</span><span class="sb-mini-t">' + esc(e.title) + '</span><span class="sb-mini-d">' + esc(M.when(e)) + (e.placeholder ? '<span class="sb-ph">Placeholder</span>' : '') + '</span></button>'; }).join('') + '</div>';
      tray.style.transformOrigin = (o.x) + 'px ' + (o.y) + 'px';
      tray.hidden = false; trayFor = o; layer.setAttribute('inert', '');
      requestAnimationFrame(function () { tray.classList.add('is-open'); });
      tray.querySelector('.sb-mini').focus({ preventScroll: true });
      say(rest.length + ' more keepsakes laid out');
    }
    function closeTray(quick) {
      if (tray.hidden) return;
      var back = trayFor; trayFor = null; tray.classList.remove('is-open'); layer.removeAttribute('inert');
      setTimeout(function () { if (!trayFor) tray.hidden = true; }, quick || reduced ? 0 : 220);
      if (back && !quick) back.front.focus({ preventScroll: true });
    }

    // ---- Chapters ------------------------------------------------------------------------
    function clearItems() { var old = items; items = []; hovO = null; old.forEach(function (o) { o.el.classList.add('sb-out'); o.el.setAttribute('inert', ''); }); setTimeout(function () { old.forEach(function (o) { o.el.remove(); }); }, reduced ? 0 : 260); }
    function turnPage(ch, dir) {
      if (turnAnim) turnAnim.cancel();
      turnEl.querySelector('b').textContent = ch.epi ? 'Beyond' : ch.name;
      turnEl.querySelector('span').textContent = yrs(ch);
      turnEl.querySelector('i').textContent = ch.stories.length + ' keepsake' + (ch.stories.length === 1 ? '' : 's');
      turnEl.style.transformOrigin = dir > 0 ? 'left center' : 'right center';
      turnEl.hidden = false;
      var deg = dir > 0 ? -160 : 160;
      var a = turnAnim = turnEl.animate([
        { opacity: 0, transform: 'perspective(1500px) rotateY(0deg)' },
        { opacity: 1, offset: 0.2 },
        { opacity: 1, transform: 'perspective(1500px) rotateY(' + deg + 'deg)' }
      ], { duration: 720, easing: 'ease-in-out' });
      a.onfinish = a.oncancel = function () { if (turnAnim === a) { turnEl.hidden = true; turnAnim = null; } };
    }
    function show(idx, fromCover, dir) {
      idx = clamp(idx, 0, chapters.length - 1);
      var ch = chapters[idx], tabs = tabsEl.querySelectorAll('.sb-tab'), prev = cur;
      tabs.forEach(function (t, i) { t.setAttribute('aria-selected', i === idx); t.tabIndex = i === idx ? 0 : -1; t.classList.toggle('is-on', i === idx); });
      desk.setAttribute('aria-labelledby', 'sb-tab-' + idx);
      var act = tabs[idx]; if (act && act.scrollIntoView && tabsEl.scrollWidth > tabsEl.clientWidth) tabsEl.scrollTo({ left: act.offsetLeft - 24, behavior: reduced ? 'auto' : 'smooth' });
      closeTray(true); clearItems(); cur = idx;
      pileOn = false; fan = -1; delete desk.dataset.fan; piles = []; syncPileBtn(); seedStr = ch.id; shuf = 0;
      var turning = opened && cover.hidden && !fromCover && prev >= 0 && prev !== idx && !reduced;
      if (turning) turnPage(ch, dir || (idx > prev ? 1 : -1));
      label.innerHTML = '<b>' + esc(ch.epi ? 'Beyond the timeline' : ch.name) + '</b><span>' + esc(ch.epi ? 'Undated · vision' : [ch.region, Math.floor(ch.from) + ' to ' + (ch.to >= M.NOW - 0.01 ? 'now' : Math.floor(ch.to))].filter(Boolean).join(' · ')) + '</span><i>' + ch.stories.length + ' keepsake' + (ch.stories.length === 1 ? '' : 's') + '</i>';
      var specs = chapterSpecs(ch);
      items = specs.map(function (s, i) { return makeItem(s, i); });
      place();
      measure();
      var tb = act && act.getBoundingClientRect(), db = desk.getBoundingClientRect();
      var ox = fromCover ? deskW / 2 : (tb ? tb.left + tb.width / 2 - db.left : deskW / 2), oy = fromCover ? deskH * 0.45 : -70, r = rng(hash(ch.id) ^ 7);
      items.forEach(function (o, i) {
        if (reduced || !opened && !fromCover) { settleInstant(o); return; }
        o.x = clamp(ox + (r() - 0.5) * 60, 40, deskW - 40); o.y = oy; o.r = (r() - 0.5) * 90; o.mode = 'spring'; o.delay = 0.05 + i * 0.05 + (turning ? 0.3 : 0); o.el.classList.add('sb-wait'); render(o);
      });
      say(ch.name + ', ' + ch.stories.length + ' keepsakes');
      kick();
    }
    function go(d) { if (!opened) openCover(); show((cur + d + chapters.length) % chapters.length, false, d); }

    function openCover() {
      if (opened) return; opened = true;
      cover.classList.add('is-open'); layer.removeAttribute('inert');
      var done = function () { cover.hidden = true; };
      if (reduced) { done(); show(cur < 0 ? 0 : cur, false); return; }
      setTimeout(function () { show(cur < 0 ? 0 : cur, true); }, T_SHOW);
      setTimeout(done, T_HIDE);
    }

    // ---- Pointer: pick up, throw, flip ----------------------------------------------------
    function deskPoint(ev) { var b = desk.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; }
    desk.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'touch') {                     // a possible chapter swipe; any grab cancels it
        if (ev.isPrimary) { var q = deskPoint(ev); sw = { id: ev.pointerId, x: q[0], y: q[1], t: ev.timeStamp, cancel: false }; }
        else if (sw) sw.cancel = true;
      }
      var el = ev.target.closest('.sb-item'); if (!el || drag || ev.button > 0) return;
      if (ev.target.closest('.sb-more,.sb-unflip,.sb-pin')) return;
      var o = el._o, p = deskPoint(ev), touch = ev.pointerType === 'touch';
      measure();
      drag = { o: o, id: ev.pointerId, sx: p[0], sy: p[1], ox: o.x, oy: o.y, samples: [{ t: ev.timeStamp, x: p[0], y: p[1] }], moved: false, touch: touch, grabbed: false, t0: ev.timeStamp, pinned: o.pinned, far: false };
      var d = drag;
      if (o.pinned) return;                                 // pinned: never grabbed, but taps and double-taps still flip it
      if (touch) d.timer = setTimeout(function () { grab(d); }, 170); else grab(d, ev);
    });
    function grab(d, ev) {
      if (drag !== d) return;
      if (sw) sw.cancel = true;
      d.grabbed = true; var o = d.o; o.drag = true; o.mode = 'drag'; o.tx = o.x; o.ty = o.y; o.vx = o.vy = 0; o.hv = false; o.qx = o.qy = 0; raise(o); o.el.classList.add('is-drag');
      try { o.el.setPointerCapture(d.id); } catch (e) { /* pointer already gone */ }
      d.hold = setTimeout(function () { if (drag === d && !d.moved) { d.consumed = true; flip(o); } }, 650);
      kick();
    }
    desk.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var d = drag, p = deskPoint(ev), dist = Math.hypot(p[0] - d.sx, p[1] - d.sy);
      if (!d.grabbed) { if (dist > 6) d.far = true; if (d.touch && dist > 9) { clearTimeout(d.timer); drag = null; } return; }      // finger moved first: let the page scroll
      if (dist > 6) d.moved = true;
      if (!d.moved) return;
      clearTimeout(d.hold);
      var o = d.o, ex = extent(o);
      o.tx = clamp(d.ox + p[0] - d.sx, ex[0], deskW - ex[0]); o.ty = clamp(d.oy + p[1] - d.sy, ex[1], deskH - ex[1]);
      if (reduced) { o.x = o.tx; o.y = o.ty; o.mode = 'rest'; render(o); }
      d.samples.push({ t: ev.timeStamp, x: p[0], y: p[1] }); if (d.samples.length > 8) d.samples.shift();
      kick();
    });
    // Hover: lift with shadow, and a tilt that follows the pointer (mouse only).
    function hoverOff() { if (hovO) { hovO.hv = false; hovO.qx = hovO.qy = 0; hovO.el.classList.remove('is-hov'); hovO = null; kick(); } }
    desk.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse' || reduced || (drag && drag.grabbed)) { if (hovO && (reduced || (drag && drag.grabbed))) hoverOff(); return; }
      var el = ev.target.closest && ev.target.closest('.sb-item'), o = el && el._o;
      if (hovO && hovO !== o) hoverOff();
      if (!o || o.drag) return;
      var p = deskPoint(ev); hovO = o; o.hv = true; o.el.classList.add('is-hov');
      o.qx = o.pinned ? 0 : clamp((p[0] - o.x) / (o.w / 2), -1, 1); o.qy = o.pinned ? 0 : clamp((p[1] - o.y) / (o.h / 2), -1, 1);
      kick();
    });
    desk.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') hoverOff(); });
    function endDrag(ev, cancel) {
      if (!drag || (ev && ev.pointerId !== drag.id)) return;
      var d = drag, o = d.o; drag = null; clearTimeout(d.timer); clearTimeout(d.hold);
      if (!d.grabbed) {                                      // a quick tap on touch (or any tap on a pinned card): never reached a grab
        var quick = d.pinned ? (!d.far && ev && ev.timeStamp - d.t0 < 500) : (ev && ev.timeStamp - d.t0 < 170);
        if (!cancel && ev && quick) tapOn(o, ev.timeStamp);
        return;
      }
      o.drag = false; o.el.classList.remove('is-drag');
      try { o.el.releasePointerCapture(d.id); } catch (e) { /* ignore */ }
      if (d.consumed || cancel) { o.mode = 'rest'; kick(); return; }
      if (!d.moved) { o.mode = 'rest'; kick(); tapOn(o, ev.timeStamp); return; }
      var s = d.samples, a = s[0], b = s[s.length - 1], vx = 0, vy = 0;
      var cutoff = b.t - 100; for (var i = 0; i < s.length; i++) if (s[i].t >= cutoff) { a = s[i]; break; }
      if (b.t - a.t > 8 && ev.timeStamp - b.t < 70) { vx = (b.x - a.x) / ((b.t - a.t) / 1000); vy = (b.y - a.y) / ((b.t - a.t) / 1000); }
      var sp = Math.hypot(vx, vy);
      if (sp > 2600) { vx *= 2600 / sp; vy *= 2600 / sp; sp = 2600; }
      if (reduced || sp < 140) { o.mode = 'rest'; o.vx = o.vy = 0; }
      else { o.mode = 'free'; o.vx = vx; o.vy = vy; o.vr = clamp(vx * 0.028, -110, 110) + (vx >= 0 ? 1 : -1) * 6; }
      kick();
    }
    function tapOn(o, ts) {
      if (pileTap(o)) { lastTap = null; return; }
      if (o.s.kind === 'box') { openTray(o); return; }
      if (lastTap && lastTap.o === o && ts - lastTap.t < 340) { lastTap = null; flip(o); return; }
      lastTap = { o: o, t: ts };
    }
    desk.addEventListener('pointerup', function (ev) {
      endDrag(ev, false);
      var s = sw;                                            // swipe left or right on a phone to change chapter
      if (s && ev.pointerId === s.id) {
        sw = null; var q = deskPoint(ev), dx = q[0] - s.x, dy = q[1] - s.y;
        if (!s.cancel && opened && tray.hidden && listWrap.hidden && !LT.isDetailOpen() && Math.abs(dx) > 60 && Math.abs(dx) > 1.6 * Math.abs(dy) && ev.timeStamp - s.t < 700) go(dx < 0 ? 1 : -1);
      }
    });
    desk.addEventListener('pointercancel', function (ev) { if (sw && ev.pointerId === sw.id) sw = null; endDrag(ev, true); });
    // While a keepsake is grabbed on touch, stop the page from scrolling under the finger.
    desk.addEventListener('touchmove', function (ev) { if (drag && drag.grabbed && ev.cancelable) ev.preventDefault(); }, { passive: false });
    desk.addEventListener('contextmenu', function (ev) { if (ev.target.closest('.sb-item') && drag) ev.preventDefault(); });

    // ---- Click (assistive tech, buttons in the back, tray) ---------------------------------
    desk.addEventListener('click', function (ev) {
      var t = ev.target, itemEl = t.closest('.sb-item'), o = itemEl && itemEl._o;
      if (t.closest('.sb-seal')) { openCover(); return; }
      if (t.closest('.sb-tray-x')) { closeTray(); return; }
      var mini = t.closest('.sb-mini'); if (mini) { LT.openDetail(mini.dataset.id); return; }
      if (!o) { if (fan >= 0 && (t === desk || t === layer || t.classList.contains('sb-prop'))) setFan(-1); return; }
      if (t.closest('.sb-pin')) { setPin(o, !o.pinned); return; }
      if (t.closest('.sb-more')) { var e = entryOf(o); if (e) LT.openDetail(e.id); return; }
      if (t.closest('.sb-unflip')) { flip(o, true, true); return; }
      if (t.closest('.sb-front') && ev.detail === 0) { if (pileTap(o)) return; if (o.s.kind === 'box') openTray(o); else flip(o, false, true); }
    });

    // ---- Keyboard --------------------------------------------------------------------------
    desk.addEventListener('keydown', function (ev) {
      if (ev.target.closest('.sb-tray')) { if (ev.key === 'Escape') { ev.stopPropagation(); closeTray(); } return; }
      var itemEl = ev.target.closest('.sb-item');
      if (ev.key === 'Escape' && fan >= 0 && !ev.target.closest('.sb-back') && !(itemEl && itemEl._o.held)) {
        ev.preventDefault(); ev.stopPropagation(); var fo = piles[fan] && piles[fan].items[0]; setFan(-1); if (fo) fo.front.focus({ preventScroll: true }); return;
      }
      if (!itemEl) return;
      var o = itemEl._o, k = ev.key;
      if (ev.target.closest('.sb-pin')) return;             // the pin button handles Enter and Space itself
      if (ev.target.closest('.sb-back')) { if (k === 'Escape') { ev.preventDefault(); flip(o, true, true); } return; }
      if (o.pinned && (k === ' ' || /^Arrow/.test(k))) { ev.preventDefault(); ev.stopPropagation(); say('Pinned in place. Press P to unpin.'); return; }
      if (k === 'Enter') { ev.preventDefault(); if (pileTap(o)) return; if (o.s.kind === 'box') openTray(o); else flip(o, false, true); }
      else if ((k === 'p' || k === 'P') && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); setPin(o, !o.pinned); }
      else if (k === ' ') { ev.preventDefault(); o.held = !o.held; raise(o); if (o.hasBack) o.front.setAttribute('aria-pressed', o.held); say(o.held ? 'Picked up: ' + o.s.title : 'Put down'); kick(); }
      else if (k === 'Escape' && o.held) { o.held = false; kick(); }
      else if (/^Arrow(Left|Right|Up|Down)$/.test(k)) {
        ev.preventDefault(); ev.stopPropagation();
        var st = ev.shiftKey ? 64 : 22, dx = k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, dy = k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0;
        var base = o.mode === 'follow' ? [o.tx, o.ty] : [o.x, o.y], ex = extent(o);
        o.tx = clamp(base[0] + dx, ex[0], deskW - ex[0]); o.ty = clamp(base[1] + dy, ex[1], deskH - ex[1]); o.mode = 'follow'; raise(o);
        if (reduced) { o.x = o.tx; o.y = o.ty; o.mode = 'rest'; render(o); }
        kick();
      }
    });
    desk.addEventListener('keyup', function (ev) { if (ev.key === ' ' && ev.target.closest('.sb-front')) ev.preventDefault(); });
    document.addEventListener('keydown', function (ev) {
      if ((ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') || ev.altKey || ev.ctrlKey || ev.metaKey || ev.defaultPrevented) return;
      var t = ev.target;
      if (listWrap.hidden === false || LT.isDetailOpen() || (t.closest && t.closest('.sb-item,.sb-tray,.lt-dock,.lt-panel,input,select,textarea'))) return;
      if (!root.contains(t) && t !== document.body) return;
      ev.preventDefault(); go(ev.key === 'ArrowRight' ? 1 : -1);
    });

    // ---- Tabs, tidy, list ------------------------------------------------------------------
    tabsEl.addEventListener('click', function (ev) { var b = ev.target.closest('.sb-tab'); if (!b) return; var i = +b.dataset.i; if (!opened) openCover(); show(i, false, i > cur ? 1 : -1); });
    $('.sb-tidy').onclick = function () { if (opened) tidy(); };
    $('.sb-shuf').onclick = shuffle;
    pileBtn.onclick = function () { setPile(!pileOn); };
    var listBox = $('.sb-listbox'), listBuilt = false, lastFocus = null;
    function showList(v) {
      if (v && !listBuilt) { LT.listView(listBox, { title: 'Life timeline' }); listBuilt = true; }
      listWrap.hidden = !v; [$('.sb-head'), tabsEl, $('.sb-hint'), blotter].forEach(function (n) { n.hidden = v; });
      if (v) { lastFocus = document.activeElement; listWrap.focus(); } else if (lastFocus) lastFocus.focus();
    }
    $('.sb-skip').onclick = $('.sb-listbtn').onclick = function () { showList(true); };
    $('.sb-back-desk').onclick = function () { showList(false); };

    // ---- Resize ----------------------------------------------------------------------------
    var ro = new ResizeObserver(function () {
      if (!items.length) return;
      var pw = deskW, ph = deskH, pc = cols; measure();
      if (Math.abs(deskW - pw) < 2 && (desk.dataset.mode === 'stack' || Math.abs(deskH - ph) < 2)) return;
      if (pileOn) { pileLayout(); items.forEach(function (o) { if (!o.pinned) settleInstant(o); }); return; }
      place();
      if (cols !== pc) { items.forEach(settleInstant); }
      else items.forEach(function (o) { var ex = extent(o); o.x = clamp(o.x, ex[0], deskW - ex[0]); o.y = clamp(o.y, ex[1], deskH - ex[1]); render(o); });
    });
        ro.observe(desk);

    // ---- Start -----------------------------------------------------------------------------
    layer.setAttribute('inert', '');
    measure();
    show(0, false);       // builds the first spread behind the cover so the desk is ready
    opened = false;
    if (reduced) { /* spread is already placed; cover still gates the view */ }
  }
});
