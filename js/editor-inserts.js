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
        if (!elements.editor) {
            return;
        }

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
     * Insert a footnote (or remove if cursor is on a footnote reference)
     */
    const insertFootnote = async () => {
        if (!elements.editor) {
            return;
        }

        // ✅ CRITICAL: Capture scroll and focus state BEFORE any operations
        const scrollTop = elements.editor.scrollTop;
        const scrollLeft = elements.editor.scrollLeft;
        const hadFocus = document.activeElement === elements.editor;

        const { start, end, value } = utils.getSelection();

        // Check if cursor is on a footnote reference [^identifier]
        const footnotePattern = /\[\^([^\]]+)\]/g;
        const footnoteMatches = Array.from(value.matchAll(footnotePattern));

        let footnoteToRemove = null;
        for (const match of footnoteMatches) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;

            // Check if cursor or selection is within or touches the footnote reference
            if ((start >= matchStart && start <= matchEnd) ||
                (end >= matchStart && end <= matchEnd) ||
                (start <= matchStart && end >= matchEnd)) {
                footnoteToRemove = {
                    identifier: match[1],
                    matchStart: matchStart,
                    matchEnd: matchEnd,
                    fullMatch: match[0]
                };
                break;
            }
        }

        // TOGGLE OFF: Remove footnote reference and definition (if no other references exist)
        if (footnoteToRemove) {
            const identifier = footnoteToRemove.identifier;

            // Remove the reference
            const before = value.slice(0, footnoteToRemove.matchStart);
            const after = value.slice(footnoteToRemove.matchEnd);
            let newValue = before + after;

            // Check if there are any other references to this footnote
            const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const refPattern = new RegExp(`\\[\\^${escapedIdentifier}\\]`, 'g');
            const remainingRefs = newValue.match(refPattern);

            // Only remove definition if no other references exist
            if (!remainingRefs || remainingRefs.length === 0) {
                // Find and remove the definition: [^identifier]: text
                // Search line by line for more reliable matching
                const lines = newValue.split('\n');
                let defLineIndex = -1;

                // Find the definition line
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Match definition pattern: [^identifier]: text (with optional leading whitespace)
                    const defMatch = line.match(/^\s*\[\^([^\]]+)\]:\s*(.*)$/);
                    if (defMatch && defMatch[1] === identifier) {
                        defLineIndex = i;
                        break;
                    }
                }

                if (defLineIndex >= 0) {
                    // Remove the definition line
                    lines.splice(defLineIndex, 1);

                    // Clean up extra blank lines that might have been around the definition
                    // Remove blank line after definition if present
                    if (defLineIndex < lines.length && lines[defLineIndex].trim() === '') {
                        lines.splice(defLineIndex, 1);
                    }
                    // Remove blank line before definition if present (and we're not at start)
                    if (defLineIndex > 0 && lines[defLineIndex - 1].trim() === '') {
                        lines.splice(defLineIndex - 1, 1);
                    }

                    newValue = lines.join('\n');
                }
            }

            // Update editor
            elements.editor.value = newValue;

            // Calculate new cursor position (after removed reference)
            const newCursorPos = Math.min(footnoteToRemove.matchStart, newValue.length);
            elements.editor.setSelectionRange(newCursorPos, newCursorPos);

            // ✅ IMMEDIATE scroll lock #1 (after content change)
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            // ✅ CRITICAL: Only focus if not already focused, and prevent scroll
            if (!hadFocus) {
                elements.editor.focus({ preventScroll: true });
            }

            // ✅ IMMEDIATE scroll lock #2 (after setSelectionRange)
            elements.editor.scrollTop = scrollTop;
            elements.editor.scrollLeft = scrollLeft;

            // ✅ TRIPLE RAF for maximum browser compatibility
            requestAnimationFrame(() => {
                elements.editor.scrollTop = scrollTop;
                elements.editor.scrollLeft = scrollLeft;

                requestAnimationFrame(() => {
                    elements.editor.scrollTop = scrollTop;
                    elements.editor.scrollLeft = scrollLeft;

                    requestAnimationFrame(() => {
                        elements.editor.scrollTop = scrollTop;
                        elements.editor.scrollLeft = scrollLeft;
                    });
                });
            });

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

        // TOGGLE ON: Insert new footnote
        const selectedText = value.slice(start, end);

        // Prompt for footnote identifier and text
        const result = await dialogs.multiPromptDialog([
            {
                label: 'Footnote identifier (e.g., 1, note1, etc.)',
                defaultValue: selectedText || '1',
                inputType: 'text',
                key: 'identifier',
                required: true
            },
            {
                label: 'Footnote text',
                defaultValue: '',
                inputType: 'text',
                key: 'text',
                required: true
            }
        ], 'Insert Footnote');

        if (!result) {
            return;
        }

        const identifier = result.identifier.trim();
        const footnoteText = result.text.trim();

        if (!identifier) {
            await dialogs.alertDialog('Footnote identifier cannot be empty.', 'Insert Footnote');
            return;
        }

        if (!footnoteText) {
            await dialogs.alertDialog('Footnote text cannot be empty.', 'Insert Footnote');
            return;
        }

        // Insert footnote reference at cursor
        const footnoteRef = `[^${identifier}]`;

        // Check if footnote definition already exists
        const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const footnoteDefPattern = new RegExp(`^\\[\\^${escapedIdentifier}\\]:\\s*`, 'm');
        const hasDefinition = footnoteDefPattern.test(value);

        // Insert reference
        formatting.replaceSelection(footnoteRef, footnoteRef.length);

        // If definition doesn't exist, add it at the end of the document
        if (!hasDefinition) {
            // Wait a bit for the reference to be inserted
            setTimeout(() => {
                const currentValue = elements.editor.value;
                const footnoteDef = `\n\n[^${identifier}]: ${footnoteText}`;
                const newValue = currentValue + footnoteDef;
                elements.editor.value = newValue;

                // Position cursor back at the reference location
                const refPos = start + footnoteRef.length;
                elements.editor.setSelectionRange(refPos, refPos);
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
            }, 0);
        } else {
            // Definition exists, just update preview
            if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
                MarkdownEditor.preview.updatePreview();
            }
        }
    };

    /**
     * Insert a table
     */
    const insertTable = async () => {
        if (!elements.editor || !elements.autosaveStatus) {
            return;
        }

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

        const cols = Math.max(1, Math.min(12, toInt(result.cols, 2)));
        const rows = Math.max(1, Math.min(50, toInt(result.rows, 2)));
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
        insertHorizontalRule,
        insertFootnote
    };

    window.MarkdownEditor = MarkdownEditor;
})();

