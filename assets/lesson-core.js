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

  // 解析多课循环的课号输入：支持 "1,3"、"1、3"、"1-3"、"3-1"、"1~3" 等混合写法，按输入顺序去重。
  // total 为当前分组课程总数，超出 1..total 的课号忽略；total 非正数时不做范围过滤。
  function parseLessonRangeSpec(text, total) {
    const limit = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
    const numbers = [];
    String(text || '')
      .split(/[\s,，、;；]+/)
      .forEach(function (token) {
        const match = token.match(/^(\d+)(?:[-~－至](\d+))?$/);
        if (!match) return;
        const from = Number(match[1]);
        const to = match[2] === undefined ? from : Number(match[2]);
        const step = from <= to ? 1 : -1;
        for (let n = from; step > 0 ? n <= to : n >= to; n += step) {
          if (n >= 1 && (!limit || n <= limit) && numbers.indexOf(n) === -1) numbers.push(n);
        }
      });
    return numbers;
  }

  // 多课循环队列中 current 课号的下一课（到队尾回到队首）；current 不在队列或未知时从队首开始。
  function nextLoopLesson(queue, current) {
    if (!Array.isArray(queue) || !queue.length) return 0;
    const index = queue.indexOf(Number(current));
    if (index === -1) return queue[0];
    return queue[(index + 1) % queue.length];
  }

  return { parseLrc, formatTime, parseLessonRangeSpec, nextLoopLesson };
});
