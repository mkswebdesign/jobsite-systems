/*
 * Scramble Text — drop-in cipher-decode reveal.
 *
 *   <h1 data-aed-scramble>Production websites, managed for you</h1>
 *
 *   <!-- Trigger options: scroll (default) | load | hover -->
 *   <h1 data-aed-scramble data-aed-scr-trigger="load">…</h1>
 *
 *   <!-- Custom timing -->
 *   <h1 data-aed-scramble
 *       data-aed-scr-duration="1200"
 *       data-aed-scr-cycles="6">…</h1>
 *
 *   <!-- Custom character pool to scramble through -->
 *   <h1 data-aed-scramble
 *       data-aed-scr-chars="!<>-_\\/[]{}—=+*^?#________">…</h1>
 *
 * Per-element attributes:
 *   data-aed-scramble        opt-in marker (uses element textContent as target)
 *   data-aed-scr-trigger     scroll (default) | load | hover
 *   data-aed-scr-duration    total animation ms (default 900)
 *   data-aed-scr-cycles      scramble passes per character (default 4)
 *   data-aed-scr-chars       character pool (default mix of ASCII / box-draw)
 *
 * Reduced motion: skips animation entirely, leaves text as-is.
 *
 * Public API:
 *   window.__scramble.refresh()
 *   window.__scramble.run(el)
 *
 * See /scramble-text/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DEFAULT_CHARS = '!<>-_\\/[]{}—=+*^?#%@&░▒▓01';

  function attach(el) {
    if (el.dataset.aedScrReady === '1') return;
    el.dataset.aedScrReady = '1';

    var trigger = (el.getAttribute('data-aed-scr-trigger') || 'scroll').toLowerCase();
    var target = el.textContent || '';
    el._aedScrTarget = target;

    if (REDUCED) return; // skip — text already correct

    if (trigger === 'load') {
      run(el);
    } else if (trigger === 'hover') {
      el.addEventListener('mouseenter', function () { run(el); });
    } else {
      // scroll (default)
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            io.disconnect();
            run(el);
          });
        }, { threshold: 0.4 });
        io.observe(el);
      } else {
        run(el);
      }
    }
  }

  function run(el) {
    var target = el._aedScrTarget || el.textContent || '';
    if (!target) return;

    var duration = parseInt(el.getAttribute('data-aed-scr-duration') || '900', 10);
    var cycles   = parseInt(el.getAttribute('data-aed-scr-cycles')   || '4', 10);
    var chars    = el.getAttribute('data-aed-scr-chars') || DEFAULT_CHARS;

    var n = target.length;
    var totalSteps = n * cycles + n;          // scramble per char + reveal per char
    var stepMs = Math.max(20, Math.floor(duration / totalSteps));

    var revealAt = [];
    for (var i = 0; i < n; i++) {
      revealAt[i] = Math.floor((i + cycles) * (totalSteps / (n + cycles))) - 0;
    }

    var step = 0;
    function tick() {
      var html = '';
      for (var i = 0; i < n; i++) {
        var ch = target.charAt(i);
        if (ch === ' ' || ch === '\n') { html += ch; continue; }
        if (step >= revealAt[i]) {
          html += '<span>' + escapeHtml(ch) + '</span>';
        } else {
          var rand = chars.charAt(Math.floor(Math.random() * chars.length));
          html += '<span class="aed-scr-pending">' + escapeHtml(rand) + '</span>';
        }
      }
      el.innerHTML = html;
      step += 1;
      if (step <= totalSteps) {
        setTimeout(tick, stepMs);
      } else {
        el.textContent = target;
      }
    }
    tick();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function scan() {
    document.querySelectorAll('[data-aed-scramble]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__scramble = {
    version: VERSION,
    refresh: scan,
    run: run,
  };
})();
