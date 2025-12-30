/*
 * Markdown Editor - Status Manager Module
 * Centralized status message management with priorities and auto-clearing
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements } = MarkdownEditor;

    // Status message priorities (higher = more important)
    const PRIORITY = {
        IDLE: 0, // Default state (Ready, Draft saved)
        INFO: 1, // Informational messages (Opening file..., Saving...)
        SUCCESS: 2, // Success messages (Saved, Exported)
        WARNING: 3, // Warning messages (Storage full)
        ERROR: 4 // Error messages (Save failed, Export failed)
    };

    // Auto-clear timeouts for different message types (in milliseconds)
    const CLEAR_TIMEOUT = {
        INFO: 2000, // Info messages clear after 2s
        SUCCESS: 3000, // Success messages clear after 3s
        WARNING: 5000, // Warnings clear after 5s
        ERROR: 5000 // Errors clear after 5s
    };

    let currentPriority = PRIORITY.IDLE;
    let clearTimer = null;
    let defaultMessage = 'Ready';

    /**
     * Set the default idle message (shown when no operations are active)
     * @param {string} message - The default message to show
     */
    const setDefaultMessage = (message) => {
        defaultMessage = message || 'Ready';
    };

    /**
     * Clear any pending auto-clear timer
     */
    const clearTimer_internal = () => {
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }
    };

    /**
     * Set status message with priority and auto-clear support
     * @param {string} message - The message to display
     * @param {number} priority - Message priority (use PRIORITY constants)
     * @param {boolean} autoClear - Whether to auto-clear after timeout
     */
    const setStatus = (message, priority = PRIORITY.INFO, autoClear = false) => {
        if (!elements.autosaveStatus) {
            return;
        }

        // Only update if new message has equal or higher priority
        if (priority < currentPriority) {
            return;
        }

        // Clear any pending timer
        clearTimer_internal();

        // Update the status text
        elements.autosaveStatus.textContent = message;
        currentPriority = priority;

        // Set up auto-clear if requested
        if (autoClear) {
            const timeout = CLEAR_TIMEOUT[getPriorityName(priority)] || CLEAR_TIMEOUT.INFO;
            clearTimer = setTimeout(() => {
                clearStatus();
            }, timeout);
        }
    };

    /**
     * Get priority name from priority value
     */
    const getPriorityName = (priority) => {
        for (const [name, value] of Object.entries(PRIORITY)) {
            if (value === priority) {
                return name;
            }
        }
        return 'INFO';
    };

    /**
     * Clear status message and return to default
     * Only clears if no higher priority message is showing
     */
    const clearStatus = () => {
        clearTimer_internal();
        currentPriority = PRIORITY.IDLE;
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = defaultMessage;
        }
    };

    /**
     * Force clear status regardless of priority
     */
    const forceClearStatus = () => {
        clearTimer_internal();
        currentPriority = PRIORITY.IDLE;
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = defaultMessage;
        }
    };

    /**
     * Show idle/ready state message
     * @param {string} message - Optional custom ready message
     */
    const showReady = (message = null) => {
        setStatus(message || defaultMessage, PRIORITY.IDLE, false);
    };

    /**
     * Show informational message (auto-clears)
     * @param {string} message - The info message
     */
    const showInfo = (message) => {
        setStatus(message, PRIORITY.INFO, true);
    };

    /**
     * Show success message (auto-clears)
     * @param {string} message - The success message
     */
    const showSuccess = (message) => {
        setStatus(message, PRIORITY.SUCCESS, true);
    };

    /**
     * Show warning message (auto-clears)
     * @param {string} message - The warning message
     */
    const showWarning = (message) => {
        setStatus(message, PRIORITY.WARNING, true);
    };

    /**
     * Show error message (auto-clears)
     * @param {string} message - The error message
     */
    const showError = (message) => {
        setStatus(message, PRIORITY.ERROR, true);
    };

    /**
     * Show operation in progress (doesn't auto-clear)
     * @param {string} message - The operation message (e.g., "Saving...", "Opening file...")
     */
    const showOperation = (message) => {
        setStatus(message, PRIORITY.INFO, false);
    };

    /**
     * Show persistent message (doesn't auto-clear, for important states)
     * @param {string} message - The persistent message
     * @param {number} priority - Message priority
     */
    const showPersistent = (message, priority = PRIORITY.INFO) => {
        setStatus(message, priority, false);
    };

    // Expose public API
    MarkdownEditor.statusManager = {
        // Priority constants
        PRIORITY,

        // Core functions
        setStatus,
        clearStatus,
        forceClearStatus,
        setDefaultMessage,

        // Convenience functions
        showReady,
        showInfo,
        showSuccess,
        showWarning,
        showError,
        showOperation,
        showPersistent
    };

    window.MarkdownEditor = MarkdownEditor;
})();
