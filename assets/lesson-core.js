(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EchoLessonCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LINE_RE = /^((?:\[\d+:\d+(?:\.\d+)?\])+)(.*)$/;
  const TIME_RE = /\[(\d+):(\d+(?:\.\d+)?)\]/;
  const META_RE = /^\[(al|ar|ti|by):(.+)\]$/i;

  function parseTime(tags) {
    const match = String(tags).match(TIME_RE);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
  }

  function hasChinese(text) {
    return /[\u3400-\u9fff]/.test(text || '');
  }

  function parseLrc(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const meta = { al: '', ar: '', ti: '', by: '' };
    const items = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      const metaMatch = raw.match(META_RE);
      if (metaMatch) {
        meta[metaMatch[1].toLowerCase()] = metaMatch[2].trim();
        continue;
      }

      const match = raw.match(LINE_RE);
      if (!match) continue;
      const tags = match[1];
      const body = match[2].trim();
      let en = body;
      let cn = '';

      if (body.includes('|')) {
        const parts = body.split('|');
        en = parts.shift().trim();
        cn = parts.join('|').trim();
      } else if (i + 1 < lines.length) {
        const next = lines[i + 1].trim().match(LINE_RE);
        if (next && next[1] === tags && hasChinese(next[2])) {
          cn = next[2].trim();
          i++;
        }
      }

      if (en || cn) items.push({ start: parseTime(tags), end: 0, en, cn });
    }

    items.sort(function (a, b) { return a.start - b.start; });
    for (let i = 0; i < items.length - 1; i++) items[i].end = items[i + 1].start;
    return { meta, items };
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
  }

  return { parseLrc, formatTime };
});
