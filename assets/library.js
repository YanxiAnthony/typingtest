(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const store = window.NCE_RESOURCES;
    const importer = window.NCE_IMPORT;
    const grid = document.getElementById('lessonsGrid');
    const empty = document.getElementById('libraryEmpty');
    const count = document.getElementById('libraryCount');
    const modal = document.getElementById('importModal');
    const status = document.getElementById('importStatus');
    const folderInput = document.getElementById('importFolderInput');
    const filesInput = document.getElementById('importFilesInput');
    const zipInput = document.getElementById('importZipInput');
    const filter = document.getElementById('libraryFilter');
    let allLessons = [];
    let defaultLessons = [];

    if (!store || !importer || !grid) return;

    function escapeHTML(value) {
      return String(value || '').replace(/[&<>"']/g, function (char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
      });
    }

    function lessonHref(lesson) {
      return 'lesson.html#' + encodeURIComponent(lesson.book) + '/' + encodeURIComponent(lesson.filename);
    }

    async function loadDefaultLessons() {
      if (defaultLessons.length) return defaultLessons;
      if (Array.isArray(window.NCE_DEFAULT_LIBRARY)) {
        defaultLessons = window.NCE_DEFAULT_LIBRARY;
        return defaultLessons;
      }
      const response = await fetch('assets/default-library.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('默认课程目录读取失败');
      defaultLessons = await response.json();
      return defaultLessons;
    }

    function refreshFilterOptions() {
      const selected = filter.value;
      const groups = Array.from(new Set(allLessons.map(function (lesson) {
        return lesson.group || (lesson.source === 'default' ? '默认课程' : '我的导入');
      }))).sort();
      filter.innerHTML = '<option value="all">全部课程</option>' + groups.map(function (group) {
        return '<option value="' + escapeHTML(group) + '">' + escapeHTML(group) + '</option>';
      }).join('');
      filter.value = groups.includes(selected) ? selected : 'all';
    }

    function renderCards() {
      const selected = filter.value;
      const lessons = selected === 'all' ? allLessons : allLessons.filter(function (lesson) {
        return (lesson.group || (lesson.source === 'default' ? '默认课程' : '我的导入')) === selected;
      });
      count.textContent = lessons.length + ' 课';
      empty.hidden = lessons.length > 0;
      grid.innerHTML = lessons.map(function (lesson, index) {
        const ready = lesson.hasAudio && lesson.hasLrc;
        return '<a class="lesson-card' + (ready ? '' : ' incomplete') + '" href="' + lessonHref(lesson) + '">' +
          '<span class="lesson-number">' + String(index + 1).padStart(2, '0') + '</span>' +
          '<span class="lesson-name">' + escapeHTML(lesson.title || lesson.filename) + '</span>' +
          '<span class="lesson-state">' + (ready ? escapeHTML(lesson.group || '我的导入') + ' · 开始练习 →' : '缺少音频或字幕') + '</span>' +
          '</a>';
      }).join('');
    }

    async function renderLibrary() {
      const defaults = await loadDefaultLessons().catch(function () { return []; });
      allLessons = defaults.slice().sort(function (a, b) {
        return a.filename.localeCompare(b.filename, 'zh-CN', { numeric: true });
      });
      refreshFilterOptions();
      renderCards();

      const imported = await store.listLessons(importer.LIB).catch(function () { return []; });
      imported.forEach(function (lesson) {
        lesson.group = '我的导入';
        lesson.source = 'imported';
      });
      allLessons = defaults.concat(imported).sort(function (a, b) {
        return a.filename.localeCompare(b.filename, 'zh-CN', { numeric: true });
      });
      refreshFilterOptions();
      renderCards();
    }

    function openModal() {
      modal.hidden = false;
      status.textContent = '';
    }

    function closeModal() {
      modal.hidden = true;
    }

    async function runImport(task) {
      status.textContent = '正在导入…';
      try {
        const result = await task;
        status.textContent = '已导入 ' + result.imported + ' 课' +
          (result.skipped ? '，跳过 ' + result.skipped + ' 项' : '');
        await renderLibrary();
        if (result.imported) setTimeout(closeModal, 600);
      } catch (error) {
        status.textContent = '导入失败：' + (error.message || error);
      }
    }

    document.getElementById('importOpenBtn').addEventListener('click', openModal);
    document.getElementById('emptyImportBtn').addEventListener('click', function () { folderInput.click(); });
    document.getElementById('importClose').addEventListener('click', closeModal);
    modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
    document.getElementById('importFolderBtn').addEventListener('click', function () { folderInput.click(); });
    document.getElementById('importFilesBtn').addEventListener('click', function () { filesInput.click(); });
    document.getElementById('importZipBtn').addEventListener('click', function () { zipInput.click(); });
    filter.addEventListener('change', renderCards);

    folderInput.addEventListener('change', function () {
      if (folderInput.files.length) runImport(importer.importFileList(folderInput.files));
      folderInput.value = '';
    });
    filesInput.addEventListener('change', function () {
      if (filesInput.files.length) runImport(importer.importFileList(filesInput.files));
      filesInput.value = '';
    });
    zipInput.addEventListener('change', function () {
      if (zipInput.files[0]) runImport(importer.importZipFile(zipInput.files[0]));
      zipInput.value = '';
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    renderLibrary().catch(function (error) {
      empty.hidden = false;
      empty.querySelector('p').textContent = '无法读取本地课程：' + (error.message || error);
    });
  });
})();
