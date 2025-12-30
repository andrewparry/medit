/*
 * Markdown Editor - File Operations Module
 * Handles new document, open, save, and export functionality
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, state, utils, dialogs, history } = MarkdownEditor;

    // File System Access API support
    const supportsFileSystemAccess =
        'showSaveFilePicker' in window && 'showOpenFilePicker' in window;

    // File System Access API storage layer (Chromium-only disk editing)
    // Centralizes handle management, permissions, and best-effort persistence.
    const storageFSA = MarkdownEditor.storageFSA;

    // Constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    /**
     * Reset file handles and clear persisted file state
     * Clears active file handle so next save triggers "Save As"
     * Called when starting new document
     *
     * @returns {void}
     */
    const resetFileHandles = () => {
        // Clearing the active handle ensures subsequent "Save" triggers "Save As"
        // unless the user opens a file again.
        if (storageFSA && storageFSA.clearCurrentFileHandle) {
            storageFSA.clearCurrentFileHandle();
        }

        // We also clear persisted state so a "New document" doesn't silently stay
        // connected to a previous on-disk file after a reload.
        if (storageFSA && storageFSA.persistCurrentFileHandle) {
            // Best-effort; ignore failures (private mode / policy can block persistence).
            storageFSA.persistCurrentFileHandle().catch(() => {});
        }
    };

    /**
     * Validate file before reading (extension and size checks)
     * Ensures file is markdown (.md or .markdown) and under 10MB
     *
     * @param {File} file - File object to validate
     * @returns {Promise<boolean>} True if valid, false otherwise
     */
    const validateFile = async (file) => {
        // Validate file extension
        if (!/\.(md|markdown)$/i.test(file.name)) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('Only Markdown files can be opened');
            }
            await dialogs.alertDialog(
                'Please choose a Markdown (.md or .markdown) file.',
                'Invalid File Type'
            );
            return false;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('File too large');
            }
            await dialogs.alertDialog(
                `File size exceeds 10MB limit. Selected file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
                'File Too Large'
            );
            return false;
        }

        return true;
    };

    /**
     * Load file content into editor (common logic for all file loading methods).
     *
     * This function is intentionally side-effectful:
     * - Updates editor value
     * - Refreshes preview, counters, toolbar state
     * - Resets history baseline
     * - Clears find/replace state
     *
     * Keeping this centralized reduces "partially updated UI" bugs when multiple
     * open workflows exist (picker, drag-drop, etc.).
     */
    const loadFileContent = (content, filename) => {
        elements.editor.value = content;

        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }

        if (utils.updateCounters) {
            utils.updateCounters();
        }

        if (elements.fileNameDisplay) {
            elements.fileNameDisplay.textContent = filename;
        }

        // Update browser tab title
        if (utils.updateDocumentTitle) {
            utils.updateDocumentTitle();
        }

        state.lastSavedContent = elements.editor.value;

        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }

        if (MarkdownEditor.statusManager) {
            MarkdownEditor.statusManager.showSuccess(`Opened ${filename}`);
        }

        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        // Reset history baseline
        if (history && history.initHistory) {
            history.initHistory();
        }

        if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
            MarkdownEditor.formatting.updateToolbarStates();
        }

        // Close and clear find/replace UI
        if (elements.findBar) {
            elements.findBar.hidden = true;
        }
        if (elements.findInput) {
            elements.findInput.value = '';
        }
        if (elements.replaceInput) {
            elements.replaceInput.value = '';
        }
        if (elements.findCount) {
            elements.findCount.textContent = '0/0';
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.resetSearchState();
        }
        if (elements.editorHighlights) {
            elements.editorHighlights.innerHTML = '';
        }
        if (elements.toggleFindButton) {
            elements.toggleFindButton.setAttribute('aria-pressed', 'false');
            elements.toggleFindButton.classList.remove('active');
        }
    };

    /**
     * Set button loading state
     */
    const setButtonLoading = (button, loading = true) => {
        if (!button) {
            return;
        }

        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            const originalText =
                button.querySelector('.btn-text')?.textContent || button.textContent;
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

    /**
     * Reset editor state
     */
    const resetEditorState = () => {
        if (!elements.editor) {
            return;
        }

        // Clear autosave timer FIRST to prevent any pending autosave from saving empty content
        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = null;

        // Clear localStorage BEFORE clearing editor to prevent race condition
        // where autosave might save empty content after editor is cleared
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.clearAutosaveDraft) {
            MarkdownEditor.autosave.clearAutosaveDraft();
        }

        // Now clear the editor and update UI
        elements.editor.value = '';
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (elements.fileNameDisplay) {
            elements.fileNameDisplay.textContent = 'Untitled.md';
            elements.fileNameDisplay.contentEditable = 'false';
            delete elements.fileNameDisplay.dataset.originalName;
        }

        // Update browser tab title
        if (utils.updateDocumentTitle) {
            utils.updateDocumentTitle();
        }

        state.lastSavedContent = '';
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }
        if (MarkdownEditor.statusManager) {
            MarkdownEditor.statusManager.showReady();
        }
        utils.setSelection(0, 0);

        // Reset file handles
        resetFileHandles();

        // Close and clear find/replace UI
        if (elements.findBar) {
            elements.findBar.hidden = true;
        }
        if (elements.findInput) {
            elements.findInput.value = '';
        }
        if (elements.replaceInput) {
            elements.replaceInput.value = '';
        }
        if (elements.findCount) {
            elements.findCount.textContent = '0/0';
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.resetSearchState();
        }
        if (elements.editorHighlights) {
            elements.editorHighlights.innerHTML = '';
        }
        if (elements.toggleFindButton) {
            elements.toggleFindButton.setAttribute('aria-pressed', 'false');
            elements.toggleFindButton.classList.remove('active');
        }
    };

    /**
     * Handle new document creation
     * Checks for unsaved changes, prompts user if needed, then resets editor
     *
     * @returns {Promise<void>}
     *
     * @example
     * await handleNewDocument(); // Creates new blank document
     */
    const handleNewDocument = async () => {
        const hasUnsavedChanges =
            state.dirty && elements.editor && elements.editor.value !== state.lastSavedContent;

        if (!hasUnsavedChanges) {
            resetEditorState();
            return;
        }

        const choice = await dialogs.showUnsavedChangesDialog();

        if (choice === 'save') {
            if (await saveFile()) {
                resetEditorState();
            }
        } else if (choice === 'discard') {
            resetEditorState();
        }
    };

    /**
     * Load file from disk using File System Access API or file input fallback
     * Checks for unsaved changes, validates file, and loads content into editor
     *
     * @returns {Promise<void>}
     *
     * @example
     * await loadFile(); // Ctrl+O - opens file picker
     */
    const loadFile = async () => {
        if (state.dirty) {
            const confirmed = await dialogs.confirmDialog(
                'You have unsaved changes. Continue opening a file?',
                'Unsaved Changes',
                { confirmLabel: 'Continue', cancelLabel: 'Cancel' }
            );
            if (!confirmed) {
                return;
            }
        }

        setButtonLoading(elements.openButton, true);

        try {
            // Chromium-only preferred path: File System Access API.
            // We still keep a graceful fallback to the hidden file input if the picker is
            // unavailable (older Chromium, policies) or if the user denies.
            if (supportsFileSystemAccess && storageFSA && storageFSA.pickOpenFileHandle) {
                try {
                    const fileHandle = await storageFSA.pickOpenFileHandle();
                    const file = await fileHandle.getFile();

                    // UI-first validation so we can show the exact dialog users expect.
                    if (!(await validateFile(file))) {
                        return;
                    }

                    // Read content and update editor.
                    const content = await file.text();

                    // Establish "Save" target and persist best-effort for next session.
                    if (storageFSA.setCurrentFileHandle) {
                        storageFSA.setCurrentFileHandle(fileHandle);
                    }
                    if (storageFSA.persistCurrentFileHandle) {
                        storageFSA.persistCurrentFileHandle().catch(() => {});
                    }

                    loadFileContent(content, file.name);
                    return;
                } catch (error) {
                    // AbortError is the expected "user cancelled picker" outcome.
                    if (error && error.name === 'AbortError') {
                        return;
                    }
                    // Otherwise fall back (some enterprise policies block the API).
                }
            }

            // Fallback: standard file input (cannot write back to disk in-place).
            elements.fileInput.click();
        } finally {
            setButtonLoading(elements.openButton, false);
        }
    };

    /**
     * Read file from FileReader (for File System Access API)
     */
    const readFileFromHandle = async (file) => {
        // Validate file
        if (!(await validateFile(file))) {
            return;
        }

        try {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showOperation('Opening file...');
            }

            const content = await file.text();
            loadFileContent(content, file.name);
        } catch (error) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('Failed to open file');
            }
            await dialogs.alertDialog(
                'Unable to read the selected file. The file may be corrupted or inaccessible.',
                'Error Opening File'
            );
        }
    };

    /**
     * Read file (traditional method via file input)
     */
    const readFile = async (file) => {
        // Validate file
        if (!(await validateFile(file))) {
            return;
        }

        setButtonLoading(elements.openButton, true);

        try {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showOperation('Opening file...');
            }

            // Reset file handles for traditional file input
            resetFileHandles();

            // Use Promise-based FileReader
            const content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsText(file);
            });

            loadFileContent(content, file.name);
        } catch (error) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('Failed to open file');
            }
            await dialogs.alertDialog(
                'Unable to read the selected file. The file may be corrupted or inaccessible.',
                'Error Opening File'
            );
        } finally {
            setButtonLoading(elements.openButton, false);
        }
    };

    /**
     * Normalize filename to ensure .md extension
     */
    const normalizeFilename = (filename) => {
        if (!filename || !filename.trim()) {
            return 'Untitled.md';
        }
        const trimmed = filename.trim();
        return trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`;
    };

    /**
     * Determine save options for File System Access API
     */
    /**
     * Save file using File System Access API
     */
    const saveFileWithFileSystemAccess = async (content, normalizedName) => {
        if (!storageFSA) {
            throw new Error('File System Access storage is not initialized.');
        }

        // Current handle determines whether we can "Save" without prompting.
        let fileHandle =
            typeof storageFSA.getCurrentFileHandle === 'function'
                ? storageFSA.getCurrentFileHandle()
                : null;

        // If the display name matches the handle name, we treat this as a plain Save.
        // If it differs, we treat it as Save As (since renaming via DOM does not rename files on disk).
        const handleName = fileHandle && typeof fileHandle.name === 'string' ? fileHandle.name : '';
        const nameMatches = fileHandle && handleName.toLowerCase() === normalizedName.toLowerCase();

        if (fileHandle && nameMatches) {
            await storageFSA.writeTextToHandle(fileHandle, content);
        } else {
            // New file or user changed the displayed name -> Save As.
            // `startIn`:
            // - For new files: default to downloads to avoid surprising folder choices.
            // - For existing files: omit and let Chromium pick the most recent location.
            const isTrulyNewFile = !fileHandle;
            const startIn = isTrulyNewFile ? 'downloads' : undefined;

            fileHandle = await storageFSA.pickSaveFileHandle({
                suggestedName: normalizedName,
                startIn
            });

            if (storageFSA.setCurrentFileHandle) {
                storageFSA.setCurrentFileHandle(fileHandle);
            }

            await storageFSA.writeTextToHandle(fileHandle, content);
        }

        // Best-effort persistence so next session can reconnect without repicking.
        if (storageFSA.persistCurrentFileHandle) {
            storageFSA.persistCurrentFileHandle().catch(() => {});
        }

        // Update filename display with the actual saved name
        if (elements.fileNameDisplay && fileHandle && fileHandle.name) {
            elements.fileNameDisplay.textContent = fileHandle.name;
        }

        // Update browser tab title
        if (utils.updateDocumentTitle) {
            utils.updateDocumentTitle();
        }

        state.lastSavedContent = content;
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }
        if (MarkdownEditor.statusManager) {
            MarkdownEditor.statusManager.showSuccess(
                `Saved ${elements.fileNameDisplay.textContent.trim()}`
            );
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        return { success: true, filename: elements.fileNameDisplay.textContent.trim() };
    };

    /**
     * Save file using traditional download method
     */
    const saveFileWithTraditionalMethod = async (content, normalizedName) => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = normalizedName;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        state.lastSavedContent = content;
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }
        if (MarkdownEditor.statusManager) {
            MarkdownEditor.statusManager.showSuccess(`Saved ${normalizedName}`);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        return { success: true, filename: normalizedName };
    };

    /**
     * Save file to disk using File System Access API or download fallback
     * Prompts for filename if untitled, handles file handle persistence
     *
     * @returns {Promise<boolean>} True if saved successfully, false otherwise
     *
     * @example
     * await saveFile(); // Ctrl+S - saves file
     */
    const saveFile = async () => {
        if (!elements.editor || !elements.fileNameDisplay || !elements.saveButton) {
            return false;
        }

        // Check if there are unsaved changes - if not, do nothing
        const hasUnsavedChanges = elements.editor.value !== state.lastSavedContent;
        if (!hasUnsavedChanges) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showInfo('No changes to save');
            }
            return false;
        }

        setButtonLoading(elements.saveButton, true);

        try {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showOperation('Saving...');
            }

            let filename = elements.fileNameDisplay.textContent.trim();
            const content = elements.editor.value;

            // Prompt for filename if it's untitled
            if (!filename || filename === 'Untitled.md') {
                const response = await dialogs.promptDialog(
                    'Enter a file name for your markdown document',
                    filename || 'Untitled.md',
                    'text',
                    'Save File'
                );
                if (response === null) {
                    if (MarkdownEditor.statusManager) {
                        MarkdownEditor.statusManager.showInfo('Save cancelled');
                    }
                    return false;
                }
                filename = response;
            }

            const normalizedName = normalizeFilename(filename);
            elements.fileNameDisplay.textContent = normalizedName;
            elements.fileNameDisplay.contentEditable = 'false';
            delete elements.fileNameDisplay.dataset.originalName;

            // Use File System Access API if available
            if (supportsFileSystemAccess) {
                try {
                    await saveFileWithFileSystemAccess(content, normalizedName);
                    return true;
                } catch (error) {
                    if (error.name === 'AbortError') {
                        if (MarkdownEditor.statusManager) {
                            MarkdownEditor.statusManager.showInfo('Save cancelled');
                        }
                        return false;
                    }
                    // Fall through to traditional save method
                    // This handles permission errors or unsupported browsers
                }
            }

            // Fall back to traditional download method
            await saveFileWithTraditionalMethod(content, normalizedName);
            return true;
        } catch (error) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('Save failed');
            }
            await dialogs.alertDialog(
                'An error occurred while saving the file. Please try again.',
                'Save Error'
            );
            return false;
        } finally {
            setButtonLoading(elements.saveButton, false);
        }
    };

    /**
     * Export document as standalone HTML file
     * Renders markdown to HTML with syntax highlighting and styling
     * Downloads as .html file with embedded CSS
     *
     * @returns {Promise<void>}
     *
     * @example
     * await exportToHtml(); // Exports as HTML
     */
    const exportToHtml = async () => {
        if (!elements.editor || !elements.fileNameDisplay) {
            return;
        }

        const content = elements.editor.value;
        if (!content || !content.trim()) {
            await dialogs.alertDialog(
                'Cannot export an empty document. Please add some content first.',
                'Export Error'
            );
            return;
        }

        try {
            const filename = elements.fileNameDisplay.textContent.trim().replace(/\.md$/, '');
            const htmlFilename = filename.endsWith('.html') ? filename : `${filename}.html`;

            const renderHtml = (state && state.renderHtml) || false;
            const rawHtml = window.markedLite.parse(content, { renderHtml });
            const safeHtml = window.simpleSanitizer.sanitize(rawHtml);

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
        } catch (error) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('Export failed');
            }
            await dialogs.alertDialog(
                'An error occurred while exporting to HTML. Please try again.',
                'Export Error'
            );
        }
    };

    /**
     * Export to plain text
     */
    const exportToPlainText = async () => {
        if (!elements.editor || !elements.fileNameDisplay) {
            return;
        }

        const content = elements.editor.value;
        if (!content || !content.trim()) {
            await dialogs.alertDialog(
                'Cannot export an empty document. Please add some content first.',
                'Export Error'
            );
            return;
        }

        try {
            const filename = elements.fileNameDisplay.textContent.trim().replace(/\.md$/, '');
            const txtFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;

            const blob = new Blob([content], { type: 'text/plain' });
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
        } catch (error) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('Export failed');
            }
            await dialogs.alertDialog(
                'An error occurred while exporting to plain text. Please try again.',
                'Export Error'
            );
        }
    };

    /**
     * Export document as PDF via browser print dialog
     * Opens new window with rendered markdown and triggers print
     *
     * @returns {Promise<void>}
     *
     * @example
     * await exportToPdf(); // Opens print dialog for PDF
     */
    const exportToPdf = async () => {
        if (!elements.editor) {
            return;
        }

        const content = elements.editor.value;
        if (!content || !content.trim()) {
            await dialogs.alertDialog(
                'Cannot export an empty document. Please add some content first.',
                'Export Error'
            );
            return;
        }

        try {
            const renderHtml = (state && state.renderHtml) || false;
            const rawHtml = window.markedLite.parse(content, { renderHtml });
            const safeHtml = window.simpleSanitizer.sanitize(rawHtml);

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                await dialogs.alertDialog(
                    'Please allow pop-ups to export as PDF. Check your browser settings and try again.',
                    'PDF Export Blocked'
                );
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
        /* Preserve colors when printing */
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        
        @media print {
            body { margin: 0; }
            /* Ensure syntax highlighting colors are preserved */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
<script>
if (window.Prism) {
    window.Prism.highlightAll();
}
</script>
</body>
</html>`);

            printWindow.document.close();

            // Wait for scripts to load and highlight code before printing
            setTimeout(() => {
                if (printWindow.Prism) {
                    printWindow.Prism.highlightAll();
                }
                // Additional delay to ensure highlighting is applied
                setTimeout(() => {
                    printWindow.print();
                    setTimeout(() => {
                        printWindow.close();
                    }, 1000);
                }, 100);
            }, 500);
        } catch (error) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('Export failed');
            }
            await dialogs.alertDialog(
                'An error occurred while exporting to PDF. Please try again.',
                'Export Error'
            );
        }
    };

    /**
     * Handle export by showing format selection dialog
     * Routes to appropriate export function based on user choice
     *
     * @returns {Promise<void>}
     *
     * @example
     * await handleExport(); // Shows export options dialog
     */
    const handleExport = async () => {
        const exportFormat = await dialogs.showExportDialog();

        if (!exportFormat) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showInfo('Export cancelled');
            }
            return;
        }

        try {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showOperation('Exporting...');
            }

            switch (exportFormat) {
                case 'html':
                    await exportToHtml();
                    if (MarkdownEditor.statusManager) {
                        MarkdownEditor.statusManager.showSuccess('Exported as HTML');
                    }
                    break;
                case 'pdf':
                    await exportToPdf();
                    if (MarkdownEditor.statusManager) {
                        MarkdownEditor.statusManager.showSuccess('Opening PDF export...');
                    }
                    break;
                case 'txt':
                    await exportToPlainText();
                    if (MarkdownEditor.statusManager) {
                        MarkdownEditor.statusManager.showSuccess('Exported as plain text');
                    }
                    break;
            }
        } catch (error) {
            if (MarkdownEditor.statusManager) {
                MarkdownEditor.statusManager.showError('Export failed');
            }
            await dialogs.alertDialog(
                'An error occurred while exporting the document. Please try again.',
                'Export Error'
            );
        }
    };

    // Expose public API
    MarkdownEditor.fileOps = {
        setButtonLoading,
        resetEditorState,
        handleNewDocument,
        loadFile,
        readFile,
        saveFile,
        exportToHtml,
        exportToPlainText,
        exportToPdf,
        handleExport
    };

    window.MarkdownEditor = MarkdownEditor;
})();
