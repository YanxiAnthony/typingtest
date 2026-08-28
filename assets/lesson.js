(function () {
  'use strict';

  const POSITION_KEY = 'echo_lesson_positions';
  const RATE_KEY = 'echo_playback_rate';

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
    const prevLink = document.getElementById('prevLesson');
    const nextLink = document.getElementById('nextLesson');
    const notification = document.getElementById('notification');

    let items = [];
    let activeIndex = -1;
    let segmentEnd = 0;
    let playSingleSegment = false;
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
      if (item.end > item.start) return Math.max(item.start + 0.15, item.end - 0.06);
      if (Number.isFinite(audio.duration)) return audio.duration;
      return item.start + 1;
    }

    async function playSentence(index) {
      if (!items[index]) return;
      setActive(index, true);
      playSingleSegment = true;
      segmentEnd = endFor(index);
      audio.currentTime = Math.max(0, items[index].start);
      try { await audio.play(); }
      catch (_) { notify('点击播放按钮开始音频'); }
    }

    function updatePlayer() {
      const current = audio.currentTime || 0;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      currentTimeEl.textContent = formatTime(current);
      durationEl.textContent = formatTime(duration);
      progressFilled.style.width = duration ? Math.min(100, current / duration * 100) + '%' : '0%';
      playButton.textContent = audio.paused ? '▶' : 'Ⅱ';

      if (playSingleSegment && segmentEnd && current >= segmentEnd) {
        playSingleSegment = false;
        audio.pause();
        audio.currentTime = segmentEnd;
        return;
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

    async function buildLessonNavigation() {
      const lessons = book === 'us' ? await getDefaultCatalog() : await store.listLessons(book);
      lessons.sort(function (a, b) {
        return a.filename.localeCompare(b.filename, 'zh-CN', { numeric: true });
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

      audio.addEventListener('loadedmetadata', function () {
        if (items.length && !items[items.length - 1].end) items[items.length - 1].end = audio.duration;
        durationEl.textContent = formatTime(audio.duration);
        restorePosition();
        updatePlayer();
      });
      audio.addEventListener('timeupdate', updatePlayer);
      audio.addEventListener('play', updatePlayer);
      audio.addEventListener('pause', updatePlayer);
      audio.addEventListener('ended', updatePlayer);

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
