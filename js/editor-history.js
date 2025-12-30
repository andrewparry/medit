/*
 * Markdown Editor - History Module
 * Manages undo/redo functionality
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, constants, state, utils } = MarkdownEditor;

    /**
     * Get a snapshot of the current editor state for history tracking
     * Captures editor content, selection position, and scroll position
     *
     * @returns {{value: string, selectionStart: number, selectionEnd: number, scrollTop: number}|null}
     *   Snapshot object or null if editor is not available
     *
     * @example
     * const snapshot = getEditorSnapshot();
     * // Later restore with applyEditorSnapshot(snapshot)
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
     * Apply a saved snapshot to restore editor state
     * Restores content, selection, scroll position, and updates preview/counters
     * Sets isApplyingHistory flag to prevent recording this change in history
     *
     * @param {{value: string, selectionStart: number, selectionEnd: number, scrollTop: number}} snapshot
     *   Snapshot object from getEditorSnapshot()
     * @returns {void}
     *
     * @example
     * applyEditorSnapshot(previousSnapshot); // Restores to previous state
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
     * Push current editor state to history stack for undo capability
     * Avoids duplicate consecutive snapshots and enforces history limit
     * Clears redo stack when new changes are made
     *
     * @returns {void}
     *
     * @example
     * // Called after user makes a change
     * pushHistory(); // Saves current state for undo
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
     * Push history with debounce to avoid excessive snapshots during typing
     * Waits for HISTORY_DEBOUNCE milliseconds (300ms) of inactivity before saving
     *
     * @returns {void}
     *
     * @example
     * // Called on every keystroke
     * pushHistoryDebounced(); // Only saves after 300ms pause
     */
    const pushHistoryDebounced = () => {
        if (state.isApplyingHistory) {
            return;
        }

        clearTimeout(state.historyTimer);
        state.historyTimer = setTimeout(pushHistory, constants.HISTORY_DEBOUNCE);
    };

    /**
     * Undo the last change by restoring previous editor state
     * Moves current state to redo stack and applies previous state from history stack
     * Updates toolbar states and recalculates find matches if active
     *
     * @returns {void}
     *
     * @example
     * undo(); // Ctrl+Z - restores previous state
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
     * Redo the last undone change by restoring next editor state
     * Moves current state back to history stack and applies next state from redo stack
     * Updates toolbar states and recalculates find matches if active
     *
     * @returns {void}
     *
     * @example
     * redo(); // Ctrl+Y or Ctrl+Shift+Z - restores undone state
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
     * Initialize history system with current editor state as baseline
     * Creates initial snapshot and clears redo stack
     * Should be called when opening a file or starting new document
     *
     * @returns {void}
     *
     * @example
     * // After loading a file
     * initHistory(); // Sets baseline for undo/redo
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
