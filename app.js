document.addEventListener('DOMContentLoaded', function() {
    const textDisplay = document.getElementById('textDisplay');
    const textInput = document.getElementById('textInput');
    const startBtn = document.getElementById('startBtn');
    const resetBtn = document.getElementById('resetBtn');
    const wpmDisplay = document.getElementById('wpm');
    const accuracyDisplay = document.getElementById('accuracy');
    const timerDisplay = document.getElementById('timer');
    const accuracyLabel = document.getElementById('accuracyLabel');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const sampleText = document.getElementById('sampleText');
    const languageSelect = document.getElementById('languageSelect');
    const articleSelect = document.getElementById('articleSelect');
    const articleStatus = document.getElementById('articleStatus');
    const resultDiv = document.getElementById('result');
    const progressBar = document.getElementById('progressBar');
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    const renderHint = document.getElementById('renderHint');
    const accuracyMode = document.getElementById('accuracyMode');
    const modeHint = document.getElementById('modeHint');
    const modeTooltip = document.getElementById('modeTooltip');
    const trainingMode = document.getElementById('trainingMode');
    const timedSecondsInput = document.getElementById('timedSeconds');
    const segmentLengthInput = document.getElementById('segmentLength');
    const adaptiveToggle = document.getElementById('adaptiveToggle');
    const modeInfoItems = Array.from(document.querySelectorAll('.mode-intro-item'));

    const finalWpmDisplay = document.getElementById('finalWpm');
    const finalResultAccuracyDisplay = document.getElementById('finalResultAccuracy');
    const finalProcessAccuracyDisplay = document.getElementById('finalProcessAccuracy');
    const correctCharsDisplay = document.getElementById('correctChars');
    const incorrectCharsDisplay = document.getElementById('incorrectChars');
    const totalCharsDisplay = document.getElementById('totalChars');
    const processCorrectCharsDisplay = document.getElementById('processCorrectChars');
    const processIncorrectCharsDisplay = document.getElementById('processIncorrectChars');
    const processTotalCharsDisplay = document.getElementById('processTotalChars');
    const errorRateDisplay = document.getElementById('errorRate');
    const topErrorCharsDisplay = document.getElementById('topErrorChars');
    const topErrorWordsDisplay = document.getElementById('topErrorWords');
    const reviewSuggestionDisplay = document.getElementById('reviewSuggestion');
    const antiCheatStatusDisplay = document.getElementById('antiCheatStatus');
    const adaptiveUpdateDisplay = document.getElementById('adaptiveUpdate');

    const RENDER_WINDOW_BEFORE = 180;
    const RENDER_WINDOW_AFTER = 900;
    const DEFAULT_SEGMENT_LENGTH = 180;
    const DEFAULT_TIMED_SECONDS = 60;
    let currentLocale = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    let activeModeTooltipTarget = null;
    try {
        const savedLocale = localStorage.getItem('typing_locale');
        if (savedLocale === 'zh' || savedLocale === 'en') {
            currentLocale = savedLocale;
        }
    } catch (error) {
        console.warn('Locale preference unavailable:', error);
    }
    const messages = {
        zh: {
            page_title: '打字练习网站',
            language_label: '语言',
            header_title: '打字练习',
            header_subtitle: '提升你的打字速度与准确率',
            wpm_label: 'WPM',
            timer_label: '时间 (秒)',
            input_placeholder: '在这里开始输入...',
            start_btn: '开始练习',
            reset_btn: '重置',
            opacity_label: '文本可见度：',
            accuracy_mode_label: '准确率模式：',
            accuracy_option_result: '结果准确率',
            accuracy_option_process: '过程准确率',
            training_mode_label: '训练模式',
            mode_option_classic: '经典',
            mode_option_timed: '限时',
            mode_option_segment: '分段',
            mode_option_blind: '盲打',
            mode_option_error: '错误聚焦',
            mode_intro_title: '模式说明',
            mode_intro_hint: '鼠标悬停或聚焦模式名称，可查看详细介绍。',
            mode_intro_classic: '完整练习整段文本，适合日常综合训练。',
            mode_intro_timed: '在 {seconds} 秒内尽量提高速度与准确率，倒计时结束自动结算。',
            mode_intro_segment: '每轮只练 {length} 个字符，适合分段突破和稳定节奏。',
            mode_intro_blind: '输入时隐藏后续文本，强化记忆与盲打能力。',
            mode_intro_error: '根据历史错误自动生成练习内容，针对弱点集中训练。',
            timed_seconds_label: '限时秒数',
            segment_length_label: '分段长度',
            adaptive_toggle_label: '自适应难度',
            upload_title: '上传你的文本',
            upload_hint: '点击选择或拖拽 .txt 文件到这里',
            folder_list_label: '或使用目录文章列表：',
            sample_list_label: '或使用内置示例：',
            sample_placeholder: '选择一个示例文本',
            result_title: '打字结果',
            final_wpm_label: '最终 WPM：',
            final_result_accuracy_label: '结果准确率：',
            final_process_accuracy_label: '过程准确率：',
            result_chars_label: '结果字符：',
            process_chars_label: '过程击键：',
            correct_label: '正确：',
            incorrect_label: '错误：',
            total_label: '总计：',
            error_rate_label: '错误率：',
            top_error_chars_label: '高频错误字符：',
            top_error_words_label: '高频错误词：',
            training_suggestion_label: '训练建议：',
            adaptive_update_label: '自适应调整：',
            accuracy_label_result: '准确率（结果）',
            accuracy_label_process: '准确率（过程）',
            mode_classic: '经典模式：从头到尾完成整段文本。',
            mode_timed: '限时模式：{seconds} 秒倒计时，到 0 自动结束。',
            mode_segment: '分段模式：每轮练习 {length} 个字符。',
            mode_segment_range: '当前分段范围：{start}-{end}。',
            mode_blind: '盲打模式：输入时隐藏未输入文本。',
            mode_error_with_history: '错误聚焦：根据近期错误自动生成练习文本。',
            mode_error_no_history: '错误聚焦：暂无历史错误，使用回退文本。',
            mode_extra_time_up: '限时结束：倒计时已到 0。',
            mode_extra_completed: '练习完成。点击开始可继续下一轮。',
            mode_extra_session_reset: '已重置当前会话。',
            render_empty_text: '当前模式暂无可用文本。请加载文本或先积累错误历史。',
            render_showing: '显示第 {start}-{end} / 共 {total} 字符',
            render_total: '共 {total} 字符',
            render_head_hidden: '... 前面隐藏 {count} 个字符 ... ',
            render_tail_hidden: ' ... 后面隐藏 {count} 个字符 ...',
            word_drill_title: '单词训练',
            char_drill_title: '字符训练',
            char_space: '空格',
            char_newline: '换行',
            char_tab: '制表符',
            none_value: '无',
            anti_reason_paste: '检测到粘贴/拖拽尝试',
            anti_reason_extreme_wpm: 'WPM 异常高',
            anti_reason_short_burst: '极短时间输入量过大',
            anti_reason_peak_cps: '峰值 CPS 过高（{peak}）',
            anti_reason_perfect_high_speed: '高速且异常接近满分',
            anti_suspicious: '疑似异常成绩：{reasons}。',
            anti_normal: '本次成绩正常（峰值 CPS {peak}）。',
            suggestion_slow_down: '先降低速度，稳定节奏，再逐步提速。',
            suggestion_focus_result: '优先提高结果准确率，不要为了赶进度牺牲正确性。',
            suggestion_char_drill: '可针对 {char} 及相邻键进行 3 分钟微训练。',
            suggestion_word_drill: '可对易错词“{word}”做短时重复练习。',
            suggestion_stable: '当前表现较稳定，可小幅提高难度。',
            adaptive_not_applied: '尚未应用',
            adaptive_disabled: '自适应难度已关闭。',
            adaptive_no_adjustment: '本轮无需调整难度。',
            adaptive_up: '难度上调：分段 {fromLength} -> {toLength}，可见度 {fromOpacity}% -> {toOpacity}%。',
            adaptive_down: '难度下调：分段 {fromLength} -> {toLength}，可见度 {fromOpacity}% -> {toOpacity}%。',
            alert_paste_blocked: '输入框禁用粘贴和拖拽。',
            alert_select_or_upload: '请先选择示例、目录文章或上传文本后再开始。',
            alert_no_text_mode: '当前模式没有可用文本。',
            alert_file_read_error: '读取文件失败。',
            alert_upload_txt_only: '请上传文本文件（.txt）。',
            select_article: '从目录选择文章',
            no_articles: '目录中没有可用文章',
            waiting_folder: '等待加载目录文章...',
            loading_folder: '正在加载目录文章...',
            folder_ready: '目录文章已就绪，共 {count} 篇。',
            folder_empty: '目录中没有有效文章，可继续使用示例或上传文本。',
            folder_unavailable: '目录文章不可用。请使用本地服务启动，或继续使用示例/上传文本。',
            folder_unavailable_file: '当前是 file:// 打开方式，浏览器会拦截目录读取。请用本地服务启动。',
            loading_article: '正在加载《{title}》...',
            load_article_failed: '文章加载失败：{title}',
            loaded_article: '已加载：{title}',
            random_loaded_article: '随机加载：{title}',
            hint_loaded_article: '已加载文章：{title}。',
            hint_random_article: '已随机加载文章：{title}。',
            using_uploaded: '已切换为上传文本。',
            using_sample: '已切换为内置示例文本。',
            hint_uploaded: '已加载上传文本。',
            hint_sample: '已加载内置示例文本。'
        },
        en: {
            page_title: 'Typing Practice Website',
            language_label: 'Language',
            header_title: 'Typing Practice',
            header_subtitle: 'Improve your typing speed and accuracy',
            wpm_label: 'WPM',
            timer_label: 'Time (s)',
            input_placeholder: 'Start typing here...',
            start_btn: 'Start Typing',
            reset_btn: 'Reset',
            opacity_label: 'Text Visibility:',
            accuracy_mode_label: 'Accuracy Mode:',
            accuracy_option_result: 'Result Accuracy',
            accuracy_option_process: 'Process Accuracy',
            training_mode_label: 'Training Mode',
            mode_option_classic: 'Classic',
            mode_option_timed: 'Timed',
            mode_option_segment: 'Segment',
            mode_option_blind: 'Blind',
            mode_option_error: 'Error Focus',
            mode_intro_title: 'Mode Guide',
            mode_intro_hint: 'Hover or focus a mode name to view details.',
            mode_intro_classic: 'Practice the full passage from start to finish for balanced training.',
            mode_intro_timed: 'Type within {seconds} seconds and auto-finish when the countdown hits zero.',
            mode_intro_segment: 'Each run uses {length} characters for focused chunk training.',
            mode_intro_blind: 'Hide upcoming text while typing to strengthen memory and touch typing.',
            mode_intro_error: 'Generate drills from past mistakes and focus on weak points.',
            timed_seconds_label: 'Timed Seconds',
            segment_length_label: 'Segment Length',
            adaptive_toggle_label: 'Adaptive Difficulty',
            upload_title: 'Upload Your Own Text',
            upload_hint: 'Click to select or drag and drop a text file here',
            folder_list_label: 'Or use folder article list:',
            sample_list_label: 'Or use sample text:',
            sample_placeholder: 'Select a sample text',
            result_title: 'Typing Results',
            final_wpm_label: 'Final WPM:',
            final_result_accuracy_label: 'Result Accuracy:',
            final_process_accuracy_label: 'Process Accuracy:',
            result_chars_label: 'Result Characters:',
            process_chars_label: 'Process Keystrokes:',
            correct_label: 'Correct:',
            incorrect_label: 'Incorrect:',
            total_label: 'Total:',
            error_rate_label: 'Error Rate:',
            top_error_chars_label: 'Top Error Characters:',
            top_error_words_label: 'Top Error Words:',
            training_suggestion_label: 'Training Suggestion:',
            adaptive_update_label: 'Adaptive Update:',
            accuracy_label_result: 'Accuracy (Result)',
            accuracy_label_process: 'Accuracy (Process)',
            mode_classic: 'Classic mode: type through the whole text.',
            mode_timed: 'Timed mode: {seconds}s countdown, auto-finish at 0.',
            mode_segment: 'Segment mode: each run uses {length} chars.',
            mode_segment_range: 'Current segment range: {start}-{end}.',
            mode_blind: 'Blind mode: upcoming characters are hidden while typing.',
            mode_error_with_history: 'Error Focus mode: drills are generated from recent mistakes.',
            mode_error_no_history: 'Error Focus mode: no history yet, using a fallback text segment.',
            mode_extra_time_up: 'Timed run ended because countdown reached 0.',
            mode_extra_completed: 'Run complete. Press Start to continue.',
            mode_extra_session_reset: 'Session reset.',
            render_empty_text: 'No text available for this mode. Load text or build error history first.',
            render_showing: 'Showing {start}-{end} of {total} characters',
            render_total: 'Total {total} characters',
            render_head_hidden: '... {count} characters hidden ... ',
            render_tail_hidden: ' ... {count} characters hidden ...',
            word_drill_title: 'Word drill',
            char_drill_title: 'Character drill',
            char_space: 'space',
            char_newline: 'newline',
            char_tab: 'tab',
            none_value: 'None',
            anti_reason_paste: 'blocked paste/drop attempts',
            anti_reason_extreme_wpm: 'extreme WPM',
            anti_reason_short_burst: 'too many chars in too little time',
            anti_reason_peak_cps: 'peak CPS too high ({peak})',
            anti_reason_perfect_high_speed: 'unusually perfect high-speed run',
            anti_suspicious: 'Suspicious run detected: {reasons}.',
            anti_normal: 'Run looks normal (peak CPS {peak}).',
            suggestion_slow_down: 'Slow down and stabilize rhythm first. Keep keystrokes even and deliberate.',
            suggestion_focus_result: 'Focus on result accuracy for this mode. Avoid rushing to the end of each line.',
            suggestion_char_drill: 'Create a 3-minute micro-drill for {char} and nearby keys.',
            suggestion_word_drill: 'Repeat tricky words such as "{word}" in short bursts.',
            suggestion_stable: 'Performance is stable. Increase difficulty slightly for the next round.',
            adaptive_not_applied: 'Not applied yet',
            adaptive_disabled: 'Adaptive difficulty is disabled.',
            adaptive_no_adjustment: 'No adjustment needed for this run.',
            adaptive_up: 'Difficulty up: segment {fromLength} -> {toLength}, visibility {fromOpacity}% -> {toOpacity}%.',
            adaptive_down: 'Difficulty down: segment {fromLength} -> {toLength}, visibility {fromOpacity}% -> {toOpacity}%.',
            alert_paste_blocked: 'Paste/drop into the typing box is disabled.',
            alert_select_or_upload: 'Please select, load, or upload a text before starting.',
            alert_no_text_mode: 'No text available for the selected mode.',
            alert_file_read_error: 'Error reading file.',
            alert_upload_txt_only: 'Please upload a text file (.txt).',
            select_article: 'Select an article from folder',
            no_articles: 'No folder articles found',
            waiting_folder: 'Waiting for folder articles...',
            loading_folder: 'Loading folder articles...',
            folder_ready: '{count} folder articles ready.',
            folder_empty: 'No valid folder articles found. Keep using sample/upload text.',
            folder_unavailable: 'Folder articles unavailable. Keep using sample/upload text.',
            folder_unavailable_file: 'Opened via file://. Please use a local server so folder articles can be loaded.',
            loading_article: 'Loading "{title}"...',
            load_article_failed: 'Failed to load article: {title}',
            loaded_article: 'Loaded: {title}',
            random_loaded_article: 'Randomly loaded: {title}',
            hint_loaded_article: 'Article loaded: {title}.',
            hint_random_article: 'Random article loaded: {title}.',
            using_uploaded: 'Using uploaded text file.',
            using_sample: 'Using built-in sample text.',
            hint_uploaded: 'Loaded text from uploaded file.',
            hint_sample: 'Loaded built-in sample text.'
        }
    };

    const sampleLibrary = {
        zh: [
            {
                label: '英文字母句',
                text: 'The quick brown fox jumps over the lazy dog. This sentence contains all letters of the alphabet and is commonly used for typing practice.'
            },
            {
                label: '编程说明',
                text: 'Programming is the process of creating a set of instructions that tell a computer how to perform a task. Programming can be done using various languages like JavaScript, Python, Java, and C++.'
            },
            {
                label: '打字速度说明',
                text: 'Typing speed is measured in words per minute. The average typing speed is around 40 words per minute. Professional typists can achieve speeds of 65 to 75 words per minute.'
            },
            {
                label: '中文练习',
                text: '中文打字练习强调节奏和准确率。先稳住正确率，再逐步提速，保持连续输入的手感。'
            },
            {
                label: '符号练习',
                text: 'Numbers and symbols drill: 0123456789 !@#$%^&*() []{} <>?/\\ +-=_~. Keep your fingers relaxed and maintain rhythm.'
            }
        ],
        en: [
            {
                label: 'English Pangram',
                text: 'The quick brown fox jumps over the lazy dog. This sentence contains all letters of the alphabet and is commonly used for typing practice.'
            },
            {
                label: 'Programming Text',
                text: 'Programming is the process of creating a set of instructions that tell a computer how to perform a task. Programming can be done using various languages like JavaScript, Python, Java, and C++.'
            },
            {
                label: 'Typing Text',
                text: 'Typing speed is measured in words per minute. The average typing speed is around 40 words per minute. Professional typists can achieve speeds of 65 to 75 words per minute.'
            },
            {
                label: 'Chinese Practice',
                text: 'Chinese typing practice improves accuracy and rhythm. Keep a steady pace, prioritize accuracy, then increase speed gradually.'
            },
            {
                label: 'Symbols Drill',
                text: 'Numbers and symbols drill: 0123456789 !@#$%^&*() []{} <>?/\\ +-=_~. Keep your fingers relaxed and maintain rhythm.'
            }
        ]
    };

    const state = {
        sourceText: '',
        activeText: '',
        startTime: null,
        timerInterval: null,
        timeElapsed: 0,
        timedRemaining: 0,
        totalChars: 0,
        correctChars: 0,
        incorrectChars: 0,
        processCorrectChars: 0,
        processIncorrectChars: 0,
        processTotalChars: 0,
        currentIndex: 0,
        typedValueCache: '',
        sessionEnded: false,
        lastPasteWarningTime: 0,
        pasteAttemptCount: 0,
        keystrokeTimestamps: [],
        segmentStartIndex: 0,
        lastAdaptiveUpdate: '',
        sessionWrongChars: new Map(),
        sessionWrongWords: new Map(),
        articleCatalog: [],
        currentArticleFile: '',
        textBaseCandidates: [],
        activeTextBase: '',
        articleStatusMeta: null,
        sampleTexts: [],
        globalWrongChars: new Map(),
        globalWrongWords: new Map()
    };

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function getSafeInt(value, fallback) {
        const num = Number.parseInt(value, 10);
        return Number.isNaN(num) ? fallback : num;
    }

    function sanitizeLoadedText(text) {
        return (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    function isTextFile(file) {
        return !!file && (file.type === 'text/plain' || /\.txt$/i.test(file.name));
    }

    function isSafeArticleFileName(fileName) {
        return typeof fileName === 'string' && /^[a-zA-Z0-9._-]+\.txt$/i.test(fileName);
    }

    function t(key, vars) {
        const dict = messages[currentLocale] || messages.en;
        const fallback = messages.en[key] || key;
        let text = dict[key] || fallback;
        if (vars && typeof vars === 'object') {
            for (const entry of Object.entries(vars)) {
                const token = `{${entry[0]}}`;
                text = text.replaceAll(token, String(entry[1]));
            }
        }
        return text;
    }

    function setNodeText(id, key, vars) {
        const node = document.getElementById(id);
        if (!node) {
            return;
        }
        node.textContent = t(key, vars);
    }

    function getActiveSampleTexts() {
        return sampleLibrary[currentLocale] || sampleLibrary.en;
    }

    function renderSampleOptions() {
        const samples = getActiveSampleTexts();
        state.sampleTexts = samples;
        const previousValue = sampleText.value;

        sampleText.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = t('sample_placeholder');
        sampleText.appendChild(placeholder);

        for (let i = 0; i < samples.length; i++) {
            const option = document.createElement('option');
            option.value = samples[i].text;
            option.textContent = samples[i].label;
            sampleText.appendChild(option);
        }

        if (previousValue && samples.some((sample) => sample.text === previousValue)) {
            sampleText.value = previousValue;
        } else {
            sampleText.value = '';
        }
    }

    function applyLocaleToUI() {
        document.documentElement.lang = currentLocale === 'zh' ? 'zh-CN' : 'en';
        document.title = t('page_title');

        setNodeText('languageLabel', 'language_label');
        setNodeText('headerTitle', 'header_title');
        setNodeText('headerSubtitle', 'header_subtitle');
        setNodeText('wpmLabel', 'wpm_label');
        setNodeText('timerLabel', 'timer_label');
        setNodeText('opacityLabel', 'opacity_label');
        setNodeText('accuracyModeLabel', 'accuracy_mode_label');
        setNodeText('accuracyOptionResult', 'accuracy_option_result');
        setNodeText('accuracyOptionProcess', 'accuracy_option_process');
        setNodeText('trainingModeLabel', 'training_mode_label');
        setNodeText('modeOptionClassic', 'mode_option_classic');
        setNodeText('modeOptionTimed', 'mode_option_timed');
        setNodeText('modeOptionSegment', 'mode_option_segment');
        setNodeText('modeOptionBlind', 'mode_option_blind');
        setNodeText('modeOptionError', 'mode_option_error');
        setNodeText('modeIntroTitle', 'mode_intro_title');
        setNodeText('modeIntroHint', 'mode_intro_hint');
        setNodeText('modeInfoClassic', 'mode_option_classic');
        setNodeText('modeInfoTimed', 'mode_option_timed');
        setNodeText('modeInfoSegment', 'mode_option_segment');
        setNodeText('modeInfoBlind', 'mode_option_blind');
        setNodeText('modeInfoError', 'mode_option_error');
        setNodeText('timedSecondsLabel', 'timed_seconds_label');
        setNodeText('segmentLengthLabel', 'segment_length_label');
        setNodeText('adaptiveToggleLabel', 'adaptive_toggle_label');
        setNodeText('uploadTitle', 'upload_title');
        setNodeText('uploadHint', 'upload_hint');
        setNodeText('folderListLabel', 'folder_list_label');
        setNodeText('sampleListLabel', 'sample_list_label');
        setNodeText('resultTitle', 'result_title');
        setNodeText('finalWpmLabel', 'final_wpm_label');
        setNodeText('finalResultAccuracyLabel', 'final_result_accuracy_label');
        setNodeText('finalProcessAccuracyLabel', 'final_process_accuracy_label');
        setNodeText('resultCharsLabel', 'result_chars_label');
        setNodeText('processCharsLabel', 'process_chars_label');
        setNodeText('resultCorrectLabel', 'correct_label');
        setNodeText('resultIncorrectLabel', 'incorrect_label');
        setNodeText('resultTotalLabel', 'total_label');
        setNodeText('processCorrectLabel', 'correct_label');
        setNodeText('processIncorrectLabel', 'incorrect_label');
        setNodeText('processTotalLabel', 'total_label');
        setNodeText('errorRateLabel', 'error_rate_label');
        setNodeText('topErrorCharsLabel', 'top_error_chars_label');
        setNodeText('topErrorWordsLabel', 'top_error_words_label');
        setNodeText('trainingSuggestionLabel', 'training_suggestion_label');
        setNodeText('adaptiveUpdateLabel', 'adaptive_update_label');

        textInput.placeholder = t('input_placeholder');
        startBtn.textContent = t('start_btn');
        resetBtn.textContent = t('reset_btn');

        renderSampleOptions();
        renderArticleOptions();
        refreshArticleStatusLocale();
        updateModeHint('');
        updateStats();
        refreshModeTooltip();
    }

    function setArticleStatus(message, isError) {
        if (!articleStatus) {
            return;
        }
        articleStatus.textContent = message || '';
        articleStatus.className = isError ? 'article-status error' : 'article-status';
    }

    function setArticleStatusByKey(key, isError, vars) {
        state.articleStatusMeta = {
            key,
            isError: !!isError,
            vars: vars || null
        };
        setArticleStatus(t(key, vars), isError);
    }

    function refreshArticleStatusLocale() {
        if (!state.articleStatusMeta) {
            return;
        }
        setArticleStatus(
            t(state.articleStatusMeta.key, state.articleStatusMeta.vars || undefined),
            state.articleStatusMeta.isError
        );
    }

    function pushTextBase(candidates, dedup, candidate) {
        if (!candidate) {
            return;
        }
        try {
            const normalized = new URL('./', candidate).href;
            if (!dedup.has(normalized)) {
                dedup.add(normalized);
                candidates.push(normalized);
            }
        } catch (error) {
            console.warn('Ignore invalid text base candidate:', candidate, error);
        }
    }

    function buildTextBaseCandidates() {
        const candidates = [];
        const dedup = new Set();

        pushTextBase(candidates, dedup, new URL('texts/', window.location.href).href);

        const script = document.querySelector('script[src$="app.js"]');
        if (script && script.src) {
            pushTextBase(candidates, dedup, new URL('texts/', script.src).href);
        }

        if (window.location.origin && window.location.origin !== 'null') {
            pushTextBase(candidates, dedup, new URL('/texts/', window.location.origin).href);

            const segments = window.location.pathname.split('/').filter((segment) => segment);
            const typingIndex = segments.lastIndexOf('typing');
            if (typingIndex >= 0) {
                const prefix = segments.slice(0, typingIndex + 1).join('/');
                pushTextBase(candidates, dedup, new URL(`/${prefix}/texts/`, window.location.origin).href);
            }
        }

        return candidates;
    }

    async function fetchTextAsset(relativeFile) {
        const baseCandidates = state.activeTextBase
            ? [state.activeTextBase].concat(state.textBaseCandidates.filter((base) => base !== state.activeTextBase))
            : state.textBaseCandidates;
        const attempts = [];

        for (let i = 0; i < baseCandidates.length; i++) {
            const base = baseCandidates[i];
            const assetUrl = new URL(relativeFile, base).href;
            try {
                const response = await fetch(assetUrl, { cache: 'no-store' });
                if (response.ok) {
                    state.activeTextBase = base;
                    return response;
                }
                attempts.push(`${assetUrl} -> HTTP ${response.status}`);
            } catch (error) {
                attempts.push(`${assetUrl} -> ${error && error.message ? error.message : 'request failed'}`);
            }
        }

        throw new Error(attempts.join(' | '));
    }

    function normalizeArticleCatalog(rawCatalog) {
        if (!Array.isArray(rawCatalog)) {
            return [];
        }

        const seen = new Set();
        const normalized = [];

        for (let i = 0; i < rawCatalog.length; i++) {
            const item = rawCatalog[i];
            let file = '';
            let titleEn = '';
            let titleZh = '';

            if (typeof item === 'string') {
                file = item.trim();
            } else if (item && typeof item === 'object') {
                if (typeof item.file === 'string') {
                    file = item.file.trim();
                }
                if (typeof item.title === 'string') {
                    titleEn = item.title.trim();
                }
                if (typeof item.titleEn === 'string') {
                    titleEn = item.titleEn.trim();
                }
                if (typeof item.titleZh === 'string') {
                    titleZh = item.titleZh.trim();
                }
            }

            if (!isSafeArticleFileName(file) || seen.has(file)) {
                continue;
            }

            seen.add(file);
            normalized.push({
                file,
                titleEn: titleEn || file.replace(/\.txt$/i, ''),
                titleZh: titleZh || ''
            });
        }

        return normalized;
    }

    function getArticleDisplayTitle(article) {
        if (!article) {
            return '';
        }
        if (currentLocale === 'zh') {
            return article.titleZh || article.titleEn || article.file;
        }
        return article.titleEn || article.titleZh || article.file;
    }

    function renderArticleOptions() {
        if (!articleSelect) {
            return;
        }

        articleSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = state.articleCatalog.length > 0
            ? t('select_article')
            : t('no_articles');
        articleSelect.appendChild(placeholder);

        for (let i = 0; i < state.articleCatalog.length; i++) {
            const article = state.articleCatalog[i];
            const option = document.createElement('option');
            option.value = article.file;
            option.textContent = getArticleDisplayTitle(article);
            articleSelect.appendChild(option);
        }

        if (state.currentArticleFile) {
            articleSelect.value = state.currentArticleFile;
        }
    }

    function getMode() {
        return trainingMode.value;
    }

    function getModeLabelByCode(mode) {
        if (mode === 'classic') {
            return t('mode_option_classic');
        }
        if (mode === 'timed') {
            return t('mode_option_timed');
        }
        if (mode === 'segment') {
            return t('mode_option_segment');
        }
        if (mode === 'blind') {
            return t('mode_option_blind');
        }
        if (mode === 'error') {
            return t('mode_option_error');
        }
        return mode || '';
    }

    function getModeIntroDescription(mode) {
        if (mode === 'classic') {
            return t('mode_intro_classic');
        }
        if (mode === 'timed') {
            return t('mode_intro_timed', { seconds: getTimedSeconds() });
        }
        if (mode === 'segment') {
            return t('mode_intro_segment', { length: getSegmentLength() });
        }
        if (mode === 'blind') {
            return t('mode_intro_blind');
        }
        if (mode === 'error') {
            return t('mode_intro_error');
        }
        return '';
    }

    function positionModeTooltip(target) {
        if (!modeTooltip || !target) {
            return;
        }

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = modeTooltip.getBoundingClientRect();
        const viewportPadding = 8;
        let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        let top = targetRect.bottom + 10;

        if (left < viewportPadding) {
            left = viewportPadding;
        }
        if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
            left = window.innerWidth - tooltipRect.width - viewportPadding;
        }
        if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
            top = targetRect.top - tooltipRect.height - 10;
        }
        if (top < viewportPadding) {
            top = viewportPadding;
        }

        modeTooltip.style.left = `${Math.round(left)}px`;
        modeTooltip.style.top = `${Math.round(top)}px`;
    }

    function showModeTooltip(target) {
        if (!modeTooltip || !target) {
            return;
        }

        const mode = target.getAttribute('data-mode');
        if (!mode) {
            return;
        }

        activeModeTooltipTarget = target;
        const label = getModeLabelByCode(mode);
        const intro = getModeIntroDescription(mode);
        modeTooltip.textContent = `${label}: ${intro}`;
        modeTooltip.hidden = false;
        positionModeTooltip(target);
    }

    function hideModeTooltip() {
        if (!modeTooltip) {
            return;
        }
        modeTooltip.hidden = true;
        activeModeTooltipTarget = null;
    }

    function refreshModeTooltip() {
        if (!activeModeTooltipTarget || !modeTooltip || modeTooltip.hidden) {
            return;
        }
        showModeTooltip(activeModeTooltipTarget);
    }

    function getTimedSeconds() {
        return clamp(getSafeInt(timedSecondsInput.value, DEFAULT_TIMED_SECONDS), 15, 600);
    }

    function getSegmentLength() {
        return clamp(getSafeInt(segmentLengthInput.value, DEFAULT_SEGMENT_LENGTH), 60, 1200);
    }

    function isBlindActive() {
        return getMode() === 'blind' && !textInput.disabled;
    }

    function hasErrorHistory() {
        return state.globalWrongChars.size > 0 || state.globalWrongWords.size > 0;
    }

    function incrementMap(map, key, amount) {
        if (!key) {
            return;
        }
        const current = map.get(key) || 0;
        map.set(key, current + amount);
    }

    function getTopEntries(map, limit) {
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    }

    function formatVisibleChar(char) {
        if (char === ' ') {
            return `[${t('char_space')}]`;
        }
        if (char === '\n') {
            return `[${t('char_newline')}]`;
        }
        if (char === '\t') {
            return `[${t('char_tab')}]`;
        }
        return char;
    }

    function getWordAt(text, index) {
        if (!text || index < 0 || index >= text.length) {
            return '';
        }

        let left = index;
        let right = index;

        while (left > 0 && !/\s/.test(text[left - 1])) {
            left--;
        }
        while (right < text.length && !/\s/.test(text[right])) {
            right++;
        }

        const word = text.slice(left, right).trim();
        return word.replace(/[.,!?;:"'()[\]{}<>]/g, '');
    }

    function calculatePeakCPS(timestamps) {
        if (timestamps.length === 0) {
            return 0;
        }
        let left = 0;
        let peak = 1;
        for (let right = 0; right < timestamps.length; right++) {
            while (timestamps[right] - timestamps[left] > 1000) {
                left++;
            }
            peak = Math.max(peak, right - left + 1);
        }
        return peak;
    }

    function warnPasteBlocked() {
        const now = Date.now();
        if (now - state.lastPasteWarningTime < 800) {
            return;
        }
        state.lastPasteWarningTime = now;
        alert(t('alert_paste_blocked'));
    }

    function buildErrorFocusText() {
        const topWords = getTopEntries(state.globalWrongWords, 6).map((entry) => entry[0]);
        const topChars = getTopEntries(state.globalWrongChars, 8).map((entry) => entry[0]);
        const blocks = [];

        if (topWords.length > 0) {
            const wordDrill = topWords.map((word) => `${word} ${word} ${word}`).join('\n');
            blocks.push(`${t('word_drill_title')}:\n${wordDrill}`);
        }

        if (topChars.length > 0) {
            const charDrill = topChars
                .map((char) => Array(12).fill(char).join(' '))
                .join('\n');
            blocks.push(`${t('char_drill_title')}:\n${charDrill}`);
        }

        if (blocks.length > 0) {
            return blocks.join('\n\n');
        }

        if (!state.sourceText) {
            return '';
        }

        const fallbackLength = Math.min(state.sourceText.length, getSegmentLength());
        return state.sourceText.slice(0, fallbackLength);
    }

    function prepareActiveTextForMode() {
        const mode = getMode();
        const sourceLength = state.sourceText.length;

        if (mode === 'segment') {
            if (sourceLength === 0) {
                state.activeText = '';
                return '';
            }
            if (state.segmentStartIndex >= sourceLength) {
                state.segmentStartIndex = 0;
            }
            const segLength = getSegmentLength();
            const segment = state.sourceText.slice(state.segmentStartIndex, state.segmentStartIndex + segLength);
            state.activeText = segment || state.sourceText.slice(0, segLength);
            return state.activeText;
        }

        if (mode === 'error') {
            state.activeText = buildErrorFocusText();
            return state.activeText;
        }

        state.activeText = state.sourceText;
        return state.activeText;
    }

    function updateModeHint(extra) {
        const mode = getMode();
        const parts = [];

        if (mode === 'classic') {
            parts.push(t('mode_classic'));
        } else if (mode === 'timed') {
            parts.push(t('mode_timed', { seconds: getTimedSeconds() }));
        } else if (mode === 'segment') {
            parts.push(t('mode_segment', { length: getSegmentLength() }));
            if (state.sourceText.length > 0) {
                const start = state.segmentStartIndex + 1;
                const end = Math.min(state.segmentStartIndex + getSegmentLength(), state.sourceText.length);
                parts.push(t('mode_segment_range', { start, end }));
            }
        } else if (mode === 'blind') {
            parts.push(t('mode_blind'));
        } else if (mode === 'error') {
            if (hasErrorHistory()) {
                parts.push(t('mode_error_with_history'));
            } else {
                parts.push(t('mode_error_no_history'));
            }
        }

        if (extra) {
            parts.push(extra);
        }

        modeHint.textContent = parts.join(' ');
    }

    function updateStartButtonState() {
        if (getMode() === 'error') {
            startBtn.disabled = !state.sourceText && !hasErrorHistory();
            return;
        }
        startBtn.disabled = state.sourceText.length === 0;
    }

    function updateModeControlState() {
        const sessionActive = !textInput.disabled;
        trainingMode.disabled = sessionActive;
        sampleText.disabled = sessionActive;
        adaptiveToggle.disabled = sessionActive;
        if (articleSelect) {
            articleSelect.disabled = sessionActive || state.articleCatalog.length === 0;
        }

        if (sessionActive) {
            timedSecondsInput.disabled = true;
            segmentLengthInput.disabled = true;
        } else {
            timedSecondsInput.disabled = getMode() !== 'timed';
            segmentLengthInput.disabled = !(getMode() === 'segment' || getMode() === 'error');
        }

        opacitySlider.disabled = sessionActive && isBlindActive();
        updateModeHint('');
    }

    function resetSessionState() {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.startTime = null;
        state.timeElapsed = 0;
        state.timedRemaining = getTimedSeconds();
        state.totalChars = 0;
        state.correctChars = 0;
        state.incorrectChars = 0;
        state.processCorrectChars = 0;
        state.processIncorrectChars = 0;
        state.processTotalChars = 0;
        state.currentIndex = 0;
        state.typedValueCache = '';
        state.sessionEnded = false;
        state.keystrokeTimestamps = [];
        state.sessionWrongChars.clear();
        state.sessionWrongWords.clear();
        state.pasteAttemptCount = 0;
        antiCheatStatusDisplay.textContent = '';
        antiCheatStatusDisplay.className = '';
        adaptiveUpdateDisplay.textContent = state.lastAdaptiveUpdate;
    }

    function startTimerIfNeeded() {
        if (state.startTime || textInput.disabled) {
            return;
        }

        state.startTime = Date.now();
        state.timeElapsed = 0;
        state.timedRemaining = getTimedSeconds();

        clearInterval(state.timerInterval);
        if (getMode() === 'timed') {
            state.timerInterval = setInterval(function() {
                const elapsed = (Date.now() - state.startTime) / 1000;
                state.timeElapsed = elapsed;
                state.timedRemaining = Math.max(0, getTimedSeconds() - elapsed);
                updateStats();
                if (state.timedRemaining <= 0) {
                    finishTest('time_up');
                }
            }, 100);
        } else {
            state.timerInterval = setInterval(function() {
                state.timeElapsed = (Date.now() - state.startTime) / 1000;
                updateStats();
            }, 1000);
        }
    }

    function calculateWPM() {
        if (!state.startTime || state.timeElapsed <= 0) {
            return 0;
        }
        const timeInMinutes = state.timeElapsed / 60;
        const wordsTyped = state.correctChars / 5;
        return timeInMinutes > 0 ? wordsTyped / timeInMinutes : 0;
    }

    function calculateResultAccuracy() {
        if (state.totalChars === 0) {
            return 100;
        }
        return (state.correctChars / state.totalChars) * 100;
    }

    function calculateProcessAccuracy() {
        if (state.processTotalChars === 0) {
            return 100;
        }
        return (state.processCorrectChars / state.processTotalChars) * 100;
    }

    function calculateDisplayedAccuracy() {
        return accuracyMode.value === 'process'
            ? calculateProcessAccuracy()
            : calculateResultAccuracy();
    }

    function updateStats() {
        if (state.startTime && !textInput.disabled) {
            state.timeElapsed = (Date.now() - state.startTime) / 1000;
            if (getMode() === 'timed') {
                state.timedRemaining = Math.max(0, getTimedSeconds() - state.timeElapsed);
            }
        }

        const wpm = calculateWPM();
        const accuracy = calculateDisplayedAccuracy();
        wpmDisplay.textContent = Math.round(wpm);
        accuracyDisplay.textContent = `${Math.round(accuracy)}%`;
        accuracyLabel.textContent = accuracyMode.value === 'process'
            ? t('accuracy_label_process')
            : t('accuracy_label_result');

        if (getMode() === 'timed') {
            timerDisplay.textContent = Math.ceil(state.timedRemaining);
        } else {
            timerDisplay.textContent = Math.floor(state.timeElapsed);
        }
    }

    function recalculateResultCounters(nextValue) {
        let correct = 0;
        let incorrect = 0;
        for (let i = 0; i < nextValue.length; i++) {
            if (nextValue[i] === state.activeText[i]) {
                correct++;
            } else {
                incorrect++;
            }
        }
        state.correctChars = correct;
        state.incorrectChars = incorrect;
    }

    function updateResultCounters(nextValue) {
        if (nextValue.startsWith(state.typedValueCache)) {
            const appended = nextValue.slice(state.typedValueCache.length);
            const startIndex = state.typedValueCache.length;
            for (let i = 0; i < appended.length; i++) {
                const textIndex = startIndex + i;
                if (appended[i] === state.activeText[textIndex]) {
                    state.correctChars++;
                } else {
                    state.incorrectChars++;
                }
            }
            return;
        }

        if (state.typedValueCache.startsWith(nextValue)) {
            for (let i = state.typedValueCache.length - 1; i >= nextValue.length; i--) {
                if (state.typedValueCache[i] === state.activeText[i]) {
                    state.correctChars--;
                } else {
                    state.incorrectChars--;
                }
            }
            return;
        }

        recalculateResultCounters(nextValue);
    }

    function collectWordErrors() {
        state.sessionWrongWords.clear();
        const limit = Math.min(state.typedValueCache.length, state.activeText.length);
        for (let i = 0; i < limit; i++) {
            if (state.typedValueCache[i] !== state.activeText[i]) {
                const word = getWordAt(state.activeText, i) || '[symbol]';
                incrementMap(state.sessionWrongWords, word, 1);
            }
        }
    }

    function evaluateAntiCheat(finalWpm, resultAccuracy, processAccuracy) {
        const reasons = [];
        const peakCPS = calculatePeakCPS(state.keystrokeTimestamps);

        if (state.pasteAttemptCount > 0) {
            reasons.push(t('anti_reason_paste'));
        }
        if (finalWpm > 260) {
            reasons.push(t('anti_reason_extreme_wpm'));
        }
        if (state.timeElapsed < 5 && state.totalChars > 80) {
            reasons.push(t('anti_reason_short_burst'));
        }
        if (peakCPS > 22) {
            reasons.push(t('anti_reason_peak_cps', { peak: peakCPS }));
        }
        if (finalWpm > 180 && resultAccuracy > 99 && processAccuracy > 99) {
            reasons.push(t('anti_reason_perfect_high_speed'));
        }

        return {
            suspicious: reasons.length > 0,
            reasons,
            peakCPS
        };
    }

    function mergeSessionErrorsIntoGlobal() {
        for (const entry of state.sessionWrongChars.entries()) {
            incrementMap(state.globalWrongChars, entry[0], entry[1]);
        }
        for (const entry of state.sessionWrongWords.entries()) {
            incrementMap(state.globalWrongWords, entry[0], entry[1]);
        }
    }

    function generateSuggestion(resultAccuracy, processAccuracy, topChars, topWords) {
        if (processAccuracy < 88) {
            return t('suggestion_slow_down');
        }
        if (resultAccuracy < 92) {
            return t('suggestion_focus_result');
        }
        if (topChars.length > 0) {
            return t('suggestion_char_drill', { char: topChars[0][0] });
        }
        if (topWords.length > 0) {
            return t('suggestion_word_drill', { word: topWords[0][0] });
        }
        return t('suggestion_stable');
    }

    function applyAdaptiveDifficulty(finalWpm, resultAccuracy, processAccuracy) {
        if (!adaptiveToggle.checked) {
            state.lastAdaptiveUpdate = t('adaptive_disabled');
            adaptiveUpdateDisplay.textContent = state.lastAdaptiveUpdate;
            return;
        }

        const currentSegmentLength = getSegmentLength();
        const currentOpacity = Number(opacitySlider.value);
        let nextSegmentLength = currentSegmentLength;
        let nextOpacity = currentOpacity;
        let message = t('adaptive_no_adjustment');

        if (finalWpm >= 60 && resultAccuracy >= 97 && processAccuracy >= 95) {
            nextSegmentLength = clamp(currentSegmentLength + 40, 60, 1200);
            nextOpacity = clamp(currentOpacity - 8, 15, 100);
            message = t('adaptive_up', {
                fromLength: currentSegmentLength,
                toLength: nextSegmentLength,
                fromOpacity: currentOpacity,
                toOpacity: Math.round(nextOpacity)
            });
        } else if (resultAccuracy < 90 || processAccuracy < 87) {
            nextSegmentLength = clamp(currentSegmentLength - 30, 60, 1200);
            nextOpacity = clamp(currentOpacity + 10, 20, 100);
            message = t('adaptive_down', {
                fromLength: currentSegmentLength,
                toLength: nextSegmentLength,
                fromOpacity: currentOpacity,
                toOpacity: Math.round(nextOpacity)
            });
        }

        segmentLengthInput.value = String(nextSegmentLength);
        opacitySlider.value = String(Math.round(nextOpacity));
        opacityValue.textContent = `${Math.round(nextOpacity)}%`;
        state.lastAdaptiveUpdate = message;
        adaptiveUpdateDisplay.textContent = message;
    }

    function ensureCurrentCharVisible() {
        if (textInput.disabled) {
            return;
        }

        if (textDisplay.scrollLeft !== 0) {
            textDisplay.scrollLeft = 0;
        }

        const currentChar = textDisplay.querySelector('.character.current');
        if (!currentChar) {
            return;
        }

        const containerRect = textDisplay.getBoundingClientRect();
        const currentRect = currentChar.getBoundingClientRect();
        const edgePadding = 24;

        if (currentRect.top < containerRect.top + edgePadding) {
            textDisplay.scrollTop -= (containerRect.top + edgePadding) - currentRect.top;
        } else if (currentRect.bottom > containerRect.bottom - edgePadding) {
            textDisplay.scrollTop += currentRect.bottom - (containerRect.bottom - edgePadding);
        }
    }

    function keepInputVerticalOnly() {
        if (textInput.scrollLeft !== 0) {
            textInput.scrollLeft = 0;
        }
    }

    function renderText() {
        textDisplay.innerHTML = '';

        const textLength = state.activeText.length;
        if (textLength === 0) {
            renderHint.textContent = t('render_empty_text');
            progressBar.style.width = '0%';
            return;
        }

        const start = Math.max(0, state.currentIndex - RENDER_WINDOW_BEFORE);
        const end = Math.min(textLength, state.currentIndex + RENDER_WINDOW_AFTER + 1);
        const fragment = document.createDocumentFragment();
        const baseOpacity = isBlindActive() ? 0 : Number(opacitySlider.value) / 100;

        if (start > 0) {
            const headMarker = document.createElement('span');
            headMarker.className = 'window-marker';
            headMarker.textContent = t('render_head_hidden', { count: start });
            fragment.appendChild(headMarker);
        }

        for (let i = start; i < end; i++) {
            const charSpan = document.createElement('span');
            charSpan.classList.add('character');
            charSpan.textContent = state.activeText[i] === '\r' ? '' : state.activeText[i];

            if (i === state.currentIndex && state.currentIndex < textLength && !textInput.disabled) {
                charSpan.classList.add('current');
                charSpan.style.opacity = isBlindActive() ? '0.25' : baseOpacity.toString();
            } else if (i < state.totalChars) {
                if (state.activeText[i] === state.typedValueCache[i]) {
                    charSpan.classList.add('correct');
                } else {
                    charSpan.classList.add('incorrect');
                }
                charSpan.style.opacity = '1';
            } else {
                charSpan.style.opacity = baseOpacity.toString();
            }

            fragment.appendChild(charSpan);
        }

        if (end < textLength) {
            const tailMarker = document.createElement('span');
            tailMarker.className = 'window-marker';
            tailMarker.textContent = t('render_tail_hidden', { count: textLength - end });
            fragment.appendChild(tailMarker);
        }

        textDisplay.appendChild(fragment);

        const progress = textLength > 0 ? (state.totalChars / textLength) * 100 : 0;
        progressBar.style.width = `${Math.min(progress, 100)}%`;

        if (textLength > end - start) {
            renderHint.textContent = t('render_showing', {
                start: start + 1,
                end,
                total: textLength
            });
        } else {
            renderHint.textContent = t('render_total', { total: textLength });
        }

        ensureCurrentCharVisible();
    }

    function advanceSegmentCursor() {
        if (getMode() !== 'segment') {
            return;
        }
        state.segmentStartIndex += state.activeText.length;
        if (state.segmentStartIndex >= state.sourceText.length) {
            state.segmentStartIndex = 0;
        }
    }

    function finishTest(reason) {
        if (state.sessionEnded) {
            return;
        }
        state.sessionEnded = true;

        clearInterval(state.timerInterval);
        state.timerInterval = null;

        if (state.startTime) {
            state.timeElapsed = (Date.now() - state.startTime) / 1000;
            if (getMode() === 'timed') {
                state.timedRemaining = Math.max(0, getTimedSeconds() - state.timeElapsed);
            }
        } else {
            state.timeElapsed = 0;
        }

        textInput.disabled = true;
        state.currentIndex = state.totalChars;
        updateModeControlState();

        collectWordErrors();
        mergeSessionErrorsIntoGlobal();

        const finalWpm = calculateWPM();
        const finalResultAccuracy = calculateResultAccuracy();
        const finalProcessAccuracy = calculateProcessAccuracy();
        const errorRate = state.totalChars > 0 ? (state.incorrectChars / state.totalChars) * 100 : 0;
        const antiCheat = evaluateAntiCheat(finalWpm, finalResultAccuracy, finalProcessAccuracy);
        const topChars = getTopEntries(state.sessionWrongChars, 5);
        const topWords = getTopEntries(state.sessionWrongWords, 5);
        const suggestion = generateSuggestion(finalResultAccuracy, finalProcessAccuracy, topChars, topWords);

        finalWpmDisplay.textContent = Math.round(finalWpm);
        finalResultAccuracyDisplay.textContent = `${Math.round(finalResultAccuracy)}%`;
        finalProcessAccuracyDisplay.textContent = `${Math.round(finalProcessAccuracy)}%`;
        correctCharsDisplay.textContent = state.correctChars;
        incorrectCharsDisplay.textContent = state.incorrectChars;
        totalCharsDisplay.textContent = state.totalChars;
        processCorrectCharsDisplay.textContent = state.processCorrectChars;
        processIncorrectCharsDisplay.textContent = state.processIncorrectChars;
        processTotalCharsDisplay.textContent = state.processTotalChars;
        errorRateDisplay.textContent = `${errorRate.toFixed(1)}%`;

        topErrorCharsDisplay.textContent = topChars.length > 0
            ? topChars.map((entry) => `${formatVisibleChar(entry[0])}(${entry[1]})`).join(', ')
            : t('none_value');
        topErrorWordsDisplay.textContent = topWords.length > 0
            ? topWords.map((entry) => `${entry[0]}(${entry[1]})`).join(', ')
            : t('none_value');
        reviewSuggestionDisplay.textContent = suggestion;

        if (antiCheat.suspicious) {
            antiCheatStatusDisplay.className = 'warning-text';
            antiCheatStatusDisplay.textContent = t('anti_suspicious', { reasons: antiCheat.reasons.join('; ') });
        } else {
            antiCheatStatusDisplay.className = 'success-text';
            antiCheatStatusDisplay.textContent = t('anti_normal', { peak: antiCheat.peakCPS });
        }

        applyAdaptiveDifficulty(finalWpm, finalResultAccuracy, finalProcessAccuracy);

        if (reason === 'completed' && getMode() === 'segment') {
            advanceSegmentCursor();
        }

        const extra = reason === 'time_up'
            ? t('mode_extra_time_up')
            : t('mode_extra_completed');
        updateModeHint(extra);

        resultDiv.classList.add('show');
        renderText();
        updateStats();
        updateStartButtonState();
    }

    function startTyping() {
        hideModeTooltip();
        if (!state.sourceText && !hasErrorHistory()) {
            alert(t('alert_select_or_upload'));
            return;
        }

        resetSessionState();
        prepareActiveTextForMode();

        if (!state.activeText) {
            alert(t('alert_no_text_mode'));
            return;
        }

        textInput.disabled = false;
        textInput.value = '';
        textInput.focus();
        keepInputVerticalOnly();
        resultDiv.classList.remove('show');
        updateModeControlState();

        updateModeHint('');
        renderText();
        textDisplay.scrollTop = 0;
        updateStats();
    }

    function resetTest() {
        hideModeTooltip();
        resetSessionState();
        textInput.disabled = true;
        textInput.value = '';
        keepInputVerticalOnly();
        state.segmentStartIndex = 0;
        updateModeControlState();
        prepareActiveTextForMode();
        resultDiv.classList.remove('show');
        renderText();
        textDisplay.scrollTop = 0;
        updateModeHint(t('mode_extra_session_reset'));
        updateStats();
        updateStartButtonState();
    }

    function applySourceText(nextText, hintMessage) {
        state.sourceText = sanitizeLoadedText(nextText);
        state.segmentStartIndex = 0;
        updateStartButtonState();
        resetTest();
        if (hintMessage) {
            updateModeHint(hintMessage);
        }
    }

    async function loadFolderArticle(article, randomLoad) {
        if (!article || !isSafeArticleFileName(article.file) || !textInput.disabled) {
            return false;
        }

        const displayTitle = getArticleDisplayTitle(article);

        try {
            setArticleStatusByKey('loading_article', false, { title: displayTitle });
            const response = await fetchTextAsset(article.file);
            const articleText = await response.text();
            applySourceText(
                articleText,
                randomLoad
                    ? t('hint_random_article', { title: displayTitle })
                    : t('hint_loaded_article', { title: displayTitle })
            );

            state.currentArticleFile = article.file;
            if (articleSelect) {
                articleSelect.value = article.file;
            }
            sampleText.value = '';
            setArticleStatusByKey(
                randomLoad ? 'random_loaded_article' : 'loaded_article',
                false,
                { title: displayTitle }
            );
            return true;
        } catch (error) {
            console.error('Failed to load folder article:', error);
            setArticleStatusByKey('load_article_failed', true, { title: displayTitle });
            return false;
        }
    }

    async function loadRandomFolderArticle() {
        if (state.articleCatalog.length === 0) {
            return false;
        }
        const randomIndex = Math.floor(Math.random() * state.articleCatalog.length);
        return loadFolderArticle(state.articleCatalog[randomIndex], true);
    }

    async function loadArticleCatalogFromFolder() {
        if (!articleSelect) {
            return;
        }

        articleSelect.innerHTML = `<option value="">${t('loading_folder')}</option>`;
        setArticleStatusByKey('loading_folder', false);

        try {
            const response = await fetchTextAsset('articles.json');
            const rawCatalog = await response.json();
            state.articleCatalog = normalizeArticleCatalog(rawCatalog);
            renderArticleOptions();
            updateModeControlState();

            if (state.articleCatalog.length === 0) {
                setArticleStatusByKey('folder_empty', true);
                return;
            }

            setArticleStatusByKey('folder_ready', false, { count: state.articleCatalog.length });
            await loadRandomFolderArticle();
        } catch (error) {
            console.error('Failed to load folder article catalog:', error);
            state.articleCatalog = [];
            renderArticleOptions();
            updateModeControlState();
            if (window.location.protocol === 'file:') {
                setArticleStatusByKey('folder_unavailable_file', true);
            } else {
                setArticleStatusByKey('folder_unavailable', true);
            }
        }
    }

    function loadTextFromFile(file) {
        const reader = new FileReader();

        reader.onload = function(event) {
            state.currentArticleFile = '';
            if (articleSelect) {
                articleSelect.value = '';
            }
            sampleText.value = '';
            setArticleStatusByKey('using_uploaded', false);
            applySourceText(event.target.result, t('hint_uploaded'));
        };

        reader.onerror = function() {
            alert(t('alert_file_read_error'));
        };

        reader.readAsText(file);
    }

    function handleBeforeInput(event) {
        if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') {
            event.preventDefault();
            state.pasteAttemptCount++;
            warnPasteBlocked();
            return;
        }

        if (textInput.disabled || !event.inputType.startsWith('insert')) {
            return;
        }

        let insertedText = '';
        if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph') {
            insertedText = '\n';
        } else if (typeof event.data === 'string') {
            insertedText = event.data;
        }

        if (!insertedText) {
            return;
        }

        startTimerIfNeeded();

        const now = Date.now();
        const selectionStart = textInput.selectionStart == null ? state.totalChars : textInput.selectionStart;

        for (let i = 0; i < insertedText.length; i++) {
            const textIndex = selectionStart + i;
            const typedChar = insertedText[i];
            const expectedChar = state.activeText[textIndex];

            state.keystrokeTimestamps.push(now);
            state.processTotalChars++;

            if (typedChar === expectedChar) {
                state.processCorrectChars++;
            } else {
                state.processIncorrectChars++;
                incrementMap(state.sessionWrongChars, expectedChar || typedChar || '[extra]', 1);
            }
        }
    }

    function handleInput() {
        let typedValue = textInput.value;
        keepInputVerticalOnly();

        if (!state.startTime && typedValue.length > 0) {
            startTimerIfNeeded();
        }

        if (typedValue.length > state.activeText.length) {
            typedValue = typedValue.slice(0, state.activeText.length);
            textInput.value = typedValue;
        }

        updateResultCounters(typedValue);
        state.typedValueCache = typedValue;
        state.totalChars = typedValue.length;
        state.currentIndex = Math.min(textInput.selectionStart ?? state.totalChars, state.activeText.length);

        renderText();
        updateStats();

        if (state.totalChars >= state.activeText.length && state.activeText.length > 0) {
            finishTest('completed');
        }
    }

    function updateCursorPosition() {
        if (textInput.disabled) {
            return;
        }
        keepInputVerticalOnly();
        state.currentIndex = Math.min(textInput.selectionStart ?? state.totalChars, state.activeText.length);
        renderText();
    }

    function init() {
        if (languageSelect) {
            languageSelect.value = currentLocale;
        }

        applyLocaleToUI();

        if (state.sampleTexts.length > 0) {
            sampleText.value = state.sampleTexts[0].text;
            state.sourceText = state.sampleTexts[0].text;
        }

        opacityValue.textContent = `${opacitySlider.value}%`;
        timedSecondsInput.value = String(getTimedSeconds());
        segmentLengthInput.value = String(getSegmentLength());
        state.lastAdaptiveUpdate = t('adaptive_not_applied');
        adaptiveUpdateDisplay.textContent = state.lastAdaptiveUpdate;

        prepareActiveTextForMode();
        updateModeControlState();
        updateStartButtonState();
        renderText();
        updateStats();
        state.textBaseCandidates = buildTextBaseCandidates();
        renderArticleOptions();
        setArticleStatusByKey('waiting_folder', false);
        loadArticleCatalogFromFolder();
    }

    startBtn.addEventListener('click', startTyping);
    resetBtn.addEventListener('click', resetTest);

    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            const nextLocale = this.value === 'zh' ? 'zh' : 'en';
            if (nextLocale === currentLocale) {
                return;
            }
            currentLocale = nextLocale;
            try {
                localStorage.setItem('typing_locale', currentLocale);
            } catch (error) {
                console.warn('Locale preference not saved:', error);
            }

            applyLocaleToUI();
            if (
                state.lastAdaptiveUpdate === messages.en.adaptive_not_applied ||
                state.lastAdaptiveUpdate === messages.zh.adaptive_not_applied
            ) {
                state.lastAdaptiveUpdate = t('adaptive_not_applied');
                adaptiveUpdateDisplay.textContent = state.lastAdaptiveUpdate;
            }
            renderText();
        });
    }

    modeInfoItems.forEach(function(item) {
        item.addEventListener('mouseenter', function() {
            showModeTooltip(item);
        });
        item.addEventListener('mouseleave', hideModeTooltip);
        item.addEventListener('focus', function() {
            showModeTooltip(item);
        });
        item.addEventListener('blur', hideModeTooltip);
    });

    window.addEventListener('resize', refreshModeTooltip);
    window.addEventListener('scroll', function() {
        if (!modeTooltip || modeTooltip.hidden) {
            return;
        }
        refreshModeTooltip();
    }, true);

    textInput.addEventListener('beforeinput', handleBeforeInput);
    textInput.addEventListener('input', handleInput);
    textInput.addEventListener('paste', function(event) {
        event.preventDefault();
        state.pasteAttemptCount++;
        warnPasteBlocked();
    });
    textInput.addEventListener('drop', function(event) {
        event.preventDefault();
        state.pasteAttemptCount++;
        warnPasteBlocked();
    });
    textInput.addEventListener('click', updateCursorPosition);
    textInput.addEventListener('keyup', updateCursorPosition);
    textInput.addEventListener('select', updateCursorPosition);
    textInput.addEventListener('scroll', keepInputVerticalOnly);
    textDisplay.addEventListener('scroll', function() {
        if (textDisplay.scrollLeft !== 0) {
            textDisplay.scrollLeft = 0;
        }
    });

    opacitySlider.addEventListener('input', function() {
        opacityValue.textContent = `${this.value}%`;
        renderText();
    });

    accuracyMode.addEventListener('change', function() {
        updateStats();
    });

    trainingMode.addEventListener('change', function() {
        updateModeControlState();
        updateStartButtonState();
        prepareActiveTextForMode();
        renderText();
    });

    timedSecondsInput.addEventListener('change', function() {
        this.value = String(getTimedSeconds());
        if (!textInput.disabled && getMode() === 'timed') {
            state.timedRemaining = Math.max(0, getTimedSeconds() - state.timeElapsed);
            updateStats();
        }
        updateModeHint('');
        refreshModeTooltip();
    });

    segmentLengthInput.addEventListener('change', function() {
        this.value = String(getSegmentLength());
        updateModeHint('');
        if (textInput.disabled) {
            prepareActiveTextForMode();
            renderText();
        }
        refreshModeTooltip();
    });

    adaptiveToggle.addEventListener('change', function() {
        if (!this.checked) {
            state.lastAdaptiveUpdate = t('adaptive_disabled');
            adaptiveUpdateDisplay.textContent = state.lastAdaptiveUpdate;
        }
    });

    uploadArea.addEventListener('click', function() {
        if (!textInput.disabled) {
            return;
        }
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', function(event) {
        event.preventDefault();
        uploadArea.style.borderColor = '#a47864';
        uploadArea.style.backgroundColor = '#f3e7e1';
    });

    uploadArea.addEventListener('dragleave', function() {
        uploadArea.style.borderColor = '#ccc';
        uploadArea.style.backgroundColor = '';
    });

    uploadArea.addEventListener('drop', function(event) {
        event.preventDefault();
        if (!textInput.disabled) {
            return;
        }
        uploadArea.style.borderColor = '#ccc';
        uploadArea.style.backgroundColor = '';
        if (event.dataTransfer.files.length) {
            const file = event.dataTransfer.files[0];
            if (isTextFile(file)) {
                loadTextFromFile(file);
            } else {
                alert(t('alert_upload_txt_only'));
            }
        }
    });

    fileInput.addEventListener('change', function() {
        if (!textInput.disabled) {
            return;
        }
        if (this.files.length) {
            const file = this.files[0];
            if (isTextFile(file)) {
                loadTextFromFile(file);
            } else {
                alert(t('alert_upload_txt_only'));
            }
        }
    });

    if (articleSelect) {
        articleSelect.addEventListener('change', function() {
            if (!textInput.disabled || !this.value) {
                return;
            }
            const selectedArticle = state.articleCatalog.find((article) => article.file === this.value);
            if (selectedArticle) {
                loadFolderArticle(selectedArticle, false);
            }
        });
    }

    sampleText.addEventListener('change', function() {
        if (this.value) {
            state.currentArticleFile = '';
            if (articleSelect) {
                articleSelect.value = '';
            }
            setArticleStatusByKey('using_sample', false);
            applySourceText(this.value, t('hint_sample'));
        }
    });

    init();
});
