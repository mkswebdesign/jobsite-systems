/*
 * Gauge — drop-in half-circle progress arc.
 *
 *   <div data-aed-gauge="73"></div>
 *   <div data-aed-gauge="38" data-aed-gauge-max="50"
 *        data-aed-gauge-suffix="of 50"></div>
 *   <div data-aed-gauge="92" data-aed-trend="up"
 *        data-aed-gauge-size="120"
 *        data-aed-gauge-stroke="10"
 *        data-aed-gauge-label="A+"></div>
 *
 * Per-element attributes:
 *   data-aed-gauge          required — value
 *   data-aed-gauge-max      max value (default 100)
 *   data-aed-gauge-size     diameter in px (default 100; height ≈ 60% of size)
 *   data-aed-gauge-stroke   stroke width in px (default 8)
 *   data-aed-gauge-label    center value override (default rounded value)
 *   data-aed-gauge-suffix   small uppercase suffix below the value
 *   data-aed-trend          up | down | warn — color override
 *
 * Public API:
 *   window.__gauge.refresh()
 *   window.__gauge.set(el, value)
 *
 * See /gauge/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function render(el) {
    if (el.dataset.aedGReady === '1') return;
    el.dataset.aedGReady = '1';

    var size = parseFloat(el.getAttribute('data-aed-gauge-size')) || 100;
    var stroke = parseFloat(el.getAttribute('data-aed-gauge-stroke')) || 8;
    var max = parseFloat(el.getAttribute('data-aed-gauge-max')) || 100;
    var value = parseFloat(el.getAttribute('data-aed-gauge')) || 0;
    var labelOverride = el.getAttribute('data-aed-gauge-label');
    var suffix = el.getAttribute('data-aed-gauge-suffix') || '';

    var pct = Math.max(0, Math.min(1, value / max));
    var radius = (size - stroke) / 2;
    var halfCircumference = Math.PI * radius;

    // SVG viewBox: full width, half height + tiny padding
    var w = size;
    var h = size / 2 + stroke;

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Gauge: ' + Math.round(pct * 100) + '%');

    // Half-circle path: from left edge, arc to right edge
    var cx = w / 2;
    var cy = h - stroke / 2;
    var d = 'M ' + (cx - radius) + ' ' + cy +
            ' A ' + radius + ' ' + radius + ' 0 0 1 ' + (cx + radius) + ' ' + cy;

    var track = document.createElementNS(SVG_NS, 'path');
    track.setAttribute('class', 'aed-g-track');
    track.setAttribute('d', d);
    track.setAttribute('stroke-width', String(stroke));
    svg.appendChild(track);

    var fill = document.createElementNS(SVG_NS, 'path');
    fill.setAttribute('class', 'aed-g-fill');
    fill.setAttribute('d', d);
    fill.setAttribute('stroke-width', String(stroke));
    fill.setAttribute('stroke-dasharray', String(halfCircumference));
    // Start at 0%, animate to actual on next frame
    fill.setAttribute('stroke-dashoffset', String(halfCircumference));
    svg.appendChild(fill);

    el.innerHTML = '';
    el.appendChild(svg);
    el.style.width = w + 'px';
    el.style.height = h + 'px';

    var lbl = document.createElement('div');
    lbl.className = 'aed-g-label';
    var valueEl = document.createElement('span');
    valueEl.className = 'aed-g-value';
    valueEl.textContent = labelOverride || (Math.round(pct * 100) + '%');
    lbl.appendChild(valueEl);
    if (suffix) {
      var suf = document.createElement('span');
      suf.className = 'aed-g-suffix';
      suf.textContent = suffix;
      lbl.appendChild(suf);
    }
    el.appendChild(lbl);

    el._aedGFill = fill;
    el._aedGCircumference = halfCircumference;
    el._aedGMax = max;
    el._aedGValueEl = valueEl;
    el._aedGHasCustomLabel = !!labelOverride;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fill.setAttribute('stroke-dashoffset', String(halfCircumference * (1 - pct)));
      });
    });
  }

  function set(el, value) {
    if (!el || !el._aedGFill) return;
    var max = el._aedGMax;
    var pct = Math.max(0, Math.min(1, value / max));
    el._aedGFill.setAttribute('stroke-dashoffset', String(el._aedGCircumference * (1 - pct)));
    if (!el._aedGHasCustomLabel) {
      el._aedGValueEl.textContent = Math.round(pct * 100) + '%';
    }
    el.setAttribute('data-aed-gauge', String(value));
  }

  function scan() {
    document.querySelectorAll('[data-aed-gauge]').forEach(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__gauge = {
    version: VERSION,
    refresh: scan,
    set: set,
  };
})();
