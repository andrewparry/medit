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

            // Add copy buttons to all code blocks in preview
            const allPreBlocks = elements.preview.querySelectorAll('pre');
            allPreBlocks.forEach((preBlock) => {
                // Skip if copy button already exists
                if (preBlock.querySelector('.code-copy-btn')) {
                    return;
                }

                const copyButton = document.createElement('button');
                copyButton.className = 'code-copy-btn';
                copyButton.setAttribute('aria-label', 'Copy code to clipboard');
                copyButton.innerHTML =
                    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10.5V3.5C3 2.67157 3.67157 2 4.5 2H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

                copyButton.addEventListener('click', async () => {
                    const codeElement = preBlock.querySelector('code');
                    const codeText = codeElement ? codeElement.textContent : preBlock.textContent;

                    try {
                        await navigator.clipboard.writeText(codeText);
                        copyButton.innerHTML =
                            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                        copyButton.classList.add('copied');

                        setTimeout(() => {
                            copyButton.innerHTML =
                                '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10.5V3.5C3 2.67157 3.67157 2 4.5 2H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
                            copyButton.classList.remove('copied');
                        }, 2000);
                    } catch (error) {
                        console.warn('Failed to copy code to clipboard:', error);
                        copyButton.innerHTML =
                            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
                        setTimeout(() => {
                            copyButton.innerHTML =
                                '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 10.5V3.5C3 2.67157 3.67157 2 4.5 2H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
                        }, 2000);
                    }
                });

                preBlock.appendChild(copyButton);
            });
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
