'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'default-library.json'), 'utf8'));
const context = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, 'assets', 'default-library.js'), 'utf8'),
  context
);
const embeddedCatalog = context.window.NCE_DEFAULT_LIBRARY;
const ids = new Set();

assert.ok(catalog.length > 0, 'default library must not be empty');
assert.equal(embeddedCatalog.length, catalog.length, 'embedded catalog must match JSON catalog');
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
for (const lesson of embeddedCatalog) {
  assert.equal(typeof lesson.lrcText, 'string', 'embedded lesson must include LRC text');
  assert.ok(lesson.lrcText.length > 0, 'embedded LRC text must not be empty: ' + lesson.id);
}

console.log(`default-library tests passed (${catalog.length} lessons)`);
