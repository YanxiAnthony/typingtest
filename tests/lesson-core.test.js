'use strict';

const assert = require('node:assert/strict');
const core = require('../assets/lesson-core.js');

const parsed = core.parseLrc([
  '[ti:Example]',
  '[ar:Teacher]',
  '[00:01.00]Hello.|你好。',
  '[00:03.50]How are you?',
  '[00:03.50]你好吗？'
].join('\n'));

assert.equal(parsed.meta.ti, 'Example');
assert.equal(parsed.meta.ar, 'Teacher');
assert.deepEqual(parsed.items, [
  { start: 1, end: 3.5, en: 'Hello.', cn: '你好。' },
  { start: 3.5, end: 0, en: 'How are you?', cn: '你好吗？' }
]);
assert.equal(core.formatTime(65.9), '1:05');
assert.equal(core.formatTime(-1), '0:00');

console.log('lesson-core tests passed');
