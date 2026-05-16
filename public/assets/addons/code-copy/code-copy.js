/*
 * Code Copy — drop-in copy button for <pre><code>.
 *
 * Three modes (controlled by a single meta):
 *   <meta name="aed:code-copy" content="auto">   every <pre> on the page
 *   <meta name="aed:code-copy" content="opt-in"> only <pre data-aed-code-copy>
 *   (no meta)                                    addon does nothing
 *
 * Per-pre opt-out (when in auto mode):
 *   <pre data-aed-code-copy="off">...</pre>
 *
 * Language label inference:
 *   <code class="language-bash">    → "BASH"
 *   <pre data-language="json">      → "JSON"
 *   (otherwise no label)
 *
 * Idempotent: skips any <pre> that already has a copy button child
 * (matches `.aed-code-copy`, `.fg-copy`, `.copy-btn`, or any
 * `[data-copy-button]` element). Safe to enable on pages with their
 * own copy mechanism.
 *
 * Public API:
 *   window.__codeCopy.refresh()   — re-scan after dynamic insert
 *   window.__codeCopy.attach(pre) — manually attach to one element
 *
 * See /code-copy/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var meta = document.querySelector('meta[name="aed:code-copy"]');
  if (!meta) return;
  var mode = (meta.getAttribute('content') || '').toLowerCase();
  if (mode !== 'auto' && mode !== 'opt-in') return;

  var EXISTING_BTN_SEL = '.aed-code-copy, .fg-copy, .copy-btn, [data-copy-button]';

  var ICON_COPY =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
    '</svg>';
  var ICON_CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="20 6 9 17 4 12"/></svg>';

  function detectLang(pre) {
    if (pre.dataset.language) return pre.dataset.language.toLowerCase();
    var code = pre.querySelector('code');
    if (!code) return null;
    var classes = (code.className || '').split(/\s+/);
    for (var i = 0; i < classes.length; i++) {
      var m = classes[i].match(/^(?:language|lang)-(.+)$/);
      if (m) return m[1].toLowerCase();
    }
    return null;
  }

  function shouldSkip(pre) {
    if (pre.dataset.aedCodeCopyReady === '1') return true;
    if (mode === 'auto' && pre.getAttribute('data-aed-code-copy') === 'off') return true;
    if (mode === 'opt-in' && !pre.hasAttribute('data-aed-code-copy')) return true;
    if (pre.querySelector(EXISTING_BTN_SEL)) return true;
    // Skip <pre> that's just a single-word inline-style snippet (likely decorative)
    var text = (pre.textContent || '').trim();
    if (!text || text.length < 6) return true;
    return false;
  }

  function attach(pre) {
    if (shouldSkip(pre)) return;
    pre.dataset.aedCodeCopyReady = '1';

    var lang = detectLang(pre);
    if (lang) {
      var label = document.createElement('span');
      label.className = 'aed-code-lang';
      label.textContent = lang;
      pre.appendChild(label);
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aed-code-copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.innerHTML = ICON_COPY + '<span class="aed-code-copy-text">Copy</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      doCopy(pre, btn);
    });
    pre.appendChild(btn);
  }

  function getCodeText(pre) {
    // Clone to strip out our own button + label before reading text
    var clone = pre.cloneNode(true);
    clone.querySelectorAll('.aed-code-copy, .aed-code-lang').forEach(function (n) { n.remove(); });
    return (clone.textContent || '').replace(/\n+$/, '');
  }

  function doCopy(pre, btn) {
    var text = getCodeText(pre);
    var done = function () {
      btn.classList.add('is-copied');
      btn.innerHTML = ICON_CHECK + '<span class="aed-code-copy-text">Copied</span>';
      setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.innerHTML = ICON_COPY + '<span class="aed-code-copy-text">Copy</span>';
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-10000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
      ta.remove();
    }
  }

  function scan() {
    document.querySelectorAll('pre').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__codeCopy = {
    version: VERSION,
    refresh: scan,
    attach: attach,
  };
})();
