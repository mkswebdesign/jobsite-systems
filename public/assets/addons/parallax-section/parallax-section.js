/*
 * Parallax Section — drop-in subtle background-parallax.
 *
 *   <!-- Background-image parallax (uses CSS background-position-y) -->
 *   <section data-aed-parallax="0.4"
 *            style="background-image:url('/hero.jpg');background-size:cover">
 *     <div class="container">…</div>
 *   </section>
 *
 *   <!-- Layer pattern: wrap a child in [data-aed-parallax-layer] -->
 *   <section data-aed-parallax="0.5">
 *     <div data-aed-parallax-layer>
 *       <img src="/orb.svg" alt="">
 *     </div>
 *     <div class="container">…</div>
 *   </section>
 *
 * The addon only writes a CSS variable (--aed-parallax-y) on the
 * container as it scrolls through the viewport. CSS does the actual
 * paint via either background-position-y OR a child layer's transform
 * (or both — they read the same variable).
 *
 * Per-section attributes:
 *   data-aed-parallax              speed 0–1 (0 = fully stationary, 1 = no parallax). Default 0.4.
 *   data-aed-parallax-max          clamp the maximum offset in px (default 120)
 *
 * Public API:
 *   window.__parallax.refresh()
 *
 * See /parallax-section/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) {
    window.__parallax = { version: VERSION, refresh: function(){} };
    return;
  }

  var sections = [];
  var ticking = false;

  function attach(el) {
    if (el.dataset.aedPxReady === '1') return;
    el.dataset.aedPxReady = '1';
    var speed = parseFloat(el.getAttribute('data-aed-parallax'));
    if (!isFinite(speed)) speed = 0.4;
    speed = Math.max(0, Math.min(1, speed));
    var max = parseFloat(el.getAttribute('data-aed-parallax-max'));
    if (!isFinite(max)) max = 120;
    sections.push({ el: el, speed: speed, max: max });
  }

  function update() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    sections.forEach(function (s) {
      var rect = s.el.getBoundingClientRect();
      // Center of section relative to center of viewport, normalized [-1, 1]
      var center = rect.top + rect.height / 2;
      var ratio = (center - vh / 2) / (vh / 2 + rect.height / 2);
      // Speed: 1 = move fully with scroll; 0 = stationary
      // Convert to: 0 = fully stationary (max parallax), 1 = no parallax
      // Offset = -ratio * (1 - speed) * max
      var offset = -ratio * (1 - s.speed) * s.max;
      // Clamp to ±max
      if (offset > s.max) offset = s.max;
      if (offset < -s.max) offset = -s.max;
      s.el.style.setProperty('--aed-parallax-y', offset.toFixed(1) + 'px');
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { update(); ticking = false; });
  }

  function scan() {
    document.querySelectorAll('[data-aed-parallax]').forEach(attach);
    update();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__parallax = {
    version: VERSION,
    refresh: scan,
  };
})();
