/*
 * Avatar Stack — drop-in overlapping avatar row.
 *
 * Hydrates [data-aed-avatars] containers. Reads existing <img> /
 * <span data-initials> children (so alt text + accessibility stay
 * authored), styles them as overlapping circles, optionally appends a
 * "+N" counter and a side label.
 *
 *   <div data-aed-avatars data-aed-avatars-extra="12" data-aed-avatars-label="readers">
 *     <img src="/p/sarah.jpg" alt="Sarah">
 *     <img src="/p/joe.jpg" alt="Joe">
 *     <span data-initials="AR" data-color="#6B00FF"></span>
 *   </div>
 *
 *   <!-- Sizes: sm | (default) | lg -->
 *   <div data-aed-avatars data-aed-size="sm">...</div>
 *
 *   <!-- Compact variant: no label -->
 *   <div data-aed-avatars data-aed-variant="compact">...</div>
 *
 * Public API:
 *   window.__avatars.refresh()  — re-scan after dynamic insert
 *
 * See /avatar-stack/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function attach(el) {
    if (el.dataset.aedAvatarsReady === '1') return;
    el.dataset.aedAvatarsReady = '1';
    el.classList.add('aed-avatars');

    var extra = parseInt(el.getAttribute('data-aed-avatars-extra') || '0', 10);
    var label = el.getAttribute('data-aed-avatars-label') || '';

    // Walk children: imgs + initials spans
    var avatars = [];
    Array.prototype.forEach.call(el.children, function (child) {
      if (child.tagName === 'IMG') {
        child.classList.add('aed-avatar-img');
        avatars.push(child);
      } else if (child.tagName === 'SPAN' && child.hasAttribute('data-initials')) {
        child.classList.add('aed-avatar-initials');
        if (!child.textContent.trim()) {
          child.textContent = child.getAttribute('data-initials');
        }
        var color = child.getAttribute('data-color');
        if (color) child.style.background = color;
        avatars.push(child);
      }
    });

    // Append "+N" counter if extra > 0
    if (extra > 0) {
      var more = document.createElement('span');
      more.className = 'aed-avatar-extra';
      more.textContent = '+' + extra;
      more.setAttribute('aria-label', extra + ' more');
      el.appendChild(more);
    }

    // Append label
    if (label) {
      var totalCount = avatars.length + extra;
      var labelEl = document.createElement('span');
      labelEl.className = 'aed-avatars-label';
      labelEl.innerHTML = '<strong>' + escapeHtml(String(totalCount)) + '+</strong> ' + escapeHtml(label);
      el.appendChild(labelEl);
    }
  }

  function scan() {
    document.querySelectorAll('[data-aed-avatars]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__avatars = {
    version: VERSION,
    refresh: scan,
  };
})();
