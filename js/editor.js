/*
 * Markdown editor core logic.
 * Handles formatting, preview rendering, autosave, keyboard shortcuts and file operations.
 */
(() => {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const editorHighlights = document.getElementById('editor-highlights');
    const toolbar = document.getElementById('formatting-toolbar');
    const togglePreviewButton = document.getElementById('toggle-preview');
    const editorContainer = document.querySelector('.editor-container');
    const resizeHandle = document.getElementById('resize-handle');
    const editorPane = document.querySelector('.editor-pane');
    const previewPane = document.querySelector('.preview-pane');
    const newButton = document.getElementById('new-file');
    const openButton = document.getElementById('open-file');
    const saveButton = document.getElementById('save-file');
    const exportButton = document.getElementById('export-file');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const wordCountDisplay = document.getElementById('word-count');
    const charCountDisplay = document.getElementById('char-count');
    const autosaveStatus = document.getElementById('autosave-status');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    // Find/Replace elements
    const findBar = document.getElementById('find-bar');
    const findInput = document.getElementById('find-input');
    const findPrevBtn = document.getElementById('find-prev');
    const findNextBtn = document.getElementById('find-next');
    const findCount = document.getElementById('find-count');
    const findCase = document.getElementById('find-case');
    const findRegex = document.getElementById('find-regex');
    const findWhole = document.getElementById('find-whole');
    const findClose = null; // close button removed
    const replaceInput = document.getElementById('replace-input');
    const replaceOneBtn = document.getElementById('replace-one');
    const replaceAllBtn = document.getElementById('replace-all');
    const toggleFindButton = document.getElementById('toggle-find');

    const AUTOSAVE_KEY = 'markdown-editor-autosave';
    const AUTOSAVE_FILENAME_KEY = 'markdown-editor-filename';
    const AUTOSAVE_INTERVAL = 1500;
    const HISTORY_LIMIT = 100;
    const HISTORY_DEBOUNCE = 300;
    const THEME_KEY = 'markdown-editor-theme';
    const AUTOSAVE_DISABLED_KEY = 'markdown-editor-autosave-disabled';
    const SPLIT_RATIO_KEY = 'markdown-editor-split-ratio';

    const state = {
        autosaveTimer: null,
        dirty: false,
        lastSavedContent: '',
        isPreviewVisible: true,
        autosaveDisabled: false,
        quotaExceededShown: false,
        isApplyingHistory: false,
        historyTimer: null,
        historyStack: [], // past states (oldest at 0, newest at end)
        futureStack: []   // redo states (most recent at end)
    };

    // Find/replace state
    const searchState = {
        lastIndex: 0,
        freshQuery: false,
        matches: [],
        current: -1
    };

    if (!editor || !preview) {
        return;
    }

    const updatePreview = () => {
        const markdown = editor.value;
        const rawHtml = window.markedLite.parse(markdown);
        const safeHtml = window.simpleSanitizer.sanitize(rawHtml);
        preview.innerHTML = safeHtml || '<p class="preview-placeholder">Start typing to see your formatted preview.</p>';
        
        // Apply Prism.js syntax highlighting to code blocks in preview
        // Use setTimeout to ensure DOM is updated before highlighting
        setTimeout(() => {
            if (window.Prism) {
                const codeBlocks = preview.querySelectorAll('pre code[class*="language-"]');
                codeBlocks.forEach((block) => {
                    try {
                        // Only highlight if not already highlighted
                        if (!block.classList.contains('language-none') && !block.parentElement.classList.contains('prism-loaded')) {
                            window.Prism.highlightElement(block);
                            block.parentElement.classList.add('prism-loaded');
                        }
                    } catch (error) {
                        // Ignore highlighting errors for unsupported languages
                        console.warn('Prism highlighting failed for code block:', error);
                    }
                });
            }
        }, 0);
    };

    const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();

    const stripMarkdown = (markdown) => {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }
        
        return markdown
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`[^`]*`/g, ' ')
            .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/<(?:.|\n)*?>/g, ' ')
            .replace(/^\s{0,3}>\s?/gm, '')
            .replace(/^\s{0,3}[-*+]\s+/gm, '')
            .replace(/^\s{0,3}\d+\.\s+/gm, '')
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            .replace(/(~~)(.*?)\1/g, '$2')
            .replace(/^\s*#{1,6}\s+/gm, '')
            .replace(/\|/g, ' ')
            .replace(/[-]{3,}/g, ' ')
            .replace(/[`*_~>#]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const updateCounters = () => {
        const content = editor.value || '';
        const plain = stripMarkdown(content);
        const normalized = normalizeWhitespace(plain);
        const words = normalized ? normalized.split(' ').filter(w => w.length > 0).length : 0;
        const characters = plain.length;

        wordCountDisplay.textContent = `${words} ${words === 1 ? 'word' : 'words'} / ${characters} ${characters === 1 ? 'character' : 'characters'}`;
        charCountDisplay.textContent = `${characters} ${characters === 1 ? 'character' : 'characters'}`;
    };

    const getEditorSnapshot = () => ({
        value: editor.value,
        selectionStart: editor.selectionStart,
        selectionEnd: editor.selectionEnd,
        scrollTop: editor.scrollTop
    });

    const applyEditorSnapshot = (snapshot) => {
        if (!snapshot) return;
        state.isApplyingHistory = true;
        editor.value = snapshot.value;
        updatePreview();
        updateCounters();
        editor.focus();
        editor.scrollTop = snapshot.scrollTop || 0;
        editor.setSelectionRange(snapshot.selectionStart || 0, snapshot.selectionEnd || 0);
        markDirty(editor.value !== state.lastSavedContent);
        state.isApplyingHistory = false;
    };

    const pushHistory = () => {
        if (state.isApplyingHistory) return;
        const snap = getEditorSnapshot();
        const last = state.historyStack[state.historyStack.length - 1];
        if (last && last.value === snap.value && last.selectionStart === snap.selectionStart && last.selectionEnd === snap.selectionEnd) {
            return; // no change
        }
        state.historyStack.push(snap);
        if (state.historyStack.length > HISTORY_LIMIT) {
            state.historyStack.shift();
        }
        // clear redo on new change
        state.futureStack = [];
    };

    const pushHistoryDebounced = () => {
        if (state.isApplyingHistory) return;
        clearTimeout(state.historyTimer);
        state.historyTimer = setTimeout(pushHistory, HISTORY_DEBOUNCE);
    };

    const undo = () => {
        if (state.historyStack.length === 0) return;
        const current = getEditorSnapshot();
        const prev = state.historyStack.pop();
        // push current to future for redo
        state.futureStack.push(current);
        applyEditorSnapshot(prev);
        updateToolbarStates();
        recalcFindAfterChange();
    };

    const redo = () => {
        if (state.futureStack.length === 0) return;
        const current = getEditorSnapshot();
        const next = state.futureStack.pop();
        // current goes back to history
        state.historyStack.push(current);
        applyEditorSnapshot(next);
        updateToolbarStates();
        recalcFindAfterChange();
    };

    const recalcFindAfterChange = () => {
        if (!findBar || findBar.hidden) return;
        const q = findInput?.value || '';
        if (!q) {
            if (editorHighlights) editorHighlights.innerHTML = '';
            if (findCount) findCount.textContent = '0/0';
            return;
        }
        updateRawHighlights();
        // Try to set current index to match current selection
        const selStart = editor.selectionStart;
        const selEnd = editor.selectionEnd;
        let idx = -1;
        if (searchState.matches && searchState.matches.length) {
            idx = searchState.matches.findIndex(m => m.start === selStart && m.end === selEnd);
        }
        searchState.current = idx;
        const total = (searchState.matches?.length) || 0;
        if (findCount) findCount.textContent = `${idx >= 0 ? idx + 1 : 0}/${total}`;
        if (idx >= 0) scrollCurrentRawHitIntoView(true);
    };

    const markDirty = (dirty = true) => {
        state.dirty = dirty;
    };

    const scheduleAutosave = () => {
        if (!window.localStorage || state.autosaveDisabled) {
            return;
        }

        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = setTimeout(async () => {
            try {
                localStorage.setItem(AUTOSAVE_KEY, editor.value);
                localStorage.setItem(AUTOSAVE_FILENAME_KEY, fileNameDisplay.textContent.trim());
                autosaveStatus.textContent = 'Draft saved';
                state.quotaExceededShown = false; // Reset flag on successful save
            } catch (error) {
                console.error('Autosave failed', error);
                
                // Check if it's a quota exceeded error
                if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22) {
                    autosaveStatus.textContent = 'Storage full - autosave unavailable';
                    
                    // Show dialog with options
                    const choice = await showQuotaExceededDialog();
                    
                    switch (choice) {
                        case 'clear':
                            // Clear all autosave data and try again
                            if (clearAllAutosaveData()) {
                                try {
                                    localStorage.setItem(AUTOSAVE_KEY, editor.value);
                                    localStorage.setItem(AUTOSAVE_FILENAME_KEY, fileNameDisplay.textContent.trim());
                                    autosaveStatus.textContent = 'Draft saved (cleared old data)';
                                } catch (retryError) {
                                    // Still failed, disable autosave
                                    disableAutosave();
                                    autosaveStatus.textContent = 'Autosave disabled - storage full';
                                }
                            } else {
                                disableAutosave();
                                autosaveStatus.textContent = 'Autosave disabled - unable to clear storage';
                            }
                            break;
                        case 'disable':
                            // Disable autosave permanently
                            disableAutosave();
                            autosaveStatus.textContent = 'Autosave disabled';
                            break;
                        case 'ignore':
                        default:
                            // Continue without autosave (don't disable, just stop trying)
                            autosaveStatus.textContent = 'Autosave unavailable - storage full';
                            break;
                    }
                } else {
                    // Other error types
                    autosaveStatus.textContent = 'Autosave unavailable';
                }
            }
        }, AUTOSAVE_INTERVAL);
    };

    const persistThemePreference = (isDark) => {
        if (!window.localStorage) {
            return;
        }
        try {
            localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        } catch (error) {
            console.error('Theme persistence failed', error);
        }
    };

    const clearAutosaveDraft = () => {
        if (!window.localStorage) {
            return;
        }
        try {
            localStorage.removeItem(AUTOSAVE_KEY);
            localStorage.removeItem(AUTOSAVE_FILENAME_KEY);
        } catch (error) {
            console.error('Clearing autosave failed', error);
        }
    };

    const clearAllAutosaveData = () => {
        if (!window.localStorage) {
            return;
        }
        try {
            localStorage.removeItem(AUTOSAVE_KEY);
            localStorage.removeItem(AUTOSAVE_FILENAME_KEY);
            // Clear preview state and theme if they're taking up space (optional)
            // But we'll keep theme preference as it's small
            return true;
        } catch (error) {
            console.error('Clearing all autosave data failed', error);
            return false;
        }
    };

    const disableAutosave = () => {
        state.autosaveDisabled = true;
        if (window.localStorage) {
            try {
                localStorage.setItem(AUTOSAVE_DISABLED_KEY, 'true');
            } catch (error) {
                console.error('Failed to persist autosave disabled state', error);
            }
        }
        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = null;
        autosaveStatus.textContent = 'Autosave disabled';
    };

    const enableAutosave = () => {
        state.autosaveDisabled = false;
        if (window.localStorage) {
            try {
                localStorage.removeItem(AUTOSAVE_DISABLED_KEY);
            } catch (error) {
                console.error('Failed to remove autosave disabled state', error);
            }
        }
        autosaveStatus.textContent = 'Ready';
    };

    const checkAutosaveStatus = () => {
        if (!window.localStorage) {
            return;
        }
        try {
            const disabled = localStorage.getItem(AUTOSAVE_DISABLED_KEY);
            if (disabled === 'true') {
                state.autosaveDisabled = true;
                autosaveStatus.textContent = 'Autosave disabled';
            }
        } catch (error) {
            console.error('Failed to check autosave status', error);
        }
    };

    /**
     * Show a dialog when localStorage quota is exceeded
     * Offers options to clear drafts, disable autosave, or continue with disabled autosave
     */
    const showQuotaExceededDialog = () => new Promise((resolve) => {
        // Only show dialog once per session
        if (state.quotaExceededShown) {
            resolve('ignored');
            return;
        }
        state.quotaExceededShown = true;

        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'dialog-title');
        dialog.setAttribute('aria-describedby', 'dialog-message');

        const titleElement = document.createElement('h2');
        titleElement.id = 'dialog-title';
        titleElement.className = 'dialog-label';
        titleElement.textContent = 'Storage Full';
        titleElement.style.marginTop = '0';

        const messageElement = document.createElement('p');
        messageElement.id = 'dialog-message';
        messageElement.className = 'dialog-message';
        messageElement.textContent = 'Autosave storage is full. Would you like to clear old drafts, disable autosave, or continue without autosave?';

        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
            editor.focus();
        };

        const handleChoice = (choice) => {
            cleanup();
            resolve(choice);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleChoice('ignore');
            }
        };

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'dialog-btn';
        clearButton.textContent = 'Clear Drafts';
        clearButton.addEventListener('click', () => handleChoice('clear'));

        const disableButton = document.createElement('button');
        disableButton.type = 'button';
        disableButton.className = 'dialog-btn';
        disableButton.textContent = 'Disable Autosave';
        disableButton.addEventListener('click', () => handleChoice('disable'));

        const ignoreButton = document.createElement('button');
        ignoreButton.type = 'button';
        ignoreButton.className = 'dialog-btn dialog-btn-primary';
        ignoreButton.textContent = 'Continue';
        ignoreButton.autofocus = true;
        ignoreButton.addEventListener('click', () => handleChoice('ignore'));

        actions.appendChild(clearButton);
        actions.appendChild(disableButton);
        actions.appendChild(ignoreButton);
        dialog.appendChild(titleElement);
        dialog.appendChild(messageElement);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                handleChoice('ignore');
            }
        });
        document.body.appendChild(overlay);
        document.addEventListener('keydown', handleKeyDown);

        // Focus the continue button
        setTimeout(() => ignoreButton.focus(), 10);
    });

    const restoreAutosave = () => {
        if (!window.localStorage) {
            return;
        }

        const storedContent = localStorage.getItem(AUTOSAVE_KEY);
        const storedFilename = localStorage.getItem(AUTOSAVE_FILENAME_KEY);

        if (storedContent !== null) {
            editor.value = storedContent;
            updatePreview();
        }

        if (storedFilename !== null) {
            fileNameDisplay.textContent = storedFilename;
        }

        state.lastSavedContent = editor.value;
        markDirty(false);
    };

    const getSelection = () => ({
        start: editor.selectionStart,
        end: editor.selectionEnd,
        value: editor.value
    });

    // Detect formatting at cursor position
    const detectFormatting = () => {
        const { start, end, value } = getSelection();
        const hasSelection = start !== end;
        
        // Get text around cursor/selection (extend context for better detection)
        const contextStart = Math.max(0, start - 10);
        const contextEnd = Math.min(value.length, end + 10);
        const contextText = value.slice(contextStart, contextEnd);
        const relativeStart = start - contextStart;
        const relativeEnd = end - contextStart;
        
        const formatting = {
            bold: false,
            italic: false,
            strikethrough: false,
            code: false,
            h1: false,
            h2: false,
            h3: false,
            ul: false,
            ol: false,
            codeBlock: false,
            table: false
        };

        // Check for bold (**text** or __text__)
        if (hasSelection) {
            const selectedText = value.slice(start, end);
            // Check if selection contains bold formatting
            formatting.bold = /(\*\*|__).+?\1/.test(selectedText);
        } else {
            // Check if cursor is inside bold formatting
            const beforeCursor = value.slice(0, start);
            const afterCursor = value.slice(start);
            
            // Find all bold patterns in the text (including *** which is bold+italic)
            const boldPattern = /(\*\*|__).+?\1/g;
            const boldMatches = value.match(boldPattern) || [];
            
            // Also check for *** patterns (bold+italic)
            const boldItalicPattern = /\*\*\*[^*]+\*\*\*/g;
            const boldItalicMatches = value.match(boldItalicPattern) || [];
            
            // Check if cursor is inside any bold pattern
            let isInsideBold = false;
            for (const match of [...boldMatches, ...boldItalicMatches]) {
                const matchStart = value.indexOf(match);
                const matchEnd = matchStart + match.length;
                if (start >= matchStart && start <= matchEnd) {
                    isInsideBold = true;
                    break;
                }
            }
            
            // Also check if we're at the end of a complete bold section
            const isAtEndOfBold = [...boldMatches, ...boldItalicMatches].some(match => beforeCursor.endsWith(match));
            
            formatting.bold = isInsideBold || isAtEndOfBold;
        }

        // Check for italic (*text* or _text_)
        if (hasSelection) {
            const selectedText = value.slice(start, end);
            // Check if selection contains italic formatting
            formatting.italic = /(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)/.test(selectedText);
        } else {
            // Find all italic patterns in the text
            const italicPattern = /(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)/g;
            const italicMatches = value.match(italicPattern) || [];
            
            // Check if cursor is inside any italic pattern
            let isInsideItalic = false;
            for (const match of italicMatches) {
                const matchStart = value.indexOf(match);
                const matchEnd = matchStart + match.length;
                if (start >= matchStart && start <= matchEnd) {
                    isInsideItalic = true;
                    break;
                }
            }
            
            // Also check if we're at the end of a complete italic section
            const beforeCursor = value.slice(0, start);
            const isAtEndOfItalic = italicMatches.some(match => beforeCursor.endsWith(match));
            
            // Also check if cursor is right after a complete italic section
            const isAfterItalic = italicMatches.some(match => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });
            
            formatting.italic = isInsideItalic || isAtEndOfItalic || isAfterItalic;
        }

        // Check for strikethrough (~~text~~)
        if (hasSelection) {
            const selectedText = value.slice(start, end);
            // Check if selection contains strikethrough formatting
            formatting.strikethrough = /~~[^~]+~~/.test(selectedText);
        } else {
            // Find all strikethrough patterns in the text
            const strikethroughPattern = /~~[^~]+~~/g;
            const strikethroughMatches = value.match(strikethroughPattern) || [];
            
            // Check if cursor is inside any strikethrough pattern
            let isInsideStrikethrough = false;
            for (const match of strikethroughMatches) {
                const matchStart = value.indexOf(match);
                const matchEnd = matchStart + match.length;
                if (start >= matchStart && start <= matchEnd) {
                    isInsideStrikethrough = true;
                    break;
                }
            }
            
            // Also check if we're at the end of a complete strikethrough section
            const beforeCursor = value.slice(0, start);
            const isAtEndOfStrikethrough = strikethroughMatches.some(match => beforeCursor.endsWith(match));
            
            // Also check if cursor is right after a complete strikethrough section
            const isAfterStrikethrough = strikethroughMatches.some(match => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });
            
            formatting.strikethrough = isInsideStrikethrough || isAtEndOfStrikethrough || isAfterStrikethrough;
        }

        // Check for inline code (`text`)
        if (hasSelection) {
            const selectedText = value.slice(start, end);
            formatting.code = /`[^`]+`/.test(selectedText);
        } else {
            // Find all inline code patterns in the text
            const codePattern = /`[^`]+`/g;
            const codeMatches = value.match(codePattern) || [];
            
            // Check if cursor is inside any code pattern
            let isInsideCode = false;
            for (const match of codeMatches) {
                const matchStart = value.indexOf(match);
                const matchEnd = matchStart + match.length;
                if (start >= matchStart && start <= matchEnd) {
                    isInsideCode = true;
                    break;
                }
            }
            
            // Also check if we're at the end of a complete code section
            const beforeCursor = value.slice(0, start);
            const isAtEndOfCode = codeMatches.some(match => beforeCursor.endsWith(match));
            
            // Also check if cursor is right after a complete code section
            const isAfterCode = codeMatches.some(match => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });
            
            formatting.code = isInsideCode || isAtEndOfCode || isAfterCode;
        }

        // Check for headers (at start of line)
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineText = value.slice(lineStart, value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start));
        
        if (lineText.match(/^#{1}\s/)) {
            formatting.h1 = true;
        } else if (lineText.match(/^#{2}\s/)) {
            formatting.h2 = true;
        } else if (lineText.match(/^#{3}\s/)) {
            formatting.h3 = true;
        }

        // Check for lists (at start of line)
        if (lineText.match(/^\s*[-*+]\s/)) {
            formatting.ul = true;
        } else if (lineText.match(/^\s*\d+\.\s/)) {
            formatting.ol = true;
        }

        // Check for code blocks (```)
        const beforeCursor = value.slice(0, start);
        const afterCursor = value.slice(start);
        const codeBlockStart = (beforeCursor.match(/```/g) || []).length;
        const codeBlockEnd = (afterCursor.match(/```/g) || []).length;
        // We're in a code block if there's an odd number of ``` markers before the cursor
        formatting.codeBlock = codeBlockStart % 2 === 1;

        // Check for tables
        // Strategy: identify Markdown table lines by presence of pipes and/or separator line --- within adjacent lines
        const prevLineStart = value.lastIndexOf('\n', lineStart - 2) + 1;
        const nextLineEndIndex = value.indexOf('\n', value.indexOf('\n', start) + 1);
        const prevLine = value.slice(prevLineStart, lineStart - 1 >= 0 ? lineStart - 1 : 0);
        const nextLine = value.slice(value.indexOf('\n', start) + 1 || value.length, nextLineEndIndex === -1 ? value.length : nextLineEndIndex);

        const hasPipe = /\|/.test(lineText);
        const isSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lineText);
        const prevHasPipe = /\|/.test(prevLine || '');
        const nextHasPipe = /\|/.test(nextLine || '');
        const prevIsSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(prevLine || '');
        const nextIsSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(nextLine || '');

        if (!formatting.codeBlock) {
            if (isSeparator) {
                formatting.table = true;
            } else if (hasPipe && (prevHasPipe || nextHasPipe || prevIsSeparator || nextIsSeparator)) {
                formatting.table = true;
            }
        }

        return formatting;
    };

    // Update toolbar button states based on detected formatting
    const updateToolbarStates = () => {
        const formatting = detectFormatting();
        
        // Update text formatting buttons
        const boldButton = toolbar.querySelector('[data-format="bold"]');
        const italicButton = toolbar.querySelector('[data-format="italic"]');
        const strikethroughButton = toolbar.querySelector('[data-format="strikethrough"]');
        const codeButton = toolbar.querySelector('[data-format="code"]');
        
        if (boldButton) {
            boldButton.classList.toggle('active', formatting.bold);
            boldButton.setAttribute('aria-pressed', formatting.bold);
        }
        if (italicButton) {
            italicButton.classList.toggle('active', formatting.italic);
            italicButton.setAttribute('aria-pressed', formatting.italic);
        }
        if (strikethroughButton) {
            strikethroughButton.classList.toggle('active', formatting.strikethrough);
            strikethroughButton.setAttribute('aria-pressed', formatting.strikethrough);
        }
        if (codeButton) {
            codeButton.classList.toggle('active', formatting.code);
            codeButton.setAttribute('aria-pressed', formatting.code);
        }

        // Update header buttons
        const h1Button = toolbar.querySelector('[data-format="h1"]');
        const h2Button = toolbar.querySelector('[data-format="h2"]');
        const h3Button = toolbar.querySelector('[data-format="h3"]');
        
        if (h1Button) {
            h1Button.classList.toggle('active', formatting.h1);
            h1Button.setAttribute('aria-pressed', formatting.h1);
        }
        if (h2Button) {
            h2Button.classList.toggle('active', formatting.h2);
            h2Button.setAttribute('aria-pressed', formatting.h2);
        }
        if (h3Button) {
            h3Button.classList.toggle('active', formatting.h3);
            h3Button.setAttribute('aria-pressed', formatting.h3);
        }

        // Update list buttons
        const ulButton = toolbar.querySelector('[data-format="ul"]');
        const olButton = toolbar.querySelector('[data-format="ol"]');
        
        if (ulButton) {
            ulButton.classList.toggle('active', formatting.ul);
            ulButton.setAttribute('aria-pressed', formatting.ul);
        }
        if (olButton) {
            olButton.classList.toggle('active', formatting.ol);
            olButton.setAttribute('aria-pressed', formatting.ol);
        }

        // Update code block button
        const codeBlockButton = toolbar.querySelector('[data-format="codeBlock"]');
        if (codeBlockButton) {
            codeBlockButton.classList.toggle('active', formatting.codeBlock);
            codeBlockButton.setAttribute('aria-pressed', formatting.codeBlock);
        }

        // Update table button
        const tableButton = toolbar.querySelector('[data-format="table"]');
        if (tableButton) {
            tableButton.classList.toggle('active', formatting.table);
            tableButton.setAttribute('aria-pressed', formatting.table);
        }
    };

    const setSelection = (start, end) => {
        // Preserve scroll position to prevent document shifting
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        editor.focus();
        editor.setSelectionRange(start, end);
        // Restore scroll position after browser potentially auto-scrolls
        // Use requestAnimationFrame to ensure restoration happens after browser's scroll
        requestAnimationFrame(() => {
            editor.scrollTop = scrollTop;
            editor.scrollLeft = scrollLeft;
        });
    };

    const getLineOffsets = (lines) => {
        const offsets = [];
        let position = 0;
        lines.forEach((line, index) => {
            offsets[index] = position;
            position += line.length;
            if (index < lines.length - 1) {
                position += 1;
            }
        });
        return offsets;
    };

    // Replace the current textarea selection while optionally restoring a custom selection range.
    const replaceSelection = (text, selectionRange) => {
        // history: capture pre-change snapshot
        pushHistory();
        const { start, end, value } = getSelection();
        const before = value.slice(0, start);
        const after = value.slice(end);
        editor.value = `${before}${text}${after}`;
        let newStart;
        let newEnd;

        if (selectionRange && typeof selectionRange === 'object') {
            newStart = start + selectionRange.start;
            newEnd = start + selectionRange.end;
        } else {
            const offset = typeof selectionRange === 'number' ? selectionRange : text.length;
            newStart = start + offset;
            newEnd = newStart;
        }

        setSelection(newStart, newEnd);
        updatePreview();
        updateCounters();
        markDirty(editor.value !== state.lastSavedContent);
        scheduleAutosave();
        // history: capture post-change snapshot
        pushHistory();
    };

    // Wrap the current selection with delimiters, positioning the caret after the closing delimiter
    const applyInlineFormat = (prefix, suffix, placeholder = '') => {
        const { start, end, value } = getSelection();
        const hasSelection = start !== end;
        const selection = hasSelection ? value.slice(start, end) : placeholder;
        const inserted = `${prefix}${selection}${suffix}`;

        if (hasSelection) {
            // Place cursor after the closing delimiter
            replaceSelection(inserted, inserted.length);
        } else {
            // Select the placeholder text so user can type over it
            replaceSelection(inserted, {
                start: prefix.length,
                end: prefix.length + selection.length
            });
        }
    };

    const applyHeading = (level) => {
        const { start, end, value } = getSelection();
        const lines = value.split('\n');
        const lineOffsets = getLineOffsets(lines);
        const startLineIndex = value.slice(0, start).split('\n').length - 1;
        const endLineIndex = value.slice(0, end).split('\n').length - 1;

        let cumulativeDelta = 0;
        let newStart = start;
        let newEnd = end;
        let startAdjusted = false;
        let endAdjusted = false;

        for (let i = 0; i < lines.length; i += 1) {
            const originalLine = lines[i];
            let newLine = originalLine;
            let listPrefix = '';
            let content = originalLine;
            let oldHeadingLength = 0;
            let newHeadingLength = 0;

            if (i >= startLineIndex && i <= endLineIndex) {
                const listMatch = content.match(/^(\s*(?:[-*+] |\d+\. ))/);
                if (listMatch) {
                    listPrefix = listMatch[1];
                    content = content.slice(listPrefix.length);
                }

                content = content.replace(/^\s+/, '');

                const headingMatch = content.match(/^(#{1,6})(\s*)(.*)$/);
                const existingLevel = headingMatch ? headingMatch[1].length : 0;
                const existingText = headingMatch ? headingMatch[3] : content;
                const normalizedText = existingText.replace(/^\s+/, '');

                oldHeadingLength = headingMatch ? headingMatch[1].length + headingMatch[2].length : 0;
                const hasCleanSpacing = headingMatch ? headingMatch[2] === ' ' : false;

                if (existingLevel === level && headingMatch && hasCleanSpacing) {
                    newLine = `${listPrefix}${normalizedText}`;
                    newHeadingLength = 0;
                } else {
                    const hashes = '#'.repeat(level);
                    if (normalizedText.length > 0) {
                        newLine = `${listPrefix}${hashes} ${normalizedText}`;
                    } else {
                        newLine = `${listPrefix}${hashes} `;
                    }
                    newHeadingLength = hashes.length + 1;
                }
            }

            const lineStartOriginal = lineOffsets[i];
            const lineStartNew = lineStartOriginal + cumulativeDelta;
            const lineDelta = newLine.length - originalLine.length;
            const listLength = listPrefix.length;

            const adjustWithinLine = (offset) => {
                const offsetInLine = offset - lineStartOriginal;
                if (offsetInLine < listLength) {
                    return lineStartNew + offsetInLine;
                }
                if (offsetInLine === listLength) {
                    return lineStartNew + listLength + newHeadingLength;
                }
                const offsetAfterList = offsetInLine - listLength;
                const offsetIntoContent = Math.max(0, offsetAfterList - oldHeadingLength);
                const newOffsetInLine = listLength + newHeadingLength + offsetIntoContent;
                return lineStartNew + Math.min(newOffsetInLine, newLine.length);
            };

            if (!startAdjusted) {
                if (start < lineStartOriginal) {
                    newStart = start + cumulativeDelta;
                } else if (start <= lineStartOriginal + originalLine.length) {
                    newStart = adjustWithinLine(start);
                    startAdjusted = true;
                }
            }

            if (!endAdjusted) {
                if (end < lineStartOriginal) {
                    newEnd = end + cumulativeDelta;
                } else if (end <= lineStartOriginal + originalLine.length) {
                    newEnd = adjustWithinLine(end);
                    endAdjusted = true;
                }
            }

            lines[i] = newLine;
            cumulativeDelta += lineDelta;
        }

        if (!startAdjusted) {
            newStart = start + cumulativeDelta;
        }
        if (!endAdjusted) {
            newEnd = end + cumulativeDelta;
        }

        editor.value = lines.join('\n');

        setSelection(newStart, newEnd);
        updatePreview();
        updateCounters();
        markDirty(editor.value !== state.lastSavedContent);
        scheduleAutosave();
    };

    // Toggle bullet/numbered list markers for the selected lines, converting between list types when needed.
    const toggleList = (type) => {
        const { start, end, value } = getSelection();
        const lines = value.split('\n');
        const lineOffsets = getLineOffsets(lines);
        const selectionStartIndex = value.slice(0, start).split('\n').length - 1;
        const selectionEndIndex = value.slice(0, end).split('\n').length - 1;

        const markerText = type === 'ol' ? '1. ' : '- ';
        const isTargetLine = (line) => {
            const trimmed = line.replace(/^\s*/, '');
            if (type === 'ol') {
                return /^\d+\.\s+/.test(trimmed);
            }
            return /^[-*+]\s+/.test(trimmed);
        };

        let shouldRemove = true;
        for (let i = selectionStartIndex; i <= selectionEndIndex; i += 1) {
            const line = lines[i] || '';
            if (!isTargetLine(line)) {
                shouldRemove = false;
                break;
            }
        }

        let cumulativeDelta = 0;
        let newStart = start;
        let newEnd = end;
        let startAdjusted = false;
        let endAdjusted = false;

        for (let i = 0; i < lines.length; i += 1) {
            const originalLine = lines[i];
            let newLine = originalLine;
            let indent = '';
            let remainder = originalLine;
            let oldMarkerLength = 0;
            let newMarkerLength = 0;

            if (i >= selectionStartIndex && i <= selectionEndIndex) {
                const indentMatch = remainder.match(/^(\s*)/);
                indent = indentMatch ? indentMatch[1] : '';
                remainder = remainder.slice(indent.length);

                const bulletMatch = remainder.match(/^([-*+]\s+)/);
                const numberMatch = remainder.match(/^(\d+\.\s+)/);

                if (bulletMatch) {
                    oldMarkerLength = bulletMatch[1].length;
                    remainder = remainder.slice(oldMarkerLength);
                } else if (numberMatch) {
                    oldMarkerLength = numberMatch[1].length;
                    remainder = remainder.slice(oldMarkerLength);
                }

                if (shouldRemove && isTargetLine(originalLine)) {
                    newMarkerLength = 0;
                    newLine = `${indent}${remainder}`;
                } else {
                    newMarkerLength = markerText.length;
                    newLine = `${indent}${markerText}${remainder}`;
                }
            }

            const lineStartOriginal = lineOffsets[i];
            const lineStartNew = lineStartOriginal + cumulativeDelta;
            const lineDelta = newLine.length - originalLine.length;
            const indentLength = indent.length;

            const adjustWithinLine = (offset) => {
                const offsetInLine = offset - lineStartOriginal;
                if (offsetInLine < indentLength) {
                    return lineStartNew + offsetInLine;
                }
                if (offsetInLine === indentLength) {
                    return lineStartNew + indentLength + newMarkerLength;
                }
                const offsetAfterIndent = offsetInLine - indentLength;
                const offsetIntoContent = Math.max(0, offsetAfterIndent - oldMarkerLength);
                const newOffsetInLine = indentLength + newMarkerLength + offsetIntoContent;
                return lineStartNew + Math.min(newOffsetInLine, newLine.length);
            };

            if (!startAdjusted) {
                if (start < lineStartOriginal) {
                    newStart = start + cumulativeDelta;
                } else if (start <= lineStartOriginal + originalLine.length) {
                    newStart = adjustWithinLine(start);
                    startAdjusted = true;
                }
            }

            if (!endAdjusted) {
                if (end < lineStartOriginal) {
                    newEnd = end + cumulativeDelta;
                } else if (end <= lineStartOriginal + originalLine.length) {
                    newEnd = adjustWithinLine(end);
                    endAdjusted = true;
                }
            }

            lines[i] = newLine;
            cumulativeDelta += lineDelta;
        }

        if (!startAdjusted) {
            newStart = start + cumulativeDelta;
        }
        if (!endAdjusted) {
            newEnd = end + cumulativeDelta;
        }

        editor.value = lines.join('\n');
        setSelection(newStart, newEnd);
        updatePreview();
        updateCounters();
        markDirty(editor.value !== state.lastSavedContent);
        scheduleAutosave();
    };

    const applyCodeBlock = () => {
        const { start, end, value } = getSelection();
        const before = value.slice(0, start);
        const after = value.slice(end);
        const selection = value.slice(start, end);
        const hasSelection = start !== end && selection.length > 0;
        const content = hasSelection ? selection : '';
        const fence = '```';
        const leading = start > 0 && !before.endsWith('\n') ? '\n' : '';
        const trailing = after.startsWith('\n') || after.length === 0 ? '' : '\n';
        const prefix = `${leading}${fence}\n`;
        const suffix = `\n${fence}${trailing}`;
        const inserted = `${prefix}${content}${suffix}`;

        if (hasSelection) {
            // Place cursor after the code block
            replaceSelection(inserted, inserted.length - trailing.length);
        } else {
            // Place cursor on the empty line between fences
            replaceSelection(inserted, prefix.length);
        }
    };

    // Accessible dialog utilities to replace native browser dialogs
    
    /**
     * Show an alert dialog with a message and OK button
     * @param {string} message - The message to display
     * @param {string} title - Optional title for the dialog
     * @returns {Promise<void>} - Resolves when dialog is closed
     */
    const alertDialog = (message, title = 'Notice') => new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'dialog-title');
        dialog.setAttribute('aria-describedby', 'dialog-message');

        const titleElement = document.createElement('h2');
        titleElement.id = 'dialog-title';
        titleElement.className = 'dialog-label';
        titleElement.textContent = title;
        titleElement.style.marginTop = '0';

        const messageElement = document.createElement('p');
        messageElement.id = 'dialog-message';
        messageElement.className = 'dialog-message';
        messageElement.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const okButton = document.createElement('button');
        okButton.type = 'button';
        okButton.className = 'dialog-btn dialog-btn-primary';
        okButton.textContent = 'OK';
        okButton.autofocus = true;

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
            editor.focus(); // Return focus to editor
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                cleanup();
                resolve();
            } else if (event.key === 'Enter' && event.target === okButton) {
                event.preventDefault();
                cleanup();
                resolve();
            }
        };

        okButton.addEventListener('click', () => {
            cleanup();
            resolve();
        });

        actions.appendChild(okButton);
        dialog.appendChild(titleElement);
        dialog.appendChild(messageElement);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                cleanup();
                resolve();
            }
        });
        document.body.appendChild(overlay);
        document.addEventListener('keydown', handleKeyDown);

        // Focus the OK button
        setTimeout(() => okButton.focus(), 10);
    });

    /**
     * Show a confirmation dialog with Yes/No or OK/Cancel buttons
     * @param {string} message - The message to display
     * @param {string} title - Optional title for the dialog
     * @param {Object} options - Options for button labels
     * @returns {Promise<boolean>} - Resolves with true if confirmed, false if cancelled
     */
    const confirmDialog = (message, title = 'Confirm', options = {}) => new Promise((resolve) => {
        const { confirmLabel = 'OK', cancelLabel = 'Cancel' } = options;
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'dialog-title');
        dialog.setAttribute('aria-describedby', 'dialog-message');

        const titleElement = document.createElement('h2');
        titleElement.id = 'dialog-title';
        titleElement.className = 'dialog-label';
        titleElement.textContent = title;
        titleElement.style.marginTop = '0';

        const messageElement = document.createElement('p');
        messageElement.id = 'dialog-message';
        messageElement.className = 'dialog-message';
        messageElement.textContent = message;

        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
            editor.focus(); // Return focus to editor
        };

        const handleChoice = (confirmed) => {
            cleanup();
            resolve(confirmed);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleChoice(false);
            }
        };

        const confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = 'dialog-btn dialog-btn-primary';
        confirmButton.textContent = confirmLabel;
        confirmButton.autofocus = true;
        confirmButton.addEventListener('click', () => handleChoice(true));

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'dialog-btn';
        cancelButton.textContent = cancelLabel;
        cancelButton.addEventListener('click', () => handleChoice(false));

        actions.appendChild(cancelButton);
        actions.appendChild(confirmButton);
        dialog.appendChild(titleElement);
        dialog.appendChild(messageElement);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                handleChoice(false);
            }
        });
        document.body.appendChild(overlay);
        document.addEventListener('keydown', handleKeyDown);

        // Focus the confirm button
        setTimeout(() => confirmButton.focus(), 10);
    });

    /**
     * Show a multi-field prompt dialog
     * @param {Array<{label: string, defaultValue: string, inputType: string, required: boolean}>} fields - Array of field definitions
     * @param {string} title - Dialog title
     * @returns {Promise<Object<string, string>|null>} - Resolves with object of field values or null if cancelled
     */
    const multiPromptDialog = (fields, title = 'Input') => new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'dialog-title');
        dialog.setAttribute('aria-describedby', 'dialog-message');

        const titleElement = document.createElement('h2');
        titleElement.id = 'dialog-title';
        titleElement.className = 'dialog-label';
        titleElement.textContent = title;
        titleElement.style.marginTop = '0';

        const form = document.createElement('form');
        form.className = 'dialog-form';

        const messageElement = document.createElement('div');
        messageElement.id = 'dialog-message';
        messageElement.className = 'dialog-message';
        messageElement.style.marginBottom = '0.5rem';

        const inputs = [];
        const inputElements = [];

        fields.forEach((field, index) => {
            const fieldContainer = document.createElement('div');
            fieldContainer.style.display = 'flex';
            fieldContainer.style.flexDirection = 'column';
            fieldContainer.style.gap = '0.3rem';

            const label = document.createElement('label');
            label.className = 'dialog-label';
            label.textContent = field.label;
            label.setAttribute('for', `dialog-input-${index}`);

            const input = document.createElement('input');
            input.id = `dialog-input-${index}`;
            input.type = field.inputType || 'text';
            input.className = 'dialog-input';
            input.value = field.defaultValue || '';
            input.required = field.required !== false;
            if (input.type === 'url') {
                input.placeholder = 'https://example.com';
            }

            inputs.push({ field, input });
            inputElements.push(input);

            fieldContainer.appendChild(label);
            fieldContainer.appendChild(input);
            form.appendChild(fieldContainer);
        });

        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
            editor.focus();
        };

        const handleSubmit = () => {
            // Validate required fields
            const values = {};
            let isValid = true;

            inputs.forEach(({ field, input }, index) => {
                const value = input.value.trim();
                if (field.required && !value) {
                    isValid = false;
                    input.focus();
                    input.style.borderColor = 'var(--color-danger)';
                    setTimeout(() => {
                        input.style.borderColor = '';
                    }, 2000);
                } else {
                    values[field.key || `field${index}`] = value;
                }
            });

            if (!isValid) {
                return;
            }

            cleanup();
            resolve(values);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleCancel();
            }
        };

        // Handle Enter key navigation between fields
        inputElements.forEach((input, index) => {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (index < inputElements.length - 1) {
                        // Move to next field
                        inputElements[index + 1].focus();
                        inputElements[index + 1].select();
                    } else {
                        // Last field, submit form
                        handleSubmit();
                    }
                }
            });
        });

        const okButton = document.createElement('button');
        okButton.type = 'button';
        okButton.className = 'dialog-btn dialog-btn-primary';
        okButton.textContent = 'OK';
        okButton.addEventListener('click', handleSubmit);

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'dialog-btn';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', handleCancel);

        form.appendChild(messageElement);
        actions.appendChild(cancelButton);
        actions.appendChild(okButton);
        form.appendChild(actions);
        dialog.appendChild(titleElement);
        dialog.appendChild(form);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                handleCancel();
            }
        });
        document.body.appendChild(overlay);
        document.addEventListener('keydown', handleKeyDown);

        // Focus first input and select text
        setTimeout(() => {
            if (inputElements.length > 0) {
                inputElements[0].focus();
                inputElements[0].select();
            }
        }, 10);
    });

    /**
     * Show a prompt dialog with an input field
     * @param {string} message - The message/label to display
     * @param {string} defaultValue - Default value for the input
     * @param {string} inputType - Type of input (text, url, etc.)
     * @param {string} title - Optional title for the dialog
     * @returns {Promise<string|null>} - Resolves with input value or null if cancelled
     */
    const promptDialog = (message, defaultValue = '', inputType = 'text', title = 'Input') => new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'dialog-title');
        dialog.setAttribute('aria-describedby', 'dialog-message');

        const titleElement = document.createElement('h2');
        titleElement.id = 'dialog-title';
        titleElement.className = 'dialog-label';
        titleElement.textContent = title;
        titleElement.style.marginTop = '0';

        const form = document.createElement('form');
        form.className = 'dialog-form';

        const messageElement = document.createElement('label');
        messageElement.id = 'dialog-message';
        messageElement.className = 'dialog-label';
        messageElement.textContent = message;
        messageElement.setAttribute('for', 'dialog-input');

        const input = document.createElement('input');
        input.id = 'dialog-input';
        input.type = inputType;
        input.className = 'dialog-input';
        input.value = defaultValue;
        input.setAttribute('aria-describedby', 'dialog-message');
        if (inputType === 'url') {
            input.placeholder = 'https://example.com';
        }

        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
            editor.focus(); // Return focus to editor
        };

        const handleSubmit = (value) => {
            cleanup();
            resolve(value);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleCancel();
            }
        };

        const okButton = document.createElement('button');
        okButton.type = 'submit';
        okButton.className = 'dialog-btn dialog-btn-primary';
        okButton.textContent = 'OK';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'dialog-btn';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', handleCancel);

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const value = input.value.trim();
            handleSubmit(value || defaultValue || null);
        });

        // Allow Enter key to submit form when input is focused
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const value = input.value.trim();
                handleSubmit(value || defaultValue || null);
            }
        });

        messageElement.appendChild(input);
        form.appendChild(messageElement);
        actions.appendChild(cancelButton);
        actions.appendChild(okButton);
        form.appendChild(actions);
        dialog.appendChild(titleElement);
        dialog.appendChild(form);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                handleCancel();
            }
        });
        document.body.appendChild(overlay);
        document.addEventListener('keydown', handleKeyDown);

        // Focus and select input text
        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);
    });

    const showUnsavedChangesDialog = () => new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', 'Unsaved changes');

        const message = document.createElement('p');
        message.className = 'dialog-message';
        message.textContent = 'You have unsaved changes. Save before starting a new document?';

        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const buttons = [
            { label: 'Save', value: 'save', className: 'dialog-btn dialog-btn-primary' },
            { label: "Don't Save", value: 'discard', className: 'dialog-btn' },
            { label: 'Cancel', value: 'cancel', className: 'dialog-btn' }
        ];

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
        };

        const handleChoice = (choice) => {
            cleanup();
            resolve(choice);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handleChoice('cancel');
            }
        };

        buttons.forEach((config, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = config.className;
            button.textContent = config.label;
            button.addEventListener('click', () => handleChoice(config.value));
            if (index === 0) {
                button.autofocus = true;
            }
            actions.appendChild(button);
        });

        dialog.appendChild(message);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                handleChoice('cancel');
            }
        });
        document.body.appendChild(overlay);
        document.addEventListener('keydown', handleKeyDown);

        const firstButton = actions.querySelector('button');
        if (firstButton) {
            firstButton.focus();
        }
    });

    const insertLink = async () => {
        console.log('insertLink function called');
        const { start, end, value } = getSelection();
        const selectedText = value.slice(start, end);

        const result = await multiPromptDialog([
            {
                label: 'Link text',
                defaultValue: selectedText || '',
                inputType: 'text',
                key: 'text',
                required: false
            },
            {
                label: 'Link URL (https://...)',
                defaultValue: 'https://',
                inputType: 'url',
                key: 'url',
                required: true
            }
        ], 'Insert Link');

        if (!result) {
            console.log('Link insertion cancelled');
            return;
        }

        const linkText = result.text || result.url;
        const url = result.url;

        if (!url) {
            console.log('Link insertion cancelled - no URL');
            return;
        }

        const linkSyntax = `[${linkText}](${url})`;
        console.log('Inserting link:', linkSyntax);
        replaceSelection(linkSyntax, linkSyntax.length);
    };

    const insertImage = async () => {
        console.log('insertImage function called');

        const result = await multiPromptDialog([
            {
                label: 'Image description (alt text)',
                defaultValue: 'Image description',
                inputType: 'text',
                key: 'alt',
                required: true
            },
            {
                label: 'Image URL (https://...)',
                defaultValue: 'https://',
                inputType: 'url',
                key: 'url',
                required: true
            }
        ], 'Insert Image');

        if (!result) {
            console.log('Image insertion cancelled');
            return;
        }

        const altText = result.alt || 'image';
        const url = result.url;

        if (!url) {
            console.log('Image insertion cancelled - no URL');
            return;
        }

        const imageSyntax = `![${altText}](${url})`;
        console.log('Inserting image:', imageSyntax);
        replaceSelection(imageSyntax, imageSyntax.length);
    };

    // Insert a customizable Markdown table via dialog
    const insertTable = async () => {
        const { start, end, value } = getSelection();
        const before = value.slice(0, start);
        const after = value.slice(end);

        // Prevent inserting inside fenced code block
        const backticksBefore = (before.match(/```/g) || []).length;
        const isInsideCodeBlock = backticksBefore % 2 !== 0;
        if (isInsideCodeBlock) {
            autosaveStatus.textContent = 'Cannot insert table inside code block';
            await alertDialog('Tables cannot be inserted inside code blocks.', 'Insert Table');
            return;
        }

        // Ask user for rows/cols and header row
        const result = await multiPromptDialog([
            { label: 'Columns (1-12)', defaultValue: '2', inputType: 'number', key: 'cols', required: true },
            { label: 'Rows (1-50)', defaultValue: '2', inputType: 'number', key: 'rows', required: true },
            { label: 'Include header row? (yes/no)', defaultValue: 'yes', inputType: 'text', key: 'header', required: true }
        ], 'Insert Table');

        if (!result) {
            return;
        }

        const toInt = (s, def) => {
            const n = parseInt(String(s).trim(), 10);
            return Number.isFinite(n) ? n : def;
        };

        let cols = Math.max(1, Math.min(12, toInt(result.cols, 2)));
        let rows = Math.max(1, Math.min(50, toInt(result.rows, 2)));
        const headerYes = String(result.header || 'yes').trim().toLowerCase();
        const includeHeader = headerYes === 'y' || headerYes === 'yes' || headerYes === 'true' || headerYes === '1';

        // Build table
        const headerCells = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(' | ');
        const separator = Array.from({ length: cols }, () => '---').join(' | ');
        const bodyRowsCount = includeHeader ? Math.max(1, rows) : rows; // keep rows as requested if no header

        const bodyRows = [];
        for (let r = 0; r < bodyRowsCount; r += 1) {
            const cells = Array.from({ length: cols }, (_, c) => `Cell ${r + 1}-${c + 1}`).join(' | ');
            bodyRows.push(`| ${cells} |`);
        }

        const lines = [];
        if (includeHeader) {
            lines.push(`| ${headerCells} |`);
            lines.push(`| ${separator} |`);
        } else {
            // If no header, still include a separator to render properly in many parsers
            const firstRow = Array.from({ length: cols }, (_, c) => `Cell 1-${c + 1}`).join(' | ');
            lines.push(`| ${firstRow} |`);
            lines.push(`| ${separator} |`);
            // shift body rows start since we already added first data row
            bodyRows.shift();
        }
        lines.push(...bodyRows);

        const table = lines.join('\n');
        const leading = start > 0 && !before.endsWith('\n') ? '\n\n' : '';
        const trailing = after.startsWith('\n') || after.length === 0 ? '' : '\n\n';
        const inserted = `${leading}${table}${trailing}`;

        // Place caret on the first editable header/data cell text
        const placeholder = includeHeader ? 'Header 1' : 'Cell 1-1';
        const placeholderIndex = inserted.indexOf(placeholder);
        if (placeholderIndex >= 0) {
            replaceSelection(inserted, {
                start: placeholderIndex,
                end: placeholderIndex + placeholder.length
            });
        } else {
            replaceSelection(inserted, inserted.length - trailing.length);
        }
    };

    const handleFormatting = (action) => {
        switch (action) {
            case 'bold':
                applyInlineFormat('**', '**', 'bold text');
                break;
            case 'italic':
                applyInlineFormat('*', '*', 'italic text');
                break;
            case 'strikethrough':
                applyInlineFormat('~~', '~~', 'deleted text');
                break;
            case 'code':
                applyInlineFormat('`', '`', 'code');
                break;
            case 'h1':
                applyHeading(1);
                break;
            case 'h2':
                applyHeading(2);
                break;
            case 'h3':
                applyHeading(3);
                break;
            case 'ul':
                toggleList('ul');
                break;
            case 'ol':
                toggleList('ol');
                break;
            case 'codeBlock':
                applyCodeBlock();
                break;
            case 'link':
                insertLink();
                break;
            case 'image':
                insertImage();
                break;
            case 'table':
                insertTable();
                break;
            default:
                break;
        }
    };

    const handleToolbarClick = (event) => {
        const target = event.target.closest('button[data-format]');
        if (!target) {
            return;
        }
        event.preventDefault();
        console.log('Toolbar button clicked:', target.dataset.format);
        handleFormatting(target.dataset.format);
    };

    // Resize handle functionality
    const initializeResize = () => {
        if (!resizeHandle || !editorPane || !previewPane) {
            return;
        }

        // Helper function to set split ratio
        const setSplitRatio = (ratio) => {
            if (!editorPane || !previewPane) return;
            const editorPercent = Math.max(20, Math.min(80, ratio * 100));
            const previewPercent = 100 - editorPercent;
            editorPane.style.flex = `0 0 ${editorPercent}%`;
            previewPane.style.flex = `0 0 ${previewPercent}%`;
        };

        // Restore saved split ratio or use default 50/50
        let splitRatio = 0.5;
        if (window.localStorage) {
            try {
                const saved = localStorage.getItem(SPLIT_RATIO_KEY);
                if (saved !== null) {
                    splitRatio = parseFloat(saved);
                    // Validate ratio is between 0.2 and 0.8
                    splitRatio = Math.max(0.2, Math.min(0.8, splitRatio));
                }
            } catch (error) {
                console.error('Failed to restore split ratio', error);
            }
        }

        // Set initial split
        setSplitRatio(splitRatio);

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        let startContainerWidth = 0;
        let animationFrameId = null;
        let resizeTimeout = null;

        const startResize = (e) => {
            if (!state.isPreviewVisible) return;
            
            isResizing = true;
            resizeHandle.classList.add('dragging');
            startX = e.clientX || (e.touches && e.touches[0].clientX);
            startContainerWidth = editorContainer.offsetWidth;
            
            // Get actual pixel width of editor pane
            startWidth = editorPane.offsetWidth;

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            // Cancel any pending animation frames
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            e.preventDefault();
        };

        const resize = (e) => {
            if (!isResizing) return;

            const currentX = e.clientX || (e.touches && e.touches[0].clientX);
            const diffX = currentX - startX;
            const newWidth = startWidth + diffX;
            
            // Calculate new ratio based on actual pixel width
            const containerWidth = editorContainer.offsetWidth;
            const handleWidth = resizeHandle.offsetWidth;
            const availableWidth = containerWidth - handleWidth;
            const minWidth = availableWidth * 0.2;
            const maxWidth = availableWidth * 0.8;
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            const newRatio = clampedWidth / availableWidth;

            // Cancel any pending animation frame
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }

            // Use requestAnimationFrame for smooth updates
            animationFrameId = requestAnimationFrame(() => {
                setSplitRatio(newRatio);
                animationFrameId = null;
            });
            
            e.preventDefault();
        };

        const stopResize = () => {
            if (!isResizing) return;
            
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Cancel any pending animation frame
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            // Defer resize event dispatch and save to avoid blocking
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Trigger resize event to update preview wrapping (debounced)
                window.dispatchEvent(new Event('resize'));
                
                // Save split ratio
                if (window.localStorage && editorPane && editorContainer) {
                    try {
                        const currentRatio = (editorPane.offsetWidth / editorContainer.offsetWidth);
                        localStorage.setItem(SPLIT_RATIO_KEY, currentRatio.toString());
                    } catch (error) {
                        console.error('Failed to save split ratio', error);
                    }
                }
            }, 150);
        };

        // Mouse events
        const handleMouseMove = (e) => {
            resize(e);
        };
        
        const handleMouseUp = () => {
            stopResize();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseleave', handleMouseUp);
        };
        
        resizeHandle.addEventListener('mousedown', (e) => {
            startResize(e);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mouseleave', handleMouseUp);
        });

        // Touch events for mobile
        const handleTouchMove = (e) => {
            resize(e);
        };
        
        const handleTouchEnd = () => {
            stopResize();
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
        
        resizeHandle.addEventListener('touchstart', (e) => {
            startResize(e);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
        });

        // Pointer events (unified input) for reliable initial drag
        const handlePointerMove = (e) => {
            resize(e);
        };
        const handlePointerUp = (e) => {
            stopResize();
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
            try { if (typeof e?.pointerId === 'number') resizeHandle.releasePointerCapture(e.pointerId); } catch (_) {}
        };
        resizeHandle.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // prevent text selection/scroll gestures stealing first drag
            startResize(e);
            try { if (typeof e.pointerId === 'number') resizeHandle.setPointerCapture(e.pointerId); } catch (_) {}
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            document.addEventListener('pointercancel', handlePointerUp);
        });

        // Prevent default drag/ghost-image behavior that can steal the first drag
        resizeHandle.addEventListener('dragstart', (e) => { e.preventDefault(); });

        // Ensure the handle itself is not draggable and hints to the UA not to initiate other gestures
        try { resizeHandle.setAttribute('draggable', 'false'); } catch (_) {}

        // Keyboard support (Arrow keys to adjust split)
        resizeHandle.addEventListener('keydown', (e) => {
            if (!state.isPreviewVisible) return;
            
            let ratio = 0.5;
            if (window.localStorage) {
                try {
                    const saved = localStorage.getItem(SPLIT_RATIO_KEY);
                    if (saved !== null) {
                        ratio = parseFloat(saved);
                    }
                } catch (error) {
                    // Ignore
                }
            }

            let newRatio = ratio;
            const step = 0.05;

            if (e.key === 'ArrowLeft') {
                newRatio = Math.max(0.2, ratio - step);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                newRatio = Math.min(0.8, ratio + step);
                e.preventDefault();
            } else {
                return;
            }

            setSplitRatio(newRatio);
            if (window.localStorage) {
                try {
                    localStorage.setItem(SPLIT_RATIO_KEY, newRatio.toString());
                } catch (error) {
                    console.error('Failed to save split ratio', error);
                }
            }
        });
    };

    const togglePreview = () => {
        state.isPreviewVisible = !state.isPreviewVisible;
        togglePreviewButton.setAttribute('aria-pressed', state.isPreviewVisible);
        editorContainer.classList.toggle('preview-hidden', !state.isPreviewVisible);
        
        // Hide/show resize handle based on preview visibility
        if (resizeHandle) {
            if (state.isPreviewVisible) {
                resizeHandle.style.display = '';
            } else {
                resizeHandle.style.display = 'none';
                // Reset editor pane to full width when preview is hidden
                if (editorPane) {
                    editorPane.style.flex = '1 1 100%';
                }
            }
        }
        
        togglePreviewButton.title = state.isPreviewVisible ? 'Hide preview (Ctrl+Shift+P)' : 'Show preview (Ctrl+Shift+P)';
        
        // Persist preview state
        if (window.localStorage) {
            try {
                localStorage.setItem('markdown-editor-preview', state.isPreviewVisible ? 'visible' : 'hidden');
            } catch (error) {
                console.error('Failed to persist preview state', error);
            }
        }
        
        // Trigger resize to update wrapping
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 10);
    };

    // Toggle the global theme and keep the toggle state accessible for assistive tech.
    const applyTheme = (isDark) => {
        document.body.classList.toggle('theme-dark', isDark);
        document.body.classList.toggle('theme-light', !isDark);
        darkModeToggle.setAttribute('aria-checked', isDark);
        darkModeToggle.querySelector('.btn-text').textContent = isDark ? 'Light' : 'Dark';
        const iconElement = darkModeToggle.querySelector('.btn-icon');
        if (iconElement) {
            iconElement.textContent = isDark ? '☀️' : '🌙';
        }
    };

    const toggleDarkMode = () => {
        const isDark = !document.body.classList.contains('theme-dark');
        applyTheme(isDark);
        autosaveStatus.textContent = isDark ? 'Dark mode on' : 'Dark mode off';
        persistThemePreference(isDark);
    };

    const initializeTheme = () => {
        let isDark = document.body.classList.contains('theme-dark');

        if (window.localStorage) {
            const storedPreference = localStorage.getItem(THEME_KEY);
            if (storedPreference) {
                isDark = storedPreference === 'dark';
            }
        }

        applyTheme(isDark);
    };

    const initializePreviewState = () => {
        if (window.localStorage) {
            const storedPreview = localStorage.getItem('markdown-editor-preview');
            if (storedPreview === 'hidden') {
                state.isPreviewVisible = false;
                togglePreviewButton.setAttribute('aria-pressed', 'false');
                editorContainer.classList.add('preview-hidden');
                togglePreviewButton.title = 'Show preview (Ctrl+Shift+P)';
                if (resizeHandle) {
                    resizeHandle.style.display = 'none';
                }
            }
        }
    };

    // Keep raw highlight overlay scrolling in sync with textarea
    if (editor && editorHighlights) {
        editor.addEventListener('scroll', () => {
            editorHighlights.scrollTop = editor.scrollTop;
            editorHighlights.scrollLeft = editor.scrollLeft;
        });
    }

    const handleFilenameEdit = () => {
        fileNameDisplay.contentEditable = 'true';
        fileNameDisplay.dataset.originalName = fileNameDisplay.textContent.trim();
        fileNameDisplay.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(fileNameDisplay);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    const finalizeFilename = () => {
        fileNameDisplay.textContent = fileNameDisplay.textContent.trim() || 'Untitled.md';
        fileNameDisplay.contentEditable = 'false';
        delete fileNameDisplay.dataset.originalName;
        scheduleAutosave();
    };

    // Helper functions for button loading states
    const setButtonLoading = (button, loading = true) => {
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            const originalText = button.querySelector('.btn-text')?.textContent || button.textContent;
            button.dataset.originalText = originalText;
            if (button.querySelector('.btn-text')) {
                button.querySelector('.btn-text').textContent = 'Loading...';
            }
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            const originalText = button.dataset.originalText || 'Open';
            if (button.querySelector('.btn-text')) {
                button.querySelector('.btn-text').textContent = originalText;
            }
            delete button.dataset.originalText;
        }
    };

    const loadFile = async () => {
        if (state.dirty) {
            const confirmed = await confirmDialog(
                'You have unsaved changes. Continue opening a file?',
                'Unsaved Changes',
                { confirmLabel: 'Continue', cancelLabel: 'Cancel' }
            );
            if (!confirmed) {
                return;
            }
        }
        
        // Set loading state
        setButtonLoading(openButton, true);
        
        // Trigger file input click
        fileInput.click();
        
        // Note: Loading state will be cleared in readFile after file is loaded or error occurs
    };

    const readFile = async (file) => {
        // Clear loading state when file selection is made (even if invalid)
        setButtonLoading(openButton, false);
        
        if (!/\.(md|markdown)$/i.test(file.name)) {
            autosaveStatus.textContent = 'Only Markdown files can be opened';
            await alertDialog('Please choose a Markdown (.md or .markdown) file.', 'Invalid File Type');
            return;
        }

        // Set loading state while reading file
        setButtonLoading(openButton, true);
        autosaveStatus.textContent = 'Opening file...';

        const reader = new FileReader();
        reader.onload = () => {
            editor.value = reader.result;
            updatePreview();
            updateCounters();
            fileNameDisplay.textContent = file.name;
            state.lastSavedContent = editor.value;
            markDirty(false);
            autosaveStatus.textContent = `Opened ${file.name}`;
            scheduleAutosave();
            // reset history baseline to loaded document
            state.historyStack = [getEditorSnapshot()];
            state.futureStack = [];
            updateToolbarStates();
            // Close and clear find/replace UI and highlights for new document
            if (findBar) {
                findBar.hidden = true;
            }
            if (findInput) findInput.value = '';
            if (replaceInput) replaceInput.value = '';
            if (findCount) findCount.textContent = '0/0';
            searchState.matches = [];
            searchState.current = -1;
            if (editorHighlights) editorHighlights.innerHTML = '';
            if (toggleFindButton) {
                toggleFindButton.setAttribute('aria-pressed', 'false');
                toggleFindButton.classList.remove('active');
            }
            setButtonLoading(openButton, false);
        };
        reader.onerror = async () => {
            console.error('Failed to read file', reader.error);
            autosaveStatus.textContent = 'Unable to open file';
            setButtonLoading(openButton, false);
            await alertDialog('Unable to open the selected file.', 'Error Opening File');
        };
        reader.readAsText(file);
    };

    const saveFile = async () => {
        // Set loading state
        setButtonLoading(saveButton, true);
        autosaveStatus.textContent = 'Saving...';

        let filename = fileNameDisplay.textContent.trim();

        if (!filename || filename === 'Untitled.md') {
            const response = await promptDialog(
                'Enter a file name for your markdown document',
                filename || 'Untitled.md',
                'text',
                'Save File'
            );
            if (response === null) {
                autosaveStatus.textContent = 'Save cancelled';
                setButtonLoading(saveButton, false);
                return false;
            }
            filename = response.trim() || 'Untitled.md';
        }

        try {
            const normalizedName = filename.endsWith('.md') ? filename : `${filename}.md`;
            fileNameDisplay.textContent = normalizedName;
            fileNameDisplay.contentEditable = 'false';
            delete fileNameDisplay.dataset.originalName;

            const blob = new Blob([editor.value], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = normalizedName;
            document.body.appendChild(link);
            link.click();
            
            // Small delay to ensure download starts before cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                setButtonLoading(saveButton, false);
            }, 100);
            
            state.lastSavedContent = editor.value;
            markDirty(false);
            autosaveStatus.textContent = `Saved ${link.download}`;
            scheduleAutosave();
            return true;
        } catch (error) {
            console.error('Save failed', error);
            autosaveStatus.textContent = 'Save failed';
            setButtonLoading(saveButton, false);
            return false;
        }
    };

    /**
     * Show an export options dialog with HTML, PDF, and Plain Text options
     * @returns {Promise<string|null>} - Resolves with export format or null if cancelled
     */
    const showExportDialog = () => new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'export-dialog-title');

        const titleElement = document.createElement('h2');
        titleElement.id = 'export-dialog-title';
        titleElement.className = 'dialog-label';
        titleElement.textContent = 'Export Document';
        titleElement.style.marginTop = '0';

        const messageElement = document.createElement('p');
        messageElement.className = 'dialog-message';
        messageElement.textContent = 'Choose an export format:';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '0.5rem';
        buttonContainer.style.marginTop = '0.5rem';

        const formats = [
            { format: 'html', label: 'HTML', icon: '🌐' },
            { format: 'pdf', label: 'PDF / Print', icon: '📄' },
            { format: 'txt', label: 'Plain Text', icon: '📝' }
        ];

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
            editor.focus();
        };

        const handleExport = (format) => {
            cleanup();
            resolve(format);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                cleanup();
                resolve(null);
            }
        };

        formats.forEach(({ format, label, icon }) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'dialog-btn';
            button.style.justifyContent = 'flex-start';
            button.innerHTML = `<span style="margin-right: 0.5rem; font-size: 1.2em;">${icon}</span>${label}`;
            button.addEventListener('click', () => handleExport(format));
            buttonContainer.appendChild(button);
        });

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'dialog-btn';
        cancelButton.textContent = 'Cancel';
        cancelButton.style.marginTop = '0.5rem';

        const actions = document.createElement('div');
        actions.className = 'dialog-actions';
        actions.style.marginTop = '1rem';
        actions.appendChild(cancelButton);

        dialog.appendChild(titleElement);
        dialog.appendChild(messageElement);
        dialog.appendChild(buttonContainer);
        dialog.appendChild(actions);

        overlay.appendChild(dialog);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                cleanup();
                resolve(null);
            }
        });

        cancelButton.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });

        document.body.appendChild(overlay);
        document.addEventListener('keydown', handleKeyDown);

        // Focus the first export button
        setTimeout(() => buttonContainer.firstChild?.focus(), 10);
    });

    /**
     * Export document as HTML
     */
    const exportToHtml = async () => {
        const filename = fileNameDisplay.textContent.trim().replace(/\.md$/, '');
        const htmlFilename = filename.endsWith('.html') ? filename : `${filename}.html`;

        // Get the preview HTML content
        const rawHtml = window.markedLite.parse(editor.value);
        const safeHtml = window.simpleSanitizer.sanitize(rawHtml);

        // Create a complete HTML document
        const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #1f2a3d;
            background-color: #f7f9fc;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        pre {
            background: rgb(15 23 42 / 0.08);
            padding: 0.85rem;
            border-radius: 0.5rem;
            overflow-x: auto;
        }
        code {
            font-family: "Fira Code", "Cascadia Code", Menlo, monospace;
            background: rgb(15 23 42 / 0.08);
            padding: 0.15rem 0.35rem;
            border-radius: 0.35rem;
        }
        pre code {
            background: transparent;
            padding: 0;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
        }
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #111827;
                color: #e5e7eb;
            }
            pre {
                background: rgb(255 255 255 / 0.08);
            }
            code {
                background: rgb(255 255 255 / 0.08);
            }
        }
    </style>
</head>
<body>
${safeHtml}
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
<script>
if (window.Prism) {
    window.Prism.highlightAll();
}
</script>
</body>
</html>`;

        const blob = new Blob([htmlDoc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = htmlFilename;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    };

    /**
     * Export document as Plain Text
     */
    const exportToPlainText = async () => {
        const filename = fileNameDisplay.textContent.trim().replace(/\.md$/, '');
        const txtFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;

        const blob = new Blob([editor.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = txtFilename;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    };

    /**
     * Export document as PDF using browser print API
     */
    const exportToPdf = () => {
        // Create a new window with the preview HTML
        const rawHtml = window.markedLite.parse(editor.value);
        const safeHtml = window.simpleSanitizer.sanitize(rawHtml);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alertDialog('Please allow pop-ups to export as PDF.', 'PDF Export');
            return;
        }

        printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Export to PDF</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css">
    <style>
        @media print {
            body { margin: 0; }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #1f2a3d;
            padding: 2rem;
        }
        pre {
            background: rgb(15 23 42 / 0.08);
            padding: 0.85rem;
            border-radius: 0.5rem;
            overflow-x: auto;
        }
        code {
            font-family: "Fira Code", "Cascadia Code", Menlo, monospace;
            background: rgb(15 23 42 / 0.08);
            padding: 0.15rem 0.35rem;
            border-radius: 0.35rem;
        }
        pre code {
            background: transparent;
            padding: 0;
        }
        img {
            max-width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
${safeHtml}
</body>
</html>`);

        printWindow.document.close();

        // Wait for content to load, then trigger print dialog
        setTimeout(() => {
            printWindow.print();
            // Clean up the window after a short delay
            setTimeout(() => {
                printWindow.close();
            }, 1000);
        }, 250);
    };

    /**
     * Main export function - shows dialog and handles export based on selection
     */
    const handleExport = async () => {
        const exportFormat = await showExportDialog();

        if (!exportFormat) {
            autosaveStatus.textContent = 'Export cancelled';
            return;
        }

        try {
            autosaveStatus.textContent = 'Exporting...';
            
            switch (exportFormat) {
                case 'html':
                    await exportToHtml();
                    autosaveStatus.textContent = 'Exported as HTML';
                    break;
                case 'pdf':
                    exportToPdf();
                    autosaveStatus.textContent = 'Opening PDF export...';
                    break;
                case 'txt':
                    await exportToPlainText();
                    autosaveStatus.textContent = 'Exported as plain text';
                    break;
            }
        } catch (error) {
            console.error('Export failed', error);
            autosaveStatus.textContent = 'Export failed';
            await alertDialog('An error occurred while exporting the document.', 'Export Error');
        }
    };

    const resetEditorState = () => {
        editor.value = '';
        updatePreview();
        updateCounters();
        fileNameDisplay.textContent = 'Untitled.md';
        fileNameDisplay.contentEditable = 'false';
        delete fileNameDisplay.dataset.originalName;
        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = null;
        state.lastSavedContent = '';
        markDirty(false);
        autosaveStatus.textContent = 'Ready';
        clearAutosaveDraft();
        setSelection(0, 0);
        // Close and clear find/replace UI and highlights
        if (findBar) {
            findBar.hidden = true;
        }
        if (findInput) findInput.value = '';
        if (replaceInput) replaceInput.value = '';
        if (findCount) findCount.textContent = '0/0';
        searchState.matches = [];
        searchState.current = -1;
        if (editorHighlights) editorHighlights.innerHTML = '';
        if (toggleFindButton) {
            toggleFindButton.setAttribute('aria-pressed', 'false');
            toggleFindButton.classList.remove('active');
        }
    };

    const handleNewDocument = async () => {
        const hasUnsavedChanges = state.dirty && editor.value !== state.lastSavedContent;

        if (!hasUnsavedChanges) {
            resetEditorState();
            return;
        }

        const choice = await showUnsavedChangesDialog();

        if (choice === 'save') {
            if (saveFile()) {
                resetEditorState();
            }
        } else if (choice === 'discard') {
            resetEditorState();
        }
    };

    const handleShortcut = (event) => {
        const key = event.key.toLowerCase();
        const ctrlOrCmd = event.ctrlKey || event.metaKey;

        if (!ctrlOrCmd) {
            return;
        }

        if (event.shiftKey) {
            switch (key) {
                case '7':
                    event.preventDefault();
                    handleFormatting('ol');
                    return;
                case '8':
                    event.preventDefault();
                    handleFormatting('ul');
                    return;
                case 'c':
                    event.preventDefault();
                    handleFormatting('codeBlock');
                    return;
                case 'z':
                    event.preventDefault();
                    // Ctrl/Cmd+Shift+Z -> redo
                    redo();
                    return;
                case 'p':
                    event.preventDefault();
                    togglePreview();
                    return;
                default:
                    break;
            }
        }

        switch (key) {
            case 'f':
                event.preventDefault();
                openFind();
                break;
            case 'h':
                event.preventDefault();
                openFind();
                break;
            case 'z':
                event.preventDefault();
                // Ctrl/Cmd+Z -> undo
                undo();
                break;
            case 'y':
                event.preventDefault();
                // Ctrl/Cmd+Y -> redo
                redo();
                break;
            case 'b':
                event.preventDefault();
                handleFormatting('bold');
                break;
            case 'i':
                event.preventDefault();
                handleFormatting('italic');
                break;
            case 'k':
                event.preventDefault();
                handleFormatting('link');
                break;
            case '1':
                event.preventDefault();
                handleFormatting('h1');
                break;
            case '2':
                event.preventDefault();
                handleFormatting('h2');
                break;
            case '3':
                event.preventDefault();
                handleFormatting('h3');
                break;
            case 's':
                event.preventDefault();
                saveFile();
                break;
            case 'o':
                event.preventDefault();
                loadFile();
                break;
            case '`':
                event.preventDefault();
                handleFormatting('code');
                break;
            default:
                break;
        }
    };

    const buildSearchRegex = (query) => {
        if (!query) return null;
        try {
            if (findRegex && findRegex.checked) {
                return new RegExp(query, findCase?.checked ? 'g' : 'gi');
            }
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = findWhole?.checked ? `(^|[^\\w])(${escaped})(?=[^\\w]|$)` : escaped;
            return new RegExp(pattern, findCase?.checked ? 'g' : 'gi');
        } catch (e) {
            return null;
        }
    };

    // Highlight all hits in the preview
    const clearPreviewHighlights = () => {
        const marks = preview.querySelectorAll('.find-hit');
        marks.forEach((mark) => {
            const parent = mark.parentNode;
            if (!parent) return;
            while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
            parent.removeChild(mark);
            parent.normalize();
        });
    };

    const highlightPreviewFindHits = () => {
        clearPreviewHighlights();
        const query = findInput?.value || '';
        const regex = buildSearchRegex(query);
        if (!regex || !query) return;

        const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                // Skip hidden nodes or empty
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                // Avoid highlighting inside interactive controls (none expected) but keep in code/pre
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);

        let total = 0;
        textNodes.forEach((text) => {
            const value = text.nodeValue;
            let m;
            let lastIndex = 0;
            const fragments = [];
            const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
            while ((m = re.exec(value)) !== null) {
                const start = m.index + (m[1] ? m[1].length : 0);
                const len = (m[2] ? m[2].length : m[0].length);
                const end = start + len;
                if (start > lastIndex) {
                    fragments.push(document.createTextNode(value.slice(lastIndex, start)));
                }
                const mark = document.createElement('mark');
                mark.className = 'find-hit';
                mark.textContent = value.slice(start, end);
                fragments.push(mark);
                lastIndex = end;
                total += 1;
            }
            if (lastIndex === 0) return; // no match in this node
            if (lastIndex < value.length) fragments.push(document.createTextNode(value.slice(lastIndex)));
            const parent = text.parentNode;
            if (!parent) return;
            fragments.forEach((f) => parent.insertBefore(f, text));
            parent.removeChild(text);
        });

        // Update count in the UI based on current match index
        // Recompute global match positions from the editor text so selection aligns
        const positions = [];
        const src = editor.value;
        const reAll = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        let mm;
        while ((mm = reAll.exec(src)) !== null) {
            const s = mm.index + (mm[1] ? mm[1].length : 0);
            const l = (mm[2] ? mm[2].length : mm[0].length);
            positions.push({ start: s, end: s + l });
        }
        searchState.matches = positions;
        if (findCount) {
            const cur = searchState.current >= 0 ? searchState.current + 1 : 0;
            findCount.textContent = `${cur}/${positions.length}`;
        }
    };

    // Render highlights in raw editor overlay using the computed match positions
    const escapeHtml = (s) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Apply syntax highlighting to code blocks in editor overlay
    const updateSyntaxHighlights = () => {
        if (!editorHighlights || !window.Prism) {
            if (editorHighlights && !window.Prism) {
                // Prism not loaded yet, just show escaped text
                editorHighlights.innerHTML = escapeHtml(editor.value || '');
                editorHighlights.scrollTop = editor.scrollTop;
            }
            return;
        }
        
        const text = editor.value || '';
        if (!text) {
            editorHighlights.innerHTML = '';
            return;
        }

        // Parse code blocks: find all ```...``` patterns (non-greedy)
        // Matches: ```lang (optional) followed by code content and closing ```
        const codeBlockRegex = /(```[\w\s]*\n?[\s\S]*?\n?```)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Add text before code block
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: text.slice(lastIndex, match.index)
                });
            }

            // Process code block
            const codeBlock = match[0];
            const lines = codeBlock.split('\n');
            
            if (lines.length >= 3) {
                // Extract language from first line (```lang or ```lang )
                const firstLine = lines[0];
                const languageMatch = firstLine.match(/^```\s*(\w+)/);
                const language = languageMatch ? languageMatch[1].toLowerCase() : '';
                
                // Extract code content (everything between first and last line)
                const codeContent = lines.slice(1, -1).join('\n');
                
                // Highlight code with Prism if language is specified and supported
                let highlightedCode = escapeHtml(codeContent);
                if (language && window.Prism) {
                    // Check if language is loaded, if not wait for autoloader or use plain text
                    if (window.Prism.languages[language]) {
                        try {
                            highlightedCode = window.Prism.highlight(codeContent, window.Prism.languages[language], language);
                        } catch (error) {
                            // Fallback to escaped HTML if highlighting fails
                            highlightedCode = escapeHtml(codeContent);
                        }
                    } else {
                        // Language not loaded yet, try autoloader or show as plain text
                        // For now, just use escaped HTML - autoloader will handle on next render
                        highlightedCode = escapeHtml(codeContent);
                    }
                }
                
                // Reconstruct code block preserving line structure
                // Fence markers are escaped, code content is highlighted
                const openingFence = escapeHtml(firstLine);
                const closingFence = escapeHtml('```');
                parts.push({
                    type: 'code',
                    openingFence: openingFence,
                    highlightedCode: highlightedCode,
                    closingFence: closingFence
                });
            } else {
                // Malformed code block, treat as text
                parts.push({
                    type: 'text',
                    content: codeBlock
                });
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after last code block
        if (lastIndex < text.length) {
            parts.push({
                type: 'text',
                content: text.slice(lastIndex)
            });
        }

        // Build HTML preserving exact structure with line breaks
        let html = '';
        parts.forEach((part) => {
            if (part.type === 'code') {
                // Render: escaped opening fence + newline + highlighted code + newline + escaped closing fence
                html += part.openingFence + '\n' + part.highlightedCode + '\n' + part.closingFence;
            } else {
                html += escapeHtml(part.content);
            }
        });

        editorHighlights.innerHTML = html;
        
        // Keep scroll in sync
        editorHighlights.scrollTop = editor.scrollTop;
    };

    const updateRawHighlights = () => {
        if (!editorHighlights) return;
        if (!findBar || findBar.hidden) {
            // Show syntax highlighting when find bar is hidden
            updateSyntaxHighlights();
            return;
        }
        const text = editor.value || '';
        const query = findInput?.value || '';
        const regex = buildSearchRegex(query);
        if (!regex || !query) {
            editorHighlights.innerHTML = escapeHtml(text);
            return;
        }

        // Ensure positions are up-to-date
        const positions = [];
        const reAll = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        let mm;
        while ((mm = reAll.exec(text)) !== null) {
            const s = mm.index + (mm[1] ? mm[1].length : 0);
            const l = (mm[2] ? mm[2].length : mm[0].length);
            positions.push({ start: s, end: s + l });
        }
        searchState.matches = positions;

        let html = '';
        let last = 0;
        positions.forEach((pos, idx) => {
            if (pos.start > last) html += escapeHtml(text.slice(last, pos.start));
            const cls = (idx === searchState.current) ? 'find-hit-current' : 'find-hit';
            html += `<mark class="${cls}">` + escapeHtml(text.slice(pos.start, pos.end)) + '</mark>';
            last = pos.end;
        });
        html += escapeHtml(text.slice(last));
        editorHighlights.innerHTML = html;
        // Keep scroll in sync
        editorHighlights.scrollTop = editor.scrollTop;
    };

    const scrollCurrentRawHitIntoView = (center = true) => {
        if (!editor || !editorHighlights) return;
        const current = editorHighlights.querySelector('.find-hit-current');
        if (!current) return;

        // 1) Center within the textarea's own scroll area
        if (center) {
            const hitOffsetTop = current.offsetTop; // relative to overlay container
            const hitHeight = current.offsetHeight || 1;
            const desiredTop = hitOffsetTop - (editor.clientHeight / 2 - hitHeight / 2);
            const maxScroll = Math.max(0, editor.scrollHeight - editor.clientHeight);
            const targetScroll = Math.min(maxScroll, Math.max(0, desiredTop));
            if (Math.abs(editor.scrollTop - targetScroll) > 1) {
                editor.scrollTop = targetScroll;
                editorHighlights.scrollTop = targetScroll;
            }
        } else {
            // Ensure at least visible if not centering
            const hitRect = current.getBoundingClientRect();
            const containerRect = editor.getBoundingClientRect();
            const isAbove = hitRect.top < containerRect.top;
            const isBelow = hitRect.bottom > containerRect.bottom;
            if (isAbove || isBelow) {
                const offsetFromTop = hitRect.top - containerRect.top;
                const targetScrollTop = editor.scrollTop + offsetFromTop;
                editor.scrollTop = targetScrollTop;
                editorHighlights.scrollTop = targetScrollTop;
            }
        }

        // 2) Center the hit within the viewport (account for sticky header/toolbar/find bar)
        requestAnimationFrame(() => {
            const currentRect = current.getBoundingClientRect();
            const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
            const toolbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--toolbar-height')) || 0;
            const findH = (findBar && !findBar.hidden) ? findBar.getBoundingClientRect().height : 0;
            const topInset = headerH + toolbarH + findH;
            const usableHeight = window.innerHeight - topInset;
            const desiredCenterY = topInset + usableHeight / 2;
            const hitCenterY = currentRect.top + currentRect.height / 2;
            const deltaY = hitCenterY - desiredCenterY;
            if (Math.abs(deltaY) > 1) {
                window.scrollBy({ top: deltaY, left: 0, behavior: 'smooth' });
            }
        });
    };

    const findInEditor = (direction = 1) => {
        const query = findInput?.value || '';
        if (!query) return false;
        const regex = buildSearchRegex(query);
        if (!regex) return false;

        const value = editor.value;
        const startFrom = direction === -1 ? Math.max(0, editor.selectionStart - 1) : Math.max(editor.selectionEnd, searchState.lastIndex);

        // Forward search from startFrom
        regex.lastIndex = startFrom;
        let match = regex.exec(value);

        // Wrap-around
        if (!match && startFrom > 0) {
            regex.lastIndex = 0;
            match = regex.exec(value);
        }

        if (match) {
            let s = match.index;
            let e = s + (match[2] ? match[2].length : match[0].length);
            // When whole-word using groups, adjust indices
            if (match[2]) {
                s = match.index + (match[1] ? match[1].length : 0);
            }
            editor.focus();
            editor.setSelectionRange(s, e);
            // Determine current match index for count and scrolling
            if (searchState.matches && searchState.matches.length > 0) {
                const idx = searchState.matches.findIndex((p) => p.start === s && p.end === e);
                searchState.current = idx;
                if (findCount) findCount.textContent = `${idx + 1}/${searchState.matches.length}`;
                updateRawHighlights();
                scrollCurrentRawHitIntoView(true);
            }
            // For the first query, ensure raw overlay renders and caret visible
            if (searchState.freshQuery) {
                updateRawHighlights();
                scrollCurrentRawHitIntoView(true);
                searchState.freshQuery = false;
            }
            searchState.lastIndex = e;
            return true;
        }
        return false;
    };

    const replaceOne = () => {
        const query = findInput?.value || '';
        const replacement = replaceInput?.value ?? '';
        if (!query) return false;
        const regex = buildSearchRegex(query);
        if (!regex) return false;
        const { start, end, value } = getSelection();
        const selected = value.slice(start, end);
        let matchOk = false;
        if (findRegex?.checked) {
            try { matchOk = new RegExp(`^${regex.source}$`, regex.flags.replace('g','')).test(selected); } catch (_) { matchOk = false; }
        } else if (findWhole?.checked) {
            const equal = findCase?.checked ? selected === query : selected.toLowerCase() === query.toLowerCase();
            matchOk = equal;
        } else {
            const equal = findCase?.checked ? selected === query : selected.toLowerCase() === query.toLowerCase();
            matchOk = equal;
        }

        if (!matchOk) {
            // move to next match
            if (!findInEditor(1)) return false;
            return replaceOne();
        }

        const before = editor.value.slice(0, start);
        const after = editor.value.slice(end);
        const replaceWith = findRegex?.checked ? selected.replace(new RegExp(regex.source, regex.flags.replace('g','')), replacement) : replacement;
        editor.value = `${before}${replaceWith}${after}`;
        const newPos = before.length + replaceWith.length;
        editor.setSelectionRange(newPos, newPos);
        updatePreview();
        updateCounters();
        markDirty(editor.value !== state.lastSavedContent);
        scheduleAutosave();
        // Record single history entry AFTER change so one undo reverts this replace
        pushHistory();
        // Refresh raw highlights and update counts; keep cursor at this replacement
        updateRawHighlights();
        const totalAfter = (searchState.matches?.length) || 0;
        searchState.current = -1;
        if (findCount) findCount.textContent = `0/${totalAfter}`;
        return true;
    };

    const replaceAll = () => {
        const query = findInput?.value || '';
        const replacement = replaceInput?.value ?? '';
        if (!query) return 0;
        const regex = buildSearchRegex(query);
        if (!regex) return 0;

        const original = editor.value;
        let count = 0;
        let caretAfter = 0;
        if (findRegex?.checked) {
            const reG = new RegExp(regex.source, regex.flags);
            const parts = [];
            let last = 0;
            let accLen = 0;
            let m;
            while ((m = reG.exec(original)) !== null) {
                const s0 = m.index;
                const s = s0 + (m[1] ? m[1].length : 0);
                const e = s + (m[2] ? m[2].length : m[0].length);
                parts.push(original.slice(last, s));
                parts.push(replacement);
                accLen += (s - last) + replacement.length;
                caretAfter = accLen;
                last = e;
                count += 1;
            }
            parts.push(original.slice(last));
            editor.value = parts.join('');
        } else {
            if (findWhole?.checked) {
                // whole word replacement: iterate to build and track caret
                const parts = [];
                let last = 0;
                let accLen = 0;
                const wordRe = buildSearchRegex(query);
                let m;
                while ((m = wordRe.exec(original)) !== null) {
                    const s = m.index + (m[1] ? m[1].length : 0);
                    const e = s + (m[2] ? m[2].length : m[0].length);
                    parts.push(original.slice(last, s));
                    parts.push(replacement);
                    accLen += (s - last) + replacement.length;
                    caretAfter = accLen;
                    last = e;
                    count += 1;
                }
                parts.push(original.slice(last));
                editor.value = parts.join('');
            } else {
                const flags = findCase?.checked ? 'g' : 'gi';
                const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const re = new RegExp(safe, flags);
                const parts = [];
                let last = 0;
                let accLen = 0;
                let m;
                while ((m = re.exec(original)) !== null) {
                    const s = m.index;
                    const e = s + m[0].length;
                    parts.push(original.slice(last, s));
                    parts.push(replacement);
                    accLen += (s - last) + replacement.length;
                    caretAfter = accLen;
                    last = e;
                    count += 1;
                }
                parts.push(original.slice(last));
                editor.value = parts.join('');
            }
        }
        updatePreview();
        updateCounters();
        markDirty(editor.value !== state.lastSavedContent);
        scheduleAutosave();
        // Record single history entry AFTER change so one undo reverts all replacements
        pushHistory();
        // Refresh raw highlights and counts immediately; leave cursor at last replacement
        if (count > 0) {
            editor.setSelectionRange(caretAfter, caretAfter);
        }
        updateRawHighlights();
        const totalAfterAll = (searchState.matches?.length) || 0;
        searchState.current = -1;
        if (findCount) findCount.textContent = `0/${totalAfterAll}`;
        return count;
    };

    const openFind = () => {
        if (!findBar) return;
        findBar.hidden = false;
        setTimeout(() => { findInput.focus(); findInput.select(); }, 0);
        searchState.freshQuery = true;
        updateRawHighlights();
        // highlight toolbar find button
        if (toggleFindButton) {
            toggleFindButton.setAttribute('aria-pressed', 'true');
            toggleFindButton.classList.add('active');
        }
    };

    const closeFind = (clearFields = false) => {
        if (!findBar) return;
        findBar.hidden = true;
        clearPreviewHighlights();
        if (clearFields) {
            if (findInput) findInput.value = '';
            if (replaceInput) replaceInput.value = '';
            if (findCount) findCount.textContent = '0/0';
            searchState.matches = [];
            searchState.current = -1;
        }
        // Update highlights - will show syntax highlighting when find bar is hidden
        updateRawHighlights();
        editor.focus();
        if (toggleFindButton) {
            toggleFindButton.setAttribute('aria-pressed', 'false');
            toggleFindButton.classList.remove('active');
        }
    };

    const recomputeFindBarOffset = () => {
        const toolbarEl = document.querySelector('.toolbar-section');
        const h = toolbarEl ? toolbarEl.getBoundingClientRect().height : 0;
        document.documentElement.style.setProperty('--toolbar-height', `${Math.max(0, Math.round(h))}px`);
    };

    const handleInput = () => {
        updatePreview();
        updateCounters();
        updateToolbarStates();
        autosaveStatus.textContent = 'Saving draft...';
        markDirty(editor.value !== state.lastSavedContent);
        scheduleAutosave();
        pushHistoryDebounced();
        updateRawHighlights();
    };

    const bindEvents = () => {
        toolbar.addEventListener('click', handleToolbarClick);
        editor.addEventListener('input', handleInput);
        editor.addEventListener('selectionchange', updateToolbarStates);
        editor.addEventListener('keyup', updateToolbarStates);
        editor.addEventListener('mouseup', updateToolbarStates);
        togglePreviewButton.addEventListener('click', togglePreview);
        newButton.addEventListener('click', handleNewDocument);
        openButton.addEventListener('click', loadFile);
        saveButton.addEventListener('click', saveFile);
        if (exportButton) {
            exportButton.addEventListener('click', handleExport);
        }
        darkModeToggle.addEventListener('click', toggleDarkMode);

        editor.addEventListener('keydown', handleShortcut);
        document.addEventListener('keydown', handleShortcut);

        fileNameDisplay.addEventListener('click', handleFilenameEdit);
        fileNameDisplay.addEventListener('keydown', (event) => {
            if (fileNameDisplay.isContentEditable) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    finalizeFilename();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    fileNameDisplay.textContent = fileNameDisplay.dataset.originalName || fileNameDisplay.textContent;
                    finalizeFilename();
                }
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleFilenameEdit();
            }
        });
        fileNameDisplay.addEventListener('blur', finalizeFilename);

        fileInput.addEventListener('change', (event) => {
            const [file] = event.target.files;
            if (file) {
                readFile(file);
            }
            fileInput.value = '';
        });

        window.addEventListener('beforeunload', (event) => {
            if (state.dirty) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        window.addEventListener('storage', (event) => {
            if (event.key === AUTOSAVE_KEY && event.newValue !== editor.value) {
                autosaveStatus.textContent = 'Remote change detected';
            }
        });

        // Handle window resize to update preview wrapping
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Force preview to recalculate layout
                if (preview) {
                    preview.style.display = 'none';
                    // Force reflow
                    preview.offsetHeight;
                    preview.style.display = '';
                }
                recomputeFindBarOffset();
            }, 100);
        });

        // Find/Replace bindings
        if (findBar) {
            findNextBtn?.addEventListener('click', () => findInEditor(1));
            findPrevBtn?.addEventListener('click', () => findInEditor(-1));
            toggleFindButton?.addEventListener('click', () => {
                if (!findBar.hidden) {
                    closeFind(true);
                } else {
                    openFind();
                }
            });
            findInput?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    findInEditor(e.shiftKey ? -1 : 1);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeFind(false);
                }
            });
            findInput?.addEventListener('input', () => {
                searchState.lastIndex = 0;
                searchState.freshQuery = true;
                updateRawHighlights();
            });
            // Start search when focus leaves the find box if there is a query
            findInput?.addEventListener('blur', () => {
                const q = findInput.value.trim();
                if (!q) return;
                searchState.lastIndex = 0;
                searchState.freshQuery = true;
                updateRawHighlights();
                // Perform first find and center it
                findInEditor(1);
            });
            [findCase, findRegex, findWhole].forEach((el) => el?.addEventListener('change', () => {
                searchState.lastIndex = 0;
                searchState.freshQuery = true;
                updateRawHighlights();
            }));
            replaceInput?.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
                    e.preventDefault();
                    replaceOne();
                }
            });
            replaceOneBtn?.addEventListener('click', () => replaceOne());
            replaceAllBtn?.addEventListener('click', () => replaceAll());
        }
    };

    initializeTheme();
    initializePreviewState();
    checkAutosaveStatus();
    initializeResize();
    
    // Initialize toolbar states
    updateToolbarStates();
    restoreAutosave();
    updatePreview();
    updateCounters();
    updateRawHighlights(); // Initialize syntax highlighting in editor
    if (!state.autosaveDisabled) {
        autosaveStatus.textContent = 'Ready';
    }
    // seed initial history state
    state.historyStack = [getEditorSnapshot()];
    state.futureStack = [];
    // Ensure find bar hidden on startup
    if (findBar) {
        findBar.hidden = true;
    }
    // Initialize toolbar dynamic height for find bar positioning
    recomputeFindBarOffset();
    bindEvents();
})();
