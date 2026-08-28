/** EchoFlow · full-article typing practice UI. */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const core = window.EchoTypingCore;
    const practiceStore = window.EchoPracticeStore;
    const tabList = document.getElementById('practiceTabs');
    const listenPanel = document.getElementById('listenPractice');
    const typingPanel = document.getElementById('typingPractice');
    const articleEl = document.getElementById('typingSentences');
    const inputEl = document.getElementById('typingInput');
    const positionEl = document.getElementById('typingPosition');
    const statusEl = document.getElementById('typingStatus');
    const wpmEl = document.getElementById('typingWpm');
    const accuracyEl = document.getElementById('typingAccuracy');
    const timeEl = document.getElementById('typingTime');
    const progressEl = document.getElementById('typingProgress');
    const playBtn = document.getElementById('typingPlay');
    const resetBtn = document.getElementById('typingReset');
    const autoPlayEl = document.getElementById('typingAutoPlay');
    const practiceCountEl = document.getElementById('typingPracticeCount');
    const workspaceEl = typingPanel && typingPanel.querySelector('.typing-workspace');
    const hintEl = typingPanel && typingPanel.querySelector('.typing-hint');
    const bottomPlayerEl = document.querySelector('.bottom-player');

    if (!core || !tabList || !listenPanel || !typingPanel || !articleEl || !inputEl) return;

    const MODE_KEY = 'echoflow_practice_mode';
    const LEGACY_PRACTICE_COUNT_KEY = 'echoflow_typing_practice_counts_v1';
    let lessonId = '';
    let rows = [];
    let ranges = [];
    let session = core.createSession('');
    let activeIndex = -1;
    let composing = false;
    let completionRecorded = false;
    let currentPracticeCount = 0;
    let previousInputValue = '';
    let processCorrectKeystrokes = 0;
    let processIncorrectKeystrokes = 0;
    let charEls = [];
    let sentenceEls = [];
    let timer = 0;

    function readJSON(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key) || '') || fallback; }
      catch (_) { return fallback; }
    }

    function getLegacyPracticeCount() {
      if (!lessonId) return 0;
      const record = readJSON(LEGACY_PRACTICE_COUNT_KEY, {})[lessonId];
      return Math.max(0, Number(record && record.completedRuns) || 0);
    }

    function renderPracticeCount() {
      if (practiceCountEl) practiceCountEl.textContent = '全文完成 ' + currentPracticeCount + ' 次';
    }

    async function refreshPracticeCount(expectedLessonId) {
      const wantedLessonId = expectedLessonId || lessonId;
      if (!wantedLessonId || !practiceStore) return;
      try {
        const summary = await practiceStore.getLessonSummary(wantedLessonId);
        if (lessonId !== wantedLessonId) return;
        currentPracticeCount = Math.max(0, Number(summary.completedRuns) || 0);
        renderPracticeCount();
      } catch (error) {
        console.warn('Practice summary unavailable; using legacy count.', error);
      }
    }

    function showCompletionStorageError(error) {
      console.warn('Practice history could not be stored in IndexedDB.', error);
      currentPracticeCount = Math.max(0, currentPracticeCount - 1);
      renderPracticeCount();
      statusEl.textContent = '全文完成，但本次记录未保存';
      statusEl.className = 'typing-status error';
    }

    function makeAttemptId() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      return lessonId + '-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }

    function recordPracticeCompletion() {
      if (!lessonId || completionRecorded) return;
      completionRecorded = true;
      currentPracticeCount++;
      renderPracticeCount();

      const metrics = core.sessionMetrics(session, session.completedAt || Date.now());
      const processTotal = processCorrectKeystrokes + processIncorrectKeystrokes;
      const completedAt = session.completedAt || Date.now();
      const attempt = {
        id: makeAttemptId(),
        lessonId,
        startedAt: session.startedAt || completedAt,
        completedAt,
        elapsedMs: metrics.elapsedMs,
        wpm: Number(metrics.wpm.toFixed(2)),
        resultAccuracy: Number(metrics.accuracy.toFixed(2)),
        processAccuracy: Number((processTotal ? processCorrectKeystrokes / processTotal * 100 : 100).toFixed(2)),
        correctKeystrokes: processCorrectKeystrokes,
        incorrectKeystrokes: processIncorrectKeystrokes,
        targetChars: session.target.length
      };

      if (!practiceStore) {
        showCompletionStorageError(new Error('Practice store unavailable'));
        return;
      }
      practiceStore.recordAttempt(attempt).then(function () {
        refreshPracticeCount(lessonId);
      }).catch(function (error) {
        showCompletionStorageError(error);
      });
    }

    function trackProcessInput(previousValue, nextValue) {
      if (previousValue === nextValue) return;
      let prefix = 0;
      const sharedLength = Math.min(previousValue.length, nextValue.length);
      while (prefix < sharedLength && previousValue[prefix] === nextValue[prefix]) prefix++;

      let suffix = 0;
      while (
        suffix < previousValue.length - prefix &&
        suffix < nextValue.length - prefix &&
        previousValue[previousValue.length - 1 - suffix] === nextValue[nextValue.length - 1 - suffix]
      ) suffix++;

      const insertedEnd = nextValue.length - suffix;
      for (let index = prefix; index < insertedEnd; index++) {
        if (nextValue[index] === session.target[index]) processCorrectKeystrokes++;
        else processIncorrectKeystrokes++;
      }
    }

    function focusInput() {
      try { inputEl.focus({ preventScroll: true }); }
      catch (_) { inputEl.focus(); }
    }

    function updateWorkspaceHeight() {
      if (!workspaceEl || typingPanel.hidden) return;
      window.requestAnimationFrame(function () {
        const viewportHeight = window.visualViewport
          ? window.visualViewport.height
          : window.innerHeight;
        const workspaceTop = workspaceEl.getBoundingClientRect().top + window.scrollY;
        const playerRect = bottomPlayerEl && bottomPlayerEl.getBoundingClientRect();
        const playerTop = playerRect && playerRect.top > 0
          ? playerRect.top
          : viewportHeight - 90;
        const hintHeight = hintEl ? hintEl.getBoundingClientRect().height : 0;
        const availableHeight = Math.floor(playerTop - workspaceTop - hintHeight - 22);
        const minimumHeight = window.innerWidth <= 620 ? 460 : 500;
        workspaceEl.style.setProperty(
          '--typing-workspace-height',
          Math.max(minimumHeight, availableHeight) + 'px'
        );
      });
    }

    function setMode(mode, persist) {
      const isTyping = mode === 'typing';
      listenPanel.hidden = isTyping;
      typingPanel.hidden = !isTyping;
      document.body.classList.toggle('typing-practice-mode', isTyping);
      tabList.querySelectorAll('[data-practice-mode]').forEach(function (button) {
        const active = button.dataset.practiceMode === mode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
        button.tabIndex = active ? 0 : -1;
      });
      if (persist !== false) {
        try { localStorage.setItem(MODE_KEY, mode); } catch (_) { }
      }
      if (isTyping && rows.length) {
        window.setTimeout(function () {
          focusInput();
          updateWorkspaceHeight();
        }, 0);
      }
    }

    function formatSeconds(ms) {
      return (Math.max(0, ms) / 1000).toFixed(1);
    }

    function playSentence(index) {
      const row = rows[index];
      if (!row) return;
      document.dispatchEvent(new CustomEvent('echoflow:play-sentence', {
        detail: { index: row.index, singleOnly: true }
      }));
    }

    function indexForPosition(position) {
      if (!ranges.length) return -1;
      const offset = Math.max(0, Math.min(session.target.length, position));
      for (let i = ranges.length - 1; i >= 0; i--) {
        if (offset >= ranges[i].start) return i;
      }
      return 0;
    }

    function setActiveIndex(index, play) {
      if (!rows.length) {
        activeIndex = -1;
        return;
      }
      const next = Math.max(0, Math.min(rows.length - 1, index));
      const changed = next !== activeIndex;
      activeIndex = next;
      if (changed && play) playSentence(next);
    }

    function ensureCurrentCharVisible() {
      const current = articleEl.querySelector('.typing-char.current');
      if (!current) return;
      const containerRect = articleEl.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      const edgePadding = 24;

      if (currentRect.top < containerRect.top + edgePadding) {
        articleEl.scrollTop -= (containerRect.top + edgePadding) - currentRect.top;
      } else if (currentRect.bottom > containerRect.bottom - edgePadding) {
        articleEl.scrollTop += currentRect.bottom - (containerRect.bottom - edgePadding);
      }
    }

    function renderArticle() {
      const fragment = document.createDocumentFragment();
      charEls = new Array(session.target.length);
      sentenceEls = [];

      rows.forEach(function (row, index) {
        const sentence = document.createElement('span');
        sentence.className = 'typing-article-sentence';
        sentence.dataset.index = String(row.index);
        sentence.title = '点击播放第 ' + (index + 1) + ' 句';
        sentence.setAttribute('role', 'button');
        sentence.tabIndex = 0;

        for (let offset = 0; offset < row.en.length; offset++) {
          const globalIndex = ranges[index].start + offset;
          const character = document.createElement('span');
          character.className = 'typing-char';
          character.textContent = row.en[offset];
          charEls[globalIndex] = character;
          sentence.appendChild(character);
        }

        sentence.addEventListener('click', function () {
          playSentence(index);
          focusInput();
        });
        sentence.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            playSentence(index);
            focusInput();
          }
        });
        sentenceEls.push(sentence);
        fragment.appendChild(sentence);

        if (index < rows.length - 1) {
          const separator = document.createElement('span');
          const separatorIndex = ranges[index].end;
          separator.className = 'typing-char typing-separator';
          separator.textContent = '\n';
          charEls[separatorIndex] = separator;
          fragment.appendChild(separator);
        }
      });

      articleEl.replaceChildren(fragment);
    }

    function updateSentenceStates(value) {
      ranges.forEach(function (range, index) {
        const sentenceInput = value.slice(range.start, range.end);
        const complete = sentenceInput === rows[index].en && value.length >= range.end;
        const hasError = sentenceInput.split('').some(function (character, offset) {
          return character !== rows[index].en[offset];
        });
        sentenceEls[index].classList.toggle('active', index === activeIndex);
        sentenceEls[index].classList.toggle('complete', complete);
        sentenceEls[index].classList.toggle('has-error', hasError);
      });
    }

    function render(valueOverride) {
      const value = valueOverride === undefined ? session.input : valueOverride;
      const metrics = valueOverride === undefined
        ? core.sessionMetrics(session, Date.now())
        : core.computeMetrics(session.target, value, 0);

      for (let i = 0; i < charEls.length; i++) {
        const character = charEls[i];
        if (!character) continue;
        character.classList.toggle('correct', i < value.length && value[i] === session.target[i]);
        character.classList.toggle('incorrect', i < value.length && value[i] !== session.target[i]);
        character.classList.toggle('current', i === value.length && session.status !== 'completed');
      }

      inputEl.classList.toggle('has-error', metrics.incorrectChars > 0);
      updateSentenceStates(value);
      window.requestAnimationFrame(ensureCurrentCharVisible);
      positionEl.textContent = '全文 ' + session.target.length + ' 字符 · ' + rows.length + ' 句';
      wpmEl.textContent = String(Math.round(metrics.wpm));
      accuracyEl.textContent = Math.round(metrics.accuracy) + '%';
      timeEl.textContent = formatSeconds(metrics.elapsedMs) + 's';
      progressEl.textContent = Math.round(metrics.progress) + '%';

      if (!rows.length) {
        statusEl.textContent = '当前课文没有可练习的英文句子';
        statusEl.className = 'typing-status';
      } else if (session.status === 'completed') {
        statusEl.textContent = '全文完成';
        statusEl.className = 'typing-status complete';
      } else if (metrics.incorrectChars > 0) {
        statusEl.textContent = '有 ' + metrics.incorrectChars + ' 个字符不匹配';
        statusEl.className = 'typing-status error';
      } else if (session.status === 'running') {
        statusEl.textContent = '正在输入第 ' + (activeIndex + 1) + ' 句';
        statusEl.className = 'typing-status';
      } else {
        statusEl.textContent = '输入第一个字符后开始计时';
        statusEl.className = 'typing-status';
      }
    }

    function commitInput() {
      const previousIndex = activeIndex;
      trackProcessInput(previousInputValue, inputEl.value);
      previousInputValue = inputEl.value;
      session = core.updateSession(session, inputEl.value, Date.now());
      setActiveIndex(indexForPosition(inputEl.value.length), false);
      render();
      if (session.status === 'completed') recordPracticeCompletion();
      if (activeIndex > previousIndex && autoPlayEl.checked) playSentence(activeIndex);
    }

    function resetLesson() {
      session = core.createSession(session.target);
      inputEl.value = '';
      composing = false;
      completionRecorded = false;
      previousInputValue = '';
      processCorrectKeystrokes = 0;
      processIncorrectKeystrokes = 0;
      setActiveIndex(rows.length ? 0 : -1, false);
      render();
      focusInput();
    }

    tabList.addEventListener('click', function (event) {
      const button = event.target.closest('[data-practice-mode]');
      if (button) setMode(button.dataset.practiceMode);
    });

    playBtn.addEventListener('click', function () { playSentence(Math.max(0, activeIndex)); });
    resetBtn.addEventListener('click', resetLesson);
    articleEl.addEventListener('click', function (event) {
      if (!event.target.closest('.typing-article-sentence')) focusInput();
    });
    inputEl.addEventListener('compositionstart', function () { composing = true; });
    inputEl.addEventListener('compositionend', function () {
      composing = false;
      commitInput();
    });
    inputEl.addEventListener('input', function (event) {
      if (composing || event.inputType === 'insertCompositionText') {
        render(inputEl.value);
        return;
      }
      commitInput();
    });
    inputEl.addEventListener('paste', function (event) { event.preventDefault(); });
    inputEl.addEventListener('drop', function (event) { event.preventDefault(); });

    document.addEventListener('echoflow:lesson-ready', function (event) {
      const detail = event.detail || {};
      lessonId = detail.lessonId || '';
      rows = (detail.items || []).map(function (item, index) {
        return {
          index: Number.isInteger(item.index) ? item.index : index,
          en: String(item.en || '').trim()
        };
      }).filter(function (item) { return item.en.length > 0; });

      let cursor = 0;
      ranges = rows.map(function (row, index) {
        const range = { start: cursor, end: cursor + row.en.length };
        cursor = range.end + (index < rows.length - 1 ? 1 : 0);
        return range;
      });
      session = core.createSession(rows.map(function (row) { return row.en; }).join('\n'));
      inputEl.value = '';
      inputEl.maxLength = session.target.length;
      completionRecorded = false;
      previousInputValue = '';
      processCorrectKeystrokes = 0;
      processIncorrectKeystrokes = 0;
      setActiveIndex(rows.length ? 0 : -1, false);
      currentPracticeCount = getLegacyPracticeCount();
      renderPracticeCount();
      refreshPracticeCount(lessonId);

      if (rows.length) {
        renderArticle();
        articleEl.scrollTop = 0;
        render();
        updateWorkspaceHeight();
        if (!typingPanel.hidden) focusInput();
      } else {
        articleEl.innerHTML = '<p class="empty-state">当前课文没有可练习的英文句子</p>';
        render();
      }
    });

    timer = window.setInterval(function () {
      if (session.startedAt !== null && session.completedAt === null) render();
    }, 200);
    window.addEventListener('pagehide', function () { window.clearInterval(timer); }, { once: true });
    window.addEventListener('resize', updateWorkspaceHeight);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', updateWorkspaceHeight);
    document.addEventListener('echoflow:practice-data-changed', function () {
      if (lessonId) refreshPracticeCount(lessonId);
    });

    let preferredMode = 'listen';
    try { preferredMode = localStorage.getItem(MODE_KEY) === 'typing' ? 'typing' : 'listen'; } catch (_) { }
    setMode(preferredMode, false);
  });
})();
