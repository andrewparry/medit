/*
 * Markdown Editor - Formatting Module
 * Handles text formatting operations (bold, italic, headers, lists, etc.)
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, utils, history, state } = MarkdownEditor;

    /**
     * Replace the current textarea selection while optionally restoring a custom selection range
     */
    const replaceSelection = (text, selectionRange) => {
        if (!elements.editor) return;
        
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
     * Detect formatting at cursor position
     */
    const detectFormatting = () => {
        if (!elements.editor) return {};
        
        const { start, end, value } = utils.getSelection();
        const hasSelection = start !== end;
        
        const formatting = {
            bold: false,
            italic: false,
            strikethrough: false,
            code: false,
            blockquote: false,
            hr: false,
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
            // Check if selection is wrapped with bold markers
            const beforeSelection = value.slice(Math.max(0, start - 3), start);
            const afterSelection = value.slice(end, Math.min(value.length, end + 3));
            
            formatting.bold = (beforeSelection.endsWith('**') && afterSelection.startsWith('**')) ||
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
            const isAtEndOfItalic = italicMatches.some(match => beforeCursor.endsWith(match));
            const isAfterItalic = italicMatches.some(match => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });
            
            formatting.italic = isInsideItalic || isAtEndOfItalic || isAfterItalic;
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
            const isAtEndOfStrikethrough = strikethroughMatches.some(match => beforeCursor.endsWith(match));
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
            const isAtEndOfCode = codeMatches.some(match => beforeCursor.endsWith(match));
            const isAfterCode = codeMatches.some(match => {
                const matchEnd = value.indexOf(match) + match.length;
                return start === matchEnd;
            });
            
            formatting.code = isInsideCode || isAtEndOfCode || isAfterCode;
        }

        // Check for headers (at start of line)
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineText = value.slice(lineStart, value.indexOf('\n', start) === -1 ? value.length : value.indexOf('\n', start));
        
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
        formatting.codeBlock = codeBlockStart % 2 === 1;

        // Check for tables
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

    /**
     * Update toolbar button states based on detected formatting
     */
    const updateToolbarStates = () => {
        if (!elements.toolbar) return;
        
        const formatting = detectFormatting();
        
        // Update text formatting buttons
        const boldButton = elements.toolbar.querySelector('[data-format="bold"]');
        const italicButton = elements.toolbar.querySelector('[data-format="italic"]');
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
        const ulButton = elements.toolbar.querySelector('[data-format="ul"]');
        const olButton = elements.toolbar.querySelector('[data-format="ol"]');
        
        if (ulButton) {
            ulButton.classList.toggle('active', formatting.ul);
            ulButton.setAttribute('aria-pressed', formatting.ul);
        }
        if (olButton) {
            olButton.classList.toggle('active', formatting.ol);
            olButton.setAttribute('aria-pressed', formatting.ol);
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
    };

    /**
     * Apply inline formatting (bold, italic, strikethrough, code)
     */
    const applyInlineFormat = (prefix, suffix, placeholder = '') => {
        const { start, end, value } = utils.getSelection();
        const hasSelection = start !== end;
        
        // Determine format type
        const formatTypeMap = {
            '****': 'bold',
            '**': 'italic',
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
            } else if (formatType === 'strikethrough') {
                pattern = /~~([^~\n]+?)~~/g;
                markerLength = 2;
            } else if (formatType === 'code') {
                pattern = /`([^`\n]+?)`/g;
                markerLength = 1;
            } else {
                // Fallback: just insert formatting
                const selection = hasSelection ? value.slice(start, end) : placeholder;
                const inserted = `${prefix}${selection}${suffix}`;
                replaceSelection(inserted, hasSelection ? inserted.length : {
                    start: prefix.length,
                    end: prefix.length + selection.length
                });
                return;
            }
            
            // Search through all matches to find the one containing our cursor/selection
            const matches = Array.from(value.matchAll(pattern));
            
            for (const match of matches) {
                const matchStart = match.index;
                const matchEnd = matchStart + match[0].length;
                
                // Check if cursor or selection is within this match
                if (start >= matchStart && end <= matchEnd) {
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
                            
                            // Use replaceSelection for consistency
                            const lengthDiff = match[0].length - newText.length;
                            elements.editor.value = newContent;
                            
                            // Adjust cursor position
                            let newStart = start - 2; // Remove ** from ***
                            let newEnd = end - 2;
                            
                            // Make sure cursor stays within bounds
                            if (newStart < matchStart) newStart = matchStart + 1;
                            if (newEnd > matchStart + newText.length) newEnd = matchStart + newText.length - 1;
                            
                            elements.editor.setSelectionRange(newStart, newEnd);
                            removed = true;
                            break;
                        }
                    }
                    
                    // Standard removal: extract inner text without markers
                    const innerText = match[2] || match[1];
                    if (!innerText) continue; // Skip if no inner text found
                    
                    // Calculate new selection position relative to match start
                    const offsetIntoMatch = start - matchStart;
                    let newStart, newEnd;
                    
                    if (offsetIntoMatch <= markerLength) {
                        // Cursor was in or before opening marker
                        newStart = matchStart;
                        newEnd = matchStart;
                    } else if (offsetIntoMatch >= markerLength + innerText.length) {
                        // Cursor was in or after closing marker
                        newStart = matchStart + innerText.length;
                        newEnd = matchStart + innerText.length;
                    } else {
                        // Cursor was in the content
                        newStart = start - markerLength;
                        newEnd = end - markerLength;
                    }
                    
                    // Clamp to valid range
                    newStart = Math.max(matchStart, Math.min(matchStart + innerText.length, newStart));
                    newEnd = Math.max(matchStart, Math.min(matchStart + innerText.length, newEnd));
                    
                    // Use the replaceSelection mechanism but we need to manually set up the replacement
                    const beforeMatch = value.slice(0, matchStart);
                    const afterMatch = value.slice(matchEnd);
                    const newValue = beforeMatch + innerText + afterMatch;
                    
                    elements.editor.value = newValue;
                    elements.editor.setSelectionRange(newStart, newEnd);
                    removed = true;
                    break;
                }
            }
            
            if (removed) {
                // Trigger updates without using replaceSelection (we already updated content)
                const scrollTop = elements.editor.scrollTop;
                const scrollLeft = elements.editor.scrollLeft;
                
                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;
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
                if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
                    MarkdownEditor.formatting.updateToolbarStates();
                }
                
                return;
            }
        }
        
        // ADD FORMATTING (not already formatted)
        const selection = hasSelection ? value.slice(start, end) : placeholder;
        const inserted = `${prefix}${selection}${suffix}`;
        
        if (hasSelection) {
            // Replace selection with formatted text, cursor at end
            replaceSelection(inserted, inserted.length);
        } else {
            // No selection: insert placeholder and select it
            replaceSelection(inserted, {
                start: prefix.length,
                end: prefix.length + selection.length
            });
        }
    };

    /**
     * Apply heading formatting
     */
    const applyHeading = (level) => {
        if (!elements.editor) return;
        
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
     * Apply blockquote formatting
     */
    const applyBlockquote = () => {
        if (!elements.editor) return;
        
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
     * Toggle bullet/numbered list markers
     */
    const toggleList = (type) => {
        if (!elements.editor) return;
        
        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;
        
        const { start, end, value } = utils.getSelection();
        const lines = value.split('\n');
        const lineOffsets = utils.getLineOffsets(lines);
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
     * Apply code block formatting
     */
    const applyCodeBlock = () => {
        if (!elements.editor) return;
        
        // Preserve scroll position
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        
        const { start, end, value } = utils.getSelection();
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
            replaceSelection(inserted, inserted.length - trailing.length);
        } else {
            replaceSelection(inserted, prefix.length);
        }
        
        // Extra scroll lock for code blocks (they tend to shift more)
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;
        });
    };

    // Expose public API
    MarkdownEditor.formatting = {
        detectFormatting,
        updateToolbarStates,
        applyInlineFormat,
        applyHeading,
        applyBlockquote,
        toggleList,
        applyCodeBlock,
        replaceSelection
    };

    window.MarkdownEditor = MarkdownEditor;
})();

