/*
 * Markdown editor core logic.
 * Handles formatting, preview rendering, autosave, keyboard shortcuts and file operations.
 */
(() => {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const toolbar = document.getElementById('formatting-toolbar');
    const togglePreviewButton = document.getElementById('toggle-preview');
    const editorContainer = document.querySelector('.editor-container');
    const newButton = document.getElementById('new-file');
    const openButton = document.getElementById('open-file');
    const saveButton = document.getElementById('save-file');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const wordCountDisplay = document.getElementById('word-count');
    const charCountDisplay = document.getElementById('char-count');
    const autosaveStatus = document.getElementById('autosave-status');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    const AUTOSAVE_KEY = 'markdown-editor-autosave';
    const AUTOSAVE_FILENAME_KEY = 'markdown-editor-filename';
    const AUTOSAVE_INTERVAL = 1500;
    const THEME_KEY = 'markdown-editor-theme';

    const state = {
        autosaveTimer: null,
        dirty: false,
        lastSavedContent: '',
        isPreviewVisible: true
    };

    if (!editor || !preview) {
        return;
    }

    const updatePreview = () => {
        const markdown = editor.value;
        const rawHtml = window.markedLite.parse(markdown);
        const safeHtml = window.simpleSanitizer.sanitize(rawHtml);
        preview.innerHTML = safeHtml || '<p class="preview-placeholder">Start typing to see your formatted preview.</p>';
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

    const markDirty = (dirty = true) => {
        state.dirty = dirty;
    };

    const scheduleAutosave = () => {
        if (!window.localStorage) {
            return;
        }

        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = setTimeout(() => {
            try {
                localStorage.setItem(AUTOSAVE_KEY, editor.value);
                localStorage.setItem(AUTOSAVE_FILENAME_KEY, fileNameDisplay.textContent.trim());
                autosaveStatus.textContent = 'Draft saved';
            } catch (error) {
                console.error('Autosave failed', error);
                autosaveStatus.textContent = 'Autosave unavailable';
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

    const setSelection = (start, end) => {
        editor.focus();
        editor.setSelectionRange(start, end);
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

    const promptForInput = (message, defaultValue = '') => {
        const response = window.prompt(message, defaultValue);
        if (response === null) {
            return null;
        }
        return response.trim();
    };

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

    const insertLink = () => {
        console.log('insertLink function called');
        const { start, end, value } = getSelection();
        const selectedText = value.slice(start, end);

        const url = promptForInput('Link URL (https://...)', 'https://');
        if (!url) {
            console.log('Link insertion cancelled - no URL');
            return;
        }

        const defaultText = selectedText || url;
        const textResponse = promptForInput('Link text (optional)', defaultText);
        if (textResponse === null) {
            console.log('Link insertion cancelled - no text');
            return;
        }

        const linkText = textResponse || defaultText;
        const linkSyntax = `[${linkText}](${url})`;

        console.log('Inserting link:', linkSyntax);
        replaceSelection(linkSyntax, linkSyntax.length);
    };

    const insertImage = () => {
        console.log('insertImage function called');
        const altResponse = promptForInput('Image description (alt text)', 'Image description');
        if (altResponse === null) {
            console.log('Image insertion cancelled - no alt text');
            return;
        }

        const altText = altResponse || 'image';
        const url = promptForInput('Image URL (https://...)', 'https://');
        if (!url) {
            console.log('Image insertion cancelled - no URL');
            return;
        }

        const imageSyntax = `![${altText}](${url})`;
        console.log('Inserting image:', imageSyntax);
        replaceSelection(imageSyntax, imageSyntax.length);
    };

    // Insert a two-column Markdown table skeleton and focus the first header cell.
    const insertTable = () => {
        const { start, end, value } = getSelection();
        const before = value.slice(0, start);
        const after = value.slice(end);
        
        // Check if we're inside a code block
        const beforeText = before;
        const afterText = after;
        const backticksBefore = (beforeText.match(/```/g) || []).length;
        const backticksAfter = (afterText.match(/```/g) || []).length;
        const isInsideCodeBlock = backticksBefore % 2 !== 0;
        
        if (isInsideCodeBlock) {
            // Don't insert table inside code block
            autosaveStatus.textContent = 'Cannot insert table inside code block';
            return;
        }
        
        const table = ['| Column 1 | Column 2 |', '| --- | --- |', '| Cell 1 | Cell 2 |', '| Cell 3 | Cell 4 |'].join('\n');
        const leading = start > 0 && !before.endsWith('\n') ? '\n\n' : '';
        const trailing = after.startsWith('\n') || after.length === 0 ? '' : '\n\n';
        const inserted = `${leading}${table}${trailing}`;
        const placeholder = 'Column 1';
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

    const togglePreview = () => {
        state.isPreviewVisible = !state.isPreviewVisible;
        togglePreviewButton.setAttribute('aria-pressed', state.isPreviewVisible);
        editorContainer.classList.toggle('preview-hidden', !state.isPreviewVisible);
        togglePreviewButton.title = state.isPreviewVisible ? 'Hide preview (Ctrl+Shift+P)' : 'Show preview (Ctrl+Shift+P)';
        
        // Persist preview state
        if (window.localStorage) {
            try {
                localStorage.setItem('markdown-editor-preview', state.isPreviewVisible ? 'visible' : 'hidden');
            } catch (error) {
                console.error('Failed to persist preview state', error);
            }
        }
    };

    // Toggle the global theme and keep the toggle state accessible for assistive tech.
    const applyTheme = (isDark) => {
        document.body.classList.toggle('theme-dark', isDark);
        document.body.classList.toggle('theme-light', !isDark);
        darkModeToggle.setAttribute('aria-checked', isDark);
        darkModeToggle.querySelector('.btn-text').textContent = isDark ? 'Light' : 'Dark';
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
            }
        }
    };

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

    const loadFile = () => {
        if (state.dirty && !window.confirm('You have unsaved changes. Continue opening a file?')) {
            return;
        }
        fileInput.click();
    };

    const readFile = (file) => {
        if (!/\.(md|markdown)$/i.test(file.name)) {
            autosaveStatus.textContent = 'Only Markdown files can be opened';
            window.alert('Please choose a Markdown (.md or .markdown) file.');
            return;
        }

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
        };
        reader.onerror = () => {
            console.error('Failed to read file', reader.error);
            autosaveStatus.textContent = 'Unable to open file';
            window.alert('Unable to open the selected file.');
        };
        reader.readAsText(file);
    };

    const saveFile = () => {
        let filename = fileNameDisplay.textContent.trim();

        if (!filename || filename === 'Untitled.md') {
            const response = window.prompt('Enter a file name for your markdown document', filename || 'Untitled.md');
            if (response === null) {
                autosaveStatus.textContent = 'Save cancelled';
                return false;
            }
            filename = response.trim() || 'Untitled.md';
        }

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
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        state.lastSavedContent = editor.value;
        markDirty(false);
        autosaveStatus.textContent = `Saved ${link.download}`;
        scheduleAutosave();
        return true;
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
                case 'p':
                    event.preventDefault();
                    togglePreview();
                    return;
                default:
                    break;
            }
        }

        switch (key) {
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

    const handleInput = () => {
        updatePreview();
        updateCounters();
        autosaveStatus.textContent = 'Saving draft...';
        markDirty(editor.value !== state.lastSavedContent);
        scheduleAutosave();
    };

    const bindEvents = () => {
        toolbar.addEventListener('click', handleToolbarClick);
        editor.addEventListener('input', handleInput);
        togglePreviewButton.addEventListener('click', togglePreview);
        newButton.addEventListener('click', handleNewDocument);
        openButton.addEventListener('click', loadFile);
        saveButton.addEventListener('click', saveFile);
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
    };

    initializeTheme();
    initializePreviewState();
    restoreAutosave();
    updatePreview();
    updateCounters();
    autosaveStatus.textContent = 'Ready';
    bindEvents();
})();
