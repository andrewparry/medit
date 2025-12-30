/*
 * Markdown Editor - UI Module
 * Handles theme management, resize functionality, keyboard shortcuts, and toolbar actions
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, constants, state } = MarkdownEditor;

    /**
     * Apply theme (dark or light) to the editor interface
     * Updates body classes and dark mode toggle button state
     *
     * @param {boolean} isDark - True for dark theme, false for light theme
     * @returns {void}
     */
    const applyTheme = (isDark) => {
        document.body.classList.toggle('theme-dark', isDark);
        document.body.classList.toggle('theme-light', !isDark);
        if (elements.darkModeToggle) {
            elements.darkModeToggle.setAttribute('aria-checked', isDark);
            const textEl = elements.darkModeToggle.querySelector('.btn-text');
            if (textEl) {
                textEl.textContent = isDark ? 'Light' : 'Dark';
            }
            const iconElement = elements.darkModeToggle.querySelector('.btn-icon');
            if (iconElement) {
                iconElement.textContent = isDark ? '☀️' : '🌙';
            }
        }
    };

    /**
     * Toggle between dark and light themes
     * Applies theme, updates status message, and persists preference
     *
     * @returns {void}
     * @example
     * toggleDarkMode(); // Switches theme and saves preference
     */
    const toggleDarkMode = () => {
        const isDark = !document.body.classList.contains('theme-dark');
        applyTheme(isDark);
        if (MarkdownEditor.statusManager) {
            MarkdownEditor.statusManager.showInfo(isDark ? 'Dark mode on' : 'Dark mode off');
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.persistThemePreference) {
            MarkdownEditor.autosave.persistThemePreference(isDark);
        }
    };

    /**
     * Toggle HTML rendering mode in preview (render vs escape HTML tags)
     * Updates button state, persists preference, and refreshes preview
     *
     * @returns {void}
     * @example
     * toggleHtmlRendering(); // Ctrl+Shift+H - toggles HTML rendering
     */
    const toggleHtmlRendering = () => {
        if (!elements.toggleHtmlButton || !state) {
            return;
        }

        state.renderHtml = !state.renderHtml;
        const isEnabled = state.renderHtml;

        // Update button state
        elements.toggleHtmlButton.setAttribute('aria-pressed', isEnabled);
        elements.toggleHtmlButton.title = isEnabled
            ? 'Disable HTML rendering (Ctrl+Shift+H)'
            : 'Enable HTML rendering (Ctrl+Shift+H)';

        // Update status message
        if (MarkdownEditor.statusManager) {
            MarkdownEditor.statusManager.showInfo(
                isEnabled ? 'HTML rendering enabled' : 'HTML rendering disabled'
            );
        }

        // Persist preference
        if (window.localStorage) {
            try {
                localStorage.setItem('markdown-editor-render-html', isEnabled ? 'true' : 'false');
            } catch (error) {
                console.error('Failed to persist HTML rendering preference', error);
            }
        }

        // Update preview with new rendering mode
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
    };

    /**
     * Initialize theme from localStorage or default
     * Restores user's theme preference from previous session
     *
     * @returns {void}
     * @example
     * initializeTheme(); // Called during startup
     */
    const initializeTheme = () => {
        let isDark = document.body.classList.contains('theme-dark');

        if (window.localStorage) {
            const storedPreference = localStorage.getItem(constants.THEME_KEY);
            if (storedPreference) {
                isDark = storedPreference === 'dark';
            }
        }

        applyTheme(isDark);
    };

    /**
     * Initialize resize handle for editor/preview split pane
     * Sets up drag handlers for mouse, touch, pointer, and keyboard events
     * Restores saved split ratio from localStorage
     *
     * @returns {void}
     * @example
     * initializeResize(); // Called during startup
     */
    const initializeResize = () => {
        if (
            !elements.resizeHandle ||
            !elements.editorPane ||
            !elements.previewPane ||
            !elements.editorContainer
        ) {
            return;
        }

        const setSplitRatio = (ratio) => {
            if (!elements.editorPane || !elements.previewPane) {
                return;
            }
            const editorPercent = Math.max(20, Math.min(80, ratio * 100));
            const previewPercent = 100 - editorPercent;
            elements.editorPane.style.flex = `0 0 ${editorPercent}%`;
            elements.previewPane.style.flex = `0 0 ${previewPercent}%`;
        };

        // Restore saved split ratio
        let splitRatio = 0.5;
        if (window.localStorage) {
            try {
                const saved = localStorage.getItem(constants.SPLIT_RATIO_KEY);
                if (saved !== null) {
                    splitRatio = parseFloat(saved);
                    splitRatio = Math.max(0.2, Math.min(0.8, splitRatio));
                }
            } catch (error) {
                console.error('Failed to restore split ratio', error);
            }
        }

        setSplitRatio(splitRatio);

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        let animationFrameId = null;
        let resizeTimeout = null;

        const startResize = (e) => {
            if (!state.isPreviewVisible) {
                return;
            }

            isResizing = true;
            elements.resizeHandle.classList.add('dragging');
            startX = e.clientX || (e.touches && e.touches[0].clientX);
            startWidth = elements.editorPane.offsetWidth;

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            e.preventDefault();
        };

        const resize = (e) => {
            if (!isResizing) {
                return;
            }

            const currentX = e.clientX || (e.touches && e.touches[0].clientX);
            const diffX = currentX - startX;
            const newWidth = startWidth + diffX;

            const containerWidth = elements.editorContainer.offsetWidth;
            const handleWidth = elements.resizeHandle.offsetWidth;
            const availableWidth = containerWidth - handleWidth;
            const minWidth = availableWidth * 0.2;
            const maxWidth = availableWidth * 0.8;
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            const newRatio = clampedWidth / availableWidth;

            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }

            animationFrameId = requestAnimationFrame(() => {
                setSplitRatio(newRatio);
                animationFrameId = null;
            });

            e.preventDefault();
        };

        const stopResize = () => {
            if (!isResizing) {
                return;
            }

            isResizing = false;
            elements.resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                window.dispatchEvent(new Event('resize'));

                if (window.localStorage && elements.editorPane && elements.editorContainer) {
                    try {
                        const currentRatio =
                            elements.editorPane.offsetWidth / elements.editorContainer.offsetWidth;
                        localStorage.setItem(constants.SPLIT_RATIO_KEY, currentRatio.toString());
                    } catch (error) {
                        console.error('Failed to save split ratio', error);
                    }
                }
            }, 150);
        };

        // Mouse events
        const handleMouseMove = (e) => resize(e);
        const handleMouseUp = () => {
            stopResize();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseleave', handleMouseUp);
        };

        elements.resizeHandle.addEventListener('mousedown', (e) => {
            startResize(e);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mouseleave', handleMouseUp);
        });

        // Touch events
        const handleTouchMove = (e) => resize(e);
        const handleTouchEnd = () => {
            stopResize();
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };

        elements.resizeHandle.addEventListener('touchstart', (e) => {
            startResize(e);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
        });

        // Pointer events
        const handlePointerMove = (e) => resize(e);
        const handlePointerUp = (e) => {
            stopResize();
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
            try {
                if (typeof e?.pointerId === 'number') {
                    elements.resizeHandle.releasePointerCapture(e.pointerId);
                }
            } catch {
                // Ignore pointer capture errors
            }
        };

        elements.resizeHandle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            startResize(e);
            try {
                if (typeof e.pointerId === 'number') {
                    elements.resizeHandle.setPointerCapture(e.pointerId);
                }
            } catch {
                // Ignore pointer capture errors
            }
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            document.addEventListener('pointercancel', handlePointerUp);
        });

        elements.resizeHandle.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
        try {
            elements.resizeHandle.setAttribute('draggable', 'false');
        } catch {
            // Ignore attribute setting errors
        }

        // Keyboard support
        elements.resizeHandle.addEventListener('keydown', (e) => {
            if (!state.isPreviewVisible) {
                return;
            }

            let ratio = 0.5;
            if (window.localStorage) {
                try {
                    const saved = localStorage.getItem(constants.SPLIT_RATIO_KEY);
                    if (saved !== null) {
                        ratio = parseFloat(saved);
                    }
                } catch (error) {
                    // Ignore
                }
            }

            let newRatio = ratio;
            const step = 0.05;

            if (e.key === 'ArrowLeft') {
                newRatio = Math.max(0.2, ratio - step);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                newRatio = Math.min(0.8, ratio + step);
                e.preventDefault();
            } else {
                return;
            }

            setSplitRatio(newRatio);
            if (window.localStorage) {
                try {
                    localStorage.setItem(constants.SPLIT_RATIO_KEY, newRatio.toString());
                } catch (error) {
                    console.error('Failed to save split ratio', error);
                }
            }
        });
    };

    /**
     * Handle formatting action from toolbar or keyboard shortcut
     * Routes action to appropriate formatting function
     *
     * @param {string} action - Formatting action name (e.g., 'bold', 'italic', 'h1')
     * @returns {Promise<void>}
     * @example
     * await handleFormatting('bold'); // Applies bold formatting
     */
    const handleFormatting = async (action) => {
        switch (action) {
            case 'bold':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyInlineFormat('**', '**');
                }
                break;
            case 'italic':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyInlineFormat('*', '*');
                }
                break;
            case 'underline':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyInlineFormat('++', '++');
                }
                break;
            case 'strikethrough':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyInlineFormat('~~', '~~');
                }
                break;
            case 'code':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyInlineFormat('`', '`');
                }
                break;
            case 'blockquote':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyBlockquote();
                }
                break;
            case 'hr':
                if (MarkdownEditor.inserts) {
                    MarkdownEditor.inserts.insertHorizontalRule();
                }
                break;
            case 'h1':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyHeading(1);
                }
                break;
            case 'h2':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyHeading(2);
                }
                break;
            case 'h3':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyHeading(3);
                }
                break;
            case 'h4':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyHeading(4);
                }
                break;
            case 'h5':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyHeading(5);
                }
                break;
            case 'h6':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.applyHeading(6);
                }
                break;
            case 'ul':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.toggleList('ul');
                }
                break;
            case 'ol':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.toggleList('ol');
                }
                break;
            case 'checkbox':
                if (MarkdownEditor.formatting) {
                    MarkdownEditor.formatting.toggleCheckboxList();
                }
                break;
            case 'codeBlock':
                if (MarkdownEditor.formatting) {
                    await MarkdownEditor.formatting.applyCodeBlock();
                }
                break;
            case 'link':
                if (MarkdownEditor.inserts) {
                    MarkdownEditor.inserts.insertLink();
                }
                break;
            case 'image':
                if (MarkdownEditor.inserts) {
                    MarkdownEditor.inserts.insertImage();
                }
                break;
            case 'table':
                if (MarkdownEditor.inserts) {
                    MarkdownEditor.inserts.insertTable();
                }
                break;
            case 'footnote':
                if (MarkdownEditor.inserts) {
                    MarkdownEditor.inserts.insertFootnote();
                }
                break;
            default:
                break;
        }
    };

    /**
     * Handle click events on formatting toolbar buttons
     * Extracts format action from button's data-format attribute
     *
     * @param {MouseEvent} event - Click event from toolbar
     * @returns {void}
     * @example
     * toolbar.addEventListener('click', handleToolbarClick);
     */
    const handleToolbarClick = (event) => {
        const target = event.target.closest('button[data-format]');
        if (!target) {
            return;
        }
        event.preventDefault();
        handleFormatting(target.dataset.format);
    };

    /**
     * Handle keyboard shortcuts for formatting and commands
     * Processes Ctrl/Cmd combinations for formatting, file ops, and navigation
     * Handles Tab/Shift+Tab for list indentation and Enter for smart lists
     *
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {void}
     * @example
     * document.addEventListener('keydown', handleShortcut);
     */
    const handleShortcut = (event) => {
        const key = event.key.toLowerCase();
        const ctrlOrCmd = event.ctrlKey || event.metaKey;

        // Handle Tab and Shift+Tab for list indentation (without Ctrl/Cmd)
        if (key === 'tab' && !ctrlOrCmd) {
            // Check if we're in the editor
            if (document.activeElement === elements.editor) {
                event.preventDefault();

                // Check if we're on a list item
                const { start, value } = MarkdownEditor.utils
                    ? MarkdownEditor.utils.getSelection()
                    : { start: 0, value: '' };
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const lineEnd = value.indexOf('\n', start);
                const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
                const isListItem = /^\s*([-*+]|\d+\.)\s+/.test(currentLine);

                if (isListItem) {
                    // On a list item - use our indent/outdent functions
                    if (event.shiftKey) {
                        if (MarkdownEditor.formatting) {
                            MarkdownEditor.formatting.outdentListItem();
                        }
                    } else {
                        if (MarkdownEditor.formatting) {
                            MarkdownEditor.formatting.indentListItem();
                        }
                    }
                } else {
                    // Not on a list item - insert 2 spaces instead of tab
                    if (!event.shiftKey) {
                        document.execCommand('insertText', false, '  ');
                    }
                }
                return;
            }
        }

        // Handle Enter for smart list continuation
        if (key === 'enter' && !ctrlOrCmd && !event.shiftKey) {
            // Check if we're in the editor
            if (document.activeElement === elements.editor) {
                const handled =
                    MarkdownEditor.formatting && MarkdownEditor.formatting.handleEnterInList();
                if (handled) {
                    event.preventDefault();
                    return;
                }
            }
        }

        // Handle Space for task completion (Ctrl/Cmd+Space)
        if (key === ' ' && ctrlOrCmd && !event.shiftKey) {
            // Check if we're in the editor
            if (document.activeElement === elements.editor) {
                if (MarkdownEditor.formatting && MarkdownEditor.formatting.toggleCheckboxAtCursor) {
                    const handled = MarkdownEditor.formatting.toggleCheckboxAtCursor();
                    if (handled) {
                        event.preventDefault();
                        return;
                    }
                }
            }
        }

        if (!ctrlOrCmd) {
            return;
        }

        if (event.shiftKey) {
            switch (key) {
                case '7':
                    event.preventDefault();
                    handleFormatting('ol');
                    return;
                case '8':
                    event.preventDefault();
                    handleFormatting('ul');
                    return;
                case 'c':
                    event.preventDefault();
                    handleFormatting('codeBlock');
                    return;
                case 'z':
                    event.preventDefault();
                    if (MarkdownEditor.history) {
                        MarkdownEditor.history.redo();
                    }
                    return;
                case 'p':
                    event.preventDefault();
                    if (MarkdownEditor.preview) {
                        MarkdownEditor.preview.togglePreview();
                    }
                    return;
                case 'h':
                    event.preventDefault();
                    if (MarkdownEditor.ui) {
                        MarkdownEditor.ui.toggleHtmlRendering();
                    }
                    return;
                default:
                    break;
            }
        }

        switch (key) {
            case 'f':
                event.preventDefault();
                if (MarkdownEditor.findReplace) {
                    MarkdownEditor.findReplace.openFind();
                }
                break;
            case 'h':
                event.preventDefault();
                if (MarkdownEditor.findReplace) {
                    MarkdownEditor.findReplace.openFind();
                }
                break;
            case 'z':
                event.preventDefault();
                if (MarkdownEditor.history) {
                    MarkdownEditor.history.undo();
                }
                break;
            case 'y':
                event.preventDefault();
                if (MarkdownEditor.history) {
                    MarkdownEditor.history.redo();
                }
                break;
            case 'b':
                event.preventDefault();
                handleFormatting('bold');
                break;
            case 'i':
                event.preventDefault();
                handleFormatting('italic');
                break;
            case 'k':
                event.preventDefault();
                handleFormatting('link');
                break;
            case '1':
                event.preventDefault();
                handleFormatting('h1');
                break;
            case '2':
                event.preventDefault();
                handleFormatting('h2');
                break;
            case '3':
                event.preventDefault();
                handleFormatting('h3');
                break;
            case '4':
                event.preventDefault();
                handleFormatting('h4');
                break;
            case '5':
                event.preventDefault();
                handleFormatting('h5');
                break;
            case '6':
                event.preventDefault();
                handleFormatting('h6');
                break;
            case 's':
                event.preventDefault();
                if (MarkdownEditor.fileOps) {
                    MarkdownEditor.fileOps.saveFile();
                }
                break;
            case 'o':
                event.preventDefault();
                if (MarkdownEditor.fileOps) {
                    MarkdownEditor.fileOps.loadFile();
                }
                break;
            case '`':
                event.preventDefault();
                handleFormatting('code');
                break;
            default:
                break;
        }
    };

    /**
     * Recompute find bar offset based on toolbar height
     * Updates CSS custom property for proper find bar positioning
     * Called on window resize and initialization
     *
     * @returns {void}
     * @example
     * recomputeFindBarOffset(); // Updates find bar position
     */
    const recomputeFindBarOffset = () => {
        const toolbarEl = document.querySelector('.toolbar-section');
        const h = toolbarEl ? toolbarEl.getBoundingClientRect().height : 0;
        document.documentElement.style.setProperty(
            '--toolbar-height',
            `${Math.max(0, Math.round(h))}px`
        );
    };

    /**
     * Open cheat sheet window with all commands and keyboard shortcuts
     * Creates a new window with comprehensive documentation of all features
     * Uses Blob URL to avoid popup blockers
     *
     * @returns {void}
     * @example
     * openCheatSheet(); // Opens help window
     */
    const openCheatSheet = () => {
        // Use Blob URL approach for cleaner HTML
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Editor - Keyboard Shortcuts & Commands</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #1f2a3d;
            background: #f7f9fc;
            padding: 2rem;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 0.65rem;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
            padding: 2rem;
        }
        h1 { color: #2563eb; margin-bottom: 0.5rem; font-size: 2rem; }
        .subtitle { color: #5c6a82; margin-bottom: 2rem; font-size: 0.95rem; }
        .section { margin-bottom: 2.5rem; }
        .section-title {
            font-size: 1.35rem;
            font-weight: 600;
            color: #1f2a3d;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e5e7eb;
        }
        .command-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .command-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: #f9fafb;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
        }
        .command-name { font-weight: 500; color: #1f2a3d; }
        .command-shortcut {
            font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
            font-size: 0.85rem;
            background: #e5e7eb;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            color: #374151;
            font-weight: 600;
        }
        .command-item:hover {
            background: #f3f4f6;
            border-color: #d1d5db;
        }
        .note {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 1rem;
            margin-top: 1rem;
            border-radius: 0.25rem;
            font-size: 0.9rem;
        }
        .note strong { color: #1e40af; }
        .example-box {
            background: #1f2937;
            color: #e5e7eb;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-top: 0.75rem;
            font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
            font-size: 0.85rem;
            line-height: 1.6;
            overflow-x: auto;
        }
        .example-label {
            font-size: 0.75rem;
            color: #9ca3af;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        @media (max-width: 768px) {
            .command-grid { grid-template-columns: 1fr; }
            body { padding: 1rem; }
            .container { padding: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Markdown Editor - Cheat Sheet</h1>
        <p class="subtitle">All keyboard shortcuts and commands</p>

        <div class="section">
            <h2 class="section-title">Text Formatting</h2>
            <div class="command-grid">
                <div class="command-item"><span class="command-name">Bold</span><span class="command-shortcut">Ctrl/Cmd + B</span></div>
                <div class="command-item"><span class="command-name">Italic</span><span class="command-shortcut">Ctrl/Cmd + I</span></div>
                <div class="command-item"><span class="command-name">Underline</span><span class="command-shortcut">Toolbar</span></div>
                <div class="command-item"><span class="command-name">Strikethrough</span><span class="command-shortcut">Toolbar</span></div>
                <div class="command-item"><span class="command-name">Inline Code</span><span class="command-shortcut">Ctrl/Cmd + \`</span></div>
                <div class="command-item"><span class="command-name">Blockquote</span><span class="command-shortcut">Toolbar</span></div>
                <div class="command-item"><span class="command-name">Horizontal Rule</span><span class="command-shortcut">Toolbar</span></div>
            </div>
            <div class="example-box">
                <div class="example-label">Example Markdown:</div>
**bold text**<br>*italic text*<br>++underlined text++<br>~~strikethrough text~~<br>\`inline code\`<br>&gt; Blockquote text<br>---
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Headings</h2>
            <div class="command-grid">
                <div class="command-item"><span class="command-name">Heading 1</span><span class="command-shortcut">Ctrl/Cmd + 1</span></div>
                <div class="command-item"><span class="command-name">Heading 2</span><span class="command-shortcut">Ctrl/Cmd + 2</span></div>
                <div class="command-item"><span class="command-name">Heading 3</span><span class="command-shortcut">Ctrl/Cmd + 3</span></div>
                <div class="command-item"><span class="command-name">Heading 4</span><span class="command-shortcut">Ctrl/Cmd + 4</span></div>
                <div class="command-item"><span class="command-name">Heading 5</span><span class="command-shortcut">Ctrl/Cmd + 5</span></div>
                <div class="command-item"><span class="command-name">Heading 6</span><span class="command-shortcut">Ctrl/Cmd + 6</span></div>
            </div>
            <div class="example-box">
                <div class="example-label">Example Markdown:</div>
# Heading 1<br>## Heading 2<br>### Heading 3<br>#### Heading 4<br>##### Heading 5<br>###### Heading 6
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Lists & Code</h2>
            <div class="command-grid">
                <div class="command-item"><span class="command-name">Bullet List</span><span class="command-shortcut">Ctrl/Cmd + Shift + 8</span></div>
                <div class="command-item"><span class="command-name">Numbered List</span><span class="command-shortcut">Ctrl/Cmd + Shift + 7</span></div>
                <div class="command-item"><span class="command-name">Task List</span><span class="command-shortcut">Toolbar</span></div>
                <div class="command-item"><span class="command-name">Toggle Task</span><span class="command-shortcut">Ctrl/Cmd + Space</span></div>
                <div class="command-item"><span class="command-name">Code Block</span><span class="command-shortcut">Ctrl/Cmd + Shift + C</span></div>
                <div class="command-item"><span class="command-name">Indent List Item</span><span class="command-shortcut">Tab</span></div>
                <div class="command-item"><span class="command-name">Outdent List Item</span><span class="command-shortcut">Shift + Tab</span></div>
            </div>
            <div class="example-box">
                <div class="example-label">Example Markdown:</div>
- Bullet item 1<br>- Bullet item 2<br>  - Nested bullet item<br><br>1. Numbered item 1<br>2. Numbered item 2<br>   1. Nested numbered item<br><br>- [ ] Task item 1<br>- [x] Task item 2 (completed)<br><br>💡 <strong>Tip:</strong> Click checkboxes in preview or press Ctrl/Cmd+Space on a task line to toggle completion.<br><br>\`\`\`javascript<br>function hello() {<br>  console.log("Hello");<br>}<br>\`\`\`
            </div>
            <div class="note"><strong>Tip:</strong> Press Enter in a list to continue the list. Press Enter twice to exit the list.</div>
        </div>

        <div class="section">
            <h2 class="section-title">Inserts</h2>
            <div class="command-grid">
                <div class="command-item"><span class="command-name">Insert Link</span><span class="command-shortcut">Ctrl/Cmd + K</span></div>
                <div class="command-item"><span class="command-name">Insert Image</span><span class="command-shortcut">Toolbar</span></div>
                <div class="command-item"><span class="command-name">Insert Table</span><span class="command-shortcut">Toolbar</span></div>
                <div class="command-item"><span class="command-name">Insert Footnote</span><span class="command-shortcut">Toolbar</span></div>
            </div>
            <div class="example-box">
                <div class="example-label">Example Markdown:</div>
[Link text](https://example.com)<br>![Alt text](https://example.com/image.png)<br><br>| Header 1 | Header 2 |<br>|----------|----------|<br>| Cell 1   | Cell 2   |<br>| Cell 3   | Cell 4   |<br><br>Here is a footnote reference[^1].<br><br>[^1]: This is the footnote content.
            </div>
            <div class="note"><strong>Tip:</strong> Pasting a URL automatically converts it to a markdown link.</div>
        </div>

        <div class="section">
            <h2 class="section-title">View & Navigation</h2>
            <div class="command-grid">
                <div class="command-item"><span class="command-name">Toggle Preview</span><span class="command-shortcut">Ctrl/Cmd + Shift + P</span></div>
                <div class="command-item"><span class="command-name">Toggle HTML Rendering</span><span class="command-shortcut">Ctrl/Cmd + Shift + H</span></div>
                <div class="command-item"><span class="command-name">Find & Replace</span><span class="command-shortcut">Ctrl/Cmd + F</span></div>
                <div class="command-item"><span class="command-name">Find Next</span><span class="command-shortcut">Enter (in find bar)</span></div>
                <div class="command-item"><span class="command-name">Find Previous</span><span class="command-shortcut">Shift + Enter</span></div>
                <div class="command-item"><span class="command-name">Close Find</span><span class="command-shortcut">Escape</span></div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">File Operations</h2>
            <div class="command-grid">
                <div class="command-item"><span class="command-name">New File</span><span class="command-shortcut">Toolbar</span></div>
                <div class="command-item"><span class="command-name">Open File</span><span class="command-shortcut">Ctrl/Cmd + O</span></div>
                <div class="command-item"><span class="command-name">Save File</span><span class="command-shortcut">Ctrl/Cmd + S</span></div>
                <div class="command-item"><span class="command-name">Export and Print</span><span class="command-shortcut">Toolbar</span></div>
                <div class="command-item"><span class="command-name">Toggle Dark Mode</span><span class="command-shortcut">Toolbar</span></div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Edit Operations</h2>
            <div class="command-grid">
                <div class="command-item"><span class="command-name">Undo</span><span class="command-shortcut">Ctrl/Cmd + Z</span></div>
                <div class="command-item"><span class="command-name">Redo</span><span class="command-shortcut">Ctrl/Cmd + Y</span></div>
                <div class="command-item"><span class="command-name">Redo (Alternative)</span><span class="command-shortcut">Ctrl/Cmd + Shift + Z</span></div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Find & Replace</h2>
            <div class="command-grid">
                <div class="command-item"><span class="command-name">Replace One</span><span class="command-shortcut">Ctrl/Cmd + Enter</span></div>
                <div class="command-item"><span class="command-name">Replace All</span><span class="command-shortcut">Toolbar</span></div>
            </div>
            <div class="note"><strong>Find Options:</strong> Case sensitive, Regular expressions, Whole words only</div>
        </div>

        <div class="section">
            <h2 class="section-title">Tips & Notes</h2>
            <div class="note">
                <strong>Auto-save:</strong> Your work is automatically saved to browser storage every 1.5 seconds.<br><br>
                <strong>Filename Editing:</strong> Click on the filename in the status bar to rename it.<br><br>
                <strong>Preview Split:</strong> Drag the resize handle between editor and preview to adjust the split ratio.<br><br>
                <strong>Syntax Highlighting:</strong> Code blocks automatically detect and highlight programming languages.
            </div>
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(
            url,
            'cheatsheet',
            'width=900,height=800,scrollbars=yes,resizable=yes'
        );

        if (win) {
            win.focus();
            // Clean up the URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
            // Fallback if popup is blocked
            alert('Please allow popups to view the cheat sheet.');
        }
    };

    // Expose public API
    MarkdownEditor.ui = {
        applyTheme,
        toggleDarkMode,
        toggleHtmlRendering,
        initializeTheme,
        initializeResize,
        handleFormatting,
        handleToolbarClick,
        handleShortcut,
        recomputeFindBarOffset,
        openCheatSheet
    };

    window.MarkdownEditor = MarkdownEditor;
})();
