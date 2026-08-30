(function () {
  'use strict';

  const POSITION_KEY = 'echo_lesson_positions';
  const RATE_KEY = 'echo_playback_rate';
  const SENTENCE_MODE_KEY = 'echo_sentence_mode';
  const LESSON_LOOP_KEY = 'echo_lesson_loop';
  // 多课循环的课号队列按分组（NCE1–NCE4、我的导入）存 localStorage；跨课跳转的续播标志走 sessionStorage
  const MULTI_LOOP_SPECS_KEY = 'echo_multi_loop_specs';
  const MULTI_LOOP_JUMP_KEY = 'echoflow_multi_jump';
  // 旧版单一播放模式的存储键，仅用于迁移旧设置
  const LEGACY_MODE_KEY = 'echo_play_mode';

  function lessonHref(lesson) {
    return 'lesson.html#' + encodeURIComponent(lesson.book) + '/' + encodeURIComponent(lesson.filename);
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const { parseLrc, formatTime } = window.EchoLessonCore;
    const hash = location.hash.slice(1);
    if (!hash) {
      location.replace('index.html');
      return;
    }

    const parts = hash.split('/');
    const book = decodeURIComponent(parts.shift() || 'lib');
    const filename = decodeURIComponent(parts.join('/'));
    const lessonId = book + '/' + filename;
    const store = window.NCE_RESOURCES;
    const titleEl = document.getElementById('lessonTitle');
    const subEl = document.getElementById('lessonSub');
    const listEl = document.getElementById('sentences');
    const audio = document.getElementById('player');
    const playButton = document.getElementById('playPauseBtn');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const progressBar = document.getElementById('progressBar');
    const progressFilled = document.getElementById('progressFilled');
    const rateSelect = document.getElementById('playbackRate');
    const sentenceModeSelect = document.getElementById('sentenceMode');
    const lessonLoopSelect = document.getElementById('lessonLoopMode');
    const loopBadge = document.getElementById('loopBadge');
    const prevLink = document.getElementById('prevLesson');
    const nextLink = document.getElementById('nextLesson');
    const notification = document.getElementById('notification');
    const multiLoopModal = document.getElementById('multiLoopModal');
    const multiLoopInput = document.getElementById('multiLoopInput');
    const multiLoopHint = document.getElementById('multiLoopHint');
    const multiLoopStatus = document.getElementById('multiLoopStatus');
    const multiLoopSave = document.getElementById('multiLoopSave');
    const multiLoopCancel = document.getElementById('multiLoopCancel');
    const multiLoopClose = document.getElementById('multiLoopClose');
    const multiLoopEdit = document.getElementById('multiLoopEdit');

    let items = [];
    let activeIndex = -1;
    let segmentEnd = 0;
    let segmentIndex = -1;
    let playSingleSegment = false;
    let segmentWatchId = 0;
    let sentenceMode = 'once';
    let lessonLoopMode = 'once';
    let multiLoopQueue = [];          // 多课循环的课号（1 起，编号为分组内排序位置）
    let currentGroup = '';            // 当前课所属分组：NCE1–NCE4 或 我的导入
    let groupLessons = [];            // 当前分组的课程列表（与上一课/下一课同序）
    let lastLoopModeBeforeDialog = 'once';
    let navigationPromise = null;
    let lastBadgeText = null;
    let objectAudioUrl = '';
    let lastSave = 0;
    let defaultCatalog = null;

    function notify(message) {
      notification.textContent = message;
      notification.hidden = false;
      clearTimeout(notify.timer);
      notify.timer = setTimeout(function () { notification.hidden = true; }, 1800);
    }

    function setActive(index, scroll) {
      if (index === activeIndex) return;
      const previous = listEl.querySelector('.sentence.active');
      if (previous) previous.classList.remove('active');
      activeIndex = index;
      const current = listEl.querySelector('[data-index="' + index + '"]');
      if (current) {
        current.classList.add('active');
        if (scroll) current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function renderSentences() {
      const fragment = document.createDocumentFragment();
      items.forEach(function (item, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sentence';
        button.dataset.index = String(index);
        const en = document.createElement('span');
        en.className = 'sentence-en';
        en.textContent = item.en;
        button.appendChild(en);
        if (item.cn) {
          const cn = document.createElement('span');
          cn.className = 'sentence-cn';
          cn.textContent = item.cn;
          button.appendChild(cn);
        }
        button.addEventListener('click', function () { playSentence(index); });
        fragment.appendChild(button);
      });
      listEl.replaceChildren(fragment);
    }

    function endFor(index) {
      const item = items[index];
      if (!item) return 0;
      // 句尾裁剪量经人工校准：停在下一句开始前 500ms
      if (item.end > item.start) return Math.max(item.start + 0.15, item.end - 0.5);
      if (Number.isFinite(audio.duration)) return audio.duration;
      return item.start + 1;
    }

    // timeupdate 最长约 250ms 才触发一次，停在句尾会串到下一句开头的音节，
    // 因此单句播放期间用 rAF 逐帧轮询 currentTime；隐藏标签页里 rAF 不触发，由 updatePlayer 里的同条件判断兜底。
    function cancelSegmentWatch() {
      if (segmentWatchId) {
        window.cancelAnimationFrame(segmentWatchId);
        segmentWatchId = 0;
      }
    }

    function finishSegmentPlayback() {
      const index = segmentIndex;
      if (sentenceMode === 'loop' && items[index]) {
        audio.currentTime = Math.max(0, items[index].start);
        segmentEnd = endFor(index);
        return;
      }
      if (sentenceMode === 'sequence' && items[index + 1]) {
        const next = index + 1;
        segmentIndex = next;
        setActive(next, true);
        segmentEnd = endFor(next);
        audio.currentTime = Math.max(0, items[next].start);
        return;
      }
      playSingleSegment = false;
      cancelSegmentWatch();
      audio.pause();
      audio.currentTime = segmentEnd;
    }

    function watchSegmentEnd() {
      segmentWatchId = 0;
      if (!playSingleSegment) return;
      if ((audio.currentTime || 0) >= segmentEnd) {
        finishSegmentPlayback();
        if (playSingleSegment) segmentWatchId = window.requestAnimationFrame(watchSegmentEnd);
        return;
      }
      segmentWatchId = window.requestAnimationFrame(watchSegmentEnd);
    }

    async function playSentence(index) {
      if (!items[index]) return;
      setActive(index, true);
      playSingleSegment = true;
      segmentIndex = index;
      segmentEnd = endFor(index);
      audio.currentTime = Math.max(0, items[index].start);
      try { await audio.play(); }
      catch (_) { notify('点击播放按钮开始音频'); }
    }

    // 播放期间在底部播放器上实时显示当前生效的循环：单句循环/自动连播/整课循环/多课循环
    function loopBadgeText() {
      if (audio.paused) return '';
      if (playSingleSegment) {
        if (sentenceMode === 'loop') return '单句循环';
        if (sentenceMode === 'sequence') return '自动连播';
        return '';
      }
      if (lessonLoopMode === 'loop') return '整课循环';
      if (lessonLoopMode === 'multi' && multiLoopQueue.length) return '多课循环';
      return '';
    }

    function updateLoopBadge() {
      const text = loopBadgeText();
      if (!loopBadge || text === lastBadgeText) return;
      lastBadgeText = text;
      if (text) {
        loopBadge.textContent = text;
        loopBadge.hidden = false;
      } else {
        loopBadge.hidden = true;
      }
    }

    function updatePlayer() {
      const current = audio.currentTime || 0;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      currentTimeEl.textContent = formatTime(current);
      durationEl.textContent = formatTime(duration);
      progressFilled.style.width = duration ? Math.min(100, current / duration * 100) + '%' : '0%';
      playButton.textContent = audio.paused ? '▶' : 'Ⅱ';

      // 整课播放时循环用原生 loop；单句播放（含单句循环、自动下一句）由 JS 在句边界 seek
      audio.loop = lessonLoopMode === 'loop' && !playSingleSegment;
      updateLoopBadge();

      if (audio.paused) cancelSegmentWatch();

      if (playSingleSegment && segmentEnd && current >= segmentEnd) {
        finishSegmentPlayback();
        return;
      }

      if (playSingleSegment && !audio.paused && !segmentWatchId) {
        segmentWatchId = window.requestAnimationFrame(watchSegmentEnd);
      }

      for (let i = items.length - 1; i >= 0; i--) {
        if (current >= items[i].start) {
          setActive(i, !playSingleSegment);
          break;
        }
      }

      const now = Date.now();
      if (now - lastSave > 2000) {
        lastSave = now;
        savePosition();
      }
    }

    function savePosition() {
      try {
        const all = JSON.parse(localStorage.getItem(POSITION_KEY) || '{}');
        all[lessonId] = audio.currentTime || 0;
        localStorage.setItem(POSITION_KEY, JSON.stringify(all));
      } catch (_) { }
    }

    function restorePosition() {
      try {
        const value = Number(JSON.parse(localStorage.getItem(POSITION_KEY) || '{}')[lessonId]);
        if (Number.isFinite(value) && value > 0 && value < audio.duration) audio.currentTime = value;
      } catch (_) { }
    }

    async function getDefaultCatalog() {
      if (defaultCatalog) return defaultCatalog;
      const response = await fetch('assets/default-library.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('默认课程目录读取失败');
      defaultCatalog = await response.json();
      return defaultCatalog;
    }

    async function loadLessonRecord() {
      if (book !== 'us') return store.getLesson(book, filename);
      const catalog = await getDefaultCatalog();
      const lesson = catalog.find(function (item) { return item.filename === filename; });
      if (!lesson) return null;
      const response = await fetch(lesson.lrcUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('默认 LRC 文件读取失败');
      return Object.assign({}, lesson, { lrcText: await response.text() });
    }

    function buildLessonNavigation() {
      if (!navigationPromise) {
        navigationPromise = (async function () {
          const lessons = book === 'us' ? await getDefaultCatalog() : await store.listLessons(book);
          lessons.sort(function (a, b) {
            return a.filename.localeCompare(b.filename, 'zh-CN', { numeric: true });
          });
          groupLessons = lessons.filter(function (lesson) {
            return (lesson.group || '我的导入') === currentGroup;
          });
          const index = lessons.findIndex(function (lesson) { return lesson.filename === filename; });
          if (index > 0) {
            prevLink.href = lessonHref(lessons[index - 1]);
            prevLink.hidden = false;
          }
          if (index >= 0 && index < lessons.length - 1) {
            nextLink.href = lessonHref(lessons[index + 1]);
            nextLink.hidden = false;
          }
        })().catch(function (error) {
          navigationPromise = null;
          throw error;
        });
      }
      return navigationPromise;
    }

    function loadMultiLoopSpecs() {
      try {
        const specs = JSON.parse(localStorage.getItem(MULTI_LOOP_SPECS_KEY) || '{}');
        return specs && typeof specs === 'object' ? specs : {};
      } catch (_) { return {}; }
    }

    function saveMultiLoopSpec(queue) {
      try {
        const specs = loadMultiLoopSpecs();
        specs[currentGroup] = queue;
        localStorage.setItem(MULTI_LOOP_SPECS_KEY, JSON.stringify(specs));
      } catch (_) { }
    }

    function currentLessonNumber() {
      const index = groupLessons.findIndex(function (lesson) { return lesson.filename === filename; });
      return index >= 0 ? index + 1 : 0;
    }

    async function openMultiLoopDialog() {
      if (!multiLoopModal) return;
      try { await buildLessonNavigation(); } catch (_) { }
      const total = groupLessons.length;
      const current = currentLessonNumber();
      multiLoopHint.textContent = total
        ? '《' + currentGroup + '》共 ' + total + ' 课' + (current ? '，当前第 ' + current + ' 课' : '')
          + '。输入要循环的课号（支持 1,3 或 1-3 混合），整课播完自动跳到下一课并循环。'
        : '课程列表尚未就绪，请稍后重试。';
      multiLoopInput.value = multiLoopQueue.join(',') || (current ? String(current) : '');
      multiLoopStatus.textContent = '';
      multiLoopModal.hidden = false;
      multiLoopInput.focus();
      multiLoopInput.select();
    }

    // 多课循环模式下 select 无法重复触发 change，用独立的编辑按钮提供修改入口
    function syncMultiLoopEditVisibility() {
      if (multiLoopEdit) multiLoopEdit.hidden = lessonLoopMode !== 'multi';
    }

    function closeMultiLoopDialog(cancel) {
      if (!multiLoopModal) return;
      multiLoopModal.hidden = true;
      if (cancel) {
        lessonLoopMode = lastLoopModeBeforeDialog;
        if (lessonLoopSelect) lessonLoopSelect.value = lessonLoopMode;
        updateLoopBadge();
      }
      syncMultiLoopEditVisibility();
    }

    function saveMultiLoopFromDialog() {
      const queue = window.EchoLessonCore.parseLessonRangeSpec(multiLoopInput.value, groupLessons.length);
      if (!queue.length) {
        multiLoopStatus.textContent = groupLessons.length
          ? '没有可用的课号，请输入 1-' + groupLessons.length + ' 之间的课号'
          : '课程列表尚未就绪，请稍后重试';
        return;
      }
      multiLoopQueue = queue;
      lessonLoopMode = 'multi';
      saveMultiLoopSpec(queue);
      try { localStorage.setItem(LESSON_LOOP_KEY, lessonLoopMode); } catch (_) { }
      if (lessonLoopSelect) lessonLoopSelect.value = lessonLoopMode;
      closeMultiLoopDialog(false);
      updateLoopBadge();
      notify('多课循环：第 ' + queue.join('、') + ' 课');
    }

    // 整课播完后跳到多课循环队列中的下一课；队列只有当前一课时等价于整课循环，直接原地重播
    function jumpToNextLoopLesson() {
      if (playSingleSegment || lessonLoopMode !== 'multi' || !multiLoopQueue.length || !groupLessons.length) return;
      const next = window.EchoLessonCore.nextLoopLesson(multiLoopQueue, currentLessonNumber());
      const target = groupLessons[next - 1];
      if (!target) return;
      if (target.filename === filename) {
        audio.currentTime = 0;
        audio.play().catch(function () { });
        return;
      }
      try { sessionStorage.setItem(MULTI_LOOP_JUMP_KEY, '1'); } catch (_) { }
      location.hash = encodeURIComponent(target.book || book) + '/' + encodeURIComponent(target.filename);
    }

    if (!store) {
      titleEl.textContent = '本地存储不可用';
      return;
    }

    try {
      const record = await loadLessonRecord();
      if (!record || !record.lrcText || (!record.audioBlob && !record.audioUrl)) throw new Error('课程缺少音频或 LRC 字幕');
      const parsed = parseLrc(record.lrcText);
      items = parsed.items;
      if (!items.length) throw new Error('LRC 中没有可识别的时间轴文本');

      currentGroup = record.group || '我的导入';
      const savedQueue = loadMultiLoopSpecs()[currentGroup];
      if (Array.isArray(savedQueue)) {
        multiLoopQueue = savedQueue.filter(function (number) { return Number.isInteger(number) && number > 0; });
      }

      titleEl.textContent = parsed.meta.ti || record.title || filename;
      subEl.textContent = [parsed.meta.al, parsed.meta.ar].filter(Boolean).join(' · ');
      document.title = titleEl.textContent + ' - 听写与跟打';
      renderSentences();

      if (record.audioUrl) {
        audio.src = record.audioUrl;
      } else {
        objectAudioUrl = URL.createObjectURL(record.audioBlob);
        audio.src = objectAudioUrl;
      }
      const savedRate = Number(localStorage.getItem(RATE_KEY)) || 1;
      audio.playbackRate = savedRate;
      rateSelect.value = String(savedRate);
      const savedSentence = localStorage.getItem(SENTENCE_MODE_KEY);
      const savedLessonLoop = localStorage.getItem(LESSON_LOOP_KEY);
      const legacyMode = localStorage.getItem(LEGACY_MODE_KEY);
      if (savedSentence === 'loop' || savedSentence === 'sequence' || savedSentence === 'once') {
        sentenceMode = savedSentence;
      } else if (legacyMode === 'loop' || legacyMode === 'sequence') {
        sentenceMode = legacyMode;
      }
      if (savedLessonLoop === 'loop' || savedLessonLoop === 'once' || savedLessonLoop === 'multi') {
        lessonLoopMode = savedLessonLoop;
      } else if (legacyMode === 'loop') {
        lessonLoopMode = 'loop';
      }
      if (sentenceModeSelect) sentenceModeSelect.value = sentenceMode;
      if (lessonLoopSelect) lessonLoopSelect.value = lessonLoopMode;
      syncMultiLoopEditVisibility();

      // 多课循环跳转过来的这一课：不恢复上次进度，从头自动续播
      let jumpAutoplay = false;
      try {
        jumpAutoplay = sessionStorage.getItem(MULTI_LOOP_JUMP_KEY) === '1';
        sessionStorage.removeItem(MULTI_LOOP_JUMP_KEY);
      } catch (_) { }

      audio.addEventListener('loadedmetadata', function () {
        if (items.length && !items[items.length - 1].end) items[items.length - 1].end = audio.duration;
        durationEl.textContent = formatTime(audio.duration);
        if (jumpAutoplay) {
          audio.currentTime = 0;
          audio.play().catch(function () { notify('浏览器阻止了自动播放，点击 ▶ 继续多课循环'); });
        } else {
          restorePosition();
        }
        updatePlayer();
      });
      audio.addEventListener('timeupdate', updatePlayer);
      audio.addEventListener('play', updatePlayer);
      audio.addEventListener('pause', updatePlayer);
      audio.addEventListener('ended', updatePlayer);
      audio.addEventListener('ended', jumpToNextLoopLesson);

      playButton.addEventListener('click', async function () {
        if (audio.paused) {
          playSingleSegment = false;
          if (audio.ended) audio.currentTime = 0;
          try { await audio.play(); } catch (_) { notify('无法播放当前音频'); }
        } else {
          audio.pause();
        }
      });

      progressBar.addEventListener('click', function (event) {
        if (!Number.isFinite(audio.duration)) return;
        const rect = progressBar.getBoundingClientRect();
        playSingleSegment = false;
        audio.currentTime = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * audio.duration;
      });

      rateSelect.addEventListener('change', function () {
        const rate = Number(rateSelect.value) || 1;
        audio.playbackRate = rate;
        try { localStorage.setItem(RATE_KEY, String(rate)); } catch (_) { }
      });

      // 兼容缓存的旧版 lesson.html（没有单句/整课控件）：元素缺失时不接线，页面其余功能照常
      if (sentenceModeSelect) {
        sentenceModeSelect.addEventListener('change', function () {
          const value = sentenceModeSelect.value;
          sentenceMode = value === 'loop' || value === 'sequence' ? value : 'once';
          try { localStorage.setItem(SENTENCE_MODE_KEY, sentenceMode); } catch (_) { }
          updateLoopBadge();
        });
      }
      if (lessonLoopSelect) {
        lessonLoopSelect.addEventListener('change', function () {
          const value = lessonLoopSelect.value;
          if (value === 'multi') {
            lastLoopModeBeforeDialog = lessonLoopMode;
            openMultiLoopDialog();
            return;
          }
          lessonLoopMode = value === 'loop' ? 'loop' : 'once';
          try { localStorage.setItem(LESSON_LOOP_KEY, lessonLoopMode); } catch (_) { }
          updateLoopBadge();
          syncMultiLoopEditVisibility();
        });
      }

      if (multiLoopEdit) {
        multiLoopEdit.addEventListener('click', function () {
          lastLoopModeBeforeDialog = lessonLoopMode;
          openMultiLoopDialog();
        });
      }

      if (multiLoopModal) {
        multiLoopSave.addEventListener('click', saveMultiLoopFromDialog);
        multiLoopCancel.addEventListener('click', function () { closeMultiLoopDialog(true); });
        multiLoopClose.addEventListener('click', function () { closeMultiLoopDialog(true); });
        multiLoopModal.addEventListener('click', function (event) {
          if (event.target === multiLoopModal) closeMultiLoopDialog(true);
        });
        multiLoopInput.addEventListener('keydown', function (event) {
          if (event.key === 'Enter') saveMultiLoopFromDialog();
        });
        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && !multiLoopModal.hidden) closeMultiLoopDialog(true);
        });
      }

      document.addEventListener('echoflow:play-sentence', function (event) {
        const index = Number(event.detail && event.detail.index);
        if (Number.isInteger(index)) playSentence(index);
      });

      document.dispatchEvent(new CustomEvent('echoflow:lesson-ready', {
        detail: {
          lessonId,
          title: titleEl.textContent,
          firstContentIndex: 0,
          items: items.map(function (item, index) {
            return { index, en: item.en || '', cn: item.cn || '' };
          })
        }
      }));

      buildLessonNavigation();
    } catch (error) {
      titleEl.textContent = '无法打开课程';
      subEl.textContent = error.message || String(error);
      listEl.innerHTML = '<a class="primary-button" href="index.html">返回课程并重新导入</a>';
    }

    window.addEventListener('pagehide', function () {
      savePosition();
      if (objectAudioUrl) URL.revokeObjectURL(objectAudioUrl);
    });
    window.addEventListener('hashchange', function () { location.reload(); });
  });
})();
