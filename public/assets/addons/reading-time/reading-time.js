/*
 * Reading Time — drop-in word-count → "5 min read" stamp.
 *
 *   <span data-aed-reading-time></span>
 *
 *   <!-- Custom scope (default first <article> on the page) -->
 *   <span data-aed-reading-time data-aed-rt-scope=".case-study"></span>
 *
 *   <!-- Custom WPM -->
 *   <span data-aed-reading-time data-aed-rt-wpm="220"></span>
 *
 *   <!-- Custom format string ({n} = minutes) -->
 *   <span data-aed-reading-time data-aed-rt-format="{n}-minute read"></span>
 *
 *   <!-- Hide icon -->
 *   <span data-aed-reading-time data-aed-rt-no-icon></span>
 *
 * Per-element attributes:
 *   data-aed-reading-time      opt-in marker
 *   data-aed-rt-scope          CSS selector for the content to count (default "article, main")
 *   data-aed-rt-wpm            words per minute (default 220 — average reading speed)
 *   data-aed-rt-min            minimum minutes to display (default 1)
 *   data-aed-rt-format         output template; {n} = minutes (default "{n} min read")
 *   data-aed-rt-no-icon        hide the leading clock icon
 *
 * Public API:
 *   window.__readingTime.refresh()
 *   window.__readingTime.estimate(scopeSelector, wpm)   { minutes, words }
 *
 * See /reading-time/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

  function countWords(scopeSel) {
    var roots = document.querySelectorAll(scopeSel);
    if (!roots.length) {
      // Fall back to <body> if no scope match
      var clone = document.body.cloneNode(true);
      stripChrome(clone);
      return tokensIn(clone.textContent || '');
    }
    var total = 0;
    roots.forEach(function (r) {
      var clone = r.cloneNode(true);
      stripChrome(clone);
      total += tokensIn(clone.textContent || '');
    });
    return total;
  }

  function stripChrome(root) {
    // Remove things that shouldn't count toward reading time
    root.querySelectorAll('script, style, nav, footer, aside, .aed-toc, [data-aed-versions], [data-aed-reading-time]').forEach(function (n) {
      n.remove();
    });
  }

  function tokensIn(text) {
    return (text.match(/\S+/g) || []).length;
  }

  function estimate(scopeSel, wpm) {
    var words = countWords(scopeSel);
    var minutes = Math.max(1, Math.round(words / (wpm || 220)));
    return { minutes: minutes, words: words };
  }

  function attach(el) {
    if (el.dataset.aedRtReady === '1') return;
    el.dataset.aedRtReady = '1';

    var scope = el.getAttribute('data-aed-rt-scope') || 'article, main';
    var wpm = parseInt(el.getAttribute('data-aed-rt-wpm') || '220', 10);
    var minMin = parseInt(el.getAttribute('data-aed-rt-min') || '1', 10);
    var format = el.getAttribute('data-aed-rt-format') || '{n} min read';
    var noIcon = el.hasAttribute('data-aed-rt-no-icon');

    var est = estimate(scope, wpm);
    var minutes = Math.max(minMin, est.minutes);

    el.textContent = '';
    if (!noIcon) {
      var ic = document.createElement('span');
      ic.innerHTML = ICON;
      el.appendChild(ic.firstChild);
    }
    var label = document.createElement('span');
    label.textContent = format.replace('{n}', String(minutes));
    el.appendChild(label);

    el.setAttribute('aria-label', label.textContent + ' (' + est.words + ' words)');
    el.setAttribute('title', est.words + ' words');
  }

  function scan() {
    document.querySelectorAll('[data-aed-reading-time]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__readingTime = {
    version: VERSION,
    refresh: scan,
    estimate: estimate,
  };
})();
