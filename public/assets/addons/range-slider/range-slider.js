/*
 * Range Slider — drop-in styled <input type="range">.
 *
 *   <input type="range" data-aed-range min="0" max="100" value="50">
 *
 *   <input type="range" data-aed-range min="0" max="2500" step="100" value="500"
 *          data-aed-range-prefix="$" data-aed-range-format="thousands">
 *
 *   <input type="range" data-aed-range min="0" max="100" value="50"
 *          data-aed-range-suffix="%">
 *
 *   <!-- Hide the value badge -->
 *   <input type="range" data-aed-range data-aed-range-no-badge>
 *
 *   <!-- Show min/max footer -->
 *   <input type="range" data-aed-range data-aed-range-foot
 *          min="0" max="100" value="50">
 *
 * Per-element attributes:
 *   data-aed-range            opt-in marker
 *   data-aed-range-prefix     text before value (e.g. "$")
 *   data-aed-range-suffix     text after value (e.g. "%", " items")
 *   data-aed-range-decimals   number of decimal places (default 0)
 *   data-aed-range-format     "thousands" → comma separator
 *   data-aed-range-no-badge   hide the live value badge
 *   data-aed-range-foot       show min/max labels below the track
 *
 * Public API:
 *   window.__range.refresh()
 *   window.__range.format(input, value)
 *
 * See /range-slider/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function format(input, value) {
    var dec = parseInt(input.getAttribute('data-aed-range-decimals') || '0', 10);
    var prefix = input.getAttribute('data-aed-range-prefix') || '';
    var suffix = input.getAttribute('data-aed-range-suffix') || '';
    var formatKind = input.getAttribute('data-aed-range-format') || '';

    var num = dec > 0 ? Number(value).toFixed(dec) : String(Math.round(Number(value)));
    if (formatKind === 'thousands') {
      var parts = num.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      num = parts.join('.');
    }
    return prefix + num + suffix;
  }

  function pct(input) {
    var min = Number(input.min || 0);
    var max = Number(input.max || 100);
    var v = Number(input.value);
    if (max === min) return 0;
    return ((v - min) / (max - min)) * 100;
  }

  function attach(input) {
    if (input.dataset.aedRangeReady === '1') return;
    input.dataset.aedRangeReady = '1';

    var noBadge = input.hasAttribute('data-aed-range-no-badge');
    var showFoot = input.hasAttribute('data-aed-range-foot');

    var wrap = document.createElement('div');
    wrap.className = 'aed-range-wrap';
    input.parentNode.insertBefore(wrap, input);

    var row = document.createElement('div');
    row.className = 'aed-range-row';
    row.appendChild(input);
    wrap.appendChild(row);

    var badge = null;
    if (!noBadge) {
      badge = document.createElement('span');
      badge.className = 'aed-range-badge';
      badge.setAttribute('aria-hidden', 'true');
      row.appendChild(badge);
    }

    if (showFoot) {
      var foot = document.createElement('div');
      foot.className = 'aed-range-foot';
      foot.innerHTML =
        '<span>' + format(input, input.min || 0) + '</span>' +
        '<span>' + format(input, input.max || 100) + '</span>';
      wrap.appendChild(foot);
    }

    function update() {
      var p = pct(input);
      input.style.setProperty('--aed-range-pct', String(p));
      if (badge) {
        badge.textContent = format(input, input.value);
        // Position badge horizontally to track the thumb (account for thumb width)
        var pad = 9;  // half thumb width-ish
        var rangeRect = input.getBoundingClientRect();
        var px = (p / 100) * (rangeRect.width - pad * 2) + pad;
        badge.style.left = px + 'px';
      }
    }

    input.addEventListener('input', update);
    input.addEventListener('change', update);
    window.addEventListener('resize', update);
    requestAnimationFrame(update);
  }

  function scan() {
    document.querySelectorAll('input[type="range"][data-aed-range]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__range = {
    version: VERSION,
    refresh: scan,
    format: format,
  };
})();
