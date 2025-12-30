/*
 * Markdown Editor - Formatting Module
 * Handles text formatting operations (bold, italic, headers, lists, etc.)
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, utils, history, state } = MarkdownEditor;

    /**
     * Replace the current textarea selection while preserving scroll position
     * Core formatting function used by all text manipulation operations
     * Handles history, preview updates, autosave, and scroll position preservation
     *
     * @param {string} text - Text to insert at selection
     * @param {number|{start: number, end: number}} [selectionRange] - New selection position
     *   If number: cursor position relative to insertion start
     *   If object: {start, end} positions relative to insertion start
     * @returns {void}
     *
     * @example
     * replaceSelection('**bold**', 8); // Inserts and places cursor after
     * replaceSelection('text', {start: 0, end: 4}); // Inserts and selects all
     */
    const replaceSelection = (text, selectionRange) => {
        if (!elements.editor) {
            return;
        }

        // ✅ CRITICAL: Capture scroll BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        // Capture pre-change snapshot
        if (history && history.pushHistory) {
            history.pushHistory();
        }

        const { start, end, value } = utils.getSelection();
        const before = value.slice(0, start);
        const after = value.slice(end);

        // ✅ Modify content
        elements.editor.value = `${before}${text}${after}`;

        // ✅ IMMEDIATE scroll lock #1 (after content change)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

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

        // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
        if (!hadFocus) {
            elements.editor.focus({ preventScroll: true });
        }

        // ✅ Set selection
        elements.editor.setSelectionRange(newStart, newEnd);

        // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ TRIPLE RAF for maximum browser compatibility
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;
                });
            });
        });

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        // Capture post-change snapshot
        if (history && history.pushHistory) {
            history.pushHistory();
        }
    };

    /**
     * Detect active formatting at cursor position or selection
     * Checks for bold, italic, headers, lists, code blocks, tables, etc.
     * Used to update toolbar button states
     *
     * @returns {Object} Object with boolean properties for each format type
     *   Properties: bold, italic, underline, strikethrough, code, blockquote, hr,
     *   h1-h6, ul, ol, checkbox, codeBlock, table, footnote
     *
     * @example
     * const fmt = detectFormatting();
     * if (fmt.bold) console.log('Cursor is in bold text');
     */
    const detectFormatting = () => {
        if (!elements.editor) {
            return {};
        }

        const { start, end, value } = utils.getSelection();
        const hasSelection = start !== end;

        const formatting = {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            code: false,
            blockquote: false,
            hr: false,
            h1: false,
            h2: false,
            h3: false,
            h4: false,
            h5: false,
            h6: false,
            ul: false,
            ol: false,
            checkbox: false,
            codeBlock: false,
            table: false,
            footnote: false
        };

        // Check for bold (**text** or __text__)
        if (hasSelection) {
            // Check if selection is wrapped with bold markers
            const beforeSelection = value.slice(Math.max(0, start - 3), start);
            const afterSelection = value.slice(end, Math.min(value.length, end + 3));

            formatting.bold =
                (beforeSelection.endsWith('**') && afterSelection.startsWith('**')) ||
                (beforeSelection.endsWith('__') && afterSelection.startsWith('__')) ||
                (beforeSelection.endsWith('***') && afterSelection.startsWith('***'));
        } else {
            // No selection: check if cursor is inside bold text
            // Pattern for bold: **text**, __text__, or ***text*** (bold+italic)
            const boldPattern = /(\*\*\*|\*\*|__)((?:(?!\1).)+?)\1/g;
            const matches = Array.from(value.matchAll(boldPattern));

            for (const match of matches) {
                const matchStart = match.index;
                const marker = match[1];
                const content = match[2];
                const matchEnd = matchStart + marker.length + content.length + marker.length;

                // Check if cursor is anywhere within the bold region (including markers)
                if (start >= matchStart && start <= matchEnd) {
                    // Verify it's actually bold (not just italic with ***)
                    if (marker === '***' || marker === '**' || marker === '__') {
                        formatting.bold = true;
                        break;
                    }
                }
            }
        }

        // Check for italic (*text* or _text_)
        if (hasSelection) {
            const selectedText = value.slice(start, end);
            formatting.italic = /(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)/.test(selectedText);
        } else {
            const italicPattern = /(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)/g;
            const italicMatches = value.match(italicPattern) || [];

            let isInsideItalic = false;
            for (const match of italicMatches) {
                const matchStart = value.indexOf(match);
                const matchEnd = matchStart + match.length;
                if (start >= matchStart && start <= matchEnd) {
                    isInsideItalic = true;
                    break;
                }
            }

            const beforeCursor = value.slice(0, start);
            const isAtEndOfItalic = italicMatches.some((match) => beforeCursor.endsWith(match));
            const isAfterItalic = italicMatches.some((match) => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });

            formatting.italic = isInsideItalic || isAtEndOfItalic || isAfterItalic;
        }

        // Check for underline (++text++)
        if (hasSelection) {
            const selectedText = value.slice(start, end);
            formatting.underline = /\+\+[^+\n]+\+\+/.test(selectedText);
        } else {
            const underlinePattern = /\+\+[^+\n]+\+\+/g;
            const underlineMatches = value.match(underlinePattern) || [];

            let isInsideUnderline = false;
            for (const match of underlineMatches) {
                const matchStart = value.indexOf(match);
                const matchEnd = matchStart + match.length;
                if (start >= matchStart && start <= matchEnd) {
                    isInsideUnderline = true;
                    break;
                }
            }

            const beforeCursor = value.slice(0, start);
            const isAtEndOfUnderline = underlineMatches.some((match) =>
                beforeCursor.endsWith(match)
            );
            const isAfterUnderline = underlineMatches.some((match) => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });

            formatting.underline = isInsideUnderline || isAtEndOfUnderline || isAfterUnderline;
        }

        // Check for strikethrough (~~text~~)
        if (hasSelection) {
            const selectedText = value.slice(start, end);
            formatting.strikethrough = /~~[^~]+~~/.test(selectedText);
        } else {
            const strikethroughPattern = /~~[^~]+~~/g;
            const strikethroughMatches = value.match(strikethroughPattern) || [];

            let isInsideStrikethrough = false;
            for (const match of strikethroughMatches) {
                const matchStart = value.indexOf(match);
                const matchEnd = matchStart + match.length;
                if (start >= matchStart && start <= matchEnd) {
                    isInsideStrikethrough = true;
                    break;
                }
            }

            const beforeCursor = value.slice(0, start);
            const isAtEndOfStrikethrough = strikethroughMatches.some((match) =>
                beforeCursor.endsWith(match)
            );
            const isAfterStrikethrough = strikethroughMatches.some((match) => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });

            formatting.strikethrough =
                isInsideStrikethrough || isAtEndOfStrikethrough || isAfterStrikethrough;
        }

        // Check for inline code (`text`)
        if (hasSelection) {
            const selectedText = value.slice(start, end);
            formatting.code = /`[^`]+`/.test(selectedText);
        } else {
            const codePattern = /`[^`]+`/g;
            const codeMatches = value.match(codePattern) || [];

            let isInsideCode = false;
            for (const match of codeMatches) {
                const matchStart = value.indexOf(match);
                const matchEnd = matchStart + match.length;
                if (start >= matchStart && start <= matchEnd) {
                    isInsideCode = true;
                    break;
                }
            }

            const beforeCursor = value.slice(0, start);
            const isAtEndOfCode = codeMatches.some((match) => beforeCursor.endsWith(match));
            const isAfterCode = codeMatches.some((match) => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });

            formatting.code = isInsideCode || isAtEndOfCode || isAfterCode;
        }

        // Check for headers (at start of line)
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineText = value.slice(
            lineStart,
            value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start)
        );

        // Check for blockquote (at start of line)
        if (lineText.match(/^>\s/)) {
            formatting.blockquote = true;
        }

        // Check for horizontal rule (---, ***, or ___)
        if (lineText.match(/^(\*\s*\*\s*\*[\s*]*|_\s*_\s*_[\s_]*|-\s*-\s*-[\s-]*)$/)) {
            formatting.hr = true;
        }

        if (lineText.match(/^#{1}\s/)) {
            formatting.h1 = true;
        } else if (lineText.match(/^#{2}\s/)) {
            formatting.h2 = true;
        } else if (lineText.match(/^#{3}\s/)) {
            formatting.h3 = true;
        } else if (lineText.match(/^#{4}\s/)) {
            formatting.h4 = true;
        } else if (lineText.match(/^#{5}\s/)) {
            formatting.h5 = true;
        } else if (lineText.match(/^#{6}\s/)) {
            formatting.h6 = true;
        }

        // Check for lists (at start of line)
        if (lineText.match(/^\s*[-*+]\s+\[([xX ])\]\s/)) {
            formatting.checkbox = true;
        } else if (lineText.match(/^\s*[-*+]\s/)) {
            formatting.ul = true;
        } else if (lineText.match(/^\s*\d+\.\s/)) {
            formatting.ol = true;
        }

        // Check for code blocks (```)
        const beforeCursor = value.slice(0, start);
        const codeBlockStart = (beforeCursor.match(/```/g) || []).length;
        formatting.codeBlock = codeBlockStart % 2 === 1;

        // Check for tables
        const prevLineStart = value.lastIndexOf('\n', lineStart - 2) + 1;
        const nextLineEndIndex = value.indexOf('\n', value.indexOf('\n', start) + 1);
        const prevLine = value.slice(prevLineStart, lineStart - 1 >= 0 ? lineStart - 1 : 0);
        const nextLine = value.slice(
            value.indexOf('\n', start) + 1 || value.length,
            nextLineEndIndex === -1 ? value.length : nextLineEndIndex
        );

        const hasPipe = /\|/.test(lineText);
        const isSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lineText);
        const prevHasPipe = /\|/.test(prevLine || '');
        const nextHasPipe = /\|/.test(nextLine || '');
        const prevIsSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
            prevLine || ''
        );
        const nextIsSeparator = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
            nextLine || ''
        );

        if (!formatting.codeBlock) {
            if (isSeparator) {
                formatting.table = true;
            } else if (
                hasPipe &&
                (prevHasPipe || nextHasPipe || prevIsSeparator || nextIsSeparator)
            ) {
                formatting.table = true;
            }
        }

        // Check for footnote reference [^identifier]
        const footnotePattern = /\[\^([^\]]+)\]/g;
        const footnoteMatches = Array.from(value.matchAll(footnotePattern));

        for (const match of footnoteMatches) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            // Check if cursor or selection is within or touches the footnote reference
            if (
                (start >= matchStart && start <= matchEnd) ||
                (end >= matchStart && end <= matchEnd) ||
                (start <= matchStart && end >= matchEnd)
            ) {
                formatting.footnote = true;
                break;
            }
        }

        return formatting;
    };

    /**
     * Update toolbar button states based on detected formatting at cursor
     * Adds/removes 'active' class and sets aria-pressed attributes
     * Called on selection change, keyup, and mouseup events
     *
     * @returns {void}
     *
     * @example
     * updateToolbarStates(); // Updates all toolbar button states
     */
    const updateToolbarStates = () => {
        if (!elements.toolbar) {
            return;
        }

        const formatting = detectFormatting();

        // Update text formatting buttons
        const boldButton = elements.toolbar.querySelector('[data-format="bold"]');
        const italicButton = elements.toolbar.querySelector('[data-format="italic"]');
        const underlineButton = elements.toolbar.querySelector('[data-format="underline"]');
        const strikethroughButton = elements.toolbar.querySelector('[data-format="strikethrough"]');
        const codeButton = elements.toolbar.querySelector('[data-format="code"]');

        if (boldButton) {
            boldButton.classList.toggle('active', formatting.bold);
            boldButton.setAttribute('aria-pressed', formatting.bold);
        }
        if (italicButton) {
            italicButton.classList.toggle('active', formatting.italic);
            italicButton.setAttribute('aria-pressed', formatting.italic);
        }
        if (underlineButton) {
            underlineButton.classList.toggle('active', formatting.underline);
            underlineButton.setAttribute('aria-pressed', formatting.underline);
        }
        if (strikethroughButton) {
            strikethroughButton.classList.toggle('active', formatting.strikethrough);
            strikethroughButton.setAttribute('aria-pressed', formatting.strikethrough);
        }
        if (codeButton) {
            codeButton.classList.toggle('active', formatting.code);
            codeButton.setAttribute('aria-pressed', formatting.code);
        }

        // Update blockquote button
        const blockquoteButton = elements.toolbar.querySelector('[data-format="blockquote"]');
        if (blockquoteButton) {
            blockquoteButton.classList.toggle('active', formatting.blockquote);
            blockquoteButton.setAttribute('aria-pressed', formatting.blockquote);
        }

        // Update horizontal rule button
        const hrButton = elements.toolbar.querySelector('[data-format="hr"]');
        if (hrButton) {
            hrButton.classList.toggle('active', formatting.hr);
            hrButton.setAttribute('aria-pressed', formatting.hr);
        }

        // Update header buttons
        const h1Button = elements.toolbar.querySelector('[data-format="h1"]');
        const h2Button = elements.toolbar.querySelector('[data-format="h2"]');
        const h3Button = elements.toolbar.querySelector('[data-format="h3"]');
        const h4Button = elements.toolbar.querySelector('[data-format="h4"]');
        const h5Button = elements.toolbar.querySelector('[data-format="h5"]');
        const h6Button = elements.toolbar.querySelector('[data-format="h6"]');

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
        if (h4Button) {
            h4Button.classList.toggle('active', formatting.h4);
            h4Button.setAttribute('aria-pressed', formatting.h4);
        }
        if (h5Button) {
            h5Button.classList.toggle('active', formatting.h5);
            h5Button.setAttribute('aria-pressed', formatting.h5);
        }
        if (h6Button) {
            h6Button.classList.toggle('active', formatting.h6);
            h6Button.setAttribute('aria-pressed', formatting.h6);
        }

        // Update list buttons
        const ulButton = elements.toolbar.querySelector('[data-format="ul"]');
        const olButton = elements.toolbar.querySelector('[data-format="ol"]');
        const checkboxButton = elements.toolbar.querySelector('[data-format="checkbox"]');

        if (ulButton) {
            ulButton.classList.toggle('active', formatting.ul);
            ulButton.setAttribute('aria-pressed', formatting.ul);
        }
        if (olButton) {
            olButton.classList.toggle('active', formatting.ol);
            olButton.setAttribute('aria-pressed', formatting.ol);
        }
        if (checkboxButton) {
            checkboxButton.classList.toggle('active', formatting.checkbox);
            checkboxButton.setAttribute('aria-pressed', formatting.checkbox);
        }

        // Update code block button
        const codeBlockButton = elements.toolbar.querySelector('[data-format="codeBlock"]');
        if (codeBlockButton) {
            codeBlockButton.classList.toggle('active', formatting.codeBlock);
            codeBlockButton.setAttribute('aria-pressed', formatting.codeBlock);
        }

        // Update table button
        const tableButton = elements.toolbar.querySelector('[data-format="table"]');
        if (tableButton) {
            tableButton.classList.toggle('active', formatting.table);
            tableButton.setAttribute('aria-pressed', formatting.table);
        }

        // Update footnote button
        const footnoteButton = elements.toolbar.querySelector('[data-format="footnote"]');
        if (footnoteButton) {
            footnoteButton.classList.toggle('active', formatting.footnote);
            footnoteButton.setAttribute('aria-pressed', formatting.footnote);
        }
    };

    /**
     * Get the word at the cursor position
     * Returns { word: string, start: number, end: number } or null if no word found
     * Handles cursor at word boundaries (start/end of word)
     */
    const getWordAtCursor = (cursorPos, text) => {
        if (cursorPos < 0 || cursorPos > text.length || text.length === 0) {
            return null;
        }

        // Word boundary regex: alphanumeric characters and underscores
        const wordCharPattern = /[\w]/;

        // Check if cursor is on a word character or adjacent to one
        const charAtCursor = text[cursorPos];
        const charBefore = cursorPos > 0 ? text[cursorPos - 1] : null;

        // If cursor is on a word character, find the word boundaries
        if (charAtCursor && wordCharPattern.test(charAtCursor)) {
            // Find the start of the word (go backwards until we hit a non-word character)
            let wordStart = cursorPos;
            while (wordStart > 0 && wordCharPattern.test(text[wordStart - 1])) {
                wordStart--;
            }

            // Find the end of the word (go forwards until we hit a non-word character)
            let wordEnd = cursorPos;
            while (wordEnd < text.length && wordCharPattern.test(text[wordEnd])) {
                wordEnd++;
            }

            // Extract the word
            const word = text.slice(wordStart, wordEnd);

            // Only return if we found a valid word (non-empty)
            if (word.length > 0) {
                return {
                    word: word,
                    start: wordStart,
                    end: wordEnd
                };
            }
        } else if (charBefore && wordCharPattern.test(charBefore)) {
            // Cursor is right after a word (at whitespace/punctuation), find the word before
            let wordStart = cursorPos - 1;
            while (wordStart > 0 && wordCharPattern.test(text[wordStart - 1])) {
                wordStart--;
            }

            const wordEnd = cursorPos;
            const word = text.slice(wordStart, wordEnd);

            if (word.length > 0) {
                return {
                    word: word,
                    start: wordStart,
                    end: wordEnd
                };
            }
        }

        return null;
    };

    /**
     * Apply or remove inline formatting (bold, italic, underline, strikethrough, code)
     * Toggles formatting if already applied, wraps selection or word at cursor
     *
     * @param {string} prefix - Opening marker (e.g., '**' for bold)
     * @param {string} suffix - Closing marker (e.g., '**' for bold)
     * @returns {void}
     *
     * @example
     * applyInlineFormat('**', '**'); // Toggle bold
     * applyInlineFormat('*', '*'); // Toggle italic
     * applyInlineFormat('`', '`'); // Toggle inline code
     */
    const applyInlineFormat = (prefix, suffix) => {
        const { start, end, value } = utils.getSelection();
        const hasSelection = start !== end;

        // Determine format type
        const formatTypeMap = {
            '****': 'bold',
            '**': 'italic',
            '++++': 'underline',
            '~~~~': 'strikethrough',
            '``': 'code'
        };
        const formatType = formatTypeMap[prefix + suffix];

        // Check if formatting is already applied using detectFormatting
        const formatting = detectFormatting();
        const isAlreadyFormatted = formatting[formatType] || false;

        if (isAlreadyFormatted) {
            // REMOVE FORMATTING
            // Find the boundaries of the formatted text containing the cursor/selection
            let removed = false;

            // Build the appropriate pattern for this format type
            let pattern, markerLength;
            if (formatType === 'bold') {
                // Match **text**, __text__, or ***text*** (bold+italic)
                pattern = /(\*\*\*|\*\*|__)((?:(?!\1).)+?)\1/g;
                markerLength = 2; // Default to ** length
            } else if (formatType === 'italic') {
                // Match *text* or _text_ but not **text** or __text__
                pattern = /(?<!\*|\w)\*([^*\n]+?)\*(?!\*)|(?<!_|\w)_([^_\n]+?)_(?!_)/g;
                markerLength = 1;
            } else if (formatType === 'underline') {
                pattern = /\+\+([^+\n]+?)\+\+/g;
                markerLength = 2;
            } else if (formatType === 'strikethrough') {
                pattern = /~~([^~\n]+?)~~/g;
                markerLength = 2;
            } else if (formatType === 'code') {
                pattern = /`([^`\n]+?)`/g;
                markerLength = 1;
            } else {
                // Fallback: just insert formatting
                if (hasSelection) {
                    const selection = value.slice(start, end);
                    const inserted = `${prefix}${selection}${suffix}`;
                    replaceSelection(inserted, inserted.length);
                } else {
                    // No selection: insert formatting markers and position cursor between them
                    const inserted = `${prefix}${suffix}`;
                    replaceSelection(inserted, prefix.length);
                }
                return;
            }

            // Search through all matches to find the one containing our cursor/selection
            const matches = Array.from(value.matchAll(pattern));

            for (const match of matches) {
                const matchStart = match.index;
                const matchEnd = matchStart + match[0].length;

                // Check if cursor or selection is within this match
                if (start >= matchStart && end <= matchEnd) {
                    // Store original positions for restoration
                    const originalStart = start;
                    const originalEnd = end;

                    // Capture scroll position before changes
                    const scrollTop = elements.editor.scrollTop;
                    const scrollLeft = elements.editor.scrollLeft;
                    const hadFocus = document.activeElement === elements.editor;

                    // Capture pre-change snapshot
                    if (history && history.pushHistory) {
                        history.pushHistory();
                    }

                    // For bold, handle *** vs ** properly
                    if (formatType === 'bold') {
                        const actualMarker = match[1]; // ***, **, or __
                        markerLength = actualMarker.length;

                        // If it's ***, only remove ** (leave single * for italic)
                        if (actualMarker === '***') {
                            const innerText = match[2];
                            const newText = `*${innerText}*`;

                            // Calculate new content
                            const beforeMatch = value.slice(0, matchStart);
                            const afterMatch = value.slice(matchEnd);
                            const newContent = beforeMatch + newText + afterMatch;

                            elements.editor.value = newContent;

                            // Restore scroll immediately
                            elements.editor.scrollTop = scrollTop;
                            elements.editor.scrollLeft = scrollLeft;

                            // Calculate restored cursor position
                            // Original ***text*** becomes *text*
                            // We removed 2 characters (one **), so adjust positions
                            let restoredStart = originalStart - 2;
                            let restoredEnd = originalEnd - 2;

                            // Clamp to valid range within the new text
                            const contentStart = matchStart;
                            const contentEnd = matchStart + newText.length;
                            restoredStart = Math.max(
                                contentStart,
                                Math.min(contentEnd, restoredStart)
                            );
                            restoredEnd = Math.max(contentStart, Math.min(contentEnd, restoredEnd));

                            // Focus if needed
                            if (!hadFocus) {
                                elements.editor.focus({ preventScroll: true });
                            }

                            elements.editor.setSelectionRange(restoredStart, restoredEnd);

                            // Restore scroll again after selection change
                            elements.editor.scrollTop = scrollTop;
                            elements.editor.scrollLeft = scrollLeft;

                            removed = true;
                            break;
                        }
                    }

                    // Standard removal: extract inner text without markers
                    const innerText = match[2] || match[1];
                    if (!innerText) {
                        continue;
                    } // Skip if no inner text found

                    // Calculate restored positions for both start and end separately
                    const calculateRestoredPosition = (originalPos) => {
                        const offsetIntoMatch = originalPos - matchStart;

                        if (offsetIntoMatch <= markerLength) {
                            // Position was in or before opening marker - place at start of content
                            return matchStart;
                        } else if (offsetIntoMatch >= markerLength + innerText.length) {
                            // Position was in or after closing marker - place at end of content
                            return matchStart + innerText.length;
                        } else {
                            // Position was in the content - restore to same relative position
                            return originalPos - markerLength;
                        }
                    };

                    const restoredStart = calculateRestoredPosition(originalStart);
                    let restoredEnd = calculateRestoredPosition(originalEnd);

                    // Ensure start <= end
                    if (restoredStart > restoredEnd) {
                        restoredEnd = restoredStart;
                    }

                    // Build new content
                    const beforeMatch = value.slice(0, matchStart);
                    const afterMatch = value.slice(matchEnd);
                    const newValue = beforeMatch + innerText + afterMatch;

                    elements.editor.value = newValue;

                    // Restore scroll immediately
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;

                    // Focus if needed
                    if (!hadFocus) {
                        elements.editor.focus({ preventScroll: true });
                    }

                    elements.editor.setSelectionRange(restoredStart, restoredEnd);

                    // Restore scroll again after selection change
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;

                    removed = true;
                    break;
                }
            }

            if (removed) {
                // Final scroll lock with triple RAF for maximum browser compatibility
                const finalScrollTop = elements.editor.scrollTop;
                const finalScrollLeft = elements.editor.scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = finalScrollTop;
                    elements.editor.scrollLeft = finalScrollLeft;

                    requestAnimationFrame(() => {
                        elements.editor.scrollTop = finalScrollTop;
                        elements.editor.scrollLeft = finalScrollLeft;

                        requestAnimationFrame(() => {
                            elements.editor.scrollTop = finalScrollTop;
                            elements.editor.scrollLeft = finalScrollLeft;
                        });
                    });
                });

                if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
                    MarkdownEditor.preview.updatePreview();
                }
                if (utils.updateCounters) {
                    utils.updateCounters();
                }
                if (MarkdownEditor.stateManager) {
                    MarkdownEditor.stateManager.markDirty(
                        elements.editor.value !== state.lastSavedContent
                    );
                }
                if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
                    MarkdownEditor.autosave.scheduleAutosave();
                }

                // Capture post-change snapshot
                if (history && history.pushHistory) {
                    history.pushHistory();
                }

                if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
                    MarkdownEditor.formatting.updateToolbarStates();
                }

                return;
            }
        }

        // ADD FORMATTING (not already formatted)
        if (hasSelection) {
            // Replace selection with formatted text, cursor at end
            const selection = value.slice(start, end);
            const inserted = `${prefix}${selection}${suffix}`;
            replaceSelection(inserted, inserted.length);
        } else {
            // No selection: try to wrap the word at cursor, or insert placeholder
            const wordAtCursor = getWordAtCursor(start, value);

            if (wordAtCursor) {
                // Wrap the word at cursor position
                // Temporarily set selection to the word so we can use replaceSelection
                elements.editor.setSelectionRange(wordAtCursor.start, wordAtCursor.end);

                const formattedWord = `${prefix}${wordAtCursor.word}${suffix}`;
                // Use replaceSelection to maintain history and scroll position
                replaceSelection(formattedWord, formattedWord.length);
            } else {
                // No word at cursor: insert formatting markers and position cursor between them
                const inserted = `${prefix}${suffix}`;
                replaceSelection(inserted, prefix.length);
            }
        }
    };

    /**
     * Apply or toggle heading formatting to selected lines
     * Toggles heading if already at same level, preserves list markers
     *
     * @param {number} level - Heading level (1-6)
     * @returns {void}
     *
     * @example
     * applyHeading(1); // Ctrl+1 - Apply H1
     * applyHeading(2); // Ctrl+2 - Apply H2
     */
    const applyHeading = (level) => {
        if (!elements.editor) {
            return;
        }

        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        const { start, end, value } = utils.getSelection();
        const lines = value.split('\n');
        const lineOffsets = utils.getLineOffsets(lines);
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

                oldHeadingLength = headingMatch
                    ? headingMatch[1].length + headingMatch[2].length
                    : 0;
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

        elements.editor.value = lines.join('\n');

        // ✅ IMMEDIATE scroll lock #1 (after content change)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
        if (!hadFocus) {
            elements.editor.focus({ preventScroll: true });
        }

        // ✅ Set selection
        elements.editor.setSelectionRange(newStart, newEnd);

        // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ TRIPLE RAF for maximum browser compatibility
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;
                });
            });
        });

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
    };

    /**
     * Apply or remove blockquote formatting to selected lines
     * Toggles blockquote markers (>) on all selected lines
     *
     * @returns {void}
     *
     * @example
     * applyBlockquote(); // Adds or removes '> ' prefix
     */
    const applyBlockquote = () => {
        if (!elements.editor) {
            return;
        }

        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        const { start, end, value } = utils.getSelection();
        const lines = value.split('\n');
        const lineOffsets = utils.getLineOffsets(lines);
        const startLineIndex = value.slice(0, start).split('\n').length - 1;
        const endLineIndex = value.slice(0, end).split('\n').length - 1;

        let cumulativeDelta = 0;
        let newStart = start;
        let newEnd = end;
        let startAdjusted = false;
        let endAdjusted = false;
        let allLinesAreBlockquotes = true;

        // First pass: check if all selected lines are blockquotes
        for (let i = startLineIndex; i <= endLineIndex; i += 1) {
            const line = lines[i];
            if (!/^>\s?/.test(line)) {
                allLinesAreBlockquotes = false;
                break;
            }
        }

        // Second pass: toggle blockquotes
        for (let i = 0; i < lines.length; i += 1) {
            const originalLine = lines[i];
            let newLine = originalLine;

            if (i >= startLineIndex && i <= endLineIndex) {
                const blockquoteMatch = originalLine.match(/^(>\s?)(.*)$/);

                if (allLinesAreBlockquotes) {
                    // Remove blockquote
                    newLine = blockquoteMatch ? blockquoteMatch[2] : originalLine;
                } else {
                    // Add blockquote
                    newLine = blockquoteMatch ? originalLine : `> ${originalLine}`;
                }
            }

            const lineStartOriginal = lineOffsets[i];
            const lineStartNew = lineStartOriginal + cumulativeDelta;
            const lineDelta = newLine.length - originalLine.length;

            const adjustWithinLine = (offset) => {
                const offsetInLine = offset - lineStartOriginal;
                const newOffsetInLine = Math.min(offsetInLine + lineDelta, newLine.length);
                return lineStartNew + Math.max(0, newOffsetInLine);
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

        elements.editor.value = lines.join('\n');

        // ✅ IMMEDIATE scroll lock #1 (after content change)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
        if (!hadFocus) {
            elements.editor.focus({ preventScroll: true });
        }

        // ✅ Set selection
        elements.editor.setSelectionRange(newStart, newEnd);

        // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ TRIPLE RAF for maximum browser compatibility
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;
                });
            });
        });

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
    };

    /**
     * Toggle bullet or numbered list markers on selected lines
     * Adds or removes list markers, smart numbering for ordered lists
     * Auto-renumbers ordered lists after modification
     *
     * @param {string} type - List type: 'ul' for unordered, 'ol' for ordered
     * @returns {void}
     *
     * @example
     * toggleList('ul'); // Ctrl+Shift+8 - Toggle bullet list
     * toggleList('ol'); // Ctrl+Shift+7 - Toggle numbered list
     */
    const toggleList = (type) => {
        if (!elements.editor) {
            return;
        }

        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        const { start, end, value } = utils.getSelection();
        const lines = value.split('\n');
        const lineOffsets = utils.getLineOffsets(lines);
        const selectionStartIndex = value.slice(0, start).split('\n').length - 1;
        const selectionEndIndex = value.slice(0, end).split('\n').length - 1;

        // Smart marker detection for ordered lists
        let markerText = type === 'ol' ? '1. ' : '- ';

        // For ordered lists, check if we're continuing an existing list
        if (type === 'ol' && selectionStartIndex > 0) {
            // Look at the previous line
            const prevLine = lines[selectionStartIndex - 1];
            const prevMatch = prevLine.match(/^(\s*)(\d+)\.\s+/);

            if (prevMatch) {
                // We're continuing a list - use the next number
                const prevNumber = parseInt(prevMatch[2], 10);
                const prevIndent = prevMatch[1];

                // Check if current line has same indentation
                const currentLine = lines[selectionStartIndex];
                const currentIndent = currentLine.match(/^(\s*)/)[1];

                if (currentIndent === prevIndent) {
                    markerText = `${prevNumber + 1}. `;
                }
            }
        }

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

        elements.editor.value = lines.join('\n');

        // ✅ IMMEDIATE scroll lock #1 (after content change)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
        if (!hadFocus) {
            elements.editor.focus({ preventScroll: true });
        }

        // ✅ Set selection
        elements.editor.setSelectionRange(newStart, newEnd);

        // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ TRIPLE RAF for maximum browser compatibility
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;
                });
            });
        });

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        // If we modified ordered list markers (added OR removed), immediately renumber to ensure consistency
        if (type === 'ol') {
            // Use setTimeout to allow the editor to update first
            setTimeout(() => {
                renumberAllOrderedLists();
            }, 0);
        }
    };

    /**
     * Toggle checkbox state at cursor position
     * If cursor is on a checkbox line, toggle between [ ] and [x]
     * Otherwise, insert a new checkbox list item
     */
    const toggleCheckboxAtCursor = () => {
        if (!elements.editor) {
            return;
        }

        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        const { start, value } = utils.getSelection();
        const lines = value.split('\n');
        const currentLineIndex = value.slice(0, start).split('\n').length - 1;
        const currentLine = lines[currentLineIndex] || '';

        // Check if current line is a checkbox
        const checkboxMatch = currentLine.match(/^(\s*)([-*+])\s+\[([xX ])\]\s+(.*)$/);

        if (checkboxMatch) {
            // Toggle the checkbox state
            const indent = checkboxMatch[1];
            const marker = checkboxMatch[2];
            const isChecked = checkboxMatch[3].toLowerCase() === 'x';
            const content = checkboxMatch[4];
            const newState = isChecked ? ' ' : 'x';
            const newLine = `${indent}${marker} [${newState}] ${content}`;

            // Calculate line boundaries
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = value.indexOf('\n', start);
            const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;

            const before = value.slice(0, lineStart);
            const after = value.slice(actualLineEnd);

            // Capture pre-change snapshot
            if (history && history.pushHistory) {
                history.pushHistory();
            }

            elements.editor.value = `${before}${newLine}${after}`;

            // ✅ IMMEDIATE scroll lock #1 (after content change)
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
            if (!hadFocus) {
                elements.editor.focus({ preventScroll: true });
            }

            // Maintain cursor position
            const newCursorPos = start + (newLine.length - currentLine.length);
            elements.editor.setSelectionRange(newCursorPos, newCursorPos);

            // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            // ✅ TRIPLE RAF for maximum browser compatibility
            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;

                    requestAnimationFrame(() => {
                        elements.editor.scrollTop = scrollTop;
                        elements.editor.scrollLeft = scrollLeft;
                    });
                });
            });

            // Capture post-change snapshot
            if (history && history.pushHistory) {
                history.pushHistory();
            }

            if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
                MarkdownEditor.preview.updatePreview();
            }
            if (utils.updateCounters) {
                utils.updateCounters();
            }
            if (MarkdownEditor.stateManager) {
                MarkdownEditor.stateManager.markDirty(
                    elements.editor.value !== state.lastSavedContent
                );
            }
            if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
                MarkdownEditor.autosave.scheduleAutosave();
            }

            return true; // Indicate we toggled a checkbox
        }

        return false; // Not on a checkbox line
    };

    /**
     * Toggle checkbox list markers on selected lines
     * If cursor is on checkbox line, toggles its state ([ ] <-> [x])
     * Otherwise, adds or removes checkbox markers from selected lines
     *
     * @returns {void}
     *
     * @example
     * toggleCheckboxList(); // Adds/removes task list checkboxes
     */
    const toggleCheckboxList = () => {
        if (!elements.editor) {
            return;
        }

        // First, try to toggle checkbox at cursor if we're on a checkbox line
        if (toggleCheckboxAtCursor()) {
            return; // Successfully toggled, we're done
        }

        // Otherwise, proceed with the original behavior (add/remove checkbox markers)

        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        const { start, end, value } = utils.getSelection();
        const lines = value.split('\n');
        const lineOffsets = utils.getLineOffsets(lines);
        const selectionStartIndex = value.slice(0, start).split('\n').length - 1;
        const selectionEndIndex = value.slice(0, end).split('\n').length - 1;

        // Smart marker detection for checkboxes - check if continuing an existing checkbox list
        let markerText = '- [ ] ';

        if (selectionStartIndex > 0) {
            // Look at the previous line
            const prevLine = lines[selectionStartIndex - 1];
            const prevMatch = prevLine.match(/^(\s*)([-*+])\s+\[([xX ])\]\s+/);

            if (prevMatch) {
                // We're continuing a checkbox list - use same marker
                const prevIndent = prevMatch[1];
                const currentLine = lines[selectionStartIndex];
                const currentIndent = currentLine.match(/^(\s*)/)[1];

                if (currentIndent === prevIndent) {
                    markerText = `${prevMatch[2]} [ ] `;
                }
            }
        }

        const isTargetLine = (line) => {
            const trimmed = line.replace(/^\s*/, '');
            return /^[-*+]\s+\[([xX ])\]\s+/.test(trimmed);
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

                const checkboxMatch = remainder.match(/^([-*+])\s+\[([xX ])\]\s+/);

                if (checkboxMatch) {
                    oldMarkerLength = checkboxMatch[0].length;
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

        elements.editor.value = lines.join('\n');

        // ✅ IMMEDIATE scroll lock #1 (after content change)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
        if (!hadFocus) {
            elements.editor.focus({ preventScroll: true });
        }

        // ✅ Set selection
        elements.editor.setSelectionRange(newStart, newEnd);

        // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ TRIPLE RAF for maximum browser compatibility
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;
                });
            });
        });

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
    };

    /**
     * Apply or remove code block formatting (fenced with ```)
     * Wraps selection in triple backticks, prompts for language if needed
     * Removes code block if cursor is inside one
     *
     * @returns {Promise<void>}
     *
     * @example
     * await applyCodeBlock(); // Wraps in ```language...```
     */
    const applyCodeBlock = async () => {
        if (!elements.editor) {
            return;
        }

        // Capture current selection before showing dialog
        const { start, end, value } = utils.getSelection();
        const before = value.slice(0, start);
        const after = value.slice(end);
        const selection = value.slice(start, end);
        const hasSelection = start !== end && selection.length > 0;

        // Use the dialog framework to prompt for language
        const dialogs = MarkdownEditor.dialogs;
        if (!dialogs || !dialogs.multiPromptDialog) {
            return;
        }

        const result = await dialogs.multiPromptDialog(
            [
                {
                    label: 'Programming language (optional)',
                    defaultValue: '',
                    inputType: 'text',
                    key: 'language',
                    required: false,
                    helperText:
                        'Leave empty for plain code block or specify: javascript, python, html, etc.',
                    suggestions: [
                        'javascript',
                        'python',
                        'html',
                        'css',
                        'java',
                        'c',
                        'cpp',
                        'bash',
                        'json',
                        'markdown',
                        'sql',
                        'typescript'
                    ]
                }
            ],
            'Insert Code Block'
        );

        // User cancelled the dialog
        if (!result) {
            return;
        }

        const language = typeof result.language === 'string' ? result.language.trim() : '';
        const languageSuffix = language ? language : '';
        const placeholderText = 'Enter your code here';
        const fence = '```';

        const precedingSpacing = before.length > 0 && !before.endsWith('\n') ? '\n\n' : '';
        const trailingSpacing = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '';

        const openingFenceLine = `${fence}${languageSuffix}\n`;

        let blockContent = hasSelection ? selection : placeholderText;

        if (!blockContent.endsWith('\n')) {
            blockContent += '\n';
        }

        const closingFenceLine = fence;
        const inserted = `${precedingSpacing}${openingFenceLine}${blockContent}${closingFenceLine}${trailingSpacing}`;

        const selectionStartOffset = precedingSpacing.length + openingFenceLine.length;
        const selectionContentLength = hasSelection ? selection.length : placeholderText.length;
        const selectionEndOffset = selectionStartOffset + selectionContentLength;

        replaceSelection(inserted, {
            start: selectionStartOffset,
            end: selectionEndOffset
        });
    };

    /**
     * Indent list items (add 2 spaces of indentation)
     * Increases nesting level for list items, handles Tab key in lists
     * Auto-renumbers ordered lists after indentation
     *
     * @returns {void}
     *
     * @example
     * indentListItem(); // Tab - increases indent
     */
    const indentListItem = () => {
        if (!elements.editor) {
            return;
        }

        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        const { start, end, value } = utils.getSelection();
        const lines = value.split('\n');
        const lineOffsets = utils.getLineOffsets(lines);
        const startLineIndex = value.slice(0, start).split('\n').length - 1;
        const endLineIndex = value.slice(0, end).split('\n').length - 1;

        let cumulativeDelta = 0;
        let newStart = start;
        let newEnd = end;
        let startAdjusted = false;
        let endAdjusted = false;
        let modified = false;

        for (let i = 0; i < lines.length; i += 1) {
            const originalLine = lines[i];
            let newLine = originalLine;

            if (i >= startLineIndex && i <= endLineIndex) {
                // Check if this line is a list item (ordered or unordered)
                const listMatch = originalLine.match(/^(\s*)([-*+]|\d+\.)\s+/);
                if (listMatch) {
                    // Add 2 spaces of indentation
                    newLine = `  ${originalLine}`;
                    modified = true;
                }
            }

            const lineStartOriginal = lineOffsets[i];
            const lineStartNew = lineStartOriginal + cumulativeDelta;
            const lineDelta = newLine.length - originalLine.length;

            if (!startAdjusted) {
                if (start < lineStartOriginal) {
                    newStart = start + cumulativeDelta;
                } else if (start <= lineStartOriginal + originalLine.length) {
                    // Cursor position: add the delta to maintain relative position
                    const offsetInLine = start - lineStartOriginal;
                    newStart = lineStartNew + offsetInLine + lineDelta;
                    startAdjusted = true;
                }
            }

            if (!endAdjusted) {
                if (end < lineStartOriginal) {
                    newEnd = end + cumulativeDelta;
                } else if (end <= lineStartOriginal + originalLine.length) {
                    const offsetInLine = end - lineStartOriginal;
                    newEnd = lineStartNew + offsetInLine + lineDelta;
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

        // Only update if we actually modified something
        if (!modified) {
            return;
        }

        elements.editor.value = lines.join('\n');

        // ✅ IMMEDIATE scroll lock #1 (after content change)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
        if (!hadFocus) {
            elements.editor.focus({ preventScroll: true });
        }

        // ✅ Set selection
        elements.editor.setSelectionRange(newStart, newEnd);

        // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ TRIPLE RAF for maximum browser compatibility
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;
                });
            });
        });

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        // Trigger immediate renumbering after indent to update all affected lists
        setTimeout(() => {
            renumberAllOrderedLists();
        }, 0);
    };

    /**
     * Renumber ordered list items starting from cursor position
     * Ensures sequential numbering (1. 2. 3. etc.) for ordered lists
     * Handles nested lists with different indentation levels
     *
     * @returns {void}
     *
     * @example
     * renumberOrderedList(); // Fixes numbering in current list
     */
    const renumberOrderedList = () => {
        if (!elements.editor) {
            return;
        }

        const { start, value } = utils.getSelection();
        const lines = value.split('\n');
        const currentLineIndex = value.slice(0, start).split('\n').length - 1;
        const currentLine = lines[currentLineIndex];

        // Check if current line is part of an ordered list
        const listMatch = currentLine.match(/^(\s*)\d+\.\s+/);
        if (!listMatch) {
            return;
        }

        const indent = listMatch[1];

        // Find the start and end of the current list block with same indentation
        let listStart = currentLineIndex;
        let listEnd = currentLineIndex;

        // Find start of list
        for (let i = currentLineIndex - 1; i >= 0; i--) {
            const line = lines[i];
            const lineMatch = line.match(/^(\s*)\d+\.\s+/);
            if (!lineMatch || lineMatch[1] !== indent) {
                break;
            }
            listStart = i;
        }

        // Find end of list
        for (let i = currentLineIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const lineMatch = line.match(/^(\s*)\d+\.\s+/);
            if (!lineMatch || lineMatch[1] !== indent) {
                break;
            }
            listEnd = i;
        }

        // Renumber the list
        let number = 1;
        for (let i = listStart; i <= listEnd; i++) {
            const line = lines[i];
            const lineMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
            if (lineMatch && lineMatch[1] === indent) {
                lines[i] = `${indent}${number}. ${lineMatch[2]}`;
                number++;
            }
        }

        elements.editor.value = lines.join('\n');
        elements.editor.setSelectionRange(start, start);

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
    };

    /**
     * Renumber ALL ordered lists in the document to match preview rendering
     * This ensures editor numbers match what the preview will show
     *
     * FIX: Now properly handles nested lists under different parents by tracking
     * parent context. Each nested list resets numbering when under a new parent.
     */
    const renumberAllOrderedLists = () => {
        if (!elements.editor) {
            return;
        }

        const { start, end, value } = utils.getSelection();
        const lines = value.split('\n');
        let modified = false;

        // Track list state at each VISUAL nesting level with parent context
        // Map structure: Map<level, { counter: number, parentCounter: number }>
        const listState = new Map();
        let prevLevel = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Convert tabs to 4 spaces for consistent handling (common convention: 1 tab = 4 spaces)
            const normalizedLine = line.replace(/\t/g, '    ');

            const listMatch = normalizedLine.match(/^(\s*)(\d+)\.\s+(.*)$/);

            if (listMatch) {
                const indentSpaces = listMatch[1].length;
                const currentNumber = parseInt(listMatch[2], 10);
                const content = listMatch[3];

                // Calculate nesting level (2 spaces = 1 level, 4 spaces = 2 levels, etc.)
                const level = Math.floor(indentSpaces / 2);

                // Normalize indentation to standard 2-space increments
                const normalizedIndent = '  '.repeat(level);

                // **FIX: Detect when we need to reset nested list counters**

                // Case 1: We moved to a shallower level (back to parent or higher)
                if (prevLevel !== -1 && level < prevLevel) {
                    // Clear all deeper level counters
                    for (const [key] of listState) {
                        if (key > level) {
                            listState.delete(key);
                        }
                    }
                }

                // Case 2: We're at a nested level and the parent level counter changed
                // This means we're starting a NEW nested list under a DIFFERENT parent
                if (level > 0 && prevLevel !== -1) {
                    const parentLevel = level - 1;

                    // Check if parent level counter changed since last time we were at this level
                    if (listState.has(level)) {
                        const currentState = listState.get(level);

                        // If we have a parent level, check its counter
                        if (listState.has(parentLevel)) {
                            const parentState = listState.get(parentLevel);

                            // If parent counter changed, this is a NEW nested list
                            if (currentState.parentCounter !== parentState.counter) {
                                // Reset this level's counter
                                listState.delete(level);
                                // Also clear any deeper levels
                                for (const [key] of listState) {
                                    if (key > level) {
                                        listState.delete(key);
                                    }
                                }
                            }
                        }
                    }
                }

                // Get or initialize counter for this level
                if (!listState.has(level)) {
                    // Get parent counter for tracking
                    const parentLevel = level - 1;
                    const parentCounter =
                        level > 0 && listState.has(parentLevel)
                            ? listState.get(parentLevel).counter
                            : 0;

                    listState.set(level, {
                        counter: 1,
                        parentCounter: parentCounter
                    });
                }

                const expectedNumber = listState.get(level).counter;

                // If number doesn't match expected OR indentation needs normalizing, update it
                if (currentNumber !== expectedNumber || listMatch[1] !== normalizedIndent) {
                    lines[i] = `${normalizedIndent}${expectedNumber}. ${content}`;
                    modified = true;
                }

                // Increment counter for next item at this level
                listState.get(level).counter++;

                // Update parent counter reference after incrementing
                const parentLevel = level - 1;
                if (level > 0 && listState.has(parentLevel)) {
                    listState.get(level).parentCounter = listState.get(parentLevel).counter;
                }

                prevLevel = level;
            } else {
                // Non-list line: reset all counters (list has ended)
                if (normalizedLine.trim() !== '') {
                    listState.clear();
                    prevLevel = -1;
                }
            }
        }

        if (modified) {
            elements.editor.value = lines.join('\n');
            elements.editor.setSelectionRange(start, end);
        }
    };

    // Debounced version of renumberAllOrderedLists
    let renumberDebounceTimer = null;
    const renumberAllOrderedListsDebounced = () => {
        clearTimeout(renumberDebounceTimer);
        renumberDebounceTimer = setTimeout(() => {
            renumberAllOrderedLists();
        }, 500); // Wait 500ms after user stops typing
    };

    /**
     * Handle Enter key in lists for smart continuation
     * Auto-continues lists, creates new items, or exits list on double-enter
     * Handles bullet lists, numbered lists, and task lists
     *
     * @returns {boolean} True if Enter was handled (list context), false otherwise
     *
     * @example
     * handleEnterInList(); // Called on Enter keypress in editor
     */
    const handleEnterInList = () => {
        if (!elements.editor) {
            return false;
        }

        const { start, end, value } = utils.getSelection();

        // Only handle single cursor (no selection)
        if (start !== end) {
            return false;
        }

        const lines = value.split('\n');
        const currentLineIndex = value.slice(0, start).split('\n').length - 1;
        const currentLine = lines[currentLineIndex];

        // Get cursor position within the line
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const cursorPosInLine = start - lineStart;

        // Check if we're in a list item (IMPROVED REGEX)
        // Check for checkbox first: - [ ] or - [x]
        const checkboxMatch = currentLine.match(/^(\s*)([-*+])\s+\[([xX ])\]\s+(.*)$/);
        const unorderedMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
        const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);

        if (!checkboxMatch && !unorderedMatch && !orderedMatch) {
            return false; // Not in a list
        }

        const isCheckbox = !!checkboxMatch;
        const isOrdered = !!orderedMatch;
        const match = isCheckbox ? checkboxMatch : isOrdered ? orderedMatch : unorderedMatch;
        const indent = match[1];
        const marker = match[2];
        const content = isCheckbox ? match[4] : match[3];

        // FIX: Calculate marker end position more accurately
        let markerEndPos;
        if (isCheckbox) {
            markerEndPos = indent.length + marker.length + 1 + 3 + 1; // marker + space + [ ] + space
        } else {
            markerEndPos = indent.length + marker.length + (isOrdered ? 1 : 0) + 1; // +1 for space after marker
        }
        const isAtEndOfLine = cursorPosInLine >= currentLine.length;
        const isInOrAfterContent = cursorPosInLine >= markerEndPos;

        // If the list item is empty (only marker), exit the list
        if (content.trim() === '' && (isAtEndOfLine || cursorPosInLine <= markerEndPos)) {
            // Remove the empty list item and exit list
            const before = value.slice(0, lineStart);
            const after = value.slice(
                value.indexOf('\n', start) !== -1 ? value.indexOf('\n', start) : value.length
            );

            elements.editor.value = before + after;
            elements.editor.setSelectionRange(lineStart, lineStart);

            // Trigger updates
            if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
                MarkdownEditor.preview.updatePreview();
            }
            if (utils.updateCounters) {
                utils.updateCounters();
            }
            if (MarkdownEditor.stateManager) {
                MarkdownEditor.stateManager.markDirty(
                    elements.editor.value !== state.lastSavedContent
                );
            }
            if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
                MarkdownEditor.autosave.scheduleAutosave();
            }

            return true;
        }

        // FIX: Improved content splitting calculation
        // If cursor is before or at the marker position, all content goes to next line
        let contentBeforeCursor = '';
        let contentAfterCursor = content;

        if (isInOrAfterContent) {
            const offsetIntoContent = cursorPosInLine - markerEndPos;
            contentBeforeCursor = content.slice(0, offsetIntoContent);
            contentAfterCursor = content.slice(offsetIntoContent);
        }

        // Determine the next marker
        let nextMarker;
        if (isCheckbox) {
            nextMarker = `${marker} [ ]`;
        } else if (isOrdered) {
            const currentNumber = parseInt(marker, 10);
            nextMarker = `${currentNumber + 1}.`;
        } else {
            nextMarker = `${marker}`;
        }

        // Build the new content
        const lineEnd = value.indexOf('\n', start);
        const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;

        const before = value.slice(0, lineStart);
        const after = value.slice(actualLineEnd);

        let newCurrentLine;
        let newNextLine;
        if (isCheckbox) {
            newCurrentLine = `${indent}${marker} [ ] ${contentBeforeCursor}`;
            newNextLine = `${indent}${nextMarker} ${contentAfterCursor}`;
        } else if (isOrdered) {
            newCurrentLine = `${indent}${marker}. ${contentBeforeCursor}`;
            newNextLine = `${indent}${nextMarker} ${contentAfterCursor}`;
        } else {
            newCurrentLine = `${indent}${marker} ${contentBeforeCursor}`;
            newNextLine = `${indent}${nextMarker} ${contentAfterCursor}`;
        }

        const newValue = `${before + newCurrentLine}\n${newNextLine}${after}`;
        elements.editor.value = newValue;

        // Position cursor at start of content on new line
        let newCursorPos;
        if (isCheckbox) {
            newCursorPos =
                before.length + newCurrentLine.length + 1 + indent.length + nextMarker.length + 1;
        } else if (isOrdered) {
            newCursorPos =
                before.length + newCurrentLine.length + 1 + indent.length + nextMarker.length + 1;
        } else {
            newCursorPos =
                before.length + newCurrentLine.length + 1 + indent.length + nextMarker.length + 1;
        }
        elements.editor.setSelectionRange(newCursorPos, newCursorPos);

        // FIX: Use renumberAllOrderedLists instead of renumberOrderedList for consistency
        if (isOrdered) {
            setTimeout(() => {
                renumberAllOrderedLists();
            }, 0);
        }

        // Trigger updates
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        return true;
    };

    /**
     * Outdent list items (remove up to 2 spaces of indentation)
     */
    const outdentListItem = () => {
        if (!elements.editor) {
            return;
        }

        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        const { start, end, value } = utils.getSelection();
        const lines = value.split('\n');
        const lineOffsets = utils.getLineOffsets(lines);
        const startLineIndex = value.slice(0, start).split('\n').length - 1;
        const endLineIndex = value.slice(0, end).split('\n').length - 1;

        let cumulativeDelta = 0;
        let newStart = start;
        let newEnd = end;
        let startAdjusted = false;
        let endAdjusted = false;
        let modified = false;

        for (let i = 0; i < lines.length; i += 1) {
            const originalLine = lines[i];
            let newLine = originalLine;

            if (i >= startLineIndex && i <= endLineIndex) {
                // Check if this line is a list item (ordered or unordered)
                const listMatch = originalLine.match(/^(\s*)([-*+]|\d+\.)\s+/);
                if (listMatch) {
                    const currentIndent = listMatch[1];
                    // Remove up to 2 spaces of indentation
                    if (currentIndent.length >= 2) {
                        newLine = originalLine.slice(2);
                        modified = true;
                    } else if (currentIndent.length === 1) {
                        newLine = originalLine.slice(1);
                        modified = true;
                    }
                }
            }

            const lineStartOriginal = lineOffsets[i];
            const lineStartNew = lineStartOriginal + cumulativeDelta;
            const lineDelta = newLine.length - originalLine.length;

            if (!startAdjusted) {
                if (start < lineStartOriginal) {
                    newStart = start + cumulativeDelta;
                } else if (start <= lineStartOriginal + originalLine.length) {
                    // Cursor position: maintain relative position but account for removed spaces
                    const offsetInLine = start - lineStartOriginal;
                    const spacesRemoved = -lineDelta;
                    // If cursor was in the indentation area, move it to start of content
                    if (offsetInLine <= spacesRemoved) {
                        newStart = lineStartNew;
                    } else {
                        newStart = lineStartNew + offsetInLine + lineDelta;
                    }
                    startAdjusted = true;
                }
            }

            if (!endAdjusted) {
                if (end < lineStartOriginal) {
                    newEnd = end + cumulativeDelta;
                } else if (end <= lineStartOriginal + originalLine.length) {
                    const offsetInLine = end - lineStartOriginal;
                    const spacesRemoved = -lineDelta;
                    if (offsetInLine <= spacesRemoved) {
                        newEnd = lineStartNew;
                    } else {
                        newEnd = lineStartNew + offsetInLine + lineDelta;
                    }
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

        // Only update if we actually modified something
        if (!modified) {
            return;
        }

        elements.editor.value = lines.join('\n');

        // ✅ IMMEDIATE scroll lock #1 (after content change)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
        if (!hadFocus) {
            elements.editor.focus({ preventScroll: true });
        }

        // ✅ Set selection
        elements.editor.setSelectionRange(newStart, newEnd);

        // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // ✅ TRIPLE RAF for maximum browser compatibility
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;
                });
            });
        });

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        // Trigger immediate renumbering after outdent to update all affected lists
        setTimeout(() => {
            renumberAllOrderedLists();
        }, 0);
    };

    // Expose public API
    MarkdownEditor.formatting = {
        detectFormatting,
        updateToolbarStates,
        applyInlineFormat,
        applyHeading,
        applyBlockquote,
        toggleList,
        toggleCheckboxList,
        toggleCheckboxAtCursor,
        applyCodeBlock,
        replaceSelection,
        indentListItem,
        outdentListItem,
        handleEnterInList,
        renumberOrderedList,
        renumberAllOrderedLists,
        renumberAllOrderedListsDebounced
    };

    window.MarkdownEditor = MarkdownEditor;
})();
