// --- Debug Logging Flag and Utility ---
const DEBUG = false; // Set to true for development, false for production
function debugLog(...args) {
    if (DEBUG) console.log(...args);
}
// --- Utility: Toggle Selected Class on Grid Cell ---
function toggleCellSelected(cellElement, isSelected) {
    if (!cellElement) return;
    if (isSelected) {
        cellElement.classList.add('selected');
    } else {
        cellElement.classList.remove('selected');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // --- Utility functions for Set <-> localStorage (word lists) ---
    function setToLocalStorage(key, set) {
        localStorage.setItem(key, JSON.stringify(Array.from(set)));
    }
    function getSetFromLocalStorage(key) {
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            } catch (e) {
                return new Set();
            }
        }
        return new Set();
    }

    // --- Global Backup Word List (Shared) ---
    let globalBackupWordList = new Set();

    // --- Loading Indicator for Global Backup Word List ---
    function showWordListLoading(show) {
        let loadingEl = document.getElementById('word-list-loading');
        if (show) {
            if (!loadingEl) {
                loadingEl = document.createElement('div');
                loadingEl.id = 'word-list-loading';
                loadingEl.textContent = 'Loading word list...';
                loadingEl.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,0.4);color:#fff;font-size:1.5em;font-family:sans-serif;';
                document.body.appendChild(loadingEl);
            } else {
                loadingEl.style.display = 'flex';
            }
        } else if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    async function loadGlobalBackupWordList() {
        // Fetch the backup word list from the local root folder
        const GIST_URL = 'backup-words.txt';
        showWordListLoading(true);
        try {
            const resp = await fetch(GIST_URL, {cache: 'reload'});
            if (resp.ok) {
                const text = await resp.text();
                globalBackupWordList = new Set(
                    text.split(/\r?\n/)
                        .map(w => w.trim().toUpperCase())
                        .filter(w => w.length > 0 && !w.startsWith('#'))
                );
                debugLog('Loaded global backup word list from Gist:', globalBackupWordList.size, 'words');
            } else {
                if (DEBUG) console.warn('Could not load backup word list from Gist');
            }
        } catch (e) {
            if (DEBUG) console.warn('Error loading backup word list from Gist:', e);
        } finally {
            showWordListLoading(false);
        }
    }
    loadGlobalBackupWordList();

    // --- Backup Word List for Manual Additions (Encapsulated, Local Only) ---
    const LOCAL_STORAGE_BACKUP_WORD_LIST_KEY = 'seededLetterGridBackupWordList';
    let backupWordList = getSetFromLocalStorage(LOCAL_STORAGE_BACKUP_WORD_LIST_KEY);
    function loadBackupWordList() {
        backupWordList = getSetFromLocalStorage(LOCAL_STORAGE_BACKUP_WORD_LIST_KEY);
    }
    function saveBackupWordList() {
        setToLocalStorage(LOCAL_STORAGE_BACKUP_WORD_LIST_KEY, backupWordList);
    }
    loadBackupWordList();
    // --- Large Grid Cells (Mobile) Setting ---
    const LOCAL_STORAGE_LARGE_CELLS_KEY = 'seededLetterGridLargeCells';
    const largeCellsToggle = document.getElementById('large-cells-toggle');
    function isMobile() {
        return window.innerWidth <= 600;
    }
    function getLargeCellsSetting() {
        return localStorage.getItem(LOCAL_STORAGE_LARGE_CELLS_KEY) === 'true';
    }
    function setLargeCellsSetting(val) {
        localStorage.setItem(LOCAL_STORAGE_LARGE_CELLS_KEY, val ? 'true' : 'false');
    }
    if (largeCellsToggle) {
        largeCellsToggle.checked = getLargeCellsSetting();
        largeCellsToggle.addEventListener('change', () => {
            setLargeCellsSetting(largeCellsToggle.checked);
            renderGrid(currentGrid);
        });
    }
    // Determine grid size based on game mode setting in local storage.
    const savedGridSize = localStorage.getItem('seededLetterGridSize');
    // Use '40' for Challenging, '50' for Relaxed, 50 otherwise.
    const GRID_SIZE = savedGridSize === '40' ? 40 : (savedGridSize === '50' ? 50 : 50); 
    debugLog(`Grid size set to: ${GRID_SIZE}x${GRID_SIZE}`);

    const GRID_GAP = 2; // in pixels

    // --- Letter Frequency Data for Weighted Grid Generation ---
    // Unigram (single letter) frequencies.
    const letterFrequencies = {
        'A': 82, 'B': 15, 'C': 28, 'D': 43, 'E': 127, 'F': 22, 'G': 20, 'H': 61, 
        'I': 70, 'J': 2,  'K': 8,  'L': 40, 'M': 24,  'N': 67, 'O': 75, 'P': 19, 
        'Q': 1,  'R': 60, 'S': 63, 'T': 91, 'U': 28,  'V': 10, 'W': 24, 'X': 2,
        'Y': 20, 'Z': 1
    };

    // Bigram (two-letter pair) frequencies. The probability of a letter appearing
    // is based on the letter that precedes it. This creates more natural "word-like" flows.
    // Data is simplified for this use case.
    const bigramFrequencies = {
        'A': {'N': 7, 'T': 6, 'S': 4, 'R': 4, 'L': 3, 'V': 2, 'C': 2, 'D': 2, 'G': 2, 'M': 2, 'P': 2, 'B': 2, 'Y': 2},
        'B': {'E': 20, 'L': 5, 'O': 5, 'U': 5, 'A': 3, 'I': 3, 'R': 3, 'Y': 3},
        'C': {'H': 15, 'O': 10, 'E': 8, 'A': 5, 'K': 5, 'L': 3, 'R': 3, 'T': 3, 'I': 2, 'U': 2},
        'D': {'E': 15, 'I': 8, 'O': 5, 'A': 4, 'R': 3, 'S': 3, 'U': 2},
        'E': {'R': 12, 'S': 10, 'N': 8, 'D': 7, 'A': 5, 'L': 5, 'V': 4, 'C': 3, 'T': 3, 'X': 2, 'P': 2},
        'F': {'O': 15, 'F': 10, 'E': 8, 'I': 5, 'L': 3, 'A': 2, 'R': 2, 'T': 2, 'U': 2},
        'G': {'R': 12, 'H': 10, 'E': 8, 'O': 5, 'A': 3, 'I': 3, 'L': 3, 'N': 3, 'U': 3},
        'H': {'E': 30, 'A': 10, 'I': 8, 'O': 5, 'T': 3, 'U': 2},
        'I': {'N': 15, 'S': 10, 'T': 8, 'C': 5, 'L': 5, 'O': 4, 'V': 4, 'D': 3, 'G': 3, 'M': 3, 'P': 3, 'R': 3},
        'J': {'U': 8, 'O': 5, 'A': 3, 'E': 2},
        'K': {'E': 10, 'I': 5, 'N': 3, 'S': 2},
        'L': {'L': 15, 'Y': 10, 'E': 8, 'I': 5, 'A': 4, 'O': 3, 'D': 2, 'S': 2, 'U': 2},
        'M': {'E': 15, 'A': 10, 'O': 8, 'P': 5, 'I': 4, 'B': 3, 'M': 2, 'U': 2},
        'N': {'T': 12, 'D': 10, 'G': 8, 'S': 6, 'C': 4, 'E': 4, 'O': 3, 'A': 2, 'I': 2, 'K': 2, 'U': 2},
        'O': {'F': 15, 'N': 12, 'R': 10, 'U': 8, 'W': 5, 'L': 4, 'O': 4, 'P': 3, 'D': 2, 'M': 2, 'S': 2, 'T': 2},
        'P': {'R': 10, 'E': 8, 'L': 5, 'A': 4, 'O': 3, 'H': 2, 'I': 2, 'P': 2, 'S': 2, 'U': 2},
        'Q': {'U': 100}, // 'Q' is almost always followed by 'U'.
        'R': {'E': 20, 'A': 10, 'O': 8, 'I': 6, 'S': 4, 'T': 4, 'D': 3, 'G': 2, 'K': 2, 'M': 2, 'N': 2, 'P': 2, 'U': 2, 'Y': 2},
        'S': {'T': 12, 'E': 10, 'H': 8, 'S': 6, 'I': 5, 'O': 5, 'U': 4, 'A': 3, 'C': 2, 'K': 2, 'L': 2, 'P': 2, 'W': 2},
        'T': {'H': 25, 'O': 10, 'I': 8, 'E': 7, 'A': 5, 'R': 5, 'S': 3, 'T': 2, 'U': 2, 'W': 2, 'Y': 2},
        'U': {'S': 10, 'R': 8, 'N': 7, 'L': 6, 'P': 4, 'T': 4, 'B': 2, 'C': 2, 'D': 2, 'G': 2, 'M': 2},
        'V': {'E': 15, 'I': 8, 'A': 3, 'O': 2},
        'W': {'A': 12, 'I': 10, 'E': 8, 'H': 5, 'O': 3, 'S': 2},
        'X': {'P': 5, 'T': 3, 'C': 2, 'I': 2},
        'Y': {'S': 10, 'O': 8, 'E': 5, 'A': 2},
        'Z': {'Z': 8, 'E': 5, 'I': 2},
    };

    /**
     * Pre-calculates the total weight for a single frequency map.
     * @param {object} freqMap - An object of character-to-weight mappings.
     * @returns {{map: object, total: number}}
     */
    function processSingleFrequencyMap(freqMap) {
        const totalWeight = Object.values(freqMap).reduce((sum, weight) => sum + weight, 0);
        return { map: freqMap, total: totalWeight };
    }

    /**
     * Pre-calculates total weights for a nested frequency map (like bigrams).
     * @param {object} nestedFreqMap - An object where keys map to frequency map objects.
     * @returns {object} A new object with pre-calculated totals.
     */
    function processFrequencyMap(nestedFreqMap) {
        const processed = {};
        for (const key in nestedFreqMap) {
            processed[key] = processSingleFrequencyMap(nestedFreqMap[key]);
        }
        return processed;
    }

    /**
     * Selects a character from a pre-processed frequency map based on weighted probabilities.
     * @param {{map: object, total: number}} processedMap - The pre-processed map with a total weight.
     * @param {function} randomFunc - The seeded random function to use.
     * @returns {string} A randomly selected character.
     */
    function getWeightedRandomChar(processedMap, randomFunc) {
        const { map, total } = processedMap;
        if (total === 0) return 'A'; // Fallback for empty maps

        let randomNum = randomFunc() * total;
        for (const [char, weight] of Object.entries(map)) {
            if (randomNum < weight) {
                return char;
            }
            randomNum -= weight;
        }
        return Object.keys(map)[0]; // Fallback for floating point inaccuracies
    }

    const gameGridContainer = document.getElementById('game-grid');
    const gridPanel = document.getElementById('grid-panel'); // The direct parent of game-grid, and the actual scrollable element
    const currentWordDisplay = document.getElementById('current-word-display');
    const verifyButton = document.getElementById('verify-button');
    const clearButton = document.getElementById('clear-button');
    const wordList = document.getElementById('word-list');
    const foundWordsSection = document.getElementById('found-words-section');
    const foundWordsHeader = document.getElementById('found-words-header');
    const sidePanel = document.querySelector('.side-panel');
    const gameTimerDisplay = document.getElementById('game-timer');
    const gridPanelWrapper = document.querySelector('.grid-panel-wrapper');
    const vignetteTop = document.getElementById('vignette-top');
    const vignetteBottom = document.getElementById('vignette-bottom');
    const vignetteLeft = document.getElementById('vignette-left');
    const vignetteRight = document.getElementById('vignette-right');
    const pathOverlay = document.getElementById('path-overlay');

    // Daily stats display elements for the INFO PANEL
    const totalWordsFoundPanel = document.getElementById('total-words-found-panel');
    const longestWordLengthPanel = document.getElementById('longest-word-length-panel');
    const headerStats = document.querySelector('.header-stats');

    // Stats display elements for the MODAL
    const totalWordsFoundModal = document.getElementById('total-words-found-modal');
    const longestWordLengthModal = document.getElementById('longest-word-length-modal');
    const modalWordList = document.getElementById('modal-word-list');
    const longestWordDisplay = document.getElementById('longest-word'); // Global longest word

    // Menu and Modal Elements
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const menuPanel = document.getElementById('menu-panel');
    const closeMenuButton = document.getElementById('close-menu');
    const menuStatsButton = document.getElementById('menu-stats'); // The 'Stats' link in the menu
    const menuShareButton = document.getElementById('menu-share');
    const menuSettingsButton = document.getElementById('menu-settings');
    const menuRulesButton = document.getElementById('menu-rules');
    const modalOverlay = document.getElementById('modal-overlay');
    const statsModal = document.getElementById('stats-modal');
    const statsModalTitle = statsModal.querySelector('h2');
    const closeStatsModalButton = document.getElementById('close-stats-modal'); 
    
    // Definition Modal Elements
    const definitionModal = document.getElementById('definition-modal');
    const closeDefinitionModalButton = document.getElementById('close-definition-modal');
    const definitionWordDisplay = document.getElementById('definition-word');
    const definitionPhoneticDisplay = document.getElementById('definition-phonetic');
    const definitionMeaningsContainer = document.getElementById('definition-meanings');

    // Share Modal Elements
    const shareModal = document.getElementById('share-modal');
    const closeShareModalButton = document.getElementById('close-share-modal');
    const shareModalTitle = shareModal.querySelector('h2');
    const shareModalButtons = shareModal.querySelector('.share-buttons');
    const shareModalInfo = document.getElementById('share-modal-info');
    const shareXButton = document.getElementById('share-x');
    const shareFacebookButton = document.getElementById('share-facebook');
    const copyShareLinkButton = document.getElementById('copy-share-link');
    const copyShareLinkText = document.getElementById('copy-share-link-text');
    const shareTextPreview = document.getElementById('share-text-preview');

    // Settings Modal Elements
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalButton = document.getElementById('close-settings-modal');
    const themeToggleButton = document.getElementById('theme-toggle');
    const deleteDataButton = document.getElementById('delete-data-button');
    const eyeComfortToggle = document.getElementById('eye-comfort-toggle');
    const gameModeSelector = document.getElementById('game-mode-selector');

    // Notification Modal Elements
    const notificationModal = document.getElementById('notification-modal');
    const closeNotificationModalButton = document.getElementById('close-notification-modal');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');

    // Confirmation Modal Elements
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmationTitle = document.getElementById('confirmation-title');
    const confirmationMessage = document.getElementById('confirmation-message');
    const confirmYesButton = document.getElementById('confirm-yes-button');
    const closeConfirmationModalButton = document.querySelector('#confirmation-modal .close-modal');
    const confirmNoButton = document.getElementById('confirm-no-button');
    
    // Rules Modal Elements
    const rulesModal = document.getElementById('rules-modal');
    const closeRulesModalButton = document.getElementById('close-rules-modal');
    const rulesContent = document.getElementById('rules-content');
    const rulesDotsContainer = document.getElementById('rules-dots');
    const rulesBackButton = document.getElementById('rules-back-button');
    const rulesForwardButton = document.getElementById('rules-forward-button');

    let currentGrid = [];
    let modalStack = [];
    let foundWordPaths = [];
    let currentWordPath = [];
    let foundWords = new Set(); 
    let permanentlyHighlightedCells = new Set(); 

    let totalWordsFound = 0; 
    let longestWordLength = 0; 
    let dailyLongestWordFound = '';

    let globalLongestWordLength = 0;
    let globalLongestWordFound = '';
    let currentCellSize = 0;
    let currentGameMode = 'standard';

    // Timer state
    let TIMER_DURATION; // Set by initializeTimer based on game mode
    //const TIMER_DURATION = 5; // 5 seconds for testing
    let timerInterval = null;
    let timeRemaining; // Set by initializeTimer or loadGameState
    let isTimeUp = false;

    const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

    // --- Local Storage Keys ---
    const LOCAL_STORAGE_FOUND_WORDS_KEY = 'seededLetterGridFoundWords';
    const LOCAL_STORAGE_HIGHLIGHTED_CELLS_KEY = 'seededLetterGridHighlightedCells';
    const LOCAL_STORAGE_DATE_SEED_KEY = 'seededLetterGridDateSeed';
    const LOCAL_STORAGE_TOTAL_WORDS_KEY = 'seededLetterGridTotalWords';
    const LOCAL_STORAGE_LONGEST_WORD_KEY = 'seededLetterGridLongestWord';
    const LOCAL_STORAGE_DAILY_LONGEST_WORD_KEY = 'seededLetterGridDailyLongestWord';
    const LOCAL_STORAGE_GLOBAL_LONGEST_WORD_LENGTH_KEY = 'seededLetterGridGlobalLongestWordLength';
    const LOCAL_STORAGE_GLOBAL_LONGEST_WORD_KEY = 'seededLetterGridGlobalLongestWord';
    const LOCAL_STORAGE_THEME_KEY = 'seededLetterGridTheme';
    const LOCAL_STORAGE_EYE_COMFORT_KEY = 'seededLetterGridEyeComfort';
    const LOCAL_STORAGE_TIME_REMAINING_KEY = 'seededLetterGridTimeRemaining';
    const LOCAL_STORAGE_FOUND_PATHS_KEY = 'seededLetterGridFoundPaths';
    const LOCAL_STORAGE_RULES_SEEN_KEY = 'seededLetterGridRulesSeen';
    const LOCAL_STORAGE_GAME_MODE_KEY = 'seededLetterGridGameMode';
    const LOCAL_STORAGE_GRID_SIZE_KEY = 'seededLetterGridSize';

    const gameRules = [
        "Find as many words as you can in the randomly-generated grid before the timer runs out.",
        "Select adjacent letters (horizontally, vertically, or diagonally) to form a word.",
        "Words must be at least 3 letters long.",
        "You cannot use the same letter cell in more than one word at a time.",
        "If you think you can use a letter in a better word, you can select the word to delete it.",
        "The timer stops counting down when you leave the page, so you can pace yourself over the course of the day.",
        "If you want a more relaxed or challenging experience, you can switch the game mode in the settings.",
        "A new grid is generated everyday.  Come back each day and try to beat your score!"
    ];
    
    let currentRuleIndex = 0;
    let isScrolling = false;

    // --- Utility Functions ---

    function getDateSeed() {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const gridSize = localStorage.getItem('seededLetterGridSize') || 50;
        return parseInt(`${year}${month}${day}${gridSize}`, 10);
    }

    function createSeededRandom(seed) {
        let currentSeed = seed % 2147483647;
        if (currentSeed <= 0) {
            currentSeed += 2147483646;
        }
        return function() {
            currentSeed = (currentSeed * 16807) % 2147483647;
            return (currentSeed - 1) / 2147483646;
        };
    }

    function generateGrid() {
        const seed = getDateSeed();
        const seededRandom = createSeededRandom(seed);
        const grid = [];

        // Pre-process the frequency maps for efficiency, avoiding recalculation in the loop.
        const processedUnigrams = processSingleFrequencyMap(letterFrequencies);
        const processedBigrams = processFrequencyMap(bigramFrequencies);

        for (let row = 0; row < GRID_SIZE; row++) {
            grid[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                let letter;
                // For the first column of each row, use the general unigram frequency.
                if (col === 0) {
                    letter = getWeightedRandomChar(processedUnigrams, seededRandom);
                } else {
                    // For subsequent columns, use bigram frequency based on the previous letter.
                    const precedingLetter = grid[row][col - 1];
                    const bigramData = processedBigrams[precedingLetter];
                    
                    if (bigramData && bigramData.total > 0) {
                        letter = getWeightedRandomChar(bigramData, seededRandom);
                    } else {
                        letter = getWeightedRandomChar(processedUnigrams, seededRandom);
                    }
                }
                grid[row][col] = letter;
            }
        }
        return grid;
    }

    function updateCurrentWordDisplay() {
        const currentWord = currentWordPath.map(cell => cell.element.textContent).join('');
        requestAnimationFrame(() => {
            currentWordDisplay.textContent = currentWord;
            // --- Dynamic Font Sizing Logic ---
            // This ensures the text fits within the display without resizing the container.
            // 1. Reset font size to its default from CSS to start calculations.
            currentWordDisplay.style.fontSize = '';
            // 2. Get the computed font size in pixels and set a reasonable minimum.
            const computedStyle = window.getComputedStyle(currentWordDisplay);
            let currentFontSize = parseFloat(computedStyle.fontSize);
            const minFontSize = 14; // Minimum font size in pixels.
            // 3. Reduce font size until the text's scroll width is less than the element's visible width.
            //    Also check scrollHeight against clientHeight to prevent vertical expansion.
            while ((currentWordDisplay.scrollWidth > currentWordDisplay.clientWidth || currentWordDisplay.scrollHeight > currentWordDisplay.clientHeight) && currentFontSize > minFontSize) {
                currentFontSize--; // Decrease by 1px.
                currentWordDisplay.style.fontSize = `${currentFontSize}px`;
            }
            // Enable or disable action buttons based on whether a word is being formed.
            const hasWord = currentWord.length > 0;
            if (clearButton) {
                clearButton.disabled = !hasWord;
            }
            if (verifyButton && !isTimeUp && !verifyButton.classList.contains('verifying')) {
                verifyButton.disabled = !hasWord;
            }
        });
    }

    function clearWordPath() {
        currentWordPath.forEach(cell => {
            const cellKey = `${cell.row}_${cell.col}`;
            if (cell.element && !permanentlyHighlightedCells.has(cellKey)) {
                cell.element.classList.remove('selected');
            }
        });
        currentWordPath = [];
        updateCurrentWordDisplay();
        debugLog("Word path cleared.");
    }

    function isValidSelectionAttempt(targetRow, targetCol) {
        const cellKey = `${targetRow}_${targetCol}`;
        // Prevent re-selecting a cell that's part of a found word
        if (permanentlyHighlightedCells.has(cellKey)) {
            debugLog(`Cell (${targetRow}, ${targetCol}) is part of a found word and cannot be re-selected.`);
            return false;
        }

        // Prevent selecting the same cell twice in the current path (except for undo/backtracking)
        const isTargetInPath = currentWordPath.some(cell =>
            cell.row === targetRow && cell.col === targetCol
        );

        // First cell can always be selected
        if (currentWordPath.length === 0) {
            return true;
        }

        const lastSelected = currentWordPath[currentWordPath.length - 1];

        // Allow re-selecting the last cell (for deselection)
        if (lastSelected.row === targetRow && lastSelected.col === targetCol) {
            return true;
        }

        // Allow backtracking to the previous cell (undo last move)
        if (currentWordPath.length > 1) {
            const secondToLast = currentWordPath[currentWordPath.length - 2];
            if (secondToLast && secondToLast.row === targetRow && secondToLast.col === targetCol) {
                return true;
            }
        }

        // Prevent selecting any other cell already in the path
        if (isTargetInPath) {
            return false;
        }

        // Only allow selection of adjacent cells (including diagonals)
        const sRow = lastSelected.row;
        const sCol = lastSelected.col;
        const rowDiff = Math.abs(sRow - targetRow);
        const colDiff = Math.abs(sCol - targetCol);
        return (rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0));
    }

    // --- Animation Utility: Use requestAnimationFrame for shake effect ---
    function shakeElement(element) {
        if (!element) return;
        element.classList.add('shake');
        // Use requestAnimationFrame for smoother removal
        let start;
        function removeShake(timestamp) {
            if (!start) start = timestamp;
            if (timestamp - start >= 300) {
                element.classList.remove('shake');
            } else {
                requestAnimationFrame(removeShake);
            }
        }
        requestAnimationFrame(removeShake);
    }

