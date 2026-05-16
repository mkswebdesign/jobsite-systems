/*
 * Sparkline — drop-in inline mini chart.
 *
 *   <span data-aed-sparkline="3,7,12,8,15,20"></span>
 *   <span data-aed-sparkline="100,98,95,93,99,97"
 *         data-aed-sparkline-w="100"
 *         data-aed-sparkline-h="22"></span>
 *
 * Per-element attributes:
 *   data-aed-sparkline             comma-separated numeric values (required)
 *   data-aed-sparkline-w           width in px (default 80)
 *   data-aed-sparkline-h           height in px (default 20)
 *   data-aed-sparkline-area        if present, fill area under the line
 *   data-aed-sparkline-dot         if present, draw a dot at the last point
 *   data-aed-trend                 up | down | flat — overrides line color
 *
 * Auto-trend: if data-aed-trend not set, the addon picks one based on
 * the slope from first to last value.
 *
 * Public API:
 *   window.__sparkline.refresh()
 *   window.__sparkline.render(el)
 *
 * See /sparkline/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function parseValues(s) {
    if (!s) return [];
    return s.split(',').map(function (x) {
      var n = parseFloat(x);
      return isFinite(n) ? n : 0;
    });
  }

  function autoTrend(values) {
    if (values.length < 2) return 'flat';
    var first = values[0], last = values[values.length - 1];
    var range = Math.max.apply(null, values) - Math.min.apply(null, values);
    if (range === 0) return 'flat';
    var delta = (last - first) / range;
    if (delta > 0.05) return 'up';
    if (delta < -0.05) return 'down';
    return 'flat';
  }

  function render(el) {
    if (el.dataset.aedSparkReady === '1') return;
    el.dataset.aedSparkReady = '1';

    var values = parseValues(el.getAttribute('data-aed-sparkline'));
    if (values.length < 2) { el.hidden = true; return; }

    var w = parseFloat(el.getAttribute('data-aed-sparkline-w')) || 80;
    var h = parseFloat(el.getAttribute('data-aed-sparkline-h')) || 20;
    var pad = 2;

    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    var step = (w - pad * 2) / (values.length - 1);

    var pts = values.map(function (v, i) {
      var x = pad + i * step;
      var y = pad + (h - pad * 2) * (1 - (v - min) / range);
      return [x, y];
    });

    if (!el.hasAttribute('data-aed-trend')) {
      el.setAttribute('data-aed-trend', autoTrend(values));
    }

    var line = pts.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p[0].toFixed(2) + ' ' + p[1].toFixed(2);
    }).join(' ');

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('aria-hidden', 'true');

    if (el.hasAttribute('data-aed-sparkline-area')) {
      var area = document.createElementNS(SVG_NS, 'path');
      area.setAttribute('class', 'aed-spark-area');
      var areaD = line +
        ' L ' + pts[pts.length - 1][0].toFixed(2) + ' ' + (h - pad).toFixed(2) +
        ' L ' + pts[0][0].toFixed(2) + ' ' + (h - pad).toFixed(2) + ' Z';
      area.setAttribute('d', areaD);
      svg.appendChild(area);
    }

    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'aed-spark-line');
    path.setAttribute('d', line);
    svg.appendChild(path);

    if (el.hasAttribute('data-aed-sparkline-dot')) {
      var last = pts[pts.length - 1];
      var dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'aed-spark-dot-last');
      dot.setAttribute('cx', last[0].toFixed(2));
      dot.setAttribute('cy', last[1].toFixed(2));
      dot.setAttribute('r', '2.5');
      svg.appendChild(dot);
    }

    el.innerHTML = '';
    el.appendChild(svg);

    // Set a screen-reader-friendly label
    if (!el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', 'Sparkline: ' + values.join(', '));
    }
  }

  function scan() {
    document.querySelectorAll('[data-aed-sparkline]').forEach(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__sparkline = {
    version: VERSION,
    refresh: scan,
    render: render,
  };
})();
