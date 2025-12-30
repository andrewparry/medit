/*
 * Markdown Editor - Initialization Module
 * Orchestrates all modules and binds events
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, state } = MarkdownEditor;

    /**
     * Handle input events in the editor textarea
     * Updates preview, counters, toolbar states, and triggers autosave
     * Debounces history recording and auto-renumbers ordered lists
     *
     * @returns {void}
     * @example
     * editor.addEventListener('input', handleInput);
     */
    const handleInput = () => {
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (MarkdownEditor.utils && MarkdownEditor.utils.updateCounters) {
            MarkdownEditor.utils.updateCounters();
        }
        if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
            MarkdownEditor.formatting.updateToolbarStates();
        }
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = 'Saving draft...';
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(
                elements.editor.value !== MarkdownEditor.state.lastSavedContent
            );
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
        if (MarkdownEditor.history && MarkdownEditor.history.pushHistoryDebounced) {
            MarkdownEditor.history.pushHistoryDebounced();
        }
        if (MarkdownEditor.syntaxHighlight && MarkdownEditor.syntaxHighlight.updateRawHighlights) {
            MarkdownEditor.syntaxHighlight.updateRawHighlights();
        }
        // Auto-renumber ordered lists to keep editor in sync with preview
        if (
            MarkdownEditor.formatting &&
            MarkdownEditor.formatting.renumberAllOrderedListsDebounced
        ) {
            MarkdownEditor.formatting.renumberAllOrderedListsDebounced();
        }
    };

    /**
     * Bind all event listeners for the editor
     * Sets up toolbar clicks, keyboard shortcuts, file operations, find/replace, etc.
     * Should be called once during initialization after DOM elements are ready
     *
     * @returns {void}
     * @example
     * bindEvents(); // Sets up all event handlers
     */
    const bindEvents = () => {
        // Toolbar events
        if (elements.toolbar && MarkdownEditor.ui) {
            elements.toolbar.addEventListener('click', MarkdownEditor.ui.handleToolbarClick);
        }

        // Editor events
        if (elements.editor) {
            elements.editor.addEventListener('input', handleInput);
            elements.editor.addEventListener('selectionchange', () => {
                if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
                    MarkdownEditor.formatting.updateToolbarStates();
                }
            });
            elements.editor.addEventListener('keyup', () => {
                if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
                    MarkdownEditor.formatting.updateToolbarStates();
                }
            });
            elements.editor.addEventListener('mouseup', () => {
                if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
                    MarkdownEditor.formatting.updateToolbarStates();
                }
            });

            // Keyboard shortcuts
            elements.editor.addEventListener('keydown', (event) => {
                if (MarkdownEditor.ui) {
                    MarkdownEditor.ui.handleShortcut(event);
                }
            });

            // Paste event handler for automatic link detection
            elements.editor.addEventListener('paste', (event) => {
                // Only handle if editor is focused
                if (document.activeElement !== elements.editor) {
                    return;
                }

                // Get clipboard data
                const clipboardData = event.clipboardData || window.clipboardData;
                if (!clipboardData) {
                    return;
                }

                // Get plain text from clipboard (ignore HTML/images)
                const pastedText = clipboardData.getData('text/plain');

                // Check if we have URL detection utilities
                if (!MarkdownEditor.utils || !MarkdownEditor.utils.isValidUrl) {
                    return;
                }

                if (!MarkdownEditor.formatting || !MarkdownEditor.formatting.replaceSelection) {
                    return;
                }

                // Check if the pasted text is a valid URL
                if (MarkdownEditor.utils.isValidUrl(pastedText)) {
                    // Prevent default paste behavior
                    event.preventDefault();

                    // Convert URL to markdown link format: [url](url)
                    const originalUrl = pastedText.trim();
                    let linkUrl = originalUrl;

                    // If URL doesn't have a protocol, add https:// for the href
                    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(linkUrl)) {
                        linkUrl = `https://${linkUrl}`;
                    }

                    // Use original text as display text, full URL as href
                    const linkMarkdown = `[${originalUrl}](${linkUrl})`;

                    // Insert the markdown link using replaceSelection
                    MarkdownEditor.formatting.replaceSelection(linkMarkdown, linkMarkdown.length);

                    // Show brief status message
                    if (elements.autosaveStatus) {
                        const originalStatus = elements.autosaveStatus.textContent;
                        elements.autosaveStatus.textContent = 'Link created';
                        setTimeout(() => {
                            if (elements.autosaveStatus) {
                                elements.autosaveStatus.textContent = originalStatus;
                            }
                        }, 2000);
                    }
                }
                // If not a URL, allow default paste behavior
            });
        }

        // Document-level keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (MarkdownEditor.ui) {
                MarkdownEditor.ui.handleShortcut(event);
            }
        });

        // Preview toggle
        if (elements.togglePreviewButton && MarkdownEditor.preview) {
            elements.togglePreviewButton.addEventListener(
                'click',
                MarkdownEditor.preview.togglePreview
            );
        }

        // File operations
        if (elements.newButton && MarkdownEditor.fileOps) {
            elements.newButton.addEventListener('click', MarkdownEditor.fileOps.handleNewDocument);
        }
        if (elements.openButton && MarkdownEditor.fileOps) {
            elements.openButton.addEventListener('click', MarkdownEditor.fileOps.loadFile);
        }
        if (elements.saveButton && MarkdownEditor.fileOps) {
            elements.saveButton.addEventListener('click', MarkdownEditor.fileOps.saveFile);
        }
        if (elements.exportButton && MarkdownEditor.fileOps) {
            elements.exportButton.addEventListener('click', MarkdownEditor.fileOps.handleExport);
        }

        // Dark mode toggle
        if (elements.darkModeToggle && MarkdownEditor.ui) {
            elements.darkModeToggle.addEventListener('click', MarkdownEditor.ui.toggleDarkMode);
        }

        // HTML rendering toggle
        if (elements.toggleHtmlButton && MarkdownEditor.ui) {
            elements.toggleHtmlButton.addEventListener(
                'click',
                MarkdownEditor.ui.toggleHtmlRendering
            );
        }

        // Help button
        if (elements.helpButton && MarkdownEditor.ui) {
            elements.helpButton.addEventListener('click', MarkdownEditor.ui.openCheatSheet);
        }

        // Toolbar icon (version info)
        if (elements.toolbarIconWrapper && MarkdownEditor.version) {
            elements.toolbarIconWrapper.addEventListener(
                'click',
                MarkdownEditor.version.showVersionInfo
            );
            // Also support keyboard activation
            elements.toolbarIconWrapper.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    MarkdownEditor.version.showVersionInfo();
                }
            });
        }

        // Filename editing
        if (elements.fileNameDisplay && MarkdownEditor.utils) {
            elements.fileNameDisplay.addEventListener(
                'click',
                MarkdownEditor.utils.handleFilenameEdit
            );
            elements.fileNameDisplay.addEventListener('keydown', (event) => {
                if (elements.fileNameDisplay.isContentEditable) {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        MarkdownEditor.utils.finalizeFilename();
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        elements.fileNameDisplay.textContent =
                            elements.fileNameDisplay.dataset.originalName ||
                            elements.fileNameDisplay.textContent;
                        MarkdownEditor.utils.finalizeFilename();
                    }
                } else if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    MarkdownEditor.utils.handleFilenameEdit();
                }
            });
            elements.fileNameDisplay.addEventListener(
                'blur',
                MarkdownEditor.utils.finalizeFilename
            );
        }

        // File input change
        if (elements.fileInput && MarkdownEditor.fileOps) {
            elements.fileInput.addEventListener('change', (event) => {
                const [file] = event.target.files;
                if (file) {
                    MarkdownEditor.fileOps.readFile(file);
                }
                elements.fileInput.value = '';
            });
        }

        // Before unload warning
        window.addEventListener('beforeunload', (event) => {
            if (MarkdownEditor.state && MarkdownEditor.state.dirty) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        // Storage changes
        window.addEventListener('storage', (event) => {
            if (
                event.key === MarkdownEditor.constants.AUTOSAVE_KEY &&
                event.newValue !== elements.editor.value
            ) {
                if (elements.autosaveStatus) {
                    elements.autosaveStatus.textContent = 'Remote change detected';
                }
            }
        });

        // Window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (elements.preview) {
                    elements.preview.style.display = 'none';
                    elements.preview.offsetHeight; // Force reflow
                    elements.preview.style.display = '';
                }
                if (MarkdownEditor.ui) {
                    MarkdownEditor.ui.recomputeFindBarOffset();
                }
            }, 100);
        });

        // Find/Replace events
        if (elements.findBar && MarkdownEditor.findReplace) {
            if (elements.findNextBtn) {
                elements.findNextBtn.addEventListener('click', () =>
                    MarkdownEditor.findReplace.findInEditor(1)
                );
            }
            if (elements.findPrevBtn) {
                elements.findPrevBtn.addEventListener('click', () =>
                    MarkdownEditor.findReplace.findInEditor(-1)
                );
            }
            if (elements.toggleFindButton) {
                elements.toggleFindButton.addEventListener('click', () => {
                    if (!elements.findBar.hidden) {
                        MarkdownEditor.findReplace.closeFind(true);
                    } else {
                        MarkdownEditor.findReplace.openFind();
                    }
                });
            }
            if (elements.findInput) {
                elements.findInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        MarkdownEditor.findReplace.findInEditor(e.shiftKey ? -1 : 1);
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        MarkdownEditor.findReplace.closeFind(false);
                    }
                });
                elements.findInput.addEventListener('input', () => {
                    MarkdownEditor.searchState.lastIndex = 0;
                    MarkdownEditor.searchState.freshQuery = true;
                    if (MarkdownEditor.syntaxHighlight) {
                        MarkdownEditor.syntaxHighlight.updateRawHighlights();
                    }
                });
                elements.findInput.addEventListener('blur', () => {
                    const q = elements.findInput.value.trim();
                    if (!q) {
                        return;
                    }
                    MarkdownEditor.searchState.lastIndex = 0;
                    MarkdownEditor.searchState.freshQuery = true;
                    if (MarkdownEditor.syntaxHighlight) {
                        MarkdownEditor.syntaxHighlight.updateRawHighlights();
                    }
                    MarkdownEditor.findReplace.findInEditor(1);
                });
            }

            // Find options
            [elements.findCase, elements.findRegex, elements.findWhole].forEach((el) => {
                if (el) {
                    el.addEventListener('change', () => {
                        MarkdownEditor.searchState.lastIndex = 0;
                        MarkdownEditor.searchState.freshQuery = true;
                        if (MarkdownEditor.syntaxHighlight) {
                            MarkdownEditor.syntaxHighlight.updateRawHighlights();
                        }
                    });
                }
            });

            // Replace events
            if (elements.replaceInput) {
                elements.replaceInput.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
                        e.preventDefault();
                        MarkdownEditor.findReplace.replaceOne();
                    }
                });
            }
            if (elements.replaceOneBtn) {
                elements.replaceOneBtn.addEventListener('click', () =>
                    MarkdownEditor.findReplace.replaceOne()
                );
            }
            if (elements.replaceAllBtn) {
                elements.replaceAllBtn.addEventListener('click', () =>
                    MarkdownEditor.findReplace.replaceAll()
                );
            }
        }
    };

    /**
     * Initialize the markdown editor application
     * Sets up DOM elements, restores state, initializes all modules, and binds events
     * Called automatically when DOM is ready
     *
     * @returns {Promise<void>}
     * @example
     * await initialize(); // Starts the editor
     */
    const initialize = async () => {
        // Initialize DOM elements
        const elementsInitialized = MarkdownEditor.initElements();
        if (!elementsInitialized) {
            console.error('Failed to initialize editor elements');
            return;
        }

        // Initialize modules
        if (MarkdownEditor.ui) {
            MarkdownEditor.ui.initializeTheme();
            MarkdownEditor.ui.initializeResize();
        }
        if (MarkdownEditor.preview) {
            MarkdownEditor.preview.initializePreviewState();
        }

        // Initialize HTML rendering preference
        if (window.localStorage && state) {
            try {
                const stored = localStorage.getItem('markdown-editor-render-html');
                if (stored === 'true') {
                    state.renderHtml = true;
                    if (elements.toggleHtmlButton) {
                        elements.toggleHtmlButton.setAttribute('aria-pressed', 'true');
                        elements.toggleHtmlButton.title = 'Disable HTML rendering (Ctrl+Shift+H)';
                    }
                }
            } catch (error) {
                console.error('Failed to restore HTML rendering preference', error);
            }
        }

        // Restore autosave draft (localStorage) on startup.
        // This is intentionally independent from on-disk handles:
        // - The draft protects against crashes/refreshes even if disk permission is lost.
        // - Disk handles are restored best-effort below (without prompting).
        if (MarkdownEditor.autosave) {
            MarkdownEditor.autosave.checkAutosaveStatus();
            MarkdownEditor.autosave.restoreAutosave();
        }

        // Best-effort restoration of the last on-disk file handle (Chromium-only).
        // We DO NOT prompt on startup because permission prompts require user gesture.
        // If permission is already granted, this reconnects "Save" to the same file.
        let restoredDiskHandleName = null;
        if (
            MarkdownEditor.storageFSA &&
            typeof MarkdownEditor.storageFSA.restorePersistedFileHandle === 'function'
        ) {
            try {
                const handle = await MarkdownEditor.storageFSA.restorePersistedFileHandle({
                    mode: 'readwrite',
                    allowPrompt: false
                });
                restoredDiskHandleName = handle && handle.name ? handle.name : null;
            } catch {
                restoredDiskHandleName = null;
            }
        }
        if (MarkdownEditor.syntaxHighlight) {
            MarkdownEditor.syntaxHighlight.initScrollSync();
        }

        // Initialize toolbar states
        if (MarkdownEditor.formatting && MarkdownEditor.formatting.updateToolbarStates) {
            MarkdownEditor.formatting.updateToolbarStates();
        }

        // Update initial preview and counters
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (MarkdownEditor.utils && MarkdownEditor.utils.updateCounters) {
            MarkdownEditor.utils.updateCounters();
        }

        // Initialize syntax highlighting
        if (MarkdownEditor.syntaxHighlight && MarkdownEditor.syntaxHighlight.updateRawHighlights) {
            MarkdownEditor.syntaxHighlight.updateRawHighlights();
        }

        // Set status bar message.
        // If we successfully reconnected to an on-disk file, reflect that subtly.
        if (elements.autosaveStatus && !MarkdownEditor.state.autosaveDisabled) {
            elements.autosaveStatus.textContent = restoredDiskHandleName
                ? `Ready (disk: ${restoredDiskHandleName})`
                : 'Ready';
        }

        // Initialize history
        if (MarkdownEditor.history && MarkdownEditor.history.initHistory) {
            MarkdownEditor.history.initHistory();
        }

        // Ensure find bar is hidden on startup
        if (elements.findBar) {
            elements.findBar.hidden = true;
        }

        // Initialize toolbar dynamic height
        if (MarkdownEditor.ui && MarkdownEditor.ui.recomputeFindBarOffset) {
            MarkdownEditor.ui.recomputeFindBarOffset();
        }

        // Bind all events
        bindEvents();
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Expose init API
    MarkdownEditor.init = {
        initialize,
        bindEvents
    };

    window.MarkdownEditor = MarkdownEditor;
})();