function calculateWordScore(word) {
    // Score = sum of rarity scores for each letter + word length bonus
    // Rarity score: (maxFreq - freq + 1), so rare letters get higher scores
    // Normalize so E=1, Z=127 (or similar)
    if (!word) return 0;
    const maxFreq = Math.max(...Object.values(letterFrequencies));
    let rarityScore = 0;
    for (const char of word.toUpperCase()) {
        const freq = letterFrequencies[char] || 1;
        // Higher score for lower frequency
        rarityScore += (maxFreq - freq + 1);
    }
    // Optionally add a small bonus for word length
    return rarityScore + word.length;
}

let score = 0;
let globalHighestScore = 0; // New global stat

const LOCAL_STORAGE_GLOBAL_HIGHEST_SCORE_KEY = 'seededLetterGridGlobalHighestScore';
const LOCAL_STORAGE_CURRENT_SCORE_KEY = 'seededLetterGridCurrentScore'; // Add this key

function addWordToScore(word) {
    if (!word) return;
    score += calculateWordScore(word);
    // Save score immediately after update
    localStorage.setItem(LOCAL_STORAGE_CURRENT_SCORE_KEY, score.toString());
    // Check for new highest score
    if (score > globalHighestScore) {
        globalHighestScore = score;
        localStorage.setItem(LOCAL_STORAGE_GLOBAL_HIGHEST_SCORE_KEY, globalHighestScore.toString());
        updateGlobalHighestScoreDisplay();
    }
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const scoreElement = document.getElementById('score-display');
    if (scoreElement) {
        // Always show 0 if score is 0 (after reset)
        scoreElement.textContent = `Score: ${score === 0 ? 0 : score}`;
    }
    updateGlobalHighestScoreDisplay();
}

