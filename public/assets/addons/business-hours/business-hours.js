/*
 * Business Hours — drop-in open/closed status pill.
 *
 * Reads a single config block, hydrates every <span data-aed-business-hours>
 * on the page. Timezone-aware via Intl.DateTimeFormat — handles DST
 * automatically. Re-evaluates every minute; pauses when tab hidden.
 *
 *   <script type="application/json" id="aed-business-hours">
 *   { "timezone": "America/Chicago",
 *     "hours": {
 *       "mon": [{"open":"09:00","close":"18:00"}],
 *       "tue": [{"open":"09:00","close":"18:00"}],
 *       "wed": [{"open":"09:00","close":"18:00"}],
 *       "thu": [{"open":"09:00","close":"18:00"}],
 *       "fri": [{"open":"09:00","close":"17:00"}],
 *       "sat": [], "sun": []
 *     },
 *     "soonMinutes": 30,
 *     "exceptions": [
 *       { "date": "2026-12-25", "closed": true, "label": "Closed for Christmas" },
 *       { "date": "2026-12-31", "hours": [{"open":"09:00","close":"13:00"}] }
 *     ] }
 *   </script>
 *
 *   <span data-aed-business-hours></span>                              full pill
 *   <span data-aed-business-hours data-aed-variant="compact"></span>   status only
 *   <span data-aed-business-hours data-aed-variant="dot-only"></span>  dot only
 *   <span data-aed-business-hours data-aed-variant="card"></span>      block card
 *
 * Public API:
 *   window.__hours.refresh()    — re-render all elements with current state
 *   window.__hours.compute()    — returns the current state object
 *   window.__hours.set(cfg)     — override config + re-render
 *
 * See /business-hours/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var DAY_LABELS = { sun:'Sunday', mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday' };
  var DAY_SHORT  = { sun:'Sun', mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat' };

  // -- Load config --------------------------------------------------
  var configEl = document.getElementById('aed-business-hours');
  if (!configEl) {
    document.querySelectorAll('[data-aed-business-hours]').forEach(function (el) { el.hidden = true; });
    window.__hours = { version: VERSION, refresh: function(){}, compute: function(){return null;}, set: function(){} };
    return;
  }

  var config;
  try { config = JSON.parse(configEl.textContent || '{}'); }
  catch (_) { return; }

  if (!config.hours) return;
  if (!config.timezone) config.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (config.soonMinutes == null) config.soonMinutes = 30;
  config.exceptions = config.exceptions || [];

  // -- Time helpers -------------------------------------------------
  function parseHM(s) {
    var m = String(s || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function zoneParts(date) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: config.timezone, hour12: false,
      weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    var parts = fmt.formatToParts(date).reduce(function (o, p) { o[p.type] = p.value; return o; }, {});
    return {
      weekday: parts.weekday.toLowerCase(),                 // 'mon'…
      isoDate: parts.year + '-' + parts.month + '-' + parts.day,
      minutes: (parseInt(parts.hour, 10) === 24 ? 0 : parseInt(parts.hour, 10)) * 60 + parseInt(parts.minute, 10),
    };
  }

  function hoursForDay(weekdayKey, isoDate) {
    // Exceptions win — match by ISO date
    for (var i = 0; i < config.exceptions.length; i++) {
      var ex = config.exceptions[i];
      if (ex.date !== isoDate) continue;
      if (ex.closed) return { ranges: [], label: ex.label || null };
      if (ex.hours) return { ranges: parseRanges(ex.hours), label: ex.label || null };
    }
    return { ranges: parseRanges(config.hours[weekdayKey] || []), label: null };
  }

  function parseRanges(arr) {
    return (arr || []).map(function (r) {
      return { open: parseHM(r.open), close: parseHM(r.close) };
    }).filter(function (r) { return r.open != null && r.close != null && r.close > r.open; });
  }

  function fmtTime(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var ampm = h >= 12 ? 'pm' : 'am';
    var hh = h % 12; if (hh === 0) hh = 12;
    return m === 0 ? (hh + ampm) : (hh + ':' + (m < 10 ? '0' + m : m) + ampm);
  }

  function tzAbbrev() {
    try {
      var fmt = new Intl.DateTimeFormat('en-US', { timeZone: config.timezone, timeZoneName: 'short' });
      var parts = fmt.formatToParts(new Date());
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'timeZoneName') return parts[i].value;
    } catch (_) {}
    return '';
  }

  // -- State computation ------------------------------------------
  function compute(now) {
    now = now || new Date();
    var z = zoneParts(now);
    var todayKey = z.weekday;
    var today = hoursForDay(todayKey, z.isoDate);

    // Are we currently inside any open range today?
    var current = null, nextToday = null;
    for (var i = 0; i < today.ranges.length; i++) {
      var r = today.ranges[i];
      if (z.minutes >= r.open && z.minutes < r.close) { current = r; break; }
      if (z.minutes < r.open && (!nextToday || r.open < nextToday.open)) nextToday = r;
    }

    if (current) {
      var minutesToClose = current.close - z.minutes;
      return {
        status: minutesToClose <= config.soonMinutes ? 'closing-soon' : 'open',
        label: minutesToClose <= config.soonMinutes ? 'Closing soon' : 'Open',
        detail: 'Closes at ' + fmtTime(current.close) + (tzAbbrev() ? ' ' + tzAbbrev() : ''),
      };
    }

    // Closed — find next open slot, today or future
    var probe = nextToday;
    var dayOffset = 0;
    if (!probe) {
      for (var d = 1; d <= 7; d++) {
        var future = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
        var fz = zoneParts(future);
        var fhrs = hoursForDay(fz.weekday, fz.isoDate);
        if (fhrs.ranges.length) {
          probe = fhrs.ranges[0];
          dayOffset = d;
          break;
        }
      }
    }

    if (!probe) {
      return { status: 'closed', label: 'Closed', detail: '' };
    }

    if (dayOffset === 0) {
      var minsToOpen = probe.open - z.minutes;
      var detailToday = (minsToOpen <= config.soonMinutes ? 'Opens at ' : 'Opens at ') + fmtTime(probe.open);
      return {
        status: minsToOpen <= config.soonMinutes ? 'opening-soon' : 'closed',
        label: minsToOpen <= config.soonMinutes ? 'Opening soon' : 'Closed',
        detail: detailToday + (tzAbbrev() ? ' ' + tzAbbrev() : ''),
      };
    }

    var futureDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    var fz2 = zoneParts(futureDate);
    var dayName = dayOffset === 1 ? 'tomorrow' : DAY_SHORT[fz2.weekday];
    return {
      status: 'closed',
      label: 'Closed',
      detail: 'Opens ' + dayName + ' at ' + fmtTime(probe.open),
    };
  }

  // -- Render -----------------------------------------------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function paint(state) {
    document.querySelectorAll('[data-aed-business-hours]').forEach(function (el) {
      el.hidden = false;
      el.classList.add('aed-bh');
      el.setAttribute('data-aed-status', state.status);
      el.setAttribute('aria-label', state.label + (state.detail ? ' — ' + state.detail : ''));
      var inner =
        '<span class="aed-bh-dot" aria-hidden="true"></span>' +
        '<span class="aed-bh-row">' +
          '<span class="aed-bh-status">' + escapeHtml(state.label) + '</span>' +
          (state.detail ? '<span class="aed-bh-sep"> · </span><span class="aed-bh-detail">' + escapeHtml(state.detail) + '</span>' : '') +
        '</span>';
      el.innerHTML = inner;
    });
  }

  // -- Boot + tick -----------------------------------------------
  var paused = false;
  function tick() {
    if (paused) return;
    paint(compute());
  }
  function start() {
    tick();
    setInterval(tick, 60_000);
  }
  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
    if (!paused) tick();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__hours = {
    version: VERSION,
    refresh: tick,
    compute: function () { return compute(); },
    set: function (next) { config = next; tick(); },
    config: config,
  };
})();
