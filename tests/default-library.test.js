'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'default-library.json'), 'utf8'));
const ids = new Set();

assert.ok(catalog.length > 0, 'default library must not be empty');
for (const lesson of catalog) {
  assert.equal(lesson.source, 'default');
  assert.equal(lesson.book, 'us');
  assert.ok(lesson.id && lesson.filename && lesson.audioUrl && lesson.lrcUrl);
  assert.ok(lesson.audioUrl.startsWith('NCE/'), 'audio must use the NCE resource directory');
  assert.ok(lesson.lrcUrl.startsWith('NCE/'), 'LRC must use the NCE resource directory');
  assert.equal(ids.has(lesson.id), false, 'duplicate lesson id: ' + lesson.id);
  ids.add(lesson.id);
  assert.ok(fs.existsSync(path.join(root, lesson.audioUrl)), 'missing audio: ' + lesson.audioUrl);
  assert.ok(fs.existsSync(path.join(root, lesson.lrcUrl)), 'missing LRC: ' + lesson.lrcUrl);
}

console.log(`default-library tests passed (${catalog.length} lessons)`);