function updateGlobalHighestScoreDisplay() {
    const globalScoreEl = document.getElementById('global-highest-score-display');
    if (globalScoreEl) {
        globalScoreEl.textContent = `${globalHighestScore}`;
    }
}

    async function showNotificationModal(title, message) {
        notificationTitle.textContent = title;
        // Allow HTML in the message (for mailto link)
        notificationMessage.innerHTML = message;
        showModal(notificationModal);
    }

    // --- Vignette Functions ---
    // --- Vignette Animation: Use requestAnimationFrame for smooth UI update ---
    let vignetteAnimationFrame = null;
    function updateVignetteVisibility() {
        if (vignetteAnimationFrame) {
            cancelAnimationFrame(vignetteAnimationFrame);
        }
        vignetteAnimationFrame = requestAnimationFrame(() => {
            if (!gridPanel) return;
            const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = gridPanel;
            const scrollEndLeeway = 5; // Leeway of a few pixels for calculations
            vignetteTop.classList.toggle('hidden', scrollTop <= scrollEndLeeway);
            vignetteBottom.classList.toggle('hidden', scrollTop >= scrollHeight - clientHeight - scrollEndLeeway);
            vignetteLeft.classList.toggle('hidden', scrollLeft <= scrollEndLeeway);
            vignetteRight.classList.toggle('hidden', scrollLeft >= scrollWidth - clientWidth - scrollEndLeeway);
            isScrolling = false;
            vignetteAnimationFrame = null;
        });
    }

    // --- Path Drawing Functions ---
    // --- Path Drawing: Use requestAnimationFrame for smoother SVG path updates ---
    function drawPath(path, cellSize, gap) {
        if (!path || path.length < 2 || !pathOverlay) return;
        const pathData = path.map((point, index) => {
            const x = (point.col * (cellSize + gap)) + (cellSize / 2);
            const y = (point.row * (cellSize + gap)) + (cellSize / 2);
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        requestAnimationFrame(() => {
            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathElement.setAttribute('d', pathData);
            pathOverlay.appendChild(pathElement);
        });
    }

    function redrawAllFoundPaths(cellSize, gap) {
        if (!pathOverlay) return;
        pathOverlay.innerHTML = ''; // Clear existing paths
        foundWordPaths.forEach(path => drawPath(path, cellSize, gap));
    }

    // --- Rules Carousel Functions ---
    function setupRulesCarousel() {
        if (!rulesDotsContainer) return;
        rulesDotsContainer.innerHTML = '';
        gameRules.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            dot.dataset.index = index;
            rulesDotsContainer.appendChild(dot);
        });
    }

    function showRule(index) {
        if (!rulesContent || index < 0 || index >= gameRules.length) return;

        currentRuleIndex = index;
        rulesContent.textContent = gameRules[index];

        // Update dots
        const dots = rulesDotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, dotIndex) => {
            if (dotIndex === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Update button visibility and state
        rulesBackButton.disabled = (index === 0);
        rulesForwardButton.disabled = (index === gameRules.length - 1);
    }

    // --- Timer Functions ---
    function updateTimerDisplay() {
        if (currentGameMode === 'relaxed') return; // No timer in relaxed mode
        if (!gameTimerDisplay) return;
        requestAnimationFrame(() => {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            gameTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        });
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function handleTimeUp() {
        if (currentGameMode === 'relaxed') return; // No timer in relaxed mode
        stopTimer();
        isTimeUp = true;
        timeRemaining = 0;
        updateTimerDisplay();
        verifyButton.disabled = true; // Disable verification

        // Ensure the modal title and buttons are in their default state
        if (shareModalTitle) shareModalTitle.textContent = "Share Your Score";
        if (shareModalButtons) shareModalButtons.style.display = 'flex';

        // Display the "Time's Up" message above the shareable text
        if (shareModalInfo) {
            shareModalInfo.textContent = "Time's Up! Come back again tomorrow and try again with a new grid!";
            shareModalInfo.style.display = 'block';
        }

        if (shareTextPreview) {
            shareTextPreview.innerHTML = getShareMessage();
        }

        showModal(shareModal);

        // Add visual feedback to show the grid is disabled.
        gameGridContainer.classList.add('grid-disabled');

        console.log("Time is up!");
    }

    function startTimer() {
        if (currentGameMode === 'relaxed') return; // No timer in relaxed mode
        stopTimer(); // Ensure no multiple intervals are running
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                handleTimeUp();
            }
        }, 1000);
    }

    function handleVisibilityChange() {
        if (currentGameMode === 'relaxed') return; // No timer in relaxed mode
        if (document.hidden) {
            // Page is not visible, pause the timer and save the current time remaining.
            stopTimer();
            if (!isTimeUp) {
                localStorage.setItem(LOCAL_STORAGE_TIME_REMAINING_KEY, timeRemaining.toString());
            }
            console.log("Timer paused due to page visibility change.");
        } else {
            // Page is visible again. First, check if the day has changed.
            const savedDateSeed = localStorage.getItem(LOCAL_STORAGE_DATE_SEED_KEY);
            const currentDateSeed = getDateSeed().toString();

            if (savedDateSeed && savedDateSeed !== currentDateSeed) {
                console.log("New day detected upon returning to tab. Notifying user and reloading page...");
                // Show a notification before reloading for a better user experience.
                showNotificationModal("New Day!", "A new puzzle is ready. The page will now refresh.");
                // Wait a moment for the user to see the message before reloading.
                setTimeout(() => {
                    location.reload();
                }, 2500); // 2.5 second delay
                return; // Stop further execution in this function
            }

            // If the day hasn't changed, resume the timer.
            if (!isTimeUp) {
                startTimer();
                console.log("Timer resumed.");
            }
        }
    }

    /**
     * Checks a word against a public profanity filter API.
     * @param {string} word The word to check.
     * @returns {Promise<boolean>} True if the word is considered inappropriate.
     */
    async function isWordInappropriate(word) {
        // Using PurgoMalum, a simple, free profanity filter API.
        // It returns 'true' or 'false' as a string.
        const url = `https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(word)}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Profanity check API error: ${response.status}`);
                return false; // Fail safe: if API fails, assume word is not profane.
            }
            const result = await response.text();
            return result === 'true';
        } catch (error) {
            console.error('Network error during profanity check:', error);
            return false; // Fail safe
        }
    }

    // Flag to prevent cell selection while dragging the grid
    let isDraggingGrid = false; 
    const DRAG_THRESHOLD = 5; // Minimum pixel movement to consider it a drag

//closeConfirmationModalButton.addEventListener('click', hideActiveModal);

