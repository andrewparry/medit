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
    const THEME_KEY = 'markdown-editor-theme';
    const AUTOSAVE_INTERVAL = 1500;

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

    const stripMarkdown = (markdown) => markdown
        .replace(/```+[\s\S]*?```+/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s*/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/^\s*>+\s?/gm, '')
        .replace(/^\s*\|?[-:\s|]+\|?\s*$/gm, ' ')
        .replace(/\|/g, ' ')
        .replace(/[*_~`]/g, '')
        .replace(/<\/?[^>]+>/g, ' ')
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const updateCounters = () => {
        const plain = stripMarkdown(editor.value);
        const normalized = normalizeWhitespace(plain);
        const words = normalized ? normalized.split(' ').filter(Boolean).length : 0;
        const characters = normalized.length;

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

        setSelection(newEnd, newEnd);
        updatePreview();
        updateCounters();
        markDirty(true);
        scheduleAutosave();
    };

    // Wrap the current selection with a prefix/suffix pair, inserting placeholder text when nothing is selected.
    const wrapSelection = (prefix, suffix, placeholder = '') => {
        const { start, end, value } = getSelection();
        const selection = value.slice(start, end);
        const hasSelection = selection.length > 0;
        const inner = hasSelection ? selection : placeholder;
        const inserted = `${prefix}${inner}${suffix}`;

        if (hasSelection || !inner) {
            replaceSelection(inserted, inserted.length);
            return;
        }

        replaceSelection(inserted, {
            start: prefix.length,
            end: prefix.length + inner.length
        });
    };

    const applyHeading = (level) => {
        const { start, end, value } = getSelection();
        const lines = value.split('\n');
        const startLineIndex = value.slice(0, start).split('\n').length - 1;
        const endLineIndex = value.slice(0, end).split('\n').length - 1;

        for (let i = startLineIndex; i <= endLineIndex; i += 1) {
            const line = lines[i];
            const trimmed = line.replace(/^#{1,6}\s*/, '');
            const newLine = `${'#'.repeat(level)} ${trimmed}`.trim();
            lines[i] = newLine;
        }

        const newValue = lines.join('\n');
        editor.value = newValue;

        const before = lines.slice(0, startLineIndex).join('\n');
        const selected = lines.slice(startLineIndex, endLineIndex + 1).join('\n');
        const beforeLength = before.length + (startLineIndex > 0 ? 1 : 0);
        const newEnd = beforeLength + selected.length;

        setSelection(newEnd, newEnd);
        updatePreview();
        updateCounters();
        markDirty(true);
        scheduleAutosave();
    };

    // Toggle bullet/numbered list markers for the selected lines, converting between list types when needed.
    const toggleList = (type) => {
        const { start, end, value } = getSelection();
        const beforeSelection = value.slice(0, start);
        const selection = value.slice(start, end);

        const selectionStartIndex = beforeSelection.split('\n').length - 1;
        const selectionEndIndex = selection ? selectionStartIndex + selection.split('\n').length - 1 : selectionStartIndex;
        const lines = value.split('\n');

        const normalizeLine = (line) => line
            .replace(/^\s*[-*+]\s+/, '')
            .replace(/^\s*\d+\.\s+/, '');

        const marker = type === 'ol' ? (index) => `${index + 1}. ` : () => '- ';
        let removeMarkers = true;

        for (let i = selectionStartIndex; i <= selectionEndIndex; i += 1) {
            const line = lines[i] || '';
            if (type === 'ol' && /^\s*\d+\.\s+/.test(line)) {
                continue;
            }
            if (type === 'ul' && /^\s*[-*+]\s+/.test(line)) {
                continue;
            }
            removeMarkers = false;
            break;
        }

        for (let i = selectionStartIndex; i <= selectionEndIndex; i += 1) {
            const rawLine = lines[i] || '';
            const content = normalizeLine(rawLine);
            if (removeMarkers) {
                lines[i] = content;
            } else {
                const index = type === 'ol' ? i - selectionStartIndex : 0;
                lines[i] = `${marker(index)}${content}`;
            }
        }

        editor.value = lines.join('\n');
        const before = lines.slice(0, selectionStartIndex).join('\n');
        const selected = lines.slice(selectionStartIndex, selectionEndIndex + 1).join('\n');
        const beforeLength = before.length + (selectionStartIndex > 0 ? 1 : 0);
        const newEnd = beforeLength + selected.length;
        setSelection(newEnd, newEnd);
        updatePreview();
        updateCounters();
        markDirty(true);
        scheduleAutosave();
    };

    const applyCodeBlock = () => {
        const { start, end, value } = getSelection();
        const selection = value.slice(start, end);
        const hasSelection = selection.length > 0;
        const placeholder = hasSelection ? selection : 'code here';
        const fence = '```';
        const needsLeadingNewline = start > 0 && value[start - 1] !== '\n';
        const needsTrailingNewline = end === value.length || value[end] !== '\n';
        const leading = needsLeadingNewline ? '\n' : '';
        const trailing = needsTrailingNewline ? '\n' : '';
        const blockCore = `${fence}\n${placeholder}\n${fence}`;
        const block = `${leading}${blockCore}${trailing}`;

        if (hasSelection) {
            replaceSelection(block, block.length);
            return;
        }

        const placeholderStart = leading.length + fence.length + 1;
        replaceSelection(block, {
            start: placeholderStart,
            end: placeholderStart + placeholder.length
        });
    };

    const promptForInput = (message, defaultValue = '') => {
        const response = window.prompt(message, defaultValue);
        return response ? response.trim() : '';
    };

    const insertLink = () => {
        const { start, end, value } = getSelection();
        const selectedText = value.slice(start, end);
        let text = selectedText;

        if (!text) {
            text = promptForInput('Link text', 'link text');
        }

        if (!text) {
            return;
        }
        const url = promptForInput('Link URL (https://...)', 'https://');
        if (!url) {
            return;
        }
        const inserted = `[${text}](${url})`;
        replaceSelection(inserted, inserted.length);
    };

    const insertImage = () => {
        const altText = promptForInput('Image description (alt text)', 'alt text');
        const url = promptForInput('Image URL (https://...)', 'https://');
        if (!url) {
            return;
        }
        const alt = altText || 'image';
        const inserted = `![${alt}](${url})`;
        replaceSelection(inserted, inserted.length);
    };

    // Insert a two-column Markdown table skeleton and place the caret after the block.
    const insertTable = () => {
        const { start, end, value } = getSelection();
        const rows = ['| Column 1 | Column 2 |', '| --- | --- |', '| Row 1 | Row 1 value |', '| Row 2 | Row 2 value |'];
        const table = rows.join('\n');
        const needsLeadingNewline = start > 0 && value[start - 1] !== '\n';
        const needsTrailingNewline = end === value.length || value[end] !== '\n';
        const leading = needsLeadingNewline ? '\n' : '';
        const trailing = needsTrailingNewline ? '\n' : '';
        const block = `${leading}${table}${trailing}`;
        const focusText = 'Row 1 value';
        const focusIndex = table.indexOf(focusText);
        const selectionStart = focusIndex >= 0 ? leading.length + focusIndex : block.length;
        const selectionEnd = focusIndex >= 0 ? selectionStart + focusText.length : selectionStart;

        replaceSelection(block, {
            start: selectionStart,
            end: selectionEnd
        });
    };

    const handleFormatting = (action) => {
        switch (action) {
            case 'bold':
                wrapSelection('**', '**', 'bold text');
                break;
            case 'italic':
                wrapSelection('*', '*', 'italic text');
                break;
            case 'code':
                wrapSelection('`', '`', 'code');
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
        handleFormatting(target.dataset.format);
    };

    const togglePreview = () => {
        state.isPreviewVisible = !state.isPreviewVisible;
        togglePreviewButton.setAttribute('aria-pressed', state.isPreviewVisible);
        editorContainer.classList.toggle('preview-hidden', !state.isPreviewVisible);
        togglePreviewButton.title = state.isPreviewVisible ? 'Hide preview (Ctrl+Shift+P)' : 'Show preview (Ctrl+Shift+P)';
    };

    const persistTheme = (isDark) => {
        if (!window.localStorage) {
            return;
        }

        try {
            localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        } catch (error) {
            console.error('Theme persistence failed', error);
        }
    };

    const setTheme = (isDark) => {
        document.body.classList.toggle('theme-dark', isDark);
        document.body.classList.toggle('theme-light', !isDark);
        darkModeToggle.setAttribute('aria-checked', isDark);
        darkModeToggle.querySelector('.btn-text').textContent = isDark ? 'Light' : 'Dark';
    };

    const initializeTheme = () => {
        let isDark = document.body.classList.contains('theme-dark');

        if (window.localStorage) {
            try {
                const stored = localStorage.getItem(THEME_KEY);
                if (stored) {
                    isDark = stored === 'dark';
                }
            } catch (error) {
                console.error('Theme restore failed', error);
            }
        }

        setTheme(isDark);
    };

    // Toggle the global theme and keep the toggle state accessible for assistive tech.
    const toggleDarkMode = () => {
        const isDark = !document.body.classList.contains('theme-dark');
        setTheme(isDark);
        autosaveStatus.textContent = isDark ? 'Dark mode on' : 'Dark mode off';
        persistTheme(isDark);
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

    const clearAutosave = () => {
        if (!window.localStorage) {
            return;
        }

        try {
            localStorage.removeItem(AUTOSAVE_KEY);
            localStorage.removeItem(AUTOSAVE_FILENAME_KEY);
        } catch (error) {
            console.error('Failed to clear autosave', error);
        }
    };

    const resetEditor = () => {
        editor.value = '';
        updatePreview();
        updateCounters();
        fileNameDisplay.textContent = 'Untitled.md';
        autosaveStatus.textContent = 'Draft saved';
        state.lastSavedContent = '';
        markDirty(false);
        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = null;
        clearAutosave();
        editor.focus();
    };

    const promptNewDocumentAction = () => {
        const message = 'You have unsaved changes. Save them before starting a new document?\nType "save", "don\'t save", or "cancel".';

        while (true) {
            const response = window.prompt(message, 'save');

            if (response === null) {
                return 'cancel';
            }

            const normalized = response.trim().toLowerCase();

            if (normalized === 'save' || normalized === 's') {
                return 'save';
            }

            if (normalized === "don't save" || normalized === 'dont save' || normalized === 'discard' || normalized === 'd' || normalized === 'no') {
                return 'discard';
            }

            if (normalized === 'cancel' || normalized === 'c') {
                return 'cancel';
            }

            window.alert('Please choose Save, Don\'t Save, or Cancel.');
        }
    };

    const handleNewDocument = () => {
        if (state.dirty) {
            const decision = promptNewDocumentAction();

            if (decision === 'cancel') {
                autosaveStatus.textContent = 'New document cancelled';
                return;
            }

            if (decision === 'save') {
                const saved = saveFile();

                if (!saved) {
                    autosaveStatus.textContent = 'Save cancelled';
                    return;
                }
            }
        }

        resetEditor();
    };

    const loadFile = () => {
        if (state.dirty && !window.confirm('You have unsaved changes. Continue opening a file?')) {
            return;
        }
        fileInput.click();
    };

    const readFile = (file) => {
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
        reader.readAsText(file);
    };

    const ensureMarkdownExtension = (name) => (name.toLowerCase().endsWith('.md') ? name : `${name}.md`);

    const saveFile = () => {
        let filename = fileNameDisplay.textContent.trim() || 'Untitled.md';

        if (filename === 'Untitled.md') {
            const userProvided = promptForInput('File name', 'Untitled');

            if (!userProvided) {
                autosaveStatus.textContent = 'Save cancelled';
                return false;
            }

            filename = ensureMarkdownExtension(userProvided);
        } else {
            filename = ensureMarkdownExtension(filename);
        }

        const blob = new Blob([editor.value], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        fileNameDisplay.textContent = filename;
        state.lastSavedContent = editor.value;
        markDirty(false);
        autosaveStatus.textContent = `Saved ${filename}`;
        scheduleAutosave();
        return true;
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
    restoreAutosave();
    updatePreview();
    updateCounters();
    autosaveStatus.textContent = 'Ready';
    bindEvents();
})();
