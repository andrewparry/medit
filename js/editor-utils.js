/*
 * Markdown Editor - Utils Module
 * Provides text processing and utility functions
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements } = MarkdownEditor;

    /**
     * Normalize whitespace in text by collapsing multiple spaces into single spaces
     * Useful for word counting and text processing
     *
     * @param {string} text - Text to normalize
     * @returns {string} Text with normalized whitespace (single spaces, trimmed)
     *
     * @example
     * normalizeWhitespace("hello  world\n\nthere") // "hello world there"
     */
    const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();

    /**
     * Strip markdown formatting from text to get plain text content
     * Removes all markdown syntax including code blocks, links, formatting, headers, etc.
     * Used primarily for word counting and character counting
     *
     * @param {string} markdown - Markdown text to strip
     * @returns {string} Plain text with all markdown syntax removed
     *
     * @example
     * stripMarkdown("# Hello **world**") // "Hello world"
     * stripMarkdown("[link](url)") // "link"
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
     * Update word and character counter displays in the UI
     * Strips markdown formatting and counts words/characters in plain text
     * Updates the wordCountDisplay and charCountDisplay elements
     *
     * @returns {void}
     *
     * @example
     * // Called after editor content changes
     * updateCounters(); // Updates "150 words / 892 characters"
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
     * Calculate character offsets for each line in a multi-line text
     * Returns an array where each index corresponds to the starting character position of that line
     * Used for cursor position calculations during formatting operations
     *
     * @param {Array<string>} lines - Array of text lines (from text.split('\n'))
     * @returns {Array<number>} Array of character offsets for each line start position
     *
     * @example
     * getLineOffsets(["hello", "world"]) // [0, 6] (line 0 at pos 0, line 1 at pos 6)
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
     * Get current selection information from the editor textarea
     * Returns selection start/end positions and the full editor value
     *
     * @returns {{start: number, end: number, value: string}} Selection object with:
     *   - start: Selection start position (character index)
     *   - end: Selection end position (character index)
     *   - value: Full editor content
     *
     * @example
     * const {start, end, value} = getSelection();
     * const selectedText = value.slice(start, end);
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
     * Set selection range in editor while preserving scroll position
     * Focuses the editor and sets the selection, then restores scroll position
     * Uses requestAnimationFrame to ensure scroll position is maintained across browser reflows
     *
     * @param {number} start - Selection start position (character index)
     * @param {number} end - Selection end position (character index)
     * @returns {void}
     *
     * @example
     * setSelection(0, 5); // Select first 5 characters
     * setSelection(10, 10); // Place cursor at position 10
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
     * Enable inline editing of the filename display
     * Makes the filename contentEditable, focuses it, and selects all text
     * Stores the original name for potential cancellation
     *
     * @returns {void}
     *
     * @example
     * // User clicks on filename display
     * handleFilenameEdit(); // Filename becomes editable
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
     * Finalize filename editing and save the new name
     * Trims whitespace, ensures filename is not empty (defaults to "Untitled.md")
     * Disables contentEditable and triggers autosave
     * Called on blur or when user presses Enter
     *
     * @returns {void}
     *
     * @example
     * // User finishes editing filename
     * finalizeFilename(); // Saves and locks filename
     */
    const finalizeFilename = () => {
        if (!elements.fileNameDisplay) {
            return;
        }

        elements.fileNameDisplay.textContent =
            elements.fileNameDisplay.textContent.trim() || 'Untitled.md';
        elements.fileNameDisplay.contentEditable = 'false';
        delete elements.fileNameDisplay.dataset.originalName;

        // Update browser tab title
        updateDocumentTitle();

        // Trigger autosave if available
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
    };

    /**
     * Escape HTML special characters to prevent XSS and ensure proper display
     * Converts &, <, and > to their HTML entity equivalents
     *
     * @param {string} s - String to escape
     * @returns {string} HTML-safe string with special characters escaped
     *
     * @example
     * escapeHtml("<script>alert('xss')</script>") // "&lt;script&gt;alert('xss')&lt;/script&gt;"
     */
    const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /**
     * Check if a string is a valid URL
     * Supports URLs with protocols (http://, https://, ftp://, etc.)
     * Also supports URLs without protocol (www.example.com, example.com)
     * Validates localhost and IP addresses
     *
     * @param {string} text - Text to validate as URL
     * @returns {boolean} True if text is a valid URL, false otherwise
     *
     * @example
     * isValidUrl("https://example.com") // true
     * isValidUrl("www.example.com") // true
     * isValidUrl("example.com") // true
     * isValidUrl("not a url") // false
     * isValidUrl("localhost:3000") // true
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

    /**
     * Update the browser tab title based on the current filename
     * Shows "Markdown Editor" for untitled documents
     * Shows just the filename for named documents
     *
     * @returns {void}
     *
     * @example
     * updateDocumentTitle(); // Updates tab to "my-doc.md"
     */
    const updateDocumentTitle = () => {
        if (!elements.fileNameDisplay) {
            return;
        }

        const filename = elements.fileNameDisplay.textContent.trim();

        // Show just "Markdown Editor" for untitled documents
        if (!filename || filename === 'Untitled.md') {
            document.title = 'Markdown Editor';
        } else {
            // Show just the filename for named documents
            document.title = filename;
        }
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
        isValidUrl,
        updateDocumentTitle
    };

    window.MarkdownEditor = MarkdownEditor;
})();
