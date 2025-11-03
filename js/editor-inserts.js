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
        insertTable
    };

    window.MarkdownEditor = MarkdownEditor;
})();

