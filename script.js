document.addEventListener('DOMContentLoaded', function() {
    // DOM要素
    const questionText = document.getElementById('question-text');
    const answerText = document.getElementById('answer-text');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const questionNumber = document.getElementById('question-number');
    const totalQuestions = document.getElementById('total-questions');
    const randomBtn = document.getElementById('random-btn');
    
    // 理解度ボタン
    const statusBtns = {
        notyet: document.getElementById('status-notyet'),
        excellent: document.getElementById('status-excellent'),
        good: document.getElementById('status-good'),
        fair: document.getElementById('status-fair'),
        poor: document.getElementById('status-poor')
    };
    
    // フィルターチェックボックス
    const filterCheckboxes = {
        notyet: document.getElementById('filter-notyet'),
        excellent: document.getElementById('filter-excellent'),
        good: document.getElementById('filter-good'),
        fair: document.getElementById('filter-fair'),
        poor: document.getElementById('filter-poor')
    };
    
    // カウント表示要素
    const countElements = {
        notyet: document.getElementById('count-notyet'),
        excellent: document.getElementById('count-excellent'),
        good: document.getElementById('count-good'),
        fair: document.getElementById('count-fair'),
        poor: document.getElementById('count-poor')
    };
    
    // 統計表示要素
    const statsElements = {
        notyet: document.getElementById('stats-notyet'),
        excellent: document.getElementById('stats-excellent'),
        good: document.getElementById('stats-good'),
        fair: document.getElementById('stats-fair'),
        poor: document.getElementById('stats-poor'),
        total: document.getElementById('stats-total')
    };
    
    // グローバル変数
    let questions = [];
    let currentIndex = 0;
    let filteredIndices = [];
    let userProgress = {};
    
    // CSVファイルを読み込む
    fetch('questions.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            console.log("CSV読み込み成功");
            if (!data || data.trim() === "") {
                throw new Error("CSVファイルが空です");
            }
            
            // CSVパース（シンプル版）
            processSimpleCSV(data);
            
            if (questions.length === 0) {
                throw new Error("有効な問題が見つかりませんでした。CSVフォーマットを確認してください。");
            }
            
            totalQuestions.textContent = questions.length;
            loadUserProgress();
            updateFilteredIndices();
            displayQuestion();
            updateStats();
        })
        .catch(error => {
            console.error('CSVファイルの読み込みに失敗しました:', error);
            questionText.textContent = `CSVファイルのロードに問題がありました: ${error.message}`;
        });
    
    // シンプルなCSV処理（改行対応）
    function processSimpleCSV(csvData) {
        const lines = csvData.split('\n');
        questions = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === "") continue;
            
            // 最初のカンマで分割
            const firstCommaIndex = line.indexOf(',');
            if (firstCommaIndex === -1) continue;
            
            let question = line.substring(0, firstCommaIndex).trim();
            let answer = line.substring(firstCommaIndex + 1).trim();
            
            // エスケープシーケンスを実際の改行に変換
            question = question.replace(/\\n/g, '\n');
            answer = answer.replace(/\\n/g, '\n');
            
            if (question && answer) {
                questions.push({ question, answer });
            }
        }
        
        console.log(`合計 ${questions.length} 問の問題を読み込みました`);
    }
    
    // ユーザーの進捗を読み込む
    function loadUserProgress() {
        try {
            const savedProgress = localStorage.getItem('questionBankProgress');
            if (savedProgress) {
                userProgress = JSON.parse(savedProgress);
            } else {
                // 初期状態では全問題を「未演習」にする
                questions.forEach((_, index) => {
                    userProgress[index] = 'notyet';
                });
                saveUserProgress();
            }
        } catch (e) {
            console.error("進捗データの読み込みに失敗:", e);
            userProgress = {};
            questions.forEach((_, index) => {
                userProgress[index] = 'notyet';
            });
        }
    }
    
    // ユーザーの進捗を保存する
    function saveUserProgress() {
        try {
            localStorage.setItem('questionBankProgress', JSON.stringify(userProgress));
        } catch (e) {
            console.error("進捗データの保存に失敗:", e);
        }
    }
    
    // フィルター条件に合う問題のインデックスを更新
    function updateFilteredIndices() {
        filteredIndices = [];
        const activeFilters = Object.keys(filterCheckboxes).filter(key => filterCheckboxes[key].checked);
        
        for (let i = 0; i < questions.length; i++) {
            const status = userProgress[i] || 'notyet';
            if (activeFilters.includes(status)) {
                filteredIndices.push(i);
            }
        }
        
        // カウント更新
        updateCounts();
    }
    
    // 各ステータスのカウントを更新
    function updateCounts() {
        const counts = {
            notyet: 0,
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0
        };
        
        for (let i = 0; i < questions.length; i++) {
            const status = userProgress[i] || 'notyet';
            counts[status]++;
        }
        
        // カウント表示を更新
        for (const status in counts) {
            countElements[status].textContent = `(${counts[status]})`;
        }
    }
    
    // 統計情報を更新
    function updateStats() {
        const counts = {
            notyet: 0,
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0
        };
        
        for (let i = 0; i < questions.length; i++) {
            const status = userProgress[i] || 'notyet';
            counts[status]++;
        }
        
        // 統計表示を更新
        for (const status in counts) {
            statsElements[status].textContent = counts[status];
        }
        statsElements.total.textContent = questions.length;
    }
    
    // 現在の問題を表示
    function displayQuestion() {
        if (questions.length === 0 || filteredIndices.length === 0) {
            questionText.textContent = '表示できる問題がありません。フィルター設定を確認してください。';
            answerText.textContent = '';
            answerText.classList.add('hidden');
            questionNumber.value = '';
            updateStatusButtons(null);
            return;
        }
        
        const globalIndex = filteredIndices[currentIndex];
        const question = questions[globalIndex];
        
        questionText.textContent = question.question;
        answerText.textContent = question.answer;
        answerText.classList.add('hidden');
        questionNumber.value = globalIndex + 1;
        showAnswerBtn.textContent = '解答を表示';
        
        // 理解度ボタンの状態を更新
        updateStatusButtons(userProgress[globalIndex] || 'notyet');
    }
    
    // 理解度ボタンの状態を更新
    function updateStatusButtons(status) {
        for (const key in statusBtns) {
            statusBtns[key].classList.remove('active');
        }
        
        if (status) {
            statusBtns[status].classList.add('active');
        }
    }
    
    // イベントリスナー
    
    // 解答表示ボタン
    showAnswerBtn.addEventListener('click', function() {
        answerText.classList.toggle('hidden');
        showAnswerBtn.textContent = answerText.classList.contains('hidden') ? '解答を表示' : '解答を隠す';
    });
    
    // 前へボタン
    prevBtn.addEventListener('click', function() {
        if (filteredIndices.length === 0) return;
        
        currentIndex = (currentIndex - 1 + filteredIndices.length) % filteredIndices.length;
        displayQuestion();
    });
    
    // 次へボタン
    nextBtn.addEventListener('click', function() {
        if (filteredIndices.length === 0) return;
        
        currentIndex = (currentIndex + 1) % filteredIndices.length;
        displayQuestion();
    });
    
    // 問題番号入力
    questionNumber.addEventListener('change', function() {
        const num = parseInt(questionNumber.value);
        if (isNaN(num) || num < 1 || num > questions.length) {
            alert(`問題番号は1から${questions.length}の間で入力してください。`);
            return;
        }
        
        const globalIndex = num - 1;
        const filteredIndex = filteredIndices.indexOf(globalIndex);
        
        if (filteredIndex === -1) {
            alert('選択した問題は現在のフィルター設定では表示できません。');
            return;
        }
        
        currentIndex = filteredIndex;
        displayQuestion();
    });
    
    // ランダムボタン
    randomBtn.addEventListener('click', function() {
        if (filteredIndices.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * filteredIndices.length);
        currentIndex = randomIndex;
        displayQuestion();
    });
    
    // 理解度ボタン
    for (const status in statusBtns) {
        statusBtns[status].addEventListener('click', function() {
            if (questions.length === 0 || filteredIndices.length === 0) return;
            
            const globalIndex = filteredIndices[currentIndex];
            userProgress[globalIndex] = status;
            saveUserProgress();
            updateStatusButtons(status);
            updateCounts();
            updateStats();
        });
    }
    
    // フィルターチェックボックス
    for (const key in filterCheckboxes) {
        filterCheckboxes[key].addEventListener('change', function() {
            const previousGlobalIndex = filteredIndices[currentIndex];
            
            updateFilteredIndices();
            
            if (filteredIndices.length === 0) {
                displayQuestion();
                return;
            }
            
            const newFilteredIndex = filteredIndices.indexOf(previousGlobalIndex);
            if (newFilteredIndex !== -1) {
                currentIndex = newFilteredIndex;
            } else {
                currentIndex = 0;
            }
            
            displayQuestion();
        });
    }
});