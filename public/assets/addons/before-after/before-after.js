/*
 * Before/After — drop-in image comparison slider.
 *
 *   <div data-aed-before-after data-aed-ba-start="50">
 *     <img src="/work/before.jpg" alt="Before redesign">
 *     <img src="/work/after.jpg"  alt="After redesign">
 *     <!-- Optional labels -->
 *     <span data-aed-ba-label="before">Before</span>
 *     <span data-aed-ba-label="after">After</span>
 *   </div>
 *
 * Children expected: 2 <img> tags (first = before, second = after).
 * Optional <span data-aed-ba-label="before|after"> children become
 * corner labels.
 *
 * Per-container attributes:
 *   data-aed-before-after        opt-in marker
 *   data-aed-ba-start            initial position 0–100 (default 50)
 *
 * Public API:
 *   window.__beforeAfter.refresh()
 *   window.__beforeAfter.set(el, percent)
 *
 * See /before-after/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var HANDLE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="9 18 3 12 9 6"/><polyline points="15 6 21 12 15 18"/></svg>';

  function attach(el) {
    if (el.dataset.aedBaReady === '1') return;
    el.dataset.aedBaReady = '1';
    el.classList.add('aed-ba');
    el.setAttribute('role', 'img');
    if (!el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', 'Before / after image comparison');
    }

    // Find the two images
    var imgs = el.querySelectorAll(':scope > img');
    if (imgs.length < 2) return;
    imgs[0].classList.add('aed-ba-img', 'aed-ba-before');
    imgs[1].classList.add('aed-ba-img', 'aed-ba-after');

    // Move labels (if any) into known positions
    el.querySelectorAll(':scope > [data-aed-ba-label]').forEach(function (lbl) {
      var which = (lbl.getAttribute('data-aed-ba-label') || 'before').toLowerCase();
      lbl.classList.add('aed-ba-label', which === 'after' ? 'aed-ba-label-after' : 'aed-ba-label-before');
    });

    // Build divider + handle
    var divider = document.createElement('div');
    divider.className = 'aed-ba-divider';
    divider.setAttribute('role', 'slider');
    divider.setAttribute('aria-label', 'Reveal slider');
    divider.setAttribute('aria-valuemin', '0');
    divider.setAttribute('aria-valuemax', '100');
    divider.tabIndex = 0;

    var handle = document.createElement('span');
    handle.className = 'aed-ba-handle';
    handle.innerHTML = HANDLE_SVG;
    divider.appendChild(handle);
    el.appendChild(divider);

    var start = parseFloat(el.getAttribute('data-aed-ba-start'));
    if (!isFinite(start) || start < 0 || start > 100) start = 50;
    set(el, start);

    // Drag handlers
    var dragging = false;
    function pos(clientX) {
      var rect = el.getBoundingClientRect();
      var x = clientX - rect.left;
      return Math.max(0, Math.min(100, (x / rect.width) * 100));
    }
    function down(e) {
      dragging = true;
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      set(el, pos(x));
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      set(el, pos(x));
    }
    function up() { dragging = false; }

    el.addEventListener('mousedown', down);
    el.addEventListener('touchstart', down, { passive: false });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);

    divider.addEventListener('keydown', function (e) {
      var current = parseFloat(el.style.getPropertyValue('--aed-ba-pos')) || 50;
      var step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft')      { set(el, Math.max(0,   current - step)); e.preventDefault(); }
      else if (e.key === 'ArrowRight'){ set(el, Math.min(100, current + step)); e.preventDefault(); }
      else if (e.key === 'Home')      { set(el, 0); e.preventDefault(); }
      else if (e.key === 'End')       { set(el, 100); e.preventDefault(); }
    });
  }

  function set(el, percent) {
    el.style.setProperty('--aed-ba-pos', percent + '%');
    var d = el.querySelector('.aed-ba-divider');
    if (d) d.setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  function scan() {
    document.querySelectorAll('[data-aed-before-after]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__beforeAfter = {
    version: VERSION,
    refresh: scan,
    set: set,
  };
})();
