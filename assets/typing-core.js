/**
 * EchoFlow typing practice core.
 * Pure functions only: no DOM, storage, timers, or audio dependencies.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EchoTypingCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function compareText(target, input) {
    const expected = String(target || '');
    const actual = String(input || '');
    let correctChars = 0;
    const comparedLength = Math.min(expected.length, actual.length);

    for (let i = 0; i < comparedLength; i++) {
      if (actual[i] === expected[i]) correctChars++;
    }

    const totalChars = actual.length;
    const incorrectChars = Math.max(0, totalChars - correctChars);
    return {
      correctChars,
      incorrectChars,
      totalChars,
      targetLength: expected.length,
      isComplete: expected.length > 0 && actual === expected,
      progress: expected.length > 0
        ? Math.min(100, (actual.length / expected.length) * 100)
        : 0
    };
  }

  function computeMetrics(target, input, elapsedMs) {
    const result = compareText(target, input);
    const safeElapsedMs = Math.max(0, Number(elapsedMs) || 0);
    const elapsedMinutes = safeElapsedMs / 60000;
    const wpm = elapsedMinutes > 0
      ? (result.correctChars / 5) / elapsedMinutes
      : 0;
    const accuracy = result.totalChars > 0
      ? (result.correctChars / result.totalChars) * 100
      : 100;

    return Object.assign({}, result, {
      elapsedMs: safeElapsedMs,
      wpm,
      accuracy
    });
  }

  function createSession(target) {
    return {
      status: 'idle',
      target: String(target || ''),
      input: '',
      startedAt: null,
      completedAt: null
    };
  }

  function updateSession(session, input, now) {
    const current = session || createSession('');
    const value = String(input || '');
    const timestamp = Number.isFinite(now) ? now : Date.now();
    let status = current.status;
    let startedAt = current.startedAt;
    let completedAt = current.completedAt;

    if (status === 'idle' && value.length > 0) {
      status = 'running';
      startedAt = timestamp;
    }

    const complete = current.target.length > 0 && value === current.target;
    if (complete) {
      status = 'completed';
      completedAt = completedAt === null ? timestamp : completedAt;
    } else if (status === 'completed') {
      status = 'running';
      completedAt = null;
    }

    return {
      status,
      target: current.target,
      input: value,
      startedAt,
      completedAt
    };
  }

  function sessionMetrics(session, now) {
    const current = session || createSession('');
    const end = current.completedAt !== null
      ? current.completedAt
      : (Number.isFinite(now) ? now : Date.now());
    const elapsed = current.startedAt === null ? 0 : Math.max(0, end - current.startedAt);
    return computeMetrics(current.target, current.input, elapsed);
  }

  return {
    compareText,
    computeMetrics,
    createSession,
    updateSession,
    sessionMetrics
  };
});
