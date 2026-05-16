/*
 * Copy Button — drop-in generic copy-to-clipboard trigger.
 *
 *   <!-- Copy literal text -->
 *   <button data-aed-copy data-aed-copy-text="hello@gomks.com">Copy email</button>
 *
 *   <!-- Copy another element's textContent -->
 *   <span id="addr">123 Main St, Austin TX</span>
 *   <button data-aed-copy data-aed-copy-from="#addr">Copy address</button>
 *
 *   <!-- Variants -->
 *   <button data-aed-copy data-aed-copy-text="..." data-aed-copy-variant="ghost">Copy</button>
 *   <button data-aed-copy data-aed-copy-text="..." data-aed-copy-variant="icon" aria-label="Copy"></button>
 *
 *   <!-- Custom labels -->
 *   <button data-aed-copy data-aed-copy-text="..."
 *           data-aed-copy-label="Copy code"
 *           data-aed-copy-copied-label="✓ Copied!">Copy code</button>
 *
 * Per-element attributes:
 *   data-aed-copy                 opt-in marker
 *   data-aed-copy-text            literal text to copy (wins over -from)
 *   data-aed-copy-from            CSS selector → use that element's textContent
 *   data-aed-copy-label           idle button label (default: existing textContent)
 *   data-aed-copy-copied-label    label after copy (default "Copied")
 *   data-aed-copy-variant         ghost (no border) | icon (collapse label)
 *
 * Events fired on the button:
 *   'aed:copy:done'  detail = { text }
 *
 * Public API:
 *   window.__copyButton.refresh()
 *   window.__copyButton.copy(button)
 *
 * See /copy-button/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var ICON_COPY =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var ICON_CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="20 6 9 17 4 12"/></svg>';

  function attach(btn) {
    if (btn.dataset.aedCbReady === '1') return;
    btn.dataset.aedCbReady = '1';

    var original = btn.textContent.trim();
    var idleLabel = btn.getAttribute('data-aed-copy-label') || original || 'Copy';
    var copiedLabel = btn.getAttribute('data-aed-copy-copied-label') || 'Copied';
    btn.innerHTML = ICON_COPY + '<span class="aed-cb-text">' + escapeHtml(idleLabel) + '</span>';
    btn._aedCbLabels = { idle: idleLabel, copied: copiedLabel };

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      copy(btn);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function getText(btn) {
    var literal = btn.getAttribute('data-aed-copy-text');
    if (literal != null) return literal;
    var sel = btn.getAttribute('data-aed-copy-from');
    if (sel) {
      var src = document.querySelector(sel);
      if (src) return (src.textContent || '').trim();
    }
    return '';
  }

  function copy(btn) {
    var text = getText(btn);
    if (!text) return;
    var labels = btn._aedCbLabels || { idle: 'Copy', copied: 'Copied' };
    var done = function () {
      btn.classList.add('is-copied');
      btn.innerHTML = ICON_CHECK + '<span class="aed-cb-text">' + escapeHtml(labels.copied) + '</span>';
      btn.dispatchEvent(new CustomEvent('aed:copy:done', { detail: { text: text }, bubbles: true }));
      setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.innerHTML = ICON_COPY + '<span class="aed-cb-text">' + escapeHtml(labels.idle) + '</span>';
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.left = '-10000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
      ta.remove();
    }
  }

  function scan() {
    document.querySelectorAll('button[data-aed-copy], a[data-aed-copy]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__copyButton = {
    version: VERSION,
    refresh: scan,
    copy: copy,
  };
})();
