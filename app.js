// Flash Card App - Language Learning Tool
(function() {
    'use strict';

    // ==================== State ====================
    const STORAGE_KEYS = {
        CARDS: 'flashcards_cards',
        STATS: 'flashcards_stats',
        ACTIVITY: 'flashcards_activity'
    };

    let cards = [];
    let currentIndex = 0;
    let stats = {
        correct: 0,
        wrong: 0,
        streak: 0,
        bestStreak: 0,
        sessions: 0,
        lastSessionDate: null
    };
    let activity = [];

    // ==================== DOM Elements ====================
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    // Cards view
    const emptyState = document.getElementById('empty-state');
    const cardContainer = document.getElementById('card-container');
    const flashcard = document.getElementById('flashcard');
    const cardFrontWord = document.getElementById('card-front-word');
    const cardBackWord = document.getElementById('card-back-word');
    const cardExample = document.getElementById('card-example');
    const currentCardNum = document.getElementById('current-card-num');
    const totalCards = document.getElementById('total-cards');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnCorrect = document.getElementById('btn-correct');
    const btnWrong = document.getElementById('btn-wrong');

    // Add view
    const addForm = document.getElementById('add-form');
    const inputWord = document.getElementById('input-word');
    const inputTranslation = document.getElementById('input-translation');
    const inputExample = document.getElementById('input-example');
    const wordCount = document.getElementById('word-count');
    const wordList = document.getElementById('word-list');
    const searchWords = document.getElementById('search-words');

    // Import view
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const importResult = document.getElementById('import-result');

    // Stats view
    const statTotal = document.getElementById('stat-total');
    const statMastered = document.getElementById('stat-mastered');
    const statLearning = document.getElementById('stat-learning');
    const statAccuracy = document.getElementById('stat-accuracy');
    const statStreak = document.getElementById('stat-streak');
    const statSessions = document.getElementById('stat-sessions');
    const activityLog = document.getElementById('activity-log');
    const btnResetStats = document.getElementById('btn-reset-stats');
    const btnClearAll = document.getElementById('btn-clear-all');

    // Toast
    const toast = document.getElementById('toast');

    // ==================== Initialization ====================
    function init() {
        loadData();
        setupEventListeners();
        updateCardsView();
        updateWordList();
        updateStats();
        trackSession();
    }

    // ==================== Data Persistence ====================
    function loadData() {
        try {
            const savedCards = localStorage.getItem(STORAGE_KEYS.CARDS);
            const savedStats = localStorage.getItem(STORAGE_KEYS.STATS);
            const savedActivity = localStorage.getItem(STORAGE_KEYS.ACTIVITY);

            if (savedCards) cards = JSON.parse(savedCards);
            if (savedStats) stats = { ...stats, ...JSON.parse(savedStats) };
            if (savedActivity) activity = JSON.parse(savedActivity);
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }

    function saveCards() {
        localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    }

    function saveStats() {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    }

    function saveActivity() {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activity));
    }

    // ==================== Navigation ====================
    function setupEventListeners() {
        // Navigation
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });

        // Card interactions
        flashcard.addEventListener('click', flipCard);
        btnPrev.addEventListener('click', prevCard);
        btnNext.addEventListener('click', nextCard);
        btnShuffle.addEventListener('click', shuffleCards);
        btnCorrect.addEventListener('click', markCorrect);
        btnWrong.addEventListener('click', markWrong);

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboard);

        // Add form
        addForm.addEventListener('submit', handleAddWord);

        // Search
        searchWords.addEventListener('input', handleSearch);

        // Import
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        fileInput.addEventListener('change', handleFileSelect);

        // Stats actions
        btnResetStats.addEventListener('click', resetStats);
        btnClearAll.addEventListener('click', clearAllData);

        // Swipe support for cards
        setupSwipeSupport();
    }

    function switchView(viewName) {
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        views.forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewName}`);
        });

        if (viewName === 'stats') updateStats();
        if (viewName === 'cards') updateCardsView();
        if (viewName === 'add') updateWordList();
    }

    // ==================== Flash Cards ====================
    function updateCardsView() {
        if (cards.length === 0) {
            emptyState.style.display = 'flex';
            cardContainer.classList.add('hidden');
        } else {
            emptyState.style.display = 'none';
            cardContainer.classList.remove('hidden');
            showCard(currentIndex);
        }
        totalCards.textContent = cards.length;
    }

    function showCard(index) {
        if (cards.length === 0) return;
        if (index < 0) index = cards.length - 1;
        if (index >= cards.length) index = 0;

        currentIndex = index;
        const card = cards[currentIndex];

        cardFrontWord.textContent = card.word;
        cardBackWord.textContent = card.translation;
        cardExample.textContent = card.example || '';

        // Reset flip state
        flashcard.classList.remove('flipped');

        currentCardNum.textContent = currentIndex + 1;
        totalCards.textContent = cards.length;
    }

    function flipCard() {
        flashcard.classList.toggle('flipped');
    }

    function prevCard() {
        showCard(currentIndex - 1);
    }

    function nextCard() {
        showCard(currentIndex + 1);
    }

    function shuffleCards() {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        saveCards();
        currentIndex = 0;
        showCard(0);
        showToast('Cards shuffled!');
    }

    function markCorrect() {
        if (cards.length === 0) return;

        const card = cards[currentIndex];
        card.correctCount = (card.correctCount || 0) + 1;
        card.lastReviewed = Date.now();

        stats.correct++;
        stats.streak++;
        if (stats.streak > stats.bestStreak) {
            stats.bestStreak = stats.streak;
        }

        saveCards();
        saveStats();
        logActivity(`Correct: "${card.word}"`);
        nextCard();
    }

    function markWrong() {
        if (cards.length === 0) return;

        const card = cards[currentIndex];
        card.wrongCount = (card.wrongCount || 0) + 1;
        card.lastReviewed = Date.now();

        stats.wrong++;
        stats.streak = 0;

        saveCards();
        saveStats();
        logActivity(`Missed: "${card.word}"`);
        nextCard();
    }

    // ==================== Keyboard & Swipe ====================
    function handleKeyboard(e) {
        const activeView = document.querySelector('.view.active');
        if (activeView.id !== 'view-cards') return;
        if (cards.length === 0) return;

        switch(e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                flipCard();
                break;
            case 'ArrowLeft':
                prevCard();
                break;
            case 'ArrowRight':
                nextCard();
                break;
            case 'ArrowUp':
                markCorrect();
                break;
            case 'ArrowDown':
                markWrong();
                break;
        }
    }

    function setupSwipeSupport() {
        let touchStartX = 0;
        let touchEndX = 0;

        flashcard.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        flashcard.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    nextCard();
                } else {
                    prevCard();
                }
            }
        }, { passive: true });
    }

    // ==================== Add Words ====================
    function handleAddWord(e) {
        e.preventDefault();

        const word = inputWord.value.trim();
        const translation = inputTranslation.value.trim();
        const example = inputExample.value.trim();

        if (!word || !translation) return;

        const newCard = {
            id: generateId(),
            word,
            translation,
            example,
            correctCount: 0,
            wrongCount: 0,
            createdAt: Date.now(),
            lastReviewed: null
        };

        cards.push(newCard);
        saveCards();

        // Reset form
        addForm.reset();
        inputWord.focus();

        updateCardsView();
        updateWordList();
        showToast(`Added "${word}"`);
    }

    function updateWordList(filter = '') {
        const filtered = filter
            ? cards.filter(c =>
                c.word.toLowerCase().includes(filter.toLowerCase()) ||
                c.translation.toLowerCase().includes(filter.toLowerCase())
            )
            : cards;

        wordCount.textContent = cards.length;

        if (filtered.length === 0) {
            wordList.innerHTML = '<p class="empty-hint">No words found.</p>';
            return;
        }

        wordList.innerHTML = filtered.map(card => `
            <div class="word-item" data-id="${card.id}">
                <div class="word-item-content">
                    <div class="word-item-word">${escapeHtml(card.word)}</div>
                    <div class="word-item-translation">${escapeHtml(card.translation)}</div>
                </div>
                <button class="word-item-delete" onclick="app.deleteCard('${card.id}')" aria-label="Delete word">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    function deleteCard(id) {
        const card = cards.find(c => c.id === id);
        if (!card) return;

        if (!confirm(`Delete "${card.word}"?`)) return;

        cards = cards.filter(c => c.id !== id);
        saveCards();

        if (currentIndex >= cards.length) {
            currentIndex = Math.max(0, cards.length - 1);
        }

        updateCardsView();
        updateWordList(searchWords.value);
        showToast(`Deleted "${card.word}"`);
    }

    function handleSearch(e) {
        updateWordList(e.target.value);
    }

    // ==================== File Import ====================
    function handleDragOver(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) processFile(file);
        fileInput.value = '';
    }

    function processFile(file) {
        const validTypes = ['text/csv', 'text/plain', 'text/tab-separated-values', ''];
        const validExtensions = ['.csv', '.txt', '.tsv'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(ext)) {
            showImportResult('error', 'Unsupported file format. Please use CSV or TXT files.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const imported = parseFileContent(content);

            if (imported.length === 0) {
                showImportResult('error', 'No valid entries found. Check the file format.');
                return;
            }

            cards = cards.concat(imported);
            saveCards();
            updateCardsView();
            updateWordList();
            showImportResult('success', `Successfully imported ${imported.length} word${imported.length > 1 ? 's' : ''}!`);
            logActivity(`Imported ${imported.length} words from file`);
        };

        reader.onerror = () => {
            showImportResult('error', 'Error reading file. Please try again.');
        };

        reader.readAsText(file);
    }

    function parseFileContent(content) {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        const results = [];

        // Skip header row if it looks like one
        let startIndex = 0;
        const firstLine = lines[0] ? lines[0].toLowerCase() : '';
        if (firstLine.includes('word') && (firstLine.includes('translation') || firstLine.includes('meaning'))) {
            startIndex = 1;
        }

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            let parts;

            // Try different delimiters
            if (line.includes('\t')) {
                parts = line.split('\t');
            } else if (line.includes(';')) {
                parts = line.split(';');
            } else if (line.includes(',')) {
                // Handle CSV with possible quoted fields
                parts = parseCSVLine(line);
            } else {
                continue;
            }

            if (parts.length >= 2) {
                const word = parts[0].trim().replace(/^["']|["']$/g, '');
                const translation = parts[1].trim().replace(/^["']|["']$/g, '');
                const example = parts[2] ? parts[2].trim().replace(/^["']|["']$/g, '') : '';

                if (word && translation) {
                    results.push({
                        id: generateId(),
                        word,
                        translation,
                        example,
                        correctCount: 0,
                        wrongCount: 0,
                        createdAt: Date.now(),
                        lastReviewed: null
                    });
                }
            }
        }

        return results;
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    function showImportResult(type, message) {
        importResult.textContent = message;
        importResult.className = `import-result ${type}`;
        importResult.classList.remove('hidden');

        setTimeout(() => {
            importResult.classList.add('hidden');
        }, 5000);
    }

    // ==================== Statistics ====================
    function updateStats() {
        const total = cards.length;
        const mastered = cards.filter(c => (c.correctCount || 0) >= 3).length;
        const learning = total - mastered;
        const totalAttempts = stats.correct + stats.wrong;
        const accuracy = totalAttempts > 0 ? Math.round((stats.correct / totalAttempts) * 100) : 0;

        statTotal.textContent = total;
        statMastered.textContent = mastered;
        statLearning.textContent = learning;
        statAccuracy.textContent = accuracy + '%';
        statStreak.textContent = stats.streak;
        statSessions.textContent = stats.sessions;

        // Activity log
        if (activity.length === 0) {
            activityLog.innerHTML = '<p class="empty-hint">Start studying to see your activity here.</p>';
        } else {
            const recentActivity = activity.slice(-20).reverse();
            activityLog.innerHTML = recentActivity.map(item => `
                <div class="activity-item">
                    <span class="activity-text">${escapeHtml(item.text)}</span>
                    <span class="activity-date">${formatDate(item.date)}</span>
                </div>
            `).join('');
        }
    }

    function trackSession() {
        const today = new Date().toDateString();
        if (stats.lastSessionDate !== today) {
            stats.sessions++;
            stats.lastSessionDate = today;
            saveStats();
        }
    }

    function logActivity(text) {
        activity.push({
            text,
            date: Date.now()
        });

        // Keep only last 100 entries
        if (activity.length > 100) {
            activity = activity.slice(-100);
        }

        saveActivity();
    }

    function resetStats() {
        if (!confirm('Reset all statistics? This cannot be undone.')) return;

        stats = {
            correct: 0,
            wrong: 0,
            streak: 0,
            bestStreak: 0,
            sessions: 0,
            lastSessionDate: null
        };
        activity = [];

        // Reset card-level stats
        cards.forEach(card => {
            card.correctCount = 0;
            card.wrongCount = 0;
            card.lastReviewed = null;
        });

        saveStats();
        saveActivity();
        saveCards();
        updateStats();
        showToast('Statistics reset');
    }

    function clearAllData() {
        if (!confirm('Delete ALL data including cards? This cannot be undone.')) return;

        cards = [];
        stats = {
            correct: 0,
            wrong: 0,
            streak: 0,
            bestStreak: 0,
            sessions: 0,
            lastSessionDate: null
        };
        activity = [];
        currentIndex = 0;

        localStorage.removeItem(STORAGE_KEYS.CARDS);
        localStorage.removeItem(STORAGE_KEYS.STATS);
        localStorage.removeItem(STORAGE_KEYS.ACTIVITY);

        updateCardsView();
        updateWordList();
        updateStats();
        showToast('All data cleared');
    }

    // ==================== Utilities ====================
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

        return date.toLocaleDateString();
    }

    let toastTimeout;
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2500);
    }

    // ==================== Public API (for inline handlers) ====================
    window.app = {
        deleteCard
    };

    // ==================== Start ====================
    init();
})();
