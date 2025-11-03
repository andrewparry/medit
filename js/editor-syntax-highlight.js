/*
 * Markdown Editor - Syntax Highlight Module
 * Manages syntax highlighting in the editor overlay
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, utils } = MarkdownEditor;

    /**
     * Apply syntax highlighting to code blocks in editor overlay
     */
    const updateSyntaxHighlights = () => {
        if (!elements.editorHighlights || !window.Prism) {
            if (elements.editorHighlights && !window.Prism) {
                // Prism not loaded yet, just show escaped text
                elements.editorHighlights.innerHTML = utils.escapeHtml(elements.editor.value || '');
                elements.editorHighlights.scrollTop = elements.editor.scrollTop;
            }
            return;
        }
        
        const text = elements.editor.value || '';
        if (!text) {
            elements.editorHighlights.innerHTML = '';
            return;
        }

        // Parse code blocks: find all ```...``` patterns (non-greedy)
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
                // Extract language from first line
                const firstLine = lines[0];
                const languageMatch = firstLine.match(/^```\s*(\w+)/);
                const language = languageMatch ? languageMatch[1].toLowerCase() : '';
                
                // Extract code content
                const codeContent = lines.slice(1, -1).join('\n');
                
                // Highlight code with Prism if language is specified and supported
                let highlightedCode = utils.escapeHtml(codeContent);
                if (language && window.Prism) {
                    if (window.Prism.languages[language]) {
                        try {
                            highlightedCode = window.Prism.highlight(codeContent, window.Prism.languages[language], language);
                        } catch (error) {
                            highlightedCode = utils.escapeHtml(codeContent);
                        }
                    } else {
                        highlightedCode = utils.escapeHtml(codeContent);
                    }
                }
                
                // Reconstruct code block preserving line structure
                const openingFence = utils.escapeHtml(firstLine);
                const closingFence = utils.escapeHtml('```');
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
                html += part.openingFence + '\n' + part.highlightedCode + '\n' + part.closingFence;
            } else {
                html += utils.escapeHtml(part.content);
            }
        });

        elements.editorHighlights.innerHTML = html;
        
        // Keep scroll in sync
        elements.editorHighlights.scrollTop = elements.editor.scrollTop;
    };

    /**
     * Update raw highlights (for find/replace or syntax highlighting)
     */
    const updateRawHighlights = () => {
        if (!elements.editorHighlights) return;
        
        // Check if find bar is active
        if (!elements.findBar || elements.findBar.hidden) {
            // Show syntax highlighting when find bar is hidden
            updateSyntaxHighlights();
            return;
        }
        
        // If find bar is active, delegate to find/replace module
        if (MarkdownEditor.findReplace && MarkdownEditor.findReplace.updateRawHighlightsForFind) {
            MarkdownEditor.findReplace.updateRawHighlightsForFind();
        }
    };

    /**
     * Initialize scroll synchronization between editor and highlights
     */
    const initScrollSync = () => {
        if (elements.editor && elements.editorHighlights) {
            elements.editor.addEventListener('scroll', () => {
                elements.editorHighlights.scrollTop = elements.editor.scrollTop;
                elements.editorHighlights.scrollLeft = elements.editor.scrollLeft;
            });
        }
    };

    // Expose public API
    MarkdownEditor.syntaxHighlight = {
        updateSyntaxHighlights,
        updateRawHighlights,
        initScrollSync
    };

    window.MarkdownEditor = MarkdownEditor;
})();

