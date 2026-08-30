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

assert.deepEqual(core.parseLessonRangeSpec('1,3', 10), [1, 3]);
assert.deepEqual(core.parseLessonRangeSpec('1-3', 10), [1, 2, 3]);
assert.deepEqual(core.parseLessonRangeSpec('3-1', 10), [3, 2, 1]);
assert.deepEqual(core.parseLessonRangeSpec('1、3，5', 10), [1, 3, 5]);
assert.deepEqual(core.parseLessonRangeSpec('2, 2, 4~6', 10), [2, 4, 5, 6]);
assert.deepEqual(core.parseLessonRangeSpec('5-8-9', 10), []);
assert.deepEqual(core.parseLessonRangeSpec('1,99', 10), [1]);
assert.deepEqual(core.parseLessonRangeSpec('abc,,', 10), []);
assert.deepEqual(core.parseLessonRangeSpec('1,2', 0), [1, 2]);
assert.deepEqual(core.parseLessonRangeSpec('', 10), []);
assert.deepEqual(core.parseLessonRangeSpec('1至3', 10), [1, 2, 3]);

assert.equal(core.nextLoopLesson([1, 3], 1), 3);
assert.equal(core.nextLoopLesson([1, 3], 3), 1);
assert.equal(core.nextLoopLesson([3, 5, 8], 5), 8);
assert.equal(core.nextLoopLesson([1, 3], 2), 1);
assert.equal(core.nextLoopLesson([1, 3], 0), 1);
assert.equal(core.nextLoopLesson([], 1), 0);

console.log('lesson-core tests passed');
