/*
 * Markdown Editor - Core Module
 * Provides shared namespace, constants, and DOM element references for all modules
 */
(() => {
    'use strict';

    // Create global namespace
    if (!window.MarkdownEditor) {
        window.MarkdownEditor = {};
    }

    const MarkdownEditor = window.MarkdownEditor;

    /**
     * Application-wide constants
     * @type {Object}
     * @property {string} AUTOSAVE_KEY - LocalStorage key for autosave content
     * @property {string} AUTOSAVE_FILENAME_KEY - LocalStorage key for autosave filename
     * @property {number} AUTOSAVE_INTERVAL - Autosave delay in milliseconds (1.5 seconds)
     * @property {number} HISTORY_LIMIT - Maximum number of undo/redo states to keep
     * @property {number} HISTORY_DEBOUNCE - Debounce delay for history snapshots in milliseconds
     * @property {string} THEME_KEY - LocalStorage key for theme preference
     * @property {string} AUTOSAVE_DISABLED_KEY - LocalStorage key for autosave disabled state
     * @property {string} SPLIT_RATIO_KEY - LocalStorage key for editor/preview split ratio
     */
    MarkdownEditor.constants = {
        AUTOSAVE_KEY: 'markdown-editor-autosave',
        AUTOSAVE_FILENAME_KEY: 'markdown-editor-filename',
        AUTOSAVE_INTERVAL: 1500,
        HISTORY_LIMIT: 100,
        HISTORY_DEBOUNCE: 300,
        THEME_KEY: 'markdown-editor-theme',
        AUTOSAVE_DISABLED_KEY: 'markdown-editor-autosave-disabled',
        SPLIT_RATIO_KEY: 'markdown-editor-split-ratio'
    };

    /**
     * DOM element references - initialized on load via initElements()
     * All elements are null until initElements() is called during application startup
     * @type {Object}
     * @property {HTMLTextAreaElement|null} editor - Main markdown editor textarea
     * @property {HTMLElement|null} preview - Preview pane for rendered markdown
     * @property {HTMLElement|null} editorHighlights - Syntax highlighting overlay for editor
     * @property {HTMLElement|null} toolbar - Formatting toolbar container
     * @property {HTMLButtonElement|null} togglePreviewButton - Button to show/hide preview
     * @property {HTMLElement|null} editorContainer - Container for editor and preview panes
     * @property {HTMLElement|null} resizeHandle - Draggable handle for resizing panes
     * @property {HTMLElement|null} editorPane - Left pane containing the editor
     * @property {HTMLElement|null} previewPane - Right pane containing the preview
     * @property {HTMLButtonElement|null} newButton - New file button
     * @property {HTMLButtonElement|null} openButton - Open file button
     * @property {HTMLButtonElement|null} saveButton - Save file button
     * @property {HTMLButtonElement|null} exportButton - Export file button
     * @property {HTMLInputElement|null} fileInput - Hidden file input for file selection
     * @property {HTMLElement|null} fileNameDisplay - Editable filename display
     * @property {HTMLElement|null} wordCountDisplay - Word count display
     * @property {HTMLElement|null} charCountDisplay - Character count display
     * @property {HTMLElement|null} autosaveStatus - Autosave status message display
     * @property {HTMLButtonElement|null} darkModeToggle - Dark mode toggle button
     * @property {HTMLElement|null} findBar - Find/replace bar container
     * @property {HTMLInputElement|null} findInput - Find text input
     * @property {HTMLButtonElement|null} findPrevBtn - Find previous button
     * @property {HTMLButtonElement|null} findNextBtn - Find next button
     * @property {HTMLElement|null} findCount - Match count display (e.g., "3/10")
     * @property {HTMLInputElement|null} findCase - Case sensitive checkbox
     * @property {HTMLInputElement|null} findRegex - Regex mode checkbox
     * @property {HTMLInputElement|null} findWhole - Whole word checkbox
     * @property {HTMLInputElement|null} replaceInput - Replace text input
     * @property {HTMLButtonElement|null} replaceOneBtn - Replace one button
     * @property {HTMLButtonElement|null} replaceAllBtn - Replace all button
     * @property {HTMLButtonElement|null} toggleFindButton - Toggle find bar button
     * @property {HTMLButtonElement|null} toggleHtmlButton - Toggle HTML rendering button
     * @property {HTMLButtonElement|null} helpButton - Help/cheat sheet button
     * @property {HTMLElement|null} toolbarIconWrapper - Toolbar icon container
     */
    MarkdownEditor.elements = {
        editor: null,
        preview: null,
        editorHighlights: null,
        toolbar: null,
        togglePreviewButton: null,
        editorContainer: null,
        resizeHandle: null,
        editorPane: null,
        previewPane: null,
        newButton: null,
        openButton: null,
        saveButton: null,
        exportButton: null,
        fileInput: null,
        fileNameDisplay: null,
        wordCountDisplay: null,
        charCountDisplay: null,
        autosaveStatus: null,
        darkModeToggle: null,
        findBar: null,
        findInput: null,
        findPrevBtn: null,
        findNextBtn: null,
        findCount: null,
        findCase: null,
        findRegex: null,
        findWhole: null,
        replaceInput: null,
        replaceOneBtn: null,
        replaceAllBtn: null,
        toggleFindButton: null,
        toggleHtmlButton: null,
        helpButton: null,
        toolbarIconWrapper: null
    };

    /**
     * Initialize DOM element references
     * Queries the DOM for all required elements and stores references in MarkdownEditor.elements
     * Should be called once during application initialization before any other modules
     *
     * @returns {boolean} True if critical elements (editor, preview) were found, false otherwise
     * @throws {Error} Logs error to console if critical elements are missing
     *
     * @example
     * // Called during app initialization
     * if (!MarkdownEditor.initElements()) {
     *   console.error('Failed to initialize editor');
     * }
     */
    MarkdownEditor.initElements = () => {
        const els = MarkdownEditor.elements;

        els.editor = document.getElementById('editor');
        els.preview = document.getElementById('preview');
        els.editorHighlights = document.getElementById('editor-highlights');
        els.toolbar = document.getElementById('formatting-toolbar');
        els.togglePreviewButton = document.getElementById('toggle-preview');
        els.editorContainer = document.querySelector('.editor-container');
        els.resizeHandle = document.getElementById('resize-handle');
        els.editorPane = document.querySelector('.editor-pane');
        els.previewPane = document.querySelector('.preview-pane');
        els.newButton = document.getElementById('new-file');
        els.openButton = document.getElementById('open-file');
        els.saveButton = document.getElementById('save-file');
        els.exportButton = document.getElementById('export-file');
        els.fileInput = document.getElementById('file-input');
        els.fileNameDisplay = document.getElementById('file-name');
        els.wordCountDisplay = document.getElementById('word-count');
        els.charCountDisplay = document.getElementById('char-count');
        els.autosaveStatus = document.getElementById('autosave-status');
        els.darkModeToggle = document.getElementById('dark-mode-toggle');
        els.findBar = document.getElementById('find-bar');
        els.findInput = document.getElementById('find-input');
        els.findPrevBtn = document.getElementById('find-prev');
        els.findNextBtn = document.getElementById('find-next');
        els.findCount = document.getElementById('find-count');
        els.findCase = document.getElementById('find-case');
        els.findRegex = document.getElementById('find-regex');
        els.findWhole = document.getElementById('find-whole');
        els.replaceInput = document.getElementById('replace-input');
        els.replaceOneBtn = document.getElementById('replace-one');
        els.replaceAllBtn = document.getElementById('replace-all');
        els.toggleFindButton = document.getElementById('toggle-find');
        els.toggleHtmlButton = document.getElementById('toggle-html');
        els.helpButton = document.getElementById('help-button');
        els.toolbarIconWrapper = document.getElementById('toolbar-icon-wrapper');

        // Check if critical elements exist
        if (!els.editor || !els.preview) {
            console.error('Critical editor elements not found');
            return false;
        }

        return true;
    };

    // Update global namespace
    window.MarkdownEditor = MarkdownEditor;
})();
