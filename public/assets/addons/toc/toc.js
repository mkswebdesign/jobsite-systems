/*
 * TOC — drop-in auto-generated table of contents.
 *
 * Hydrates every <aside data-aed-toc> on the page from headings inside
 * a configured scope. Plays nicely with /anchor-headings/ — both share
 * auto-ID slugging conventions, neither overwrites existing IDs.
 *
 *   <aside data-aed-toc></aside>
 *   <aside data-aed-toc data-aed-toc-position="sticky"></aside>
 *   <aside data-aed-toc data-aed-toc-position="floating"></aside>
 *   <aside data-aed-toc data-aed-toc-scope=".my-content" data-aed-toc-levels="2,3"></aside>
 *
 * Per-page disable:
 *   <html data-aed-toc="off"> ... </html>
 *
 * Public API:
 *   window.__toc.refresh()           — re-scan all placeholders
 *   window.__toc.highlight(id)       — manually highlight a section
 *
 * See /toc/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  if (document.documentElement.getAttribute('data-aed-toc') === 'off') return;

  // -- Slug helper (same shape as /anchor-headings/) -------------------
  function slug(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function uniqueId(base) {
    if (!base) base = 'section';
    var id = base;
    var i = 2;
    while (document.getElementById(id)) {
      id = base + '-' + i;
      i += 1;
    }
    return id;
  }

  function ensureId(h) {
    if (h.id) return h.id;
    var s = slug(h.textContent || '');
    if (!s) return null;
    h.id = uniqueId(s);
    return h.id;
  }

  // -- Find headings in a scope ---------------------------------------
  function findHeadings(scopeSel, levels) {
    var sel = levels.map(function (l) { return 'h' + l; }).join(',');
    var roots = scopeSel ? document.querySelectorAll(scopeSel) : [document.body];
    var out = [];
    roots.forEach(function (r) {
      r.querySelectorAll(sel).forEach(function (h) {
        // Skip headings inside the TOC itself
        if (h.closest('.aed-toc')) return;
        out.push(h);
      });
    });
    return out;
  }

  // -- Render one TOC -------------------------------------------------
  function build(el) {
    if (el.dataset.aedTocReady === '1') return;

    var scope = el.getAttribute('data-aed-toc-scope') || 'article, main';
    var levels = (el.getAttribute('data-aed-toc-levels') || '2,3')
      .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var minHeadings = parseInt(el.getAttribute('data-aed-toc-min') || '2', 10);
    var title = el.getAttribute('data-aed-toc-title') || 'On this page';
    var position = el.getAttribute('data-aed-toc-position') || 'top';

    var headings = findHeadings(scope, levels);
    if (headings.length < minHeadings) {
      el.hidden = true;
      return;
    }
    el.hidden = false;

    el.classList.add('aed-toc');
    el.setAttribute('data-aed-toc-position', position);
    el.setAttribute('role', 'navigation');
    el.setAttribute('aria-label', title);
    el.dataset.aedTocReady = '1';

    var html =
      '<button type="button" class="aed-toc-toggle">' + escapeHtml(title) + '</button>' +
      '<span class="aed-toc-title">' + escapeHtml(title) + '</span>' +
      '<ol class="aed-toc-list">';

    var items = [];
    headings.forEach(function (h) {
      var id = ensureId(h);
      if (!id) return;
      var lv = parseInt(h.tagName.substring(1), 10);
      html +=
        '<li class="aed-toc-item" data-aed-level="' + lv + '" data-aed-target="' + id + '">' +
          '<a href="#' + id + '">' + escapeHtml(h.textContent || '') + '</a>' +
        '</li>';
      items.push({ id: id, el: h });
    });
    html += '</ol>';
    el.innerHTML = html;

    // Smooth-scroll on click
    el.querySelectorAll('.aed-toc-item a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var hash = a.getAttribute('href');
        var t = document.querySelector(hash);
        if (!t) return;
        try { history.replaceState(null, '', hash); } catch (_) {}
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Also auto-collapse on mobile after picking
        if (window.matchMedia('(max-width: 720px)').matches) {
          el.classList.add('is-collapsed');
        }
      });
    });

    // Mobile toggle
    var toggle = el.querySelector('.aed-toc-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        el.classList.toggle('is-collapsed');
      });
      // Start collapsed on mobile
      if (window.matchMedia('(max-width: 720px)').matches) {
        el.classList.add('is-collapsed');
      }
    }

    // Scrollspy
    spy(el, items);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // -- Scrollspy (IntersectionObserver) --------------------------------
  function spy(toc, items) {
    if (!('IntersectionObserver' in window)) return;
    var idToItem = {};
    items.forEach(function (it) { idToItem[it.id] = it; });

    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      });
      // Pick the topmost visible heading
      var pick = null;
      for (var i = 0; i < items.length; i++) {
        if (visible.has(items[i].id)) { pick = items[i].id; break; }
      }
      if (!pick && items.length) {
        // Fall back: nearest heading above viewport
        var y = window.scrollY + 120;
        for (var j = items.length - 1; j >= 0; j--) {
          var rect = items[j].el.getBoundingClientRect();
          var top = rect.top + window.scrollY;
          if (top <= y) { pick = items[j].id; break; }
        }
      }
      highlight(toc, pick);
    }, {
      rootMargin: '-15% 0px -65% 0px',
      threshold: 0,
    });

    items.forEach(function (it) { io.observe(it.el); });

    // Initial paint
    setTimeout(function () { highlight(toc, items[0] ? items[0].id : null); }, 50);
  }

  function highlight(toc, id) {
    toc.querySelectorAll('.aed-toc-item').forEach(function (li) {
      li.classList.toggle('is-active', li.getAttribute('data-aed-target') === id);
    });
  }

  // -- Boot ------------------------------------------------------------
  function scan() {
    document.querySelectorAll('aside[data-aed-toc], div[data-aed-toc]').forEach(build);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__toc = {
    version: VERSION,
    refresh: scan,
    highlight: function (id) {
      document.querySelectorAll('.aed-toc').forEach(function (t) { highlight(t, id); });
    },
  };
})();
