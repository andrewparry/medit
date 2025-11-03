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

    const parseInline = (input) => {
        const codeSegments = [];

        // Temporarily replace inline code so subsequent replacements ignore their content.
        let result = input.replace(/`([^`]+)`/g, (_, code) => {
            const index = codeSegments.push(code) - 1;
            return `§§CODE${index}§§`;
        });

        // Escape any raw HTML to avoid injection before adding formatting tags.
        result = escapeHtml(result);

        // Images must be parsed before links to avoid double wrapping.
        result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
            `<img src="${escapeAttribute(url)}" alt="${escapeHtml(alt)}" loading="lazy">`
        );

        // Parse links with safe attributes.
        result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
            `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`
        );

        // Bold, italic and strikethrough emphasis.
        result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
        result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');

        // Restore inline code segments now that formatting is done.
        result = result.replace(/§§CODE(\d+)§§/g, (_, index) => `<code>${escapeHtml(codeSegments[index])}</code>`);

        return result;
    };

    const closeListIfNeeded = (state, output) => {
        if (!state.listType) return;
        output.push(`<${state.listType}>${state.listBuffer.join('')}</${state.listType}>`);
        state.listType = null;
        state.listBuffer = [];
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
        const state = { listType: null, listBuffer: [] };
        let inCodeBlock = false;
        let codeFenceBuffer = [];
        let codeBlockLanguage = '';

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
                const headerCells = splitTableRow(trimmed).map(parseInline);
                index += 1; // Skip divider line
                const bodyRows = [];
                for (let bodyIndex = index + 1; bodyIndex < lines.length; bodyIndex += 1) {
                    const potentialRow = lines[bodyIndex].trim();
                    if (!/^\s*\|.+\|\s*$/.test(potentialRow)) {
                        break;
                    }
                    bodyRows.push(splitTableRow(potentialRow).map(parseInline));
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
                output.push(`<h${level}>${parseInline(headingMatch[2].trim())}</h${level}>`);
                continue;
            }

            const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (orderedMatch) {
                if (state.listType !== 'ol') {
                    closeListIfNeeded(state, output);
                    state.listType = 'ol';
                    state.listBuffer = [];
                }
                state.listBuffer.push(`<li>${parseInline(orderedMatch[2])}</li>`);
                continue;
            }

            const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
            if (unorderedMatch) {
                if (state.listType !== 'ul') {
                    closeListIfNeeded(state, output);
                    state.listType = 'ul';
                    state.listBuffer = [];
                }
                state.listBuffer.push(`<li>${parseInline(unorderedMatch[1])}</li>`);
                continue;
            }

            const quoteMatch = trimmed.match(/^>\s?(.*)$/);
            if (quoteMatch) {
                closeListIfNeeded(state, output);
                output.push(`<blockquote>${parseInline(quoteMatch[1])}</blockquote>`);
                continue;
            }

            closeListIfNeeded(state, output);
            output.push(`<p>${parseInline(trimmed)}</p>`);
        }

        if (inCodeBlock) {
            // Handle unclosed code block (e.g., at end of document)
            const langClass = codeBlockLanguage ? ` class="language-${escapeAttribute(codeBlockLanguage)}"` : '';
            output.push(`<pre><code${langClass}>${escapeHtml(codeFenceBuffer.join('\n'))}</code></pre>`);
        }
        closeListIfNeeded(state, output);

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
