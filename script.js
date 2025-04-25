/*
  script.js — 暗号化 questions.enc を復号して読み込む完全版
  2025-04-25 更新
  ✅ スクロール位置リセット
  ✅ 要素が null でも落ちない安全化
  ✅ 未登録インデックスは集計時に notyet 扱い（合計値ズレ修正）
*/

document.addEventListener('DOMContentLoaded', () => {
    /* ===== XOR + Base64 復号 ===== */
    const KEY = 'mysecretkey';                         // Colab 側と同じキー

    const xorDecrypt = (buf, key) => {
        const out = new Uint8Array(buf.length);
        for (let i = 0; i < buf.length; i++) {
            out[i] = buf[i] ^ key.charCodeAt(i % key.length);
        }
        return out;
    };

    const loadEncryptedCSV = () =>
        fetch('questions.enc')
            .then(r => r.text())
            .then(b64 => {
                const bin   = atob(b64.trim());
                const bytes = Uint8Array.from([...bin].map(c => c.charCodeAt(0)));
                return new TextDecoder().decode(xorDecrypt(bytes, KEY));
            });

    /* ===== DOM ===== */
    const $ = id => document.getElementById(id);

    const questionText   = $('question-text');
    const answerText     = $('answer-text');
    const showAnswerBtn  = $('show-answer-btn');
    const prevBtn        = $('prev-btn');
    const nextBtn        = $('next-btn');
    const randomBtn      = $('random-btn');
    const questionNumber = $('question-number');
    const totalQuestions = $('total-questions');

    const statusBtns = {
        notyet:    $('status-notyet'),
        excellent: $('status-excellent'),
        good:      $('status-good'),
        fair:      $('status-fair'),
        poor:      $('status-poor')
    };

    const filterCheckboxes = {
        notyet:    $('filter-notyet'),
        excellent: $('filter-excellent'),
        good:      $('filter-good'),
        fair:      $('filter-fair'),
        poor:      $('filter-poor')
    };

    const countElements = {
        notyet:    $('count-notyet'),
        excellent: $('count-excellent'),
        good:      $('count-good'),
        fair:      $('count-fair'),
        poor:      $('count-poor')
    };

    const statsElements = {
        notyet:    $('stats-notyet'),
        excellent: $('stats-excellent'),
        good:      $('stats-good'),
        fair:      $('stats-fair'),
        poor:      $('stats-poor'),
        total:     $('stats-total')
    };

    /* ===== 状態 ===== */
    let questions       = [];
    let currentIndex    = 0;
    let filteredIndices = [];
    let userProgress    = {};

    /* ===== データ読み込み ===== */
    loadEncryptedCSV()
        .then(csv => {
            if (!csv.trim()) throw new Error('CSV が空です');
            parseCSV(csv);
            if (!questions.length) throw new Error('CSV フォーマットに問題があります');

            totalQuestions && (totalQuestions.textContent = questions.length);
            loadProgress();
            updateFiltered();
            renderQuestion();
            updateStats();
        })
        .catch(err => {
            console.error(err);
            questionText && (questionText.textContent = `CSV 読み込み失敗: ${err.message}`);
        });

    /* ===== CSV パース ===== */
    function parseCSV(csv) {
        questions = [];
        csv.split('\n').forEach(line => {
            line = line.trim();
            if (!line) return;
            const comma = line.indexOf(',');
            if (comma === -1) return;
            const q = line.slice(0, comma).replace(/\\n/g, '\n').trim();
            const a = line.slice(comma + 1).replace(/\\n/g, '\n').trim();
            if (q && a) questions.push({ question: q, answer: a });
        });
    }

    /* ===== 進捗 ===== */
    function loadProgress() {
        try {
            userProgress = JSON.parse(localStorage.getItem('questionBankProgress') || '{}');
        } catch { userProgress = {}; }

        // CSV が増減しても整合が取れるように補完
        for (let i = 0; i < questions.length; i++) {
            if (!(i in userProgress)) userProgress[i] = 'notyet';
        }
        // 逆に余分なキーは削除
        Object.keys(userProgress).forEach(k => {
            if (k >= questions.length) delete userProgress[k];
        });

        saveProgress();
    }
    const saveProgress = () =>
        localStorage.setItem('questionBankProgress', JSON.stringify(userProgress));

    /* ===== フィルタ & 集計 ===== */
    function updateCounts() {
        const c = { notyet:0, excellent:0, good:0, fair:0, poor:0 };
        questions.forEach((_, i) => {
            const st = userProgress[i] ?? 'notyet';     // ← フォールバック
            c[st]++;
        });
        Object.entries(c).forEach(([k,v]) => countElements[k] && (countElements[k].textContent = `(${v})`));
    }

    function updateStats() {
        const c = { notyet:0, excellent:0, good:0, fair:0, poor:0 };
        questions.forEach((_, i) => {
            const st = userProgress[i] ?? 'notyet';
            c[st]++;
        });
        Object.entries(c).forEach(([k,v]) => statsElements[k] && (statsElements[k].textContent = v));
        statsElements.total && (statsElements.total.textContent = questions.length);
    }

    function updateFiltered() {
        const active = Object.keys(filterCheckboxes).filter(k => filterCheckboxes[k]?.checked);
        filteredIndices = questions
            .map((_, i) => i)
            .filter(i => active.includes(userProgress[i] ?? 'notyet'));
        updateCounts();
    }

    /* ===== 表示 ===== */
    function renderQuestion() {
        if (!filteredIndices.length) {
            questionText && (questionText.textContent = '表示できる問題がありません。フィルターを確認してください。');
            answerText   && (answerText.textContent = '');
            answerText?.classList.add('hidden');
            questionNumber && (questionNumber.value = '');
            setStatusButtons(null);
            return;
        }
        const idx = filteredIndices[currentIndex];
        const q   = questions[idx];

        questionText && (questionText.textContent = q.question);
        answerText   && (answerText.textContent   = q.answer);
        answerText?.classList.add('hidden');

        questionNumber && (questionNumber.value = idx + 1);
        showAnswerBtn && (showAnswerBtn.textContent = '解答を表示');
        setStatusButtons(userProgress[idx]);

        // ★ スクロール位置リセット
        questionText?.scrollTo(0,0);
        answerText?.scrollTo(0,0);
    }

    const setStatusButtons = status => {
        Object.values(statusBtns).forEach(btn => btn?.classList.remove('active'));
        status && statusBtns[status]?.classList.add('active');
    };

    /* ===== イベント ===== */
    showAnswerBtn?.addEventListener('click', () => {
        answerText?.classList.toggle('hidden');
        showAnswerBtn.textContent =
            answerText?.classList.contains('hidden') ? '解答を表示' : '解答を隠す';
        answerText?.scrollTo(0,0);
    });

    prevBtn?.addEventListener('click', () => {
        if (!filteredIndices.length) return;
        currentIndex = (currentIndex - 1 + filteredIndices.length) % filteredIndices.length;
        renderQuestion();
    });

    nextBtn?.addEventListener('click', () => {
        if (!filteredIndices.length) return;
        currentIndex = (currentIndex + 1) % filteredIndices.length;
        renderQuestion();
    });

    randomBtn?.addEventListener('click', () => {
        if (!filteredIndices.length) return;
        currentIndex = Math.floor(Math.random() * filteredIndices.length);
        renderQuestion();
    });

    questionNumber?.addEventListener('change', () => {
        const n = Number(questionNumber.value);
        if (!n || n < 1 || n > questions.length) {
            alert(`1〜${questions.length} の整数を入力してください`);
            return;
        }
        const global = n - 1;
        const idx = filteredIndices.indexOf(global);
        if (idx === -1) {
            alert('その問題は現在のフィルターでは非表示です');
            return;
        }
        currentIndex = idx;
        renderQuestion();
    });

    Object.entries(statusBtns).forEach(([s, btn]) =>
        btn?.addEventListener('click', () => {
            if (!filteredIndices.length) return;
            const gidx = filteredIndices[currentIndex];
            userProgress[gidx] = s;
            saveProgress();
            setStatusButtons(s);
            updateCounts();
            updateStats();
        })
    );

    Object.values(filterCheckboxes).forEach(cb =>
        cb?.addEventListener('change', () => {
            const prev = filteredIndices[currentIndex];
            updateFiltered();
            if (!filteredIndices.length) { renderQuestion(); return; }
            const newIdx = filteredIndices.indexOf(prev);
            currentIndex = newIdx !== -1 ? newIdx : 0;
            renderQuestion();
        })
    );
});
