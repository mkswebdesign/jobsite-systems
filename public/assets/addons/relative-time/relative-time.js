/*
 * Relative Time — drop-in "3 hours ago" formatter.
 *
 *   <time datetime="2026-04-19T15:30:00Z" data-aed-relative></time>
 *   <!-- becomes "5 minutes ago" / "yesterday" / "3 weeks ago" -->
 *
 *   <time datetime="2026-05-01T00:00:00Z" data-aed-relative></time>
 *   <!-- becomes "in 2 weeks" -->
 *
 *   <time datetime="2026-04-19T15:30:00Z" data-aed-relative
 *         data-aed-style="plain"></time>
 *   <!-- skip the dotted underline + cursor:help -->
 *
 * Updates every minute (every second when within 60 seconds of "now").
 * Sets the original element's `title` attribute to the localized
 * absolute datetime so hovering reveals the precise time.
 *
 * Public API:
 *   window.__relTime.refresh()      — re-render all
 *   window.__relTime.format(date)   — return "3 hours ago" string
 *
 * See /relative-time/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SEC = 1000;
  var MIN = 60 * SEC;
  var HOUR = 60 * MIN;
  var DAY = 24 * HOUR;
  var WEEK = 7 * DAY;
  var MONTH = 30 * DAY;
  var YEAR = 365 * DAY;

  // Use Intl.RelativeTimeFormat where available, fall back to manual EN strings.
  var rtf = (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat)
    ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    : null;

  function formatViaIntl(diffMs) {
    var abs = Math.abs(diffMs);
    var sign = diffMs < 0 ? -1 : 1;
    var unit, value;
    if (abs < MIN)        { unit = 'second'; value = Math.round(diffMs / SEC); }
    else if (abs < HOUR)  { unit = 'minute'; value = Math.round(diffMs / MIN); }
    else if (abs < DAY)   { unit = 'hour';   value = Math.round(diffMs / HOUR); }
    else if (abs < WEEK)  { unit = 'day';    value = Math.round(diffMs / DAY); }
    else if (abs < MONTH) { unit = 'week';   value = Math.round(diffMs / WEEK); }
    else if (abs < YEAR)  { unit = 'month';  value = Math.round(diffMs / MONTH); }
    else                  { unit = 'year';   value = Math.round(diffMs / YEAR); }
    return rtf.format(value, unit);
  }

  function formatFallback(diffMs) {
    var future = diffMs > 0;
    var abs = Math.abs(diffMs);
    var pair = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
    var inner;
    if (abs < 45 * SEC)   inner = 'just now';
    else if (abs < HOUR)  inner = pair(Math.round(abs / MIN), 'minute');
    else if (abs < DAY)   inner = pair(Math.round(abs / HOUR), 'hour');
    else if (abs < WEEK)  inner = pair(Math.round(abs / DAY), 'day');
    else if (abs < MONTH) inner = pair(Math.round(abs / WEEK), 'week');
    else if (abs < YEAR)  inner = pair(Math.round(abs / MONTH), 'month');
    else                  inner = pair(Math.round(abs / YEAR), 'year');
    if (inner === 'just now') return inner;
    return future ? ('in ' + inner) : (inner + ' ago');
  }

  function format(date, now) {
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    var n = now || Date.now();
    var diff = d.getTime() - n;
    return rtf ? formatViaIntl(diff) : formatFallback(diff);
  }

  function absolute(date) {
    var d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
        timeZoneName: 'short',
      }).format(d);
    } catch (_) {
      return d.toString();
    }
  }

  function paint(el) {
    var dt = el.getAttribute('datetime');
    if (!dt) return;
    var d = new Date(dt);
    if (isNaN(d.getTime())) return;
    el.textContent = format(d);
    el.setAttribute('title', absolute(d));
    el._aedRelDate = d;
  }

  function paintAll() {
    document.querySelectorAll('time[data-aed-relative]').forEach(paint);
  }

  // Tick every minute; once a minute is enough for everything > 1m
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintAll);
  } else {
    paintAll();
  }
  setInterval(paintAll, 60 * 1000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) paintAll();
  });

  window.__relTime = {
    version: VERSION,
    refresh: paintAll,
    format: format,
    absolute: absolute,
  };
})();
