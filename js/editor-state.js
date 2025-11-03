/*
 * Markdown Editor - State Module
 * Manages application state
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};

    // Initialize state object
    MarkdownEditor.state = {
        autosaveTimer: null,
        dirty: false,
        lastSavedContent: '',
        isPreviewVisible: true,
        autosaveDisabled: false,
        quotaExceededShown: false,
        isApplyingHistory: false,
        historyTimer: null,
        historyStack: [], // past states (oldest at 0, newest at end)
        futureStack: []   // redo states (most recent at end)
    };

    // Find/replace state
    MarkdownEditor.searchState = {
        lastIndex: 0,
        freshQuery: false,
        matches: [],
        current: -1
    };

    // State management utilities
    MarkdownEditor.stateManager = {
        /**
         * Mark document as dirty or clean
         */
        markDirty: (dirty = true) => {
            MarkdownEditor.state.dirty = dirty;
        },

        /**
         * Check if document is dirty
         */
        isDirty: () => {
            return MarkdownEditor.state.dirty;
        },

        /**
         * Get current state
         */
        getState: () => {
            return MarkdownEditor.state;
        },

        /**
         * Get search state
         */
        getSearchState: () => {
            return MarkdownEditor.searchState;
        },

        /**
         * Reset search state
         */
        resetSearchState: () => {
            MarkdownEditor.searchState.lastIndex = 0;
            MarkdownEditor.searchState.freshQuery = false;
            MarkdownEditor.searchState.matches = [];
            MarkdownEditor.searchState.current = -1;
        }
    };

    // Update global namespace
    window.MarkdownEditor = MarkdownEditor;
})();

