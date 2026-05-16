/*
 * Color Picker — drop-in styled <input type="color"> + hex input.
 *
 *   <input type="color" data-aed-color name="brand" value="#6B00FF">
 *
 *   <!-- Hex input synchronizes with the swatch and the native input -->
 *   <input type="color" data-aed-color name="accent" value="#10b981">
 *
 * Per-element attributes:
 *   data-aed-color     opt-in marker (input must be type="color")
 *
 * Behavior:
 *   - Wraps the native input in a styled container with a click-to-pick
 *     swatch + a hex text field that syncs both ways.
 *   - The native <input type="color"> remains as the canonical value
 *     source for forms.
 *
 * Public API:
 *   window.__color.refresh()
 *   window.__color.set(input, hex)
 *
 * See /color-picker/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

  function normalize(hex) {
    if (!hex) return null;
    var s = String(hex).trim().toLowerCase();
    if (s.charAt(0) !== '#') s = '#' + s;
    if (!HEX_RE.test(s)) return null;
    if (s.length === 4) {
      // Expand #abc → #aabbcc
      s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    }
    return s;
  }

  function attach(input) {
    if (input.dataset.aedCpReady === '1') return;
    input.dataset.aedCpReady = '1';

    var initial = normalize(input.value) || '#6b00ff';
    input.value = initial;

    var wrap = document.createElement('div');
    wrap.className = 'aed-cp';
    input.parentNode.insertBefore(wrap, input);

    var swatch = document.createElement('label');
    swatch.className = 'aed-cp-swatch';
    swatch.style.setProperty('--aed-cp-color', initial);
    swatch.appendChild(input);
    wrap.appendChild(swatch);

    var hex = document.createElement('input');
    hex.type = 'text';
    hex.className = 'aed-cp-hex';
    hex.value = initial.toUpperCase();
    hex.maxLength = 7;
    hex.setAttribute('aria-label', input.getAttribute('aria-label') || 'Color hex value');
    hex.spellcheck = false;
    hex.autocapitalize = 'characters';
    wrap.appendChild(hex);

    input.addEventListener('input', function () {
      var v = normalize(input.value);
      if (!v) return;
      swatch.style.setProperty('--aed-cp-color', v);
      hex.value = v.toUpperCase();
      hex.classList.remove('is-invalid');
    });

    hex.addEventListener('input', function () {
      var v = normalize(hex.value);
      if (!v) {
        hex.classList.add('is-invalid');
        return;
      }
      hex.classList.remove('is-invalid');
      input.value = v;
      swatch.style.setProperty('--aed-cp-color', v);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    hex.addEventListener('blur', function () {
      // If left invalid, snap back to last valid input value
      if (!normalize(hex.value)) {
        hex.value = input.value.toUpperCase();
        hex.classList.remove('is-invalid');
      }
    });

    input._aedCpSwatch = swatch;
    input._aedCpHex = hex;
  }

  function set(input, hex) {
    var v = normalize(hex);
    if (!v) return false;
    input.value = v;
    if (input._aedCpSwatch) input._aedCpSwatch.style.setProperty('--aed-cp-color', v);
    if (input._aedCpHex) input._aedCpHex.value = v.toUpperCase();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function scan() {
    document.querySelectorAll('input[type="color"][data-aed-color]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__color = {
    version: VERSION,
    refresh: scan,
    set: set,
    normalize: normalize,
  };
})();
