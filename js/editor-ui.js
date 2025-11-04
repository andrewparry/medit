/*
 * Markdown Editor - UI Module
 * Handles theme management, resize functionality, keyboard shortcuts, and toolbar actions
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements, constants, state } = MarkdownEditor;

    /**
     * Apply theme
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
     * Toggle dark mode
     */
    const toggleDarkMode = () => {
        const isDark = !document.body.classList.contains('theme-dark');
        applyTheme(isDark);
        if (elements.autosaveStatus) {
            elements.autosaveStatus.textContent = isDark ? 'Dark mode on' : 'Dark mode off';
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.persistThemePreference) {
            MarkdownEditor.autosave.persistThemePreference(isDark);
        }
    };

    /**
     * Initialize theme
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
     * Initialize resize handle
     */
    const initializeResize = () => {
        if (!elements.resizeHandle || !elements.editorPane || !elements.previewPane || !elements.editorContainer) {
            return;
        }

        const setSplitRatio = (ratio) => {
            if (!elements.editorPane || !elements.previewPane) return;
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
            if (!state.isPreviewVisible) return;
            
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
            if (!isResizing) return;

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
            if (!isResizing) return;
            
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
                        const currentRatio = (elements.editorPane.offsetWidth / elements.editorContainer.offsetWidth);
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
            try { if (typeof e?.pointerId === 'number') elements.resizeHandle.releasePointerCapture(e.pointerId); } catch (_) {}
        };
        
        elements.resizeHandle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            startResize(e);
            try { if (typeof e.pointerId === 'number') elements.resizeHandle.setPointerCapture(e.pointerId); } catch (_) {}
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            document.addEventListener('pointercancel', handlePointerUp);
        });

        elements.resizeHandle.addEventListener('dragstart', (e) => { e.preventDefault(); });
        try { elements.resizeHandle.setAttribute('draggable', 'false'); } catch (_) {}

        // Keyboard support
        elements.resizeHandle.addEventListener('keydown', (e) => {
            if (!state.isPreviewVisible) return;
            
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
     * Handle formatting action
     */
    const handleFormatting = (action) => {
        switch (action) {
            case 'bold':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyInlineFormat('**', '**', 'bold text');
                break;
            case 'italic':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyInlineFormat('*', '*', 'italic text');
                break;
            case 'underline':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyInlineFormat('++', '++', 'underlined text');
                break;
            case 'strikethrough':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyInlineFormat('~~', '~~', 'deleted text');
                break;
            case 'code':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyInlineFormat('`', '`', 'code');
                break;
            case 'blockquote':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyBlockquote();
                break;
            case 'hr':
                if (MarkdownEditor.inserts) MarkdownEditor.inserts.insertHorizontalRule();
                break;
            case 'h1':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyHeading(1);
                break;
            case 'h2':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyHeading(2);
                break;
            case 'h3':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyHeading(3);
                break;
            case 'h4':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyHeading(4);
                break;
            case 'h5':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyHeading(5);
                break;
            case 'h6':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyHeading(6);
                break;
            case 'ul':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.toggleList('ul');
                break;
            case 'ol':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.toggleList('ol');
                break;
            case 'checkbox':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.toggleCheckboxList();
                break;
            case 'codeBlock':
                if (MarkdownEditor.formatting) MarkdownEditor.formatting.applyCodeBlock();
                break;
            case 'link':
                if (MarkdownEditor.inserts) MarkdownEditor.inserts.insertLink();
                break;
            case 'image':
                if (MarkdownEditor.inserts) MarkdownEditor.inserts.insertImage();
                break;
            case 'table':
                if (MarkdownEditor.inserts) MarkdownEditor.inserts.insertTable();
                break;
            case 'footnote':
                if (MarkdownEditor.inserts) MarkdownEditor.inserts.insertFootnote();
                break;
            default:
                break;
        }
    };

    /**
     * Handle toolbar click
     */
    const handleToolbarClick = (event) => {
        const target = event.target.closest('button[data-format]');
        if (!target) {
            return;
        }
        event.preventDefault();
        console.log('Toolbar button clicked:', target.dataset.format);
        handleFormatting(target.dataset.format);
    };

    /**
     * Handle keyboard shortcuts
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
                const { start, value } = MarkdownEditor.utils ? MarkdownEditor.utils.getSelection() : { start: 0, value: '' };
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const lineEnd = value.indexOf('\n', start);
                const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
                const isListItem = /^\s*([-*+]|\d+\.)\s+/.test(currentLine);
                
                if (isListItem) {
                    // On a list item - use our indent/outdent functions
                    if (event.shiftKey) {
                        if (MarkdownEditor.formatting) MarkdownEditor.formatting.outdentListItem();
                    } else {
                        if (MarkdownEditor.formatting) MarkdownEditor.formatting.indentListItem();
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
                const handled = MarkdownEditor.formatting && MarkdownEditor.formatting.handleEnterInList();
                if (handled) {
                    event.preventDefault();
                    return;
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
                    if (MarkdownEditor.history) MarkdownEditor.history.redo();
                    return;
                case 'p':
                    event.preventDefault();
                    if (MarkdownEditor.preview) MarkdownEditor.preview.togglePreview();
                    return;
                default:
                    break;
            }
        }

        switch (key) {
            case 'f':
                event.preventDefault();
                if (MarkdownEditor.findReplace) MarkdownEditor.findReplace.openFind();
                break;
            case 'h':
                event.preventDefault();
                if (MarkdownEditor.findReplace) MarkdownEditor.findReplace.openFind();
                break;
            case 'z':
                event.preventDefault();
                if (MarkdownEditor.history) MarkdownEditor.history.undo();
                break;
            case 'y':
                event.preventDefault();
                if (MarkdownEditor.history) MarkdownEditor.history.redo();
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
                if (MarkdownEditor.fileOps) MarkdownEditor.fileOps.saveFile();
                break;
            case 'o':
                event.preventDefault();
                if (MarkdownEditor.fileOps) MarkdownEditor.fileOps.loadFile();
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
     * Recompute find bar offset
     */
    const recomputeFindBarOffset = () => {
        const toolbarEl = document.querySelector('.toolbar-section');
        const h = toolbarEl ? toolbarEl.getBoundingClientRect().height : 0;
        document.documentElement.style.setProperty('--toolbar-height', `${Math.max(0, Math.round(h))}px`);
    };

    // Expose public API
    MarkdownEditor.ui = {
        applyTheme,
        toggleDarkMode,
        initializeTheme,
        initializeResize,
        handleFormatting,
        handleToolbarClick,
        handleShortcut,
        recomputeFindBarOffset
    };

    window.MarkdownEditor = MarkdownEditor;
})();

