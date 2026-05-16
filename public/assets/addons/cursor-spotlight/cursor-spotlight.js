/*
 * Cursor Spotlight — drop-in soft highlight that follows the cursor.
 *
 *   <section data-aed-cursor-spotlight>...</section>
 *
 *   <!-- Custom size + opacity -->
 *   <section data-aed-cursor-spotlight
 *            style="--aed-cs-size:480px;--aed-cs-opacity:0.25">...</section>
 *
 * The JS only writes --aed-cs-x / --aed-cs-y CSS variables to track
 * the cursor inside opted-in elements. CSS does the actual paint.
 *
 * Public API:
 *   window.__cursorSpotlight.refresh()
 *
 * See /cursor-spotlight/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var IS_TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;
  if (IS_TOUCH) {
    window.__cursorSpotlight = { version: VERSION, refresh: function(){} };
    return;
  }

  // Demo pages render with the chrome stripped to feel like a fresh
  // demo of what a visitor's site could look like; the agency's
  // cursor-follow flair reads as out-of-character there. Skip
  // activation entirely — the CSS only paints when JS attaches the
  // `.is-hovered` class, so no listener attach = no spotlight.
  if (window.location.pathname.indexOf('/demo/') === 0) {
    window.__cursorSpotlight = { version: VERSION, refresh: function(){} };
    return;
  }

  function attach(el) {
    if (el.dataset.aedCsReady === '1') return;
    el.dataset.aedCsReady = '1';

    el.addEventListener('mouseenter', function () { el.classList.add('is-hovered'); });
    el.addEventListener('mouseleave', function () { el.classList.remove('is-hovered'); });
    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--aed-cs-x', x + '%');
      el.style.setProperty('--aed-cs-y', y + '%');
    });
  }

  function scan() {
    document.querySelectorAll('[data-aed-cursor-spotlight]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__cursorSpotlight = {
    version: VERSION,
    refresh: scan,
  };
})();
