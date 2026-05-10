/**
 * Regression tests for autosave restore behavior.
 */

/* eslint-env jest, node */

const { JSDOM } = require('jsdom');

describe('Autosave restore', () => {
    let dom;
    let editor;
    let fileNameDisplay;
    let markDirty;
    let storage;

    const loadAutosaveModule = () => {
        jest.resetModules();

        dom = new JSDOM(
            `<!DOCTYPE html>
            <html>
            <body>
                <textarea id="editor"></textarea>
                <span id="file-name"></span>
            </body>
            </html>`,
            { url: 'http://localhost' }
        );

        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = {
            getItem: jest.fn((key) => storage[key] ?? null),
            setItem: jest.fn((key, value) => {
                storage[key] = value;
            }),
            removeItem: jest.fn((key) => {
                delete storage[key];
            })
        };

        editor = document.getElementById('editor');
        fileNameDisplay = document.getElementById('file-name');
        markDirty = jest.fn((dirty) => {
            window.MarkdownEditor.state.dirty = dirty;
        });

        window.MarkdownEditor = {
            elements: {
                editor,
                fileNameDisplay
            },
            constants: {
                AUTOSAVE_KEY: 'markdown-editor-autosave',
                AUTOSAVE_FILENAME_KEY: 'markdown-editor-filename',
                AUTOSAVE_DISABLED_KEY: 'markdown-editor-autosave-disabled',
                AUTOSAVE_INTERVAL: 1500
            },
            state: {
                dirty: false,
                lastSavedContent: '',
                autosaveDisabled: false,
                autosaveTimer: null
            },
            preview: {
                updatePreview: jest.fn()
            },
            stateManager: {
                markDirty
            }
        };

        require('../js/editor-autosave.js');
    };

    beforeEach(() => {
        storage = {};
    });

    afterEach(() => {
        dom.window.close();
        delete global.window;
        delete global.document;
        delete global.localStorage;
        jest.clearAllMocks();
    });

    test('marks restored non-empty draft dirty and preserves saved baseline', () => {
        storage['markdown-editor-autosave'] = '# Recovered draft';
        storage['markdown-editor-filename'] = 'draft.md';

        loadAutosaveModule();

        window.MarkdownEditor.autosave.restoreAutosave();

        expect(editor.value).toBe('# Recovered draft');
        expect(fileNameDisplay.textContent).toBe('draft.md');
        expect(window.MarkdownEditor.state.lastSavedContent).toBe('');
        expect(markDirty).toHaveBeenCalledWith(true);
    });

    test('marks clean when no draft is restored', () => {
        loadAutosaveModule();
        editor.value = '';

        window.MarkdownEditor.autosave.restoreAutosave();

        expect(window.MarkdownEditor.state.lastSavedContent).toBe('');
        expect(markDirty).toHaveBeenCalledWith(false);
    });
});
