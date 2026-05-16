/*
 * Segmented Control — drop-in iOS-style toggle group.
 *
 *   <div data-aed-segmented data-aed-segmented-name="billing">
 *     <button data-aed-value="annual" data-aed-default>Annual</button>
 *     <button data-aed-value="monthly">Monthly</button>
 *   </div>
 *
 * Per-container attributes:
 *   data-aed-segmented              opt-in marker
 *   data-aed-segmented-name         name dispatched in change events (required if you listen)
 *   data-aed-variant                compact | ghost
 *
 * Per-button attributes:
 *   data-aed-value                  required — the value selecting this button
 *   data-aed-default                marks the initially-active button
 *
 * Events fired on the container:
 *   'aed:segmented:change' detail = { name, value, previous }
 *
 * Public API:
 *   window.__segmented.set(name, value)   set by name (matches name="..." container)
 *   window.__segmented.get(name)          current value for that name
 *
 * See /segmented-control/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var byName = Object.create(null);

  function attach(container) {
    if (container.dataset.aedSegReady === '1') return;
    container.dataset.aedSegReady = '1';

    var name = container.getAttribute('data-aed-segmented-name') || '';
    if (name) byName[name] = container;

    container.setAttribute('role', 'tablist');

    var buttons = Array.prototype.slice.call(container.querySelectorAll(':scope > button'));
    if (!buttons.length) return;

    // Find initial selection
    var defaultBtn = buttons.filter(function (b) { return b.hasAttribute('data-aed-default'); })[0] || buttons[0];

    // Insert thumb element
    var thumb = document.createElement('span');
    thumb.className = 'aed-seg-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    container.insertBefore(thumb, container.firstChild);

    function moveThumbTo(btn) {
      var cRect = container.getBoundingClientRect();
      var bRect = btn.getBoundingClientRect();
      thumb.style.left = (bRect.left - cRect.left) + 'px';
      thumb.style.width = bRect.width + 'px';
    }

    function select(btn, fireEvent) {
      var prev = container._aedValue;
      var v = btn.getAttribute('data-aed-value');
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('role', 'tab');
      });
      moveThumbTo(btn);
      container._aedValue = v;
      if (fireEvent && v !== prev) {
        container.dispatchEvent(new CustomEvent('aed:segmented:change', {
          detail: { name: name, value: v, previous: prev },
          bubbles: true,
        }));
      }
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { select(b, true); });
    });

    // Initial paint (after layout settles for accurate measurements)
    requestAnimationFrame(function () { select(defaultBtn, false); });

    // Re-measure on resize
    window.addEventListener('resize', function () {
      var active = container.querySelector('.is-active');
      if (active) moveThumbTo(active);
    });
  }

  function set(name, value) {
    var c = byName[name];
    if (!c) return;
    var btn = c.querySelector('button[data-aed-value="' + value + '"]');
    if (btn) btn.click();
  }
  function get(name) {
    var c = byName[name];
    return c ? c._aedValue : null;
  }

  function scan() {
    document.querySelectorAll('[data-aed-segmented]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__segmented = {
    version: VERSION,
    refresh: scan,
    set: set,
    get: get,
  };
})();
