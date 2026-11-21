/* Design "game": Quest. A playable walk through a life.
   Canvas 2D draws the layered parallax world and the glowing path; DOM draws gates, milestone
   markers, orbs and the traveller (crisp text, real buttons, CSS-driven pulses). One rAF loop that
   idles when nothing moves and pauses offscreen. All numbers come from the data model. */
(function () {
  "use strict";
  LT.define("game", {
    mount: function (root, M, LT) {
      var esc = M.esc,
        reduced = LT.reduced();
      var NOW = M.NOW;

      // ---------- 1. World model: chapters -> regions, entries -> markers / collectibles ----------
      var PRI = {
        role: 100,
        education: 90,
        achievement: 85,
        publication: 62,
        talk: 60,
        vision: 55,
        volunteering: 50,
        "life-event": 45,
      };
      function score(e) {
        if (e.type === "project")
          return e.metrics && e.metrics.length ? 70 + Math.min(5, e.metrics.length) : 0;
        return PRI[e.type] || 0;
      }
      var chapters = M.chapters,
        all = [],
        markers = [],
        orbs = [],
        stops = [],
        MAXKEY = 6;
      var cursor = 160;
      chapters.forEach(function (c, ci) {
        var list = c.stories.slice();
        var ord = function (e) {
          return M.ORDER.indexOf(e.type);
        };
        list.sort(function (a, b) {
          return (a._w == null ? 1e9 : a._w) - (b._w == null ? 1e9 : b._w) || ord(a) - ord(b);
        });
        var ranked = list
          .map(function (e, i) {
            return { e: e, s: score(e), i: i };
          })
          .filter(function (o) {
            return o.s > 0;
          })
          .sort(function (a, b) {
            return b.s - a.s || a.i - b.i;
          })
          .slice(0, MAXKEY);
        var key = {};
        ranked.forEach(function (o) {
          key[o.e.id] = 1;
        });
        c.gateX = cursor + 250;
        c.startX = c.gateX - 230;
        var cur = c.gateX + 300,
          prev = null,
          pts = [];
        list.forEach(function (e) {
          var isM = !!key[e.id];
          if (prev) cur += prev.marker && isM ? 400 : prev.marker || isM ? 210 : 56;
          var s = { e: e, x: cur, marker: isM, chapter: c };
          all.push(s);
          (isM ? markers : orbs).push(s);
          prev = s;
        });
        c.endX = cur + 430;
        cursor = c.endX;
        c.slots = all.filter(function (s) {
          return s.chapter === c;
        });
        // time -> position map for this chapter (monotone years along the path)
        var yr = c.from,
          ctrl = [{ x: c.gateX, y: c.from }];
        c.slots.forEach(function (s) {
          if (s.e._w != null) {
            yr = Math.min(Math.max(yr, s.e._w), c.to);
            ctrl.push({ x: s.x, y: yr });
          }
        });
        ctrl.push({ x: c.endX, y: c.epi ? c.from : c.to });
        c.ctrl = ctrl;
      });
      var WORLD_END = chapters[chapters.length - 1].endX + 360,
        WORLD_START = 70;
      var START_X = 150;
      chapters.forEach(function (c, i) {
        c.stopX = c.gateX + 30;
      });
      chapters.forEach(function (c) {
        stops.push({ x: c.gateX + 40, gate: c });
      });
      markers.forEach(function (m) {
        stops.push({ x: m.x, m: m });
      });
      stops.sort(function (a, b) {
        return a.x - b.x;
      });
      orbs.sort(function (a, b) {
        return a.x - b.x;
      });
      all.sort(function (a, b) {
        return a.x - b.x;
      });

      function chapterAt(x) {
        var r = chapters[0];
        for (var i = 0; i < chapters.length; i++) if (chapters[i].gateX - 170 <= x) r = chapters[i];
        return r;
      }
      function yearAt(x) {
        var c = chapterAt(x);
        if (c.epi) return NOW;
        var p = c.ctrl;
        if (x <= p[0].x) return p[0].y;
        for (var i = 1; i < p.length; i++)
          if (x <= p[i].x) {
            var a = p[i - 1],
              b = p[i],
              t = b.x === a.x ? 1 : (x - a.x) / (b.x - a.x);
            return a.y + (b.y - a.y) * t;
          }
        return p[p.length - 1].y;
      }
      // cumulative stats keyed by the sorted story list
      var seenSk = {},
        cumSk = [0],
        cumRole = [0],
        nSk = 0,
        nRole = 0;
      all.forEach(function (s) {
        (s.e.skills || []).forEach(function (k) {
          var kk = String(k).toLowerCase();
          if (!seenSk[kk]) {
            seenSk[kk] = 1;
            nSk++;
          }
        });
        if (s.e.type === "role") nRole++;
        cumSk.push(nSk);
        cumRole.push(nRole);
      });
      var totalSkills = nSk,
        totalRoles = nRole;
      var roleSpans = M.entries
        .filter(function (e) {
          return e.type === "role" && e.start;
        })
        .map(function (e) {
          return [M.num(e.start), !e.end || e.end === "present" ? NOW : M.num(e.end)];
        })
        .sort(function (a, b) {
          return a[0] - b[0];
        });
      var merged = [];
      roleSpans.forEach(function (s) {
        var l = merged[merged.length - 1];
        if (l && s[0] <= l[1]) l[1] = Math.max(l[1], s[1]);
        else merged.push([s[0], s[1]]);
      });
      var roleTotal = merged.reduce(function (a, s) {
        return a + s[1] - s[0];
      }, 0);
      function roleElapsed(t) {
        return merged.reduce(function (a, s) {
          return a + Math.max(0, Math.min(t, s[1]) - s[0]);
        }, 0);
      }
      var FT =
        M.experience && typeof M.experience.full_time_years === "number"
          ? M.experience.full_time_years
          : null;
      var nCities = chapters.filter(function (c) {
        return !c.epi;
      }).length;
      var totalYears = Math.floor(NOW - chapters[0].from);

      // ---------- 2. DOM ----------
      var ICON = {
        role: "M4 8h16v11H4z M9 8V6h6v2 M4 13h16",
        education: "M2 9l10-5 10 5-10 5z M6 11v5c3 2.5 9 2.5 12 0v-5",
        achievement: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
        project: "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5",
        publication: "M6 3h9l4 4v14H6z M14 3v5h5 M9 13h7 M9 17h5",
        vision:
          "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
        volunteering: "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z",
        flag: "M6 21V4 M6 5h12l-2 4 2 4H6",
      };
      ICON.talk = ICON.publication;
      var icon = function (t) {
        return (
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
          (ICON[t] || ICON.flag) +
          '"/></svg>'
        );
      };
      var short = function (s, n) {
        s = String(s || "");
        return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
      };

      var HUD = [
        {
          k: "years",
          label: "Years travelled",
          total: totalYears,
          tip:
            "Years of the timeline you have walked through, counted from " +
            Math.floor(chapters[0].from) +
            " to the furthest point you reached.",
        },
        {
          k: "cities",
          label: "Cities reached",
          total: nCities,
          tip: "Home cities you have walked into so far.",
        },
        {
          k: "roles",
          label: "Roles",
          total: totalRoles,
          tip: "Jobs and internships you have walked past.",
        },
        {
          k: "exp",
          label: "Experience",
          total: FT,
          dec: 1,
          unit: "yrs",
          tip: "Full-time experience so far, pro-rated along the path. It ends at the computed total on the data.",
        },
        {
          k: "skills",
          label: "Skills unlocked",
          total: totalSkills,
          tip: "Distinct skills named by the milestones you have passed.",
        },
        {
          k: "found",
          label: "Collectibles",
          total: orbs.length,
          tip: "Small orbs are the lesser entries. Walk past one to collect it.",
        },
      ];
      var saved = null;
      try {
        saved = JSON.parse(LT.store.get("game.pos") || "null");
      } catch (e) {
        saved = null;
      }
      if (saved && !(typeof saved.x === "number" && typeof saved.max === "number")) saved = null;
      var hasSave = !!(saved && saved.max > START_X + 400);

      root.innerHTML =
        '<div class="game-app">' +
        '<section class="game-stage" aria-label="Quest: a playable walk through a life">' +
        '<div class="game-top"><div class="game-brand"><span class="game-pill">Quest</span>' +
        '<button type="button" class="game-btn game-skip">Skip to list</button></div>' +
        '<div class="game-chap"><span class="game-chap-k"></span><b class="game-chap-n"></b><span class="game-chap-s"></span></div>' +
        '<nav class="game-seg-row" aria-label="Chapters">' +
        chapters
          .map(function (c, i) {
            return (
              '<button type="button" class="game-seg" data-i="' +
              i +
              '" style="--h:' +
              (250 + 37 * i) +
              '" title="' +
              esc(c.name + (c.epi ? "" : ", " + Math.floor(c.from))) +
              '" aria-label="Walk to ' +
              esc(c.name) +
              '"><u></u></button>'
            );
          })
          .join("") +
        "</nav></div>" +
        '<div class="game-world" tabindex="0" role="application" aria-label="Life quest world. Press left and right arrow keys or A and D to walk, Enter to inspect a milestone, Home and End to jump to the start or end." aria-describedby="game-how">' +
        '<canvas class="game-canvas" aria-hidden="true"></canvas><div class="game-ents" aria-hidden="true"></div></div>' +
        '<aside class="game-hud" aria-label="Stat sheet"><h2 class="game-hud-t">Stat sheet</h2><dl>' +
        HUD.map(function (h) {
          return (
            '<div class="game-stat" data-k="' +
            h.k +
            '" title="' +
            esc(h.tip) +
            '"><dt>' +
            h.label +
            "</dt><dd><b>0</b>" +
            (h.total != null
              ? "<small>/ " + (h.dec ? h.total.toFixed(h.dec) : h.total) + "</small>"
              : "") +
            '</dd><i class="game-stat-bar"><u></u></i></div>'
          );
        }).join("") +
        "</dl></aside>" +
        '<div class="game-hello" role="region" aria-label="How to play"><p class="game-kicker">A playable walk through a life</p>' +
        "<h1>" +
        esc(M.owner) +
        "’s Quest</h1>" +
        "<p>Walk " +
        totalYears +
        " years across " +
        nCities +
        " cities. Inspect milestones, collect the orbs, fill the stat sheet.</p>" +
        '<p class="game-how" id="game-how"><b>How to play</b> ← → or A D to walk, Shift to run, Enter to inspect. On a phone: hold or tap the arrows, or drag the world.</p>' +
        '<div class="game-hello-act"><button type="button" class="game-btn game-btn-main game-start">' +
        (hasSave ? "Continue" : "Start walking") +
        "</button>" +
        (hasSave ? '<button type="button" class="game-btn game-restart">Start over</button>' : "") +
        "</div></div>" +
        '<div class="game-card" role="group" aria-label="Milestone" tabindex="-1" hidden></div>' +
        '<div class="game-toast" aria-hidden="true"></div>' +
        '<div class="game-pad"><button type="button" class="game-pad-b" data-d="-1" aria-label="Walk left (hold) or previous stop (tap)">◀</button>' +
        '<button type="button" class="game-pad-i" aria-label="Inspect nearby milestone" hidden>Inspect</button>' +
        '<button type="button" class="game-pad-b" data-d="1" aria-label="Walk right (hold) or next stop (tap)">▶</button></div>' +
        '<p class="game-legend"><span><kbd>←</kbd><kbd>→</kbd> / <kbd>A</kbd><kbd>D</kbd> walk</span><span><kbd>Shift</kbd> run</span><span><kbd>Enter</kbd> inspect</span><span><kbd>Home</kbd><kbd>End</kbd> jump</span></p>' +
        '<div class="game-live" role="status" aria-live="polite"></div>' +
        "</section>" +
        '<section class="game-list-wrap" id="game-list" hidden><div class="game-list-head"><h2>All milestones, as a list</h2><button type="button" class="game-btn game-back">Back to the game</button></div><div class="game-list"></div></section>' +
        "</div>";
      root.setAttribute("data-ready", "1");

      var $ = function (s, el) {
        return (el || root).querySelector(s);
      };
      var stage = $(".game-stage"),
        world = $(".game-world"),
        canvas = $(".game-canvas"),
        ents = $(".game-ents"),
        card = $(".game-card"),
        live = $(".game-live"),
        toast = $(".game-toast"),
        hello = $(".game-hello"),
        listWrap = $(".game-list-wrap"),
        skipBtn = $(".game-skip"),
        padI = $(".game-pad-i");
      var g = canvas.getContext("2d");

      // entities
      var HERO =
        '<div class="game-hero"><i class="game-hero-sh"></i><svg viewBox="0 0 48 64" width="48" height="64" aria-hidden="true">' +
        '<g class="gh-flip"><rect class="gh-pack" x="9" y="27" width="10" height="17" rx="4"/>' +
        '<g class="gh-leg1"><rect class="gh-leg" x="17" y="45" width="6.5" height="17" rx="3.2"/></g>' +
        '<g class="gh-leg2"><rect class="gh-leg" x="25" y="45" width="6.5" height="17" rx="3.2"/></g>' +
        '<rect class="gh-body" x="14" y="24" width="21" height="27" rx="10.5"/>' +
        '<g class="gh-scarf"><path class="gh-scarf-p" d="M23 26 L13 28 L8 35 L16 31 L24 31 Z"/></g>' +
        '<circle class="gh-head" cx="24.5" cy="15.5" r="10"/><path class="gh-cap" d="M14.5 15.5a10 10 0 0 1 20 0z"/>' +
        '<circle class="gh-eye" cx="30" cy="17.5" r="1.9"/></g></svg></div>';
      var gateEls = chapters.map(function (c) {
        var el = document.createElement("div");
        el.className = "game-gate";
        el.style.setProperty("--h", 250 + 37 * c.index);
        el.innerHTML =
          '<span class="game-gate-arch"><i></i><i></i></span><span class="game-gate-sign"><b>' +
          esc(c.epi ? "Beyond" : c.name) +
          "</b><small>" +
          esc(
            c.epi ? "Undated · vision" : Math.floor(c.from) + (c.region ? " · " + c.region : "")
          ) +
          "</small></span>";
        ents.appendChild(el);
        return { el: el, x: c.gateX, c: c, vis: true, y: 0 };
      });
      var endSign = document.createElement("div");
      endSign.className = "game-end";
      endSign.innerHTML = "<span>The path goes on</span>";
      ents.appendChild(endSign);
      var endEnt = { el: endSign, x: WORLD_END - 190, vis: true };
      var mkEls = markers.map(function (m, i) {
        var e = m.e,
          el = document.createElement("button");
        el.type = "button";
        el.className = "game-mk";
        el.tabIndex = -1;
        el.style.setProperty("--c", M.typeColor(e.type));
        el.dataset.i = i;
        el.setAttribute("aria-label", "Inspect " + e.title);
        el.innerHTML =
          '<span class="game-mk-stem"></span><span class="game-mk-dot">' +
          icon(e.type) +
          '</span><span class="game-mk-label"><b>' +
          esc(short(e.title, 34)) +
          "</b><i>" +
          esc(M.when(e) || M.typeName(e.type)) +
          '</i></span><span class="game-mk-hint">Enter</span>';
        ents.appendChild(el);
        m.el = el;
        m.vis = true;
        m.idx = i;
        return m;
      });
      orbs.forEach(function (o, i) {
        var el = document.createElement("span");
        el.className = "game-orb";
        el.dataset.i = i;
        var lift = 26 + Math.round(48 * (0.5 + 0.5 * Math.sin(i * 1.9 + o.x * 0.01)));
        el.style.setProperty("--c", M.typeColor(o.e.type));
        el.style.setProperty("--lift", lift + "px");
        el.style.setProperty("--d", (((i * 137) % 1000) / 1000) * -4 + "s");
        el.innerHTML = "<i></i>";
        ents.appendChild(el);
        o.el = el;
        o.vis = true;
        o.got = false;
        o.idx = i;
      });
      ents.insertAdjacentHTML("beforeend", HERO);
      var heroEl = $(".game-hero"),
        svgFlip = $(".gh-flip"),
        leg1 = $(".gh-leg1"),
        leg2 = $(".gh-leg2"),
        scarf = $(".gh-scarf");
      var allEnts = gateEls.concat(mkEls, orbs, [endEnt]);

      var hudEls = {};
      HUD.forEach(function (h) {
        var s = $('.game-stat[data-k="' + h.k + '"]');
        hudEls[h.k] = { row: s, b: $("b", s), bar: $(".game-stat-bar u", s), shown: "" };
      });
      var chapK = $(".game-chap-k"),
        chapN = $(".game-chap-n"),
        chapS = $(".game-chap-s"),
        segs = [].slice.call(root.querySelectorAll(".game-seg"));

      // ---------- 3. State ----------
      var W = 0,
        H = 0,
        dpr = 1,
        PB = 0,
        AX = 0,
        SC = 1,
        phone = false;
      var x = hasSave ? Math.min(Math.max(saved.x, START_X), WORLD_END) : START_X,
        v = 0,
        camX = x,
        maxX = hasSave ? Math.max(saved.max, x) : x;
      var dir = 0,
        shift = false,
        padDir = 0,
        padT0 = 0,
        target = null,
        dragging = false,
        drag = null,
        phase = 0,
        face = 1;
      var visible = true,
        running = false,
        lastT = 0,
        hudBusy = false,
        started = hasSave,
        dirty = true;
      var curChap = -1,
        nearM = -1,
        openM = null,
        openOrb = null,
        collectPtr = 0,
        lastSave = 0;
      var disp = {},
        tgt = {};
      HUD.forEach(function (h) {
        disp[h.k] = 0;
        tgt[h.k] = 0;
      });
      var light = LT.theme() === "light";
      var tmo = { say: 0, col: 0, toast: 0 },
        colBatch = 0;

      function clamp(a, lo, hi) {
        return a < lo ? lo : a > hi ? hi : a;
      }
      function pathY(u) {
        return PB + 8 * Math.sin(u / 310) + 5 * Math.sin(u / 97 + 1);
      }
      function say(msg) {
        clearTimeout(tmo.say);
        tmo.say = setTimeout(function () {
          live.textContent = msg;
        }, 60);
      }
      function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add("is-on");
        clearTimeout(tmo.toast);
        tmo.toast = setTimeout(function () {
          toast.classList.remove("is-on");
        }, 1700);
      }

      // ---------- 4. Scenery (canvas) ----------
      function hash(n) {
        n = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return n - Math.floor(n);
      }
      function sstep(a, b, t) {
        t = clamp((t - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
      }
      function hsl(h, s, l, a) {
        return (
          "hsla(" +
          (((h % 360) + 360) % 360).toFixed(0) +
          "," +
          s +
          "%," +
          l +
          "%," +
          (a == null ? 1 : a) +
          ")"
        );
      }
      var BLEND = 300,
        bW = new Array(chapters.length + 1);
      function weights(u) {
        var prev = 1,
          n = chapters.length;
        for (var c = 0; c < n; c++) {
          var s = c === 0 ? 1 : sstep(chapters[c].startX - BLEND, chapters[c].startX + BLEND, u);
          bW[c] = prev;
          prev = s;
        }
        for (c = 0; c < n; c++)
          bW[c] =
            bW[c] -
            (c + 1 < n
              ? sstep(chapters[c + 1].startX - BLEND, chapters[c + 1].startX + BLEND, u)
              : 0);
        return bW;
      }
      function profile(c, q) {
        var s, v2;
        switch (c) {
          case 0:
            return (
              0.22 +
              0.1 * Math.sin(q / 330) +
              0.06 * Math.sin(q / 97 + 1) +
              0.035 * Math.sin(q / 43)
            );
          case 1:
            return 0.46 + 0.26 * Math.sin(q / 470 + 1) + 0.13 * Math.sin(q / 170);
          case 2:
            v2 = 0.5 + 0.22 * Math.sin(q / 520) + 0.1 * Math.sin(q / 190 + 2);
            return Math.round(v2 * 6) / 6 + 0.04 * Math.sin(q / 70);
          case 3:
            v2 = 0.55 + 0.5 * Math.sin(q / 640 + 0.5);
            return Math.min(0.6, v2) * (0.94 + 0.06 * Math.sin(q / 31)) + 0.02;
          case 4:
            return 0.5 + 0.28 * Math.sin(q / 400 + 2) + 0.12 * Math.sin(q / 150);
          case 5:
            s = Math.floor(q / 62);
            return (
              0.16 +
              0.5 * Math.pow(hash(s + 3), 1.5) +
              (hash(Math.floor(s / 4) + 9) > 0.72 ? 0.2 : 0)
            );
          case 6:
            s = Math.abs(Math.sin(q / 250 + 0.6));
            return 0.16 + 0.66 * Math.pow(s, 0.85) * (0.65 + 0.35 * Math.sin(q / 880 + 1));
          default:
            return 0.3 + 0.12 * Math.sin(q / 420) + 0.05 * Math.sin(q / 130);
        }
      }
      function hueAt(u) {
        var w = weights(u),
          h = 0,
          tw = 0;
        for (var c = 0; c < chapters.length; c++)
          if (w[c] > 0) {
            h += w[c] * (250 + 37 * c);
            tw += w[c];
          }
        return tw ? h / tw : 250;
      }
      var LAYERS = [
        {
          f: 0.12,
          base: -0.14,
          amp: 0.27,
          sp: 250,
          k: 0.55,
          dens: [0.8, 0.75, 0.7, 0.7, 0.85, 0.9, 0.9, 0.9],
        },
        {
          f: 0.3,
          base: -0.07,
          amp: 0.21,
          sp: 300,
          k: 0.8,
          dens: [0.8, 0.75, 0.8, 0.7, 0.8, 0.9, 0.9, 0.7],
        },
        {
          f: 0.58,
          base: -0.012,
          amp: 0.13,
          sp: 360,
          k: 1.15,
          dens: [0.7, 0.8, 0.8, 0.7, 0.75, 0.85, 0.9, 0.6],
        },
      ];
      function silY(L, li, u) {
        var w = weights(u),
          p = 0;
        for (var c = 0; c < chapters.length; c++)
          if (w[c] > 0) p += w[c] * profile(c, u * L.f + li * 913);
        return PB + L.base * H - clamp(p, 0, 1) * L.amp * H;
      }
      // original decorations, one family per region. (x,y) = base centre; s = scale; r = variation 0..1.
      var FAM = [
        function (c, x0, y, s, r, lit) {
          // Porbandar: sails and a lighthouse
          if (r < 0.5) {
            c.beginPath();
            c.moveTo(x0 - 20 * s, y - 5 * s);
            c.lineTo(x0 + 22 * s, y - 5 * s);
            c.lineTo(x0 + 14 * s, y + 3 * s);
            c.lineTo(x0 - 14 * s, y + 3 * s);
            c.fill();
            c.beginPath();
            c.moveTo(x0, y - 8 * s);
            c.lineTo(x0, y - 48 * s);
            c.lineTo(x0 + 19 * s, y - 8 * s);
            c.fill();
            c.beginPath();
            c.moveTo(x0 - 2 * s, y - 12 * s);
            c.lineTo(x0 - 2 * s, y - 36 * s);
            c.lineTo(x0 - 15 * s, y - 12 * s);
            c.fill();
          } else {
            c.beginPath();
            c.moveTo(x0 - 9 * s, y + 2);
            c.lineTo(x0 - 5 * s, y - 56 * s);
            c.lineTo(x0 + 5 * s, y - 56 * s);
            c.lineTo(x0 + 9 * s, y + 2);
            c.fill();
            c.fillRect(x0 - 8 * s, y - 66 * s, 16 * s, 11 * s);
            c.beginPath();
            c.moveTo(x0 - 10 * s, y - 66 * s);
            c.lineTo(x0, y - 78 * s);
            c.lineTo(x0 + 10 * s, y - 66 * s);
            c.fill();
            if (lit) {
              c.fillStyle = lit;
              c.fillRect(x0 - 4 * s, y - 64 * s, 8 * s, 7 * s);
            }
          }
        },
        function (c, x0, y, s, r, lit) {
          // Amravati: domes and minarets
          var w = (36 + r * 26) * s,
            h = (28 + r * 22) * s;
          c.fillRect(x0 - w / 2, y - h, w, h + 2);
          c.beginPath();
          c.arc(x0, y - h, w * 0.38, Math.PI, 0);
          c.fill();
          c.fillRect(x0 - 1.2 * s, y - h - w * 0.38 - 14 * s, 2.4 * s, 14 * s);
          [-1, 1].forEach(function (d) {
            var mx = x0 + d * (w / 2 + 9 * s);
            c.fillRect(mx - 3 * s, y - h - 24 * s, 6 * s, h + 26 * s);
            c.beginPath();
            c.moveTo(mx - 4 * s, y - h - 24 * s);
            c.lineTo(mx, y - h - 36 * s);
            c.lineTo(mx + 4 * s, y - h - 24 * s);
            c.fill();
          });
          if (lit) {
            c.fillStyle = lit;
            for (var i = -1; i <= 1; i++) {
              c.beginPath();
              c.arc(x0 + i * w * 0.26, y - h * 0.42, 3.2 * s, Math.PI, 0);
              c.fillRect(x0 + i * w * 0.26 - 3.2 * s, y - h * 0.42, 6.4 * s, 9 * s);
              c.fill();
            }
          }
        },
        function (c, x0, y, s, r) {
          // Ozar: round trees and a silo
          if (r > 0.72) {
            c.fillRect(x0 - 10 * s, y - 40 * s, 20 * s, 42 * s);
            c.beginPath();
            c.arc(x0, y - 40 * s, 10 * s, Math.PI, 0);
            c.fill();
            return;
          }
          c.fillRect(x0 - 2 * s, y - 24 * s, 4 * s, 26 * s);
          [
            [0, -34, 14],
            [-9, -26, 10],
            [9, -27, 11],
          ].forEach(function (q) {
            c.beginPath();
            c.arc(x0 + q[0] * s, y + q[1] * s, q[2] * s, 0, 6.3);
            c.fill();
          });
        },
        function (c, x0, y, s, r) {
          // Dhule: stepped mesas and boulders
          var w = (62 + r * 54) * s;
          for (var i = 0; i < 3; i++) {
            var wi = w * (1 - i * 0.27);
            c.fillRect(x0 - wi / 2, y - (i + 1) * 17 * s, wi, 18 * s);
          }
          c.beginPath();
          c.arc(x0 + w * 0.62, y + 1, 9 * s, Math.PI, 0);
          c.fill();
          c.beginPath();
          c.arc(x0 - w * 0.66, y + 1, 6 * s, Math.PI, 0);
          c.fill();
        },
        function (c, x0, y, s, r, lit) {
          // Pune: a hill fort
          var w = (76 + r * 40) * s;
          c.fillRect(x0 - w / 2, y - 26 * s, w, 28 * s);
          for (var i = 0; i < 7; i++)
            c.fillRect(x0 - w / 2 + i * (w / 6.4), y - 33 * s, w / 13, 8 * s);
          c.fillRect(x0 - 10 * s, y - 64 * s, 20 * s, 40 * s);
          c.beginPath();
          c.moveTo(x0 - 14 * s, y - 64 * s);
          c.lineTo(x0, y - 88 * s);
          c.lineTo(x0 + 14 * s, y - 64 * s);
          c.fill();
          c.fillRect(x0 - 0.8 * s, y - 104 * s, 1.6 * s, 18 * s);
          if (lit) {
            c.fillStyle = lit;
            c.beginPath();
            c.arc(x0, y - 48 * s, 3.6 * s, Math.PI, 0);
            c.fillRect(x0 - 3.6 * s, y - 48 * s, 7.2 * s, 9 * s);
            c.fill();
          }
        },
        function (c, x0, y, s, r, lit) {
          // Santa Clara: a glass-and-grid skyline
          var w = (22 + r * 30) * s,
            h = (64 + hash(r * 91) * 150) * s;
          c.fillRect(x0 - w / 2, y - h, w, h + 2);
          if (r > 0.8) {
            c.beginPath();
            c.arc(x0, y - h, w / 2, Math.PI, 0);
            c.fill();
          } else if (r > 0.35) c.fillRect(x0 - 0.8 * s, y - h - 18 * s, 1.6 * s, 18 * s);
          if (lit) {
            c.fillStyle = lit;
            var cols = Math.max(2, Math.floor(w / (7 * s)));
            for (var i = 0; i < cols; i++)
              for (var j = 0; j < Math.floor(h / (11 * s)) - 1; j++)
                if (hash(i * 7.1 + j * 3.3 + r * 50) > 0.55)
                  c.fillRect(
                    x0 - w / 2 + 3 * s + i * 7 * s,
                    y - h + 6 * s + j * 11 * s,
                    3 * s,
                    4.5 * s
                  );
          }
        },
        function (c, x0, y, s, r) {
          // Seattle: firs and one slim needle
          if (r > 0.93) {
            c.fillRect(x0 - 2 * s, y - 130 * s, 4 * s, 132 * s);
            c.beginPath();
            c.ellipse(x0, y - 100 * s, 26 * s, 6.5 * s, 0, 0, 6.3);
            c.fill();
            c.fillRect(x0 - 0.8 * s, y - 158 * s, 1.6 * s, 28 * s);
            return;
          }
          var n = 3 + (r > 0.5 ? 1 : 0),
            w = (24 + r * 12) * s;
          c.fillRect(x0 - 2 * s, y - 8 * s, 4 * s, 10 * s);
          for (var i = 0; i < n; i++) {
            var yy = y - 6 * s - i * 17 * s,
              ww = w * (1 - i * 0.2);
            c.beginPath();
            c.moveTo(x0 - ww, yy);
            c.lineTo(x0, yy - 28 * s);
            c.lineTo(x0 + ww, yy);
            c.fill();
          }
        },
        function (c, x0, y, s, r, lit) {
          // Beyond: floating islands and rings
          c.beginPath();
          c.ellipse(x0, y, 36 * s, 7 * s, 0, 0, 6.3);
          c.fill();
          c.beginPath();
          c.moveTo(x0 - 34 * s, y + 2 * s);
          c.lineTo(x0, y + (24 + r * 20) * s);
          c.lineTo(x0 + 34 * s, y + 2 * s);
          c.fill();
          c.beginPath();
          c.moveTo(x0 - 6 * s, y - 3 * s);
          c.lineTo(x0, y - (24 + r * 12) * s);
          c.lineTo(x0 + 6 * s, y - 3 * s);
          c.fill();
          if (lit) {
            c.strokeStyle = lit;
            c.lineWidth = 1.5 * s;
            c.beginPath();
            c.ellipse(x0, y - 16 * s, 46 * s, 11 * s, -0.2, 0, 6.3);
            c.stroke();
          }
        },
      ];
      var stars = [];
      for (var si = 0; si < 80; si++)
        stars.push([hash(si * 1.7), hash(si * 4.1 + 2) * 0.5, 0.4 + hash(si * 9.3) * 1.2]);
      var accent = { a: "255,201,74", gl: "255,201,74" };

      function drawScene() {
        var cH = hueAt(camX),
          Lh = light;
        // sky
        var sky = g.createLinearGradient(0, 0, 0, PB);
        if (Lh) {
          sky.addColorStop(0, hsl(cH + 10, 75, 84));
          sky.addColorStop(0.55, hsl(cH - 20, 80, 91));
          sky.addColorStop(1, hsl(42, 95, 94));
        } else {
          sky.addColorStop(0, hsl(cH, 48, 7));
          sky.addColorStop(0.5, hsl(cH + 14, 52, 15));
          sky.addColorStop(1, hsl(cH + 34, 62, 30));
        }
        g.fillStyle = sky;
        g.fillRect(0, 0, W, H);
        // sun or moon, pools of light
        var sxp = W * 0.74 - ((camX * 0.018) % 40),
          syp = PB * 0.3;
        var gl = g.createRadialGradient(sxp, syp, 0, sxp, syp, PB * 0.9);
        if (Lh) {
          gl.addColorStop(0, "rgba(255,238,170,.85)");
          gl.addColorStop(0.12, "rgba(255,224,140,.4)");
          gl.addColorStop(1, "rgba(255,224,140,0)");
        } else {
          gl.addColorStop(0, hsl(cH + 40, 80, 70, 0.32));
          gl.addColorStop(0.25, hsl(cH + 30, 70, 50, 0.14));
          gl.addColorStop(1, hsl(cH, 60, 40, 0));
        }
        g.fillStyle = gl;
        g.fillRect(0, 0, W, PB);
        g.fillStyle = Lh ? "#ffe089" : "#f3ecd8";
        g.beginPath();
        g.arc(sxp, syp, Math.max(18, 24 * SC), 0, 6.3);
        g.fill();
        if (!Lh) {
          g.fillStyle = hsl(cH + 14, 52, 15);
          g.beginPath();
          g.arc(sxp + 9 * SC, syp - 5 * SC, 21 * SC, 0, 6.3);
          g.fill();
          for (var i = 0; i < stars.length; i++) {
            var st = stars[i],
              px = (((st[0] * W * 1.2 - camX * 0.03 * (0.5 + st[2] * 0.3)) % W) + W) % W;
            g.fillStyle = "rgba(255,248,230," + (0.25 + st[2] * 0.3) + ")";
            g.fillRect(px, st[1] * PB, st[2], st[2]);
          }
        } else {
          g.fillStyle = "rgba(255,255,255,.9)";
          for (i = 0; i < 7; i++) {
            var cx = ((((i * 331 + 60 - camX * 0.06) % (W + 360)) + W + 360) % (W + 360)) - 180,
              cy = PB * (0.12 + hash(i * 3.3) * 0.3),
              cs = (0.7 + hash(i * 8.1)) * SC;
            g.beginPath();
            g.arc(cx, cy, 16 * cs, 0, 6.3);
            g.arc(cx + 20 * cs, cy - 8 * cs, 20 * cs, 0, 6.3);
            g.arc(cx + 44 * cs, cy, 15 * cs, 0, 6.3);
            g.rect(cx, cy, 44 * cs, 15 * cs);
            g.fill();
          }
        }
        // parallax layers
        for (var li = 0; li < LAYERS.length; li++) drawLayer(li);
        // ground and path
        drawGround();
      }
      function drawLayer(li) {
        var L = LAYERS[li],
          Lh = light,
          step = 7,
          n = Math.ceil(W / step) + 3;
        var uL = camX + (-60 - AX) / L.f,
          uR = camX + (W + 60 - AX) / L.f;
        var pts = [],
          i,
          u;
        g.beginPath();
        g.moveTo(-step * 2, H + 5);
        for (i = 0; i <= n; i++) {
          var sx = -step * 2 + i * step;
          u = camX + (sx - AX) / L.f;
          var y = silY(L, li, u);
          pts.push(y);
          g.lineTo(sx, y);
        }
        g.lineTo(W + step * 2, H + 5);
        g.closePath();
        var h0 = hueAt(uL),
          h1 = hueAt(camX),
          h2 = hueAt(uR);
        var gr = g.createLinearGradient(0, 0, W, 0),
          l,
          s2,
          ho = li * 5;
        if (Lh) {
          l = [80, 69, 56][li];
          s2 = [52, 46, 40][li];
        } else {
          l = [25, 16, 9][li];
          s2 = [40, 38, 34][li];
        }
        gr.addColorStop(0, hsl(h0 + ho, s2, l));
        gr.addColorStop(0.5, hsl(h1 + ho, s2, l));
        gr.addColorStop(1, hsl(h2 + ho, s2, l));
        // soft cast shadow (light) or rim glow (dark) along the top edge
        if (Lh) {
          g.lineJoin = "round";
          [
            [16, 0.035],
            [9, 0.05],
            [4, 0.07],
          ].forEach(function (q) {
            g.lineWidth = q[0];
            g.strokeStyle = "rgba(70,45,30," + q[1] + ")";
            g.stroke();
          });
        }
        g.fillStyle = gr;
        g.fill();
        if (!Lh) {
          g.lineWidth = 1.2;
          g.strokeStyle = hsl(h1 + 30, 60, 62, [0.34, 0.22, 0.14][li]);
          g.stroke();
        } else {
          g.lineWidth = 1.4;
          g.strokeStyle = "rgba(255,255,255,.55)";
          g.stroke();
        }
        // decorations of the region each one stands in
        var spu = (L.sp * SC) / L.f,
          k0 = Math.floor(uL / spu) - 1,
          k1 = Math.ceil(uR / spu) + 1;
        for (var k = k0; k <= k1; k++) {
          var ju = (k + 0.5 + (hash(k * 3.1 + li * 17) - 0.5) * 0.7) * spu,
            r = hash(k * 5.3 + li * 11),
            c = 0;
          for (var ci = 0; ci < chapters.length; ci++) if (chapters[ci].startX <= ju) c = ci;
          if (ju < chapters[0].startX - 400 || hash(k * 7.7 + li * 3) > L.dens[c]) continue;
          var dx = AX + (ju - camX) * L.f,
            dy;
          var fill = gr,
            lit = null,
            sc = SC * (li === 0 ? 0.6 : li === 1 ? 0.95 : 1.35);
          if (c === 7) dy = PB * (0.2 + 0.3 * hash(k * 2.2 + li));
          else dy = silY(L, li, ju) + 2;
          if (c === 0 && r < 0.5) dy = silY(L, li, ju) + 6 * SC;
          g.fillStyle = Lh ? hsl(hueAt(ju) + ho, s2 - 4, l - 9) : hsl(hueAt(ju) + ho, s2, l - 2.5);
          if (!Lh)
            lit =
              li === 2 ? "rgba(255,214,120,.9)" : "rgba(255,214,120," + (li ? 0.55 : 0.35) + ")";
          else if (c === 7) lit = "rgba(255,255,255,.7)";
          FAM[c](g, dx, dy, sc, r, lit);
        }
      }
      function drawGround() {
        var Lh = light,
          step = 8,
          n = Math.ceil(W / step) + 3,
          i,
          sx,
          u,
          ys = [];
        var cH = hueAt(camX),
          hL = hueAt(camX - AX),
          hR = hueAt(camX + W - AX);
        g.beginPath();
        g.moveTo(-step * 2, H + 5);
        for (i = 0; i <= n; i++) {
          sx = -step * 2 + i * step;
          u = camX + (sx - AX);
          ys.push(pathY(u));
          g.lineTo(sx, ys[i]);
        }
        g.lineTo(W + step * 2, H + 5);
        g.closePath();
        var gr = g.createLinearGradient(0, PB - 12, 0, H);
        if (Lh) {
          gr.addColorStop(0, hsl(cH, 40, 52));
          gr.addColorStop(1, hsl(cH, 36, 40));
        } else {
          gr.addColorStop(0, hsl(cH, 36, 13));
          gr.addColorStop(1, hsl(cH, 40, 4));
        }
        if (Lh) {
          g.lineJoin = "round";
          [
            [14, 0.04],
            [8, 0.06],
            [3, 0.08],
          ].forEach(function (q) {
            g.lineWidth = q[0];
            g.strokeStyle = "rgba(70,45,30," + q[1] + ")";
            g.stroke();
          });
        }
        g.fillStyle = gr;
        g.fill();
        // foreground tufts (below the path, parallax faster than the path)
        var f = 1.35,
          spu = (120 * SC) / f,
          uL = camX + (-40 - AX) / f,
          uR = camX + (W + 40 - AX) / f;
        g.fillStyle = Lh ? hsl(cH, 36, 33, 0.85) : hsl(cH, 36, 3, 0.9);
        for (var k = Math.floor(uL / spu); k <= Math.ceil(uR / spu); k++) {
          var r = hash(k * 2.9 + 4);
          if (r < 0.35) continue;
          var ju = (k + r) * spu,
            dx = AX + (ju - camX) * f,
            dy = PB + (22 + 90 * hash(k * 6.1)) * SC + 20 * SC * 0,
            s = (6 + 10 * hash(k * 1.3)) * SC;
          g.beginPath();
          g.moveTo(dx - s, dy);
          g.lineTo(dx - s * 0.3, dy - s * 2.1);
          g.lineTo(dx, dy);
          g.lineTo(dx + s * 0.4, dy - s * 1.6);
          g.lineTo(dx + s, dy);
          g.closePath();
          g.fill();
          if (r > 0.8) {
            g.fillStyle = hsl(cH + 40, 70, Lh ? 72 : 55, Lh ? 0.9 : 0.55);
            g.beginPath();
            g.arc(dx + s * 1.4, dy - 2, 2.2 * SC, 0, 6.3);
            g.fill();
            g.fillStyle = Lh ? hsl(cH, 36, 33, 0.85) : hsl(cH, 36, 3, 0.9);
          }
        }
        // path: dim future, lit travelled part up to the furthest point reached
        var cut = AX + (maxX - camX),
          A = accent.a;
        g.lineCap = "round";
        g.lineJoin = "round";
        function stroke(from, to, w, col) {
          g.beginPath();
          var started2 = false;
          for (var j = 0; j <= n; j++) {
            var px = -step * 2 + j * step;
            if (px < from - step || px > to + step) continue;
            var cx = clamp(px, from, to);
            if (!started2) {
              g.moveTo(cx, ys[j]);
              started2 = true;
            } else g.lineTo(cx, ys[j]);
          }
          if (started2) {
            g.lineWidth = w;
            g.strokeStyle = col;
            g.stroke();
          }
        }
        var yAt = function (px) {
          var j = clamp(Math.round((px + step * 2) / step), 0, n);
          return ys[j];
        };
        if (Lh) {
          stroke(-20, W + 20, 15, "rgba(255,248,230,.95)");
          stroke(-20, W + 20, 3, "rgba(120,80,40,.18)");
          g.setLineDash([2, 12]);
          stroke(-20, W + 20, 2.5, "rgba(110,70,30,.5)");
          g.setLineDash([]);
          if (cut > -20) {
            stroke(-20, Math.min(W + 20, cut), 9, "rgba(" + A + ",.28)");
            stroke(-20, Math.min(W + 20, cut), 4, "rgba(" + A + ",1)");
          }
        } else {
          stroke(-20, W + 20, 12, "rgba(255,255,255,.05)");
          g.setLineDash([2, 12]);
          stroke(-20, W + 20, 2.5, "rgba(255,255,255,.3)");
          g.setLineDash([]);
          if (cut > -20) {
            var to = Math.min(W + 20, cut);
            stroke(-20, to, 30, "rgba(" + A + ",.06)");
            stroke(-20, to, 18, "rgba(" + A + ",.12)");
            stroke(-20, to, 8, "rgba(" + A + ",.38)");
            stroke(-20, to, 3, "rgba(255,240,200,.95)");
          }
          // pool of light under the traveller
          var hx = AX + (x - camX),
            hy = pathY(x),
            pg = g.createRadialGradient(hx, hy, 0, hx, hy, 220 * SC);
          pg.addColorStop(0, "rgba(" + A + ",.2)");
          pg.addColorStop(1, "rgba(" + A + ",0)");
          g.fillStyle = pg;
          g.fillRect(hx - 240 * SC, hy - 160 * SC, 480 * SC, 320 * SC);
        }
        // end of the lit trail: a small bead
        if (cut > 0 && cut < W) {
          var by = yAt(cut);
          g.fillStyle = "rgba(" + A + ",1)";
          g.beginPath();
          g.arc(cut, by, 5, 0, 6.3);
          g.fill();
          g.lineWidth = 2;
          g.strokeStyle = Lh ? "#fff" : "rgba(255,255,255,.7)";
          g.stroke();
        }
      }
      // ---------- 5. Entity placement ----------
      function placeEnts() {
        var half = W + 260,
          i,
          e,
          sx,
          sy;
        for (i = 0; i < allEnts.length; i++) {
          e = allEnts[i];
          sx = AX + (e.x - camX);
          var on = sx > -280 && sx < half;
          if (!on) {
            if (e.vis) {
              e.el.style.display = "none";
              e.vis = false;
            }
            continue;
          }
          if (!e.vis) {
            e.el.style.display = "";
            e.vis = true;
          }
          sy = pathY(e.x);
          e.el.style.transform = "translate3d(" + sx.toFixed(1) + "px," + sy.toFixed(1) + "px,0)";
        }
        var hy = pathY(x),
          bob = 0,
          amp = Math.min(1, Math.abs(v) / 140);
        if (!reduced) bob = -Math.abs(Math.sin(phase)) * 3.4 * amp;
        heroEl.style.transform =
          "translate3d(" + (AX + (x - camX)).toFixed(1) + "px," + (hy + bob).toFixed(1) + "px,0)";
        svgFlip.setAttribute("transform", face < 0 ? "translate(48 0) scale(-1 1)" : "");
        var sw = reduced ? 0 : Math.sin(phase) * 34 * amp;
        leg1.setAttribute("transform", "rotate(" + sw.toFixed(1) + " 20.2 46)");
        leg2.setAttribute("transform", "rotate(" + (-sw).toFixed(1) + " 28.2 46)");
        scarf.setAttribute(
          "transform",
          "rotate(" +
            (reduced ? 0 : clamp(-v * 0.018 - Math.sin(phase * 2) * 3 * amp, -26, 26)).toFixed(1) +
            " 23 28)"
        );
        if (openM || openOrb) placeCard();
      }

      // ---------- 6. Progress, HUD, chapter, near-marker ----------
      function format(h, val) {
        return h.dec ? val.toFixed(h.dec) : String(Math.round(val));
      }
      function computeStats() {
        var yrs = Math.max(0, yearAt(maxX) - chapters[0].from);
        var done = 0;
        while (done < all.length && all[done].x <= maxX) done++;
        var cities = 0;
        chapters.forEach(function (c) {
          if (!c.epi && c.gateX - 170 <= maxX) cities++;
        });
        var ex = FT != null && roleTotal ? (FT * roleElapsed(yearAt(maxX))) / roleTotal : null;
        tgt.years = Math.min(totalYears, Math.floor(yrs));
        tgt.cities = cities;
        tgt.roles = cumRole[done];
        tgt.exp = ex;
        tgt.skills = cumSk[done];
        tgt.found = collectPtr;
      }
      function paintHud(instant) {
        var busy = false;
        HUD.forEach(function (h) {
          var el = hudEls[h.k],
            t = tgt[h.k];
          if (t == null) {
            if (el.shown !== "—") {
              el.b.textContent = "—";
              el.shown = "—";
            }
            return;
          }
          var d = disp[h.k];
          if (instant || reduced) d = t;
          else {
            d += (t - d) * 0.16;
            if (Math.abs(t - d) < (h.dec ? 0.02 : 0.12)) d = t;
            else busy = true;
          }
          disp[h.k] = d;
          var s = format(h, d);
          if (s !== el.shown) {
            el.b.textContent = s;
            el.shown = s;
            if (!reduced && !instant) {
              el.row.classList.remove("is-bump");
              void el.row.offsetWidth;
              el.row.classList.add("is-bump");
            }
          }
          if (h.total)
            el.bar.style.transform = "scaleX(" + clamp(d / h.total, 0, 1).toFixed(3) + ")";
        });
        hudBusy = busy;
      }
      function refreshProgress(initial) {
        // collect orbs we have now passed
        var got = 0;
        while (collectPtr < orbs.length && orbs[collectPtr].x <= maxX) {
          var o = orbs[collectPtr++];
          o.got = true;
          got++;
          if (initial) o.el.classList.add("is-got", "is-quiet");
          else {
            o.el.classList.add("is-got");
            o.el.title = o.e.title;
            lastCollected = o;
          }
        }
        if (got && !initial) {
          colBatch += got;
          clearTimeout(tmo.col);
          tmo.col = setTimeout(function () {
            say(
              "Collected " +
                colBatch +
                (colBatch === 1 ? " item" : " items") +
                ", latest: " +
                lastCollected.e.title +
                ". " +
                collectPtr +
                " of " +
                orbs.length +
                " found."
            );
            colBatch = 0;
          }, 900);
          showToast("Collected · " + short(lastCollected.e.title, 46));
        }
        computeStats();
        var c = chapterAt(x);
        if (c.index !== curChap) {
          var first = curChap < 0;
          curChap = c.index;
          chapK.textContent = "Chapter " + (c.index + 1) + " of " + chapters.length;
          chapN.textContent = c.epi ? "Beyond the timeline" : c.name;
          stage.style.setProperty("--ch", 250 + 37 * c.index);
          if (!first) {
            say(
              "Entered " +
                (c.epi ? "Beyond the timeline, undated" : c.name + ", " + Math.floor(c.from)) +
                ". " +
                markers.filter(function (m) {
                  return m.chapter === c;
                }).length +
                " milestones here."
            );
            stage.classList.remove("is-chapter");
            void stage.offsetWidth;
            stage.classList.add("is-chapter");
          }
        }
        var yr = Math.floor(yearAt(x)),
          sub = c.epi ? "Undated · vision" : (c.region ? c.region + " · " : "") + yr;
        if (chapS.textContent !== sub) chapS.textContent = sub;
        segs.forEach(function (sg, i) {
          var ch = chapters[i],
            f = clamp((maxX - ch.startX) / (ch.endX - ch.startX), 0, 1),
            cur = i === curChap;
          if (sg._f !== f) {
            sg._f = f;
            sg.firstChild.style.transform = "scaleX(" + f.toFixed(3) + ")";
          }
          if (sg._c !== cur) {
            sg._c = cur;
            sg.classList.toggle("is-cur", cur);
            if (cur) sg.setAttribute("aria-current", "true");
            else sg.removeAttribute("aria-current");
          }
        });
        paintHud(initial);
      }
      var lastCollected = null;
      function updateNear() {
        var best = -1,
          bd = 76;
        for (var i = 0; i < markers.length; i++) {
          var d = Math.abs(markers[i].x - x);
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        if (best !== nearM) {
          if (nearM >= 0) markers[nearM].el.classList.remove("is-near");
          nearM = best;
          if (best >= 0) {
            markers[best].el.classList.add("is-near");
            var e = markers[best].e;
            say(
              M.typeName(e.type) +
                ": " +
                e.title +
                (M.when(e) ? ", " + M.when(e) : "") +
                ". Press Enter to inspect."
            );
          }
          padI.hidden = best < 0 || !!openM;
          if (openM && best !== openM.idx) {
            /* leaving handled by closeIfFar */
          }
        }
      }
      function save(force) {
        var t = performance.now();
        if (!force && t - lastSave < 900) return;
        lastSave = t;
        LT.store.set("game.pos", JSON.stringify({ x: Math.round(x), max: Math.round(maxX) }));
      }

      // ---------- 7. Card (inspect) ----------
      function cardHTML(e, isOrb) {
        var ms = (e.metrics || [])
          .slice(0, phone ? 2 : 3)
          .map(function (m) {
            return (
              "<li><b>" + esc(m.value) + "</b><small>" + esc(short(m.meaning, 54)) + "</small></li>"
            );
          })
          .join("");
        var sk = (e.skills || [])
          .slice(0, 5)
          .map(function (s) {
            return "<span>" + esc(s) + "</span>";
          })
          .join("");
        return (
          '<span class="game-card-notch"></span><div class="game-card-h"><span class="game-card-kick" style="--c:' +
          M.typeColor(e.type) +
          '">' +
          esc(M.typeName(e.type)) +
          (e.placeholder ? ' <span class="lt-badge">Placeholder</span>' : "") +
          '</span><button type="button" class="game-card-x" aria-label="Close card">✕</button></div>' +
          "<h3>" +
          esc(e.title) +
          '</h3><p class="game-card-sub">' +
          esc([e.org, e.location, M.when(e)].filter(Boolean).join(" · ")) +
          "</p>" +
          (e.summary ? '<p class="game-card-sum">' + esc(e.summary) + "</p>" : "") +
          (ms ? '<ul class="game-card-ms">' + ms + "</ul>" : "") +
          (sk ? '<div class="game-card-sk">' + sk + "</div>" : "") +
          '<div class="game-card-frame"><span>Photo placeholder</span></div>' +
          '<div class="game-card-act"><button type="button" class="game-btn game-btn-main" data-act="full">Full story</button>' +
          (isOrb
            ? ""
            : '<button type="button" class="game-btn" data-act="next">Next stop ▸</button>') +
          "</div>"
        );
      }
      function openCard(s, isOrb) {
        closeCard(true);
        if (isOrb) openOrb = s;
        else openM = s;
        card.innerHTML = cardHTML(s.e, isOrb);
        card.hidden = false;
        card.classList.toggle("is-orb", !!isOrb);
        card.setAttribute("aria-label", M.typeName(s.e.type) + ": " + s.e.title);
        placeCard();
        requestAnimationFrame(function () {
          card.classList.add("is-open");
        });
        if (!isOrb) {
          s.el.classList.add("is-open");
          padI.hidden = true;
        }
        stage.classList.add("has-card");
        if ((!isOrb && document.activeElement !== document.body) || true) {
          try {
            $('[data-act="full"]', card).focus({ preventScroll: true });
          } catch (e) {
            /* ignore */
          }
        }
        say("Opened " + s.e.title + ". Full story button focused.");
      }
      function closeCard(silent) {
        if (!openM && !openOrb) return;
        if (openM) openM.el.classList.remove("is-open");
        var hadFocus = card.contains(document.activeElement);
        openM = null;
        openOrb = null;
        card.classList.remove("is-open");
        card.hidden = true;
        stage.classList.remove("has-card");
        if (hadFocus && !silent) world.focus({ preventScroll: true });
        if (nearM >= 0) padI.hidden = false;
      }
      function placeCard() {
        var s = openM || openOrb;
        if (!s) return;
        var sx = AX + (s.x - camX),
          cw = card.offsetWidth || 340;
        if (phone) {
          card.style.left = "";
          card.style.bottom = "";
          card.style.setProperty("--nx", clamp(sx, 40, W - 40) + "px");
          return;
        }
        var left = clamp(sx - cw / 2, 14, W - cw - 14);
        card.style.left = left.toFixed(1) + "px";
        card.style.bottom = (H - (pathY(s.x) - (openOrb ? 96 : 118))).toFixed(1) + "px";
        card.style.setProperty("--nx", clamp(sx - left, 24, cw - 24).toFixed(1) + "px");
      }

      // ---------- 8. Movement ----------
      function wake() {
        if (!visible || running) return;
        running = true;
        lastT = 0;
        requestAnimationFrame(tick);
      }
      function hideHello() {
        if (started) return;
        started = true;
        hello.classList.add("is-gone");
        setTimeout(
          function () {
            hello.hidden = true;
          },
          reduced ? 0 : 500
        );
      }
      function nextStop(d, from) {
        var f = from == null ? x : from;
        if (d > 0) {
          for (var i = 0; i < stops.length; i++) if (stops[i].x > f + 12) return stops[i];
          return { x: WORLD_END - 220, end: true };
        }
        for (i = stops.length - 1; i >= 0; i--) if (stops[i].x < f - 12) return stops[i];
        return { x: START_X, start: true };
      }
      function walkTo(px, fast, done) {
        px = clamp(px, WORLD_START, WORLD_END);
        hideHello();
        if (reduced) {
          jumpTo(px, done);
          return;
        }
        target = { x: px, fast: fast, done: done };
        wake();
      }
      function jumpTo(px, done) {
        hideHello();
        target = null;
        v = 0;
        stage.classList.add("is-jump");
        setTimeout(function () {
          x = clamp(px, WORLD_START, WORLD_END);
          camX = x;
          if (x > maxX) maxX = x;
          face = 1;
          refreshProgress(false);
          updateNear();
          closeIfFar();
          drawFrame();
          stage.classList.remove("is-jump");
          save(true);
          if (done) done();
        }, 170);
      }
      function closeIfFar() {
        var s = openM || openOrb;
        if (s && Math.abs(s.x - x) > 150) closeCard();
      }
      function inspectNearest() {
        if (nearM >= 0) {
          var m = markers[nearM];
          if (openM === m) {
            closeCard();
            world.focus({ preventScroll: true });
          } else openCard(m, false);
          return;
        }
        var s = nextStop(1);
        var mk = null;
        for (var i = 0; i < markers.length; i++)
          if (markers[i].x > x + 12) {
            mk = markers[i];
            break;
          }
        if (mk)
          walkTo(mk.x, false, function () {
            updateNear();
            openCard(mk, false);
          });
        else say("No milestone ahead.");
      }
      function step(dt) {
        var vmax, desired;
        if (dragging) {
          v *= 0.8;
        } else if (target) {
          var d = target.x - x;
          vmax = target.fast ? 2200 : 950;
          desired = clamp(d * 3.2, -vmax, vmax);
          v += (desired - v) * (1 - Math.exp(-7 * dt));
          if (Math.abs(d) < 2 && Math.abs(v) < 14) {
            x = target.x;
            v = 0;
            var cb = target.done;
            target = null;
            if (cb) cb();
          }
        } else {
          var dd = padDir || dir;
          desired = dd * (shift ? 780 : 400);
          v += (desired - v) * (1 - Math.exp(-(dd ? 5.2 : 7.5) * dt));
          if (!dd && Math.abs(v) < 4) v = 0;
        }
        x += v * dt;
        if (x < WORLD_START) {
          x = WORLD_START;
          v = Math.max(0, v);
        }
        if (x > WORLD_END) {
          x = WORLD_END;
          v = Math.min(0, v);
        }
        if (v > 8) face = 1;
        else if (v < -8) face = -1;
        phase += Math.abs(v) * dt * 0.021;
        var ct = x + v * 0.22;
        camX += (ct - camX) * (1 - Math.exp(-4.4 * dt));
        if (x > maxX) maxX = x;
      }
      function tick(t) {
        if (!running) return;
        if (!visible) {
          running = false;
          return;
        }
        var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016;
        lastT = t;
        var before = x;
        step(dt);
        if (Math.floor(before) !== Math.floor(x)) {
          refreshProgress(false);
          updateNear();
          closeIfFar();
          save(false);
        } else if (hudBusy) paintHud(false);
        drawFrame();
        if (hudBusy) paintHud(false);
        var idle =
          !dragging &&
          !target &&
          !(padDir || dir) &&
          Math.abs(v) < 0.5 &&
          Math.abs(camX - x) < 0.3 &&
          !hudBusy;
        if (idle) {
          running = false;
          v = 0;
          camX = x;
          drawFrame();
          save(true);
          return;
        }
        requestAnimationFrame(tick);
      }
      function drawFrame() {
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawScene();
        placeEnts();
      }

      // ---------- 9. Sizing and theme ----------
      function resize() {
        var r = stage.getBoundingClientRect();
        W = Math.max(280, Math.round(r.width));
        H = Math.max(420, Math.round(r.height));
        phone = W < 700;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        PB = H * (phone ? 0.6 : 0.74);
        AX = W * (phone ? 0.5 : 0.46);
        SC = clamp(H / 900, 0.62, 1.15);
        if (phone) SC = Math.max(0.7, SC);
        stage.classList.toggle("is-phone", phone);
        drawFrame();
      }
      function setAccent() {
        light = LT.theme() === "light";
        accent.a = light ? "240,100,30" : "255,201,74";
      }
      setAccent();
      LT.onTheme(function () {
        setAccent();
        drawFrame();
      });
      LT.onReducedChange(function (r) {
        reduced = r;
        stage.classList.toggle("is-reduced", r);
        if (r) {
          target = null;
          v = 0;
          camX = x;
          paintHud(true);
        }
        drawFrame();
      });
      stage.classList.toggle("is-reduced", reduced);

      // ---------- 10. Input ----------
      var KDIR = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 },
        held = {};
      function dirNow() {
        return (held[1] ? 1 : 0) - (held[-1] ? 1 : 0);
      }
      function active(e) {
        if (
          !visible ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey ||
          (LT.isDetailOpen && LT.isDetailOpen())
        )
          return false;
        var t = e.target;
        if (
          t &&
          t.closest &&
          t.closest(".lt-dock, .lt-menu, .game-list-wrap, input, textarea, select")
        )
          return false;
        return true;
      }
      addEventListener("keydown", function (e) {
        if (!active(e)) return;
        var k = e.key,
          d = KDIR[k];
        if (d) {
          e.preventDefault();
          hideHello();
          shift = e.shiftKey;
          if (reduced) {
            if (!e.repeat) {
              var s = nextStop(d);
              walkTo(s.x);
            }
            return;
          }
          target = null;
          held[d] = true;
          dir = dirNow();
          wake();
          return;
        }
        if (k === "Shift") {
          shift = true;
          return;
        }
        if (k === "Home") {
          e.preventDefault();
          walkTo(START_X, true);
        } else if (k === "End") {
          e.preventDefault();
          walkTo(WORLD_END - 220, true);
        } else if (k === "PageDown") {
          e.preventDefault();
          walkTo(nextStop(1).x);
        } else if (k === "PageUp") {
          e.preventDefault();
          walkTo(nextStop(-1).x);
        } else if (k === "Escape" && (openM || openOrb)) {
          closeCard();
        } else if (
          (k === "Enter" || k === " ") &&
          !(e.target.closest && e.target.closest("button, a"))
        ) {
          e.preventDefault();
          hideHello();
          inspectNearest();
        }
      });
      addEventListener("keyup", function (e) {
        if (e.key === "Shift") shift = false;
        var d = KDIR[e.key];
        if (d) {
          held[d] = false;
          dir = dirNow();
          wake();
        }
      });
      addEventListener("blur", function () {
        held = {};
        dir = 0;
        padDir = 0;
      });
      LT.whenVisible(stage, function (vis) {
        visible = vis;
        stage.classList.toggle("is-paused", !vis);
        if (vis) {
          held = {};
          dir = 0;
          wake();
        } else {
          running = false;
          save(true);
        }
      });
      addEventListener("pagehide", function () {
        save(true);
      });

      // pointer: drag the world to scrub; taps on markers and orbs
      world.addEventListener("pointerdown", function (e) {
        if (e.button > 0) return;
        drag = {
          id: e.pointerId,
          x0: e.clientX,
          lx: e.clientX,
          lt: performance.now(),
          moved: false,
          vel: 0,
        };
      });
      world.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.lx,
          now = performance.now();
        if (!drag.moved && Math.abs(e.clientX - drag.x0) > 7) {
          drag.moved = true;
          dragging = true;
          target = null;
          hideHello();
          try {
            world.setPointerCapture(e.pointerId);
          } catch (er) {
            /* ignore */
          }
          world.classList.add("is-drag");
        }
        if (!drag.moved) return;
        var dt = Math.max(1, now - drag.lt);
        drag.vel = drag.vel * 0.6 + (-dx / dt) * 1000 * 0.4;
        drag.lx = e.clientX;
        drag.lt = now;
        x = clamp(x - dx, WORLD_START, WORLD_END);
        if (dx) face = dx < 0 ? 1 : -1;
        phase += Math.abs(dx) * 0.021;
        if (x > maxX) maxX = x;
        if (reduced) {
          camX = x;
          refreshProgress(false);
          updateNear();
          closeIfFar();
          drawFrame();
        } else {
          v = 0;
          refreshProgress(false);
          updateNear();
          closeIfFar();
          wake();
        }
      });
      function endDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        if (drag.moved) {
          dragging = false;
          world.classList.remove("is-drag");
          if (!reduced) {
            v = clamp(drag.vel, -1500, 1500);
          }
          save(true);
          wake();
        }
        drag = null;
      }
      world.addEventListener("pointerup", endDrag);
      world.addEventListener("pointercancel", endDrag);

      ents.addEventListener("click", function (e) {
        var mk = e.target.closest(".game-mk"),
          orb = e.target.closest(".game-orb");
        hideHello();
        if (mk) {
          var m = markers[+mk.dataset.i];
          if (Math.abs(m.x - x) < 80) {
            if (openM === m) closeCard();
            else openCard(m, false);
          } else {
            closeCard();
            walkTo(m.x, false, function () {
              updateNear();
              openCard(m, false);
            });
          }
        } else if (orb) {
          var o = orbs[+orb.dataset.i];
          if (o.got) {
            if (openOrb === o) closeCard();
            else openCard(o, true);
          }
        } else if (e.target.closest(".game-gate")) {
          var gi = gateEls.filter(function (q) {
            return q.el === e.target.closest(".game-gate");
          })[0];
          if (gi) walkTo(gi.c.gateX + 40, false);
        }
      });
      card.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        if (b.classList.contains("game-card-x")) {
          closeCard();
          return;
        }
        var s = openM || openOrb;
        if (!s) return;
        if (b.dataset.act === "full") LT.openDetail(s.e.id);
        else if (b.dataset.act === "next") {
          var nx = nextStop(1, s.x);
          closeCard(true);
          walkTo(nx.x, false, function () {
            updateNear();
            world.focus({ preventScroll: true });
          });
        }
      });
      stage.addEventListener("pointerdown", function (e) {
        if (!e.target.closest(".game-hello")) {
          /* touching the world starts the quest */ if (e.target.closest(".game-world"))
            hideHello();
        }
      });
      $(".game-start").addEventListener("click", function () {
        hideHello();
        world.focus({ preventScroll: true });
      });
      var rs = $(".game-restart");
      if (rs)
        rs.addEventListener("click", function () {
          maxX = START_X;
          x = camX = START_X;
          collectPtr = 0;
          orbs.forEach(function (o) {
            o.got = false;
            o.el.className = "game-orb";
            o.el.removeAttribute("title");
          });
          HUD.forEach(function (h) {
            disp[h.k] = 0;
          });
          refreshProgress(true);
          updateNear();
          drawFrame();
          save(true);
          hideHello();
        });
      segs.forEach(function (sg) {
        sg.addEventListener("click", function () {
          closeCard();
          walkTo(chapters[+sg.dataset.i].gateX + 40, true);
        });
      });
      // on-screen pad: hold to walk, tap for previous/next stop
      [].forEach.call(root.querySelectorAll(".game-pad-b"), function (b) {
        var d = +b.dataset.d,
          tapped = false;
        b.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          hideHello();
          tapped = true;
          padT0 = performance.now();
          if (reduced) return;
          target = null;
          padDir = d;
          wake();
          try {
            b.setPointerCapture(e.pointerId);
          } catch (er) {
            /* ignore */
          }
        });
        var up = function () {
          if (!tapped) return;
          tapped = false;
          padDir = 0;
          if (performance.now() - padT0 < 230) {
            var s = nextStop(d);
            walkTo(s.x);
          } else wake();
        };
        b.addEventListener("pointerup", up);
        b.addEventListener("pointercancel", function () {
          tapped = false;
          padDir = 0;
          wake();
        });
        b.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            hideHello();
            walkTo(nextStop(d).x);
          }
        });
      });
      padI.addEventListener("click", function () {
        inspectNearest();
      });

      // skip to list
      function showList(on) {
        listWrap.hidden = !on;
        skipBtn.textContent = on ? "Back to the game" : "Skip to list";
        skipBtn.setAttribute("aria-expanded", on);
        if (on) {
          var host = $(".game-list");
          if (!host.childNodes.length) LT.listView(host, {});
          listWrap.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
          var h2 = $("h2", listWrap);
          h2.tabIndex = -1;
          h2.focus({ preventScroll: true });
        } else {
          scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
          skipBtn.focus({ preventScroll: true });
        }
      }
      skipBtn.setAttribute("aria-controls", "game-list");
      skipBtn.setAttribute("aria-expanded", "false");
      skipBtn.addEventListener("click", function () {
        showList(listWrap.hidden);
      });
      $(".game-back").addEventListener("click", function () {
        showList(false);
      });

      // ---------- 11. Go ----------
      new ResizeObserver(function () {
        resize();
      }).observe(stage);
      resize();
      refreshProgress(true);
      updateNear();
      if (hasSave) {
        hello.classList.add("is-gone");
        hello.hidden = true;
      }
      say(
        "Quest ready. Walk with the arrow keys; " +
          markers.length +
          " milestones and " +
          orbs.length +
          " collectibles along the way."
      );
      paintHud(true);
    },
  });
})();
