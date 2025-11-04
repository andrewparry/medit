/*
 * Lightweight Markdown parser.
 * Provides a minimal subset of marked.js so the editor works offline.
 */
(function (global) {
    const ALLOWED_HEADINGS = 6;

    const escapeHtml = (value) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const escapeAttribute = (value) => escapeHtml(value).replace(/\(/g, '&#40;').replace(/\)/g, '&#41;');

    const parseInline = (input, footnoteRefs = null) => {
        const codeSegments = [];

        // Temporarily replace inline code so subsequent replacements ignore their content.
        let result = input.replace(/`([^`]+)`/g, (_, code) => {
            const index = codeSegments.push(code) - 1;
            return `§§CODE${index}§§`;
        });

        // Temporarily replace footnote references so they don't interfere with link parsing
        const footnotePlaceholders = [];
        if (footnoteRefs !== null) {
            result = result.replace(/\[\^([^\]]+)\]/g, (_, identifier) => {
                const index = footnotePlaceholders.push(identifier) - 1;
                return `§§FOOTNOTE${index}§§`;
            });
        }

        // Escape any raw HTML to avoid injection before adding formatting tags.
        result = escapeHtml(result);

        // Images must be parsed before links to avoid double wrapping.
        result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
            `<img src="${escapeAttribute(url)}" alt="${escapeHtml(alt)}" loading="lazy">`
        );

        // Parse links with safe attributes (but not footnote references).
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
            `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`
        );

        // Bold, italic, strikethrough, and underline emphasis.
        result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
        result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
        result = result.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');

        // Restore footnote references
        // Note: footnoteRefs is passed by reference, so we can modify it here
        // Numbers are assigned in order of first reference appearance
        if (footnoteRefs !== null && footnotePlaceholders.length > 0) {
            result = result.replace(/§§FOOTNOTE(\d+)§§/g, (_, index) => {
                const identifier = footnotePlaceholders[parseInt(index, 10)];
                const safeId = escapeAttribute(identifier);
                // Assign number on first appearance (standard markdown behavior)
                // If definition already assigned a number, use that; otherwise assign sequential number
                if (!footnoteRefs.has(identifier)) {
                    // This reference hasn't been seen before - it will get a number when definition is found
                    // For now, we'll use a placeholder that will be resolved when definition is parsed
                    // We need to track that this identifier was referenced
                    footnoteRefs.set(identifier, null); // Placeholder - will be set when definition is found
                }
                // Get the footnote number (if definition already assigned it, use that; otherwise wait for definition)
                const footnoteNum = footnoteRefs.get(identifier);
                // If number not yet assigned, we'll use the identifier temporarily
                // The definition will assign the proper number when encountered
                return `<sup><a href="#fn-${safeId}" id="fnref-${safeId}" class="footnote-ref">${footnoteNum !== null ? footnoteNum : identifier}</a></sup>`;
            });
        }

        // Restore inline code segments now that formatting is done.
        result = result.replace(/§§CODE(\d+)§§/g, (_, index) => `<code>${escapeHtml(codeSegments[index])}</code>`);

        return result;
    };

    const closeListIfNeeded = (state, output) => {
        // Close all nested lists
        while (state.listStack.length > 0) {
            const level = state.listStack.pop();
            state.listBuffer.push(`</${level.type}>`);
        }
        
        if (state.listBuffer.length > 0) {
            output.push(state.listBuffer.join(''));
            state.listBuffer = [];
        }
    };

    const isTableDivider = (line) => /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);

    const splitTableRow = (line) => line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());

    const parse = (markdown) => {
        const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
        const output = [];
        const state = { 
            listStack: [],  // Stack of { type: 'ul'|'ol', indent: number }
            listBuffer: []  // Buffer for building nested list HTML
        };
        let inCodeBlock = false;
        let codeFenceBuffer = [];
        let codeBlockLanguage = '';
        
        // Footnotes: map identifier -> { number, text }
        const footnoteDefs = new Map();
        const footnoteRefs = new Map(); // identifier -> number (assigned in order of first reference appearance)
        let footnoteCounter = 1; // Counter for assigning numbers to footnotes

        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            const trimmed = line.trimEnd();

            if (/^```/.test(trimmed)) {
                if (!inCodeBlock) {
                    closeListIfNeeded(state, output);
                    inCodeBlock = true;
                    codeFenceBuffer = [];
                    // Extract language identifier from opening fence (e.g., ```javascript)
                    const languageMatch = trimmed.match(/^```(\w+)/);
                    codeBlockLanguage = languageMatch ? languageMatch[1].toLowerCase() : '';
                } else {
                    // Close code block with language class for Prism.js
                    const langClass = codeBlockLanguage ? ` class="language-${escapeAttribute(codeBlockLanguage)}"` : '';
                    output.push(`<pre><code${langClass}>${escapeHtml(codeFenceBuffer.join('\n'))}</code></pre>`);
                    inCodeBlock = false;
                    codeFenceBuffer = [];
                    codeBlockLanguage = '';
                }
                continue;
            }

            if (inCodeBlock) {
                codeFenceBuffer.push(line);
                continue;
            }

            if (trimmed === '') {
                closeListIfNeeded(state, output);
                output.push('');
                continue;
            }

            const nextLine = lines[index + 1] ? lines[index + 1].trim() : '';
            if (/^\s*\|.+\|\s*$/.test(trimmed) && isTableDivider(nextLine)) {
                closeListIfNeeded(state, output);
                const headerCells = splitTableRow(trimmed).map(cell => parseInline(cell, footnoteRefs));
                index += 1; // Skip divider line
                const bodyRows = [];
                for (let bodyIndex = index + 1; bodyIndex < lines.length; bodyIndex += 1) {
                    const potentialRow = lines[bodyIndex].trim();
                    if (!/^\s*\|.+\|\s*$/.test(potentialRow)) {
                        break;
                    }
                    bodyRows.push(splitTableRow(potentialRow).map(cell => parseInline(cell, footnoteRefs)));
                    index = bodyIndex;
                }

                const headerHtml = `<thead><tr>${headerCells.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead>`;
                const bodyHtml = bodyRows.length
                    ? `<tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`
                    : '<tbody></tbody>';
                output.push(`<table>${headerHtml}${bodyHtml}</table>`);
                continue;
            }

            const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
                closeListIfNeeded(state, output);
                const level = Math.min(headingMatch[1].length, ALLOWED_HEADINGS);
                output.push(`<h${level}>${parseInline(headingMatch[2].trim(), footnoteRefs)}</h${level}>`);
                continue;
            }

            // Check for list items (ordered or unordered) with indentation support
            // Convert tabs to 4 spaces for consistent handling
            const normalizedLine = line.replace(/\t/g, '    ');
            
            // Check for checkbox syntax first: - [ ] or - [x] or - [X]
            const checkboxMatch = normalizedLine.match(/^(\s*)([-*+])\s+\[([xX ])\]\s+(.*)$/);
            if (checkboxMatch) {
                const indent = checkboxMatch[1].length;
                const marker = checkboxMatch[2];
                const checked = checkboxMatch[3].toLowerCase() === 'x';
                const content = checkboxMatch[4];
                const listType = 'ul';
                const level = Math.floor(indent / 2); // 2 spaces = 1 level
                
                // Step 1: Close any lists deeper than our target level
                while (state.listStack.length > level + 1) {
                    const closedLevel = state.listStack.pop();
                    state.listBuffer.push(`</li></${closedLevel.type}>`);
                }
                
                // Step 2: Determine if we need to open new lists or continue existing ones
                if (state.listStack.length === 0) {
                    // No lists open - start top-level list
                    state.listStack.push({ type: listType, level: 0 });
                    state.listBuffer.push(`<${listType}>`);
                } else if (state.listStack.length < level + 1) {
                    // Need to go deeper - open intermediate lists
                    const levelsToOpen = (level + 1) - state.listStack.length;
                    for (let j = 0; j < levelsToOpen; j++) {
                        const newLevel = state.listStack.length;
                        state.listStack.push({ type: listType, level: newLevel });
                        state.listBuffer.push(`<${listType}>`);
                    }
                } else {
                    // We're at the correct depth - check for type change or continuation
                    const currentList = state.listStack[state.listStack.length - 1];
                    if (currentList.type !== listType) {
                        // List type changed at same level
                        state.listStack.pop();
                        state.listBuffer.push(`</li></${currentList.type}>`);
                        state.listStack.push({ type: listType, level: level });
                        state.listBuffer.push(`<${listType}>`);
                    } else {
                        // Same list, close previous item
                        state.listBuffer.push('</li>');
                    }
                }
                
                // Add the list item with checkbox
                const checkboxAttr = checked ? ' checked' : '';
                state.listBuffer.push(`<li><input type="checkbox"${checkboxAttr} disabled> ${parseInline(content, footnoteRefs)}`);
                continue;
            }
            
            // Check for regular list items (ordered or unordered)
            const listMatch = normalizedLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
            if (listMatch) {
                const indent = listMatch[1].length;
                const marker = listMatch[2];
                const content = listMatch[3];
                const listType = /^\d+\.$/.test(marker) ? 'ol' : 'ul';
                const level = Math.floor(indent / 2); // 2 spaces = 1 level
                
                // FIX: Completely rewritten list handling logic
                // The key insight: We should ONLY open a new nested list when going DEEPER,
                // not when seeing the FIRST item at a level we just jumped to.
                
                // Step 1: Close any lists deeper than our target level
                while (state.listStack.length > level + 1) {
                    const closedLevel = state.listStack.pop();
                    state.listBuffer.push(`</li></${closedLevel.type}>`);
                }
                
                // Step 2: Determine if we need to open new lists or continue existing ones
                if (state.listStack.length === 0) {
                    // No lists open - start top-level list
                    state.listStack.push({ type: listType, level: 0 });
                    state.listBuffer.push(`<${listType}>`);
                } else if (state.listStack.length < level + 1) {
                    // Need to go deeper - open intermediate lists
                    const levelsToOpen = (level + 1) - state.listStack.length;
                    for (let j = 0; j < levelsToOpen; j++) {
                        const newLevel = state.listStack.length;
                        state.listStack.push({ type: listType, level: newLevel });
                        state.listBuffer.push(`<${listType}>`);
                    }
                } else {
                    // We're at the correct depth - check for type change or continuation
                    const currentList = state.listStack[state.listStack.length - 1];
                    if (currentList.type !== listType) {
                        // List type changed at same level
                        state.listStack.pop();
                        state.listBuffer.push(`</li></${currentList.type}>`);
                        state.listStack.push({ type: listType, level: level });
                        state.listBuffer.push(`<${listType}>`);
                    } else {
                        // Same list, close previous item
                        state.listBuffer.push('</li>');
                    }
                }
                
                // Add the list item
                state.listBuffer.push(`<li>${parseInline(content, footnoteRefs)}`);
                continue;
            }

            // Check for footnote definition: [^identifier]: text
            const footnoteDefMatch = trimmed.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
            if (footnoteDefMatch) {
                closeListIfNeeded(state, output);
                const identifier = footnoteDefMatch[1];
                const footnoteText = footnoteDefMatch[2];
                
                // Assign number to this footnote
                // Standard markdown: numbers are assigned in order of first reference appearance
                // If this identifier was referenced before, it should already be in footnoteRefs (possibly with null)
                // If not referenced yet, assign it the next number
                if (!footnoteRefs.has(identifier)) {
                    // Definition appears before any reference - assign next number
                    footnoteRefs.set(identifier, footnoteCounter++);
                } else if (footnoteRefs.get(identifier) === null) {
                    // Identifier was referenced but number not yet assigned - assign next number
                    footnoteRefs.set(identifier, footnoteCounter++);
                }
                // If identifier already has a number, keep it (definition was encountered after reference)
                
                // Store the definition
                footnoteDefs.set(identifier, {
                    number: footnoteRefs.get(identifier),
                    text: footnoteText
                });
                continue;
            }

            const quoteMatch = trimmed.match(/^>\s?(.*)$/);
            if (quoteMatch) {
                closeListIfNeeded(state, output);
                output.push(`<blockquote>${parseInline(quoteMatch[1], footnoteRefs)}</blockquote>`);
                continue;
            }

            // Horizontal rule: ---, ***, or ___ (with optional spaces between characters)
            const hrMatch = trimmed.match(/^(\*\s*\*\s*\*[\s*]*|_\s*_\s*_[\s_]*|-\s*-\s*-[\s-]*)$/);
            if (hrMatch) {
                closeListIfNeeded(state, output);
                output.push('<hr>');
                continue;
            }

            closeListIfNeeded(state, output);
            output.push(`<p>${parseInline(trimmed, footnoteRefs)}</p>`);
        }

        if (inCodeBlock) {
            // Handle unclosed code block (e.g., at end of document)
            const langClass = codeBlockLanguage ? ` class="language-${escapeAttribute(codeBlockLanguage)}"` : '';
            output.push(`<pre><code${langClass}>${escapeHtml(codeFenceBuffer.join('\n'))}</code></pre>`);
        }
        closeListIfNeeded(state, output);

        // Add footnote definitions section if there are any footnotes
        if (footnoteDefs.size > 0) {
            output.push('<div class="footnotes">');
            output.push('<hr>');
            output.push('<ol>');
            
            // Sort footnotes by their number for consistent ordering
            const sortedFootnotes = Array.from(footnoteDefs.entries())
                .sort((a, b) => a[1].number - b[1].number);
            
            for (const [identifier, def] of sortedFootnotes) {
                const safeId = escapeAttribute(identifier);
                const footnoteText = parseInline(def.text, footnoteRefs);
                output.push(`<li id="fn-${safeId}">${footnoteText} <a href="#fnref-${safeId}" class="footnote-backref">↩</a></li>`);
            }
            
            output.push('</ol>');
            output.push('</div>');
        }

        return output
            .filter((line, idx, arr) => !(line === '' && (idx === 0 || arr[idx - 1] === '')))
            .join('\n');
    };

    const api = {
        parse
    };

    global.markedLite = api;
    global.marked = api; // Provide marked-like API for compatibility.
})(window);
