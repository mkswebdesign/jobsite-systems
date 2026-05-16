/*
 * Back to Top — drop-in scroll-to-top button.
 *
 * Opt-in via <meta name="aed:back-to-top" content="on"
 *                  data-threshold="600">.
 *
 * Per-page disable:
 *   <html data-aed-back-to-top="off"> ... </html>
 *
 * Public API:
 *   window.__backToTop.scroll()   — scroll to top
 *   window.__backToTop.show()
 *   window.__backToTop.hide()
 *
 * See /back-to-top/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var meta = document.querySelector('meta[name="aed:back-to-top"]');
  if (!meta) return;
  var v = (meta.getAttribute('content') || '').toLowerCase();
  if (v !== 'on' && v !== 'true' && v !== '1') return;

  if (document.documentElement.getAttribute('data-aed-back-to-top') === 'off') return;

  var threshold = parseInt(meta.getAttribute('data-threshold') || '600', 10);
  var position = (meta.getAttribute('data-position') || 'left').toLowerCase();
  var offsetX = meta.getAttribute('data-offset-x');  // e.g. "1.5rem"
  var offsetY = meta.getAttribute('data-offset-y');
  var size = meta.getAttribute('data-size');          // e.g. "48" (px)
  var style = (meta.getAttribute('data-style') || 'circle').toLowerCase();

  var btn = document.createElement('button');
  btn.type = 'button';
  var classes = ['aed-btt', 'aed-btt-' + (position === 'right' ? 'right' : 'left')];
  var STYLES = { circle: 'aed-btt-circle', square: 'aed-btt-square', pill: 'aed-btt-pill' };
  classes.push(STYLES[style] || STYLES.circle);
  btn.className = classes.join(' ');
  btn.setAttribute('aria-label', 'Back to top');
  btn.setAttribute('title', 'Back to top');
  if (offsetX) btn.style.setProperty('--aed-btt-offset-x', offsetX);
  if (offsetY) btn.style.setProperty('--aed-btt-offset-y', offsetY);
  if (size) btn.style.setProperty('--aed-btt-size', parseInt(size, 10) + 'px');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="18 15 12 9 6 15"/></svg>';
  btn.addEventListener('click', scrollToTop);

  function mount() {
    document.body.appendChild(btn);
    update();
  }

  function scrollToTop() {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  var visible = false;
  var ticking = false;
  function update() {
    var should = window.scrollY > threshold;
    if (should === visible) return;
    visible = should;
    btn.classList.toggle('is-visible', visible);
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { update(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.__backToTop = {
    version: VERSION,
    scroll: scrollToTop,
    show: function () { btn.classList.add('is-visible'); visible = true; },
    hide: function () { btn.classList.remove('is-visible'); visible = false; },
    el: btn,
  };
})();
