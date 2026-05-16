/*
 * Typewriter — drop-in cycling-text effect.
 *
 *   <h1>We <span data-aed-typewriter='["design.","launch.","maintain."]'></span></h1>
 *
 *   <!-- Pipe-separated values (no JSON syntax) -->
 *   <span data-aed-typewriter="design.|launch.|maintain."
 *         data-aed-tw-sep="|"></span>
 *
 *   <!-- Custom timing -->
 *   <span data-aed-typewriter='["one","two","three"]'
 *         data-aed-tw-type="80"
 *         data-aed-tw-erase="40"
 *         data-aed-tw-hold="1500"
 *         data-aed-tw-loop></span>
 *
 *   <!-- No caret (text only) -->
 *   <span data-aed-typewriter='["one","two"]' data-aed-tw-no-caret></span>
 *
 * Per-element attributes:
 *   data-aed-typewriter      JSON array OR sep-delimited string of phrases
 *   data-aed-tw-sep          separator when not JSON (default ',')
 *   data-aed-tw-type         ms per character while typing (default 70)
 *   data-aed-tw-erase        ms per character while erasing (default 35)
 *   data-aed-tw-hold         ms to hold a phrase before erasing (default 1800)
 *   data-aed-tw-loop         loop forever (otherwise stops on last phrase)
 *   data-aed-tw-no-caret     hide the blinking caret
 *
 * Reduced motion: all phrases shown instantly cycled (every `hold`
 * interval) — no per-character animation.
 *
 * Public API:
 *   window.__typewriter.refresh()
 *
 * See /typewriter/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function parsePhrases(el) {
    var raw = el.getAttribute('data-aed-typewriter') || '';
    raw = raw.trim();
    if (raw.charAt(0) === '[') {
      try {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.map(String);
      } catch (_) {}
    }
    var sep = el.getAttribute('data-aed-tw-sep') || ',';
    return raw.split(sep).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function attach(el) {
    if (el.dataset.aedTwReady === '1') return;
    el.dataset.aedTwReady = '1';

    var phrases = parsePhrases(el);
    if (!phrases.length) return;

    var typeMs  = parseInt(el.getAttribute('data-aed-tw-type')  || '70', 10);
    var eraseMs = parseInt(el.getAttribute('data-aed-tw-erase') || '35', 10);
    var holdMs  = parseInt(el.getAttribute('data-aed-tw-hold')  || '1800', 10);
    var loop    = el.hasAttribute('data-aed-tw-loop');
    var noCaret = el.hasAttribute('data-aed-tw-no-caret');

    el.textContent = '';
    var text = document.createElement('span');
    text.className = 'aed-tw-text';
    el.appendChild(text);

    if (!noCaret) {
      var caret = document.createElement('span');
      caret.className = 'aed-tw-caret';
      caret.setAttribute('aria-hidden', 'true');
      el.appendChild(caret);
    }

    if (REDUCED) {
      // Just cycle full phrases at hold cadence
      var i0 = 0;
      text.textContent = phrases[0];
      if (phrases.length > 1) {
        setInterval(function () {
          i0 = loop ? (i0 + 1) % phrases.length : Math.min(i0 + 1, phrases.length - 1);
          text.textContent = phrases[i0];
        }, holdMs);
      }
      return;
    }

    var phraseIdx = 0;
    var charIdx = 0;
    var typing = true;

    function step() {
      var current = phrases[phraseIdx];
      if (typing) {
        charIdx += 1;
        text.textContent = current.slice(0, charIdx);
        if (charIdx >= current.length) {
          typing = false;
          setTimeout(step, holdMs);
          return;
        }
        setTimeout(step, typeMs);
      } else {
        charIdx -= 1;
        text.textContent = current.slice(0, Math.max(0, charIdx));
        if (charIdx <= 0) {
          typing = true;
          var next = phraseIdx + 1;
          if (next >= phrases.length) {
            if (!loop) { text.textContent = current; return; }
            next = 0;
          }
          phraseIdx = next;
          setTimeout(step, typeMs);
          return;
        }
        setTimeout(step, eraseMs);
      }
    }

    setTimeout(step, typeMs);
  }

  function scan() {
    document.querySelectorAll('[data-aed-typewriter]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__typewriter = {
    version: VERSION,
    refresh: scan,
  };
})();
