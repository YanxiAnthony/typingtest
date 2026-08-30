/** EchoFlow practice history: IndexedDB cache with SQLite server synchronization. */
(function () {
  'use strict';

  const DB_NAME = 'echoflow-practice';
  const DB_VERSION = 1;
  const ATTEMPTS_STORE = 'attempts';
  const BASELINES_STORE = 'baselines';
  const META_STORE = 'meta';
  const LEGACY_COUNT_KEY = 'echoflow_typing_practice_counts_v1';
  const LEGACY_MIGRATION_KEY = 'legacyCountsMigratedV1';
  const SYNC_ENDPOINT = '/api/practice/sync';
  const SERVER_SYNC_ENABLED = window.location.protocol !== 'file:';
  let dbPromise = null;
  let initPromise = null;
  let syncPromise = null;
  let syncRequested = false;

  function requestToPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function transactionDone(transaction) {
    return new Promise(function (resolve, reject) {
      transaction.oncomplete = function () { resolve(); };
      transaction.onerror = function () { reject(transaction.error); };
      transaction.onabort = function () { reject(transaction.error || new Error('IndexedDB transaction aborted')); };
    });
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      let request;
      try { request = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (error) { reject(error); return; }

      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(ATTEMPTS_STORE)) {
          const attempts = db.createObjectStore(ATTEMPTS_STORE, { keyPath: 'id' });
          attempts.createIndex('lessonId', 'lessonId', { unique: false });
          attempts.createIndex('completedAt', 'completedAt', { unique: false });
          attempts.createIndex('syncStatus', 'syncStatus', { unique: false });
        }
        if (!db.objectStoreNames.contains(BASELINES_STORE)) {
          db.createObjectStore(BASELINES_STORE, { keyPath: 'lessonId' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
    return dbPromise;
  }

  async function migrateLegacyCounts() {
    if (await getMeta(LEGACY_MIGRATION_KEY, false)) return;

    let legacy = {};
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_COUNT_KEY) || '{}') || {}; }
    catch (_) { legacy = {}; }
    const entries = Object.entries(legacy).filter(function (entry) {
      return entry[0] && Number(entry[1] && entry[1].completedRuns) > 0;
    });
    const db = await openDB();
    const transaction = db.transaction([BASELINES_STORE, META_STORE], 'readwrite');
    const store = transaction.objectStore(BASELINES_STORE);
    await Promise.all(entries.map(async function (entry) {
      const lessonId = entry[0];
      const value = entry[1] || {};
      const existing = await requestToPromise(store.get(lessonId));
      store.put({
        lessonId,
        completedRuns: Math.max(Number(existing && existing.completedRuns) || 0, Number(value.completedRuns) || 0),
        lastCompletedAt: Math.max(Number(existing && existing.lastCompletedAt) || 0, Number(value.lastCompletedAt) || 0),
        updatedAt: Date.now()
      });
    }));
    transaction.objectStore(META_STORE).put({ key: LEGACY_MIGRATION_KEY, value: true });
    await transactionDone(transaction);
    try { localStorage.removeItem(LEGACY_COUNT_KEY); } catch (_) { }
  }

  async function getAll(storeName) {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    return requestToPromise(transaction.objectStore(storeName).getAll());
  }

  async function getMeta(key, fallback) {
    const db = await openDB();
    const transaction = db.transaction(META_STORE, 'readonly');
    const value = await requestToPromise(transaction.objectStore(META_STORE).get(key));
    return value ? value.value : fallback;
  }

  async function getPendingAttempts() {
    const db = await openDB();
    const transaction = db.transaction(ATTEMPTS_STORE, 'readonly');
    const index = transaction.objectStore(ATTEMPTS_STORE).index('syncStatus');
    return requestToPromise(index.getAll('pending'));
  }

  function notifyChanged(detail) {
    document.dispatchEvent(new CustomEvent('echoflow:practice-data-changed', { detail: detail || {} }));
  }

  async function syncOnce() {
      const pending = await getPendingAttempts();
      const baselines = await getAll(BASELINES_STORE);
      const since = Number(await getMeta('lastServerSyncAt', 0)) || 0;
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ since, attempts: pending, baselines })
      });
      if (!response.ok) throw new Error('practice sync failed: HTTP ' + response.status);
      const result = await response.json();
      if (!result || !Number.isFinite(Number(result.serverTime))) throw new Error('invalid practice sync response');

      const db = await openDB();
      const transaction = db.transaction([ATTEMPTS_STORE, BASELINES_STORE, META_STORE], 'readwrite');
      const attemptsStore = transaction.objectStore(ATTEMPTS_STORE);
      const baselinesStore = transaction.objectStore(BASELINES_STORE);
      const accepted = new Set(result.acceptedIds || []);
      const rejected = new Map((result.rejectedAttempts || []).filter(function (item) {
        return item && item.id;
      }).map(function (item) {
        return [item.id, item.reason ? String(item.reason) : 'invalid_attempt'];
      }));

      pending.forEach(function (attempt) {
        if (accepted.has(attempt.id)) attemptsStore.put(Object.assign({}, attempt, { syncStatus: 'synced' }));
        else if (rejected.has(attempt.id)) {
          attemptsStore.put(Object.assign({}, attempt, {
            syncStatus: 'rejected',
            syncError: rejected.get(attempt.id)
          }));
        }
      });
      (result.attempts || []).forEach(function (attempt) {
        if (attempt && attempt.id && attempt.lessonId) {
          attemptsStore.put(Object.assign({}, attempt, { syncStatus: 'synced' }));
        }
      });
      (result.baselines || []).forEach(function (baseline) {
        if (baseline && baseline.lessonId) baselinesStore.put(baseline);
      });
      transaction.objectStore(META_STORE).put({ key: 'lastServerSyncAt', value: Number(result.serverTime) });
      await transactionDone(transaction);
      if (rejected.size) console.warn('Some practice attempts were rejected by SQLite sync.', Array.from(rejected.entries()));
      notifyChanged({ source: 'sync', online: true });
      return {
        online: true,
        synced: accepted.size,
        rejected: rejected.size,
        received: (result.attempts || []).length
      };
  }

  function syncNow() {
    if (!SERVER_SYNC_ENABLED) {
      return Promise.resolve({ online: false, disabled: true });
    }
    if (syncPromise) {
      syncRequested = true;
      return syncPromise;
    }
    const running = (async function () {
      let result;
      do {
        syncRequested = false;
        result = await syncOnce();
      } while (syncRequested);
      return result;
    })();
    syncPromise = running;
    running.then(function () {
      if (syncPromise === running) syncPromise = null;
    }, function () {
      if (syncPromise === running) syncPromise = null;
    });
    return running;
  }

  async function initialize() {
    if (initPromise) return initPromise;
    initPromise = (async function () {
      await openDB();
      await migrateLegacyCounts();
      try { return await syncNow(); }
      catch (error) {
        console.warn('SQLite practice sync unavailable; using IndexedDB cache.', error);
        return { online: false, error: error.message || String(error) };
      }
    })();
    return initPromise;
  }

  async function recordAttempt(attempt) {
    if (!attempt || !attempt.id || !attempt.lessonId) throw new Error('Invalid practice attempt');
    await initialize();
    const db = await openDB();
    const transaction = db.transaction(ATTEMPTS_STORE, 'readwrite');
    transaction.objectStore(ATTEMPTS_STORE).put(Object.assign({}, attempt, { syncStatus: 'pending' }));
    await transactionDone(transaction);
    notifyChanged({ source: 'local', lessonId: attempt.lessonId });
    try { await syncNow(); }
    catch (error) { console.warn('Practice attempt queued for later SQLite sync.', error); }
    return attempt.id;
  }

  async function getLessonSummary(lessonId) {
    if (!lessonId) return { completedRuns: 0 };
    await initialize();
    const db = await openDB();
    const transaction = db.transaction([ATTEMPTS_STORE, BASELINES_STORE], 'readonly');
    const attemptsRequest = transaction.objectStore(ATTEMPTS_STORE).index('lessonId').getAll(lessonId);
    const baselineRequest = transaction.objectStore(BASELINES_STORE).get(lessonId);
    const values = await Promise.all([
      requestToPromise(attemptsRequest),
      requestToPromise(baselineRequest)
    ]);
    const attempts = values[0] || [];
    const baseline = values[1] || {};
    const totalWpm = attempts.reduce(function (sum, item) { return sum + (Number(item.wpm) || 0); }, 0);
    const totalAccuracy = attempts.reduce(function (sum, item) { return sum + (Number(item.processAccuracy) || 0); }, 0);
    return {
      completedRuns: (Number(baseline.completedRuns) || 0) + attempts.length,
      recordedRuns: attempts.length,
      bestWpm: attempts.reduce(function (best, item) { return Math.max(best, Number(item.wpm) || 0); }, 0),
      averageWpm: attempts.length ? totalWpm / attempts.length : 0,
      bestProcessAccuracy: attempts.reduce(function (best, item) { return Math.max(best, Number(item.processAccuracy) || 0); }, 0),
      averageProcessAccuracy: attempts.length ? totalAccuracy / attempts.length : 0,
      lastCompletedAt: attempts.reduce(function (latest, item) { return Math.max(latest, Number(item.completedAt) || 0); }, Number(baseline.lastCompletedAt) || 0)
    };
  }

  window.EchoPracticeStore = {
    initialize,
    syncNow,
    recordAttempt,
    getLessonSummary
  };

  initialize();
})();
