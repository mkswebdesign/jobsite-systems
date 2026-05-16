/*
 * Section Divider — drop-in SVG transitions between sections.
 *
 *   <!-- Standalone between two sections -->
 *   <div data-aed-divider="wave"></div>
 *
 *   <!-- Inside a section, anchored to its top or bottom -->
 *   <section style="position:relative">
 *     <div data-aed-divider="tilt" data-aed-position="bottom"></div>
 *     ...
 *   </section>
 *
 *   <!-- Custom fill / height / flip -->
 *   <div data-aed-divider="arch"
 *        style="--aed-divider-h:120px;--aed-divider-fill:var(--bg-secondary)"
 *        data-aed-flip-x="true"></div>
 *
 * Built-in shapes: wave, tilt, arch, peaks, curve.
 *
 * Public API:
 *   window.__divider.refresh()
 *   window.__divider.shapes              — list of built-in shape names
 *   window.__divider.svgFor(name)        — raw SVG markup for a shape
 *
 * See /section-divider/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var SHAPES = {
    wave:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"/>' +
      '</svg>',
    tilt:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0,80 L1440,0 L1440,80 Z"/>' +
      '</svg>',
    arch:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0,80 Q720,-20 1440,80 Z"/>' +
      '</svg>',
    peaks:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0,80 L240,40 L480,70 L720,20 L960,60 L1200,30 L1440,80 Z"/>' +
      '</svg>',
    curve:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0,80 C480,40 960,40 1440,80 Z"/>' +
      '</svg>',
  };

  function attach(el) {
    if (el.dataset.aedDivReady === '1') return;
    el.dataset.aedDivReady = '1';
    var shape = (el.getAttribute('data-aed-divider') || 'wave').toLowerCase();
    var svg = SHAPES[shape] || SHAPES.wave;
    el.innerHTML = svg;
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('role', 'presentation');
  }

  function scan() {
    document.querySelectorAll('[data-aed-divider]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__divider = {
    version: VERSION,
    refresh: scan,
    shapes: Object.keys(SHAPES),
    svgFor: function (name) { return SHAPES[name] || null; },
  };
})();
