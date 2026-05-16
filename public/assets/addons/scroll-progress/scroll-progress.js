/*
 * Scroll Progress — drop-in top progress bar.
 *
 * Opt-in via <meta name="aed:scroll-progress" content="on">. Renders
 * one bar at the top of every page, updating --aed-scroll-progress
 * (0–1) via requestAnimationFrame on scroll. Hides automatically on
 * pages that don't scroll (content shorter than viewport).
 *
 * Optional thickness override via meta:
 *   <meta name="aed:scroll-progress" content="on" data-thickness="thick">
 *
 * Per-page disable:
 *   <html data-aed-scroll-progress="off"> ... </html>
 *
 * Public API:
 *   window.__scrollProgress.refresh()   — re-measure (after dynamic content)
 *   window.__scrollProgress.set(value)  — manually set 0–1
 *
 * See /scroll-progress/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var meta = document.querySelector('meta[name="aed:scroll-progress"]');
  if (!meta) return;
  var v = (meta.getAttribute('content') || '').toLowerCase();
  if (v !== 'on' && v !== 'true' && v !== '1') return;

  // Per-page opt-out
  if (document.documentElement.getAttribute('data-aed-scroll-progress') === 'off') return;

  var thickness = meta.getAttribute('data-thickness') || ''; // 'thin' | 'thick' | ''

  // -- Build bar -------------------------------------------------------
  var bar = document.createElement('div');
  bar.className = 'aed-scroll-progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-hidden', 'true'); // decorative; screen readers use page state, not this
  if (thickness) bar.setAttribute('data-aed-thickness', thickness);

  function mount() {
    document.body.appendChild(bar);
    measure();
    update();
  }

  // -- Measure: should the bar even be visible? -----------------------
  var scrollable = false;
  function measure() {
    var doc = document.documentElement;
    var viewport = window.innerHeight || doc.clientHeight;
    var pageH = Math.max(doc.scrollHeight, document.body.scrollHeight);
    scrollable = pageH > viewport + 4; // hide on barely-scrollable pages
    bar.hidden = !scrollable;
  }

  // -- Update progress -----------------------------------------------
  var ticking = false;
  function update() {
    var doc = document.documentElement;
    var viewport = window.innerHeight || doc.clientHeight;
    var pageH = Math.max(doc.scrollHeight, document.body.scrollHeight);
    var max = pageH - viewport;
    if (max <= 0) {
      bar.style.setProperty('--aed-scroll-progress', '0');
      return;
    }
    var p = Math.max(0, Math.min(1, window.scrollY / max));
    bar.style.setProperty('--aed-scroll-progress', p.toFixed(4));
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { update(); ticking = false; });
  }
  function onResize() {
    measure();
    update();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  // Re-measure once images / fonts settle
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(onResize);
    ro.observe(document.documentElement);
  } else {
    setTimeout(onResize, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.__scrollProgress = {
    version: VERSION,
    refresh: function () { measure(); update(); },
    set: function (val) {
      var v = Math.max(0, Math.min(1, +val));
      bar.style.setProperty('--aed-scroll-progress', String(v));
    },
    bar: bar,
  };
})();
