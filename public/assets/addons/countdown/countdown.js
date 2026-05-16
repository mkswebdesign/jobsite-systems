/*
 * Countdown — drop-in tick-down to a target datetime.
 *
 * Two surfaces:
 *   <!-- Inline string: "in 5d 12h 30m" -->
 *   <span data-aed-countdown="2026-05-15T17:00:00Z"></span>
 *
 *   <!-- Card with discrete cells -->
 *   <div data-aed-countdown="2026-05-15T17:00:00Z" data-aed-cd-card></div>
 *
 *   <!-- Custom expired text -->
 *   <span data-aed-countdown="2026-05-15T17:00:00Z"
 *         data-aed-cd-expired="It's live!"></span>
 *
 *   <!-- Hide entirely after expiry -->
 *   <span data-aed-countdown="2026-05-15T17:00:00Z"
 *         data-aed-cd-hide-on-expire></span>
 *
 * Updates every second when within 1 minute, every minute otherwise.
 * Pauses when tab is hidden.
 *
 * Public API:
 *   window.__countdown.refresh()
 *   window.__countdown.parts(target)   { days, hours, minutes, seconds, expired }
 *
 * See /countdown/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function parts(target, now) {
    var t = (target instanceof Date) ? target.getTime() : Date.parse(target);
    if (isNaN(t)) return null;
    var n = now || Date.now();
    var diff = t - n;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, ms: 0 };
    var s = Math.floor(diff / 1000);
    var m = Math.floor(s / 60); s -= m * 60;
    var h = Math.floor(m / 60); m -= h * 60;
    var d = Math.floor(h / 24); h -= d * 24;
    return { days: d, hours: h, minutes: m, seconds: s, expired: false, ms: diff };
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function inlineText(p) {
    if (p.expired) return '';
    if (p.days > 0)    return 'in ' + p.days + 'd ' + p.hours + 'h ' + p.minutes + 'm';
    if (p.hours > 0)   return 'in ' + p.hours + 'h ' + p.minutes + 'm';
    if (p.minutes > 0) return 'in ' + p.minutes + 'm ' + p.seconds + 's';
    return 'in ' + p.seconds + 's';
  }

  function buildCard(el, p) {
    if (el.dataset.aedCdReady === 'card') return;
    el.dataset.aedCdReady = 'card';
    el.classList.add('aed-cd-card');
    el.innerHTML =
      cell('days') + sep() +
      cell('hours') + sep() +
      cell('minutes') + sep() +
      cell('seconds');
  }
  function cell(label) {
    return '<div class="aed-cd-cell" data-aed-cd-key="' + label + '">' +
      '<span class="aed-cd-num">--</span>' +
      '<span class="aed-cd-label">' + label + '</span>' +
    '</div>';
  }
  function sep() { return '<span class="aed-cd-sep" aria-hidden="true">:</span>'; }

  function paint(el) {
    var target = el.getAttribute('data-aed-countdown');
    var p = parts(target);
    if (!p) return;

    if (p.expired) {
      if (el.hasAttribute('data-aed-cd-hide-on-expire')) {
        el.hidden = true;
        return;
      }
      var expiredText = el.getAttribute('data-aed-cd-expired') || 'Now';
      if (el.hasAttribute('data-aed-cd-card')) {
        el.classList.remove('aed-cd-card');
        el.textContent = expiredText;
      } else {
        el.textContent = expiredText;
      }
      el._aedCdDone = true;
      return;
    }

    if (el.hasAttribute('data-aed-cd-card')) {
      buildCard(el, p);
      el.querySelector('[data-aed-cd-key="days"] .aed-cd-num').textContent = pad(p.days);
      el.querySelector('[data-aed-cd-key="hours"] .aed-cd-num').textContent = pad(p.hours);
      el.querySelector('[data-aed-cd-key="minutes"] .aed-cd-num').textContent = pad(p.minutes);
      el.querySelector('[data-aed-cd-key="seconds"] .aed-cd-num').textContent = pad(p.seconds);
    } else {
      el.textContent = inlineText(p);
    }
  }

  var elements = [];
  var paused = false;
  var fastTimer = null, slowTimer = null;

  function paintAll() {
    if (paused) return;
    var anyFast = false;
    elements.forEach(function (el) {
      if (el._aedCdDone) return;
      var target = el.getAttribute('data-aed-countdown');
      var p = parts(target);
      if (p && !p.expired && p.ms < 60_000) anyFast = true;
      paint(el);
    });
    schedule(anyFast);
  }

  function schedule(fast) {
    clearTimeout(fastTimer); fastTimer = null;
    clearTimeout(slowTimer); slowTimer = null;
    if (fast) {
      fastTimer = setTimeout(paintAll, 1000);
    } else {
      slowTimer = setTimeout(paintAll, 60_000);
    }
  }

  function scan() {
    elements = Array.prototype.slice.call(document.querySelectorAll('[data-aed-countdown]'));
    paintAll();
  }

  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
    if (!paused) paintAll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__countdown = {
    version: VERSION,
    refresh: scan,
    parts: parts,
  };
})();
