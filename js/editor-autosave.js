/*
 * Markdown Editor - Autosave Module
 * Manages automatic saving and localStorage operations
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, constants, state } = MarkdownEditor;

    /**
     * Schedule autosave operation to save editor content to localStorage
     * Saves after AUTOSAVE_INTERVAL (1500ms) delay, canceling any pending save
     * Handles quota exceeded errors with user dialog options
     *
     * @returns {void}
     *
     * @example
     * // Called after user types
     * scheduleAutosave(); // Will save after 1.5 seconds
     */
    const scheduleAutosave = () => {
        if (!window.localStorage || state.autosaveDisabled) {
            return;
        }

        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = setTimeout(async () => {
            try {
                localStorage.setItem(constants.AUTOSAVE_KEY, elements.editor.value);
                localStorage.setItem(
                    constants.AUTOSAVE_FILENAME_KEY,
                    elements.fileNameDisplay.textContent.trim()
                );
                if (elements.autosaveStatus) {
                    elements.autosaveStatus.textContent = 'Draft saved';
                }
                state.quotaExceededShown = false;
            } catch (error) {
                console.error('Autosave failed', error);

                // Check if it's a quota exceeded error
                if (
                    error.name === 'QuotaExceededError' ||
                    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                    error.code === 22
                ) {
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent = 'Storage full - autosave unavailable';
                    }

                    // Show dialog with options
                    const choice = await MarkdownEditor.dialogs.showQuotaExceededDialog();

                    switch (choice) {
                        case 'clear':
                            if (clearAllAutosaveData()) {
                                try {
                                    localStorage.setItem(
                                        constants.AUTOSAVE_KEY,
                                        elements.editor.value
                                    );
                                    localStorage.setItem(
                                        constants.AUTOSAVE_FILENAME_KEY,
                                        elements.fileNameDisplay.textContent.trim()
                                    );
                                    if (elements.autosaveStatus) {
                                        elements.autosaveStatus.textContent =
                                            'Draft saved (cleared old data)';
                                    }
                                } catch (retryError) {
                                    disableAutosave();
                                    if (elements.autosaveStatus) {
                                        elements.autosaveStatus.textContent =
                                            'Autosave disabled - storage full';
                                    }
                                }
                            } else {
                                disableAutosave();
                                if (elements.autosaveStatus) {
                                    elements.autosaveStatus.textContent =
                                        'Autosave disabled - unable to clear storage';
                                }
                            }
                            break;
                        case 'disable':
                            disableAutosave();
                            if (elements.autosaveStatus) {
                                elements.autosaveStatus.textContent = 'Autosave disabled';
                            }
                            break;
                        case 'ignore':
                        default:
                            if (elements.autosaveStatus) {
                                elements.autosaveStatus.textContent =
                                    'Autosave unavailable - storage full';
                            }
                            break;
                    }
                } else {
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent = 'Autosave unavailable';
                    }
                }
            }
        }, constants.AUTOSAVE_INTERVAL);
    };

    /**
     * Persist theme preference (dark/light) to localStorage
     * Allows theme to be restored on next session
     *
     * @param {boolean} isDark - True for dark theme, false for light theme
     * @returns {void}
     *
     * @example
     * persistThemePreference(true); // Save dark theme preference
     */
    const persistThemePreference = (isDark) => {
        if (!window.localStorage) {
            return;
        }
        try {
            localStorage.setItem(constants.THEME_KEY, isDark ? 'dark' : 'light');
        } catch (error) {
            console.error('Theme persistence failed', error);
        }
    };

    /**
     * Clear autosave draft from localStorage
     * Removes both content and filename from storage
     * Called when starting new document or after successful save
     *
     * @returns {void}
     *
     * @example
     * clearAutosaveDraft(); // Removes draft from localStorage
     */
    const clearAutosaveDraft = () => {
        if (!window.localStorage) {
            return;
        }
        try {
            localStorage.removeItem(constants.AUTOSAVE_KEY);
            localStorage.removeItem(constants.AUTOSAVE_FILENAME_KEY);
        } catch (error) {
            console.error('Clearing autosave failed', error);
        }
    };

    /**
     * Clear all autosave data from localStorage
     * Removes content and filename, used when storage quota is exceeded
     *
     * @returns {boolean} True if successful, false if error occurred
     *
     * @example
     * if (clearAllAutosaveData()) {
     *   console.log('Autosave data cleared');
     * }
     */
    const clearAllAutosaveData = () => {
        if (!window.localStorage) {
            return false;
        }
        try {
            localStorage.removeItem(constants.AUTOSAVE_KEY);
            localStorage.removeItem(constants.AUTOSAVE_FILENAME_KEY);
            return true;
        } catch (error) {
            console.error('Clearing all autosave data failed', error);
            return false;
        }
    };

    /**
     * Disable autosave functionality
     * Sets disabled flag, persists to localStorage, and cancels pending saves
     * User can re-enable manually if desired
     *
     * @returns {void}
     *
     * @example
     * disableAutosave(); // Turns off autosave permanently
     */
    const disableAutosave = () => {
        state.autosaveDisabled = true;
        if (window.localStorage) {
            try {
                localStorage.setItem(constants.AUTOSAVE_DISABLED_KEY, 'true');
            } catch (error) {
                console.error('Failed to persist autosave disabled state', error);
            }
        }
        clearTimeout(state.autosaveTimer);
        state.autosaveTimer = null;
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = 'Autosave disabled';
        }
    };

    /**
     * Enable autosave functionality
     * Clears disabled flag and removes from localStorage
     *
     * @returns {void}
     *
     * @example
     * enableAutosave(); // Re-enables autosave
     */
    const enableAutosave = () => {
        state.autosaveDisabled = false;
        if (window.localStorage) {
            try {
                localStorage.removeItem(constants.AUTOSAVE_DISABLED_KEY);
            } catch (error) {
                console.error('Failed to remove autosave disabled state', error);
            }
        }
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = 'Ready';
        }
    };

    /**
     * Check autosave status from localStorage on startup
     * Restores disabled state if user previously disabled autosave
     *
     * @returns {void}
     *
     * @example
     * // Called during initialization
     * checkAutosaveStatus(); // Restores user preference
     */
    const checkAutosaveStatus = () => {
        if (!window.localStorage) {
            return;
        }
        try {
            const disabled = localStorage.getItem(constants.AUTOSAVE_DISABLED_KEY);
            if (disabled === 'true') {
                state.autosaveDisabled = true;
                if (elements.autosaveStatus) {
                    elements.autosaveStatus.textContent = 'Autosave disabled';
                }
            }
        } catch (error) {
            console.error('Failed to check autosave status', error);
        }
    };

    /**
     * Restore autosaved content from localStorage on startup
     * Loads both content and filename if available
     * Only restores non-empty content to avoid overwriting with blank state
     *
     * @returns {void}
     *
     * @example
     * // Called during initialization
     * restoreAutosave(); // Recovers unsaved work
     */
    const restoreAutosave = () => {
        if (!window.localStorage) {
            return;
        }

        const storedContent = localStorage.getItem(constants.AUTOSAVE_KEY);
        const storedFilename = localStorage.getItem(constants.AUTOSAVE_FILENAME_KEY);

        // Only restore if we have actual content (not null, not empty string)
        // Empty string means the editor was cleared, so we shouldn't restore it
        if (storedContent !== null && storedContent !== '' && elements.editor) {
            elements.editor.value = storedContent;
            if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
                MarkdownEditor.preview.updatePreview();
            }
        }

        // Only restore filename if we have actual content to match
        // If content is empty/null, use default filename
        if (
            storedFilename !== null &&
            storedFilename !== '' &&
            storedContent !== null &&
            storedContent !== '' &&
            elements.fileNameDisplay
        ) {
            elements.fileNameDisplay.textContent = storedFilename;
        }

        if (elements.editor) {
            state.lastSavedContent = elements.editor.value;
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(false);
        }
    };

    // Expose public API
    MarkdownEditor.autosave = {
        scheduleAutosave,
        persistThemePreference,
        clearAutosaveDraft,
        clearAllAutosaveData,
        disableAutosave,
        enableAutosave,
        checkAutosaveStatus,
        restoreAutosave
    };

    window.MarkdownEditor = MarkdownEditor;
})();
