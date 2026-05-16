/*
 * Marquee — drop-in scrolling row.
 *
 * For every [data-aed-marquee] container, wraps its current children
 * in a `.aed-mq-track`, then duplicates them once so the CSS
 * `translateX(-50%)` animation loops seamlessly.
 *
 *   <div data-aed-marquee>
 *     <span>Static Compiled</span>
 *     <span>CDN Delivered</span>
 *     <span>Sub-Second Page Loads</span>
 *   </div>
 *
 *   <div data-aed-marquee data-aed-direction="right" data-aed-speed="60">
 *     <img src="/logos/a.svg" alt="A">
 *     <img src="/logos/b.svg" alt="B">
 *   </div>
 *
 *   <div data-aed-marquee data-aed-variant="logos" data-aed-pause-on-hover>...</div>
 *
 * Per-container attributes:
 *   data-aed-marquee            opt-in marker
 *   data-aed-direction          left (default) | right
 *   data-aed-speed              seconds for one full loop (default 40)
 *   data-aed-gap                gap between items (CSS length, default 2.5rem)
 *   data-aed-variant            logos for image-row defaults
 *   data-aed-pause-on-hover     pause animation on hover
 *
 * Public API:
 *   window.__marquee.refresh()    rebuild all marquees (after dynamic insert)
 *
 * See /marquee/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function attach(container) {
    if (container.dataset.aedMqReady === '1') return;
    container.dataset.aedMqReady = '1';

    var speed = container.getAttribute('data-aed-speed');
    if (speed) container.style.setProperty('--aed-mq-speed', parseFloat(speed) + 's');

    var gap = container.getAttribute('data-aed-gap');
    if (gap) container.style.setProperty('--aed-mq-gap', gap);

    // Move existing children into a track wrapper
    var track = document.createElement('div');
    track.className = 'aed-mq-track';
    while (container.firstChild) {
      track.appendChild(container.firstChild);
    }
    container.appendChild(track);

    // Duplicate so the loop is seamless
    var clones = [];
    Array.prototype.forEach.call(track.children, function (child) {
      var c = child.cloneNode(true);
      // Mark clones aria-hidden so SR doesn't read them twice
      c.setAttribute('aria-hidden', 'true');
      clones.push(c);
    });
    clones.forEach(function (c) { track.appendChild(c); });

    container.setAttribute('aria-label', container.getAttribute('aria-label') || 'Continuously scrolling content');
  }

  function scan() {
    document.querySelectorAll('[data-aed-marquee]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__marquee = {
    version: VERSION,
    refresh: scan,
  };
})();
