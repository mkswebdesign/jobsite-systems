/*
 * Progress Ring — drop-in SVG circular percent.
 *
 *   <div data-aed-ring="73"></div>
 *   <div data-aed-ring="50" data-aed-ring-size="64"
 *        data-aed-ring-stroke="6"></div>
 *   <div data-aed-ring="92" data-aed-trend="up"
 *        data-aed-ring-label="A+"></div>
 *
 * Per-element attributes:
 *   data-aed-ring               required — value 0–100 (or 0–max)
 *   data-aed-ring-max           upper bound (default 100)
 *   data-aed-ring-size          diameter in px (default 56)
 *   data-aed-ring-stroke        stroke width in px (default 5)
 *   data-aed-ring-label         center label (default: rounded percent)
 *   data-aed-trend              up | down | warn — overrides accent color
 *   data-aed-ring-animate-from  start value to animate from (default 0)
 *
 * Public API:
 *   window.__ring.refresh()
 *   window.__ring.set(el, value)
 *
 * See /progress-ring/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function render(el) {
    if (el.dataset.aedRingReady === '1') return;
    el.dataset.aedRingReady = '1';

    var size = parseFloat(el.getAttribute('data-aed-ring-size')) || 56;
    var stroke = parseFloat(el.getAttribute('data-aed-ring-stroke')) || 5;
    var max = parseFloat(el.getAttribute('data-aed-ring-max')) || 100;
    var value = parseFloat(el.getAttribute('data-aed-ring')) || 0;
    var label = el.getAttribute('data-aed-ring-label');
    var animateFrom = parseFloat(el.getAttribute('data-aed-ring-animate-from'));
    if (!isFinite(animateFrom)) animateFrom = 0;

    var pct = Math.max(0, Math.min(1, value / max));
    var radius = (size - stroke) / 2;
    var circumference = 2 * Math.PI * radius;

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Progress: ' + Math.round(pct * 100) + '%');

    var track = document.createElementNS(SVG_NS, 'circle');
    track.setAttribute('class', 'aed-pr-track');
    track.setAttribute('cx', String(size / 2));
    track.setAttribute('cy', String(size / 2));
    track.setAttribute('r', String(radius));
    track.setAttribute('stroke-width', String(stroke));
    svg.appendChild(track);

    var fill = document.createElementNS(SVG_NS, 'circle');
    fill.setAttribute('class', 'aed-pr-fill');
    fill.setAttribute('cx', String(size / 2));
    fill.setAttribute('cy', String(size / 2));
    fill.setAttribute('r', String(radius));
    fill.setAttribute('stroke-width', String(stroke));
    fill.setAttribute('stroke-dasharray', String(circumference));
    // Start position: animateFrom value
    var fromPct = Math.max(0, Math.min(1, animateFrom / max));
    fill.setAttribute('stroke-dashoffset', String(circumference * (1 - fromPct)));
    fill.setAttribute('transform', 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')');
    svg.appendChild(fill);

    el.innerHTML = '';
    el.appendChild(svg);
    el.style.width = size + 'px';
    el.style.height = size + 'px';

    var lbl = document.createElement('span');
    lbl.className = 'aed-pr-label';
    lbl.textContent = label || (Math.round(pct * 100) + '%');
    el.appendChild(lbl);

    el._aedRingFill = fill;
    el._aedRingMax = max;
    el._aedRingCircumference = circumference;
    el._aedRingLabelEl = lbl;
    el._aedRingHasCustomLabel = !!label;

    // Animate from initial position to actual
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fill.setAttribute('stroke-dashoffset', String(circumference * (1 - pct)));
      });
    });
  }

  function set(el, value) {
    if (!el || !el._aedRingFill) return;
    var max = el._aedRingMax;
    var pct = Math.max(0, Math.min(1, value / max));
    el._aedRingFill.setAttribute('stroke-dashoffset', String(el._aedRingCircumference * (1 - pct)));
    if (!el._aedRingHasCustomLabel) {
      el._aedRingLabelEl.textContent = Math.round(pct * 100) + '%';
    }
    el.setAttribute('data-aed-ring', String(value));
  }

  function scan() {
    document.querySelectorAll('[data-aed-ring]').forEach(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__ring = {
    version: VERSION,
    refresh: scan,
    set: set,
  };
})();
