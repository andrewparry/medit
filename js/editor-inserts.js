/*
 * Markdown Editor - Inserts Module
 * Handles insertion of links, images, and tables
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, utils, dialogs, formatting } = MarkdownEditor;

    /**
     * Insert a link
     */
    const insertLink = async () => {
        console.log('insertLink function called');
        const { start, end, value } = utils.getSelection();
        const selectedText = value.slice(start, end);

        const result = await dialogs.multiPromptDialog([
            {
                label: 'Link text',
                defaultValue: selectedText || '',
                inputType: 'text',
                key: 'text',
                required: false
            },
            {
                label: 'Link URL (https://...)',
                defaultValue: 'https://',
                inputType: 'url',
                key: 'url',
                required: true
            }
        ], 'Insert Link');

        if (!result) {
            console.log('Link insertion cancelled');
            return;
        }

        const linkText = result.text || result.url;
        const url = result.url;

        if (!url) {
            console.log('Link insertion cancelled - no URL');
            return;
        }

        const linkSyntax = `[${linkText}](${url})`;
        console.log('Inserting link:', linkSyntax);
        formatting.replaceSelection(linkSyntax, linkSyntax.length);
    };

    /**
     * Insert an image
     */
    const insertImage = async () => {
        console.log('insertImage function called');

        const result = await dialogs.multiPromptDialog([
            {
                label: 'Image description (alt text)',
                defaultValue: 'Image description',
                inputType: 'text',
                key: 'alt',
                required: true
            },
            {
                label: 'Image URL (https://...)',
                defaultValue: 'https://',
                inputType: 'url',
                key: 'url',
                required: true
            }
        ], 'Insert Image');

        if (!result) {
            console.log('Image insertion cancelled');
            return;
        }

        const altText = result.alt || 'image';
        const url = result.url;

        if (!url) {
            console.log('Image insertion cancelled - no URL');
            return;
        }

        const imageSyntax = `![${altText}](${url})`;
        console.log('Inserting image:', imageSyntax);
        formatting.replaceSelection(imageSyntax, imageSyntax.length);
    };

    /**
     * Insert a horizontal rule (or remove it if cursor is on one - toggle behavior)
     */
    const insertHorizontalRule = () => {
        if (!elements.editor) return;

        const { start, end, value } = utils.getSelection();
        
        // Find the current line
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', start);
        const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
        const lineText = value.slice(lineStart, actualLineEnd);
        
        // Check if cursor is on a horizontal rule line (---, ***, or ___)
        const hrPattern = /^(\*\s*\*\s*\*[\s*]*|_\s*_\s*_[\s_]*|-\s*-\s*-[\s-]*)$/;
        if (hrPattern.test(lineText.trim())) {
            // TOGGLE OFF: Remove the horizontal rule line
            const before = value.slice(0, lineStart);
            const after = value.slice(actualLineEnd);
            
            // Remove the line and any extra blank lines around it
            let newBefore = before;
            let newAfter = after;
            
            // Remove trailing newline from before if it ends with double newline
            if (newBefore.endsWith('\n\n')) {
                newBefore = newBefore.slice(0, -1);
            }
            
            // Remove leading newline from after if present
            if (newAfter.startsWith('\n')) {
                newAfter = newAfter.slice(1);
            }
            
            elements.editor.value = newBefore + newAfter;
            
            // Position cursor where the HR was
            const newCursorPos = newBefore.length;
            elements.editor.setSelectionRange(newCursorPos, newCursorPos);
            elements.editor.focus({ preventScroll: true });
            
            // Trigger updates
            if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
                MarkdownEditor.preview.updatePreview();
            }
            if (utils.updateCounters) {
                utils.updateCounters();
            }
            if (MarkdownEditor.stateManager) {
                MarkdownEditor.stateManager.markDirty(elements.editor.value !== MarkdownEditor.state.lastSavedContent);
            }
            if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
                MarkdownEditor.autosave.scheduleAutosave();
            }
            if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
                MarkdownEditor.formatting.updateToolbarStates();
            }
            if (MarkdownEditor.history && MarkdownEditor.history.pushHistory) {
                MarkdownEditor.history.pushHistory();
            }
            
            return;
        }
        
        // TOGGLE ON: Insert horizontal rule
        const before = value.slice(0, start);
        const after = value.slice(end);

        // Add proper spacing: blank line before and after if not at document edges
        const leading = start > 0 && !before.endsWith('\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
        const trailing = after.length > 0 && !after.startsWith('\n') ? '\n\n' : (after.startsWith('\n') && !after.startsWith('\n\n') ? '\n' : '');

        const hr = '---';
        const inserted = `${leading}${hr}${trailing}`;

        // Place cursor after the horizontal rule
        formatting.replaceSelection(inserted, inserted.length - trailing.length);
    };

    /**
     * Insert a table
     */
    const insertTable = async () => {
        if (!elements.editor || !elements.autosaveStatus) return;
        
        const { start, end, value } = utils.getSelection();
        const before = value.slice(0, start);
        const after = value.slice(end);

        // Prevent inserting inside fenced code block
        const backticksBefore = (before.match(/```/g) || []).length;
        const isInsideCodeBlock = backticksBefore % 2 !== 0;
        if (isInsideCodeBlock) {
            elements.autosaveStatus.textContent = 'Cannot insert table inside code block';
            await dialogs.alertDialog('Tables cannot be inserted inside code blocks.', 'Insert Table');
            return;
        }

        // Ask user for rows/cols and header row
        const result = await dialogs.multiPromptDialog([
            { label: 'Columns (1-12)', defaultValue: '2', inputType: 'number', key: 'cols', required: true },
            { label: 'Rows (1-50)', defaultValue: '2', inputType: 'number', key: 'rows', required: true },
            { label: 'Include header row? (yes/no)', defaultValue: 'yes', inputType: 'text', key: 'header', required: true }
        ], 'Insert Table');

        if (!result) {
            return;
        }

        const toInt = (s, def) => {
            const n = parseInt(String(s).trim(), 10);
            return Number.isFinite(n) ? n : def;
        };

        let cols = Math.max(1, Math.min(12, toInt(result.cols, 2)));
        let rows = Math.max(1, Math.min(50, toInt(result.rows, 2)));
        const headerYes = String(result.header || 'yes').trim().toLowerCase();
        const includeHeader = headerYes === 'y' || headerYes === 'yes' || headerYes === 'true' || headerYes === '1';

        // Build table
        const headerCells = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(' | ');
        const separator = Array.from({ length: cols }, () => '---').join(' | ');
        const bodyRowsCount = includeHeader ? Math.max(1, rows) : rows;

        const bodyRows = [];
        for (let r = 0; r < bodyRowsCount; r += 1) {
            const cells = Array.from({ length: cols }, (_, c) => `Cell ${r + 1}-${c + 1}`).join(' | ');
            bodyRows.push(`| ${cells} |`);
        }

        const lines = [];
        if (includeHeader) {
            lines.push(`| ${headerCells} |`);
            lines.push(`| ${separator} |`);
        } else {
            const firstRow = Array.from({ length: cols }, (_, c) => `Cell 1-${c + 1}`).join(' | ');
            lines.push(`| ${firstRow} |`);
            lines.push(`| ${separator} |`);
            bodyRows.shift();
        }
        lines.push(...bodyRows);

        const table = lines.join('\n');
        const leading = start > 0 && !before.endsWith('\n') ? '\n\n' : '';
        const trailing = after.startsWith('\n') || after.length === 0 ? '' : '\n\n';
        const inserted = `${leading}${table}${trailing}`;

        // Place caret on the first editable header/data cell text
        const placeholder = includeHeader ? 'Header 1' : 'Cell 1-1';
        const placeholderIndex = inserted.indexOf(placeholder);
        if (placeholderIndex >= 0) {
            formatting.replaceSelection(inserted, {
                start: placeholderIndex,
                end: placeholderIndex + placeholder.length
            });
        } else {
            formatting.replaceSelection(inserted, inserted.length - trailing.length);
        }
    };

    // Expose public API
    MarkdownEditor.inserts = {
        insertLink,
        insertImage,
        insertTable,
        insertHorizontalRule
    };

    window.MarkdownEditor = MarkdownEditor;
})();

