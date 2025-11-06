/*
 * Markdown Editor - Preview Module
 * Manages preview rendering and toggle functionality
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, state } = MarkdownEditor;

    /**
     * Toggle checkbox in markdown source based on line number
     */
    const toggleCheckboxByLine = (lineNumber) => {
        if (!elements.editor || !MarkdownEditor.formatting) {
            return;
        }

        const value = elements.editor.value;
        const lines = value.split('\n');
        const lineIndex = lineNumber - 1; // Convert to 0-based index

        if (lineIndex < 0 || lineIndex >= lines.length) {
            return;
        }

        const line = lines[lineIndex];
        const checkboxMatch = line.match(/^(\s*)([-*+])\s+\[([xX ])\]\s+(.*)$/);

        if (checkboxMatch) {
            // Calculate cursor position at the start of this line
            let cursorPos = 0;
            for (let i = 0; i < lineIndex; i++) {
                cursorPos += lines[i].length + 1; // +1 for newline
            }

            // Set cursor to this line
            elements.editor.setSelectionRange(cursorPos, cursorPos);
            elements.editor.focus();

            // Toggle the checkbox
            MarkdownEditor.formatting.toggleCheckboxAtCursor();
        }
    };

    /**
     * Update preview with current markdown content
     */
    const updatePreview = () => {
        if (!elements.editor || !elements.preview) {
            return;
        }

        const markdown = elements.editor.value;
        const renderHtml = state.renderHtml || false;
        const rawHtml = window.markedLite.parse(markdown, { renderHtml });
        const safeHtml = window.simpleSanitizer.sanitize(rawHtml);
        elements.preview.innerHTML =
            safeHtml ||
            '<p class="preview-placeholder">Start typing to see your formatted preview.</p>';

        // Make checkboxes clickable
        const checkboxes = elements.preview.querySelectorAll('input.task-checkbox');
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('click', (event) => {
                event.preventDefault();
                const lineNumber = parseInt(checkbox.getAttribute('data-line'), 10);
                if (lineNumber) {
                    toggleCheckboxByLine(lineNumber);
                }
            });
        });

        // Apply Prism.js syntax highlighting to code blocks in preview
        setTimeout(() => {
            if (window.Prism) {
                const codeBlocks = elements.preview.querySelectorAll(
                    'pre code[class*="language-"]'
                );
                codeBlocks.forEach((block) => {
                    try {
                        if (
                            !block.classList.contains('language-none') &&
                            !block.parentElement.classList.contains('prism-loaded')
                        ) {
                            window.Prism.highlightElement(block);
                            block.parentElement.classList.add('prism-loaded');
                        }
                    } catch (error) {
                        console.warn('Prism highlighting failed for code block:', error);
                    }
                });
            }
        }, 0);
    };

    /**
     * Toggle preview visibility
     */
    const togglePreview = () => {
        if (!elements.togglePreviewButton || !elements.editorContainer) {
            return;
        }

        state.isPreviewVisible = !state.isPreviewVisible;
        elements.togglePreviewButton.setAttribute('aria-pressed', state.isPreviewVisible);
        elements.editorContainer.classList.toggle('preview-hidden', !state.isPreviewVisible);

        // Hide/show resize handle based on preview visibility
        if (elements.resizeHandle) {
            if (state.isPreviewVisible) {
                elements.resizeHandle.style.display = '';
            } else {
                elements.resizeHandle.style.display = 'none';
                // Reset editor pane to full width when preview is hidden
                if (elements.editorPane) {
                    elements.editorPane.style.flex = '1 1 100%';
                }
            }
        }

        elements.togglePreviewButton.title = state.isPreviewVisible
            ? 'Hide preview (Ctrl+Shift+P)'
            : 'Show preview (Ctrl+Shift+P)';

        // Persist preview state
        if (window.localStorage) {
            try {
                localStorage.setItem(
                    'markdown-editor-preview',
                    state.isPreviewVisible ? 'visible' : 'hidden'
                );
            } catch (error) {
                console.error('Failed to persist preview state', error);
            }
        }

        // Trigger resize to update wrapping
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 10);
    };

    /**
     * Initialize preview state from localStorage
     */
    const initializePreviewState = () => {
        if (window.localStorage) {
            const storedPreview = localStorage.getItem('markdown-editor-preview');
            if (storedPreview === 'hidden') {
                state.isPreviewVisible = false;
                if (elements.togglePreviewButton) {
                    elements.togglePreviewButton.setAttribute('aria-pressed', 'false');
                }
                if (elements.editorContainer) {
                    elements.editorContainer.classList.add('preview-hidden');
                }
                if (elements.togglePreviewButton) {
                    elements.togglePreviewButton.title = 'Show preview (Ctrl+Shift+P)';
                }
                if (elements.resizeHandle) {
                    elements.resizeHandle.style.display = 'none';
                }
            }
        }
    };

    // Expose public API
    MarkdownEditor.preview = {
        updatePreview,
        togglePreview,
        initializePreviewState
    };

    window.MarkdownEditor = MarkdownEditor;
})();