function getWordFromPath(path) {
        if (!path || path.length === 0 || !currentGrid || currentGrid.length === 0) return '';
        return path.map(cellPos => currentGrid[cellPos.row][cellPos.col]).join('');
    }
    
    function findWordPathForCell(row, col) {
        for (let i = 0; i < foundWordPaths.length; i++) {
            const path = foundWordPaths[i];
            const cellInPath = path.some(cellPos => cellPos.row === row && cellPos.col === col);
            if (cellInPath) {
                const word = getWordFromPath(path);
                return { word, path, pathIndex: i };
            }
        }
        return null;
    }

    function showDeleteWordConfirmation(word, path, pathIndex) {
        confirmationTitle.textContent = "Delete Word?";
        confirmationMessage.innerHTML = `This letter has already been played in the word <b>${word}</b>. <br><br>Would you like to delete this word?`;
    
        // Use .onclick to easily overwrite previous listeners to avoid them stacking up.
        confirmYesButton.onclick = () => {
            deleteWord(word, path, pathIndex);
            hideActiveModal();
        };
    
        confirmNoButton.onclick = () => {
            hideActiveModal();
        };
    
        showModal(confirmationModal);
    }

    function deleteWord(word, path, pathIndex) {
    debugLog(`Deleting word: ${word}`);

    // 1. Remove from foundWords set
    foundWords.delete(word.toUpperCase());

    // --- SUBTRACT WORD SCORE ---
    const wordScore = calculateWordScore(word);
    score = Math.max(0, score - wordScore); // Prevent negative score
    localStorage.setItem(LOCAL_STORAGE_CURRENT_SCORE_KEY, score.toString());
    updateScoreDisplay();

    // 2. Remove from foundWordPaths array
    foundWordPaths.splice(pathIndex, 1);
    
        // 3. Rebuild permanentlyHighlightedCells from the remaining paths to handle overlaps
        const allRemainingCells = new Set();
        foundWordPaths.forEach(p => {
            p.forEach(cellPos => {
                allRemainingCells.add(`${cellPos.row}_${cellPos.col}`);
            });
        });
        permanentlyHighlightedCells = allRemainingCells;
    
        // 4. Update UI
        path.forEach(cellPos => {
            const cellKey = `${cellPos.row}_${cellPos.col}`;
            if (!permanentlyHighlightedCells.has(cellKey)) {
                const cellElement = gameGridContainer.querySelector(`[data-row='${cellPos.row}'][data-col='${cellPos.col}']`);
                if (cellElement) toggleCellSelected(cellElement, false);
            }
        });
        const listItem = wordList.querySelector(`li[data-word='${word.toUpperCase()}']`);
        if (listItem) listItem.remove();
        if (modalWordList) {
            const modalListItem = modalWordList.querySelector(`li[data-word='${word.toUpperCase()}']`);
            if (modalListItem) modalListItem.remove();
        }
        redrawAllFoundPaths(currentCellSize, GRID_GAP);
    
        // 5. Update stats
        totalWordsFound--;
        if (dailyLongestWordFound.toUpperCase() === word.toUpperCase()) {
            dailyLongestWordFound = '';
            longestWordLength = 0;
            foundWords.forEach(w => { if (w.length > longestWordLength) { longestWordLength = w.length; dailyLongestWordFound = w; } });
        }
        updateStatsDisplay();
        saveGameState();
    }

    function handleCellClick(event) {
        if (isTimeUp) {
            debugLog("Click prevented: Time is up.");
            shakeElement(event.target); // Shake the cell that was clicked
            return;
        }

        // Crucial check: only proceed with selection if no significant drag occurred
        if (isDraggingGrid) {
            debugLog("Click prevented: Grid was being dragged.");
            return; 
        }

        const clickedCellElement = event.target;
        const row = parseInt(clickedCellElement.dataset.row);
        const col = parseInt(clickedCellElement.dataset.col);

        const cellKey = `${row}_${col}`;

        if (permanentlyHighlightedCells.has(cellKey)) {
            // --- Prevent deletion in challenging mode ---
            if (currentGameMode === 'challenging') {
                // Just shake the cell and do nothing else
                shakeElement(clickedCellElement);
                return;
            }
            // Find which word this cell belongs to
            const pathInfo = findWordPathForCell(row, col);
            if (pathInfo) {
                const { word, path, pathIndex } = pathInfo;
                showDeleteWordConfirmation(word, path, pathIndex);
            } else {
                // This case shouldn't happen if permanentlyHighlightedCells is consistent with foundWordPaths
                debugLog(`Cell (${row}, ${col}) is highlighted but no path found. Inconsistency.`);
                shakeElement(clickedCellElement);
            }
            return;
        }

        const lastInPath = currentWordPath[currentWordPath.length - 1];
        if (lastInPath && lastInPath.row === row && lastInPath.col === col) {
            const removedCell = currentWordPath.pop();
            if (removedCell.element) {
                toggleCellSelected(removedCell.element, false);
            }
            updateCurrentWordDisplay();
            debugLog(`Deselected last cell by clicking it again. Current path: ${currentWordPath.map(c => c.element.textContent).join('')}`);
            return;
        }

        if (currentWordPath.length > 1) {
            const secondToLast = currentWordPath[currentWordPath.length - 2];
            if (secondToLast && secondToLast.row === row && secondToLast.col === col) {
                const lastCell = currentWordPath.pop();
                if (lastCell.element) {
                    toggleCellSelected(lastCell.element, false);
                }
                updateCurrentWordDisplay();
                debugLog(`Deselected last cell by going back. Current path: ${currentWordPath.map(c => c.element.textContent).join('')}`);
                return;
            }
        }
        
        if (isValidSelectionAttempt(row, col)) {
            toggleCellSelected(clickedCellElement, true);
            currentWordPath.push({ row, col, element: clickedCellElement });
            updateCurrentWordDisplay();
            debugLog(`Path extended. Current word: ${currentWordPath.map(cell => cell.textContent).join('')}`);
        } else {
            debugLog(`Invalid selection attempt for (${row}, ${col}). Path remains.`);
            shakeElement(clickedCellElement);
        }
    }

    async function checkWordWithAPI(word) {
        try {
            const response = await fetch(`${DICTIONARY_API_URL}${word}`);
            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) && data.length > 0 && data[0].word.toLowerCase() === word.toLowerCase();
            } else if (response.status === 404) {
                return false; 
            } else {
                console.error(`API Error: ${response.status} - ${response.statusText}`);
                return false;
            }
        } catch (error) {
            console.error('Network or API request failed:', error);
            return false;
        }
    }

    async function handleVerifyClick() {
        if (isTimeUp) {
            debugLog("Verification prevented: Time is up.");
            return;
        }

        const word = currentWordPath.map(cell => cell.element.textContent).join('').toUpperCase();

        if (word.length === 0) {
            debugLog("No word formed to verify.");
            shakeElement(currentWordDisplay);
            return;
        }

        if (word.length < 3) {
            debugLog("Word too short. Must be at least 3 letters.");
            shakeElement(currentWordDisplay);
            clearWordPath();
            return;
        }

        if (foundWords.has(word)) {
            debugLog(`Word "${word}" already found!`);
            shakeElement(currentWordDisplay);
            clearWordPath();
            return;
        }

        verifyButton.classList.add('verifying');
        verifyButton.disabled = true;


        let isValid = await checkWordWithAPI(word);

        // If not valid by API, check global backup list
        if (!isValid && globalBackupWordList.has(word)) {
            isValid = true;
            debugLog(`Word "${word}" accepted from global backup list.`);
        }
        // If not valid by API or global, check local backup list
        if (!isValid && backupWordList.has(word)) {
            isValid = true;
            debugLog(`Word "${word}" accepted from local backup list.`);
        }

        verifyButton.classList.remove('verifying');
        verifyButton.disabled = false;

        // --- Track failed attempts for this word ---
        const FAILED_ATTEMPTS_KEY = 'seededLetterGridFailedAttempts';
        let failedAttempts = JSON.parse(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '{}');
        if (!isValid) {
            // Track consecutive failed attempts for this word
            const lastFailedWord = localStorage.getItem('seededLetterGridLastFailedWord') || '';
            let consecutiveFails = parseInt(localStorage.getItem('seededLetterGridConsecutiveFails') || '0', 10);
            if (lastFailedWord === word) {
                consecutiveFails++;
            } else {
                consecutiveFails = 1;
            }
            localStorage.setItem('seededLetterGridLastFailedWord', word);
            localStorage.setItem('seededLetterGridConsecutiveFails', consecutiveFails.toString());
            // Also track total fails for stats (optional, can be removed)
            failedAttempts[word] = (failedAttempts[word] || 0) + 1;
            localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(failedAttempts));
            // Always show the normal rejection feedback first
            shakeElement(currentWordDisplay);
            currentWordDisplay.classList.add('error');
            setTimeout(() => {
                currentWordDisplay.classList.remove('error');
                clearWordPath();
                // After the normal rejection, show the contact modal if this is the 2nd consecutive failure
                if (consecutiveFails === 2) {
                    showNotificationModal(
                        "Word Not Recognized",
                        `If you believe <b>${word}</b> is a valid English word, please <a href="mailto:sporadicallyintelligent@gmail.com?subject=SearchWord%20Backup%20Word%20Suggestion&body=Please%20add%20the%20word%20${encodeURIComponent(word)}%20to%20the%20backup%20list." target="_blank" rel="noopener">email the developer</a> and it may be added to the backup list!`
                    );
                }
            }, 500);
            return;
        }
        // Reset consecutive fail tracking on success
        localStorage.removeItem('seededLetterGridLastFailedWord');
        localStorage.removeItem('seededLetterGridConsecutiveFails');
        // If valid, clear failed attempts for this word
        if (failedAttempts[word]) {
            delete failedAttempts[word];
            localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(failedAttempts));
        }
        if (isValid) {
            // New API-based check for inappropriate words
            const isProfane = await isWordInappropriate(word);
            if (isProfane) {
                console.log(`Word "${word}" is inappropriate and was rejected.`);
                showNotificationModal("Word Rejected", "This word is not permitted in the game.");
                clearWordPath();
                return; // Stop processing
            }

            // The word is valid and not profane. Update state immediately.
            console.log(`Word "${word}" is valid!`);
            addWordToList(word);

            // --- Ensure score is updated, SVG path is drawn, and word display is cleared ---
            addWordToScore(word);

            foundWords.add(word);
            currentWordPath.forEach(cell => {
                const cellKey = `${cell.row}_${cell.col}`;
                permanentlyHighlightedCells.add(cellKey);
                if (cell.element) {
                    toggleCellSelected(cell.element, true);
                }
            });
            totalWordsFound++;

            const simplifiedPath = currentWordPath.map(p => ({ row: p.row, col: p.col }));
            foundWordPaths.push(simplifiedPath);

            drawPath(simplifiedPath, currentCellSize, GRID_GAP);

            // --- Clear the current word display immediately after adding ---
            clearWordPath();

            if (word.length > longestWordLength) {
                longestWordLength = word.length;
                dailyLongestWordFound = word;
            }
            if (word.length > globalLongestWordLength) {
                globalLongestWordLength = word.length;
                globalLongestWordFound = word;
            }
            saveGameState();
            updateStatsDisplay();

            // Provide visual feedback and then clear the path.
            currentWordDisplay.classList.add('success');
            setTimeout(() => {
                currentWordDisplay.classList.remove('success');
                // clearWordPath(); // Already called above, so this is not needed
            }, 500); // Keep success color for 500ms
        } else {
            console.log(`Word "${word}" is not a valid word.`);
            // Provide visual feedback for the error.
            shakeElement(currentWordDisplay);
            currentWordDisplay.classList.add('error');
            setTimeout(() => {
                currentWordDisplay.classList.remove('error');
                clearWordPath();
            }, 500);
        }
    }

    function addWordToList(word) {
        const listItem = document.createElement('li');
        listItem.dataset.word = word; // Store the raw word for API calls
        listItem.innerHTML = `${word} <span class="word-length">(${word.length})</span>`;
        wordList.appendChild(listItem);

        // Also add to the modal's word list for mobile view
        if (modalWordList) {
            const modalListItem = listItem.cloneNode(true);
            modalWordList.appendChild(modalListItem);
        }

        wordList.scrollTop = wordList.scrollHeight; 
    }

    async function fetchAndShowDefinition(word) {
        // 1. Show modal with loading state
        definitionWordDisplay.textContent = word;
        definitionPhoneticDisplay.textContent = '';
        definitionMeaningsContainer.innerHTML = ''; // Clear previous content
        definitionMeaningsContainer.classList.add('loading'); // Show loading text
        showModal(definitionModal);
    
        try {
            const response = await fetch(`${DICTIONARY_API_URL}${word}`);
            definitionMeaningsContainer.classList.remove('loading'); // Hide loading text
    
            if (!response.ok) {
                if (response.status === 404) {
                    definitionMeaningsContainer.innerHTML = `<p>No definition found for "${word}".</p>`;
                } else {
                    definitionMeaningsContainer.innerHTML = `<p>Error fetching definition. Please try again later.</p>`;
                }
                return;
            }
    
            const data = await response.json();
            
            // 2. Parse and display data
            const entry = data[0]; // API returns an array, take the first result
            
            // Find the phonetic text
            const phonetic = entry.phonetics?.find(p => p.text)?.text || '';
            definitionPhoneticDisplay.textContent = phonetic;
    
            // Build the meanings HTML
            const meaningsHtml = entry.meanings.map(meaning => {
                const definitionsHtml = meaning.definitions.map(def => {
                    const example = def.example ? `<p class="definition-example">"${def.example}"</p>` : '';
                    return `
                        <div class="definition-item">
                            <p class="definition-text">${def.definition}</p>
                            ${example}
                        </div>
                    `;
                }).join('');
    
                return `
                    <div class="meaning-block">
                        <h3 class="part-of-speech">${meaning.partOfSpeech}</h3>
                        ${definitionsHtml}
                    </div>
                `;
            }).join('');
    
            definitionMeaningsContainer.innerHTML = meaningsHtml;
    
        } catch (error) {
            console.error('Error fetching definition:', error);
            definitionMeaningsContainer.classList.remove('loading');
            definitionMeaningsContainer.innerHTML = `<p>Could not connect to the dictionary service.</p>`;
        }
    }

    function getShareMessage() {
    const numWords = totalWordsFound;
    const modeMap = {
        relaxed: "Relaxed",
        challenging: "Challenging",
        standard: "Standard"
    };
    const modeLabel = modeMap[currentGameMode] || "Standard";
    const scoreValue = score || 0;
    const highScore = scoreValue; // Only today's score
    const longestWordPart = dailyLongestWordFound
        ? `My longest word was "${dailyLongestWordFound}" (${longestWordLength} letters)`
        : "I'm still searching for my longest word!";
    const wordOrWords = numWords === 1 ? 'word' : 'words';

    if (numWords === 0) {
        return `Just started today's SearchWord!`;
    }

    return `I found ${numWords} ${wordOrWords}, scored ${highScore}, and my longest word was "${dailyLongestWordFound}" (${longestWordLength} letters) in today's ${modeLabel} SearchWord.<br>Try to beat my daily score!`;
}

    function generateShareText() {
        const hashtag = "#SearchWordGame";
        const gameUrl = window.location.href;
    
        const text = `${getShareMessage()} Can you beat my score? ${hashtag}`;
        
        return {
            text: text,
            url: gameUrl
        };
    }

