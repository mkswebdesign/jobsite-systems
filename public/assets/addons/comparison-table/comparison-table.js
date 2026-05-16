/*
 * Comparison Table — drop-in JSON-driven you-vs-them matrix.
 *
 * Hydrates [data-aed-compare] placeholders from a JSON config.
 *
 *   <div data-aed-compare data-aed-compare-source="aed-compare-pricing"></div>
 *
 *   <script type="application/json" id="aed-compare-pricing">
 *   {
 *     "columns": [
 *       { "label": "Feature" },
 *       { "label": "gomks", "you": true },
 *       { "label": "Typical agency" },
 *       { "label": "DIY builders" }
 *     ],
 *     "rows": [
 *       { "section": "What you get" },
 *       { "label": "Site design", "values": ["yes", "yes", "yes"] },
 *       { "label": "Hosting included", "values": ["yes", "no", "partial"] },
 *       { "label": "Updates included", "values": ["unlimited", "$$ extra", "DIY"] },
 *       { "section": "Process" },
 *       { "label": "Setup time", "values": ["1 week", "4–6 weeks", "0"] },
 *       { "label": "You manage a CMS", "values": ["no", "yes", "yes"] }
 *     ]
 *   }
 *   </script>
 *
 * Cell values:
 *   - "yes" / true / "✓"  →  green check glyph
 *   - "no"  / false       →  gray x glyph
 *   - "partial"           →  amber tilde
 *   - any other string    →  rendered as text
 *
 * Public API:
 *   window.__compare.refresh()
 *
 * See /comparison-table/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var ICONS = {
    yes:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    no:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    partial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>',
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function cellMarkup(v) {
    if (v === true || v === 'yes' || v === '✓') {
      return '<span class="aed-cmp-yes" aria-label="yes">' + ICONS.yes + '</span>';
    }
    if (v === false || v === 'no' || v === '✗' || v === 'x' || v == null) {
      return '<span class="aed-cmp-no" aria-label="no">' + ICONS.no + '</span>';
    }
    if (v === 'partial' || v === '~') {
      return '<span class="aed-cmp-partial" aria-label="partial">' + ICONS.partial + '</span>';
    }
    return escapeHtml(String(v));
  }

  function build(host, cfg) {
    if (!cfg || !Array.isArray(cfg.columns) || !Array.isArray(cfg.rows)) return;
    var youCol = cfg.columns.findIndex(function (c) { return c && c.you; });

    var html = '<table class="aed-cmp"><thead><tr>';
    cfg.columns.forEach(function (col, i) {
      html += '<th' + (col.you ? ' data-aed-cmp-you scope="col"' : ' scope="col"') + '>' +
        escapeHtml(col.label || '') + '</th>';
    });
    html += '</tr></thead><tbody>';

    cfg.rows.forEach(function (row) {
      if (row && row.section) {
        html += '<tr class="is-section"><td colspan="' + cfg.columns.length + '">' + escapeHtml(row.section) + '</td></tr>';
        return;
      }
      html += '<tr><th scope="row" style="text-align:left;font-weight:500;color:var(--text-primary,#fafafa);padding:0.85rem 1rem">' + escapeHtml(row.label || '') + '</th>';
      // values are aligned to columns *after* the first (label) column
      var vals = row.values || [];
      for (var i = 1; i < cfg.columns.length; i++) {
        var v = vals[i - 1];
        var isYou = (i === youCol);
        html += '<td' + (isYou ? ' data-aed-cmp-you' : '') + '>' + cellMarkup(v) + '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
    host.innerHTML = html;
  }

  function attach(el) {
    if (el.dataset.aedCmpReady === '1') return;
    el.dataset.aedCmpReady = '1';

    var sourceId = el.getAttribute('data-aed-compare-source');
    if (!sourceId) return;
    var script = document.getElementById(sourceId);
    if (!script) return;

    var cfg;
    try { cfg = JSON.parse(script.textContent || '{}'); }
    catch (_) { return; }

    build(el, cfg);
  }

  function scan() {
    document.querySelectorAll('[data-aed-compare]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__compare = {
    version: VERSION,
    refresh: scan,
    build: build,
  };
})();
