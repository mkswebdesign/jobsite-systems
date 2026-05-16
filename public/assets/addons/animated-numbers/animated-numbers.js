/*
 * Animated Numbers — drop-in count-up.
 *
 * Animates the textContent of any element with [data-aed-count-to]
 * from a start value (default 0) to a target value when scrolled
 * into view. Single-fire by default.
 *
 *   <span data-aed-count-to="100">0</span>
 *   <span data-aed-count-to="1234">1,234</span>          <!-- auto-comma -->
 *   <span data-aed-count-to="3.14" data-aed-count-decimals="2">0.00</span>
 *   <span data-aed-count-to="50" data-aed-count-suffix="+">0+</span>
 *   <span data-aed-count-to="2500" data-aed-count-prefix="$">$0</span>
 *   <span data-aed-count-to="100" data-aed-count-duration="2000">0</span>
 *   <span data-aed-count-to="100" data-aed-count-replay>0</span>
 *
 * Format inference (when no explicit attribute):
 *   - existing comma in text     → use thousands separator
 *   - target has decimals        → use that decimal precision
 *   - text starts with $ / £ / € → prefix detected
 *   - text ends with % / + / k   → suffix detected
 *
 * Respects prefers-reduced-motion: jumps straight to target.
 *
 * Public API:
 *   window.__counters.refresh()       — re-scan after dynamic insert
 *   window.__counters.run(el)         — manually trigger a count-up
 *
 * See /animated-numbers/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function attach(el) {
    if (el.dataset.aedCountReady === '1') return;
    el.dataset.aedCountReady = '1';

    var target = parseFloat(el.getAttribute('data-aed-count-to'));
    if (isNaN(target)) return;

    // Stash the raw text for inference, then zero out for paint
    var rawText = (el.textContent || '').trim();
    var fmt = inferFormat(el, target, rawText);

    var from = parseFloat(el.getAttribute('data-aed-count-from'));
    if (isNaN(from)) from = 0;

    el._aedCount = { from: from, to: target, fmt: fmt };

    // Initial paint at "from" so users don't see the final value flash
    el.textContent = format(from, fmt);

    if (REDUCED) {
      el.textContent = format(target, fmt);
      el.classList.add('aed-counted');
      return;
    }

    var replay = el.hasAttribute('data-aed-count-replay');

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          run(el);
          if (!replay) io.disconnect();
        });
      }, { threshold: 0.4 });
      io.observe(el);
    } else {
      // Fallback: just run immediately
      run(el);
    }
  }

  function inferFormat(el, target, rawText) {
    var explicit = {
      decimals: el.getAttribute('data-aed-count-decimals'),
      separator: el.getAttribute('data-aed-count-separator'),
      prefix: el.getAttribute('data-aed-count-prefix'),
      suffix: el.getAttribute('data-aed-count-suffix'),
      duration: el.getAttribute('data-aed-count-duration'),
    };

    var fmt = {
      decimals: explicit.decimals != null ? parseInt(explicit.decimals, 10) : 0,
      separator: explicit.separator != null ? explicit.separator : '',
      prefix: explicit.prefix || '',
      suffix: explicit.suffix || '',
      duration: explicit.duration != null ? parseInt(explicit.duration, 10) : 1500,
    };

    // Decimals inferred from target if not explicit
    if (explicit.decimals == null) {
      var s = String(target);
      var dot = s.indexOf('.');
      if (dot > -1) fmt.decimals = s.length - dot - 1;
    }

    // Comma inference from existing text
    if (explicit.separator == null && /\d,\d{3}/.test(rawText)) {
      fmt.separator = ',';
    }

    // Prefix inference (currency symbol at start)
    if (!fmt.prefix) {
      var pm = rawText.match(/^([$£€¥₹]\s?)/);
      if (pm) fmt.prefix = pm[1];
    }

    // Suffix inference (% / + / k / K / M / etc.)
    if (!fmt.suffix) {
      var sm = rawText.match(/([%+kKMx]+)$/);
      if (sm) fmt.suffix = sm[1];
    }

    return fmt;
  }

  function format(n, fmt) {
    var rounded = fmt.decimals > 0
      ? n.toFixed(fmt.decimals)
      : String(Math.round(n));

    if (fmt.separator) {
      var parts = rounded.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, fmt.separator);
      rounded = parts.join('.');
    }

    return fmt.prefix + rounded + fmt.suffix;
  }

  // Ease-out cubic — feels natural for counters
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function run(el) {
    var data = el._aedCount;
    if (!data) return;
    el.classList.add('aed-counting');
    el.classList.remove('aed-counted');

    var start = performance.now();
    function step(now) {
      var t = Math.min(1, (now - start) / data.fmt.duration);
      var v = data.from + (data.to - data.from) * ease(t);
      el.textContent = format(v, data.fmt);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = format(data.to, data.fmt);
        el.classList.remove('aed-counting');
        el.classList.add('aed-counted');
      }
    }
    requestAnimationFrame(step);
  }

  // Promote elements matched by a meta-level auto-scope into count-up targets
  // by parsing their numeric text (e.g. "20+", "$1,234", "3.14", "50%").
  function autoPromote() {
    var meta = document.querySelector('meta[name="aed:animated-numbers"]');
    if (!meta) return;
    var on = (meta.getAttribute('content') || '').toLowerCase();
    if (on !== 'on' && on !== 'true' && on !== '1') return;
    var scope = meta.getAttribute('data-auto-scope');
    if (!scope) return;
    var defaultDuration = meta.getAttribute('data-default-duration');
    document.querySelectorAll(scope).forEach(function (el) {
      if (el.hasAttribute('data-aed-count-to')) return;
      var text = (el.textContent || '').trim();
      var m = text.match(/-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/);
      if (!m) return;
      var target = parseFloat(m[0].replace(/,/g, ''));
      if (isNaN(target)) return;
      el.setAttribute('data-aed-count-to', String(target));
      if (defaultDuration && !el.hasAttribute('data-aed-count-duration')) {
        el.setAttribute('data-aed-count-duration', defaultDuration);
      }
    });
  }

  function scan() {
    autoPromote();
    document.querySelectorAll('[data-aed-count-to]').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__counters = {
    version: VERSION,
    refresh: scan,
    run: run,
  };
})();
