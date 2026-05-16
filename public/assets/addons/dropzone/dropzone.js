/*
 * Dropzone — drop-in drag-and-drop file input.
 *
 *   <input type="file" data-aed-dropzone name="attachment">
 *
 *   <input type="file" data-aed-dropzone
 *          accept="image/*,.pdf"
 *          multiple
 *          data-aed-dz-headline="Drop files or <strong>browse</strong>"
 *          data-aed-dz-hint="PNG, JPG, PDF — up to 10 MB"
 *          data-aed-dz-max-size="10485760"
 *          data-aed-dz-max-files="3">
 *
 * Per-element attributes:
 *   data-aed-dropzone           opt-in marker
 *   data-aed-dz-headline        custom main label (HTML-escaped except for <strong>)
 *   data-aed-dz-hint            small subtext below
 *   data-aed-dz-max-size        max bytes per file (validates + shows error)
 *   data-aed-dz-max-files       max files (when multiple)
 *
 * Public API:
 *   window.__dropzone.refresh()
 *   window.__dropzone.getFiles(input)   — current files as array
 *
 * See /dropzone/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function attach(input) {
    if (input.dataset.aedDzReady === '1') return;
    input.dataset.aedDzReady = '1';

    var headline = input.getAttribute('data-aed-dz-headline') ||
      'Drop files here or <strong>browse</strong>';
    var hint = input.getAttribute('data-aed-dz-hint') || '';
    var maxSize = parseInt(input.getAttribute('data-aed-dz-max-size') || '0', 10);
    var maxFiles = parseInt(input.getAttribute('data-aed-dz-max-files') || '0', 10);

    var wrap = document.createElement('div');
    wrap.className = 'aed-dz';
    input.parentNode.insertBefore(wrap, input);

    var area = document.createElement('label');
    area.className = 'aed-dz-area';
    area.innerHTML =
      '<span class="aed-dz-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
        '<polyline points="17 8 12 3 7 8"/>' +
        '<line x1="12" y1="3" x2="12" y2="15"/></svg>' +
      '</span>' +
      '<span class="aed-dz-headline">' + headline + '</span>' +
      (hint ? '<span class="aed-dz-hint">' + escapeHtml(hint) + '</span>' : '');
    wrap.appendChild(area);
    area.appendChild(input);

    var list = document.createElement('ul');
    list.className = 'aed-dz-files';
    list.hidden = true;
    wrap.appendChild(list);

    var errorBox = document.createElement('div');
    errorBox.className = 'aed-dz-error';
    errorBox.hidden = true;
    wrap.appendChild(errorBox);

    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    }
    function clearError() {
      errorBox.textContent = '';
      errorBox.hidden = true;
    }

    function validate(files) {
      if (maxFiles > 0 && files.length > maxFiles) {
        showError('Too many files — max ' + maxFiles + '.');
        return false;
      }
      if (maxSize > 0) {
        for (var i = 0; i < files.length; i++) {
          if (files[i].size > maxSize) {
            showError('"' + files[i].name + '" is larger than ' + formatBytes(maxSize) + '.');
            return false;
          }
        }
      }
      clearError();
      return true;
    }

    function render() {
      var files = Array.prototype.slice.call(input.files || []);
      list.innerHTML = '';
      if (!files.length) { list.hidden = true; return; }
      list.hidden = false;
      files.forEach(function (f, i) {
        var li = document.createElement('li');
        li.className = 'aed-dz-file';
        li.innerHTML =
          '<span class="aed-dz-file-name">' + escapeHtml(f.name) + '</span>' +
          '<span class="aed-dz-file-size">' + escapeHtml(formatBytes(f.size)) + '</span>' +
          '<button type="button" class="aed-dz-file-remove" aria-label="Remove ' + escapeHtml(f.name) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>';
        li.querySelector('.aed-dz-file-remove').addEventListener('click', function () {
          removeAt(i);
        });
        list.appendChild(li);
      });
    }

    function removeAt(idx) {
      var files = Array.prototype.slice.call(input.files || []);
      var dt = new DataTransfer();
      files.forEach(function (f, i) { if (i !== idx) dt.items.add(f); });
      input.files = dt.files;
      render();
    }

    input.addEventListener('change', function () {
      if (!validate(input.files)) {
        input.value = ''; // clear invalid selection
        render();
        return;
      }
      render();
    });

    // Drag and drop on the area
    ['dragenter', 'dragover'].forEach(function (ev) {
      area.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        area.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      area.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        area.classList.remove('is-dragover');
      });
    });
    area.addEventListener('drop', function (e) {
      var dropped = e.dataTransfer && e.dataTransfer.files;
      if (!dropped || !dropped.length) return;
      if (!validate(dropped)) return;
      input.files = dropped;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    return (b / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function scan() {
    document.querySelectorAll('input[type="file"][data-aed-dropzone]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__dropzone = {
    version: VERSION,
    refresh: scan,
    getFiles: function (input) {
      return Array.prototype.slice.call((input && input.files) || []);
    },
  };
})();
