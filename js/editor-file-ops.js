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

    // Track file handles for File System Access API
    let currentFileHandle = null;
    let currentDirectoryHandle = null;

    // Track server file path for files opened via server (double-click workflow)
    let serverFilePath = null;

    // Constants
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    /**
     * Reset file handles
     */
    const resetFileHandles = () => {
        currentFileHandle = null;
        currentDirectoryHandle = null;
        serverFilePath = null;
    };

    /**
     * Validate file before reading
     */
    const validateFile = async (file) => {
        // Validate file extension
        if (!/\.(md|markdown)$/i.test(file.name)) {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Only Markdown files can be opened';
            }
            await dialogs.alertDialog(
                'Please choose a Markdown (.md or .markdown) file.',
                'Invalid File Type'
            );
            return false;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'File too large';
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
     * Load file content into editor (common logic for all file loading methods)
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

        state.lastSavedContent = elements.editor.value;

        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }

        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = `Opened ${filename}`;
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
     * Load file from URL parameter (for server-based file opening)
     * Called when the page is loaded with ?path=/path/to/file.md
     */
    const loadFileFromUrlParam = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const filePath = urlParams.get('path');

        // Debug: log URL info
        console.log('[mdedit] URL search:', window.location.search);
        console.log('[mdedit] File path from URL:', filePath);

        if (!filePath) {
            return false;
        }

        try {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Loading file...';
            }

            // Fetch file content from server
            const response = await fetch(`/file?path=${encodeURIComponent(filePath)}`);

            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.statusText}`);
            }

            const content = await response.text();

            // Extract filename from path
            const filename = filePath.split('/').pop() || 'Untitled.md';

            // Store the server file path for saving back
            serverFilePath = filePath;
            console.log('[mdedit] Server file path set to:', serverFilePath);

            // Reset file handles since this is a server-loaded file
            currentFileHandle = null;
            currentDirectoryHandle = null;

            // Load the content into the editor
            loadFileContent(content, filename);

            // Clear the URL parameter without refreshing the page
            // This prevents reloading the file if the user refreshes
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);

            return true;
        } catch (error) {
            console.error('Failed to load file from URL:', error);
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Failed to load file';
            }
            await dialogs.alertDialog(
                `Unable to load the file: ${error.message}`,
                'Error Loading File'
            );
            return false;
        }
    };

    /**
     * Save file via server POST endpoint
     * Used when file was opened via server (double-click workflow)
     */
    const saveFileViaServer = async (content, filePath) => {
        const response = await fetch(`/file?path=${encodeURIComponent(filePath)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            },
            body: content
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }

        const result = await response.json();
        return { success: true, path: result.path };
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
        state.lastSavedContent = '';
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = 'Ready';
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
     * Handle new document
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
     * Load file
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
            // Try File System Access API first if available
            if (supportsFileSystemAccess) {
                try {
                    const [fileHandle] = await window.showOpenFilePicker({
                        types: [
                            {
                                description: 'Markdown files',
                                accept: {
                                    'text/markdown': ['.md', '.markdown']
                                }
                            }
                        ],
                        multiple: false
                    });

                    const file = await fileHandle.getFile();
                    currentFileHandle = fileHandle;

                    // Get the directory handle for future saves
                    try {
                        currentDirectoryHandle = await fileHandle.getParent();
                    } catch (e) {
                        // Parent directory might not be accessible in all cases
                        // This is expected in some browsers/environments
                    }

                    await readFileFromHandle(file);
                    return;
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return;
                    }
                    // Fall back to traditional file input if File System Access API fails
                    // This handles permission errors or unsupported browsers
                }
            }

            // Fall back to traditional file input
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
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Opening file...';
            }

            const content = await file.text();
            loadFileContent(content, file.name);
        } catch (error) {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Failed to open file';
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
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Opening file...';
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
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Failed to open file';
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
    const determineSaveOptions = async (normalizedName, isTrulyNewFile) => {
        const saveOptions = {
            suggestedName: normalizedName,
            types: [
                {
                    description: 'Markdown files',
                    accept: {
                        'text/markdown': ['.md']
                    }
                }
            ]
        };

        // Set default directory:
        // - For truly new files (never opened): use downloads folder
        // - For files that were opened (have file handle): use the directory where it was opened from
        if (isTrulyNewFile) {
            // New file: default to downloads folder
            saveOptions.startIn = 'downloads';
        } else {
            // We have a file handle (file was opened) - try to get directory
            let directoryHandle = currentDirectoryHandle;

            // If we don't have a directory handle stored, try to get it from the file handle
            if (!directoryHandle && currentFileHandle) {
                try {
                    directoryHandle = await currentFileHandle.getParent();
                    currentDirectoryHandle = directoryHandle; // Cache it for next time
                } catch (e) {
                    // Parent directory might not be accessible in all cases
                    // This is expected in some browsers/environments
                }
            }

            // Use the directory handle if we have it
            if (directoryHandle) {
                saveOptions.startIn = directoryHandle;
            }
            // If we still don't have a directory handle, don't set startIn
            // Browser will default to last location (which might be Downloads)
            // This can happen if file was opened via traditional file input
        }

        return saveOptions;
    };

    /**
     * Save file using File System Access API
     */
    const saveFileWithFileSystemAccess = async (content, normalizedName) => {
        let fileHandle = currentFileHandle;
        const isTrulyNewFile = !currentFileHandle;

        // Compare names case-insensitively and ignore .md extension differences
        const currentFileName = currentFileHandle ? currentFileHandle.name.toLowerCase() : '';
        const normalizedFileName = normalizedName.toLowerCase();
        const nameMatches =
            currentFileHandle &&
            (currentFileName === normalizedFileName ||
                currentFileName.replace(/\.md$/, '') === normalizedFileName.replace(/\.md$/, ''));

        // If we have a file handle and the name matches, save directly (no dialog - avoids permission text)
        if (fileHandle && nameMatches) {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            state.lastSavedContent = content;
            if (MarkdownEditor.stateManager) {
                MarkdownEditor.stateManager.markDirty(false);
            }
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = `Saved ${normalizedName}`;
            }
            if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
                MarkdownEditor.autosave.scheduleAutosave();
            }
            return { success: true, filename: normalizedName };
        }

        // Show save dialog for new files or when name changed
        const saveOptions = await determineSaveOptions(normalizedName, isTrulyNewFile);
        fileHandle = await window.showSaveFilePicker(saveOptions);
        currentFileHandle = fileHandle;

        // Update directory handle if we can get it
        try {
            currentDirectoryHandle = await fileHandle.getParent();
        } catch (e) {
            // Parent directory might not be accessible in all cases
            // This is expected in some browsers/environments
        }

        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();

        // Update filename display with the actual saved name
        if (elements.fileNameDisplay) {
            elements.fileNameDisplay.textContent = fileHandle.name;
        }

        state.lastSavedContent = content;
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = `Saved ${fileHandle.name}`;
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        return { success: true, filename: fileHandle.name };
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
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = `Saved ${normalizedName}`;
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }

        return { success: true, filename: normalizedName };
    };

    /**
     * Save file
     */
    const saveFile = async () => {
        if (!elements.editor || !elements.fileNameDisplay || !elements.saveButton) {
            return false;
        }

        // Check if there are unsaved changes - if not, do nothing
        const hasUnsavedChanges = elements.editor.value !== state.lastSavedContent;
        if (!hasUnsavedChanges) {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'No changes to save';
            }
            return false;
        }

        setButtonLoading(elements.saveButton, true);

        try {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Saving...';
            }

            let filename = elements.fileNameDisplay.textContent.trim();
            const content = elements.editor.value;

            // Debug: log save info
            console.log('[mdedit] Saving - serverFilePath:', serverFilePath);

            // If we have a server file path, save directly to the original location
            if (serverFilePath) {
                try {
                    console.log('[mdedit] Attempting server save to:', serverFilePath);
                    await saveFileViaServer(content, serverFilePath);

                    state.lastSavedContent = content;
                    if (MarkdownEditor.stateManager) {
                        MarkdownEditor.stateManager.markDirty(false);
                    }
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent = `Saved ${filename}`;
                    }
                    if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
                        MarkdownEditor.autosave.scheduleAutosave();
                    }
                    return true;
                } catch (error) {
                    console.error('[mdedit] Server save failed:', error);
                    console.error('[mdedit] Error details:', error.message);
                    // Fall through to other save methods
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent =
                            'Server save failed, trying local save...';
                    }
                }
            }

            // Prompt for filename if it's untitled
            if (!filename || filename === 'Untitled.md') {
                const response = await dialogs.promptDialog(
                    'Enter a file name for your markdown document',
                    filename || 'Untitled.md',
                    'text',
                    'Save File'
                );
                if (response === null) {
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent = 'Save cancelled';
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
                        if (elements.autosaveStatus) {
                            elements.autosaveStatus.textContent = 'Save cancelled';
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
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Save failed';
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
     * Export to HTML
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
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Export failed';
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
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Export failed';
            }
            await dialogs.alertDialog(
                'An error occurred while exporting to plain text. Please try again.',
                'Export Error'
            );
        }
    };

    /**
     * Export to PDF
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
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Export failed';
            }
            await dialogs.alertDialog(
                'An error occurred while exporting to PDF. Please try again.',
                'Export Error'
            );
        }
    };

    /**
     * Handle export
     */
    const handleExport = async () => {
        const exportFormat = await dialogs.showExportDialog();

        if (!exportFormat) {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Export cancelled';
            }
            return;
        }

        try {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Exporting...';
            }

            switch (exportFormat) {
                case 'html':
                    await exportToHtml();
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent = 'Exported as HTML';
                    }
                    break;
                case 'pdf':
                    await exportToPdf();
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent = 'Opening PDF export...';
                    }
                    break;
                case 'txt':
                    await exportToPlainText();
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent = 'Exported as plain text';
                    }
                    break;
            }
        } catch (error) {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Export failed';
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
        loadFileFromUrlParam,
        readFile,
        saveFile,
        exportToHtml,
        exportToPlainText,
        exportToPdf,
        handleExport
    };

    window.MarkdownEditor = MarkdownEditor;
})();
