/*
 * Markdown Editor - Dialogs Module
 * Provides accessible dialog utilities for user interactions
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements } = MarkdownEditor;

    /**
     * Show an alert dialog with a message and OK button
     * Creates accessible modal dialog with proper ARIA attributes
     *
     * @param {string} message - The message to display
     * @param {string} [title='Notice'] - Optional title for the dialog
     * @returns {Promise<void>} Resolves when dialog is closed
     *
     * @example
     * await alertDialog('File saved successfully', 'Success');
     */
    const alertDialog = (message, title = 'Notice') =>
        new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'dialog-surface';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            dialog.setAttribute('aria-describedby', 'dialog-message');

            const titleElement = document.createElement('h2');
            titleElement.id = 'dialog-title';
            titleElement.className = 'dialog-label';
            titleElement.textContent = title;
            titleElement.style.marginTop = '0';

            const messageElement = document.createElement('p');
            messageElement.id = 'dialog-message';
            messageElement.className = 'dialog-message';
            messageElement.textContent = message;

            const actions = document.createElement('div');
            actions.className = 'dialog-actions';

            const okButton = document.createElement('button');
            okButton.type = 'button';
            okButton.className = 'dialog-btn dialog-btn-primary';
            okButton.textContent = 'OK';
            okButton.autofocus = true;

            const cleanup = () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.removeChild(overlay);
                if (elements.editor) {
                    elements.editor.focus();
                }
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup();
                    resolve();
                } else if (event.key === 'Enter' && event.target === okButton) {
                    event.preventDefault();
                    cleanup();
                    resolve();
                }
            };

            okButton.addEventListener('click', () => {
                cleanup();
                resolve();
            });

            actions.appendChild(okButton);
            dialog.appendChild(titleElement);
            dialog.appendChild(messageElement);
            dialog.appendChild(actions);
            overlay.appendChild(dialog);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    cleanup();
                    resolve();
                }
            });
            document.body.appendChild(overlay);
            document.addEventListener('keydown', handleKeyDown);

            setTimeout(() => okButton.focus(), 10);
        });

    /**
     * Show a confirmation dialog with customizable buttons
     * Creates accessible modal dialog with confirm/cancel options
     *
     * @param {string} message - The message to display
     * @param {string} [title='Confirm'] - Optional title for the dialog
     * @param {Object} [options={}] - Button label options
     * @param {string} [options.confirmLabel='OK'] - Label for confirm button
     * @param {string} [options.cancelLabel='Cancel'] - Label for cancel button
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     *
     * @example
     * const confirmed = await confirmDialog('Delete file?', 'Confirm', {
     *   confirmLabel: 'Delete',
     *   cancelLabel: 'Keep'
     * });
     */
    const confirmDialog = (message, title = 'Confirm', options = {}) =>
        new Promise((resolve) => {
            const { confirmLabel = 'OK', cancelLabel = 'Cancel' } = options;
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'dialog-surface';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            dialog.setAttribute('aria-describedby', 'dialog-message');

            const titleElement = document.createElement('h2');
            titleElement.id = 'dialog-title';
            titleElement.className = 'dialog-label';
            titleElement.textContent = title;
            titleElement.style.marginTop = '0';

            const messageElement = document.createElement('p');
            messageElement.id = 'dialog-message';
            messageElement.className = 'dialog-message';
            messageElement.textContent = message;

            const actions = document.createElement('div');
            actions.className = 'dialog-actions';

            const cleanup = () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.removeChild(overlay);
                if (elements.editor) {
                    elements.editor.focus();
                }
            };

            const handleChoice = (confirmed) => {
                cleanup();
                resolve(confirmed);
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    handleChoice(false);
                }
            };

            const confirmButton = document.createElement('button');
            confirmButton.type = 'button';
            confirmButton.className = 'dialog-btn dialog-btn-primary';
            confirmButton.textContent = confirmLabel;
            confirmButton.autofocus = true;
            confirmButton.addEventListener('click', () => handleChoice(true));

            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'dialog-btn';
            cancelButton.textContent = cancelLabel;
            cancelButton.addEventListener('click', () => handleChoice(false));

            actions.appendChild(cancelButton);
            actions.appendChild(confirmButton);
            dialog.appendChild(titleElement);
            dialog.appendChild(messageElement);
            dialog.appendChild(actions);
            overlay.appendChild(dialog);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    handleChoice(false);
                }
            });
            document.body.appendChild(overlay);
            document.addEventListener('keydown', handleKeyDown);

            setTimeout(() => confirmButton.focus(), 10);
        });

    /**
     * Show a prompt dialog with a single input field
     * Creates accessible modal dialog with text input
     *
     * @param {string} message - The message/label to display
     * @param {string} [defaultValue=''] - Default value for the input
     * @param {string} [inputType='text'] - Type of input (text, url, number, etc.)
     * @param {string} [title='Input'] - Optional title for the dialog
     * @returns {Promise<string|null>} Input value or null if cancelled
     *
     * @example
     * const filename = await promptDialog('Enter filename', 'Untitled.md', 'text', 'Save As');
     */
    const promptDialog = (message, defaultValue = '', inputType = 'text', title = 'Input') =>
        new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'dialog-surface';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            dialog.setAttribute('aria-describedby', 'dialog-message');

            const titleElement = document.createElement('h2');
            titleElement.id = 'dialog-title';
            titleElement.className = 'dialog-label';
            titleElement.textContent = title;
            titleElement.style.marginTop = '0';

            const form = document.createElement('form');
            form.className = 'dialog-form';

            const messageElement = document.createElement('label');
            messageElement.id = 'dialog-message';
            messageElement.className = 'dialog-label';
            messageElement.textContent = message;
            messageElement.setAttribute('for', 'dialog-input');

            const input = document.createElement('input');
            input.id = 'dialog-input';
            input.type = inputType;
            input.className = 'dialog-input';
            input.value = defaultValue;
            input.setAttribute('aria-describedby', 'dialog-message');
            if (inputType === 'url') {
                input.placeholder = 'https://example.com';
            }

            const actions = document.createElement('div');
            actions.className = 'dialog-actions';

            const cleanup = () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.removeChild(overlay);
                if (elements.editor) {
                    elements.editor.focus();
                }
            };

            const handleSubmit = (value) => {
                cleanup();
                resolve(value);
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    handleCancel();
                }
            };

            const okButton = document.createElement('button');
            okButton.type = 'submit';
            okButton.className = 'dialog-btn dialog-btn-primary';
            okButton.textContent = 'OK';

            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'dialog-btn';
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', handleCancel);

            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const value = input.value.trim();
                handleSubmit(value || defaultValue || null);
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const value = input.value.trim();
                    handleSubmit(value || defaultValue || null);
                }
            });

            messageElement.appendChild(input);
            form.appendChild(messageElement);
            actions.appendChild(cancelButton);
            actions.appendChild(okButton);
            form.appendChild(actions);
            dialog.appendChild(titleElement);
            dialog.appendChild(form);
            overlay.appendChild(dialog);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    handleCancel();
                }
            });
            document.body.appendChild(overlay);
            document.addEventListener('keydown', handleKeyDown);

            setTimeout(() => {
                input.focus();
                input.select();
            }, 10);
        });

    /**
     * Show a multi-field prompt dialog with multiple inputs
     * Creates accessible modal dialog with multiple input fields and optional suggestions
     *
     * @param {Array<Object>} fields - Array of field definitions
     * @param {string} fields[].label - Label for the field
     * @param {string} fields[].defaultValue - Default value
     * @param {string} fields[].inputType - Input type (text, url, number)
     * @param {string} fields[].key - Key for the returned value object
     * @param {boolean} [fields[].required=true] - Whether field is required
     * @param {string} [fields[].helperText] - Optional helper text
     * @param {Array<string>} [fields[].suggestions] - Optional suggestion buttons
     * @param {string} [title='Input'] - Dialog title
     * @returns {Promise<Object|null>} Object with field values keyed by field.key, or null if cancelled
     *
     * @example
     * const result = await multiPromptDialog([
     *   {label: 'URL', key: 'url', inputType: 'url', defaultValue: 'https://'},
     *   {label: 'Text', key: 'text', inputType: 'text', defaultValue: ''}
     * ], 'Insert Link');
     */
    const multiPromptDialog = (fields, title = 'Input') =>
        new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'dialog-surface';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            dialog.setAttribute('aria-describedby', 'dialog-message');

            const titleElement = document.createElement('h2');
            titleElement.id = 'dialog-title';
            titleElement.className = 'dialog-label';
            titleElement.textContent = title;
            titleElement.style.marginTop = '0';

            const form = document.createElement('form');
            form.className = 'dialog-form';

            const messageElement = document.createElement('div');
            messageElement.id = 'dialog-message';
            messageElement.className = 'dialog-message';
            messageElement.style.marginBottom = '0.5rem';

            const inputs = [];
            const inputElements = [];

            fields.forEach((field, index) => {
                const fieldContainer = document.createElement('div');
                fieldContainer.style.display = 'flex';
                fieldContainer.style.flexDirection = 'column';
                fieldContainer.style.gap = '0.3rem';

                const label = document.createElement('label');
                label.className = 'dialog-label';
                label.textContent = field.label;
                label.setAttribute('for', `dialog-input-${index}`);

                const input = document.createElement('input');
                input.id = `dialog-input-${index}`;
                input.type = field.inputType || 'text';
                input.className = 'dialog-input';
                input.value = field.defaultValue || '';
                input.required = field.required !== false;
                if (input.type === 'url') {
                    input.placeholder = 'https://example.com';
                }

                inputs.push({ field, input });
                inputElements.push(input);

                fieldContainer.appendChild(label);
                fieldContainer.appendChild(input);

                if (field.helperText) {
                    const helperText = document.createElement('p');
                    helperText.className = 'dialog-helper-text';
                    helperText.textContent = field.helperText;
                    helperText.style.margin = '0';
                    helperText.style.fontSize = '0.85rem';
                    helperText.style.color = 'var(--color-text-secondary, #666666)';
                    fieldContainer.appendChild(helperText);
                }

                if (Array.isArray(field.suggestions) && field.suggestions.length > 0) {
                    const suggestionWrapper = document.createElement('div');
                    suggestionWrapper.className = 'dialog-suggestion-row';
                    suggestionWrapper.style.display = 'flex';
                    suggestionWrapper.style.flexWrap = 'wrap';
                    suggestionWrapper.style.gap = '0.4rem';

                    field.suggestions
                        .filter((suggestion) => typeof suggestion === 'string' && suggestion.trim())
                        .forEach((suggestion) => {
                            const suggestionButton = document.createElement('button');
                            suggestionButton.type = 'button';
                            suggestionButton.className = 'dialog-suggestion-btn';
                            suggestionButton.textContent = suggestion;
                            suggestionButton.style.padding = '0.25rem 0.55rem';
                            suggestionButton.style.fontSize = '0.85rem';
                            suggestionButton.style.borderRadius = '4px';
                            suggestionButton.style.border =
                                '1px solid var(--color-border, #cccccc)';
                            suggestionButton.style.background =
                                'var(--color-surface-subtle, #f5f5f5)';
                            suggestionButton.style.color = 'inherit';
                            suggestionButton.style.cursor = 'pointer';

                            suggestionButton.addEventListener('click', () => {
                                const rawCurrent =
                                    typeof input.value === 'string' ? input.value.trim() : '';
                                const protocolPattern = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
                                const relativePattern = /^(\.{1,2}\/|\/|#)/;

                                if (!rawCurrent) {
                                    input.value = suggestion;
                                } else if (
                                    protocolPattern.test(rawCurrent) ||
                                    relativePattern.test(rawCurrent)
                                ) {
                                    input.value = suggestion;
                                } else {
                                    const sanitized = rawCurrent
                                        .replace(protocolPattern, '')
                                        .replace(/^\/+/, '');
                                    input.value = `${suggestion}${sanitized}`;
                                }

                                if (typeof input.focus === 'function') {
                                    input.focus();
                                }
                                if (typeof input.setSelectionRange === 'function') {
                                    const newLength = input.value.length;
                                    input.setSelectionRange(newLength, newLength);
                                }
                            });

                            suggestionWrapper.appendChild(suggestionButton);
                        });

                    if (suggestionWrapper.children.length > 0) {
                        fieldContainer.appendChild(suggestionWrapper);
                    }
                }

                form.appendChild(fieldContainer);
            });

            const actions = document.createElement('div');
            actions.className = 'dialog-actions';

            const cleanup = () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.removeChild(overlay);
                if (elements.editor) {
                    elements.editor.focus();
                }
            };

            const handleSubmit = () => {
                const values = {};
                let isValid = true;

                inputs.forEach(({ field, input }, index) => {
                    const value = input.value.trim();
                    if (field.required && !value) {
                        isValid = false;
                        input.focus();
                        input.style.borderColor = 'var(--color-danger)';
                        setTimeout(() => {
                            input.style.borderColor = '';
                        }, 2000);
                    } else {
                        values[field.key || `field${index}`] = value;
                    }
                });

                if (!isValid) {
                    return;
                }

                cleanup();
                resolve(values);
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    handleCancel();
                }
            };

            inputElements.forEach((input, index) => {
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        if (index < inputElements.length - 1) {
                            inputElements[index + 1].focus();
                            inputElements[index + 1].select();
                        } else {
                            handleSubmit();
                        }
                    }
                });
            });

            const okButton = document.createElement('button');
            okButton.type = 'button';
            okButton.className = 'dialog-btn dialog-btn-primary';
            okButton.textContent = 'OK';
            okButton.addEventListener('click', handleSubmit);

            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'dialog-btn';
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', handleCancel);

            form.appendChild(messageElement);
            actions.appendChild(cancelButton);
            actions.appendChild(okButton);
            form.appendChild(actions);
            dialog.appendChild(titleElement);
            dialog.appendChild(form);
            overlay.appendChild(dialog);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    handleCancel();
                }
            });
            document.body.appendChild(overlay);
            document.addEventListener('keydown', handleKeyDown);

            setTimeout(() => {
                if (inputElements.length > 0) {
                    inputElements[0].focus();
                    inputElements[0].select();
                }
            }, 10);
        });

    /**
     * Show unsaved changes dialog with save/discard/cancel options
     * Used when user tries to start new document or open file with unsaved changes
     *
     * @returns {Promise<string>} 'save', 'discard', or 'cancel'
     *
     * @example
     * const choice = await showUnsavedChangesDialog();
     * if (choice === 'save') await saveFile();
     */
    const showUnsavedChangesDialog = () =>
        new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'dialog-surface';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-label', 'Unsaved changes');

            const message = document.createElement('p');
            message.className = 'dialog-message';
            message.textContent = 'You have unsaved changes. Save before starting a new document?';

            const actions = document.createElement('div');
            actions.className = 'dialog-actions';

            const buttons = [
                { label: 'Save', value: 'save', className: 'dialog-btn dialog-btn-primary' },
                { label: "Don't Save", value: 'discard', className: 'dialog-btn' },
                { label: 'Cancel', value: 'cancel', className: 'dialog-btn' }
            ];

            const cleanup = () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.removeChild(overlay);
            };

            const handleChoice = (choice) => {
                cleanup();
                resolve(choice);
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    handleChoice('cancel');
                }
            };

            buttons.forEach((config, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = config.className;
                button.textContent = config.label;
                button.addEventListener('click', () => handleChoice(config.value));
                if (index === 0) {
                    button.autofocus = true;
                }
                actions.appendChild(button);
            });

            dialog.appendChild(message);
            dialog.appendChild(actions);
            overlay.appendChild(dialog);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    handleChoice('cancel');
                }
            });
            document.body.appendChild(overlay);
            document.addEventListener('keydown', handleKeyDown);

            const firstButton = actions.querySelector('button');
            if (firstButton) {
                firstButton.focus();
            }
        });

    /**
     * Show dialog when localStorage quota is exceeded
     * Offers options to clear old drafts, disable autosave, or continue without autosave
     * Only shows once per session to avoid annoying user
     *
     * @returns {Promise<string>} 'clear', 'disable', or 'ignore'
     *
     * @example
     * const choice = await showQuotaExceededDialog();
     * if (choice === 'clear') clearAllAutosaveData();
     */
    const showQuotaExceededDialog = () =>
        new Promise((resolve) => {
            const state = MarkdownEditor.state;

            if (state.quotaExceededShown) {
                resolve('ignored');
                return;
            }
            state.quotaExceededShown = true;

            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'dialog-surface';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'dialog-title');
            dialog.setAttribute('aria-describedby', 'dialog-message');

            const titleElement = document.createElement('h2');
            titleElement.id = 'dialog-title';
            titleElement.className = 'dialog-label';
            titleElement.textContent = 'Storage Full';
            titleElement.style.marginTop = '0';

            const messageElement = document.createElement('p');
            messageElement.id = 'dialog-message';
            messageElement.className = 'dialog-message';
            messageElement.textContent =
                'Autosave storage is full. Would you like to clear old drafts, disable autosave, or continue without autosave?';

            const actions = document.createElement('div');
            actions.className = 'dialog-actions';

            const cleanup = () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.removeChild(overlay);
                if (elements.editor) {
                    elements.editor.focus();
                }
            };

            const handleChoice = (choice) => {
                cleanup();
                resolve(choice);
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    handleChoice('ignore');
                }
            };

            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'dialog-btn';
            clearButton.textContent = 'Clear Drafts';
            clearButton.addEventListener('click', () => handleChoice('clear'));

            const disableButton = document.createElement('button');
            disableButton.type = 'button';
            disableButton.className = 'dialog-btn';
            disableButton.textContent = 'Disable Autosave';
            disableButton.addEventListener('click', () => handleChoice('disable'));

            const ignoreButton = document.createElement('button');
            ignoreButton.type = 'button';
            ignoreButton.className = 'dialog-btn dialog-btn-primary';
            ignoreButton.textContent = 'Continue';
            ignoreButton.autofocus = true;
            ignoreButton.addEventListener('click', () => handleChoice('ignore'));

            actions.appendChild(clearButton);
            actions.appendChild(disableButton);
            actions.appendChild(ignoreButton);
            dialog.appendChild(titleElement);
            dialog.appendChild(messageElement);
            dialog.appendChild(actions);
            overlay.appendChild(dialog);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    handleChoice('ignore');
                }
            });
            document.body.appendChild(overlay);
            document.addEventListener('keydown', handleKeyDown);

            setTimeout(() => ignoreButton.focus(), 10);
        });

    /**
     * Show export options dialog with format choices
     * Presents HTML, PDF/Print, and Plain Text export options
     *
     * @returns {Promise<string|null>} Export format ('html', 'pdf', 'txt') or null if cancelled
     *
     * @example
     * const format = await showExportDialog();
     * if (format === 'html') await exportToHtml();
     */
    const showExportDialog = () =>
        new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'dialog-surface';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-labelledby', 'export-dialog-title');

            const titleElement = document.createElement('h2');
            titleElement.id = 'export-dialog-title';
            titleElement.className = 'dialog-label';
            titleElement.textContent = 'Export Document';
            titleElement.style.marginTop = '0';

            const messageElement = document.createElement('p');
            messageElement.className = 'dialog-message';
            messageElement.textContent = 'Choose an export format:';

            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.flexDirection = 'column';
            buttonContainer.style.gap = '0.5rem';
            buttonContainer.style.marginTop = '0.5rem';

            const formats = [
                { format: 'html', label: 'HTML', icon: '🌐' },
                { format: 'pdf', label: 'PDF / Print', icon: '📄' },
                { format: 'txt', label: 'Plain Text', icon: '📝' }
            ];

            const cleanup = () => {
                document.removeEventListener('keydown', handleKeyDown);
                document.body.removeChild(overlay);
                if (elements.editor) {
                    elements.editor.focus();
                }
            };

            const handleExport = (format) => {
                cleanup();
                resolve(format);
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup();
                    resolve(null);
                }
            };

            formats.forEach(({ format, label, icon }) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'dialog-btn';
                button.style.justifyContent = 'flex-start';
                button.innerHTML = `<span style="margin-right: 0.5rem; font-size: 1.2em;">${icon}</span>${label}`;
                button.addEventListener('click', () => handleExport(format));
                buttonContainer.appendChild(button);
            });

            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'dialog-btn';
            cancelButton.textContent = 'Cancel';
            cancelButton.style.marginTop = '0.5rem';

            const actions = document.createElement('div');
            actions.className = 'dialog-actions';
            actions.style.marginTop = '1rem';
            actions.appendChild(cancelButton);

            dialog.appendChild(titleElement);
            dialog.appendChild(messageElement);
            dialog.appendChild(buttonContainer);
            dialog.appendChild(actions);

            overlay.appendChild(dialog);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    cleanup();
                    resolve(null);
                }
            });

            cancelButton.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            document.body.appendChild(overlay);
            document.addEventListener('keydown', handleKeyDown);

            setTimeout(() => buttonContainer.firstChild?.focus(), 10);
        });

    // Expose public API
    MarkdownEditor.dialogs = {
        alertDialog,
        confirmDialog,
        promptDialog,
        multiPromptDialog,
        showUnsavedChangesDialog,
        showQuotaExceededDialog,
        showExportDialog
    };

    window.MarkdownEditor = MarkdownEditor;
})();
