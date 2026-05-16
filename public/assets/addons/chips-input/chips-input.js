/*
 * Chips Input — drop-in tag/chip multi-value field.
 *
 *   <input type="text" data-aed-chips name="services"
 *          placeholder="Type a service, press Enter">
 *
 *   <!-- Pre-fill from comma-separated value -->
 *   <input type="text" data-aed-chips name="cities"
 *          value="Austin, Round Rock, Cedar Park">
 *
 *   <!-- Constrain to a list (case-insensitive substring match shown) -->
 *   <input type="text" data-aed-chips name="skills"
 *          data-aed-chips-allowed="HTML,CSS,JS,Astro,Vue,React"
 *          data-aed-chips-strict>
 *
 * Per-element attributes:
 *   data-aed-chips                  opt-in marker (input must be type="text")
 *   data-aed-chips-allowed          comma-separated whitelist (suggestions)
 *   data-aed-chips-strict           if present, only allowed values accepted
 *   data-aed-chips-max              max chip count
 *   data-aed-chips-separator        char to commit on (default "," — Enter always commits)
 *
 * Behavior:
 *   - The native input's `value` is kept as the comma-joined chip list,
 *     so form submission sees a single string. Use `value.split(',')`
 *     server-side, or wire a hidden input via your own JS if you want
 *     them split.
 *   - Backspace on empty entry removes the last chip.
 *
 * Public API:
 *   window.__chips.refresh()
 *   window.__chips.values(input)       — array of current chips
 *   window.__chips.add(input, value)
 *   window.__chips.remove(input, value)
 *
 * See /chips-input/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function attach(input) {
    if (input.dataset.aedChipsReady === '1') return;
    input.dataset.aedChipsReady = '1';

    var sep = input.getAttribute('data-aed-chips-separator') || ',';
    var max = parseInt(input.getAttribute('data-aed-chips-max') || '0', 10);
    var strict = input.hasAttribute('data-aed-chips-strict');
    var allowedAttr = input.getAttribute('data-aed-chips-allowed') || '';
    var allowed = allowedAttr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    var initial = (input.value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    input.value = '';
    input.style.display = 'none';

    var wrap = document.createElement('div');
    wrap.className = 'aed-chips';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var entry = document.createElement('input');
    entry.type = 'text';
    entry.className = 'aed-chips-entry';
    entry.placeholder = input.placeholder || '';
    entry.setAttribute('aria-label', input.getAttribute('aria-label') || input.placeholder || 'Add tag');
    if (allowed.length) {
      var listId = 'aed-chips-list-' + Math.random().toString(36).slice(2, 8);
      var dl = document.createElement('datalist');
      dl.id = listId;
      allowed.forEach(function (a) { var o = document.createElement('option'); o.value = a; dl.appendChild(o); });
      wrap.appendChild(dl);
      entry.setAttribute('list', listId);
    }
    wrap.appendChild(entry);

    var errorBox = document.createElement('div');
    errorBox.className = 'aed-chips-error';
    errorBox.hidden = true;
    wrap.appendChild(errorBox);

    var chips = [];
    function syncBacking() { input.value = chips.join(','); }

    function showError(msg) { errorBox.textContent = msg; errorBox.hidden = false; setTimeout(function () { errorBox.hidden = true; }, 2400); }

    function add(value) {
      var v = String(value).trim();
      if (!v) return false;
      if (chips.some(function (c) { return c.toLowerCase() === v.toLowerCase(); })) return false;
      if (strict && allowed.length && !allowed.some(function (a) { return a.toLowerCase() === v.toLowerCase(); })) {
        showError('"' + v + '" not in allowed list');
        return false;
      }
      if (max > 0 && chips.length >= max) {
        showError('Max ' + max + ' tags');
        return false;
      }
      chips.push(v);
      renderChip(v);
      syncBacking();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    function remove(value) {
      var idx = chips.findIndex(function (c) { return c.toLowerCase() === String(value).toLowerCase(); });
      if (idx < 0) return false;
      chips.splice(idx, 1);
      var node = wrap.querySelector('[data-aed-chip-value="' + cssEscape(value) + '"]');
      if (node) node.remove();
      syncBacking();
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    function renderChip(value) {
      var chip = document.createElement('span');
      chip.className = 'aed-chip';
      chip.setAttribute('data-aed-chip-value', value);
      chip.innerHTML =
        '<span class="aed-chip-text"></span>' +
        '<button type="button" class="aed-chip-remove" aria-label="Remove ' + escapeHtml(value) + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>';
      chip.querySelector('.aed-chip-text').textContent = value;
      chip.querySelector('.aed-chip-remove').addEventListener('click', function () { remove(value); });
      wrap.insertBefore(chip, entry);
    }

    function commitFromEntry() {
      var v = entry.value.trim().replace(new RegExp(escapeReg(sep) + '$'), '');
      if (!v) return;
      if (add(v)) entry.value = '';
    }

    entry.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === sep || (sep === ',' && e.key === ',')) {
        e.preventDefault();
        commitFromEntry();
      } else if (e.key === 'Backspace' && entry.value === '' && chips.length) {
        e.preventDefault();
        remove(chips[chips.length - 1]);
      }
    });
    entry.addEventListener('blur', commitFromEntry);
    entry.addEventListener('paste', function (e) {
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text) return;
      var parts = text.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (parts.length > 1) {
        e.preventDefault();
        parts.forEach(add);
        entry.value = '';
      }
    });

    // Hydrate initial values
    initial.forEach(add);

    // Click anywhere on container focuses the entry
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('.aed-chip-remove') || e.target === entry) return;
      entry.focus();
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function escapeReg(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/(["\\])/g, '\\$1');
  }

  function scan() {
    document.querySelectorAll('input[type="text"][data-aed-chips], input[data-aed-chips]:not([type])').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__chips = {
    version: VERSION,
    refresh: scan,
    values: function (input) { return (input.value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); },
  };
})();
