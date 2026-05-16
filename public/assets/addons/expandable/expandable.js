/*
 * Expandable — drop-in line-clamp truncation with toggle.
 *
 *   <div data-aed-expand-after="6">
 *     Long content here…
 *   </div>
 *
 *   <!-- Custom labels -->
 *   <div data-aed-expand-after="4"
 *        data-aed-expand-more="Show more"
 *        data-aed-expand-less="Hide">
 *     …
 *   </div>
 *
 * Behavior:
 *   - Wraps existing children in <div class="aed-exp-content is-collapsed">
 *     with --aed-exp-lines set from data-aed-expand-after.
 *   - Appends a button that toggles is-collapsed on click.
 *   - Skips elements whose visible height is already shorter than the
 *     clamped height (no point in a toggle that does nothing).
 *
 * Public API:
 *   window.__expandable.refresh()
 *   window.__expandable.expand(el)
 *   window.__expandable.collapse(el)
 *
 * See /expandable/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function attach(el) {
    if (el.dataset.aedExpReady === '1') return;
    el.dataset.aedExpReady = '1';

    var lines = parseInt(el.getAttribute('data-aed-expand-after') || '4', 10);
    var moreLabel = el.getAttribute('data-aed-expand-more') || 'Read more';
    var lessLabel = el.getAttribute('data-aed-expand-less') || 'Read less';

    // Wrap children
    var content = document.createElement('div');
    content.className = 'aed-exp-content is-collapsed';
    content.style.setProperty('--aed-exp-lines', String(lines));
    while (el.firstChild) content.appendChild(el.firstChild);
    el.appendChild(content);

    // Skip when the content is too short to bother
    requestAnimationFrame(function () {
      var fullHeight = content.scrollHeight;
      var clampedHeight = content.clientHeight;
      if (fullHeight <= clampedHeight + 2) {
        // Already fits — leave expanded, hide controls
        content.classList.remove('is-collapsed');
        return;
      }

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'aed-exp-toggle';
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = moreLabel;
      btn.addEventListener('click', function () {
        var collapsed = content.classList.toggle('is-collapsed');
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        btn.textContent = collapsed ? moreLabel : lessLabel;
      });
      el.appendChild(btn);
    });
  }

  function expand(el) {
    var c = el.querySelector('.aed-exp-content');
    var b = el.querySelector('.aed-exp-toggle');
    if (c) c.classList.remove('is-collapsed');
    if (b) { b.setAttribute('aria-expanded', 'true'); b.textContent = el.getAttribute('data-aed-expand-less') || 'Read less'; }
  }
  function collapse(el) {
    var c = el.querySelector('.aed-exp-content');
    var b = el.querySelector('.aed-exp-toggle');
    if (c) c.classList.add('is-collapsed');
    if (b) { b.setAttribute('aria-expanded', 'false'); b.textContent = el.getAttribute('data-aed-expand-more') || 'Read more'; }
  }

  function scan() {
    document.querySelectorAll('[data-aed-expand-after]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__expandable = {
    version: VERSION,
    refresh: scan,
    expand: expand,
    collapse: collapse,
  };
})();
