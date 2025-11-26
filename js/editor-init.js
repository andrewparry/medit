/*
 * Markdown Editor - Initialization Module
 * Orchestrates all modules and binds events
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, state } = MarkdownEditor;

    /**
     * Handle input in editor
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
     * Bind all events
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
     * Parse file path from URL hash
     * Supports formats: #/path/to/file.md or #file:///path/to/file.md
     */
    const parseHashPath = () => {
        const hash = location.hash;
        // Return null if no hash or hash is just '#'
        if (!hash || hash.length <= 1) {
            return null;
        }

        try {
            // Remove leading # and decode
            const decoded = decodeURIComponent(hash.slice(1));
            const trimmed = decoded.trim();
            // Return null if empty or whitespace-only
            return trimmed || null;
        } catch (error) {
            // If decoding fails, return raw hash without #
            const trimmed = hash.slice(1).trim();
            // Return null if empty or whitespace-only
            return trimmed || null;
        }
    };

    /**
     * Validate if a path looks like a valid file path format
     */
    const isValidPathFormat = (path) => {
        if (!path || !path.trim()) {
            return false;
        }
        const trimmed = path.trim();
        // Check if it matches expected formats: http://, https://, /, or file://
        return (
            trimmed.startsWith('http://') ||
            trimmed.startsWith('https://') ||
            trimmed.startsWith('/') ||
            trimmed.startsWith('file://')
        );
    };

    /**
     * Load file from query parameter (path=...)
     * Used when server.py serves files via /file endpoint
     */
    const loadFileFromQueryParam = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const filePath = params.get('path');

            if (!filePath || !filePath.trim()) {
                return false;
            }

            // Check if required modules are available
            if (!MarkdownEditor.fileOps || !MarkdownEditor.fileOps.loadFileContent) {
                return false;
            }

            // Use the server's /file endpoint to load the file
            const trimmedPath = filePath.trim();
            const encodedPath = encodeURIComponent(trimmedPath);
            const serverUrl = `/file?path=${encodedPath}`;

            if (elements.autosaveStatus) {
                elements.autosaveStatus.textContent = 'Loading file...';
            }

            try {
                const response = await fetch(serverUrl);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const content = await response.text();

                // Validate file size
                const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
                if (content.length > MAX_FILE_SIZE) {
                    if (elements.autosaveStatus) {
                        elements.autosaveStatus.textContent = 'File too large';
                    }
                    if (MarkdownEditor.dialogs) {
                        await MarkdownEditor.dialogs.alertDialog(
                            `File size exceeds 10MB limit. File is ${(content.length / 1024 / 1024).toFixed(2)}MB.`,
                            'File Too Large'
                        );
                    }
                    return false;
                }

                // Extract filename from path
                const pathParts = filePath.trim().replace(/\\/g, '/').split('/');
                const filename = pathParts[pathParts.length - 1] || 'Untitled.md';
                const finalFilename =
                    filename.endsWith('.md') || filename.endsWith('.markdown')
                        ? filename
                        : `${filename}.md`;

                // Load the content into the editor using the existing loadFileContent function
                if (MarkdownEditor.fileOps && MarkdownEditor.fileOps.loadFileContent) {
                    MarkdownEditor.fileOps.loadFileContent(content, finalFilename, filePath.trim());
                } else {
                    return false;
                }

                return true;
            } catch (error) {
                // Error loading file from server
                if (elements.autosaveStatus) {
                    elements.autosaveStatus.textContent = 'Failed to load file';
                }
                let errorMessage = 'Unable to load the file from the server.';
                if (error.message) {
                    errorMessage += ` ${error.message}`;
                }
                if (MarkdownEditor.dialogs) {
                    await MarkdownEditor.dialogs.alertDialog(errorMessage, 'Error Loading File');
                } else {
                    alert(errorMessage);
                }
                return false;
            }
        } catch (error) {
            // Unexpected error during query param loading
            return false;
        }
    };

    /**
     * Load file from URL hash if present
     */
    const loadFileFromHash = async () => {
        const filePath = parseHashPath();
        if (!filePath) {
            return false;
        }

        // Validate that the path looks like a valid file path before attempting to load
        const trimmedPath = filePath.trim();
        if (!trimmedPath) {
            return false;
        }

        // Validate path format before attempting to load
        if (!isValidPathFormat(trimmedPath)) {
            // Silently skip invalid paths - don't show error for hash fragments that aren't file paths
            return false;
        }

        // Check if fileOps module is available
        if (!MarkdownEditor.fileOps || !MarkdownEditor.fileOps.loadFileFromPath) {
            return false;
        }

        try {
            const loaded = await MarkdownEditor.fileOps.loadFileFromPath(filePath);
            return loaded;
        } catch (error) {
            // Error handling is done in loadFileFromPath
            return false;
        }
    };

    /**
     * Initialize the editor
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
        // Try to load file from query parameter first (server.py /file endpoint)
        // Then try URL hash, then restore autosave
        // Priority: query param > hash > autosave
        let fileLoaded = false;

        // Check if there's a query parameter to load
        const hasQueryParam = window.location.search && window.location.search.includes('path=');

        try {
            // First, try loading from query parameter (path=...)
            // This is used when server.py serves files
            if (hasQueryParam) {
                const queryFileLoaded = await loadFileFromQueryParam();
                if (queryFileLoaded) {
                    fileLoaded = true;
                }
            }
        } catch {
            // Error during query param loading - continue with fallbacks
        }

        // If no file loaded from query param, try hash
        if (!fileLoaded) {
            try {
                if (
                    location.hash &&
                    typeof location.hash === 'string' &&
                    location.hash.length > 1
                ) {
                    // Additional check: ensure hash contains something meaningful (not just '#')
                    const hashContent = location.hash.slice(1).trim();
                    if (hashContent) {
                        fileLoaded = await loadFileFromHash();
                    }
                }
            } catch (error) {
                // Silently ignore errors during hash loading - don't break normal initialization
                // Errors are already handled in loadFileFromHash and loadFileFromPath
            }
        }

        if (MarkdownEditor.autosave) {
            MarkdownEditor.autosave.checkAutosaveStatus();
            // Only restore autosave if no file was loaded from query param or hash
            // This prevents overwriting loaded content
            if (!fileLoaded) {
                MarkdownEditor.autosave.restoreAutosave();
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

        // Set autosave status
        if (elements.autosaveStatus && !MarkdownEditor.state.autosaveDisabled) {
            elements.autosaveStatus.textContent = 'Ready';
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
        bindEvents,
        parseHashPath,
        loadFileFromHash,
        loadFileFromQueryParam
    };

    window.MarkdownEditor = MarkdownEditor;
})();
