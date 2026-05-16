/*
 * Timezone Converter — drop-in "your local time" annotator.
 *
 * Hydrates [data-aed-tz] elements. Source time is parsed in the
 * configured source timezone, then re-formatted for the visitor's
 * detected local timezone — labelled "(your time)".
 *
 *   <!-- ISO with explicit offset: source TZ inferred -->
 *   <span data-aed-tz="2026-05-15T14:00:00-05:00"></span>
 *
 *   <!-- Local time + explicit source TZ -->
 *   <span data-aed-tz="2026-05-15T14:00" data-aed-tz-from="America/Chicago"></span>
 *
 *   <!-- Time-only (uses today's date in the source zone) -->
 *   <span data-aed-tz="14:00" data-aed-tz-from="America/Chicago"></span>
 *
 *   <!-- Card variant: stacked source + local -->
 *   <span data-aed-tz="2026-05-15T14:00" data-aed-tz-from="America/Chicago"
 *         data-aed-tz-variant="card"></span>
 *
 *   <!-- Custom local label (default: "your time") -->
 *   <span data-aed-tz="14:00" data-aed-tz-from="America/Chicago"
 *         data-aed-tz-local-label="local"></span>
 *
 *   <!-- Show date too -->
 *   <span data-aed-tz="2026-05-15T14:00" data-aed-tz-from="America/Chicago"
 *         data-aed-tz-show-date></span>
 *
 * If the visitor's timezone matches the source, only the source string
 * is shown (no redundant "(your time)" suffix).
 *
 * Public API:
 *   window.__tz.refresh()
 *   window.__tz.format(date, tz, options)
 *
 * See /timezone-converter/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function localTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
    catch (_) { return 'UTC'; }
  }

  function tzAbbrev(tz, date) {
    try {
      var fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' });
      var parts = fmt.formatToParts(date || new Date());
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'timeZoneName') return parts[i].value;
    } catch (_) {}
    return '';
  }

  function format(date, tz, opts) {
    opts = opts || {};
    var fmt = new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: 'numeric', minute: '2-digit',
      year: opts.showDate ? 'numeric' : undefined,
      month: opts.showDate ? 'short' : undefined,
      day: opts.showDate ? 'numeric' : undefined,
    });
    return fmt.format(date);
  }

  // Parse "HH:MM" + source TZ + today's date → Date
  function parseTimeOnly(str, tz) {
    var m = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    // Build a "today in source tz" anchor
    var nowParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour12: false,
    }).formatToParts(new Date()).reduce(function (o, p) { o[p.type] = p.value; return o; }, {});
    var iso = nowParts.year + '-' + nowParts.month + '-' + nowParts.day +
      'T' + (m[1].length === 1 ? '0' + m[1] : m[1]) + ':' + m[2] + ':' + (m[3] || '00');
    return parseLocalInTz(iso, tz);
  }

  // Parse "YYYY-MM-DDTHH:MM[:SS]" as a wall-clock time IN the given tz → Date (UTC)
  function parseLocalInTz(iso, tz) {
    // Treat the ISO as UTC first, then compute the offset for that instant in `tz`,
    // and shift back. This handles DST correctly.
    var asIfUtc = new Date(iso + 'Z');
    if (isNaN(asIfUtc.getTime())) return null;
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    var parts = fmt.formatToParts(asIfUtc).reduce(function (o, p) { o[p.type] = p.value; return o; }, {});
    var asTzString = parts.year + '-' + parts.month + '-' + parts.day + 'T' +
      (parts.hour === '24' ? '00' : parts.hour) + ':' + parts.minute + ':' + parts.second + 'Z';
    var tzMs = Date.parse(asTzString);
    var offsetMs = asIfUtc.getTime() - tzMs;
    return new Date(asIfUtc.getTime() + offsetMs);
  }

  function parseAttr(value, sourceTz) {
    if (!value) return null;
    // ISO with explicit offset / Z
    if (/[+-]\d{2}:?\d{2}$|Z$/.test(value)) {
      var d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    // ISO date+time without offset → interpret in sourceTz
    if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(value)) {
      return parseLocalInTz(value, sourceTz);
    }
    // Time only
    if (/^\d{1,2}:\d{2}/.test(value)) {
      return parseTimeOnly(value, sourceTz);
    }
    var fb = new Date(value);
    return isNaN(fb.getTime()) ? null : fb;
  }

  function paint(el) {
    var raw = el.getAttribute('data-aed-tz');
    if (!raw) return;
    var sourceTz = el.getAttribute('data-aed-tz-from') || localTz();
    var d = parseAttr(raw, sourceTz);
    if (!d) return;

    var visitorTz = localTz();
    var showDate = el.hasAttribute('data-aed-tz-show-date');
    var localLabel = el.getAttribute('data-aed-tz-local-label') || 'your time';

    var sourceText = format(d, sourceTz, { showDate: showDate });
    var sourceAbbr = tzAbbrev(sourceTz, d);
    var localText = format(d, visitorTz, { showDate: showDate });
    var localAbbr = tzAbbrev(visitorTz, d);

    var sameZone = visitorTz === sourceTz;
    el.classList.add('aed-tz');
    if (sameZone) el.classList.add('aed-tz-same');
    else el.classList.remove('aed-tz-same');

    el.innerHTML =
      '<span class="aed-tz-source">' + escapeHtml(sourceText) + (sourceAbbr ? ' ' + escapeHtml(sourceAbbr) : '') + '</span>' +
      (sameZone ? '' :
        '<span class="aed-tz-local">' + escapeHtml(localText) + (localAbbr ? ' ' + escapeHtml(localAbbr) : '') + ' (' + escapeHtml(localLabel) + ')</span>');

    el.setAttribute('title',
      sourceText + (sourceAbbr ? ' ' + sourceAbbr : '') +
      (sameZone ? '' : '\n' + localText + (localAbbr ? ' ' + localAbbr : '') + ' (' + localLabel + ')'));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function scan() {
    document.querySelectorAll('[data-aed-tz]').forEach(paint);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__tz = {
    version: VERSION,
    refresh: scan,
    format: format,
    localTz: localTz,
  };
})();
