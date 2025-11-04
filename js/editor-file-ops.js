/*
 * Markdown Editor - File Operations Module
 * Handles new document, open, save, and export functionality
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, state, utils, dialogs, history } = MarkdownEditor;

    /**
     * Set button loading state
     */
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

    /**
     * Reset editor state
     */
    const resetEditorState = () => {
        if (!elements.editor) return;
        
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
        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = null;
        state.lastSavedContent = '';
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = 'Ready';
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.clearAutosaveDraft) {
            MarkdownEditor.autosave.clearAutosaveDraft();
        }
        utils.setSelection(0, 0);
        
        // Close and clear find/replace UI
        if (elements.findBar) {
            elements.findBar.hidden = true;
        }
        if (elements.findInput) elements.findInput.value = '';
        if (elements.replaceInput) elements.replaceInput.value = '';
        if (elements.findCount) elements.findCount.textContent = '0/0';
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.resetSearchState();
        }
        if (elements.editorHighlights) elements.editorHighlights.innerHTML = '';
        if (elements.toggleFindButton) {
            elements.toggleFindButton.setAttribute('aria-pressed', 'false');
            elements.toggleFindButton.classList.remove('active');
        }
    };

    /**
     * Handle new document
     */
    const handleNewDocument = async () => {
        const hasUnsavedChanges = state.dirty && elements.editor && elements.editor.value !== state.lastSavedContent;

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
        elements.fileInput.click();
    };

    /**
     * Read file
     */
    const readFile = async (file) => {
        setButtonLoading(elements.openButton, false);
        
        if (!/\.(md|markdown)$/i.test(file.name)) {
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Only Markdown files can be opened';
            }
            await dialogs.alertDialog('Please choose a Markdown (.md or .markdown) file.', 'Invalid File Type');
            return;
        }

        setButtonLoading(elements.openButton, true);
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = 'Opening file...';
        }

        const reader = new FileReader();
        reader.onload = () => {
            elements.editor.value = reader.result;
            if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
                MarkdownEditor.preview.updatePreview();
            }
            if (utils.updateCounters) {
                utils.updateCounters();
            }
            if (elements.fileNameDisplay) {
                elements.fileNameDisplay.textContent = file.name;
            }
            state.lastSavedContent = elements.editor.value;
            if (MarkdownEditor.stateManager) {
                MarkdownEditor.stateManager.markDirty(false);
            }
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = `Opened ${file.name}`;
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
            if (elements.findBar) elements.findBar.hidden = true;
            if (elements.findInput) elements.findInput.value = '';
            if (elements.replaceInput) elements.replaceInput.value = '';
            if (elements.findCount) elements.findCount.textContent = '0/0';
            if (MarkdownEditor.stateManager) {
                MarkdownEditor.stateManager.resetSearchState();
            }
            if (elements.editorHighlights) elements.editorHighlights.innerHTML = '';
            if (elements.toggleFindButton) {
                elements.toggleFindButton.setAttribute('aria-pressed', 'false');
                elements.toggleFindButton.classList.remove('active');
            }
            setButtonLoading(elements.openButton, false);
        };
        reader.onerror = async () => {
            console.error('Failed to read file', reader.error);
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Unable to open file';
            }
            setButtonLoading(elements.openButton, false);
            await dialogs.alertDialog('Unable to open the selected file.', 'Error Opening File');
        };
        reader.readAsText(file);
    };

    /**
     * Save file
     */
    const saveFile = async () => {
        if (!elements.editor || !elements.fileNameDisplay || !elements.saveButton) return false;
        
        setButtonLoading(elements.saveButton, true);
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = 'Saving...';
        }

        let filename = elements.fileNameDisplay.textContent.trim();

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
                setButtonLoading(elements.saveButton, false);
                return false;
            }
            filename = response.trim() || 'Untitled.md';
        }

        try {
            const normalizedName = filename.endsWith('.md') ? filename : `${filename}.md`;
            elements.fileNameDisplay.textContent = normalizedName;
            elements.fileNameDisplay.contentEditable = 'false';
            delete elements.fileNameDisplay.dataset.originalName;

            const blob = new Blob([elements.editor.value], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = normalizedName;
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                setButtonLoading(elements.saveButton, false);
            }, 100);
            
            state.lastSavedContent = elements.editor.value;
            if (MarkdownEditor.stateManager) {
                MarkdownEditor.stateManager.markDirty(false);
            }
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = `Saved ${link.download}`;
            }
            if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
                MarkdownEditor.autosave.scheduleAutosave();
            }
            return true;
        } catch (error) {
            console.error('Save failed', error);
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Save failed';
            }
            setButtonLoading(elements.saveButton, false);
            return false;
        }
    };

    /**
     * Export to HTML
     */
    const exportToHtml = async () => {
        if (!elements.editor || !elements.fileNameDisplay) return;
        
        const filename = elements.fileNameDisplay.textContent.trim().replace(/\.md$/, '');
        const htmlFilename = filename.endsWith('.html') ? filename : `${filename}.html`;

        const renderHtml = state && state.renderHtml || false;
        const rawHtml = window.markedLite.parse(elements.editor.value, { renderHtml });
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
    };

    /**
     * Export to plain text
     */
    const exportToPlainText = async () => {
        if (!elements.editor || !elements.fileNameDisplay) return;
        
        const filename = elements.fileNameDisplay.textContent.trim().replace(/\.md$/, '');
        const txtFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;

        const blob = new Blob([elements.editor.value], { type: 'text/plain' });
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
     * Export to PDF
     */
    const exportToPdf = () => {
        if (!elements.editor) return;
        
        const renderHtml = state && state.renderHtml || false;
        const rawHtml = window.markedLite.parse(elements.editor.value, { renderHtml });
        const safeHtml = window.simpleSanitizer.sanitize(rawHtml);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            dialogs.alertDialog('Please allow pop-ups to export as PDF.', 'PDF Export');
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

        setTimeout(() => {
            printWindow.print();
            setTimeout(() => {
                printWindow.close();
            }, 1000);
        }, 250);
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
                    exportToPdf();
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
            console.error('Export failed', error);
            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Export failed';
            }
            await dialogs.alertDialog('An error occurred while exporting the document.', 'Export Error');
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