function getShareMessagePlain() {
    const numWords = totalWordsFound;
    const modeMap = {
        relaxed: "Relaxed",
        challenging: "Challenging",
        standard: "Standard"
    };
    const modeLabel = modeMap[currentGameMode] || "Standard";
    const scoreValue = score || 0;
    const highScore = scoreValue;
    const wordOrWords = numWords === 1 ? 'word' : 'words';

    if (numWords === 0) {
        return `Just started today's SearchWord!`;
    }

    return `I found ${numWords} ${wordOrWords}, scored ${highScore}, and my longest word was "${dailyLongestWordFound}" (${longestWordLength} letters) in today's ${modeLabel} SearchWord.\nTry to beat my daily score!`;
}
    
    function openShareWindow(url) {
        const width = 600;
        const height = 400;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        window.open(
            url, 
            'shareWindow', 
            `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        );
    }


    function updateStatsDisplay() {
        if (totalWordsFoundPanel) totalWordsFoundPanel.textContent = totalWordsFound;
        if (longestWordLengthPanel) longestWordLengthPanel.textContent = longestWordLength;

        if (totalWordsFoundModal) totalWordsFoundModal.textContent = totalWordsFound;
        if (longestWordLengthModal) longestWordLengthModal.textContent = longestWordLength;
        
        if (longestWordDisplay) longestWordDisplay.textContent = globalLongestWordFound ? `${globalLongestWordFound} (${globalLongestWordLength})` : 'N/A';

        // --- Word Length Distribution Chart ---
        const chartSection = document.getElementById('stats-chart-section');
        const chartCanvas = document.getElementById('word-length-chart');
        const modalWordListContainer = document.querySelector('.modal-word-list-container');
        if (chartSection && chartCanvas && modalWordListContainer) {
            const isListView = statsModal.classList.contains('list-view');
            // Toggle visibility of the entire chart section (header + canvas)
            chartSection.style.display = isListView ? 'none' : '';
            modalWordListContainer.style.display = isListView ? 'flex' : 'none';

            // Responsive chart sizing for mobile
            let chartWidth = 350;
            let chartHeight = 180;
            if (window.innerWidth <= 600) {
                chartWidth = Math.min(window.innerWidth * 0.85, 350);
                chartHeight = Math.max(120, Math.floor(chartWidth * 0.5));
            }
            chartCanvas.width = chartWidth;
            chartCanvas.height = chartHeight;

            if (!isListView && window.Chart) {
                // Gather word length data for today
                const wordLengths = {};
                foundWords.forEach(word => {
                    const len = word.length;
                    wordLengths[len] = (wordLengths[len] || 0) + 1;
                });
                // Sort lengths numerically
                const sortedLengths = Object.keys(wordLengths).map(Number).sort((a, b) => a - b);
                const labels = sortedLengths;
                const data = sortedLengths.map(len => wordLengths[len]);

                // Destroy previous chart instance if exists
                if (chartCanvas._chartInstance) {
                    chartCanvas._chartInstance.destroy();
                }

                chartCanvas._chartInstance = new Chart(chartCanvas, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Words by Length',
                            data: data,
                            fill: false,
                            borderColor: 'rgba(0, 123, 255, 1)',
                            backgroundColor: 'rgba(0, 123, 255, 0.7)',
                            tension: 0.2,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: 'rgba(0, 123, 255, 1)',
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: false,
                        plugins: {
                            legend: { display: false },
                            title: { display: false }
                        },
                        scales: {
                            x: {
                                title: { display: true, text: 'Number of Letters' },
                                ticks: {
                                    color: document.body.classList.contains('light-mode') ? '#222' : '#fff'
                                },
                                grid: {
                                    color: document.body.classList.contains('light-mode') ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'
                                }
                            },
                            y: {
                                title: { display: true, text: 'Number of Words' },
                                beginAtZero: true,
                                ticks: {
                                    color: document.body.classList.contains('light-mode') ? '#222' : '#fff',
                                    precision: 0
                                },
                                grid: {
                                    color: document.body.classList.contains('light-mode') ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'
                                }
                            }
                        }
                    }
                });
            } else if (chartCanvas._chartInstance) {
                chartCanvas._chartInstance.destroy();
                chartCanvas._chartInstance = null;
            }
        }
    }

    function saveGameState() {
        localStorage.setItem(LOCAL_STORAGE_FOUND_WORDS_KEY, JSON.stringify(Array.from(foundWords)));
        localStorage.setItem(LOCAL_STORAGE_HIGHLIGHTED_CELLS_KEY, JSON.stringify(Array.from(permanentlyHighlightedCells)));
        localStorage.setItem(LOCAL_STORAGE_DATE_SEED_KEY, getDateSeed().toString());
        localStorage.setItem(LOCAL_STORAGE_TOTAL_WORDS_KEY, totalWordsFound.toString());
        localStorage.setItem(LOCAL_STORAGE_LONGEST_WORD_KEY, longestWordLength.toString());
        localStorage.setItem(LOCAL_STORAGE_DAILY_LONGEST_WORD_KEY, dailyLongestWordFound);
        localStorage.setItem(LOCAL_STORAGE_FOUND_PATHS_KEY, JSON.stringify(foundWordPaths));
        
        // Also save the current time remaining.
        localStorage.setItem(LOCAL_STORAGE_TIME_REMAINING_KEY, timeRemaining.toString());

        localStorage.setItem(LOCAL_STORAGE_GLOBAL_LONGEST_WORD_LENGTH_KEY, globalLongestWordLength.toString());
        localStorage.setItem(LOCAL_STORAGE_GLOBAL_LONGEST_WORD_KEY, globalLongestWordFound);
        localStorage.setItem(LOCAL_STORAGE_GLOBAL_HIGHEST_SCORE_KEY, globalHighestScore.toString());
        localStorage.setItem(LOCAL_STORAGE_CURRENT_SCORE_KEY, score.toString()); // Save current score

        console.log("Game state saved to localStorage.");
    }

    function loadGameState() {
        const savedDateSeed = localStorage.getItem(LOCAL_STORAGE_DATE_SEED_KEY);
        const currentDateSeed = getDateSeed().toString();

        const savedGlobalLongestWordLength = localStorage.getItem(LOCAL_STORAGE_GLOBAL_LONGEST_WORD_LENGTH_KEY);
        const savedGlobalLongestWord = localStorage.getItem(LOCAL_STORAGE_GLOBAL_LONGEST_WORD_KEY);
        const savedGlobalHighestScore = localStorage.getItem(LOCAL_STORAGE_GLOBAL_HIGHEST_SCORE_KEY);
        const savedCurrentScore = localStorage.getItem(LOCAL_STORAGE_CURRENT_SCORE_KEY); // Load current score

        if (savedGlobalLongestWordLength && !isNaN(parseInt(savedGlobalLongestWordLength, 10))) {
            globalLongestWordLength = parseInt(savedGlobalLongestWordLength, 10);
        }
        if (savedGlobalLongestWord) {
            globalLongestWordFound = savedGlobalLongestWord;
        }
        if (savedGlobalHighestScore && !isNaN(parseInt(savedGlobalHighestScore, 10))) {
            globalHighestScore = parseInt(savedGlobalHighestScore, 10);
        }
        if (savedCurrentScore && !isNaN(parseInt(savedCurrentScore, 10))) {
            score = parseInt(savedCurrentScore, 10);
        } else {
            score = 0;
        }
        updateGlobalHighestScoreDisplay();
        updateScoreDisplay();

        // Only reset daily progress if the date has changed (not on viewport/device change)
        if (savedDateSeed !== currentDateSeed) {
    // Only clear daily progress, not global stats or settings
    localStorage.removeItem(LOCAL_STORAGE_FOUND_WORDS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_HIGHLIGHTED_CELLS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_TOTAL_WORDS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_LONGEST_WORD_KEY);
    localStorage.removeItem(LOCAL_STORAGE_DAILY_LONGEST_WORD_KEY);
    localStorage.removeItem(LOCAL_STORAGE_TIME_REMAINING_KEY);
    localStorage.removeItem(LOCAL_STORAGE_FOUND_PATHS_KEY);
    localStorage.setItem(LOCAL_STORAGE_DATE_SEED_KEY, currentDateSeed);

    foundWords = new Set();
    permanentlyHighlightedCells = new Set();
    totalWordsFound = 0;
    longestWordLength = 0;
    dailyLongestWordFound = '';
    foundWordPaths = [];
    wordList.innerHTML = '';
    if (modalWordList) {
        modalWordList.innerHTML = '';
    }
    // --- Reset score to 0 and update display ---
    score = 0;
    localStorage.setItem(LOCAL_STORAGE_CURRENT_SCORE_KEY, "0");
    updateScoreDisplay();
    return false;
}

        const savedFoundWords = localStorage.getItem(LOCAL_STORAGE_FOUND_WORDS_KEY);
        const savedHighlightedCells = localStorage.getItem(LOCAL_STORAGE_HIGHLIGHTED_CELLS_KEY);
        const savedTotalWords = localStorage.getItem(LOCAL_STORAGE_TOTAL_WORDS_KEY);
        const savedLongestWord = localStorage.getItem(LOCAL_STORAGE_LONGEST_WORD_KEY);
        const savedDailyLongestWord = localStorage.getItem(LOCAL_STORAGE_DAILY_LONGEST_WORD_KEY);
        const savedFoundPaths = localStorage.getItem(LOCAL_STORAGE_FOUND_PATHS_KEY);

        if (savedFoundWords) {
            foundWords = new Set(JSON.parse(savedFoundWords));
            foundWords.forEach(word => addWordToList(word));
            console.log("Found words loaded:", foundWords);
        }
        if (savedHighlightedCells) {
            permanentlyHighlightedCells = new Set(JSON.parse(savedHighlightedCells));
            console.log("Permanently highlighted cells loaded:", permanentlyHighlightedCells);
        }
        if (savedTotalWords && !isNaN(parseInt(savedTotalWords, 10))) {
            totalWordsFound = parseInt(savedTotalWords, 10);
        }
        if (savedLongestWord && !isNaN(parseInt(savedLongestWord, 10))) {
            longestWordLength = parseInt(savedLongestWord, 10);
        }
        if (savedDailyLongestWord) {
            dailyLongestWordFound = savedDailyLongestWord;
        }
        if (savedFoundPaths) {
            foundWordPaths = JSON.parse(savedFoundPaths);
        }

        return true;
    }

    // --- Theme Management ---
function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    console.log(`Theme applied: ${theme}`);
}

function loadTheme() {
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'dark'; // Default to dark
    applyTheme(savedTheme);
    if (themeToggleButton) {
        themeToggleButton.checked = (savedTheme === 'light');
    }
}

// --- Eye Comfort Mode ---
    function applyEyeComfortMode(isComfort) {
        if (isComfort) {
            document.body.classList.add('eye-comfort-mode');
        } else {
            document.body.classList.remove('eye-comfort-mode');
        }
        console.log(`Eye Comfort Mode applied: ${isComfort}`);
    }

    function loadEyeComfortMode() {
        const savedComfortMode = localStorage.getItem(LOCAL_STORAGE_EYE_COMFORT_KEY) === 'true';
        applyEyeComfortMode(savedComfortMode);
        if (eyeComfortToggle) {
            eyeComfortToggle.checked = savedComfortMode;
        }
    }

    // --- Game Mode Management ---
    function saveGameMode(mode) {
        localStorage.setItem(LOCAL_STORAGE_GAME_MODE_KEY, mode);
        currentGameMode = mode;
        console.log(`Game mode saved: ${mode}`);
    }

    function loadGameMode() {
        const savedMode = localStorage.getItem(LOCAL_STORAGE_GAME_MODE_KEY) || 'standard';
        currentGameMode = savedMode;
        const radioToCheck = document.getElementById(`mode-${savedMode}`);
        if (radioToCheck) {
            radioToCheck.checked = true;
        }
        console.log(`Game mode loaded: ${currentGameMode}`);
    }

    function getGameModeDescription(mode) {
    switch (mode) {
        case 'relaxed':
            return `<b>Relaxed Mode:</b> Take your time and enjoy searching for words with no ticking clock. The grid is big, so you can explore at your own pace!`;
        case 'challenging':
            return `<b>Challenging Mode:</b> Race against a shorter timer and a smaller grid. It's fast, intense, and perfect if you love a tough challenge!<br><br><span style="color:#c00;font-weight:bold;">Just a heads up: In Challenging Mode, once you play a word, it can't be deleted—so choose carefully!</span>`;
        case 'standard':
        default:
            return `<b>Standard Mode:</b> The classic daily puzzle. Plenty of time and a big grid—great for casual play and improving your skills!`;
    }
}

    function showGameModeChangeConfirmation(newMode) {
        confirmationTitle.textContent = "Change Game Mode?";
        confirmationMessage.innerHTML =
            getGameModeDescription(newMode) +
            "<br><br>Changing the game mode will restart the daily puzzle, and <b>all of today's progress will be lost.</b><br><br>Are you sure you want to continue?";
        
        confirmYesButton.textContent = "Confirm";
        confirmYesButton.className = 'danger-button'; // Ensure it's the red, destructive action button

        confirmNoButton.textContent = "Cancel";

        confirmYesButton.onclick = () => {
            saveGameMode(newMode);

            // Only update vignette/glow here, after confirmation
            updateGameModeIndicator(newMode);

            // Reset daily score to 0 and update display immediately
            score = 0;
            localStorage.setItem(LOCAL_STORAGE_CURRENT_SCORE_KEY, "0");
            const scoreElement = document.getElementById('score-display');
            if (scoreElement) scoreElement.textContent = "Score: 0";

            // Set timer duration for the selected mode
            if (newMode === 'challenging') {
                localStorage.removeItem('seededLetterGridTimerDuration');
                localStorage.removeItem(LOCAL_STORAGE_TIME_REMAINING_KEY);
                localStorage.setItem('seededLetterGridTimerDuration', (10 * 60).toString()); // 10 minutes
            } else if (newMode === 'relaxed') {
                localStorage.removeItem('seededLetterGridTimerDuration');
                localStorage.removeItem(LOCAL_STORAGE_TIME_REMAINING_KEY);
                localStorage.setItem('seededLetterGridTimerDuration', (20 * 60).toString());
            } else {
                localStorage.removeItem('seededLetterGridTimerDuration');
                localStorage.removeItem(LOCAL_STORAGE_TIME_REMAINING_KEY);
                localStorage.setItem('seededLetterGridTimerDuration', (15 * 60).toString()); // 15 minutes
            }

            // Grid size logic
            if (newMode === 'challenging') {
                localStorage.setItem(LOCAL_STORAGE_GRID_SIZE_KEY, '40');
            } else if (newMode === 'relaxed') {
                localStorage.setItem(LOCAL_STORAGE_GRID_SIZE_KEY, '50');
            } else {
                localStorage.removeItem(LOCAL_STORAGE_GRID_SIZE_KEY);
            }

            // Clear daily progress and stats
            localStorage.removeItem(LOCAL_STORAGE_FOUND_WORDS_KEY);
            localStorage.removeItem(LOCAL_STORAGE_HIGHLIGHTED_CELLS_KEY);
            localStorage.removeItem(LOCAL_STORAGE_FOUND_PATHS_KEY);
            localStorage.removeItem(LOCAL_STORAGE_TOTAL_WORDS_KEY);
            localStorage.removeItem(LOCAL_STORAGE_LONGEST_WORD_KEY);
            localStorage.removeItem(LOCAL_STORAGE_DAILY_LONGEST_WORD_KEY);

            foundWords.clear();
            permanentlyHighlightedCells.clear();
            foundWordPaths = [];
            totalWordsFound = 0;
            longestWordLength = 0;
            dailyLongestWordFound = '';

            // Ensure timer is reset for new mode
            localStorage.removeItem(LOCAL_STORAGE_TIME_REMAINING_KEY);

            // Set timeRemaining and update timer display immediately for visual feedback
            if (newMode === 'challenging') {
                timeRemaining = 10 * 60;
                gameTimerDisplay.style.display = ""; // Show timer
                updateTimerDisplay();
            } else if (newMode === 'relaxed') {
                timeRemaining = 20 * 60;
                gameTimerDisplay.style.display = "none"; // Hide timer
            } else {
                timeRemaining = 15 * 60;
                gameTimerDisplay.style.display = ""; // Show timer
                updateTimerDisplay();
            }

            setTimeout(() => {
                location.reload();
            }, 50);
};
        confirmNoButton.onclick = () => {
            // Revert the radio button selection to the currently saved mode
            const radioToRevert = document.getElementById(`mode-${currentGameMode}`);
            if (radioToRevert) {
                radioToRevert.checked = true;
            }
            hideActiveModal();
        };

        showModal(confirmationModal);
    }
    // Centering the grid within the scrollable panel
    function centerGridInView(cellSize, gap) {
        // The requestAnimationFrame was causing a timing issue where the zoom animation
        // would start before the grid was scrolled into position.
        // Making this call synchronous for the initial load ensures correct ordering.
        if (gridPanel && cellSize > 0) {
            // Center on the middle row and column for any grid size
            const targetRow = Math.floor(GRID_SIZE / 2);
            const targetCol = Math.floor(GRID_SIZE / 2);

            // Calculate the center coordinate of the target cell, accounting for gaps
            const cellCenterX = (targetCol * (cellSize + gap)) + (cellSize / 2);
            const cellCenterY = (targetRow * (cellSize + gap)) + (cellSize / 2);

            // Calculate the center of the viewport (the grid panel)
            const panelCenterX = gridPanel.clientWidth / 2;
            const panelCenterY = gridPanel.clientHeight / 2;

            // Set the scroll position to align the cell's center with the panel's center
            gridPanel.scrollLeft = cellCenterX - panelCenterX;
            gridPanel.scrollTop = cellCenterY - panelCenterY;

            console.log(`Grid centering on cell (${targetRow},${targetCol}): Scroll Left ${gridPanel.scrollLeft}, Scroll Top ${gridPanel.scrollTop}.`);
        }
    }


// --- Efficient Grid Rendering: Only update changed cells ---
function renderGrid(grid) {
    // Calculate cell and font sizes as before
    const largeCells = getLargeCellsSetting();
    const isMobileView = isMobile();
    const MIN_CELL_SIZE = (largeCells && isMobileView) ? 48 : 35;
    const MIN_FONT_SIZE = (largeCells && isMobileView) ? 30 : 22;
    let cellSize = MIN_CELL_SIZE;
    let fontSize = MIN_FONT_SIZE;
    const availablePanelWidth = gridPanel.clientWidth;
    const availablePanelHeight = gridPanel.clientHeight;
    const idealCellSizeX = availablePanelWidth / GRID_SIZE;
    const idealCellSizeY = availablePanelHeight / GRID_SIZE;
    cellSize = Math.max(MIN_CELL_SIZE, Math.min(idealCellSizeX, idealCellSizeY));
    fontSize = Math.max(MIN_FONT_SIZE, Math.floor(cellSize * 0.7));
    currentCellSize = cellSize;

    // Set transform origin and grid template as before
   
    const targetRow = 20, targetCol = 20;
    const originX = (targetCol * (cellSize + GRID_GAP)) + (cellSize / 2);
    const originY = (targetRow * (cellSize + GRID_GAP)) + (cellSize / 2);
    gameGridContainer.style.transformOrigin = `${originX}px ${originY}px`;
    gameGridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${cellSize}px)`;
    gameGridContainer.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${cellSize}px)`;

    // --- Efficient update: Only update changed cells ---
    // If the grid is not present or the number of children is wrong, rebuild all
    let needsFullRebuild = false;
    if (gameGridContainer.children.length !== GRID_SIZE * GRID_SIZE) {
        needsFullRebuild = true;
    }

    if (needsFullRebuild) {
        gameGridContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let rowIndex = 0; rowIndex < GRID_SIZE; rowIndex++) {
            for (let colIndex = 0; colIndex < GRID_SIZE; colIndex++) {
                const cellData = grid[rowIndex][colIndex];
                const cellElement = document.createElement('div');
                cellElement.classList.add('grid-cell');
                cellElement.textContent = cellData;
                cellElement.dataset.row = rowIndex;
                cellElement.dataset.col = colIndex;
                cellElement.style.fontSize = `${fontSize}px`;
                const cellKey = `${rowIndex}_${colIndex}`;
                if (permanentlyHighlightedCells.has(cellKey)) {
                    toggleCellSelected(cellElement, true);
                }
                cellElement.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                });
                cellElement.addEventListener('mouseup', handleCellClick);
                fragment.appendChild(cellElement);
            }
        }
        gameGridContainer.appendChild(fragment);
    } else {
        // Only update changed cells
        for (let rowIndex = 0; rowIndex < GRID_SIZE; rowIndex++) {
            for (let colIndex = 0; colIndex < GRID_SIZE; colIndex++) {
                const idx = rowIndex * GRID_SIZE + colIndex;
                const cellElement = gameGridContainer.children[idx];
                const cellData = grid[rowIndex][colIndex];
                // Update text if needed
                if (cellElement.textContent !== cellData) {
                    cellElement.textContent = cellData;
                }
                // Update font size
                cellElement.style.fontSize = `${fontSize}px`;
                // Update selected state
                const cellKey = `${rowIndex}_${colIndex}`;
                if (permanentlyHighlightedCells.has(cellKey)) {
                    toggleCellSelected(cellElement, true);
                } else {
                    toggleCellSelected(cellElement, false);
                }
                // Update data attributes if needed
                if (cellElement.dataset.row != rowIndex) cellElement.dataset.row = rowIndex;
                if (cellElement.dataset.col != colIndex) cellElement.dataset.col = colIndex;
            }
        }
    }

    // Set the size of the SVG overlay to match the grid's full scrollable size
    if (pathOverlay) {
        const totalGridSize = GRID_SIZE * cellSize + (GRID_SIZE - 1) * GRID_GAP;
        pathOverlay.setAttribute('viewBox', `0 0 ${totalGridSize} ${totalGridSize}`);
        pathOverlay.style.width = `${totalGridSize}px`;
        pathOverlay.style.height = `${totalGridSize}px`;
        redrawAllFoundPaths(cellSize, GRID_GAP);
    }

    clearWordPath();
    centerGridInView(cellSize, GRID_GAP);

    // Log dimensions after rendering to confirm overflow
    console.log(`Grid Panel Dimensions (Viewport): clientWidth=${gridPanel.clientWidth}px, clientHeight=${gridPanel.clientHeight}px`);
    console.log(`Game Grid Dimensions (Content): scrollWidth=${gameGridContainer.scrollWidth}px, scrollHeight=${gameGridContainer.scrollHeight}px`);
}

    // --- Debounced Resize Handler (more robust, reusable) ---
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function handleResize() {
        renderGrid(currentGrid);
        updateStatsDisplay();
        updateVignetteVisibility();
    }

    // --- Grid Drag Scrolling Logic ---
    let isMouseDownOnGridPanel = false; // Flag for mouse down on the scrollable panel
    let startMouseX; 
    let startMouseY; 
    let startScrollLeft; 
    let startScrollTop; 

    function initGridDragScrolling() {
        // Attach mousedown to gridPanel, as it is the element with overflow
        gridPanel.addEventListener('mousedown', (e) => {
            // Only start drag if it's the left mouse button (button 0)
            if (e.button !== 0) return; 
            
            isMouseDownOnGridPanel = true;
            startMouseX = e.pageX;
            startMouseY = e.pageY;
            startScrollLeft = gridPanel.scrollLeft;
            startScrollTop = gridPanel.scrollTop;
            gridPanel.classList.add('grabbing'); // Optional: show grabbing cursor
            console.log("Drag logic: Mouse Down initiated on gridPanel.");
        });

        document.addEventListener('mousemove', (e) => {
            if (!isMouseDownOnGridPanel) return; 
            e.preventDefault(); 

            const dx = e.pageX - startMouseX;
            const dy = e.pageY - startMouseY;

            // Determine if movement exceeds the drag threshold
           

            if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                isDraggingGrid = true; 
            }

            // Apply scroll to gridPanel, as it is the scrollable element
            gridPanel.scrollLeft = startScrollLeft - dx;
            gridPanel.scrollTop = startScrollTop - dy;
        });

        document.addEventListener('mouseup', () => {
            if (!isMouseDownOnGridPanel) return; 
            isMouseDownOnGridPanel = false;
            gridPanel.classList.remove('grabbing');
            isDraggingGrid = false; // <-- Reset drag flag here
            console.log("Drag logic: Mouse Up. isDraggingGrid:", isDraggingGrid);
        });

        document.addEventListener('mouseleave', (e) => {
            if (isMouseDownOnGridPanel && e.target.nodeName === 'HTML') { 
                isMouseDownOnGridPanel = false;
                gridPanel.classList.remove('grabbing');
                isDraggingGrid = false; // <-- Reset drag flag here
                console.log("Drag logic: Mouse left document while dragging.");
            }
        });
    }

    gridPanel.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(updateVignetteVisibility);
            isScrolling = true;
        }
    });


    // --- Menu and Modal Handlers ---

    function openMenu() {
        menuPanel.classList.add('open');
        document.body.classList.add('menu-open');
    }

    function closeMenu() {
        menuPanel.classList.remove('open');
        document.body.classList.remove('menu-open');
    }

    function showModal(modalElement) {
        if (!modalElement) return;

        // Pause timer only when the first modal in the stack is opened
        if (modalStack.length === 0) {
            if (!isTimeUp) {
                stopTimer();
                localStorage.setItem(LOCAL_STORAGE_TIME_REMAINING_KEY, timeRemaining.toString());
                console.log("Timer paused due to modal opening.");
            }
        }

        // Hide the current top-most modal before showing the new one
        if (modalStack.length > 0) {
            const topModal = modalStack[modalStack.length - 1];
            topModal.classList.remove('show');
        }

        modalStack.push(modalElement);
        modalOverlay.classList.add('show');
        modalElement.classList.add('show');
        document.body.classList.add('modal-open');
        closeMenu();
    }

    function hideActiveModal() {
        if (modalStack.length === 0) return;

        const currentModal = modalStack.pop();
        currentModal.classList.remove('show');

        // When closing the stats modal, always remove the list-view class to reset its state
        if (currentModal.id === 'stats-modal') {
            currentModal.classList.remove('list-view');
        }

        if (modalStack.length > 0) {
            // Show the underlying modal
            const previousModal = modalStack[modalStack.length - 1];
            previousModal.classList.add('show');
        } else {
            // This was the last modal, so hide the overlay and resume the timer
            modalOverlay.classList.remove('show');
            document.body.classList.remove('modal-open');

            if (!isTimeUp && !document.hidden) {
                startTimer();
                console.log("Timer resumed after all modals closed.");
            }
        }
    }

    function hideAllModals() {
        while (modalStack.length > 0) {
            const modal = modalStack.pop();
            modal.classList.remove('show');
        }
        modalOverlay.classList.remove('show');
        document.body.classList.remove('modal-open');

        // Resume timer if it was paused by the modal stack
        if (!isTimeUp && !document.hidden) {
            startTimer();
            console.log("Timer resumed after all modals closed.");
        }
    }

    // --- Event Listeners ---
    verifyButton.addEventListener('click', handleVerifyClick);

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            clearWordPath();
        });
    }

    // Collapsible "Words Found" section
    if (foundWordsHeader && foundWordsSection) {
        foundWordsHeader.addEventListener('click', () => {
            foundWordsSection.classList.toggle('collapsed');
        });
    }

    if (headerStats) {
        headerStats.addEventListener('click', () => {
            // The button-like behavior is only intended for mobile view.
            if (window.innerWidth <= 768) {
                if (statsModalTitle) statsModalTitle.textContent = 'Words Found';
                statsModal.classList.add('list-view');
                updateStatsDisplay(); // Ensure chart visibility is updated
                showModal(statsModal);
            }
        });
    }

    hamburgerMenu.addEventListener('click', openMenu);
    closeMenuButton.addEventListener('click', closeMenu);

    menuStatsButton.addEventListener('click', (e) => {
        e.preventDefault();
        updateStatsDisplay();
        // Ensure modal is in its default state when opened from the menu
        if (statsModalTitle) statsModalTitle.textContent = 'Stats';
        statsModal.classList.remove('list-view');
        showModal(statsModal);
    });

    menuShareButton.addEventListener('click', (e) => {
        e.preventDefault();

        // Reset the share modal to its default state before showing
        if (shareModalTitle) shareModalTitle.textContent = "Share Your Score";
        if (shareModalButtons) shareModalButtons.style.display = 'flex';

        // Ensure the extra info text is hidden for a normal share
        if (shareModalInfo) {
            shareModalInfo.style.display = 'none';
        }

        // --- FIX: Always enable and show Facebook and Copy Link buttons ---
        if (shareFacebookButton) {
            shareFacebookButton.disabled = false;
            shareFacebookButton.style.display = '';
        }
        if (copyShareLinkButton) {
            copyShareLinkButton.disabled = false;
            copyShareLinkButton.style.display = '';
        }

        shareTextPreview.innerHTML = getShareMessage(); // Use innerHTML for consistency
        showModal(shareModal);
    });

    menuSettingsButton.addEventListener('click', (e) => {
        e.preventDefault();
        // Future logic for populating settings can go here
        showModal(settingsModal);
    });

    menuRulesButton.addEventListener('click', (e) => {
        e.preventDefault();
        setupRulesCarousel();
        // Reset to the first rule every time the modal is opened
        currentRuleIndex = 0;
        showRule(currentRuleIndex);
        showModal(rulesModal);
    });

    closeStatsModalButton.addEventListener('click', hideActiveModal);
    closeDefinitionModalButton.addEventListener('click', hideActiveModal);
    closeShareModalButton.addEventListener('click', hideActiveModal);
    closeSettingsModalButton.addEventListener('click', hideActiveModal);
    closeNotificationModalButton.addEventListener('click', hideActiveModal);
    closeRulesModalButton.addEventListener('click', hideActiveModal);

    if (rulesBackButton) {
        rulesBackButton.addEventListener('click', () => {
            if (currentRuleIndex > 0) {
                showRule(currentRuleIndex - 1);
            }
        });
    }

    if (rulesForwardButton) {
        rulesForwardButton.addEventListener('click', () => {
            if (currentRuleIndex < gameRules.length - 1) {
                showRule(currentRuleIndex + 1);
            }
        });
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('change', () => {
            const newTheme = themeToggleButton.checked ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem(LOCAL_STORAGE_THEME_KEY, newTheme);
        });
    }

    if (eyeComfortToggle) {
        eyeComfortToggle.addEventListener('change', () => {
            const isComfort = eyeComfortToggle.checked;
            applyEyeComfortMode(isComfort);
            localStorage.setItem(LOCAL_STORAGE_EYE_COMFORT_KEY, isComfort.toString());
        });
    }

    if (gameModeSelector) {
        gameModeSelector.addEventListener('change', (event) => {
            const newMode = event.target.value;
            if (newMode === currentGameMode) return; // No change

            // Remove this line so vignette does NOT update immediately:
            // updateGameModeIndicator(newMode);

            // Always clear the saved timer for today so the new mode's timer is used
            localStorage.removeItem(LOCAL_STORAGE_TIME_REMAINING_KEY);

            // Always show the confirmation modal with the mode description
            showGameModeChangeConfirmation(newMode);
        });
    }
    if (deleteDataButton) {
    deleteDataButton.addEventListener('click', () => {
        const isConfirmed = window.confirm("Are you sure you want to delete all your saved data? This action cannot be undone.");
        if (isConfirmed) {
            console.log("User confirmed data deletion. Clearing localStorage...");
            // Remove all relevant keys
            localStorage.removeItem(LOCAL_STORAGE_FOUND_WORDS_KEY);
            localStorage.removeItem(LOCAL_STORAGE_HIGHLIGHTED_CELLS_KEY);
            localStorage.removeItem(LOCAL_STORAGE_DATE_SEED_KEY);
            localStorage.removeItem(LOCAL_STORAGE_TOTAL_WORDS_KEY);
            localStorage.removeItem(LOCAL_STORAGE_LONGEST_WORD_KEY);
            localStorage.removeItem(LOCAL_STORAGE_DAILY_LONGEST_WORD_KEY);
            localStorage.removeItem(LOCAL_STORAGE_GLOBAL_LONGEST_WORD_LENGTH_KEY);
            localStorage.removeItem(LOCAL_STORAGE_GLOBAL_LONGEST_WORD_KEY);
            localStorage.removeItem(LOCAL_STORAGE_THEME_KEY);
            localStorage.removeItem(LOCAL_STORAGE_TIME_REMAINING_KEY);
            localStorage.removeItem(LOCAL_STORAGE_FOUND_PATHS_KEY);
            localStorage.removeItem(LOCAL_STORAGE_GRID_SIZE_KEY);
            localStorage.removeItem(LOCAL_STORAGE_RULES_SEEN_KEY);
            localStorage.removeItem(LOCAL_STORAGE_GAME_MODE_KEY);
            localStorage.setItem('seededLetterGridTimerDuration', (15 * 60).toString()); // <-- Add this line

            // Reset daily score to 0 and update display immediately
            score = 0;
            localStorage.setItem(LOCAL_STORAGE_CURRENT_SCORE_KEY, "0");
            const scoreElement = document.getElementById('score-display');
            if (scoreElement) scoreElement.textContent = "Score: 0";

            // Reload the page to apply the reset state
            location.reload();
        }
    });
}

    shareXButton.addEventListener('click', () => {
        const shareData = generateShareText();
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        openShareWindow(twitterUrl);
    });
    
    // FIX: Ensure Facebook and Copy Link buttons work
    if (shareFacebookButton) {
    shareFacebookButton.addEventListener('click', () => {
        // Use plain text for copying to clipboard
        const shareData = generateShareText();
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;

        if (navigator.share) {
            navigator.clipboard.writeText(getShareMessagePlain()).then(() => {
                showNotificationModal(
                    "Score Copied!", 
                    "Your score has been copied. The share dialog will open shortly."
                );
            }).catch(err => {
                showNotificationModal(
                    "Preparing Share", 
                    "Your score is being prepared. The share dialog will open shortly."
                );
            }).finally(() => {
                setTimeout(() => {
                    hideActiveModal();
                    navigator.share({
                        title: 'SearchWord Game Score',
                        text: getShareMessagePlain(),
                        url: shareData.url
                    }).then(() => {
                        hideAllModals();
                    }).catch((error) => {
                        if (error.name !== 'AbortError') {
                            showNotificationModal("Share Failed", "Could not open the share dialog. Please try again.");
                        }
                    });
                }, 2000);
            });
        } else {
            navigator.clipboard.writeText(`${getShareMessagePlain()} ${shareData.url}`).then(() => {
                showNotificationModal("Text Copied!", "Paste your score into the Facebook window when it appears.");
                setTimeout(() => {
                    hideAllModals();
                    openShareWindow(facebookUrl);
                }, 2000);
            }).catch(err => {
                showNotificationModal("Copy Failed", "Could not copy text automatically. Please try again or copy it manually.");
                setTimeout(() => {
                    hideAllModals();
                    openShareWindow(facebookUrl);
                }, 2500);
            });
        }
    });
}

    if (copyShareLinkButton) {
    copyShareLinkButton.addEventListener('click', () => {
        const shareData = generateShareText();
        // Use plain text for copying
        const fullTextToCopy = `${getShareMessagePlain()} ${shareData.url}`;

        navigator.clipboard.writeText(fullTextToCopy).then(() => {
            const originalText = copyShareLinkText.textContent;
            copyShareLinkText.textContent = 'Copied!';
            copyShareLinkButton.disabled = true;
            setTimeout(() => {
                copyShareLinkText.textContent = originalText;
                copyShareLinkButton.disabled = false;
            }, 2000);
        }).catch(err => {
            const originalText = copyShareLinkText.textContent;
            copyShareLinkText.textContent = 'Failed!';
            copyShareLinkButton.disabled = true;
            setTimeout(() => {
                copyShareLinkText.textContent = originalText;
                copyShareLinkButton.disabled = false;
            }, 2000);
        });
    });
}

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            console.log("Overlay clicked, attempting to hide modal...");
            hideActiveModal();
        }
    });

    function handleWordListClick(event) {
        const listItem = event.target.closest('li');
        if (listItem) {
            const word = listItem.dataset.word;
            if (word) {
                fetchAndShowDefinition(word);
            }
        }
    }

    wordList.addEventListener('click', handleWordListClick);
    if (modalWordList) {
        modalWordList.addEventListener('click', handleWordListClick);
    }

function setTimerDurationForMode(mode) {
    // Check if a custom timer duration is set in localStorage (for mode change)
    const customDuration = localStorage.getItem('seededLetterGridTimerDuration');
    if (customDuration && !isNaN(parseInt(customDuration, 10))) {
        TIMER_DURATION = parseInt(customDuration, 10);
    } else {
        switch (mode) {
            case 'relaxed':
                TIMER_DURATION = 20 * 60; // 20 minutes
                break;
            case 'challenging':
                TIMER_DURATION = 10 * 60; // 10 minutes
                break;
            case 'standard':
            default:
                TIMER_DURATION = 15 * 60; // 15 minutes
        }
    }
    debugLog(`Timer duration set to ${TIMER_DURATION / 60} minutes for ${mode} mode.`);
}

    function initializeTimer() {
        const savedMode = localStorage.getItem(LOCAL_STORAGE_GAME_MODE_KEY) || 'standard';
        setTimerDurationForMode(savedMode);
        // Only use saved time if it's valid and positive
        const savedTime = localStorage.getItem(LOCAL_STORAGE_TIME_REMAINING_KEY);
        if (savedTime !== null && !isNaN(parseInt(savedTime, 10)) && parseInt(savedTime, 10) > 0) {
            timeRemaining = parseInt(savedTime, 10);
        } else {
            timeRemaining = TIMER_DURATION;
        }
        isTimeUp = (timeRemaining <= 0);
        debugLog(`Timer initialized for ${savedMode} mode with ${timeRemaining} seconds.`);
    }

    // --- Initial Setup ---
loadTheme();
loadEyeComfortMode();
loadGameMode();

// Hide timer if mode is relaxed
if (currentGameMode === 'relaxed' && gameTimerDisplay) {
    gameTimerDisplay.style.display = "none";
} else if (gameTimerDisplay) {
    gameTimerDisplay.style.display = "";
}

const isNewGame = !loadGameState(); // Only loads words, grid, etc.
currentGrid = generateGrid();
updateStatsDisplay();
renderGrid(currentGrid);
updateCurrentWordDisplay();
initGridDragScrolling();
initializeTimer(); // Only here!

// Start the timer after everything is loaded
if (currentGameMode !== 'relaxed') {
    if (!isTimeUp) {
        updateTimerDisplay(); // Show initial time
        if (!document.hidden) {
            startTimer();
        }
    } else {
        handleTimeUp(); // Ensure UI is in "time up" state
    }
}
    
    // Use debounced handler for resize
    window.addEventListener('resize', debounce(handleResize, 150));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Re-render the grid on window.load. This ensures that the grid is built
    // using the final, correct dimensions of its container after all CSS has been applied,
    // and then it gets centered correctly on the target cell.
    window.addEventListener('load', () => {
        console.log("Window fully loaded. Re-rendering grid for accurate sizing and centering.");
        renderGrid(currentGrid);
        // Add a class to trigger the initial zoom animation
        gameGridContainer.classList.add('initial-zoom');

        // Check if the user has seen the rules before.
        const rulesSeen = localStorage.getItem(LOCAL_STORAGE_RULES_SEEN_KEY);
        if (!rulesSeen) {
            // If not, show the rules modal automatically after a short delay.
            setTimeout(() => {
                setupRulesCarousel();
                currentRuleIndex = 0;
                showRule(currentRuleIndex);
                showModal(rulesModal);
                // Mark the rules as seen so they don't show again.
                localStorage.setItem(LOCAL_STORAGE_RULES_SEEN_KEY, 'true');
            }, 800);
        }

        // Set initial vignette state
        updateVignetteVisibility();
    });

function updateGameModeIndicator(mode) {
    const gridPanelWrapper = document.querySelector('.grid-panel-wrapper');
    if (gridPanelWrapper) {
        gridPanelWrapper.classList.remove('relaxed-glow', 'challenging-glow', 'standard-glow');
        if (mode === 'relaxed') gridPanelWrapper.classList.add('relaxed-glow');
        else if (mode === 'challenging') gridPanelWrapper.classList.add('challenging-glow');
        else gridPanelWrapper.classList.add('standard-glow');
    }

    // Then update the indicator if present
    const indicator = document.getElementById('game-mode-indicator');
    if (!indicator) return;
    indicator.textContent = 
        mode === 'relaxed' ? 'Relaxed Mode' :
        mode === 'challenging' ? 'Challenging Mode' :
        'Standard Mode';
    indicator.classList.remove('relaxed', 'challenging', 'standard');
    indicator.classList.add(mode);
    indicator.className = `mode-indicator ${mode}`;
}

// Call this after loading or changing the mode:
updateGameModeIndicator(currentGameMode);
});

