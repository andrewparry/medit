/*
 * Markdown Editor - Find/Replace Module
 * Handles search and replace functionality
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, state, utils, history, searchState } = MarkdownEditor;

    /**
     * Build search regex based on find options
     */
    const buildSearchRegex = (query) => {
        if (!query) return null;
        try {
            if (elements.findRegex && elements.findRegex.checked) {
                return new RegExp(query, elements.findCase?.checked ? 'g' : 'gi');
            }
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = elements.findWhole?.checked ? `(^|[^\\w])(${escaped})(?=[^\\w]|$)` : escaped;
            return new RegExp(pattern, elements.findCase?.checked ? 'g' : 'gi');
        } catch (e) {
            return null;
        }
    };

    /**
     * Clear preview highlights
     */
    const clearPreviewHighlights = () => {
        if (!elements.preview) return;
        const marks = elements.preview.querySelectorAll('.find-hit');
        marks.forEach((mark) => {
            const parent = mark.parentNode;
            if (!parent) return;
            while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
            parent.removeChild(mark);
            parent.normalize();
        });
    };

    /**
     * Highlight all hits in the preview
     */
    const highlightPreviewFindHits = () => {
        clearPreviewHighlights();
        const query = elements.findInput?.value || '';
        const regex = buildSearchRegex(query);
        if (!regex || !query || !elements.preview) return;

        const walker = document.createTreeWalker(elements.preview, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);

        let total = 0;
        textNodes.forEach((text) => {
            const value = text.nodeValue;
            let m;
            let lastIndex = 0;
            const fragments = [];
            const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
            while ((m = re.exec(value)) !== null) {
                const start = m.index + (m[1] ? m[1].length : 0);
                const len = (m[2] ? m[2].length : m[0].length);
                const end = start + len;
                if (start > lastIndex) {
                    fragments.push(document.createTextNode(value.slice(lastIndex, start)));
                }
                const mark = document.createElement('mark');
                mark.className = 'find-hit';
                mark.textContent = value.slice(start, end);
                fragments.push(mark);
                lastIndex = end;
                total += 1;
            }
            if (lastIndex === 0) return;
            if (lastIndex < value.length) fragments.push(document.createTextNode(value.slice(lastIndex)));
            const parent = text.parentNode;
            if (!parent) return;
            fragments.forEach((f) => parent.insertBefore(f, text));
            parent.removeChild(text);
        });

        // Update count
        const positions = [];
        const src = elements.editor.value;
        const reAll = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        let mm;
        while ((mm = reAll.exec(src)) !== null) {
            const s = mm.index + (mm[1] ? mm[1].length : 0);
            const l = (mm[2] ? mm[2].length : mm[0].length);
            positions.push({ start: s, end: s + l });
        }
        searchState.matches = positions;
        if (elements.findCount) {
            const cur = searchState.current >= 0 ? searchState.current + 1 : 0;
            elements.findCount.textContent = `${cur}/${positions.length}`;
        }
    };

    /**
     * Update raw highlights for find (used by syntax-highlight module)
     */
    const updateRawHighlightsForFind = () => {
        if (!elements.editorHighlights || !elements.editor) return;
        
        const text = elements.editor.value || '';
        const query = elements.findInput?.value || '';
        const regex = buildSearchRegex(query);
        if (!regex || !query) {
            elements.editorHighlights.innerHTML = utils.escapeHtml(text);
            return;
        }

        // Ensure positions are up-to-date
        const positions = [];
        const reAll = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        let mm;
        while ((mm = reAll.exec(text)) !== null) {
            const s = mm.index + (mm[1] ? mm[1].length : 0);
            const l = (mm[2] ? mm[2].length : mm[0].length);
            positions.push({ start: s, end: s + l });
        }
        searchState.matches = positions;

        let html = '';
        let last = 0;
        positions.forEach((pos, idx) => {
            if (pos.start > last) html += utils.escapeHtml(text.slice(last, pos.start));
            const cls = (idx === searchState.current) ? 'find-hit-current' : 'find-hit';
            html += `<mark class="${cls}">` + utils.escapeHtml(text.slice(pos.start, pos.end)) + '</mark>';
            last = pos.end;
        });
        html += utils.escapeHtml(text.slice(last));
        elements.editorHighlights.innerHTML = html;
        elements.editorHighlights.scrollTop = elements.editor.scrollTop;
    };

    /**
     * Scroll current raw hit into view
     */
    const scrollCurrentRawHitIntoView = (center = true) => {
        if (!elements.editor || !elements.editorHighlights) return;
        const current = elements.editorHighlights.querySelector('.find-hit-current');
        if (!current) return;

        // Center within the textarea's own scroll area
        if (center) {
            const hitOffsetTop = current.offsetTop;
            const hitHeight = current.offsetHeight || 1;
            const desiredTop = hitOffsetTop - (elements.editor.clientHeight / 2 - hitHeight / 2);
            const maxScroll = Math.max(0, elements.editor.scrollHeight - elements.editor.clientHeight);
            const targetScroll = Math.min(maxScroll, Math.max(0, desiredTop));
            if (Math.abs(elements.editor.scrollTop - targetScroll) > 1) {
                elements.editor.scrollTop = targetScroll;
                elements.editorHighlights.scrollTop = targetScroll;
            }
        } else {
            const hitRect = current.getBoundingClientRect();
            const containerRect = elements.editor.getBoundingClientRect();
            const isAbove = hitRect.top < containerRect.top;
            const isBelow = hitRect.bottom > containerRect.bottom;
            if (isAbove || isBelow) {
                const offsetFromTop = hitRect.top - containerRect.top;
                const targetScrollTop = elements.editor.scrollTop + offsetFromTop;
                elements.editor.scrollTop = targetScrollTop;
                elements.editorHighlights.scrollTop = targetScrollTop;
            }
        }

        // Center the hit within the viewport
        requestAnimationFrame(() => {
            const currentRect = current.getBoundingClientRect();
            const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
            const toolbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--toolbar-height')) || 0;
            const findH = (elements.findBar && !elements.findBar.hidden) ? elements.findBar.getBoundingClientRect().height : 0;
            const topInset = headerH + toolbarH + findH;
            const usableHeight = window.innerHeight - topInset;
            const desiredCenterY = topInset + usableHeight / 2;
            const hitCenterY = currentRect.top + currentRect.height / 2;
            const deltaY = hitCenterY - desiredCenterY;
            if (Math.abs(deltaY) > 1) {
                window.scrollBy({ top: deltaY, left: 0, behavior: 'smooth' });
            }
        });
    };

    /**
     * Find in editor
     */
    const findInEditor = (direction = 1) => {
        const query = elements.findInput?.value || '';
        if (!query) return false;
        const regex = buildSearchRegex(query);
        if (!regex) return false;

        const value = elements.editor.value;
        const startFrom = direction === -1 ? Math.max(0, elements.editor.selectionStart - 1) : Math.max(elements.editor.selectionEnd, searchState.lastIndex);

        // Forward search from startFrom
        regex.lastIndex = startFrom;
        let match = regex.exec(value);

        // Wrap-around
        if (!match && startFrom > 0) {
            regex.lastIndex = 0;
            match = regex.exec(value);
        }

        if (match) {
            let s = match.index;
            let e = s + (match[2] ? match[2].length : match[0].length);
            if (match[2]) {
                s = match.index + (match[1] ? match[1].length : 0);
            }
            elements.editor.focus();
            elements.editor.setSelectionRange(s, e);
            
            if (searchState.matches && searchState.matches.length > 0) {
                const idx = searchState.matches.findIndex((p) => p.start === s && p.end === e);
                searchState.current = idx;
                if (elements.findCount) elements.findCount.textContent = `${idx + 1}/${searchState.matches.length}`;
                updateRawHighlightsForFind();
                scrollCurrentRawHitIntoView(true);
            }
            
            if (searchState.freshQuery) {
                updateRawHighlightsForFind();
                scrollCurrentRawHitIntoView(true);
                searchState.freshQuery = false;
            }
            searchState.lastIndex = e;
            return true;
        }
        return false;
    };

    /**
     * Replace one occurrence
     */
    const replaceOne = () => {
        const query = elements.findInput?.value || '';
        const replacement = elements.replaceInput?.value ?? '';
        if (!query) return false;
        const regex = buildSearchRegex(query);
        if (!regex) return false;
        const { start, end, value } = utils.getSelection();
        const selected = value.slice(start, end);
        let matchOk = false;
        if (elements.findRegex?.checked) {
            try { matchOk = new RegExp(`^${regex.source}$`, regex.flags.replace('g','')).test(selected); } catch (_) { matchOk = false; }
        } else if (elements.findWhole?.checked) {
            const equal = elements.findCase?.checked ? selected === query : selected.toLowerCase() === query.toLowerCase();
            matchOk = equal;
        } else {
            const equal = elements.findCase?.checked ? selected === query : selected.toLowerCase() === query.toLowerCase();
            matchOk = equal;
        }

        if (!matchOk) {
            if (!findInEditor(1)) return false;
            return replaceOne();
        }

        const before = elements.editor.value.slice(0, start);
        const after = elements.editor.value.slice(end);
        const replaceWith = elements.findRegex?.checked ? selected.replace(new RegExp(regex.source, regex.flags.replace('g','')), replacement) : replacement;
        elements.editor.value = `${before}${replaceWith}${after}`;
        const newPos = before.length + replaceWith.length;
        elements.editor.setSelectionRange(newPos, newPos);
        
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
        
        if (history && history.pushHistory) {
            history.pushHistory();
        }
        
        updateRawHighlightsForFind();
        const totalAfter = (searchState.matches?.length) || 0;
        searchState.current = -1;
        if (elements.findCount) elements.findCount.textContent = `0/${totalAfter}`;
        return true;
    };

    /**
     * Replace all occurrences
     */
    const replaceAll = () => {
        const query = elements.findInput?.value || '';
        const replacement = elements.replaceInput?.value ?? '';
        if (!query) return 0;
        const regex = buildSearchRegex(query);
        if (!regex) return 0;

        const original = elements.editor.value;
        let count = 0;
        let caretAfter = 0;
        
        if (elements.findRegex?.checked) {
            const reG = new RegExp(regex.source, regex.flags);
            const parts = [];
            let last = 0;
            let accLen = 0;
            let m;
            while ((m = reG.exec(original)) !== null) {
                const s0 = m.index;
                const s = s0 + (m[1] ? m[1].length : 0);
                const e = s + (m[2] ? m[2].length : m[0].length);
                parts.push(original.slice(last, s));
                parts.push(replacement);
                accLen += (s - last) + replacement.length;
                caretAfter = accLen;
                last = e;
                count += 1;
            }
            parts.push(original.slice(last));
            elements.editor.value = parts.join('');
        } else {
            if (elements.findWhole?.checked) {
                const parts = [];
                let last = 0;
                let accLen = 0;
                const wordRe = buildSearchRegex(query);
                let m;
                while ((m = wordRe.exec(original)) !== null) {
                    const s = m.index + (m[1] ? m[1].length : 0);
                    const e = s + (m[2] ? m[2].length : m[0].length);
                    parts.push(original.slice(last, s));
                    parts.push(replacement);
                    accLen += (s - last) + replacement.length;
                    caretAfter = accLen;
                    last = e;
                    count += 1;
                }
                parts.push(original.slice(last));
                elements.editor.value = parts.join('');
            } else {
                const flags = elements.findCase?.checked ? 'g' : 'gi';
                const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const re = new RegExp(safe, flags);
                const parts = [];
                let last = 0;
                let accLen = 0;
                let m;
                while ((m = re.exec(original)) !== null) {
                    const s = m.index;
                    const e = s + m[0].length;
                    parts.push(original.slice(last, s));
                    parts.push(replacement);
                    accLen += (s - last) + replacement.length;
                    caretAfter = accLen;
                    last = e;
                    count += 1;
                }
                parts.push(original.slice(last));
                elements.editor.value = parts.join('');
            }
        }
        
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
        
        if (history && history.pushHistory) {
            history.pushHistory();
        }
        
        if (count > 0) {
            elements.editor.setSelectionRange(caretAfter, caretAfter);
        }
        updateRawHighlightsForFind();
        const totalAfterAll = (searchState.matches?.length) || 0;
        searchState.current = -1;
        if (elements.findCount) elements.findCount.textContent = `0/${totalAfterAll}`;
        return count;
    };

    /**
     * Open find bar
     */
    const openFind = () => {
        if (!elements.findBar || !elements.findInput) return;
        elements.findBar.hidden = false;
        setTimeout(() => { 
            elements.findInput.focus(); 
            elements.findInput.select(); 
        }, 0);
        searchState.freshQuery = true;
        updateRawHighlightsForFind();
        
        if (elements.toggleFindButton) {
            elements.toggleFindButton.setAttribute('aria-pressed', 'true');
            elements.toggleFindButton.classList.add('active');
        }
    };

    /**
     * Close find bar
     */
    const closeFind = (clearFields = false) => {
        if (!elements.findBar) return;
        elements.findBar.hidden = true;
        clearPreviewHighlights();
        if (clearFields) {
            if (elements.findInput) elements.findInput.value = '';
            if (elements.replaceInput) elements.replaceInput.value = '';
            if (elements.findCount) elements.findCount.textContent = '0/0';
            searchState.matches = [];
            searchState.current = -1;
        }
        
        // Update highlights - will show syntax highlighting when find bar is hidden
        if (MarkdownEditor.syntaxHighlight && MarkdownEditor.syntaxHighlight.updateRawHighlights) {
            MarkdownEditor.syntaxHighlight.updateRawHighlights();
        }
        
        if (elements.editor) elements.editor.focus();
        if (elements.toggleFindButton) {
            elements.toggleFindButton.setAttribute('aria-pressed', 'false');
            elements.toggleFindButton.classList.remove('active');
        }
    };

    /**
     * Recalculate find after content change
     */
    const recalcFindAfterChange = () => {
        if (!elements.findBar || elements.findBar.hidden) return;
        const q = elements.findInput?.value || '';
        if (!q) {
            if (elements.editorHighlights) elements.editorHighlights.innerHTML = '';
            if (elements.findCount) elements.findCount.textContent = '0/0';
            return;
        }
        updateRawHighlightsForFind();
        
        const selStart = elements.editor.selectionStart;
        const selEnd = elements.editor.selectionEnd;
        let idx = -1;
        if (searchState.matches && searchState.matches.length) {
            idx = searchState.matches.findIndex(m => m.start === selStart && m.end === selEnd);
        }
        searchState.current = idx;
        const total = (searchState.matches?.length) || 0;
        if (elements.findCount) elements.findCount.textContent = `${idx >= 0 ? idx + 1 : 0}/${total}`;
        if (idx >= 0) scrollCurrentRawHitIntoView(true);
    };

    // Expose public API
    MarkdownEditor.findReplace = {
        buildSearchRegex,
        clearPreviewHighlights,
        highlightPreviewFindHits,
        updateRawHighlightsForFind,
        scrollCurrentRawHitIntoView,
        findInEditor,
        replaceOne,
        replaceAll,
        openFind,
        closeFind,
        recalcFindAfterChange
    };

    window.MarkdownEditor = MarkdownEditor;
})();

