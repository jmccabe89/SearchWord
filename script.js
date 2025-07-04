document.addEventListener('DOMContentLoaded', () => {
    const GRID_SIZE = 50; // Number of rows/columns
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

    // Notification Modal Elements
    const notificationModal = document.getElementById('notification-modal');
    const closeNotificationModalButton = document.getElementById('close-notification-modal');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');

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

    // Timer state
    const TIMER_DURATION = 15 * 60; // 15 minutes in seconds
    //const TIMER_DURATION = 5; // 5 seconds
    let timerInterval = null;
    let timeRemaining = TIMER_DURATION;
    let isTimeUp = false;

    const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

    // Local Storage Keys
    const LOCAL_STORAGE_FOUND_WORDS_KEY = 'seededLetterGridFoundWords';
    const LOCAL_STORAGE_HIGHLIGHTED_CELLS_KEY = 'seededLetterGridHighlightedCells';
    const LOCAL_STORAGE_DATE_SEED_KEY = 'seededLetterGridDateSeed';
    const LOCAL_STORAGE_TOTAL_WORDS_KEY = 'seededLetterGridTotalWords';
    const LOCAL_STORAGE_LONGEST_WORD_KEY = 'seededLetterGridLongestWord';
    const LOCAL_STORAGE_DAILY_LONGEST_WORD_KEY = 'seededLetterGridDailyLongestWord';
    const LOCAL_STORAGE_GLOBAL_LONGEST_WORD_LENGTH_KEY = 'seededLetterGridGlobalLongestWordLength';
    const LOCAL_STORAGE_GLOBAL_LONGEST_WORD_KEY = 'seededLetterGridGlobalLongestWord';
    const LOCAL_STORAGE_THEME_KEY = 'seededLetterGridTheme';
    const LOCAL_STORAGE_TIME_REMAINING_KEY = 'seededLetterGridTimeRemaining';
    const LOCAL_STORAGE_FOUND_PATHS_KEY = 'seededLetterGridFoundPaths';
    const LOCAL_STORAGE_RULES_SEEN_KEY = 'seededLetterGridRulesSeen';

    const gameRules = [
        "Find as many words as you can in the randomly-generated grid before the timer runs out.",
        "Words must be at least 3 letters long.",
        "Select adjacent letters (horizontally, vertically, or diagonally) to form a word.",
        "You cannot use the same letter cell more than once.",
        "The timer stops counting down when you leave the page, so you can pace yourself over the course of the day.",
        "A new grid is generated everyday."
    ];
    
    let currentRuleIndex = 0;
    let isScrolling = false;

    // --- Utility Functions ---

    function getDateSeed() {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return parseInt(`${year}${month}${day}`, 10);
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
        console.log("Word path cleared.");
    }

    function isValidSelectionAttempt(targetRow, targetCol) {
        const cellKey = `${targetRow}_${targetCol}`;
        if (permanentlyHighlightedCells.has(cellKey)) {
            console.log(`Cell (${targetRow}, ${targetCol}) is part of a found word and cannot be re-selected.`);
            return false;
        }

        const isTargetInPath = currentWordPath.some(cell =>
            cell.row === targetRow && cell.col === targetCol
        );

        if (currentWordPath.length === 0) {
            return true; 
        }

        const lastSelected = currentWordPath[currentWordPath.length - 1];

        if (lastSelected.row === targetRow && lastSelected.col === targetCol) {
            return true; 
        }

        if (currentWordPath.length > 1) {
            const secondToLast = currentWordPath[currentWordPath.length - 2];
            if (secondToLast && secondToLast.row === targetRow && secondToLast.col === targetCol) {
                return true;
            }
        }
        
        if (isTargetInPath) {
            return false;
        }

        const sRow = lastSelected.row;
        const sCol = lastSelected.col;

        const rowDiff = Math.abs(sRow - targetRow);
        const colDiff = Math.abs(sCol - targetCol);

        return (rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0));
    }

    function shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 300);
    }

    function showNotificationModal(title, message) {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        showModal(notificationModal);
    }

    // --- Vignette Functions ---
    function updateVignetteVisibility() {
        if (!gridPanel) return;
    
        const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = gridPanel;
        const scrollEndLeeway = 5; // Leeway of a few pixels for calculations
    
        // Toggle the 'hidden' class based on scroll position for each vignette element
        vignetteTop.classList.toggle('hidden', scrollTop <= scrollEndLeeway);
        vignetteBottom.classList.toggle('hidden', scrollTop >= scrollHeight - clientHeight - scrollEndLeeway);
        vignetteLeft.classList.toggle('hidden', scrollLeft <= scrollEndLeeway);
        vignetteRight.classList.toggle('hidden', scrollLeft >= scrollWidth - clientWidth - scrollEndLeeway);

        isScrolling = false;
    }

    // --- Path Drawing Functions ---
    function drawPath(path, cellSize, gap) {
        if (!path || path.length < 2 || !pathOverlay) return;

        const pathData = path.map((point, index) => {
            const x = (point.col * (cellSize + gap)) + (cellSize / 2);
            const y = (point.row * (cellSize + gap)) + (cellSize / 2);
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', pathData);
        pathOverlay.appendChild(pathElement);
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
        if (!gameTimerDisplay) return;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        gameTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function handleTimeUp() {
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
            shareModalInfo.textContent = "Time's Up! Try again tomorrow.";
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
        if (document.hidden) {
            // Page is not visible, pause the timer and save the current time remaining.
            stopTimer();
            if (!isTimeUp) {
                localStorage.setItem(LOCAL_STORAGE_TIME_REMAINING_KEY, timeRemaining.toString());
            }
            console.log("Timer paused due to page visibility change.");
        } else {
            // Page is visible, resume the timer.
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

    function handleCellClick(event) {
        if (isTimeUp) {
            console.log("Click prevented: Time is up.");
            shakeElement(event.target); // Shake the cell that was clicked
            return;
        }

        // Crucial check: only proceed with selection if no significant drag occurred
        if (isDraggingGrid) {
            console.log("Click prevented: Grid was being dragged.");
            return; 
        }

        const clickedCellElement = event.target;
        const row = parseInt(clickedCellElement.dataset.row);
        const col = parseInt(clickedCellElement.dataset.col);

        const cellKey = `${row}_${col}`;

        if (permanentlyHighlightedCells.has(cellKey)) {
            console.log(`Clicked cell (${row}, ${col}) is already part of a found word. Ignoring click.`);
            shakeElement(clickedCellElement);
            return;
        }

        const lastInPath = currentWordPath[currentWordPath.length - 1];
        if (lastInPath && lastInPath.row === row && lastInPath.col === col) {
            const removedCell = currentWordPath.pop();
            if (removedCell.element) {
                removedCell.element.classList.remove('selected');
            }
            updateCurrentWordDisplay();
            console.log(`Deselected last cell by clicking it again. Current path: ${currentWordPath.map(c => c.element.textContent).join('')}`);
            return;
        }

        if (currentWordPath.length > 1) {
            const secondToLast = currentWordPath[currentWordPath.length - 2];
            if (secondToLast && secondToLast.row === row && secondToLast.col === col) {
                const lastCell = currentWordPath.pop();
                if (lastCell.element) {
                    lastCell.element.classList.remove('selected');
                }
                updateCurrentWordDisplay();
                console.log(`Deselected last cell by going back. Current path: ${currentWordPath.map(c => c.element.textContent).join('')}`);
                return;
            }
        }
        
        if (isValidSelectionAttempt(row, col)) {
            clickedCellElement.classList.add('selected');
            currentWordPath.push({ row, col, element: clickedCellElement });
            updateCurrentWordDisplay();
            console.log(`Path extended. Current word: ${currentWordPath.map(cell => cell.textContent).join('')}`);
        } else {
            console.log(`Invalid selection attempt for (${row}, ${col}). Path remains.`);
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
            console.log("Verification prevented: Time is up.");
            return;
        }

        const word = currentWordPath.map(cell => cell.element.textContent).join('').toUpperCase();

        if (word.length === 0) {
            console.log("No word formed to verify.");
            shakeElement(currentWordDisplay);
            return;
        }

        if (word.length < 3) {
            console.log("Word too short. Must be at least 3 letters.");
            shakeElement(currentWordDisplay);
            clearWordPath();
            return;
        }

        if (foundWords.has(word)) {
            console.log(`Word "${word}" already found!`);
            shakeElement(currentWordDisplay);
            clearWordPath();
            return;
        }

        verifyButton.classList.add('verifying');
        verifyButton.disabled = true;

        const isValid = await checkWordWithAPI(word);

        verifyButton.classList.remove('verifying');
        verifyButton.disabled = false;

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

            foundWords.add(word);
            currentWordPath.forEach(cell => {
                const cellKey = `${cell.row}_${cell.col}`;
                permanentlyHighlightedCells.add(cellKey);
                if (cell.element) {
                    cell.element.classList.add('selected');
                }
            });
            totalWordsFound++;

            const simplifiedPath = currentWordPath.map(p => ({ row: p.row, col: p.col }));
            foundWordPaths.push(simplifiedPath);
            drawPath(simplifiedPath, currentCellSize, GRID_GAP);

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
                clearWordPath();
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
        const numWords = totalWordsFound; // Use the already tracked variable

        if (numWords === 0) {
            return "I'm just getting started in today's SearchWord!";
        }

        // Use the already tracked longest word for the day. No need to recalculate.
        const longestWordPart = `My longest word was ${dailyLongestWordFound} (${longestWordLength} letters).`;
        const wordOrWords = numWords === 1 ? 'word' : 'words';

        return `I found ${numWords} ${wordOrWords} in today's SearchWord! ${longestWordPart}`;
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

        console.log("Game state saved to localStorage.");
    }

    function loadGameState() {
        const savedDateSeed = localStorage.getItem(LOCAL_STORAGE_DATE_SEED_KEY);
        const currentDateSeed = getDateSeed().toString();

        const savedGlobalLongestWordLength = localStorage.getItem(LOCAL_STORAGE_GLOBAL_LONGEST_WORD_LENGTH_KEY);
        const savedGlobalLongestWord = localStorage.getItem(LOCAL_STORAGE_GLOBAL_LONGEST_WORD_KEY);

        if (savedGlobalLongestWordLength && !isNaN(parseInt(savedGlobalLongestWordLength, 10))) {
            globalLongestWordLength = parseInt(savedGlobalLongestWordLength, 10);
        }
        if (savedGlobalLongestWord) {
            globalLongestWordFound = savedGlobalLongestWord;
        }

        if (savedDateSeed !== currentDateSeed) {
            console.log("New day detected or no saved daily game. Starting daily progress fresh, retaining global longest word.");
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

        // Handle the timer state for the current day
        const savedTimeRemaining = localStorage.getItem(LOCAL_STORAGE_TIME_REMAINING_KEY);
        if (savedTimeRemaining !== null && !isNaN(parseInt(savedTimeRemaining, 10))) {
            timeRemaining = parseInt(savedTimeRemaining, 10);
            if (timeRemaining <= 0) {
                timeRemaining = 0;
                isTimeUp = true;
            }
        } else {
            // No timer saved for today, so start a new one.
            timeRemaining = TIMER_DURATION;
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

    // Centering the grid within the scrollable panel
    function centerGridInView(cellSize, gap) {
        // The requestAnimationFrame was causing a timing issue where the zoom animation
        // would start before the grid was scrolled into position.
        // Making this call synchronous for the initial load ensures correct ordering.
        if (gridPanel && cellSize > 0) {
            // Center on the 21st row and column (index 20)
            const targetRow = 20;
            const targetCol = 20;

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

    function renderGrid(grid) {
        gameGridContainer.innerHTML = '';

        const fragment = document.createDocumentFragment();

        const MIN_CELL_SIZE = 35; // pixels, minimum size for a cell (e.g., 35px x 35px)
        const MIN_FONT_SIZE = 22; // pixels, minimum font size for the letter

        let cellSize = MIN_CELL_SIZE;
        let fontSize = MIN_FONT_SIZE;

        // Use the gridPanel's clientWidth/Height as the available space for calculations,
        // as gridPanel is the scrolling container.
        const availablePanelWidth = gridPanel.clientWidth;
        const availablePanelHeight = gridPanel.clientHeight;

        const idealCellSizeX = availablePanelWidth / GRID_SIZE;
        const idealCellSizeY = availablePanelHeight / GRID_SIZE;

        // Prioritize MIN_CELL_SIZE to ensure overflow.
        // If the ideal size for fitting is less than MIN_CELL_SIZE, use MIN_CELL_SIZE.
        // Otherwise, use the smaller of the two ideal sizes to fit best.
        cellSize = Math.max(MIN_CELL_SIZE, Math.min(idealCellSizeX, idealCellSizeY));
        fontSize = Math.max(MIN_FONT_SIZE, Math.floor(cellSize * 0.7)); // Further increased font size relative to cell size
        currentCellSize = cellSize; // Store for use outside this function

        // --- DYNAMIC TRANSFORM ORIGIN ---
        // To make the zoom effect originate from the center of the viewport,
        // we set the transform-origin to the coordinates of the cell we are centering on.
        const targetRow = 20; // The row to center on (0-indexed)
        const targetCol = 20; // The column to center on (0-indexed)
        const originX = (targetCol * (cellSize + GRID_GAP)) + (cellSize / 2);
        const originY = (targetRow * (cellSize + GRID_GAP)) + (cellSize / 2);
        gameGridContainer.style.transformOrigin = `${originX}px ${originY}px`;

        // Apply calculated sizes to the grid container
        gameGridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${cellSize}px)`;
        gameGridContainer.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${cellSize}px)`;
        
        grid.forEach((rowArray, rowIndex) => {
            rowArray.forEach((cellData, colIndex) => {
                const cellElement = document.createElement('div');
                cellElement.classList.add('grid-cell');
                cellElement.textContent = cellData;
                cellElement.dataset.row = rowIndex;
                cellElement.dataset.col = colIndex;
                cellElement.style.fontSize = `${fontSize}px`; // Apply calculated font size

                const cellKey = `${rowIndex}_${colIndex}`;
                if (permanentlyHighlightedCells.has(cellKey)) {
                    cellElement.classList.add('selected');
                }

                // Add mousedown listener for selection, but only if not dragging
                cellElement.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Prevent default browser drag/text selection for cells
                });
                cellElement.addEventListener('mouseup', handleCellClick); // Attach handler to mouseup
                fragment.appendChild(cellElement);
            });
        });

        gameGridContainer.appendChild(fragment);

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

    function handleResize() {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            renderGrid(currentGrid);
        }, 100);
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
            gridPanel.classList.add('grabbing');
            startMouseX = e.pageX; 
            startMouseY = e.pageY;
            startScrollLeft = gridPanel.scrollLeft; // Read scroll from gridPanel
            startScrollTop = gridPanel.scrollTop;   // Read scroll from gridPanel
            
            isDraggingGrid = false; 
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
            console.log("Drag logic: Mouse Up. isDraggingGrid:", isDraggingGrid);
        });

        document.addEventListener('mouseleave', (e) => {
            if (isMouseDownOnGridPanel && e.target.nodeName === 'HTML') { 
                isMouseDownOnGridPanel = false;
                gridPanel.classList.remove('grabbing');
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
                updateStatsDisplay();
                showModal(statsModal);
            }
        });
    }

    hamburgerMenu.addEventListener('click', openMenu);
    closeMenuButton.addEventListener('click', closeMenu);

    menuStatsButton.addEventListener('click', (e) => {
        e.preventDefault();
        updateStatsDisplay();
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

    if (deleteDataButton) {
        deleteDataButton.addEventListener('click', () => {
            const isConfirmed = window.confirm("Are you sure you want to delete all your saved data? This action cannot be undone.");
            if (isConfirmed) {
                console.log("User confirmed data deletion. Clearing localStorage...");
                // It's safer to remove specific keys than to use localStorage.clear()
                // in case other scripts on the same domain use it.
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
                localStorage.removeItem(LOCAL_STORAGE_RULES_SEEN_KEY);
                
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
    
    shareFacebookButton.addEventListener('click', () => {
        const shareData = generateShareText();
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
        
        // Attempt to copy the text to the clipboard.
        navigator.clipboard.writeText(shareData.text).then(() => {
            // On success, replace the current modal with a confirmation pop-up.
            showNotificationModal("Text Copied!", "Paste your score into the Facebook window when it appears.");
            
            // After a delay, close all modals and open the share window.
            setTimeout(() => {
                hideAllModals();
                openShareWindow(facebookUrl);
            }, 2000);

        }).catch(err => {
            // If copy fails, show an error pop-up.
            console.error('Failed to copy text for Facebook share: ', err);
            showNotificationModal("Copy Failed", "Could not copy text automatically. Please try again or copy it manually.");
            
            // After a delay, close all modals and still open the share window.
            setTimeout(() => {
                hideAllModals();
                openShareWindow(facebookUrl);
            }, 2500);
        });
    });

    copyShareLinkButton.addEventListener('click', () => {
        const shareData = generateShareText();
        const fullTextToCopy = `${shareData.text} ${shareData.url}`;

        navigator.clipboard.writeText(fullTextToCopy).then(() => {
        const originalText = copyShareLinkText.textContent;
        copyShareLinkText.textContent = 'Copied!';
            copyShareLinkButton.disabled = true;
            setTimeout(() => {
            copyShareLinkText.textContent = originalText;
                copyShareLinkButton.disabled = false;
            }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        const originalText = copyShareLinkText.textContent;
        copyShareLinkText.textContent = 'Failed!';
        copyShareLinkButton.disabled = true; // Keep it disabled briefly
        setTimeout(() => {
            copyShareLinkText.textContent = originalText;
            copyShareLinkButton.disabled = false;
        }, 2000);
    });
    });

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

    // --- Initial Setup ---
    loadTheme();
    currentGrid = generateGrid();
    const isNewGame = !loadGameState(); // Check if it's a new game for the day.
    updateStatsDisplay();
    renderGrid(currentGrid); 
    updateCurrentWordDisplay();
    initGridDragScrolling();

    // Start the timer after everything is loaded
    if (!isTimeUp) {
        updateTimerDisplay(); // Show initial time
        if (!document.hidden) {
            startTimer();
        }
    } else {
        handleTimeUp(); // Ensure UI is in "time up" state
    }
    
    window.addEventListener('resize', handleResize);
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
});