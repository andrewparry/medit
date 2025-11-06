/*
 * Markdown Editor - Utils Module
 * Provides text processing and utility functions
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements } = MarkdownEditor;

    /**
     * Normalize whitespace in text
     */
    const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();

    /**
     * Strip markdown formatting from text
     */
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

    /**
     * Update word and character counters
     */
    const updateCounters = () => {
        if (!elements.editor) {
            return;
        }

        const content = elements.editor.value || '';
        const plain = stripMarkdown(content);
        const normalized = normalizeWhitespace(plain);
        const words = normalized ? normalized.split(' ').filter((w) => w.length > 0).length : 0;
        const characters = plain.length;

        if (elements.wordCountDisplay) {
            elements.wordCountDisplay.textContent = `${words} ${words === 1 ? 'word' : 'words'} / ${characters} ${characters === 1 ? 'character' : 'characters'}`;
        }
        if (elements.charCountDisplay) {
            elements.charCountDisplay.textContent = `${characters} ${characters === 1 ? 'character' : 'characters'}`;
        }
    };

    /**
     * Get line offsets for multi-line operations
     */
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

    /**
     * Get current selection from editor
     */
    const getSelection = () => {
        if (!elements.editor) {
            return { start: 0, end: 0, value: '' };
        }
        return {
            start: elements.editor.selectionStart,
            end: elements.editor.selectionEnd,
            value: elements.editor.value
        };
    };

    /**
     * Set selection range in editor
     */
    const setSelection = (start, end) => {
        if (!elements.editor) {
            return;
        }

        // Preserve scroll position to prevent document shifting
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;

        // Set selection
        elements.editor.focus();
        elements.editor.setSelectionRange(start, end);

        // Immediately restore scroll position
        elements.editor.scrollTop = scrollTop;
        elements.editor.scrollLeft = scrollLeft;

        // Ensure scroll stays in place after browser processing
        requestAnimationFrame(() => {
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            // Double-check in next frame for Firefox
            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;
            });
        });
    };

    /**
     * Handle filename editing
     */
    const handleFilenameEdit = () => {
        if (!elements.fileNameDisplay) {
            return;
        }

        elements.fileNameDisplay.contentEditable = 'true';
        elements.fileNameDisplay.dataset.originalName = elements.fileNameDisplay.textContent.trim();
        elements.fileNameDisplay.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(elements.fileNameDisplay);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    /**
     * Finalize filename editing
     */
    const finalizeFilename = () => {
        if (!elements.fileNameDisplay) {
            return;
        }

        elements.fileNameDisplay.textContent =
            elements.fileNameDisplay.textContent.trim() || 'Untitled.md';
        elements.fileNameDisplay.contentEditable = 'false';
        delete elements.fileNameDisplay.dataset.originalName;

        // Trigger autosave if available
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
    };

    /**
     * Escape HTML special characters
     */
    const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /**
     * Check if a string is a valid URL
     * Supports http://, https://, ftp://, and common protocols
     * Also supports URLs without protocol (e.g., www.example.com, example.com)
     */
    const isValidUrl = (text) => {
        if (!text || typeof text !== 'string') {
            return false;
        }

        // Trim whitespace
        const trimmed = text.trim();
        if (!trimmed) {
            return false;
        }

        // Check if it contains whitespace (URLs shouldn't have spaces)
        if (/\s/.test(trimmed)) {
            return false;
        }

        // Pattern for URLs with protocol (http://, https://, ftp://, etc.)
        const protocolPattern = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

        // Pattern for URLs without protocol but with domain
        const domainPattern =
            /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;

        // Pattern for URLs starting with www.
        const wwwPattern =
            /^www\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(\/.*)?$/;

        // Pattern for localhost or IP addresses
        const localhostPattern = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/;

        // Check if it matches any URL pattern
        if (protocolPattern.test(trimmed)) {
            try {
                // Try to construct a URL object to validate
                new URL(trimmed);
                return true;
            } catch (e) {
                return false;
            }
        }

        // Check domain patterns (without protocol)
        if (
            domainPattern.test(trimmed) ||
            wwwPattern.test(trimmed) ||
            localhostPattern.test(trimmed)
        ) {
            // Try to construct URL with https:// prefix
            try {
                new URL(`https://${trimmed}`);
                return true;
            } catch (e) {
                return false;
            }
        }

        return false;
    };

    // Expose public API
    MarkdownEditor.utils = {
        normalizeWhitespace,
        stripMarkdown,
        updateCounters,
        getLineOffsets,
        getSelection,
        setSelection,
        handleFilenameEdit,
        finalizeFilename,
        escapeHtml,
        isValidUrl
    };

    window.MarkdownEditor = MarkdownEditor;
})();
