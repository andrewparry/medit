/*
 * Markdown Editor - State Module
 * Manages application state
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};

    /**
     * Global application state object
     * Maintains runtime state for the editor including autosave, dirty flag, history, and UI state
     *
     * @type {Object}
     * @property {number|null} autosaveTimer - Timer ID for scheduled autosave operation
     * @property {boolean} dirty - Whether document has unsaved changes
     * @property {string} lastSavedContent - Content as it was last saved (for dirty comparison)
     * @property {boolean} isPreviewVisible - Whether preview pane is currently visible
     * @property {boolean} autosaveDisabled - Whether autosave is disabled by user
     * @property {boolean} quotaExceededShown - Whether quota exceeded dialog has been shown
     * @property {boolean} isApplyingHistory - Flag to prevent history recording during undo/redo
     * @property {number|null} historyTimer - Timer ID for debounced history recording
     * @property {Array<Object>} historyStack - Past editor states for undo (oldest first)
     * @property {Array<Object>} futureStack - Future editor states for redo (most recent last)
     * @property {boolean} renderHtml - Whether to render HTML inline or escape it in preview
     */
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
        futureStack: [], // redo states (most recent at end)
        renderHtml: false // Whether to render HTML inline or escape it
    };

    /**
     * Find/replace search state
     * Tracks current search query, matches, and position for find/replace operations
     *
     * @type {Object}
     * @property {number} lastIndex - Last search position in text for incremental search
     * @property {boolean} freshQuery - Whether this is a new search query (affects highlighting)
     * @property {Array<{start: number, end: number}>} matches - Array of match positions in document
     * @property {number} current - Index of currently selected match (-1 if none)
     */
    MarkdownEditor.searchState = {
        lastIndex: 0,
        freshQuery: false,
        matches: [],
        current: -1
    };

    /**
     * State management utilities
     * Provides methods for managing and querying application state
     */
    MarkdownEditor.stateManager = {
        /**
         * Mark document as dirty (unsaved changes) or clean (all saved)
         * Updates the dirty flag which triggers unsaved changes warnings
         *
         * @param {boolean} [dirty=true] - Whether document should be marked as dirty
         * @returns {void}
         */
        markDirty: (dirty = true) => {
            MarkdownEditor.state.dirty = dirty;
        },

        /**
         * Check if document has unsaved changes
         *
         * @returns {boolean} True if document has unsaved changes
         */
        isDirty: () => {
            return MarkdownEditor.state.dirty;
        },

        /**
         * Get the entire application state object
         *
         * @returns {Object} The complete state object
         */
        getState: () => {
            return MarkdownEditor.state;
        },

        /**
         * Get the search/find-replace state object
         *
         * @returns {Object} The search state object with matches and current position
         */
        getSearchState: () => {
            return MarkdownEditor.searchState;
        },

        /**
         * Reset search state to initial values
         * Clears all matches, resets position, and clears flags
         * Called when closing find bar or starting new document
         *
         * @returns {void}
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
