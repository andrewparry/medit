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

    // Constants
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

    // DOM element references - initialized on load
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
        helpButton: null
    };

    // Initialize DOM references
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

