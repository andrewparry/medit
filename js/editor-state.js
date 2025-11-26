/*
 * Markdown Editor - State Module
 * Manages application state
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};

    // Generate unique tab ID for this browser tab instance
    // This ensures each browser tab has isolated state
    const generateTabId = () => {
        if (!window.sessionStorage) {
            // Fallback to timestamp-based ID if sessionStorage not available
            return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Try to get existing tab ID from sessionStorage
        let tabId = sessionStorage.getItem('markdown-editor-tab-id');
        if (!tabId) {
            // Generate new tab ID
            tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            try {
                sessionStorage.setItem('markdown-editor-tab-id', tabId);
            } catch (error) {
                // If sessionStorage fails, use timestamp-based ID
                tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
        }
        return tabId;
    };

    const currentTabId = generateTabId();

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
        futureStack: [], // redo states (most recent at end)
        renderHtml: false, // Whether to render HTML inline or escape it
        tabId: currentTabId // Unique identifier for this browser tab
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
        },

        /**
         * Get current tab ID
         */
        getTabId: () => {
            return MarkdownEditor.state.tabId;
        }
    };

    // Update global namespace
    window.MarkdownEditor = MarkdownEditor;
})();
