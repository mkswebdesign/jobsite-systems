/*
 * Copy Input — drop-in input with one-click copy button.
 *
 *   <input data-aed-copy value="https://gomks.com/?ref=anthony" readonly>
 *
 *   <input data-aed-copy value="GOMKS-LAUNCH-50" readonly
 *          data-aed-copy-label="Copy code">
 *
 *   <input data-aed-copy value="anthony@mkswebdesign.com" readonly
 *          data-aed-copy-select-on-focus>
 *
 * Per-element attributes:
 *   data-aed-copy                    opt-in marker
 *   data-aed-copy-label              button label (default "Copy")
 *   data-aed-copy-copied-label       label after copy (default "Copied")
 *   data-aed-copy-select-on-focus    select all when input gains focus
 *
 * Public API:
 *   window.__copyInput.refresh()
 *   window.__copyInput.copy(input)   programmatic copy + feedback
 *
 * See /copy-input/README.md.
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

  function attach(input) {
    if (input.dataset.aedCiReady === '1') return;
    input.dataset.aedCiReady = '1';

    var label = input.getAttribute('data-aed-copy-label') || 'Copy';
    var copiedLabel = input.getAttribute('data-aed-copy-copied-label') || 'Copied';
    var selectOnFocus = input.hasAttribute('data-aed-copy-select-on-focus');

    var wrap = document.createElement('div');
    wrap.className = 'aed-ci';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aed-ci-btn';
    btn.setAttribute('aria-label', 'Copy ' + (input.value || 'value'));
    btn.innerHTML = ICON_COPY + '<span class="aed-ci-label">' + escapeHtml(label) + '</span>';
    btn.addEventListener('click', function () { copy(input); });
    wrap.appendChild(btn);
    input._aedCiBtn = btn;
    input._aedCiLabels = { idle: label, copied: copiedLabel };

    if (selectOnFocus) {
      input.addEventListener('focus', function () { input.select(); });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function copy(input) {
    var btn = input._aedCiBtn;
    var labels = input._aedCiLabels || { idle: 'Copy', copied: 'Copied' };
    var done = function () {
      if (!btn) return;
      btn.classList.add('is-copied');
      btn.innerHTML = ICON_CHECK + '<span class="aed-ci-label">' + escapeHtml(labels.copied) + '</span>';
      setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.innerHTML = ICON_COPY + '<span class="aed-ci-label">' + escapeHtml(labels.idle) + '</span>';
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(input.value || '').then(done).catch(done);
    } else {
      input.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
    }
  }

  function scan() {
    document.querySelectorAll('input[data-aed-copy]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__copyInput = {
    version: VERSION,
    refresh: scan,
    copy: copy,
  };
})();
