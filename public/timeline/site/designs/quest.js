/* Design "quest": Overworld. A top-down, softly lit map of a life. Each city is an island laid out in
   the real city order; every story is an object you can find (books, buildings, crystals, trophies).
   Collecting a region's milestones lights the bridge to the next city. Canvas 2D draws the world;
   the HUD, cards, menus and prompts are real DOM. One rAF loop, paused offscreen. Original art only.
   All numbers come from the data model (LT.model), nothing is invented. */
(function () {
  "use strict";
  LT.define("quest", {
    mount: function (root, M, LT) {
      var esc = M.esc,
        NOW = M.NOW,
        reduced = LT.reduced();
      var SAVE_KEY = "quest.v1";
      var TAU = Math.PI * 2;
      var clamp = function (v, a, b) {
        return Math.max(a, Math.min(b, v));
      };
      var lerp = function (a, b, t) {
        return a + (b - a) * t;
      };
      var short = function (s, n) {
        s = String(s || "");
        return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
      };
      function rng(seed) {
        var a = seed >>> 0;
        return function () {
          a = (a + 0x6d2b79f5) >>> 0;
          var t = a;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      function mix(hex, to, k) {
        var a = parseInt(hex.slice(1), 16),
          b = parseInt(to.slice(1), 16);
        var r = Math.round(lerp(a >> 16, b >> 16, k)),
          g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)),
          bl = Math.round(lerp(a & 255, b & 255, k));
        return "rgb(" + r + "," + g + "," + bl + ")";
      }
      function rr(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
      }

      // ---------- 1. World model ----------
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
      var SHAPE = {
        education: "book",
        role: "building",
        project: "crystal",
        achievement: "trophy",
        story: "scroll",
        publication: "scroll",
        talk: "scroll",
        "life-event": "flag",
        vision: "star",
        volunteering: "heart",
      };
      var SHAPE_NAME = {
        book: "Book",
        building: "Building",
        crystal: "Crystal",
        trophy: "Trophy",
        scroll: "Scroll",
        flag: "Flag",
        star: "Star",
        heart: "Heart",
      };
      function score(e) {
        if (e.type === "project")
          return e.metrics && e.metrics.length ? 70 + Math.min(5, e.metrics.length) : 0;
        return PRI[e.type] || 0;
      }
      var ord = function (e) {
        return M.ORDER.indexOf(e.type);
      };

      var regs = [],
        objs = [],
        objById = {};
      var nCities = M.chapters.filter(function (c) {
        return !c.epi;
      }).length;
      M.chapters.forEach(function (c, i) {
        var list = c.stories.slice().sort(function (a, b) {
          return (a._w == null ? 1e9 : a._w) - (b._w == null ? 1e9 : b._w) || ord(a) - ord(b);
        });
        var ranked = list
          .map(function (e, k) {
            return { e: e, s: score(e), k: k };
          })
          .filter(function (o) {
            return o.s > 0;
          })
          .sort(function (a, b) {
            return b.s - a.s || a.k - b.k;
          })
          .slice(0, 4);
        if (!ranked.length && list.length)
          ranked = list.slice(0, 2).map(function (e) {
            return { e: e };
          });
        var req = {};
        ranked.forEach(function (o) {
          req[o.e.id] = 1;
        });
        var reg = {
          i: i,
          c: c,
          name: c.name,
          objs: [],
          reqN: 0,
          unlocked: false,
          gate: null,
          visited: false,
        };
        list.forEach(function (e) {
          var o = {
            e: e,
            reg: reg,
            req: !!req[e.id],
            got: false,
            shape: SHAPE[e.type] || "orb",
            col: M.typeColor(e.type),
            ph: (objs.length * 1.7) % TAU,
            x: 0,
            y: 0,
          };
          reg.objs.push(o);
          objs.push(o);
          objById[e.id] = o;
          if (o.req) reg.reqN++;
        });
        var n = reg.objs.length;
        reg.R = Math.max(185, (34 * Math.sqrt(n + 6) + 80) / 0.8);
        var r = rng(1000 + i * 77);
        reg.p1 = r() * TAU;
        reg.p2 = r() * TAU;
        reg.p3 = r() * TAU;
        reg.seed = 500 + i * 31;
        reg.hue = 140 + ((i * 23) % 80);
        regs.push(reg);
      });
      var NR = regs.length,
        maxR = 0;
      regs.forEach(function (g) {
        maxR = Math.max(maxR, g.R);
      });
      // serpentine layout: three columns, rows snake back and forth in real city order
      var COLS = 3,
        CELL = 2 * maxR + 210,
        jr = rng(42);
      regs.forEach(function (g, i) {
        var row = Math.floor(i / COLS),
          k = i % COLS,
          col = row % 2 === 0 ? k : COLS - 1 - k;
        g.cx = col * CELL + (jr() - 0.5) * 90;
        g.cy = row * CELL * 0.92 + (jr() - 0.5) * 90;
      });
      var rad = function (g, th) {
        return (
          g.R *
          (1 +
            0.07 * Math.sin(3 * th + g.p1) +
            0.045 * Math.sin(5 * th + g.p2) +
            0.03 * Math.sin(2 * th + g.p3))
        );
      };
      var edge = function (g, ang, f) {
        var r = rad(g, ang) * f;
        return { x: g.cx + Math.cos(ang) * r, y: g.cy + Math.sin(ang) * r };
      };
      // bridges and gates
      regs.forEach(function (g, i) {
        var nx = regs[i + 1],
          pv = regs[i - 1];
        g.inAng = pv ? Math.atan2(pv.cy - g.cy, pv.cx - g.cx) : null;
        g.outAng = nx ? Math.atan2(nx.cy - g.cy, nx.cx - g.cx) : null;
        if (g.inAng == null && g.outAng != null) g.inAng = g.outAng + Math.PI;
        if (nx) {
          var a = Math.atan2(nx.cy - g.cy, nx.cx - g.cx);
          g.bridge = {
            A: edge(g, a, 0.8),
            B: edge(nx, a + Math.PI, 0.8),
            G: edge(g, a, 0.95),
            ang: a,
          };
          g.bridge.len = Math.hypot(g.bridge.B.x - g.bridge.A.x, g.bridge.B.y - g.bridge.A.y);
        }
        g.entry = edge(g, g.inAng == null ? Math.PI : g.inAng, 0.72);
        g.exitP = g.outAng != null ? edge(g, g.outAng, 0.72) : null;
        g.spawn = edge(g, g.inAng == null ? Math.PI : g.inAng, 0.64);
      });
      // place objects: Fermat spiral outward in time order, skipping the entry / exit plazas
      regs.forEach(function (g) {
        var k = 0,
          c0 = 34,
          rot = g.p1,
          placed = 0,
          guard = 0;
        while (placed < g.objs.length && guard++ < 4000) {
          var rr_ = c0 * Math.sqrt(k + 0.7),
            th = k * 2.39996 + rot;
          k++;
          var x = g.cx + Math.cos(th) * rr_,
            y = g.cy + Math.sin(th) * rr_;
          if (Math.hypot(x - g.entry.x, y - g.entry.y) < 76) continue;
          if (g.exitP && Math.hypot(x - g.exitP.x, y - g.exitP.y) < 76) continue;
          if (Math.hypot(x - g.cx, y - g.cy) > rad(g, Math.atan2(y - g.cy, x - g.cx)) * 0.8)
            continue;
          var o = g.objs[placed++];
          o.x = x;
          o.y = y;
        }
      });
      var minX = 1e9,
        maxX = -1e9,
        minY = 1e9,
        maxY = -1e9;
      regs.forEach(function (g) {
        minX = Math.min(minX, g.cx - g.R * 1.25);
        maxX = Math.max(maxX, g.cx + g.R * 1.25);
        minY = Math.min(minY, g.cy - g.R * 1.3);
        maxY = Math.max(maxY, g.cy + g.R * 1.25);
      });

      // totals for the stat sheet
      var skillTotal = {};
      objs.forEach(function (o) {
        (o.e.skills || []).forEach(function (s) {
          skillTotal[String(s).toLowerCase()] = 1;
        });
      });
      var totSkills = Object.keys(skillTotal).length,
        totRoles = objs.filter(function (o) {
          return o.e.type === "role";
        }).length;
      function merge(spans) {
        spans.sort(function (a, b) {
          return a[0] - b[0];
        });
        var m = [];
        spans.forEach(function (s) {
          var l = m[m.length - 1];
          if (l && s[0] <= l[1]) l[1] = Math.max(l[1], s[1]);
          else m.push([s[0], s[1]]);
        });
        return m;
      }
      var roleSpan = function (o) {
        return o.e.start
          ? [M.num(o.e.start), !o.e.end || o.e.end === "present" ? NOW : M.num(o.e.end)]
          : null;
      };
      var totSpan = merge(
        objs
          .filter(function (o) {
            return o.e.type === "role";
          })
          .map(roleSpan)
          .filter(Boolean)
      ).reduce(function (a, s) {
        return a + s[1] - s[0];
      }, 0);
      var FT =
        M.experience && typeof M.experience.full_time_years === "number"
          ? M.experience.full_time_years
          : null;

      // ---------- 2. State + persistence ----------
      var state = { got: {}, vis: {}, x: 0, y: 0 };
      var hadSave = false;
      try {
        var sv = JSON.parse(LT.store.get(SAVE_KEY) || "null");
        if (sv && typeof sv === "object") {
          (sv.got || []).forEach(function (id) {
            if (objById[id]) state.got[id] = 1;
          });
          (sv.vis || []).forEach(function (i) {
            if (regs[i]) state.vis[i] = 1;
          });
          if (typeof sv.x === "number" && typeof sv.y === "number") {
            state.x = sv.x;
            state.y = sv.y;
            hadSave = Object.keys(state.got).length > 0;
          }
        }
      } catch (e) {
        /* corrupt save: start fresh */
      }
      objs.forEach(function (o) {
        if (state.got[o.e.id]) o.got = true;
      });
      function save() {
        try {
          LT.store.set(
            SAVE_KEY,
            JSON.stringify({
              got: Object.keys(state.got),
              vis: Object.keys(state.vis).map(Number),
              x: Math.round(P.x),
              y: Math.round(P.y),
            })
          );
        } catch (e) {
          /* storage blocked */
        }
      }
      function gotCount(g) {
        var n = 0;
        g.objs.forEach(function (o) {
          if (o.req && o.got) n++;
        });
        return n;
      }
      function refreshUnlocks(initial, ts) {
        var opened = [];
        regs.forEach(function (g) {
          if (g.unlocked) return;
          if (g.bridge && gotCount(g) >= g.reqN) {
            g.unlocked = true;
            g.gate = { t0: initial ? -9e9 : ts };
            if (!initial) opened.push(g);
          }
        });
        return opened;
      }
      // the last region has no bridge; "unlocked" just means its milestones are done
      regs.forEach(function (g) {
        if (!g.bridge && gotCount(g) >= g.reqN) g.unlocked = true;
      });

      // ---------- 3. DOM ----------
      var ICO_TYPES = {};
      objs.forEach(function (o) {
        ICO_TYPES[o.e.type] = 1;
      });
      root.innerHTML =
        '<div class="q-app"><div class="q-stage" id="q-stage">' +
        '<canvas class="q-canvas" role="img" aria-label="Overworld map of the timeline. Use the View all list for a text version."></canvas>' +
        '<div class="q-hud"><div class="q-top">' +
        '<div class="q-chip q-region" aria-live="polite"><div class="q-rn"><b class="q-rname"></b><small class="q-ryears"></small></div><div class="q-rg"><span class="q-pips"></span><small class="q-gtxt"></small></div></div>' +
        '<div class="q-actions"><button type="button" class="q-btn" data-act="log" aria-expanded="false">Quest log</button><button type="button" class="q-btn" data-act="travel" aria-expanded="false">Fast travel</button><button type="button" class="q-btn" data-act="all">View all</button></div>' +
        '</div><div class="q-stats" role="list"></div>' +
        '<canvas class="q-mini" aria-hidden="true"></canvas></div>' +
        '<button type="button" class="q-prompt" hidden></button><div class="q-toasts" role="status" aria-live="polite"></div><div class="q-banner" aria-hidden="true"></div>' +
        '<div class="q-card" role="dialog" aria-label="Quest card" hidden></div>' +
        '<div class="q-stick" aria-hidden="true"><i></i></div><button type="button" class="q-act" disabled aria-label="Open nearby item">Open</button>' +
        '<div class="q-hint"></div>' +
        '<aside class="q-drawer" role="dialog" aria-label="Quest log" hidden></aside><div class="q-menu" role="menu" aria-label="Fast travel" hidden></div>' +
        '<section class="q-all" role="dialog" aria-label="All stories" hidden><div class="q-all-bar"><b>All stories</b><small>The whole timeline as a plain list</small><button type="button" class="q-btn q-all-x">Back to the map</button></div><div class="q-all-body"></div></section>' +
        '<div class="q-fade"></div></div></div>';
      var $ = function (s) {
        return root.querySelector(s);
      };
      var stage = $(".q-stage"),
        cv = $(".q-canvas"),
        cx = cv.getContext("2d"),
        mini = $(".q-mini"),
        mx = mini.getContext("2d");
      var elPrompt = $(".q-prompt"),
        elToasts = $(".q-toasts"),
        elBanner = $(".q-banner"),
        elCard = $(".q-card"),
        elStick = $(".q-stick"),
        elAct = $(".q-act"),
        elHint = $(".q-hint"),
        elDrawer = $(".q-drawer"),
        elMenu = $(".q-menu"),
        elAll = $(".q-all"),
        elFade = $(".q-fade"),
        elStats = $(".q-stats");
      var touch = "ontouchstart" in window || matchMedia("(pointer: coarse)").matches;
      stage.classList.toggle("is-touch", touch);

      // stat sheet
      var STATS = [
        {
          k: "exp",
          label: "Experience",
          unit: "yrs",
          dec: 1,
          tip:
            "Full-time experience, pro-rated by the roles you have collected. It ends at the computed total (" +
            (FT == null ? "unknown" : FT + " yrs") +
            ").",
        },
        { k: "cities", label: "Cities", tot: nCities, tip: "Home cities you have walked into." },
        {
          k: "roles",
          label: "Roles",
          tot: totRoles,
          tip: "Jobs and internships you have collected.",
        },
        {
          k: "skills",
          label: "Skills",
          tot: totSkills,
          tip: "Distinct skills named by the things you have collected.",
        },
        {
          k: "found",
          label: "Collected",
          tot: objs.length,
          tip: "Stories found so far, out of every object on the map.",
        },
      ];
      elStats.innerHTML = STATS.map(function (s) {
        return (
          '<div class="q-stat" role="listitem" tabindex="0" data-k="' +
          s.k +
          '" title="' +
          esc(s.tip) +
          '"><b><span class="q-v">0</span>' +
          (s.unit ? "<i>" + s.unit + "</i>" : "") +
          "</b><small>" +
          s.label +
          "</small></div>"
        );
      }).join("");
      var disp = {},
        tgt = {};
      STATS.forEach(function (s) {
        disp[s.k] = 0;
        tgt[s.k] = 0;
        s.el = elStats.querySelector('[data-k="' + s.k + '"]');
        s.vEl = s.el.querySelector(".q-v");
        s.shown = "";
      });
      function computeTargets() {
        var skills = {},
          roleSp = [],
          roles = 0,
          found = 0;
        objs.forEach(function (o) {
          if (!o.got) return;
          found++;
          (o.e.skills || []).forEach(function (s) {
            skills[String(s).toLowerCase()] = 1;
          });
          if (o.e.type === "role") {
            roles++;
            var sp = roleSpan(o);
            if (sp) roleSp.push(sp);
          }
        });
        var got = merge(roleSp).reduce(function (a, s) {
          return a + s[1] - s[0];
        }, 0);
        tgt.exp = FT == null || !totSpan ? null : (FT * got) / totSpan;
        tgt.cities = regs.filter(function (g) {
          return !g.c.epi && state.vis[g.i];
        }).length;
        tgt.roles = roles;
        tgt.skills = Object.keys(skills).length;
        tgt.found = found;
      }

      // ---------- 4. Palette (day / night follow the theme) ----------
      var pal, night;
      function setPalette() {
        night = LT.theme() !== "light";
        pal = night
          ? {
              seaA: "#0a1a3a",
              seaB: "#050a1c",
              wave: "190,215,255",
              shallow: "rgba(70,150,190,.20)",
              shallow2: "rgba(90,190,210,.22)",
              sand: "#2a4a52",
              accent: "#ffbf47",
              grassL: 0.27,
              grassS: 0.36,
              trail: "rgba(210,190,140,.20)",
              label: "rgba(235,242,255,.92)",
              sub: "rgba(190,205,235,.78)",
              bridge: "#3b4a68",
              bridgeEdge: "#1b2640",
              plank: "rgba(255,255,255,.07)",
              ghost: "rgba(170,200,255,.38)",
              shadow: "rgba(0,0,0,.35)",
              vig: "rgba(2,4,14,.58)",
              tree: ["#0f3d37", "#14504a", "#0c312e"],
              rock: "#51647a",
              flower: ["#ffd27a", "#f6a8c9", "#9be3f5"],
            }
          : {
              seaA: "#d4e8e2",
              seaB: "#e9efdf",
              wave: "40,100,110",
              shallow: "rgba(120,200,205,.30)",
              shallow2: "rgba(150,215,210,.36)",
              sand: "#efdfb5",
              accent: "#c2410c",
              grassL: 0.62,
              grassS: 0.42,
              trail: "rgba(160,120,70,.28)",
              label: "rgba(40,32,20,.92)",
              sub: "rgba(90,76,55,.85)",
              bridge: "#c9a574",
              bridgeEdge: "#8a6a40",
              plank: "rgba(80,50,20,.22)",
              ghost: "rgba(60,90,100,.42)",
              shadow: "rgba(60,40,20,.22)",
              vig: "rgba(120,80,30,.20)",
              tree: ["#4f9a5a", "#3f8450", "#5fae68"],
              rock: "#9a9486",
              flower: ["#e8590c", "#d6336c", "#7048e8"],
            };
        regs.forEach(function (g) {
          g.img = null;
        });
      }
      setPalette();

      // ---------- 5. Baked islands ----------
      var BS = 1.5;
      function islandPath(c, g, f) {
        c.beginPath();
        for (var k = 0; k <= 96; k++) {
          var th = (k / 96) * TAU,
            r = rad(g, th) * f;
          var x = Math.cos(th) * r,
            y = Math.sin(th) * r;
          if (k) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.closePath();
      }
      function bake(g) {
        var pad = 80,
          w = Math.ceil(2 * (g.R * 1.2 + pad)),
          cvs = document.createElement("canvas");
        cvs.width = cvs.height = Math.round(w * BS);
        var c = cvs.getContext("2d");
        c.scale(BS, BS);
        c.translate(w / 2, w / 2);
        var r = rng(g.seed),
          hue = g.hue;
        islandPath(c, g, 1.16);
        c.fillStyle = pal.shallow;
        c.fill();
        islandPath(c, g, 1.08);
        c.fillStyle = pal.shallow2;
        c.fill();
        islandPath(c, g, 1.0);
        c.fillStyle = pal.sand;
        c.fill();
        var gr = c.createRadialGradient(-g.R * 0.15, -g.R * 0.2, g.R * 0.1, 0, 0, g.R);
        gr.addColorStop(
          0,
          "hsl(" +
            hue +
            "," +
            Math.round(pal.grassS * 100) +
            "%," +
            Math.round((pal.grassL + 0.06) * 100) +
            "%)"
        );
        gr.addColorStop(
          1,
          "hsl(" +
            (hue - 8) +
            "," +
            Math.round(pal.grassS * 100) +
            "%," +
            Math.round((pal.grassL - 0.05) * 100) +
            "%)"
        );
        islandPath(c, g, 0.93);
        c.fillStyle = gr;
        c.fill();
        // trail from entry through the middle to the exit
        c.save();
        c.translate(g.cx, g.cy);
        c.beginPath();
        var en = g.entry,
          ex = g.exitP || {
            x: g.cx + Math.cos(g.inAng + Math.PI) * g.R * 0.5,
            y: g.cy + Math.sin(g.inAng + Math.PI) * g.R * 0.5,
          };
        c.moveTo(en.x - g.cx, en.y - g.cy);
        c.quadraticCurveTo(
          Math.sin(g.p1) * g.R * 0.3,
          Math.cos(g.p2) * g.R * 0.3,
          ex.x - g.cx,
          ex.y - g.cy
        );
        c.lineWidth = 26;
        c.lineCap = "round";
        c.strokeStyle = pal.trail;
        c.stroke();
        c.restore();
        // flowers and tufts (not blocking)
        for (var k = 0; k < 70; k++) {
          var th = r() * TAU,
            d = Math.sqrt(r()) * 0.86,
            rd = rad(g, th) * d,
            x = Math.cos(th) * rd,
            y = Math.sin(th) * rd;
          var near = g.objs.some(function (o) {
            return Math.hypot(o.x - g.cx - x, o.y - g.cy - y) < 30;
          });
          if (near) continue;
          if (r() < 0.55) {
            c.fillStyle = pal.flower[Math.floor(r() * 3)];
            c.globalAlpha = night ? 0.75 : 0.9;
            c.beginPath();
            c.arc(x, y, 1.6 + r() * 1.4, 0, TAU);
            c.fill();
            c.globalAlpha = 1;
          } else {
            c.strokeStyle = "hsla(" + hue + ",40%," + (night ? 40 : 34) + "%,.6)";
            c.lineWidth = 1.4;
            c.beginPath();
            c.moveTo(x - 3, y + 2);
            c.lineTo(x - 1, y - 3);
            c.moveTo(x, y + 2);
            c.lineTo(x + 1, y - 4);
            c.moveTo(x + 3, y + 2);
            c.lineTo(x + 2, y - 2);
            c.stroke();
          }
        }
        // rocks
        for (k = 0; k < 7; k++) {
          th = r() * TAU;
          rd = rad(g, th) * (0.45 + r() * 0.4);
          x = Math.cos(th) * rd;
          y = Math.sin(th) * rd;
          if (
            g.objs.some(function (o) {
              return Math.hypot(o.x - g.cx - x, o.y - g.cy - y) < 36;
            })
          )
            continue;
          c.fillStyle = pal.shadow;
          c.beginPath();
          c.ellipse(x + 2, y + 5, 9, 4, 0, 0, TAU);
          c.fill();
          c.fillStyle = pal.rock;
          c.beginPath();
          c.ellipse(x, y, 8, 6, 0.3, 0, TAU);
          c.fill();
          c.fillStyle = "rgba(255,255,255,.16)";
          c.beginPath();
          c.ellipse(x - 2, y - 2, 4, 2.4, 0.3, 0, TAU);
          c.fill();
        }
        // trees ring the shore (outside the walkable area)
        var nt = Math.round(g.R / 7);
        for (k = 0; k < nt; k++) {
          th = (k / nt) * TAU + (r() - 0.5) * 0.12;
          rd = rad(g, th) * (0.93 + r() * 0.035);
          x = Math.cos(th) * rd;
          y = Math.sin(th) * rd;
          if (g.bridge && Math.abs(angDiff(th, g.bridge.ang)) < 0.2) continue;
          if (g.inAng != null && Math.abs(angDiff(th, g.inAng)) < 0.2) continue;
          var s = 9 + r() * 7;
          c.fillStyle = pal.shadow;
          c.beginPath();
          c.ellipse(x + 3, y + s * 0.9, s * 0.95, s * 0.5, 0, 0, TAU);
          c.fill();
          c.fillStyle = pal.tree[0];
          c.beginPath();
          c.arc(x, y, s, 0, TAU);
          c.fill();
          c.fillStyle = pal.tree[1];
          c.beginPath();
          c.arc(x - s * 0.25, y - s * 0.25, s * 0.68, 0, TAU);
          c.fill();
          c.fillStyle = pal.tree[2];
          c.globalAlpha = 0.55;
          c.beginPath();
          c.arc(x + s * 0.3, y + s * 0.3, s * 0.4, 0, TAU);
          c.fill();
          c.globalAlpha = 1;
        }
        g.img = cvs;
        g.imgW = w;
      }
      function angDiff(a, b) {
        var d = (a - b) % TAU;
        if (d > Math.PI) d -= TAU;
        if (d < -Math.PI) d += TAU;
        return d;
      }

      // sea shimmer marks
      var waves = [],
        wr = rng(7);
      for (var wi = 0; wi < 240; wi++)
        waves.push({
          x: lerp(minX - 400, maxX + 400, wr()),
          y: lerp(minY - 400, maxY + 400, wr()),
          ph: wr() * TAU,
          w: 14 + wr() * 22,
        });

      // ---------- 6. Object art (all drawn with code) ----------
      function drawShape(c, shape, col, t, ph, dim) {
        var dk = mix(col, "#000000", 0.35),
          lt = mix(col, "#ffffff", 0.45);
        c.lineJoin = "round";
        c.lineCap = "round";
        if (shape === "book") {
          c.rotate(-0.1);
          c.fillStyle = dk;
          rr(c, -16, -12, 34, 26, 4);
          c.fill();
          c.fillStyle = "#f6eedb";
          rr(c, -14, -13, 31, 24, 3);
          c.fill();
          c.fillStyle = col;
          rr(c, -16, -14, 32, 25, 4);
          c.fill();
          c.fillStyle = dk;
          rr(c, -16, -14, 7, 25, 3);
          c.fill();
          c.fillStyle = "rgba(255,255,255,.7)";
          c.fillRect(-4, -7, 15, 2.4);
          c.fillRect(-4, -2, 11, 2.4);
          c.fillStyle = "#ffbf47";
          c.beginPath();
          c.moveTo(8, 11);
          c.lineTo(8, 17);
          c.lineTo(11, 14.5);
          c.lineTo(14, 17);
          c.lineTo(14, 11);
          c.fill();
        } else if (shape === "building") {
          c.fillStyle = col;
          rr(c, -16, -6, 32, 22, 2);
          c.fill();
          c.fillStyle = dk;
          c.beginPath();
          c.moveTo(-21, -5);
          c.lineTo(0, -22);
          c.lineTo(21, -5);
          c.closePath();
          c.fill();
          c.fillStyle = lt;
          c.globalAlpha = 0.35;
          c.beginPath();
          c.moveTo(0, -22);
          c.lineTo(21, -5);
          c.lineTo(0, -5);
          c.closePath();
          c.fill();
          c.globalAlpha = 1;
          c.fillStyle = dk;
          rr(c, -3.5, 5, 7, 11, 1.5);
          c.fill();
          c.fillStyle = dim ? "#d9cfae" : "#ffe9a8";
          c.fillRect(-12, 0, 6, 6);
          c.fillRect(7, 0, 6, 6);
        } else if (shape === "crystal") {
          var by = Math.sin(t * 1.8 + ph) * 3;
          c.translate(0, by - 4);
          c.fillStyle = col;
          c.beginPath();
          c.moveTo(0, -20);
          c.lineTo(13, -6);
          c.lineTo(9, 13);
          c.lineTo(0, 20);
          c.lineTo(-9, 13);
          c.lineTo(-13, -6);
          c.closePath();
          c.fill();
          c.fillStyle = "rgba(255,255,255,.42)";
          c.beginPath();
          c.moveTo(0, -20);
          c.lineTo(13, -6);
          c.lineTo(0, -2);
          c.closePath();
          c.fill();
          c.fillStyle = "rgba(255,255,255,.18)";
          c.beginPath();
          c.moveTo(0, -20);
          c.lineTo(-13, -6);
          c.lineTo(0, -2);
          c.closePath();
          c.fill();
          c.fillStyle = "rgba(0,0,0,.26)";
          c.beginPath();
          c.moveTo(-13, -6);
          c.lineTo(0, -2);
          c.lineTo(0, 20);
          c.lineTo(-9, 13);
          c.closePath();
          c.fill();
          c.fillStyle = "rgba(0,0,0,.12)";
          c.beginPath();
          c.moveTo(13, -6);
          c.lineTo(0, -2);
          c.lineTo(0, 20);
          c.lineTo(9, 13);
          c.closePath();
          c.fill();
        } else if (shape === "trophy") {
          c.strokeStyle = dk;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(-12, -8, 6, Math.PI * 0.5, Math.PI * 1.5);
          c.stroke();
          c.beginPath();
          c.arc(12, -8, 6, -Math.PI * 0.5, Math.PI * 0.5);
          c.stroke();
          c.fillStyle = col;
          c.beginPath();
          c.moveTo(-11, -17);
          c.lineTo(11, -17);
          c.quadraticCurveTo(11, -1, 3, 1);
          c.lineTo(-3, 1);
          c.quadraticCurveTo(-11, -1, -11, -17);
          c.fill();
          c.fillStyle = "rgba(255,255,255,.4)";
          c.fillRect(-7, -15, 3, 10);
          c.fillStyle = dk;
          c.fillRect(-2.5, 1, 5, 8);
          rr(c, -9, 9, 18, 6, 2);
          c.fill();
        } else if (shape === "scroll") {
          c.rotate(0.12);
          c.fillStyle = "#f5ecd4";
          rr(c, -14, -11, 28, 22, 3);
          c.fill();
          c.fillStyle = col;
          c.beginPath();
          c.arc(-14, 0, 5, 0, TAU);
          c.fill();
          c.beginPath();
          c.arc(14, 0, 5, 0, TAU);
          c.fill();
          c.fillStyle = dk;
          c.beginPath();
          c.arc(-14, 0, 2, 0, TAU);
          c.fill();
          c.beginPath();
          c.arc(14, 0, 2, 0, TAU);
          c.fill();
          c.fillStyle = "rgba(60,45,25,.55)";
          c.fillRect(-9, -5, 18, 2);
          c.fillRect(-9, 0, 14, 2);
          c.fillRect(-9, 5, 16, 2);
        } else if (shape === "flag") {
          c.strokeStyle = "#c9c2b0";
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(-8, 16);
          c.lineTo(-8, -18);
          c.stroke();
          c.fillStyle = col;
          c.beginPath();
          c.moveTo(-7, -18);
          c.quadraticCurveTo(4, -14, 14, -17);
          c.lineTo(10, -8);
          c.lineTo(14, 0);
          c.quadraticCurveTo(4, -3, -7, 0);
          c.closePath();
          c.fill();
        } else if (shape === "star") {
          c.translate(0, Math.sin(t * 1.5 + ph) * 2.5);
          c.fillStyle = col;
          c.beginPath();
          for (var k = 0; k < 10; k++) {
            var rd = k % 2 ? 8 : 19,
              an = -Math.PI / 2 + (k * Math.PI) / 5;
            c[k ? "lineTo" : "moveTo"](Math.cos(an) * rd, Math.sin(an) * rd);
          }
          c.closePath();
          c.fill();
          c.fillStyle = "rgba(255,255,255,.35)";
          c.beginPath();
          c.arc(-3, -4, 4, 0, TAU);
          c.fill();
        } else if (shape === "heart") {
          c.fillStyle = col;
          c.beginPath();
          c.moveTo(0, 14);
          c.bezierCurveTo(-24, -2, -12, -22, 0, -9);
          c.bezierCurveTo(12, -22, 24, -2, 0, 14);
          c.fill();
          c.fillStyle = "rgba(255,255,255,.38)";
          c.beginPath();
          c.arc(-7, -8, 3.4, 0, TAU);
          c.fill();
        } else {
          c.fillStyle = col;
          c.beginPath();
          c.arc(0, 0, 11, 0, TAU);
          c.fill();
        }
      }
      function icon(canvas, o) {
        var c = canvas.getContext("2d"),
          s = canvas.width;
        c.clearRect(0, 0, s, s);
        c.save();
        c.translate(s / 2, s / 2 + 2);
        c.scale(s / 52, s / 52);
        drawShape(c, o.shape, o.col, 0, 0, false);
        c.restore();
      }

      // ---------- 7. Player, input, camera ----------
      var P = { x: 0, y: 0, vx: 0, vy: 0, face: 0, walk: 0, step: 0 };
      var cam = { x: 0, y: 0 },
        W = 0,
        H = 0,
        dpr = 1,
        Z = 1;
      var keys = {},
        stick = { x: 0, y: 0, on: false },
        goal = null,
        goalObj = null,
        stuck = 0;
      var curReg = regs[0],
        near = null,
        time = 0,
        lastTs = 0,
        raf = 0,
        running = true,
        cardObj = null,
        modalOpen = false;
      var sparks = [],
        dust = [],
        flies = [],
        birds = [],
        nextGateMsg = 0,
        lastSave = 0,
        bannerT = 0;
      var spawnAt = function (g) {
        P.x = g.spawn.x;
        P.y = g.spawn.y;
        P.vx = P.vy = 0;
      };
      function regionAt(x, y, f) {
        for (var i = 0; i < NR; i++) {
          var g = regs[i],
            dx = x - g.cx,
            dy = y - g.cy;
          if (dx * dx + dy * dy > g.R * g.R * 1.6) continue;
          if (Math.hypot(dx, dy) < rad(g, Math.atan2(dy, dx)) * f) return g;
        }
        return null;
      }
      function segDist(x, y, A, B) {
        var vx = B.x - A.x,
          vy = B.y - A.y,
          t = clamp(((x - A.x) * vx + (y - A.y) * vy) / (vx * vx + vy * vy), 0, 1);
        return Math.hypot(x - (A.x + vx * t), y - (A.y + vy * t));
      }
      function walkable(x, y) {
        if (regionAt(x, y, 0.9)) return true;
        for (var i = 0; i < NR - 1; i++) {
          var g = regs[i];
          if (g.unlocked && g.bridge && segDist(x, y, g.bridge.A, g.bridge.B) < 22) return true;
        }
        return false;
      }
      if (hadSave && walkable(state.x, state.y)) {
        P.x = state.x;
        P.y = state.y;
      } else spawnAt(regs[0]);
      var initUnlock = refreshUnlocks(true, 0);
      cam.x = P.x;
      cam.y = P.y;
      curReg = regionAt(P.x, P.y, 1) || regs[0];
      state.vis[curReg.i] = 1;

      function anyOverlay() {
        return !elDrawer.hidden || !elMenu.hidden;
      }
      function frozen() {
        return modalOpen || LT.isDetailOpen() || !elAll.hidden;
      }
      var MOVE = {
        ArrowUp: "u",
        ArrowDown: "d",
        ArrowLeft: "l",
        ArrowRight: "r",
        w: "u",
        s: "d",
        a: "l",
        d: "r",
        W: "u",
        S: "d",
        A: "l",
        D: "r",
      };
      addEventListener("keydown", function (ev) {
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        var tg = ev.target,
          tag = tg && tg.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (ev.key === "Escape") {
          if (LT.isDetailOpen()) return;
          if (!elAll.hidden) {
            closeAll();
          } else if (anyOverlay()) closePanels();
          else if (modalOpen) closeCard();
          return;
        }
        if (!visible || !elAll.hidden) return;
        var m = MOVE[ev.key];
        if (m) {
          if (LT.isDetailOpen()) return;
          keys[m] = 1;
          goal = null;
          goalObj = null;
          if (!modalOpen) ev.preventDefault();
          kick();
          return;
        }
        if (
          ev.key === "e" ||
          ev.key === "E" ||
          ((ev.key === "Enter" || ev.key === " ") &&
            (tg === document.body || tg === stage || tg === cv))
        ) {
          if (LT.isDetailOpen()) return;
          if (modalOpen && cardObj) {
            ev.preventDefault();
            LT.openDetail(cardObj.e.id);
            return;
          }
          if (near && !anyOverlay()) {
            ev.preventDefault();
            openCard(near);
          }
        }
      });
      addEventListener("keyup", function (ev) {
        var m = MOVE[ev.key];
        if (m) keys[m] = 0;
      });
      addEventListener("blur", function () {
        keys = {};
      });

      // touch / pointer: stick + tap to move
      (function () {
        var id = null,
          ox = 0,
          oy = 0,
          maxD = 42,
          knob = elStick.firstElementChild;
        function set(ev) {
          var r = elStick.getBoundingClientRect(),
            cx0 = r.left + r.width / 2,
            cy0 = r.top + r.height / 2;
          var dx = ev.clientX - cx0,
            dy = ev.clientY - cy0,
            d = Math.hypot(dx, dy),
            k = d > maxD ? maxD / d : 1;
          stick.x = (dx * k) / maxD;
          stick.y = (dy * k) / maxD;
          knob.style.transform = "translate(" + dx * k + "px," + dy * k + "px)";
        }
        elStick.addEventListener("pointerdown", function (ev) {
          id = ev.pointerId;
          elStick.setPointerCapture(id);
          stick.on = true;
          goal = null;
          goalObj = null;
          set(ev);
          kick();
          ev.preventDefault();
        });
        elStick.addEventListener("pointermove", function (ev) {
          if (ev.pointerId === id) set(ev);
        });
        var end = function (ev) {
          if (ev.pointerId !== id) return;
          id = null;
          stick.x = stick.y = 0;
          stick.on = false;
          knob.style.transform = "";
        };
        elStick.addEventListener("pointerup", end);
        elStick.addEventListener("pointercancel", end);
        var down = null;
        cv.addEventListener("pointerdown", function (ev) {
          down = { x: ev.clientX, y: ev.clientY, t: performance.now() };
        });
        cv.addEventListener("pointerup", function (ev) {
          if (!down || frozen()) {
            down = null;
            return;
          }
          if (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 10) {
            down = null;
            return;
          }
          down = null;
          closePanels();
          var r = cv.getBoundingClientRect(),
            sx = ev.clientX - r.left,
            sy = ev.clientY - r.top;
          var wx = (sx - W / 2) / Z + cam.x,
            wy = (sy - H / 2) / Z + cam.y,
            best = null,
            bd = 40 / Z;
          objs.forEach(function (o) {
            var d = Math.hypot(o.x - wx, o.y - (wy + 8));
            if (d < bd) {
              bd = d;
              best = o;
            }
          });
          if (best) {
            if (Math.hypot(best.x - P.x, best.y - P.y) < 52) {
              openCard(best);
              return;
            }
            goalObj = best;
            goal = { x: best.x, y: best.y + 14 };
          } else {
            goal = { x: wx, y: wy };
            goalObj = null;
          }
          stuck = 0;
          hint(false);
          kick();
        });
      })();
      elPrompt.addEventListener("click", function () {
        if (near) openCard(near);
      });
      elAct.addEventListener("click", function () {
        if (near) openCard(near);
      });

      // ---------- 8. Cards, toasts, banner ----------
      function toast(html, cls) {
        var t = document.createElement("div");
        t.className = "q-toast" + (cls ? " " + cls : "");
        t.innerHTML = html;
        elToasts.appendChild(t);
        while (elToasts.children.length > 4) elToasts.removeChild(elToasts.firstChild);
        setTimeout(function () {
          t.classList.add("is-out");
          setTimeout(function () {
            if (t.parentNode) t.parentNode.removeChild(t);
          }, 400);
        }, 3400);
      }
      function banner(g) {
        elBanner.innerHTML =
          "<small>" +
          (g.c.epi ? "Beyond" : "Region " + (g.i + 1) + " of " + nCities) +
          "</small><b>" +
          esc(g.name) +
          "</b><span>" +
          esc(yearsOf(g)) +
          "</span>";
        elBanner.classList.remove("is-on");
        void elBanner.offsetWidth;
        elBanner.classList.add("is-on");
      }
      function yearsOf(g) {
        return g.c.epi
          ? g.c.region || "Undated"
          : Math.floor(g.c.from) + " – " + (g.c.to >= NOW - 0.01 ? "now" : Math.floor(g.c.to));
      }
      function hint(on, text) {
        elHint.classList.toggle("is-on", !!on);
        if (text) elHint.textContent = text;
      }
      hint(
        !hadSave,
        touch
          ? "Drag the stick or tap the map to walk. Tap an object to open it."
          : "WASD or arrow keys to walk. Press E near an object to open it."
      );

      function openCard(o) {
        var e = o.e;
        cardObj = o;
        modalOpen = true;
        closePanels();
        keys = {};
        goal = null;
        goalObj = null;
        elPrompt.hidden = true;
        var first = !o.got;
        if (first) collect(o);
        var sum = e.summary || (e.body ? short(String(e.body).replace(/\s+/g, " "), 170) : "");
        var sk = (e.skills || [])
          .slice(0, 5)
          .map(function (s) {
            return "<span>" + esc(s) + "</span>";
          })
          .join("");
        elCard.style.setProperty("--c", o.col);
        elCard.innerHTML =
          '<div class="q-card-top"><canvas class="q-ico" width="104" height="104" aria-hidden="true"></canvas><div class="q-card-h"><span class="q-kick">' +
          esc(M.typeName(e.type)) +
          (o.req ? " · Milestone" : "") +
          "</span>" +
          "<h3>" +
          esc(e.title) +
          '</h3><p class="q-meta">' +
          esc([e.org, M.when(e)].filter(Boolean).join(" · ")) +
          "</p></div></div>" +
          (sum ? '<p class="q-sum">' + esc(sum) + "</p>" : "") +
          (sk ? '<div class="q-chips">' + sk + "</div>" : "") +
          '<div class="q-card-foot"><span class="q-badge' +
          (first ? " is-new" : "") +
          '">' +
          (first ? "Found" : "Collected") +
          '</span><button type="button" class="q-btn q-go">Read more</button><button type="button" class="q-btn q-quiet q-x">Close</button></div>';
        icon(elCard.querySelector(".q-ico"), o);
        elCard.hidden = false;
        elCard.classList.remove("is-in");
        void elCard.offsetWidth;
        elCard.classList.add("is-in");
        elCard.querySelector(".q-go").onclick = function () {
          LT.openDetail(e.id);
        };
        elCard.querySelector(".q-x").onclick = closeCard;
        elCard.querySelector(".q-go").focus({ preventScroll: true });
        kick();
      }
      function closeCard() {
        modalOpen = false;
        cardObj = null;
        elCard.hidden = true;
        try {
          cv.focus({ preventScroll: true });
        } catch (x) {
          /* ignore */
        }
        kick();
      }

      function collect(o) {
        o.got = true;
        state.got[o.e.id] = 1;
        var before = {};
        objs.forEach(function (x) {
          if (x !== o && x.got)
            (x.e.skills || []).forEach(function (s) {
              before[String(s).toLowerCase()] = 1;
            });
        });
        var fresh = [];
        (o.e.skills || []).forEach(function (s) {
          var k = String(s).toLowerCase();
          if (!before[k] && fresh.indexOf(s) < 0) fresh.push(s);
        });
        fresh.slice(0, 3).forEach(function (s, k) {
          setTimeout(function () {
            toast("<i></i><span><small>Skill unlocked</small><b>" + esc(s) + "</b></span>");
          }, k * 260);
        });
        if (fresh.length > 3)
          setTimeout(function () {
            toast(
              "<i></i><span><small>Skills unlocked</small><b>+" +
                (fresh.length - 3) +
                " more</b></span>"
            );
          }, 800);
        computeTargets();
        updateRegionChip();
        refreshLog();
        var opened = refreshUnlocks(false, time * 1000);
        opened.forEach(function (g) {
          var nx = regs[g.i + 1];
          setTimeout(function () {
            toast(
              '<i class="q-gate"></i><span><small>Gate open</small><b>The road to ' +
                esc(nx.name) +
                " is lit</b></span>",
              "is-gold"
            );
          }, 450);
          if (!reduced)
            for (var k = 0; k < 30; k++)
              sparks.push({
                x: g.bridge.G.x,
                y: g.bridge.G.y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 1.2 + Math.random() * 0.6,
                age: 0,
              });
          gateFlash = { g: g, t: time };
        });
        updateRegionChip();
        refreshLog();
        save();
      }
      var gateFlash = null;

      // ---------- 9. HUD updates ----------
      var chipName = $(".q-rname"),
        chipYears = $(".q-ryears"),
        chipPips = $(".q-pips"),
        chipG = $(".q-gtxt");
      function updateRegionChip() {
        var g = curReg;
        chipName.textContent = g.name;
        chipYears.textContent = yearsOf(g);
        var got = gotCount(g),
          pct = g.reqN ? Math.round((got / g.reqN) * 100) : 100;
        chipPips.innerHTML = '<span class="q-pbar"><i style="width:' + pct + '%"></i></span>';
        chipPips.setAttribute("aria-hidden", "true");
        var nx = regs[g.i + 1];
        chipG.textContent = !g.reqN
          ? nx
            ? "Road open"
            : "Last region"
          : !nx
            ? "Milestones " + got + "/" + g.reqN
            : g.unlocked
              ? "Road to " + nx.name + " open"
              : "Milestones " + got + "/" + g.reqN + " · gate sealed";
      }
      function fmtStat(s, v) {
        if (v == null) return s.k === "exp" ? "n/a" : "0";
        return s.dec ? v.toFixed(s.dec) : String(Math.round(v));
      }
      function tweenStats(dt) {
        var moving = false;
        STATS.forEach(function (s) {
          var t = tgt[s.k],
            d = disp[s.k];
          if (t == null) d = null;
          else {
            if (d == null) d = 0;
            d = reduced ? t : Math.abs(t - d) < 0.02 ? t : d + (t - d) * Math.min(1, dt * 5);
            if (d !== t) moving = true;
          }
          disp[s.k] = d;
          var txt = fmtStat(s, d) + (s.tot != null ? "" : "");
          if (txt !== s.shown) {
            s.shown = txt;
            s.vEl.textContent = txt;
          }
          var tot = s.tot != null ? s.tot : null;
          if (s.totEl === undefined) {
            s.totEl = null;
            if (tot != null) {
              s.totEl = document.createElement("em");
              s.totEl.textContent = "/" + tot;
              s.vEl.parentNode.insertBefore(s.totEl, s.vEl.nextSibling);
            }
          }
          if (s.pulse !== t) {
            if (s.pulse !== undefined) {
              s.el.classList.remove("is-bump");
              void s.el.offsetWidth;
              s.el.classList.add("is-bump");
            }
            s.pulse = t;
          }
        });
        return moving;
      }

      // log drawer
      function refreshLog() {
        var legend = Object.keys(ICO_TYPES).map(function (t) {
          return { t: t, shape: SHAPE[t] || "orb" };
        });
        elDrawer.innerHTML =
          '<div class="q-dh"><b>Quest log</b><button type="button" class="q-btn q-quiet q-dx">Close</button></div>' +
          '<ol class="q-chlist">' +
          regs
            .map(function (g) {
              var n = g.objs.length,
                got = g.objs.filter(function (o) {
                  return o.got;
                }).length,
                pct = n ? Math.round((got / n) * 100) : 0;
              var st = !state.vis[g.i]
                ? "Not reached"
                : g.bridge
                  ? g.unlocked
                    ? "Road open"
                    : "Gate sealed"
                  : g.unlocked
                    ? "Complete"
                    : "In progress";
              return (
                '<li class="' +
                (g === curReg ? "is-cur" : "") +
                '"><div class="q-chh"><b>' +
                esc(g.name) +
                "</b><small>" +
                esc(yearsOf(g)) +
                "</small></div>" +
                '<div class="q-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' +
                n +
                '" aria-valuenow="' +
                got +
                '" aria-label="' +
                esc(g.name) +
                ' progress"><i style="width:' +
                pct +
                '%"></i></div>' +
                '<div class="q-chf"><span>' +
                got +
                " / " +
                n +
                " found · " +
                st +
                "</span>" +
                (state.vis[g.i]
                  ? '<button type="button" class="q-link" data-go="' + g.i + '">Travel</button>'
                  : "") +
                "</div></li>"
              );
            })
            .join("") +
          "</ol>" +
          '<h4>What the objects mean</h4><ul class="q-legend">' +
          legend
            .map(function (l) {
              return (
                '<li><canvas width="52" height="52" data-t="' +
                esc(l.t) +
                '"></canvas><span>' +
                esc(M.typeName(l.t)) +
                "</span></li>"
              );
            })
            .join("") +
          '<li class="q-lg-gold"><i></i><span>Gold beam: a milestone. Collect them all to open the road.</span></li></ul>' +
          '<button type="button" class="q-btn q-quiet q-reset">Restart journey</button>';
        Array.prototype.forEach.call(elDrawer.querySelectorAll("canvas[data-t]"), function (c) {
          icon(c, { shape: SHAPE[c.dataset.t] || "orb", col: M.typeColor(c.dataset.t) });
        });
      }
      function refreshTravel() {
        var vis = regs.filter(function (g) {
          return state.vis[g.i];
        });
        elMenu.innerHTML =
          '<div class="q-mh">Fast travel</div>' +
          regs
            .map(function (g) {
              var ok = !!state.vis[g.i];
              return (
                '<button type="button" role="menuitem" class="q-mi" data-go="' +
                g.i +
                '"' +
                (ok ? "" : " disabled") +
                "><b>" +
                esc(g.name) +
                "</b><small>" +
                (ok ? esc(yearsOf(g)) : "Not reached yet") +
                "</small></button>"
              );
            })
            .join("") +
          (vis.length < 2 ? '<p class="q-mnote">Walk to new regions to add them here.</p>' : "");
      }
      function closePanels() {
        elDrawer.hidden = true;
        elMenu.hidden = true;
        Array.prototype.forEach.call(
          root.querySelectorAll(".q-actions [aria-expanded]"),
          function (b) {
            b.setAttribute("aria-expanded", "false");
          }
        );
      }
      function togglePanel(which, btn) {
        var el = which === "log" ? elDrawer : elMenu,
          was = !el.hidden;
        closePanels();
        if (was) return;
        if (modalOpen) closeCard();
        if (which === "log") refreshLog();
        else refreshTravel();
        el.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        var f = el.querySelector("button:not([disabled])");
        if (f) f.focus({ preventScroll: true });
      }
      function travel(i) {
        var g = regs[i];
        if (!g || !state.vis[i]) return;
        closePanels();
        if (modalOpen) closeCard();
        var go = function () {
          spawnAt(g);
          goal = null;
          goalObj = null;
          cam.x = P.x;
          cam.y = P.y;
          kick();
        };
        if (reduced) {
          go();
          return;
        }
        elFade.classList.add("is-on");
        setTimeout(function () {
          go();
          elFade.classList.remove("is-on");
        }, 230);
      }
      root.addEventListener("click", function (ev) {
        var b = ev.target.closest("button");
        if (!b) return;
        if (b.dataset.act === "log" || b.dataset.act === "travel") togglePanel(b.dataset.act, b);
        else if (b.dataset.act === "all") openAll();
        else if (b.classList.contains("q-dx")) {
          closePanels();
        } else if (b.dataset.go != null) travel(+b.dataset.go);
        else if (b.classList.contains("q-reset")) {
          if (!b.dataset.sure) {
            b.dataset.sure = "1";
            b.textContent = "Sure? Press again to restart";
            return;
          }
          objs.forEach(function (o) {
            o.got = false;
          });
          state.got = {};
          state.vis = {};
          regs.forEach(function (g) {
            g.unlocked = false;
            g.gate = null;
          });
          regs.forEach(function (g) {
            if (!g.bridge && !g.reqN) g.unlocked = true;
            if (g.bridge && !g.reqN) {
              g.unlocked = true;
              g.gate = { t0: -9e9 };
            }
          });
          spawnAt(regs[0]);
          curReg = regs[0];
          state.vis[0] = 1;
          cam.x = P.x;
          cam.y = P.y;
          computeTargets();
          updateRegionChip();
          closePanels();
          save();
          hint(
            true,
            touch
              ? "Drag the stick or tap the map to walk."
              : "WASD or arrow keys to walk. Press E near an object."
          );
          kick();
        }
      });
      document.addEventListener("pointerdown", function (ev) {
        if (
          (!elDrawer.hidden || !elMenu.hidden) &&
          !ev.target.closest(".q-drawer,.q-menu,.q-actions")
        )
          closePanels();
      });

      // view all (skip the game)
      var allBuilt = false;
      function openAll() {
        closePanels();
        if (modalOpen) closeCard();
        if (!allBuilt) {
          LT.listView(elAll.querySelector(".q-all-body"));
          allBuilt = true;
        }
        elAll.hidden = false;
        elAll.querySelector(".q-all-x").focus({ preventScroll: true });
      }
      function closeAll() {
        elAll.hidden = true;
        var b = root.querySelector('[data-act="all"]');
        if (b) b.focus({ preventScroll: true });
        kick();
      }
      elAll.querySelector(".q-all-x").addEventListener("click", closeAll);

      // ---------- 10. Update + draw ----------
      function resize() {
        var r = stage.getBoundingClientRect();
        W = Math.max(1, Math.round(r.width));
        H = Math.max(1, Math.round(r.height));
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        Z = clamp(Math.min(W, H * 1.1) / 760, 0.66, 1.25);
        var m = mini.getBoundingClientRect();
        mini.width = Math.round(m.width * dpr);
        mini.height = Math.round(m.height * dpr);
        kick();
      }
      new ResizeObserver(resize).observe(stage);
      mini.addEventListener("click", function (ev) {
        var r = mini.getBoundingClientRect(),
          s = mmScale(r.width, r.height);
        var wx = (ev.clientX - r.left - s.ox) / s.k + minX,
          wy = (ev.clientY - r.top - s.oy) / s.k + minY,
          best = null,
          bd = 1e9;
        regs.forEach(function (g) {
          var d = Math.hypot(g.cx - wx, g.cy - wy);
          if (d < g.R * 1.3 && d < bd) {
            bd = d;
            best = g;
          }
        });
        if (best) {
          if (state.vis[best.i]) travel(best.i);
          else toast("<i></i><span><small>Not reached</small><b>" + esc(best.name) + "</b></span>");
        }
      });
      function mmScale(w, h) {
        var pad = 8,
          k = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxY - minY));
        return { k: k, ox: (w - (maxX - minX) * k) / 2, oy: (h - (maxY - minY) * k) / 2 };
      }

      var visible = true,
        lastCur = -1;
      function update(dt) {
        time += dt;
        var fr = frozen();
        // input vector
        var ix = (keys.r ? 1 : 0) - (keys.l ? 1 : 0),
          iy = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
        if (stick.on) {
          ix = stick.x;
          iy = stick.y;
        }
        var hasIn = Math.abs(ix) + Math.abs(iy) > 0.12;
        if (!hasIn && goal && !fr) {
          var gx = goal.x - P.x,
            gy = goal.y - P.y,
            gd = Math.hypot(gx, gy);
          if (gd < 8 || stuck > 0.5) {
            goal = null;
            if (goalObj && Math.hypot(goalObj.x - P.x, goalObj.y - P.y) < 60) {
              var go = goalObj;
              goalObj = null;
              openCard(go);
            }
            goalObj = null;
            stuck = 0;
          } else {
            ix = gx / gd;
            iy = gy / gd;
            hasIn = true;
          }
        }
        if (fr) {
          ix = iy = 0;
          hasIn = false;
        }
        var il = Math.hypot(ix, iy);
        if (il > 1) {
          ix /= il;
          iy /= il;
        }
        var SP = 235,
          k = 1 - Math.exp(-dt * 11);
        P.vx = lerp(P.vx, ix * SP, k);
        P.vy = lerp(P.vy, iy * SP, k);
        var nx = P.x + P.vx * dt,
          ny = P.y + P.vy * dt,
          moved = false;
        if (walkable(nx, P.y)) {
          P.x = nx;
          moved = true;
        } else P.vx = 0;
        if (walkable(P.x, ny)) {
          P.y = ny;
          moved = true;
        } else P.vy = 0;
        var sp = Math.hypot(P.vx, P.vy);
        if (goal && hasIn) {
          if (sp < SP * 0.25) stuck += dt;
          else stuck = 0;
        }
        if (sp > 12) {
          P.face = Math.atan2(P.vy, P.vx);
          P.walk += dt * sp * 0.05;
          if (!reduced && (P.step -= dt) < 0) {
            P.step = 0.09;
            dust.push({ x: P.x + (Math.random() - 0.5) * 6, y: P.y + 14, life: 0.5, age: 0 });
          }
        }
        if (hasIn && elHint.classList.contains("is-on") && sp > 40) hint(false);
        // region
        var g = regionAt(P.x, P.y, 1);
        if (g && g !== curReg) {
          curReg = g;
          if (!state.vis[g.i]) {
            state.vis[g.i] = 1;
            computeTargets();
            refreshLog();
            save();
          }
          banner(g);
          updateRegionChip();
        } else if (g && !state.vis[g.i]) {
          state.vis[g.i] = 1;
          computeTargets();
        }
        // nearest object
        var best = null,
          bd = 50;
        if (!fr)
          curReg.objs.forEach(function (o) {
            var d = Math.hypot(o.x - P.x, o.y - P.y);
            if (d < bd) {
              bd = d;
              best = o;
            }
          });
        near = best;
        // sealed gate nudge
        if (
          !fr &&
          curReg.bridge &&
          !curReg.unlocked &&
          time > nextGateMsg &&
          Math.hypot(curReg.bridge.G.x - P.x, curReg.bridge.G.y - P.y) < 70
        ) {
          nextGateMsg = time + 7;
          var left = curReg.reqN - gotCount(curReg);
          toast(
            '<i class="q-gate"></i><span><small>Gate sealed</small><b>Find ' +
              left +
              " more gold-beam " +
              (left === 1 ? "milestone" : "milestones") +
              "</b></span>",
            "is-gold"
          );
        }
        // camera
        var tx = P.x + (reduced ? 0 : P.vx * 0.25),
          ty = P.y + (reduced ? 0 : P.vy * 0.25);
        if (reduced) {
          cam.x = tx;
          cam.y = ty;
        } else {
          var ck = 1 - Math.exp(-dt * 4.2);
          cam.x = lerp(cam.x, tx, ck);
          cam.y = lerp(cam.y, ty, ck);
        }
        // particles
        for (var i = sparks.length - 1; i >= 0; i--) {
          var s = sparks[i];
          s.age += dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vx *= 0.96;
          s.vy *= 0.96;
          if (s.age > s.life) sparks.splice(i, 1);
        }
        for (i = dust.length - 1; i >= 0; i--) {
          dust[i].age += dt;
          if (dust[i].age > dust[i].life) dust.splice(i, 1);
        }
        var moving = tweenStats(dt);
        // prompt / action button
        var key = near ? near.e.id : "";
        if (key !== lastKey) {
          lastKey = key;
          if (near) {
            elPrompt.innerHTML =
              "<kbd>" +
              (touch ? "Tap" : "E") +
              "</kbd><span>" +
              esc(short(near.e.title, 34)) +
              "</span>";
            elPrompt.hidden = false;
          } else elPrompt.hidden = true;
          elAct.disabled = !near;
          elAct.classList.toggle("is-on", !!near);
        }
        if (near) {
          var px = (near.x - cam.x) * Z + W / 2,
            py = (near.y - cam.y) * Z + H / 2 - 52 * Z;
          elPrompt.style.transform =
            "translate(" +
            Math.round(clamp(px, 70, W - 70)) +
            "px," +
            Math.round(clamp(py, 120, H - 40)) +
            "px) translate(-50%,-100%)";
        }
        return (
          moving ||
          moved ||
          sp > 3 ||
          !!goal ||
          Math.hypot(cam.x - tx, cam.y - ty) > 0.4 ||
          sparks.length > 0 ||
          dust.length > 0 ||
          (gateFlash && time - gateFlash.t < 2.2) ||
          time < bannerT + 3
        );
      }
      var lastKey = "";

      function drawBridge(c, g, ts) {
        var b = g.bridge,
          ang = b.ang,
          dx = Math.cos(ang),
          dy = Math.sin(ang),
          p = 0;
        var s0 = { x: g.cx + dx * rad(g, ang) * 0.8, y: g.cy + dy * rad(g, ang) * 0.8 };
        var nx = regs[g.i + 1],
          e0 = {
            x: nx.cx - dx * rad(nx, ang + Math.PI) * 0.8,
            y: nx.cy - dy * rad(nx, ang + Math.PI) * 0.8,
          };
        if (g.unlocked) p = reduced ? 1 : clamp((time * 1000 - g.gate.t0) / 1500, 0, 1);
        var ex = lerp(s0.x, e0.x, p),
          ey = lerp(s0.y, e0.y, p),
          len = Math.hypot(e0.x - s0.x, e0.y - s0.y);
        c.lineCap = "round";
        // ghost / dotted path always
        c.setLineDash([3, 13]);
        c.strokeStyle = pal.ghost;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(s0.x, s0.y);
        c.lineTo(e0.x, e0.y);
        c.stroke();
        c.setLineDash([]);
        if (p > 0) {
          c.strokeStyle = pal.shadow;
          c.lineWidth = 46;
          c.beginPath();
          c.moveTo(s0.x, s0.y + 5);
          c.lineTo(ex, ey + 5);
          c.stroke();
          c.strokeStyle = pal.bridgeEdge;
          c.lineWidth = 40;
          c.beginPath();
          c.moveTo(s0.x, s0.y);
          c.lineTo(ex, ey);
          c.stroke();
          c.strokeStyle = pal.bridge;
          c.lineWidth = 32;
          c.beginPath();
          c.moveTo(s0.x, s0.y);
          c.lineTo(ex, ey);
          c.stroke();
          c.strokeStyle = pal.plank;
          c.lineWidth = 2;
          for (var d = 10; d < len * p; d += 14) {
            var qx = s0.x + dx * d,
              qy = s0.y + dy * d;
            c.beginPath();
            c.moveTo(qx - dy * 15, qy + dx * 15);
            c.lineTo(qx + dy * 15, qy - dx * 15);
            c.stroke();
          }
          // lanterns light up in sequence
          for (d = 40; d < len * p; d += 110) {
            qx = s0.x + dx * d;
            qy = s0.y + dy * d;
            [-1, 1].forEach(function (sd) {
              var lx = qx - dy * 24 * sd,
                ly = qy + dx * 24 * sd,
                lit = clamp((len * p - d) / 80, 0, 1);
              c.fillStyle = pal.shadow;
              c.beginPath();
              c.arc(lx + 1, ly + 3, 4, 0, TAU);
              c.fill();
              c.fillStyle = mix("#ffcf6a", night ? "#6a5a30" : "#caa56a", 1 - lit);
              c.beginPath();
              c.arc(lx, ly, 3.6, 0, TAU);
              c.fill();
              if (night && lit > 0) {
                var gl = c.createRadialGradient(lx, ly, 0, lx, ly, 34);
                gl.addColorStop(0, "rgba(255,200,100," + 0.45 * lit + ")");
                gl.addColorStop(1, "rgba(255,200,100,0)");
                c.globalCompositeOperation = "lighter";
                c.fillStyle = gl;
                c.fillRect(lx - 34, ly - 34, 68, 68);
                c.globalCompositeOperation = "source-over";
              }
            });
          }
          if (p < 1) {
            c.globalCompositeOperation = night ? "lighter" : "source-over";
            var gl2 = c.createRadialGradient(ex, ey, 0, ex, ey, 50);
            gl2.addColorStop(0, "rgba(255,214,120,.8)");
            gl2.addColorStop(1, "rgba(255,214,120,0)");
            c.fillStyle = gl2;
            c.fillRect(ex - 50, ey - 50, 100, 100);
            c.globalCompositeOperation = "source-over";
          }
        }
        // gate: two pillars and an energy beam
        var G = b.G,
          px = -dy,
          py = dx,
          open = g.unlocked ? clamp((time * 1000 - g.gate.t0) / 900, 0, 1) : 0;
        if (reduced && g.unlocked) open = 1;
        var pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + g.i);
        [-1, 1].forEach(function (sd) {
          var qx = G.x + px * 36 * sd,
            qy = G.y + py * 36 * sd;
          c.fillStyle = pal.shadow;
          c.beginPath();
          c.arc(qx + 2, qy + 5, 11, 0, TAU);
          c.fill();
          c.fillStyle = night ? "#38455f" : "#b9ad96";
          c.beginPath();
          c.arc(qx, qy, 10, 0, TAU);
          c.fill();
          c.fillStyle = night ? "#232c42" : "#8d826c";
          c.beginPath();
          c.arc(qx, qy, 6.5, 0, TAU);
          c.fill();
          c.fillStyle = mix("#7a7f8c", "#ffd56a", open);
          c.beginPath();
          c.arc(qx, qy, 4, 0, TAU);
          c.fill();
          if (night && (open > 0 || pulse > 0.5)) {
            var gl3 = c.createRadialGradient(qx, qy, 0, qx, qy, 26);
            gl3.addColorStop(0, "rgba(255,208,110," + (0.12 + 0.45 * open) + ")");
            gl3.addColorStop(1, "rgba(255,208,110,0)");
            c.globalCompositeOperation = "lighter";
            c.fillStyle = gl3;
            c.fillRect(qx - 26, qy - 26, 52, 52);
            c.globalCompositeOperation = "source-over";
          }
        });
        if (open < 1) {
          c.save();
          c.globalAlpha = (1 - open) * (0.55 + 0.3 * pulse);
          c.strokeStyle = night ? "#ffc857" : "#c2410c";
          c.lineWidth = 5;
          c.beginPath();
          c.moveTo(G.x + px * 30, G.y + py * 30);
          c.lineTo(G.x - px * 30, G.y - py * 30);
          c.stroke();
          c.lineWidth = 1.5;
          c.strokeStyle = "#fff";
          c.globalAlpha *= 0.8;
          c.stroke();
          c.restore();
        }
        if (gateFlash && gateFlash.g === g && time - gateFlash.t < 1.6 && !reduced) {
          var u = (time - gateFlash.t) / 1.6;
          c.strokeStyle = "rgba(255,208,110," + (1 - u) + ")";
          c.lineWidth = 3;
          c.beginPath();
          c.arc(G.x, G.y, 12 + u * 120, 0, TAU);
          c.stroke();
        }
      }

      function drawObj(c, o, vis) {
        var t = time,
          bx = o.x,
          by = o.y;
        c.save();
        c.translate(bx, by);
        // shadow
        c.fillStyle = pal.shadow;
        c.beginPath();
        c.ellipse(0, 15, 17, 6, 0, 0, TAU);
        c.fill();
        // milestone beam
        if (o.req && !o.got) {
          var fl = 0.75 + 0.25 * Math.sin(t * 3 + o.ph),
            gr = c.createLinearGradient(0, 8, 0, -150);
          gr.addColorStop(
            0,
            night ? "rgba(255,200,90," + 0.55 * fl + ")" : "rgba(224,110,20," + 0.4 * fl + ")"
          );
          gr.addColorStop(1, "rgba(255,200,90,0)");
          c.fillStyle = gr;
          c.beginPath();
          c.moveTo(-13, 8);
          c.lineTo(13, 8);
          c.lineTo(5, -150);
          c.lineTo(-5, -150);
          c.closePath();
          c.fill();
        }
        if (!o.got) {
          var pr = 44 + 6 * Math.sin(t * 2.2 + o.ph);
          var glw = c.createRadialGradient(0, -2, 2, 0, -2, pr);
          glw.addColorStop(0, hexA(o.col, night ? 0.5 : 0.32));
          glw.addColorStop(1, hexA(o.col, 0));
          c.globalCompositeOperation = night ? "lighter" : "source-over";
          c.fillStyle = glw;
          c.fillRect(-pr, -pr - 2, pr * 2, pr * 2);
          c.globalCompositeOperation = "source-over";
        }
        var hov = o === near;
        if (hov) {
          var s = 1.12 + 0.03 * Math.sin(t * 6);
          c.scale(s, s);
        }
        if (o.got) c.globalAlpha = night ? 0.6 : 0.72;
        drawShape(c, o.shape, o.col, t, o.ph, o.got);
        c.globalAlpha = 1;
        if (o.got) {
          c.fillStyle = night ? "#ffd56a" : "#c2410c";
          c.beginPath();
          c.arc(14, -16, 7, 0, TAU);
          c.fill();
          c.strokeStyle = night ? "#1a1200" : "#fff";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(10.5, -16);
          c.lineTo(13.5, -13);
          c.lineTo(18, -19);
          c.stroke();
        }
        if (hov) {
          c.strokeStyle = night ? "rgba(255,255,255,.7)" : "rgba(30,20,10,.6)";
          c.lineWidth = 1.6;
          c.setLineDash([3, 5]);
          c.lineDashOffset = -t * 12;
          c.beginPath();
          c.arc(0, 0, 28, 0, TAU);
          c.stroke();
          c.setLineDash([]);
        }
        c.restore();
      }
      function hexA(hex, a) {
        var v = parseInt(hex.slice(1), 16);
        return "rgba(" + (v >> 16) + "," + ((v >> 8) & 255) + "," + (v & 255) + "," + a + ")";
      }

      function drawPlayer(c) {
        var spd = Math.hypot(P.vx, P.vy),
          bob = spd > 12 ? Math.abs(Math.sin(P.walk)) * 3 : Math.sin(time * 2) * 0.6;
        c.save();
        c.translate(P.x, P.y);
        c.fillStyle = pal.shadow;
        c.beginPath();
        c.ellipse(0, 13, 12, 4.5, 0, 0, TAU);
        c.fill();
        c.translate(0, -bob);
        var ac = night ? "#ffbf47" : "#c2410c";
        c.fillStyle = night ? "#e9eefc" : "#2b2216";
        c.beginPath();
        c.arc(0, -2, 12, 0, TAU);
        c.fill();
        c.fillStyle = ac;
        c.beginPath();
        c.arc(0, 4, 8.5, Math.PI * 0.1, Math.PI * 0.9);
        c.fill();
        var fx = Math.cos(P.face) * 4,
          fy = Math.sin(P.face) * 3;
        c.fillStyle = night ? "#101a33" : "#fff";
        c.beginPath();
        c.arc(-3.6 + fx, -4 + fy, 1.9, 0, TAU);
        c.arc(3.6 + fx, -4 + fy, 1.9, 0, TAU);
        c.fill();
        // lantern
        var lx = Math.cos(P.face + 1.2) * 15,
          ly = Math.sin(P.face + 1.2) * 9 + 3;
        c.strokeStyle = ac;
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(Math.cos(P.face + 1.2) * 9, Math.sin(P.face + 1.2) * 5 + 2);
        c.lineTo(lx, ly);
        c.stroke();
        c.fillStyle = "#ffd98a";
        c.beginPath();
        c.arc(lx, ly + 2, 3.4, 0, TAU);
        c.fill();
        c.restore();
      }

      function draw(ts) {
        var c = cx;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g0 = c.createLinearGradient(0, 0, 0, H);
        g0.addColorStop(0, pal.seaA);
        g0.addColorStop(1, pal.seaB);
        c.fillStyle = g0;
        c.fillRect(0, 0, W, H);
        // pool of light around the traveller
        var psx = (P.x - cam.x) * Z + W / 2,
          psy = (P.y - cam.y) * Z + H / 2;
        var pool = c.createRadialGradient(psx, psy, 0, psx, psy, Math.max(W, H) * 0.6);
        pool.addColorStop(0, night ? "rgba(70,120,190,.30)" : "rgba(255,255,235,.55)");
        pool.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = pool;
        c.fillRect(0, 0, W, H);
        c.save();
        c.translate(W / 2, H / 2);
        c.scale(Z, Z);
        c.translate(-cam.x, -cam.y);
        var vx0 = cam.x - W / 2 / Z - 60,
          vx1 = cam.x + W / 2 / Z + 60,
          vy0 = cam.y - H / 2 / Z - 60,
          vy1 = cam.y + H / 2 / Z + 60;
        // waves
        c.lineWidth = 1.5;
        c.lineCap = "round";
        for (var i = 0; i < waves.length; i++) {
          var w = waves[i];
          if (w.x < vx0 || w.x > vx1 || w.y < vy0 || w.y > vy1) continue;
          var a = 0.06 + 0.09 * (reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * 0.9 + w.ph));
          c.strokeStyle = "rgba(" + pal.wave + "," + a + ")";
          c.beginPath();
          c.moveTo(w.x - w.w / 2, w.y);
          c.quadraticCurveTo(w.x, w.y - 4, w.x + w.w / 2, w.y);
          c.stroke();
        }
        // islands, bridges
        for (i = 0; i < NR; i++) {
          var g = regs[i],
            half = g.R * 1.3;
          if (g.cx + half < vx0 || g.cx - half > vx1 || g.cy + half < vy0 || g.cy - half > vy1)
            continue;
          if (!g.img) bake(g);
          c.drawImage(g.img, g.cx - g.imgW / 2, g.cy - g.imgW / 2, g.imgW, g.imgW);
          // region name, painted on the water above the island
          var top = g.cy - rad(g, -Math.PI / 2) * 1.14 - 22;
          c.textAlign = "center";
          c.fillStyle = pal.label;
          c.font = '700 30px "Space Grotesk", Inter, system-ui, sans-serif';
          c.fillText(g.name, g.cx, top);
          c.fillStyle = pal.sub;
          c.font = "500 14px Inter, system-ui, sans-serif";
          c.fillText(yearsOf(g), g.cx, top + 20);
        }
        for (i = 0; i < NR - 1; i++) drawBridge(c, regs[i], ts);
        // depth-sorted things
        var list = [];
        for (i = 0; i < objs.length; i++) {
          var o = objs[i];
          if (o.x > vx0 && o.x < vx1 && o.y > vy0 - 150 && o.y < vy1 + 30) list.push(o);
        }
        list.push(P);
        list.sort(function (a, b) {
          return a.y - b.y;
        });
        for (i = 0; i < list.length; i++) {
          if (list[i] === P) drawPlayer(c);
          else drawObj(c, list[i]);
        }
        // dust + sparks
        for (i = 0; i < dust.length; i++) {
          var d = dust[i],
            u = d.age / d.life;
          c.fillStyle = night
            ? "rgba(200,215,255," + 0.22 * (1 - u) + ")"
            : "rgba(120,90,50," + 0.22 * (1 - u) + ")";
          c.beginPath();
          c.arc(d.x, d.y - u * 6, 2.5 + u * 3, 0, TAU);
          c.fill();
        }
        c.globalCompositeOperation = "lighter";
        for (i = 0; i < sparks.length; i++) {
          var s = sparks[i],
            su = 1 - s.age / s.life;
          c.fillStyle = "rgba(255,214,120," + su + ")";
          c.beginPath();
          c.arc(s.x, s.y, 2.6 * su + 0.6, 0, TAU);
          c.fill();
        }
        c.globalCompositeOperation = "source-over";
        c.restore();
        // ambient life (screen space): fireflies at night, birds by day
        if (!reduced) ambient(c);
        // lantern glow + vignette
        if (night) {
          c.globalCompositeOperation = "lighter";
          var lg = c.createRadialGradient(psx, psy, 0, psx, psy, 150 * Z);
          lg.addColorStop(0, "rgba(255,205,120,.22)");
          lg.addColorStop(1, "rgba(255,205,120,0)");
          c.fillStyle = lg;
          c.fillRect(psx - 160 * Z, psy - 160 * Z, 320 * Z, 320 * Z);
          c.globalCompositeOperation = "source-over";
        }
        var vg = c.createRadialGradient(
          W / 2,
          H / 2,
          Math.min(W, H) * 0.35,
          W / 2,
          H / 2,
          Math.max(W, H) * 0.8
        );
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, pal.vig);
        c.fillStyle = vg;
        c.fillRect(0, 0, W, H);
        drawMini();
      }
      for (var fi = 0; fi < 34; fi++)
        flies.push({
          x: Math.random(),
          y: Math.random(),
          ph: Math.random() * TAU,
          sp: 0.15 + Math.random() * 0.3,
          r: 1 + Math.random() * 1.6,
        });
      for (fi = 0; fi < 5; fi++)
        birds.push({
          x: Math.random(),
          y: 0.12 + Math.random() * 0.6,
          sp: 0.012 + Math.random() * 0.014,
          ph: Math.random() * TAU,
          s: 0.8 + Math.random() * 0.6,
        });
      function ambient(c) {
        if (night) {
          c.globalCompositeOperation = "lighter";
          for (var i = 0; i < flies.length; i++) {
            var f = flies[i],
              x = ((f.x + Math.sin(time * f.sp + f.ph) * 0.05 - cam.x * 0.00018 * Z + 4) % 1) * W,
              y =
                ((f.y + Math.cos(time * f.sp * 0.8 + f.ph) * 0.04 - cam.y * 0.00018 * Z + 4) % 1) *
                H;
            var a = 0.25 + 0.75 * Math.max(0, Math.sin(time * 1.4 + f.ph));
            var gl = c.createRadialGradient(x, y, 0, x, y, 9 * f.r);
            gl.addColorStop(0, "rgba(210,255,150," + 0.8 * a + ")");
            gl.addColorStop(1, "rgba(210,255,150,0)");
            c.fillStyle = gl;
            c.fillRect(x - 10 * f.r, y - 10 * f.r, 20 * f.r, 20 * f.r);
          }
          c.globalCompositeOperation = "source-over";
        } else {
          c.strokeStyle = "rgba(60,50,40,.55)";
          c.lineWidth = 1.6;
          c.lineCap = "round";
          for (var j = 0; j < birds.length; j++) {
            var b = birds[j],
              bx = (((b.x + time * b.sp) % 1.1) - 0.05) * W,
              by = b.y * H + Math.sin(time * 0.7 + b.ph) * 10,
              fl = Math.sin(time * 7 + b.ph) * 3 * b.s;
            c.beginPath();
            c.moveTo(bx - 7 * b.s, by - fl);
            c.quadraticCurveTo(bx - 3 * b.s, by - 4 * b.s, bx, by);
            c.quadraticCurveTo(bx + 3 * b.s, by - 4 * b.s, bx + 7 * b.s, by - fl);
            c.stroke();
          }
        }
      }
      function drawMini() {
        var r = mini.width / dpr,
          h = mini.height / dpr;
        if (r < 2) return;
        mx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mx.clearRect(0, 0, r, h);
        var s = mmScale(r, h),
          X = function (x) {
            return s.ox + (x - minX) * s.k;
          },
          Y = function (y) {
            return s.oy + (y - minY) * s.k;
          };
        mx.lineCap = "round";
        regs.forEach(function (g) {
          if (g.bridge) {
            mx.strokeStyle = g.unlocked ? pal.accent : pal.ghost;
            mx.lineWidth = g.unlocked ? 2.5 : 1.5;
            mx.setLineDash(g.unlocked ? [] : [2, 3]);
            mx.beginPath();
            mx.moveTo(X(g.bridge.A.x), Y(g.bridge.A.y));
            mx.lineTo(X(g.bridge.B.x), Y(g.bridge.B.y));
            mx.stroke();
            mx.setLineDash([]);
          }
        });
        regs.forEach(function (g) {
          mx.beginPath();
          for (var k = 0; k <= 32; k++) {
            var th = (k / 32) * TAU,
              rr_ = rad(g, th) * s.k;
            var x = X(g.cx) + Math.cos(th) * rr_,
              y = Y(g.cy) + Math.sin(th) * rr_;
            if (k) mx.lineTo(x, y);
            else mx.moveTo(x, y);
          }
          mx.closePath();
          mx.globalAlpha = state.vis[g.i] ? 1 : 0.35;
          mx.fillStyle = "hsl(" + g.hue + "," + (night ? 30 : 38) + "%," + (night ? 42 : 58) + "%)";
          mx.fill();
          mx.globalAlpha = 1;
          if (g === curReg) {
            mx.strokeStyle = pal.accent;
            mx.lineWidth = 1.5;
            mx.stroke();
          }
        });
        var vw = (W / Z) * s.k,
          vh = (H / Z) * s.k;
        mx.strokeStyle = night ? "rgba(255,255,255,.55)" : "rgba(30,20,10,.5)";
        mx.lineWidth = 1;
        mx.strokeRect(X(cam.x) - vw / 2, Y(cam.y) - vh / 2, vw, vh);
        mx.fillStyle = pal.accent;
        mx.beginPath();
        mx.arc(X(P.x), Y(P.y), 3.4 + (reduced ? 0 : 1.2 * Math.sin(time * 4)), 0, TAU);
        mx.fill();
      }

      // ---------- 11. Loop ----------
      function frame(ts) {
        raf = 0;
        if (!running) return;
        var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 1 / 60;
        lastTs = ts;
        var busy = update(dt);
        draw(ts);
        if (ts - lastSave > 4000 && busy) {
          lastSave = ts;
          save();
        }
        if (!reduced || busy) raf = requestAnimationFrame(frame);
        else lastTs = 0;
      }
      function kick() {
        if (!raf && running) raf = requestAnimationFrame(frame);
      }
      LT.whenVisible(stage, function (v) {
        visible = v;
        running = v;
        if (v) {
          lastTs = 0;
          kick();
        } else {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          save();
        }
      });
      LT.onTheme(function () {
        setPalette();
        kick();
      });
      LT.onReducedChange(function (r) {
        reduced = r;
        kick();
      });
      addEventListener("pagehide", save);
      document.addEventListener("click", function () {
        /* detail closing returns focus; keep loop alive */ kick();
      });

      computeTargets();
      updateRegionChip();
      refreshLog();
      refreshTravel();
      if (hadSave)
        setTimeout(function () {
          toast("<i></i><span><small>Welcome back</small><b>Your progress was restored</b></span>");
        }, 700);
      resize();
    },
  });
})();
