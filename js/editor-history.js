/*
 * Markdown Editor - History Module
 * Manages undo/redo functionality
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, constants, state, utils } = MarkdownEditor;

    /**
     * Get a snapshot of the current editor state
     */
    const getEditorSnapshot = () => {
        if (!elements.editor) {
            return null;
        }
        return {
            value: elements.editor.value,
            selectionStart: elements.editor.selectionStart,
            selectionEnd: elements.editor.selectionEnd,
            scrollTop: elements.editor.scrollTop
        };
    };

    /**
     * Apply a snapshot to the editor
     */
    const applyEditorSnapshot = (snapshot) => {
        if (!snapshot || !elements.editor) {
            return;
        }

        state.isApplyingHistory = true;
        elements.editor.value = snapshot.value;

        // Update preview if available
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }

        // Update counters if available
        if (utils && utils.updateCounters) {
            utils.updateCounters();
        }

        elements.editor.focus();
        elements.editor.scrollTop = snapshot.scrollTop || 0;
        elements.editor.setSelectionRange(snapshot.selectionStart || 0, snapshot.selectionEnd || 0);

        // Mark dirty if content differs from last saved
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }

        state.isApplyingHistory = false;
    };

    /**
     * Push current state to history stack
     */
    const pushHistory = () => {
        if (state.isApplyingHistory) {
            return;
        }

        const snap = getEditorSnapshot();
        if (!snap) {
            return;
        }

        const last = state.historyStack[state.historyStack.length - 1];
        if (
            last &&
            last.value === snap.value &&
            last.selectionStart === snap.selectionStart &&
            last.selectionEnd === snap.selectionEnd
        ) {
            return; // no change
        }

        state.historyStack.push(snap);
        if (state.historyStack.length > constants.HISTORY_LIMIT) {
            state.historyStack.shift();
        }

        // Clear redo stack on new change
        state.futureStack = [];
    };

    /**
     * Push history with debounce
     */
    const pushHistoryDebounced = () => {
        if (state.isApplyingHistory) {
            return;
        }

        clearTimeout(state.historyTimer);
        state.historyTimer = setTimeout(pushHistory, constants.HISTORY_DEBOUNCE);
    };

    /**
     * Undo last change
     */
    const undo = () => {
        if (state.historyStack.length === 0) {
            return;
        }

        const current = getEditorSnapshot();
        const prev = state.historyStack.pop();

        // Push current to future for redo
        state.futureStack.push(current);
        applyEditorSnapshot(prev);

        // Update toolbar states if available
        if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
            MarkdownEditor.formatting.updateToolbarStates();
        }

        // Recalculate find after change if find/replace is active
        if (MarkdownEditor.findReplace && MarkdownEditor.findReplace.recalcFindAfterChange) {
            MarkdownEditor.findReplace.recalcFindAfterChange();
        }
    };

    /**
     * Redo last undone change
     */
    const redo = () => {
        if (state.futureStack.length === 0) {
            return;
        }

        const current = getEditorSnapshot();
        const next = state.futureStack.pop();

        // Current goes back to history
        state.historyStack.push(current);
        applyEditorSnapshot(next);

        // Update toolbar states if available
        if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
            MarkdownEditor.formatting.updateToolbarStates();
        }

        // Recalculate find after change if find/replace is active
        if (MarkdownEditor.findReplace && MarkdownEditor.findReplace.recalcFindAfterChange) {
            MarkdownEditor.findReplace.recalcFindAfterChange();
        }
    };

    /**
     * Initialize history with current editor state
     */
    const initHistory = () => {
        const snap = getEditorSnapshot();
        if (snap) {
            state.historyStack = [snap];
            state.futureStack = [];
        }
    };

    // Expose public API
    MarkdownEditor.history = {
        getEditorSnapshot,
        applyEditorSnapshot,
        pushHistory,
        pushHistoryDebounced,
        undo,
        redo,
        initHistory
    };

    window.MarkdownEditor = MarkdownEditor;
})();
