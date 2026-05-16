/*
 * Flip Card — drop-in 3D flip card.
 *
 *   <div data-aed-flip>
 *     <div data-aed-flip-front>Front content</div>
 *     <div data-aed-flip-back>Back content (revealed on flip)</div>
 *   </div>
 *
 *   <!-- Trigger on hover (default) or click -->
 *   <div data-aed-flip data-aed-flip-trigger="click">...</div>
 *
 *   <!-- Flip axis: y (default — horizontal) or x (vertical) -->
 *   <div data-aed-flip data-aed-flip-axis="x">...</div>
 *
 * Per-container attributes:
 *   data-aed-flip            opt-in marker
 *   data-aed-flip-trigger    hover (default) | click
 *   data-aed-flip-axis       y (default) | x
 *
 * Public API:
 *   window.__flip.refresh()
 *   window.__flip.toggle(el)
 *
 * See /flip-card/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function attach(el) {
    if (el.dataset.aedFcReady === '1') return;
    el.dataset.aedFcReady = '1';

    var trigger = (el.getAttribute('data-aed-flip-trigger') || 'hover').toLowerCase();

    var front = el.querySelector('[data-aed-flip-front]');
    var back  = el.querySelector('[data-aed-flip-back]');
    if (!front || !back) return;

    front.classList.add('aed-fc-face', 'aed-fc-front');
    back.classList.add('aed-fc-face', 'aed-fc-back');

    var inner = document.createElement('div');
    inner.className = 'aed-fc-inner';
    el.insertBefore(inner, front);
    inner.appendChild(front);
    inner.appendChild(back);

    if (trigger === 'click') {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-pressed', 'false');
      el.addEventListener('click', function () { toggle(el); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle(el);
        }
      });
    }
  }

  function toggle(el) {
    var flipped = el.classList.toggle('is-flipped');
    if (el.getAttribute('role') === 'button') {
      el.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    }
  }

  function scan() {
    document.querySelectorAll('[data-aed-flip]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__flip = {
    version: VERSION,
    refresh: scan,
    toggle: toggle,
  };
})();
