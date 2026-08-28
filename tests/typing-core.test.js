'use strict';

const assert = require('node:assert/strict');
const core = require('../assets/typing-core.js');

const comparison = core.compareText('hello', 'helxo');
assert.equal(comparison.correctChars, 4);
assert.equal(comparison.incorrectChars, 1);
assert.equal(comparison.isComplete, false);

const metrics = core.computeMetrics('hello', 'hello', 60_000);
assert.equal(metrics.wpm, 1);
assert.equal(metrics.accuracy, 100);

let session = core.createSession('abc');
session = core.updateSession(session, 'a', 1_000);
assert.equal(session.status, 'running');
assert.equal(session.startedAt, 1_000);
session = core.updateSession(session, 'abc', 3_000);
assert.equal(session.status, 'completed');
assert.equal(session.completedAt, 3_000);
assert.equal(core.sessionMetrics(session, 9_000).elapsedMs, 2_000);

session = core.updateSession(session, 'ab', 4_000);
assert.equal(session.status, 'running');
assert.equal(session.completedAt, null);

console.log('typing-core tests passed');
