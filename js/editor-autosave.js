/*
 * Markdown Editor - Autosave Module
 * Manages automatic saving and localStorage operations
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, constants, state } = MarkdownEditor;

    /**
     * Schedule autosave operation
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
     * Persist theme preference to localStorage
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
     * Clear all autosave data
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
     * Disable autosave
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
     * Enable autosave
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
     * Check autosave status from localStorage
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
     * Restore autosaved content
     */
    const restoreAutosave = () => {
        if (!window.localStorage) {
            return;
        }

        const storedContent = localStorage.getItem(constants.AUTOSAVE_KEY);
        const storedFilename = localStorage.getItem(constants.AUTOSAVE_FILENAME_KEY);

        if (storedContent !== null && elements.editor) {
            elements.editor.value = storedContent;
            if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
                MarkdownEditor.preview.updatePreview();
            }
        }

        if (storedFilename !== null && elements.fileNameDisplay) {
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
