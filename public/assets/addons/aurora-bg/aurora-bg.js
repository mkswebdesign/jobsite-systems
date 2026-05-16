/*
 * Aurora BG — optional site-wide auto-scope.
 *
 * The CSS in /aurora-bg/aurora-bg.css activates on any element with
 * [data-aed-aurora]. Sites that prefer config-driven activation can opt
 * in with a meta tag and the addon will stamp the attribute on matched
 * selectors at boot:
 *
 *   <meta name="aed:aurora-bg" content="on"
 *         data-auto-scope=".cta-section, .hero-pricing"
 *         data-auto-intensity="bold"
 *         data-auto-static>
 *
 * Per-element data-aed-aurora* values still win — the script never
 * overrides existing attributes.
 *
 * Per-page disable:
 *   <html data-aed-aurora-bg="off"> ... </html>
 *
 * See /aurora-bg/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.2.0';

  var meta = document.querySelector('meta[name="aed:aurora-bg"]');
  if (!meta) return;
  var on = (meta.getAttribute('content') || '').toLowerCase();
  if (on !== 'on' && on !== 'true' && on !== '1') return;
  if (document.documentElement.getAttribute('data-aed-aurora-bg') === 'off') return;

  // Site-wide tuning vars flow from meta config → <html> CSS vars. The
  // CSS in aurora-bg.css consumes each with a sensible fallback so
  // brands that haven't set any config render exactly as before.
  var root = document.documentElement;
  var durationRaw = meta.getAttribute('data-animation-duration-ms');
  if (durationRaw) {
    var durationN = parseInt(durationRaw, 10);
    if (Number.isFinite(durationN) && durationN > 0) {
      root.style.setProperty('--aed-aurora-duration', durationN + 'ms');
    }
  }
  var blurRaw = meta.getAttribute('data-orb-blur-px');
  if (blurRaw) {
    var blurN = parseInt(blurRaw, 10);
    if (Number.isFinite(blurN) && blurN >= 0) {
      root.style.setProperty('--aed-aurora-blur', blurN + 'px');
    }
  }
  var opacityRaw = meta.getAttribute('data-opacity');
  if (opacityRaw) {
    var opacityN = parseFloat(opacityRaw);
    if (Number.isFinite(opacityN) && opacityN >= 0 && opacityN <= 1) {
      root.style.setProperty('--aed-aurora-opacity', String(opacityN));
    }
  }
  var hueRaw = meta.getAttribute('data-hue-shift-deg');
  if (hueRaw) {
    var hueN = parseFloat(hueRaw);
    if (Number.isFinite(hueN)) {
      root.style.setProperty('--aed-aurora-hue', hueN + 'deg');
    }
  }

  var scope = meta.getAttribute('data-auto-scope');
  if (!scope) return;
  var intensity = (meta.getAttribute('data-auto-intensity') || '').toLowerCase();
  var staticMode = meta.hasAttribute('data-auto-static');

  function stamp() {
    document.querySelectorAll(scope).forEach(function (el) {
      if (!el.hasAttribute('data-aed-aurora')) {
        el.setAttribute('data-aed-aurora', '');
      }
      if (intensity && !el.hasAttribute('data-aed-aurora-intensity')) {
        if (intensity === 'subtle' || intensity === 'bold') {
          el.setAttribute('data-aed-aurora-intensity', intensity);
        }
      }
      if (staticMode && !el.hasAttribute('data-aed-aurora-static')) {
        el.setAttribute('data-aed-aurora-static', '');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', stamp);
  } else {
    stamp();
  }

  window.__auroraBg = { version: VERSION, refresh: stamp };
})();
