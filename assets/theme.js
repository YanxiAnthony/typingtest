(function () {
  'use strict';
  const KEY = 'echo_theme';

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    const button = document.getElementById('themeToggleBtn');
    if (button) button.textContent = theme === 'dark' ? '☀' : '◐';
  }

  document.addEventListener('DOMContentLoaded', function () {
    let theme = 'light';
    try {
      theme = localStorage.getItem(KEY) ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch (_) { }
    apply(theme);

    const button = document.getElementById('themeToggleBtn');
    if (!button) return;
    button.addEventListener('click', function () {
      theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, theme); } catch (_) { }
      apply(theme);
    });
  });
})();
