/* Design "globe": a 3D globe as the page's signature living visual. Land from LT_MAP_GEO is sampled
   into dots on a sphere; great-circle arcs draw the journey city to city; a year scrubber and a Tour
   sweep through time. three.js r160 (pinned, cdnjs). Plain script, no build step. */
(function () {
  'use strict';
  var THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
  var FONT_HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap';
  var PI = Math.PI, TAU = PI * 2, RAD = PI / 180;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var damp = function (k, dt) { return 1 - Math.exp(-k * dt); };

  // Same coordinates as designs/map.js (kept in step by hand: that file does not export them).
  var CITIES = [
    { re: /porbandar/i, lat: 21.64, lon: 69.61 }, { re: /amravati/i, lat: 20.93, lon: 77.75 },
    { re: /ozar|nashik/i, lat: 20.09, lon: 73.93 }, { re: /dhule/i, lat: 20.90, lon: 74.77 },
    { re: /pune/i, lat: 18.52, lon: 73.86 }, { re: /santa clara/i, lat: 37.35, lon: -121.95 },
    { re: /seattle/i, lat: 47.61, lon: -122.33 }
  ];

  LT.define('globe', {
    mount: function (root, M, LT) {
      var jobs = [
        LT.loadScript(THREE_SRC),
        LT.loadScript('designs/map-geo.js'),
        LT.loadCSS(FONT_HREF).catch(function (e) { console.warn('[globe] display font not loaded, using fallback serif', e); })
      ];
      return Promise.all(jobs).then(function () {
        if (!window.THREE) throw new Error('three.js did not load');
        if (!window.LT_MAP_GEO || !window.LT_MAP_GEO.length) throw new Error('map-geo.js loaded but contains no land data');
        build(root, M, LT);
      });
    }
  });

  function noWebGL(root, LT, why) {
    console.error('[globe] WebGL unavailable: ' + why);
    root.classList.add('globe-root');
    root.innerHTML = '<p class="lt-error" role="alert"><strong>The 3D globe cannot run here.</strong> WebGL is unavailable (' + LT.esc(why) +
      '). Showing the plain list of chapters instead.</p><div class="globe-fallback"></div>';
    LT.listView(root.querySelector('.globe-fallback'), { title: 'Life timeline' });
  }

  function build(root, M, LT) {
    var THREE = window.THREE, esc = M.esc;
    root.classList.add('globe-root');
    root.setAttribute('data-gl-ready', '0');

    // ---- Data: chapters, with coordinates matched by name, never guessed. ------------------
    var chapters = M.chapters.map(function (c, i) {
      var city = null;
      if (!c.epi) [c.name, c.location, c.region].some(function (t) {
        return CITIES.some(function (ct) { if (t && ct.re.test(t)) { city = ct; return true; } });
      });
      return { i: i, ch: c, city: city, epi: !!c.epi, n: c.stories.length, from: c.from };
    });
    var route = chapters.filter(function (c) { return c.city; });
    var totalStories = chapters.reduce(function (a, c) { return a + c.n; }, 0);
    var maxN = Math.max.apply(null, chapters.map(function (c) { return c.n; }).concat([1]));
    var yrs = function (c) { return c.epi ? 'undated' : Math.floor(c.ch.from) + ' – ' + (c.ch.to >= M.NOW - 0.01 ? 'now' : Math.floor(c.ch.to)); };
    var plural = function (n) { return n + (n === 1 ? ' story' : ' stories'); };
    var minY = M.minY, maxY = M.maxY;

    // ---- DOM. ---------------------------------------------------------------------------------
    var exp = M.experience && M.experience.full_time_years;
    var line = route.length + ' places, ' + totalStories + ' stories' + (exp ? ', ' + exp + ' years of full-time work' : '') + '.';
    root.innerHTML =
      '<div class="gl-bg" aria-hidden="true"></div>' +
      '<div class="gl-stage"><canvas class="gl-canvas" aria-hidden="true"></canvas><div class="gl-pins"></div><div class="gl-card" hidden></div></div>' +
      '<header class="gl-hero"><p class="gl-eyebrow">A life in places</p><h1>' + esc(M.owner) + '</h1><p class="gl-line">' + esc(line) + '</p>' +
      '<nav class="gl-index" aria-label="Chapters">' + chapters.map(function (c) {
        return '<button type="button" class="gl-chip" data-i="' + c.i + '"><span>' + esc(c.ch.name) + '</span><small>' + (c.epi ? 'undated' : Math.floor(c.ch.from)) + '</small></button>';
      }).join('') + '</nav></header>' +
      '<div class="gl-tools"><button type="button" class="lt-btn gl-tour" aria-pressed="false">Tour</button><button type="button" class="lt-btn gl-listbtn">List view</button></div>' +
      '<aside class="gl-panel" role="region" aria-label="Chapter stories" hidden><button type="button" class="lt-btn gl-pclose">Close</button>' +
      '<div class="gl-pbody" tabindex="-1"></div></aside>' +
      '<div class="gl-bar"><div class="gl-here"><span class="gl-year">' + Math.floor(maxY) + '</span><span class="gl-where"></span></div>' +
      '<div class="gl-scrub"><input class="gl-range" type="range" min="' + minY + '" max="' + maxY + '" step="0.01" value="' + maxY + '" aria-label="Year">' +
      '<div class="gl-ticks" aria-hidden="true"></div></div></div>' +
      '<div class="gl-listview" hidden><button type="button" class="lt-btn gl-lclose">Back to globe</button><div class="gl-listbody"></div></div>' +
      '<p class="gl-sr" role="status" aria-live="polite"></p>';
    var $ = function (s) { return root.querySelector(s); };
    var stage = $('.gl-stage'), canvas = $('.gl-canvas'), pinsEl = $('.gl-pins'), card = $('.gl-card');
    var panel = $('.gl-panel'), pbody = $('.gl-pbody'), range = $('.gl-range'), yearEl = $('.gl-year'), whereEl = $('.gl-where');
    var tourBtn = $('.gl-tour'), listBtn = $('.gl-listbtn'), listView = $('.gl-listview'), sr = $('.gl-sr'), ticksEl = $('.gl-ticks');
    var chips = [].slice.call(root.querySelectorAll('.gl-chip'));
    LT.listView($('.gl-listbody'), { title: 'Life timeline' });

    ticksEl.innerHTML = route.map(function (c) {
      return '<i style="left:' + (clamp((c.from - minY) / (maxY - minY), 0, 1) * 100).toFixed(2) + '%" title="' + esc(c.ch.name + ' · ' + Math.floor(c.from)) + '"></i>';
    }).join('');

    // ---- Renderer (WebGL may be missing: loud fallback). -----------------------------------
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      if (!renderer.getContext()) throw new Error('no context');
    } catch (e) { noWebGL(root, LT, e && e.message || 'context creation failed'); return; }
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    var globe = new THREE.Group(); scene.add(globe);

    var vec = function (lat, lon, r) {
      var la = lat * RAD, lo = lon * RAD, c = Math.cos(la);
      return new THREE.Vector3(c * Math.sin(lo) * r, Math.sin(la) * r, c * Math.cos(lo) * r);
    };

    // Ocean: shaded sphere with a limb falloff.
    var seaMat = new THREE.ShaderMaterial({
      uniforms: { uCore: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uGlowK: { value: 0.5 } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uCore,uRim,uGlow; uniform float uGlowK; varying vec3 vN;' +
        'void main(){ float f = clamp(dot(normalize(vN), vec3(0.,0.,1.)),0.,1.);' +
        'vec3 c = mix(uRim, uCore, smoothstep(0.,.85,f));' +
        'float l = dot(normalize(vN), normalize(vec3(-.55,.6,.65)));' +
        'c *= .78 + .32*l; c += uGlow*pow(1.-f,3.)*uGlowK; gl_FragColor = vec4(c,1.); }'
    });
    var sea = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), seaMat); globe.add(sea);

    // Atmosphere halo (soft glow in dark, soft warm shade in light).
    var atmoMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uK: { value: 1 } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uK; varying vec3 vN;' +
        'void main(){ float i = pow(clamp(-dot(normalize(vN), vec3(0.,0.,1.))*1.7,0.,1.), 2.6); gl_FragColor = vec4(uColor, clamp(i*uK,0.,1.)); }',
      side: THREE.BackSide, transparent: true, depthWrite: false
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.22, 64, 48), atmoMat));

    // Land: rasterise the rings once, then keep the Fibonacci-sphere points that fall on land.
    var MW = 2048, MH = 1024, mc = document.createElement('canvas'); mc.width = MW; mc.height = MH;
    var mx = mc.getContext('2d', { willReadFrequently: true });
    mx.fillStyle = '#000'; mx.fillRect(0, 0, MW, MH); mx.fillStyle = '#fff';
    window.LT_MAP_GEO.forEach(function (ring) {
      // Unwrap longitudes so rings crossing the antimeridian fill as one shape, then draw at -360, 0, +360.
      var xs = [], prev = null;
      ring.forEach(function (p) { var x = p[0]; if (prev !== null) { while (x - prev > 180) x -= 360; while (x - prev < -180) x += 360; } xs.push(x); prev = x; });
      [-360, 0, 360].forEach(function (off) {
        mx.beginPath();
        ring.forEach(function (p, i) { var x = (xs[i] + off + 180) / 360 * MW, y = (90 - p[1]) / 180 * MH; i ? mx.lineTo(x, y) : mx.moveTo(x, y); });
        mx.closePath(); mx.fill();
      });
    });
    var mask = mx.getImageData(0, 0, MW, MH).data, N = 24000, pts = [];
    var GA = PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = GA * i;
      var x = Math.cos(th) * r, z = Math.sin(th) * r;
      var lat = Math.asin(y) / RAD, lon = Math.atan2(x, z) / RAD;
      var px = Math.min(MW - 1, Math.floor((lon + 180) / 360 * MW)), py = Math.min(MH - 1, Math.floor((90 - lat) / 180 * MH));
      if (mask[(py * MW + px) * 4] > 127) pts.push(x * 1.004, y * 1.004, z * 1.004);
    }
    var landGeo = new THREE.BufferGeometry();
    landGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    var landMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color() }, uAlpha: { value: 1 }, uScale: { value: 400 }, uSize: { value: 0.0125 } },
      vertexShader: 'uniform float uScale,uSize; varying float vF; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.);' +
        'vec3 n = normalize(mat3(modelViewMatrix)*position); vF = dot(n, normalize(-mv.xyz));' +
        'gl_PointSize = max(1.6, uSize*uScale/-mv.z); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying float vF;' +
        'void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard;' +
        'float a = smoothstep(.5,.28,d)*smoothstep(.0,.35,vF); gl_FragColor = vec4(uColor, a*uAlpha); }',
      transparent: true, depthWrite: false
    });
    globe.add(new THREE.Points(landGeo, landMat));

    // Coast lines and a faint graticule.
    var cl = [];
    window.LT_MAP_GEO.forEach(function (ring) {
      for (var k = 1; k < ring.length; k++) {
        var a = ring[k - 1], b = ring[k];
        if (Math.abs(a[0] - b[0]) > 60 || a[1] < -85 && b[1] < -85) continue;
        var u = vec(a[1], a[0], 1.0015), v = vec(b[1], b[0], 1.0015); cl.push(u.x, u.y, u.z, v.x, v.y, v.z);
      }
    });
    var coastGeo = new THREE.BufferGeometry(); coastGeo.setAttribute('position', new THREE.Float32BufferAttribute(cl, 3));
    var coastMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .3, depthWrite: false });
    globe.add(new THREE.LineSegments(coastGeo, coastMat));
    var gr = [];
    for (var gl = -60; gl <= 60; gl += 30) for (var go = -180; go < 180; go += 6) { var g1 = vec(gl, go, 1.001), g2 = vec(gl, go + 6, 1.001); gr.push(g1.x, g1.y, g1.z, g2.x, g2.y, g2.z); }
    for (var gm = -180; gm < 180; gm += 30) for (var ga = -84; ga < 84; ga += 6) { var h1 = vec(ga, gm, 1.001), h2 = vec(ga + 6, gm, 1.001); gr.push(h1.x, h1.y, h1.z, h2.x, h2.y, h2.z); }
    var grGeo = new THREE.BufferGeometry(); grGeo.setAttribute('position', new THREE.Float32BufferAttribute(gr, 3));
    var grMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .07, depthWrite: false });
    globe.add(new THREE.LineSegments(grGeo, grMat));

    // Stars (dark only).
    var sp = [], sr0 = 40;
    for (var s = 0; s < 420; s++) {
      var u1 = Math.random() * 2 - 1, t1 = Math.random() * TAU, rr = Math.sqrt(1 - u1 * u1);
      sp.push(rr * Math.cos(t1) * sr0, u1 * sr0, rr * Math.sin(t1) * sr0);
    }
    var starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    var starMat = new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, transparent: true, opacity: .55, depthWrite: false, color: 0xcfd6ff });
    var stars = new THREE.Points(starGeo, starMat); scene.add(stars);

    // Glow textures.
    var tex = function (draw) {
      var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'); draw(x);
      var t = new THREE.CanvasTexture(c); return t;
    };
    var glowTex = tex(function (x) { var g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
    var coreTex = tex(function (x) { var g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(255,255,255,1)'); g.addColorStop(.62, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
    var ringTex = tex(function (x) { x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 52, 0, TAU); x.stroke(); });
    var sprites = [];
    var mkSprite = function (map, parent) {
      var m = new THREE.SpriteMaterial({ map: map, transparent: true, depthWrite: false, depthTest: true });
      var sp1 = new THREE.Sprite(m); parent.add(sp1); sprites.push(m); return sp1;
    };

    // Pins: glow + core sized by story count; one invisible DOM button each for hover, focus and touch.
    var pins = route.map(function (c) {
      var p = vec(c.city.lat, c.city.lon, 1.012); c.pos = p; c.nrm = p.clone().normalize();
      var size = .05 + .05 * Math.sqrt(c.n / maxN);
      var glow = mkSprite(glowTex, globe), core = mkSprite(coreTex, globe), ring = mkSprite(ringTex, globe);
      [glow, core, ring].forEach(function (s) { s.position.copy(p); });
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'gl-pin'; btn.dataset.i = c.i;
      btn.setAttribute('aria-label', c.ch.name + ', ' + yrs(c) + ', ' + plural(c.n));
      pinsEl.appendChild(btn);
      return { c: c, glow: glow, core: core, ring: ring, btn: btn, size: size, lit: 0, x: 0, y: 0, front: false };
    });
    var pinOf = {}; pins.forEach(function (p) { pinOf[p.c.i] = p; });

    // Arcs: great circles with lift, drawn on by a per-arc progress uniform.
    var arcs = [];
    var arcMat0 = function () {
      return new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uProg: { value: 0 }, uGhost: { value: .16 }, uBoost: { value: 1 } },
        vertexShader: 'attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: 'uniform vec3 uColor; uniform float uProg,uGhost,uBoost; varying float vT;' +
          'void main(){ float on = step(vT, uProg); float head = exp(-pow((vT-uProg)*14.,2.))*step(.001,uProg)*step(uProg,.999);' +
          'float a = mix(uGhost, .95, on); vec3 c = uColor*(1.+head*uBoost); gl_FragColor = vec4(c, clamp(a+head*.4,0.,1.)); }',
        transparent: true, depthWrite: false
      });
    };
    var arcMats = [];
    for (var k = 0; k + 1 < route.length; k++) {
      (function (a, b) {
        var va = a.nrm, vb = b.nrm, om = Math.acos(clamp(va.dot(vb), -1, 1)), pts3 = [], S = 64;
        for (var q = 0; q <= S; q++) {
          var t = q / S, p3;
          if (om < 1e-4) p3 = va.clone(); else p3 = va.clone().multiplyScalar(Math.sin((1 - t) * om)).add(vb.clone().multiplyScalar(Math.sin(t * om))).divideScalar(Math.sin(om));
          p3.normalize().multiplyScalar(1.012 + (.014 + .022 * om / PI) * Math.pow(Math.sin(PI * t), .85));
          pts3.push(p3);
        }
        var curve = new THREE.CatmullRomCurve3(pts3, false, 'centripetal');
        var segs = 120, rad = 5, geo = new THREE.TubeGeometry(curve, segs, .0022, rad, false);
        var cnt = geo.attributes.position.count, aT = new Float32Array(cnt);
        for (var v = 0; v < cnt; v++) aT[v] = Math.floor(v / (rad + 1)) / segs;
        geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
        var mat = arcMat0(); arcMats.push(mat);
        var mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; globe.add(mesh);
        var tw = clamp((b.from - a.from) * .5, .15, 1);
        arcs.push({ a: a, b: b, curve: curve, mat: mat, tw: tw, prog: 0 });
      })(route[k], route[k + 1]);
    }

    // "You are here" marker.
    var markGlow = mkSprite(glowTex, globe), markCore = mkSprite(coreTex, globe), markRing = mkSprite(ringTex, globe);

    // ---- Theme. -------------------------------------------------------------------------------
    var dark = true;
    function applyTheme() {
      dark = LT.theme() !== 'light';
      var accent = getComputedStyle(document.documentElement).getPropertyValue(dark ? '--lt-accent-ink' : '--lt-accent').trim() || (dark ? '#c4b5fd' : '#6d28d9');
      var C = function (h) { return new THREE.Color(h); };
      var add = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      if (dark) {
        seaMat.uniforms.uCore.value.copy(C('#141c3e')); seaMat.uniforms.uRim.value.copy(C('#070a1d'));
        seaMat.uniforms.uGlow.value.copy(C('#5b6cff')); seaMat.uniforms.uGlowK.value = .55;
        landMat.uniforms.uColor.value.copy(C('#9db0ff')); landMat.uniforms.uAlpha.value = .9;
        coastMat.color.copy(C('#7f93ff')); coastMat.opacity = .34; grMat.color.copy(C('#8fa0ff')); grMat.opacity = .07;
        atmoMat.uniforms.uColor.value.copy(C('#6f63ff')); atmoMat.uniforms.uK.value = .6; atmoMat.blending = THREE.AdditiveBlending;
      } else {
        seaMat.uniforms.uCore.value.copy(C('#f4ecd9')); seaMat.uniforms.uRim.value.copy(C('#cfbf9c'));
        seaMat.uniforms.uGlow.value.copy(C('#fff6e3')); seaMat.uniforms.uGlowK.value = 0;
        landMat.uniforms.uColor.value.copy(C('#7c5f3d')); landMat.uniforms.uAlpha.value = .85;
        coastMat.color.copy(C('#8a6a44')); coastMat.opacity = .42; grMat.color.copy(C('#8a6a44')); grMat.opacity = .12;
        atmoMat.uniforms.uColor.value.copy(C('#c9a56b')); atmoMat.uniforms.uK.value = .28; atmoMat.blending = THREE.NormalBlending;
      }
      atmoMat.needsUpdate = true;
      starMat.visible = dark;
      var acc = C(accent);
      arcMats.forEach(function (m) { m.uniforms.uColor.value.copy(acc); m.uniforms.uGhost.value = dark ? .16 : .24; m.uniforms.uBoost.value = dark ? 1 : .35; m.blending = add; m.needsUpdate = true; });
      sprites.forEach(function (m) { m.blending = add; m.needsUpdate = true; });
      pins.forEach(function (p) {
        p.glow.material.color.copy(acc); p.core.material.color.copy(dark ? C('#ffffff') : C('#3a1d8a')); p.ring.material.color.copy(acc);
      });
      [markGlow, markCore, markRing].forEach(function (s, i) { s.material.color.copy(i === 1 ? (dark ? C('#ffffff') : C('#2a0f6b')) : acc); });
      // pins and marker share material objects per sprite, so colours above are already per-sprite
    }

    // ---- View state. --------------------------------------------------------------------------
    var cLon = 75 * RAD, cLat = 20 * RAD, vLon = 0, vLat = 0;      // view centre (radians) and inertia
    var zoom = 1, zT = 1, d0 = 4.4, W = 1, H = 1, DPR = 1;
    var offX = 0, offY = 0, offXT = 0, offYT = 0;                  // content shift in CSS px
    var fly = null, interacted = false, dragging = false, pointers = {}, dragged = false, pinch0 = 0, pinchZ0 = 1;
    var year = maxY, sel = -1, hover = -1, panelOpen = false, listOpen = false, tour = null, intro = null, rafId = 0, running = false, last = 0, tClock = 0;
    var isWide = function () { return W >= 900; };

    function resize() {
      var r = stage.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(DPR); renderer.setSize(W, H, false);
      camera.aspect = W / H;
      var m = Math.min(W * (isWide() ? 1.08 : 1.05), H * (isWide() ? .98 : 1.1));
      var tf = Math.tan(camera.fov * RAD / 2), target = .5 * m / (H / 2) * .0 + .43 * m;      // globe radius in px at zoom 1
      d0 = Math.sqrt(Math.pow((H / 2) / (tf * target), 2) + 1);
      setOffsets();
    }
    function setOffsets() {
      var shiftX = isWide() ? W * .11 : 0, shiftY = isWide() ? 0 : -H * .06;
      if (panelOpen) { if (isWide()) { shiftX = -(Math.min(420, W) / 2) + 6; } else { shiftX = 0; shiftY = H * .25; } }
      offXT = shiftX; offYT = shiftY;
      if (LT.reduced()) { offX = offXT; offY = offYT; }
    }
    function dist() { return Math.max(1.32, d0 * zoom); }
    function apply() {
      globe.rotation.set(cLat, -cLon, 0, 'XYZ');
      camera.position.set(0, 0, dist()); camera.lookAt(0, 0, 0);
      camera.setViewOffset(W, H, -offX, offY, W, H);
      camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      landMat.uniforms.uScale.value = DPR * camera.projectionMatrix.elements[5] * H / 2 * (1 / DPR) * DPR;
    }

    // ---- Camera moves. ------------------------------------------------------------------------
    function flyTo(lon, lat, z, dur) {
      var tl = lon * RAD, tt = clamp(lat * RAD, -1.2, 1.2);
      var dl = ((tl - cLon + PI) % TAU + TAU) % TAU - PI;
      vLon = vLat = 0;
      if (LT.reduced() || dur === 0) { cLon += dl; cLat = tt; zoom = zT = z; fly = null; return; }
      fly = { l0: cLon, dl: dl, a0: cLat, a1: tt, z0: zoom, z1: z, t: 0, dur: dur || 1.7 };
    }
    function stopAuto() { interacted = true; }

    // ---- Selection and panel. -----------------------------------------------------------------
    function setSel(i) {
      sel = i;
      chips.forEach(function (b) { var on = +b.dataset.i === i; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      pins.forEach(function (p) { p.btn.classList.toggle('on', p.c.i === i); });
    }
    function focusChapter(i, o) {
      o = o || {};
      var c = chapters[i]; if (!c) return;
      stopAuto(); stopTour(true); setSel(i);
      if (c.city && o.fly !== false) {
        flyTo(c.city.lon, c.city.lat + (!isWide() && panelOpen ? 0 : 0), panelOpen || o.open ? .95 : 1, 1.7);
        if (year < c.from + .01) setYear(Math.min(maxY, c.from + .01));
      }
      if (o.open || panelOpen) openPanel(i);
      sr.textContent = c.ch.name + ', ' + yrs(c) + ', ' + plural(c.n);
    }
    function openPanel(i) {
      var c = chapters[i]; if (!c) return;
      var wasOpen = panelOpen; panelOpen = true; setSel(i);
      pbody.innerHTML = '<p class="gl-pk">' + esc(yrs(c)) + (c.ch.region ? ' · ' + esc(c.ch.region) : '') + '</p><h2>' + esc(c.ch.name) + '</h2>' +
        '<p class="gl-pn">' + plural(c.n) + (c.city ? '' : ' · location unknown') + '</p>' +
        (c.n ? '<ul class="gl-stories">' + c.ch.stories.map(function (e) {
          return '<li><button type="button" class="gl-story" data-id="' + esc(e.id) + '"><i style="--c:' + M.typeColor(e.type) + '"></i><span><b>' + esc(e.title) + '</b><small>' +
            esc([M.typeName(e.type), M.when(e)].filter(Boolean).join(' · ')) + (e.placeholder ? ' · placeholder' : '') + '</small></span></button></li>';
        }).join('') + '</ul>' : '<p class="gl-pn">No stories in this chapter yet.</p>');
      panel.scrollTop = 0; pbody.scrollTop = 0;
      panel.hidden = false; setOffsets(); hideCard();
      requestAnimationFrame(function () { root.classList.add('gl-panel-open'); });
      if (!wasOpen) pbody.focus({ preventScroll: true });
    }
    function closePanel() {
      if (!panelOpen) return;
      panelOpen = false; root.classList.remove('gl-panel-open'); setOffsets();
      setTimeout(function () { if (!panelOpen) panel.hidden = true; }, LT.reduced() ? 0 : 320);
      var b = sel >= 0 && pinOf[sel] ? pinOf[sel].btn : null; if (b) b.focus({ preventScroll: true });
    }
    pbody.addEventListener('click', function (ev) { var b = ev.target.closest('.gl-story'); if (b) LT.openDetail(b.dataset.id); });
    $('.gl-pclose').onclick = closePanel;
    chips.forEach(function (b) { b.onclick = function () { focusChapter(+b.dataset.i, { open: true }); }; });

    // ---- Hover card. --------------------------------------------------------------------------
    function showCard(i) {
      var c = chapters[i]; if (!c || panelOpen) return; hover = i;
      card.innerHTML = '<b>' + esc(c.ch.name) + '</b><span>' + esc(yrs(c)) + '</span><em>' + plural(c.n) + '</em>';
      card.hidden = false;
    }
    function hideCard() { hover = -1; if (sel < 0 || panelOpen) card.hidden = true; else showCard(sel); }
    pins.forEach(function (p) {
      var b = p.btn;
      b.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') showCard(p.c.i); });
      b.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') hideCard(); });
      b.addEventListener('focus', function () { showCard(p.c.i); });
      b.addEventListener('blur', function () { hideCard(); });
      b.addEventListener('click', function () { focusChapter(p.c.i, { open: true }); });
    });

    // ---- Pointer: drag with inertia, wheel and pinch zoom. -------------------------------------
    var downAt = null;
    function sens() { return .0042 * Math.min(1.6, dist() / 3.2) * (900 / Math.max(H, 500)); }
    stage.addEventListener('pointerdown', function (ev) {
      if (ev.button > 0) return;
      stopAuto(); stopTour(true); fly = null;
      pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var n = Object.keys(pointers).length;
      if (n === 1) { dragged = false; downAt = { x: ev.clientX, y: ev.clientY }; vLon = vLat = 0; }
      if (n === 2) { var ps = Object.keys(pointers).map(function (k) { return pointers[k]; }); pinch0 = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y); pinchZ0 = zT; dragged = true; }
    });
    stage.addEventListener('pointermove', function (ev) {
      var p = pointers[ev.pointerId]; if (!p) return;
      var n = Object.keys(pointers).length;
      if (n >= 2) {
        p.x = ev.clientX; p.y = ev.clientY;
        var ps = Object.keys(pointers).map(function (k) { return pointers[k]; });
        var d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
        if (pinch0 > 0) { zT = clamp(pinchZ0 * pinch0 / d, zMin(), zMax()); }
        return;
      }
      var dx = ev.clientX - p.x, dy = ev.clientY - p.y; p.x = ev.clientX; p.y = ev.clientY;
      if (!dragged && Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 5) { dragged = true; dragging = true; root.classList.add('gl-grab'); try { stage.setPointerCapture(ev.pointerId); } catch (e) { /* capture is optional */ } }
      if (!dragged) return;
      var k = sens(), dt = Math.max(.008, (ev.timeStamp - (p.t || ev.timeStamp - 16)) / 1000); p.t = ev.timeStamp;
      cLon -= dx * k; cLat = clamp(cLat + dy * k, -1.25, 1.25);
      vLon = lerp(vLon, -dx * k / dt, .5); vLat = lerp(vLat, dy * k / dt, .5);
    });
    var up = function (ev) {
      delete pointers[ev.pointerId];
      if (!Object.keys(pointers).length) { dragging = false; root.classList.remove('gl-grab'); pinch0 = 0; if (LT.reduced()) vLon = vLat = 0; }
    };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('click', function (ev) { if (dragged) { ev.stopPropagation(); ev.preventDefault(); dragged = false; } }, true);
    stage.addEventListener('wheel', function (ev) {
      ev.preventDefault(); stopAuto(); fly = null;
      var dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
      zT = clamp(zT * Math.exp(dy * .0012), zMin(), zMax());
      if (LT.reduced()) zoom = zT;
    }, { passive: false });
    function zMin() { return Math.max(.28, 1.4 / d0); }
    function zMax() { return 1.35; }

    // ---- Time: year, the route position, and the Tour. -----------------------------------------
    function setYear(y) { year = clamp(y, minY, maxY); range.value = year; }
    range.addEventListener('input', function () { stopAuto(); stopTour(true); intro = null; year = +range.value; });
    function tourYear(tau) {
      var n = route.length; if (n < 1) return maxY;
      if (tau >= n - 1) return lerp(route[n - 1].from, maxY, clamp(tau - (n - 1), 0, 1));
      var k = Math.floor(tau), f = tau - k, a = route[k], b = route[k + 1], tw = arcs[k].tw, split = .45;
      var dEnd = b.from - tw;
      return f < split ? lerp(a.from, dEnd, f / split) : lerp(dEnd, b.from, (f - split) / (1 - split));
    }
    function startTour() {
      if (route.length < 2) return;
      stopAuto(); intro = null; closePanelQuiet();
      tour = { tau: year >= maxY - .05 || year <= minY ? 0 : currentTau(), t: 0 };
      tourBtn.setAttribute('aria-pressed', 'true'); tourBtn.textContent = 'Stop tour'; root.classList.add('gl-touring');
      if (LT.reduced()) reducedTourStep();
    }
    function currentTau() {
      for (var k = 0; k < route.length - 1; k++) if (year < route[k + 1].from) return k + clamp((year - route[k].from) / Math.max(.01, route[k + 1].from - route[k].from), 0, .44);
      return route.length - 1;
    }
    function stopTour(silent) {
      if (!tour) return; tour = null; clearTimeout(rTimer);
      tourBtn.setAttribute('aria-pressed', 'false'); tourBtn.textContent = 'Tour'; root.classList.remove('gl-touring');
      if (!silent) flyTo(cLon / RAD, cLat / RAD, 1, 1.6);
    }
    function closePanelQuiet() { if (panelOpen) closePanel(); }
    var rTimer = 0;
    function reducedTourStep() {
      if (!tour) return;
      var k = Math.round(tour.tau);
      if (k >= route.length) { stopTour(true); return; }
      var c = route[k]; setSel(c.i); setYear(c.from + .01); flyTo(c.city.lon, c.city.lat, .95, 0); showCard(c.i);
      sr.textContent = c.ch.name + ', ' + yrs(c);
      tour.tau = k + 1; rTimer = setTimeout(reducedTourStep, 2600);
    }
    tourBtn.onclick = function () { if (tour) stopTour(false); else startTour(); };

    // Marker position for the current year.
    var mk = { pos: new THREE.Vector3(), lat: 0, lon: 0, stop: null, moving: false };
    function routeState() {
      if (!route.length) return;
      var idx = 0; route.forEach(function (c, i) { if (c.from <= year + 1e-6) idx = i + 1; });
      var stop = route[Math.max(0, idx - 1)], pos = stop.pos.clone(), moving = false;
      arcs.forEach(function (a) { a.prog = clamp((year - (a.b.from - a.tw)) / a.tw, 0, 1); a.mat.uniforms.uProg.value = a.prog; });
      var a = idx - 1 >= 0 ? (arcs[idx - 1] || null) : null;
      if (a && a.prog > 0 && a.prog < 1) { pos = a.curve.getPointAt(a.prog); moving = true; }
      mk.pos.copy(pos); mk.moving = moving; mk.stop = stop;
      mk.arc = moving ? a : null;
    }

    // ---- Keyboard. ----------------------------------------------------------------------------
    document.addEventListener('keydown', function (ev) {
      if (!root.isConnected || listOpen || (LT.isDetailOpen && LT.isDetailOpen())) return;
      var t = ev.target, tag = t && t.tagName;
      if (ev.key === 'Escape') { if (panelOpen) { ev.preventDefault(); closePanel(); } return; }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.closest && t.closest('.lt-menu'))) return;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        var n = chapters.length, i = sel < 0 ? (ev.key === 'ArrowRight' ? 0 : n - 1) : (sel + (ev.key === 'ArrowRight' ? 1 : -1) + n) % n;
        focusChapter(i, {});
        if (!panelOpen) { var c = chapters[i]; if (c.city) showCard(i); else hideCard(); }
      } else if (ev.key === 'Enter' && sel >= 0 && tag !== 'BUTTON') { ev.preventDefault(); openPanel(sel); }
    });

    // ---- List view fallback toggle. -----------------------------------------------------------
    function setList(v) {
      listOpen = v; listView.hidden = !v; root.classList.toggle('gl-listing', v);
      if (v) { stopTour(true); closePanelQuiet(); pauseLoop(); $('.gl-lclose').focus(); } else { resumeLoop(); listBtn.focus(); }
    }
    listBtn.onclick = function () { setList(true); };
    $('.gl-lclose').onclick = function () { setList(false); };
    listView.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !LT.isDetailOpen()) setList(false); });

    // ---- Frame loop. ----------------------------------------------------------------------------
    var v3 = new THREE.Vector3(), camPos = new THREE.Vector3();
    function update(dt) {
      tClock += dt;
      var reduced = LT.reduced();
      if (intro) {
        intro.tau += dt / intro.leg;
        var n = route.length; if (intro.tau >= n) { intro = null; setYear(maxY); } else setYear(tourYear(intro.tau));
      }
      if (tour && !reduced) {
        tour.tau += dt / 4.2;
        if (tour.tau >= route.length) { setYear(maxY); stopTour(false); }
        else {
          setYear(tourYear(tour.tau));
          var tk = Math.floor(tour.tau), tf = tour.tau - tk, s = route[Math.min(tk, route.length - 1)];
          routeState();
          var ll = Math.atan2(mk.pos.x, mk.pos.z), la = Math.asin(clamp(mk.pos.y / mk.pos.length(), -1, 1));
          var inTransit = tk < arcs.length && tf >= .45, om = tk < arcs.length ? Math.acos(clamp(route[tk].nrm.dot(route[tk + 1].nrm), -1, 1)) : 0;
          var zt = inTransit ? lerp(.95, 1.2, Math.sin(PI * (tf - .45) / .55)) : .95;
          var dl = ((ll - cLon + PI) % TAU + TAU) % TAU - PI, kk = damp(2.4, dt);
          cLon += dl * kk; cLat += (clamp(la, -1.2, 1.2) - cLat) * kk; zoom = zT = lerp(zoom, zt, damp(1.6, dt));
          if (s && pinOf[s.i] && !inTransit && hover !== s.i) { setSel(s.i); }
        }
      }
      if (fly) {
        fly.t += dt / fly.dur; var e = ease(Math.min(1, fly.t));
        cLon = fly.l0 + fly.dl * e; cLat = lerp(fly.a0, fly.a1, e);
        zoom = zT = lerp(fly.z0, fly.z1, e) * (1 + .08 * Math.sin(PI * e));
        if (fly.t >= 1) { zoom = zT = fly.z1; fly = null; }
      } else if (!tour) {
        if (!dragging) { cLon += vLon * dt; cLat = clamp(cLat + vLat * dt, -1.25, 1.25); var f = Math.exp(-dt * 3.4); vLon *= f; vLat *= f; }
        if (!interacted && !reduced && !panelOpen) cLon += .05 * dt;
      }
      if (!tour) zoom += (zT - zoom) * damp(9, dt);
      offX += (offXT - offX) * damp(reduced ? 99 : 5, dt); offY += (offYT - offY) * damp(reduced ? 99 : 5, dt);
      cLon = ((cLon + PI) % TAU + TAU) % TAU - PI;
      apply(); routeState();

      var dn = dist() / d0, kS = Math.pow(dn, .8);
      camPos.set(0, 0, dist());
      var gm = globe.matrixWorld; globe.updateMatrixWorld(true);
      pins.forEach(function (p) {
        var c = p.c, tgt = year >= c.from - 1e-6 ? 1 : .2; p.lit += (tgt - p.lit) * damp(6, dt);
        var isSel = c.i === sel, pulse = .5 + .5 * Math.sin(tClock * 2.2 + c.i);
        var s0 = p.size * kS * (.85 + .25 * p.lit);
        p.glow.scale.setScalar(s0 * 3.2 * (1 + .12 * pulse * p.lit)); p.glow.material.opacity = (dark ? .55 : .4) * (.15 + .85 * p.lit);
        p.core.scale.setScalar(s0 * .85); p.core.material.opacity = .25 + .75 * p.lit;
        p.ring.scale.setScalar(s0 * (isSel ? 2.6 + .4 * pulse : 0.01)); p.ring.material.opacity = isSel ? .9 : 0;
        v3.copy(p.c.pos).applyMatrix4(gm); var fr = v3.clone().normalize().dot(camPos.clone().sub(v3).normalize());
        p.front = fr > .12;
        v3.project(camera); p.x = (v3.x * .5 + .5) * W; p.y = (-v3.y * .5 + .5) * H;
      });
      // marker
      var ms = .09 * kS, mp = .5 + .5 * Math.sin(tClock * 3);
      [markGlow, markCore, markRing].forEach(function (s) { s.position.copy(mk.pos); });
      markGlow.scale.setScalar(ms * (1.8 + .4 * mp)); markGlow.material.opacity = dark ? .5 : .4;
      markCore.scale.setScalar(ms * .55); markCore.material.opacity = 1;
      markRing.scale.setScalar(ms * (1.3 + 1.2 * ((tClock * .9) % 1))); markRing.material.opacity = (1 - ((tClock * .9) % 1)) * .8;
      markGlow.renderOrder = markCore.renderOrder = markRing.renderOrder = 5;
      stars.rotation.y += dt * .004;
    }
    function layoutDom() {
      pins.forEach(function (p) {
        var b = p.btn, vis = p.front && !listOpen;
        b.style.transform = 'translate(' + (p.x - 17).toFixed(1) + 'px,' + (p.y - 17).toFixed(1) + 'px)';
        if (b.dataset.v !== (vis ? '1' : '0')) { b.dataset.v = vis ? '1' : '0'; b.style.visibility = vis ? 'visible' : 'hidden'; }
      });
      var ci = hover >= 0 ? hover : (!panelOpen ? sel : -1), cp = ci >= 0 ? pinOf[ci] : null;
      if (cp && cp.front && !panelOpen) {
        card.hidden = false;
        var cw = card.offsetWidth, ch = card.offsetHeight, x = clamp(cp.x - cw / 2, 8, W - cw - 8), y = cp.y - ch - 20; if (y < 8) y = cp.y + 24;
        card.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      } else if (!card.hidden && (!cp || panelOpen || !cp.front)) card.hidden = true;
      var yi = Math.floor(year + 1e-6); if (yearEl.textContent != yi) yearEl.textContent = yi;
      var w = mk.stop ? (year < mk.stop.from - 1e-6 ? '' : mk.stop.ch.name) : '';
      if (mk.moving) w = 'Heading to ' + mk.arc.b.ch.name;
      else if (mk.stop) w = mk.stop.ch.name;
      if (whereEl.textContent !== w) whereEl.textContent = w;
      range.style.setProperty('--p', ((year - minY) / (maxY - minY) * 100).toFixed(2) + '%');
    }
    function frame(now) {
      rafId = requestAnimationFrame(frame);
      var dt = clamp((now - last) / 1000, 0, .05); last = now;
      update(dt); renderer.render(scene, camera); layoutDom();
    }
    function startLoop() { if (running || listOpen) return; running = true; last = performance.now(); rafId = requestAnimationFrame(frame); }
    function pauseLoop() { running = false; cancelAnimationFrame(rafId); }
    function resumeLoop() { if (visible) startLoop(); }
    var visible = true;
    LT.whenVisible(root, function (v) { visible = v; if (v) startLoop(); else pauseLoop(); });

    // ---- Boot. ----------------------------------------------------------------------------------
    applyTheme(); LT.onTheme(applyTheme);
    new ResizeObserver(function () { resize(); }).observe(stage);
    LT.onReducedChange(function (r) { if (r) { vLon = vLat = 0; fly = null; offX = offXT; offY = offYT; zoom = zT; if (tour) { stopTour(true); } } });
    resize(); zoom = zT = 1; offX = offXT; offY = offYT;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); console.error('[globe] WebGL context lost'); root.classList.add('gl-lost'); });
    if (!LT.reduced() && route.length > 1) {
      year = minY; setYear(minY); intro = { tau: 0, leg: 1.7 };
    }
    startLoop();
    root.setAttribute('data-gl-ready', '1');
  }
})();
