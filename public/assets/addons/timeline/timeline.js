/*
 * Timeline — drop-in vertical timeline.
 *
 *   <ol data-aed-timeline>
 *     <li data-when="2008">Founded MKS Web Design.</li>
 *     <li data-when="2018"  data-aed-tl-state="done">Shipped 100th site.</li>
 *     <li data-when="2026 Q2" data-aed-tl-state="alert">gomks launches.</li>
 *   </ol>
 *
 *   <!-- Two-column variant: date column on the left -->
 *   <ol data-aed-timeline data-aed-variant="two-col">
 *     <li data-when="Mar 2024">Started prototyping the productized model.</li>
 *     ...
 *   </ol>
 *
 * Per-item attributes:
 *   data-when               required — the date / period label
 *   data-aed-tl-state       optional — done | muted | alert (color-codes the dot)
 *
 * Public API:
 *   window.__timeline.refresh()
 *
 * See /timeline/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function attach(li) {
    if (li.dataset.aedTlReady === '1') return;
    li.dataset.aedTlReady = '1';

    // Wrap original children into .aed-tl-body
    var body = document.createElement('div');
    body.className = 'aed-tl-body';
    while (li.firstChild) body.appendChild(li.firstChild);

    // Date label
    var when = li.getAttribute('data-when');
    if (when) {
      var w = document.createElement('span');
      w.className = 'aed-tl-when';
      w.textContent = when;
      li.appendChild(w);
    }

    // Dot marker
    var dot = document.createElement('span');
    dot.className = 'aed-tl-dot';
    dot.setAttribute('aria-hidden', 'true');
    li.appendChild(dot);

    li.appendChild(body);
  }

  function scan() {
    document.querySelectorAll('[data-aed-timeline] > li').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__timeline = {
    version: VERSION,
    refresh: scan,
  };
})();
