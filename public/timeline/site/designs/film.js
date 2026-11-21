/* Design "film": the life plays as a scroll-driven film. No libraries: one rAF-throttled scroll
   pass (only while on screen) writes transforms/opacity; letters, reveals and the cross-dissolve are
   CSS transitions. Everything comes from window.CAREER through the shell model. */
LT.define("film", {
  mount: function (root, M, LT) {
    "use strict";
    var esc = M.esc;
    var pad = function (n) {
      return (n < 10 ? "0" : "") + n;
    };
    var clamp = function (v, a, b) {
      return v < a ? a : v > b ? b : v;
    };
    var smooth = function (a, b, v) {
      var t = clamp((v - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };
    var real = M.chapters.filter(function (c) {
      return !c.epi;
    });
    var total = M.chapters.length;

    // ---- Density: highlight reel = best ~6 shots (jobs, projects, awards, metrics first). ----
    var WEIGHT = {
      role: 6,
      achievement: 5,
      project: 4,
      publication: 3,
      talk: 3,
      education: 3,
      volunteering: 2,
      "life-event": 2,
      story: 1,
      vision: 1,
    };
    var byTime = function (a, b) {
      return (a._w == null ? 9e3 : a._w) - (b._w == null ? 9e3 : b._w);
    };
    function score(e) {
      return (
        (WEIGHT[e.type] || 1) +
        2 * Math.min((e.metrics || []).length, 3) +
        (e.summary ? 1 : 0) -
        (e.placeholder ? 3 : 0)
      );
    }
    function split(c) {
      var s = c.stories.slice();
      if (s.length <= 9) return { hi: s.sort(byTime), more: [] };
      var ranked = s.slice().sort(function (a, b) {
        return score(b) - score(a) || byTime(a, b);
      });
      var hi = ranked.slice(0, 6),
        ids = {};
      hi.forEach(function (e) {
        ids[e.id] = 1;
      });
      return {
        hi: hi.sort(byTime),
        more: s
          .filter(function (e) {
            return !ids[e.id];
          })
          .sort(byTime),
      };
    }
    var tc = function (e) {
      return e.start
        ? String(e.start).slice(0, 7).replace("-", ".")
        : e._w != null
          ? "≈" + Math.floor(e._w)
          : "UNDATED";
    };

    // ---- Markup. ------------------------------------------------------------------------
    function letters(txt) {
      var n = 0;
      return (
        '<span aria-hidden="true">' +
        String(txt)
          .split(" ")
          .map(function (w) {
            return (
              '<span class="film-w">' +
              w
                .split("")
                .map(function (ch) {
                  return '<span class="film-l" style="--i:' + n++ + '">' + esc(ch) + "</span>";
                })
                .join("") +
              "</span>"
            );
          })
          .join(" ") +
        "</span>"
      );
    }
    function shot(e, c, k) {
      var m = (e.metrics || [])[0];
      return (
        '<li class="film-shot" style="--d:' +
        ((k % 3) + 1) +
        '"><button type="button" class="film-shot-b" data-id="' +
        esc(e.id) +
        '"><span class="film-shot-in">' +
        '<span class="film-tc"><span><b>SC ' +
        pad(c.index + 1) +
        "</b> · " +
        esc(tc(e)) +
        "</span><i>SHOT " +
        pad(k + 1) +
        "</i></span>" +
        '<span class="film-ty" style="--c:' +
        M.typeColor(e.type) +
        '"><i></i>' +
        esc(M.typeName(e.type)) +
        (e.placeholder ? ' <em class="film-badge">Placeholder</em>' : "") +
        "</span>" +
        '<span class="film-ti">' +
        esc(e.title) +
        "</span>" +
        (e.org || e.location
          ? '<span class="film-or">' +
            esc([e.org, e.location].filter(Boolean).join(" · ")) +
            "</span>"
          : "") +
        (e.summary ? '<span class="film-su">' + esc(e.summary) + "</span>" : "") +
        (m
          ? '<span class="film-me"><b>' + esc(m.value) + "</b> " + esc(m.meaning) + "</span>"
          : "") +
        "</span></button></li>"
      );
    }
    function ext(e, c, k) {
      return (
        '<li style="--i:' +
        Math.min(k, 14) +
        '"><button type="button" class="film-x" data-id="' +
        esc(e.id) +
        '"><i style="--c:' +
        M.typeColor(e.type) +
        '"></i>' +
        '<span class="film-x-t">' +
        esc(tc(e)) +
        '</span><span class="film-x-n">' +
        esc(e.title) +
        (e.placeholder ? ' <em class="film-badge">Placeholder</em>' : "") +
        "</span>" +
        '<span class="film-x-o">' +
        esc(e.org || M.typeName(e.type)) +
        "</span></button></li>"
      );
    }
    function years(c) {
      if (c.epi) return "Beyond the dates";
      return Math.floor(c.from) + " — " + (c.to >= M.NOW - 0.01 ? "Now" : Math.floor(c.to));
    }
    function chapter(c) {
      var s = split(c),
        n = c.stories.length;
      var photo =
        c.index < 4 && !c.epi
          ? '<figure class="film-photo" aria-label="Photo placeholder"><div class="film-photo-in"><span>Photo placeholder</span><small>' +
            esc(c.name) +
            " · " +
            Math.floor(c.from) +
            "</small></div></figure>"
          : "";
      return (
        '<section class="film-ch" id="film-ch-' +
        c.index +
        '" data-i="' +
        c.index +
        '" style="--h:' +
        c.hue +
        '" aria-labelledby="film-t-' +
        c.index +
        '">' +
        '<div class="film-card"><div class="film-card-in"><div class="film-card-fx">' +
        '<p class="film-k">Scene ' +
        pad(c.index + 1) +
        " of " +
        pad(total) +
        "</p>" +
        '<h2 class="film-t" id="film-t-' +
        c.index +
        '" aria-label="' +
        esc(c.name) +
        '">' +
        letters(c.name.toUpperCase()) +
        "</h2>" +
        '<p class="film-y">' +
        esc(years(c)) +
        "</p>" +
        '<p class="film-r">' +
        esc(
          c.location && c.region && c.location.indexOf(c.region) >= 0
            ? c.location
            : [c.region, c.location].filter(Boolean).join(" · ")
        ) +
        "</p>" +
        '<p class="film-n">' +
        n +
        (n === 1 ? " shot" : " shots") +
        "</p></div></div></div>" +
        '<div class="film-body"><div class="film-ghost" aria-hidden="true">' +
        pad(c.index + 1) +
        "</div>" +
        '<div class="film-wrap' +
        (photo ? " has-photo" : "") +
        '">' +
        photo +
        '<ol class="film-shots" aria-label="' +
        esc(c.name) +
        (s.more.length ? " highlight reel" : " shots") +
        '">' +
        s.hi
          .map(function (e, k) {
            return shot(e, c, k);
          })
          .join("") +
        "</ol></div>" +
        (s.more.length
          ? '<div class="film-more"><button type="button" class="film-more-b" aria-expanded="false" aria-controls="film-ext-' +
            c.index +
            '"><span class="film-more-l">Extended cut — ' +
            s.more.length +
            " more</span></button>" +
            '<ol class="film-ext" id="film-ext-' +
            c.index +
            '" hidden aria-label="' +
            esc(c.name) +
            ' extended cut">' +
            s.more
              .map(function (e, k) {
                return ext(e, c, k);
              })
              .join("") +
            "</ol></div>"
          : "") +
        "</div></section>"
      );
    }
    function credits() {
      var sk = {},
        org = {};
      M.entries.forEach(function (e) {
        (e.skills || []).forEach(function (x) {
          sk[x] = (sk[x] || 0) + 1;
        });
        if (e.org && (e.type === "role" || e.type === "education" || e.type === "volunteering"))
          org[e.org] = 1;
      });
      var top = Object.keys(sk)
        .sort(function (a, b) {
          return sk[b] - sk[a] || (a < b ? -1 : 1);
        })
        .slice(0, 24);
      var orgs = Object.keys(org);
      var block = function (role, names) {
        return (
          '<div class="film-cr-b"><p class="film-cr-r">' +
          esc(role) +
          "</p>" +
          names
            .map(function (n) {
              return '<p class="film-cr-n">' + esc(n) + "</p>";
            })
            .join("") +
          "</div>"
        );
      };
      return (
        '<section class="film-credits" id="film-credits" aria-label="Credits"><div class="film-cr-stage"><div class="film-cr-roll">' +
        '<p class="film-cr-h">Directed, written and lived by</p><p class="film-cr-big">' +
        esc(M.owner) +
        "</p>" +
        block(
          "Filmed on location",
          real.map(function (c) {
            return c.name + " · " + Math.floor(c.from);
          })
        ) +
        (orgs.length ? block("Studios and schools", orgs) : "") +
        (top.length ? block("Tools and craft", top) : "") +
        '<p class="film-cr-end">The end</p><p class="film-cr-sub">…or the next scene.</p>' +
        '<button type="button" class="film-cr-top">Roll it again</button></div></div></section>'
      );
    }
    var exp = M.experience && M.experience.full_time_years;
    var tagline =
      real.length +
      " cities" +
      (exp ? ", " + exp + " years of full-time engineering" : "") +
      ", one film.";
    var tcName = function (c) {
      return c.epi ? "Beyond" : c.name;
    };

    root.innerHTML =
      '<div class="film-stage" aria-hidden="true">' +
      M.chapters
        .map(function (c) {
          return (
            '<div class="film-grade" data-i="' + c.index + '" style="--h:' + c.hue + '"></div>'
          );
        })
        .join("") +
      '<div class="film-beam"></div><div class="film-dust film-dust-a"></div><div class="film-dust film-dust-b"></div><div class="film-grain"></div><div class="film-vig"></div></div>' +
      '<header class="film-bar film-top"><div class="film-top-l"><span class="film-mark">' +
      esc(M.owner) +
      "</span>" +
      '<button type="button" class="film-skip">Skip to list</button></div>' +
      '<nav class="film-reel" aria-label="Scenes">' +
      M.chapters
        .map(function (c) {
          return (
            '<button type="button" class="film-reel-b" data-i="' +
            c.index +
            '" aria-label="Scene ' +
            (c.index + 1) +
            ": " +
            esc(tcName(c)) +
            '" title="' +
            esc(tcName(c)) +
            '">' +
            pad(c.index + 1) +
            "</button>"
          );
        })
        .join("") +
      "</nav></header>" +
      '<footer class="film-bar film-bot"><span class="film-live" aria-live="off"></span><span class="film-fr"></span></footer>' +
      '<main class="film-main">' +
      '<section class="film-hero" aria-label="Opening"><div class="film-hero-stage"><div class="film-hero-fx">' +
      '<p class="film-k">A life in ' +
      total +
      " scenes · " +
      M.minY +
      " — now</p>" +
      '<h1 class="film-t film-t-hero" aria-label="' +
      esc(M.owner) +
      '">' +
      letters(M.owner.toUpperCase()) +
      "</h1>" +
      '<p class="film-tag">' +
      esc(tagline) +
      "</p></div>" +
      '<div class="film-scroll"><span>Scroll to begin</span><i></i></div></div></section>' +
      M.chapters.map(chapter).join("") +
      credits() +
      "</main>" +
      '<div class="film-listview" hidden><div class="film-listbar"><button type="button" class="film-back">← Back to the film</button></div><div class="film-listhost"></div></div>';

    var $ = function (s, r) {
      return (r || root).querySelector(s);
    };
    var $$ = function (s, r) {
      return [].slice.call((r || root).querySelectorAll(s));
    };
    var main = $(".film-main"),
      listview = $(".film-listview"),
      listhost = $(".film-listhost");
    var reduced = LT.reduced();
    document.documentElement.classList.toggle("film-reduced", reduced);
    LT.onReducedChange(function (r) {
      reduced = r;
      document.documentElement.classList.toggle("film-reduced", r);
      schedule();
    });

    // ---- Interactions. -------------------------------------------------------------------
    root.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-id]");
      if (b && !b.closest(".lt-panel")) {
        LT.openDetail(b.dataset.id);
        return;
      }
      var mb = ev.target.closest(".film-more-b");
      if (mb) {
        var list = document.getElementById(mb.getAttribute("aria-controls")),
          open = mb.getAttribute("aria-expanded") !== "true";
        mb.setAttribute("aria-expanded", open);
        list.hidden = !open;
        mb.firstChild.textContent = open
          ? "Back to the highlight reel"
          : "Extended cut — " + list.children.length + " more";
        if (!open) mb.scrollIntoView({ block: "center" });
        return;
      }
      var rb = ev.target.closest(".film-reel-b");
      if (rb) {
        jump(+rb.dataset.i);
        return;
      }
      if (ev.target.closest(".film-cr-top"))
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
    function jump(i) {
      var sec = document.getElementById("film-ch-" + i),
        card = $(".film-card", sec);
      var pin = card.offsetHeight - $(".film-card-in", sec).offsetHeight;
      var y = sec.getBoundingClientRect().top + window.scrollY + pin * 0.25;
      window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
    }
    $(".film-skip").onclick = function () {
      if (!listhost.firstChild) LT.listView(listhost, { title: "Life timeline" });
      root.dataset.view = "list";
      main.hidden = true;
      listview.hidden = false;
      window.scrollTo(0, 0);
      $(".film-back").focus();
    };
    $(".film-back").onclick = function () {
      root.dataset.view = "";
      listview.hidden = true;
      main.hidden = false;
      $(".film-skip").focus();
      schedule();
    };

    // One-shot reveals (letters set, shots arrive).
    var io = new IntersectionObserver(
      function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    $$(".film-t, .film-shot, .film-photo, .film-more, .film-cr-b, .film-ghost").forEach(
      function (el) {
        io.observe(el);
      }
    );
    // Shots near the viewport get depth parallax.
    var near = [],
      nio = new IntersectionObserver(
        function (es) {
          es.forEach(function (en) {
            var i = near.indexOf(en.target);
            if (en.isIntersecting && i < 0) near.push(en.target);
            else if (!en.isIntersecting && i >= 0) {
              near.splice(i, 1);
              en.target.firstChild.firstChild.style.transform = "";
            }
          });
        },
        { rootMargin: "10% 0px" }
      );
    $$(".film-shot").forEach(function (el) {
      nio.observe(el);
    });

    // ---- Camera: one scroll pass, transforms and opacity only. -------------------------
    var hero = $(".film-hero"),
      heroFx = $(".film-hero-fx"),
      scrollCue = $(".film-scroll");
    var chs = $$(".film-ch").map(function (sec) {
      return {
        sec: sec,
        i: +sec.dataset.i,
        card: $(".film-card", sec),
        inn: $(".film-card-in", sec),
        fx: $(".film-card-fx", sec),
        ghost: $(".film-ghost", sec),
        body: $(".film-body", sec),
      };
    });
    var grades = $$(".film-grade"),
      reels = $$(".film-reel-b");
    var dustA = $(".film-dust-a"),
      dustB = $(".film-dust-b"),
      beam = $(".film-beam");
    var cr = $(".film-credits"),
      crRoll = $(".film-cr-roll"),
      crStage = $(".film-cr-stage");
    var live = $(".film-live"),
      fr = $(".film-fr");
    var cur = -2,
      queued = false,
      running = false;
    function setActive(a) {
      if (a === cur) return;
      cur = a;
      grades.forEach(function (g, i) {
        g.classList.toggle("on", i === a);
      });
      reels.forEach(function (b, i) {
        if (i === a) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
      document.documentElement.style.setProperty("--film-h", a >= 0 ? M.chapters[a].hue : 250);
      var c = M.chapters[a];
      live.textContent = c
        ? "SC " +
          pad(c.index + 1) +
          " · " +
          tcName(c).toUpperCase() +
          (c.epi ? "" : " · " + Math.floor(c.from))
        : "OPENING TITLES";
    }
    function frame() {
      queued = false;
      if (!running || main.hidden) return;
      var vh = window.innerHeight,
        sy = window.scrollY,
        i,
        c,
        r,
        p;
      var doc = document.documentElement.scrollHeight - vh;
      fr.textContent = "FRAME " + String(Math.round(sy)).padStart(5, "0");
      // read
      var hr = hero.getBoundingClientRect(),
        crr = cr.getBoundingClientRect();
      var rects = chs.map(function (ch) {
        return {
          s: ch.sec.getBoundingClientRect(),
          c: ch.card.getBoundingClientRect(),
          g: ch.body.getBoundingClientRect(),
          pin: ch.card.offsetHeight - ch.inn.offsetHeight,
        };
      });
      var nr = near.map(function (el) {
        return el.getBoundingClientRect();
      });
      var active = -1;
      for (i = 0; i < chs.length; i++) if (rects[i].s.top <= vh * 0.45) active = i;
      setActive(crr.top < vh * 0.3 ? -2 + 0 : active);
      if (crr.top < vh * 0.3) {
        live.textContent = "END CREDITS";
      }
      // write
      if (!reduced) {
        p = clamp(-hr.top / Math.max(1, hr.height - vh), 0, 1);
        heroFx.style.transform = "translate3d(0," + -p * 6 + "vh,0) scale(" + (1 + p * 0.22) + ")";
        heroFx.style.opacity = 1 - smooth(0.55, 1, p);
        scrollCue.style.opacity = 1 - smooth(0, 0.15, p);
        dustA.style.transform = "translate3d(0," + (-(sy * 0.05) % 300) + "px,0)";
        dustB.style.transform = "translate3d(0," + (-(sy * 0.16) % 300) + "px,0)";
        beam.style.transform = "translate3d(" + Math.sin(sy / 1400) * 2 + "vw,0,0)";
        chs.forEach(function (ch, k) {
          var rc = rects[k],
            pp = rc.pin > 0 ? clamp(-rc.c.top / rc.pin, 0, 1) : 0;
          var enter = clamp(1 - Math.max(0, rc.c.top) / (vh * 1.3), 0, 1);
          ch.fx.style.opacity = (enter * (1 - smooth(0.62, 1, pp))).toFixed(3);
          ch.fx.style.transform = "scale(" + (0.94 + 0.06 * enter + pp * 0.2).toFixed(4) + ")";
          ch.ghost.style.transform = "translate3d(0," + (rc.g.top * -0.18).toFixed(1) + "px,0)";
        });
        near.forEach(function (el, k) {
          var d = +el.style.getPropertyValue("--d") || 1;
          var off = (nr[k].top + nr[k].height / 2 - vh / 2) * -0.035 * d;
          el.firstChild.firstChild.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
        });
        p = clamp(-crr.top / Math.max(1, crr.height - vh), 0, 1);
        var rollH = crRoll.offsetHeight,
          stH = crStage.offsetHeight;
        crRoll.style.transform =
          "translate3d(0," +
          (stH * 0.85 - p * (rollH + stH * 0.85 - stH * 0.62)).toFixed(1) +
          "px,0)";
      }
    }
    function schedule() {
      if (!queued && running) {
        queued = true;
        requestAnimationFrame(frame);
      }
    }
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    LT.whenVisible(main, function (v) {
      running = v;
      if (v) schedule();
    });
    schedule();
  },
});
