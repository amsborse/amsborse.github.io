/* Runs in <head> before first paint: decide the design and theme so nothing flashes.
   Order: ?design= link (not remembered, so compare-page iframes never overwrite the choice)
   → remembered picker choice → map. Theme: remembered → system. */
(function () {
  // The only place that lists designs (shell.js and compare.html read it).
  // legacy: true = shown under a collapsed "Old themes" group in the picker and compare page.
  var REGISTRY = window.LT_REGISTRY = [
    { id: 'map', label: 'Map', pitch: 'A route draws itself across the cities; the camera flies to each stop and opens its chapter.' },
    { id: 'globe', label: 'Globe', pitch: 'A 3D globe you spin and zoom. Arcs link the cities; click one to fly in and open its chapter.' },
    { id: 'quest', label: 'Quest', pitch: 'An explorable overworld: travel between cities, unlock milestones and level up the stat sheet.' },
    { id: 'cursor', label: 'Cursor', pitch: 'A lens follows the pointer and reveals the story underneath; drag to scrub through time.' },
    { id: 'scrapbook', label: 'Scrapbook', pitch: 'A desk of photos, tickets and notes you can pick up, flip and throw.' },
    { id: 'classic', label: 'Classic', legacy: true, pitch: 'The original: a framed chapter, cards and a year slider.' },
    { id: 'film', label: 'Film', legacy: true, pitch: 'One continuous film. Scroll moves the camera through each city, with credits for titles.' },
    { id: 'game', label: 'Game (old)', legacy: true, pitch: 'A side-scrolling walk through life: move between milestones, collect them, fill the stat sheet.' }
  ];
  var DESIGNS = REGISTRY.map(function (x) { return x.id; });
  var get = function (k) { try { return localStorage.getItem('lt.' + k); } catch (e) { return null; } };
  var q = new URLSearchParams(location.search);
  var d = q.get('design');
  if (DESIGNS.indexOf(d) < 0) d = get('design');
  if (DESIGNS.indexOf(d) < 0) d = 'map';
  var root = document.documentElement;
  root.dataset.design = d;
  if (q.get('embed') === '1') root.dataset.embed = '1';
  root.dataset.theme = get('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  window.LT_DESIGNS = DESIGNS;
})();
