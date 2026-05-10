/**
 * Regression tests for editor initialization event binding.
 */

/* eslint-env jest, node */

const { JSDOM } = require('jsdom');

describe('Editor initialization events', () => {
    let dom;
    let editor;
    let handleShortcut;
    let rafCallbacks;

    beforeEach(() => {
        jest.resetModules();
        rafCallbacks = [];

        dom = new JSDOM(
            `<!DOCTYPE html>
            <html>
            <body>
                <div id="formatting-toolbar"></div>
                <button id="toggle-preview"></button>
                <textarea id="editor"></textarea>
                <div id="preview"></div>
            </body>
            </html>`,
            { url: 'http://localhost' }
        );

        global.window = dom.window;
        global.document = dom.window.document;
        global.localStorage = dom.window.localStorage;
        global.Event = dom.window.Event;
        global.KeyboardEvent = dom.window.KeyboardEvent;
        window.requestAnimationFrame = jest.fn((callback) => {
            rafCallbacks.push(callback);
            return rafCallbacks.length;
        });

        editor = document.getElementById('editor');
        handleShortcut = jest.fn();

        window.MarkdownEditor = {
            elements: {
                editor,
                preview: document.getElementById('preview'),
                toolbar: document.getElementById('formatting-toolbar'),
                togglePreviewButton: document.getElementById('toggle-preview')
            },
            state: {
                dirty: false,
                lastSavedContent: ''
            },
            constants: {
                AUTOSAVE_INTERVAL: 1500
            },
            initElements: jest.fn(() => true),
            ui: {
                handleShortcut,
                handleToolbarClick: jest.fn(),
                initializeTheme: jest.fn(),
                initializeResize: jest.fn(),
                recomputeFindBarOffset: jest.fn()
            },
            preview: {
                initializePreviewState: jest.fn(),
                updatePreview: jest.fn()
            },
            autosave: {
                checkAutosaveStatus: jest.fn(),
                restoreAutosave: jest.fn()
            },
            utils: {
                updateDocumentTitle: jest.fn(),
                updateCounters: jest.fn()
            },
            syntaxHighlight: {
                initScrollSync: jest.fn(),
                updateRawHighlights: jest.fn()
            },
            formatting: {
                updateToolbarStates: jest.fn()
            },
            statusManager: {
                setDefaultMessage: jest.fn(),
                showReady: jest.fn(),
                showOperation: jest.fn()
            },
            stateManager: {
                markDirty: jest.fn()
            },
            history: {
                initHistory: jest.fn()
            }
        };

        Object.defineProperty(document, 'readyState', {
            value: 'complete',
            configurable: true
        });

        require('../js/editor-init.js');
        window.MarkdownEditor.preview.updatePreview.mockClear();
        window.MarkdownEditor.syntaxHighlight.updateRawHighlights.mockClear();
        window.MarkdownEditor.utils.updateCounters.mockClear();
    });

    afterEach(() => {
        dom.window.close();
        delete global.window;
        delete global.document;
        delete global.localStorage;
        delete global.Event;
        delete global.KeyboardEvent;
    });

    test('handles bubbling editor keydown shortcuts once', () => {
        editor.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'b',
                ctrlKey: true,
                bubbles: true
            })
        );

        expect(handleShortcut).toHaveBeenCalledTimes(1);
    });

    test('coalesces full-document render work for rapid input events', () => {
        editor.value = '# Updated';

        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('input', { bubbles: true }));

        expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
        expect(window.MarkdownEditor.preview.updatePreview).not.toHaveBeenCalled();
        expect(window.MarkdownEditor.syntaxHighlight.updateRawHighlights).not.toHaveBeenCalled();

        rafCallbacks[0]();

        expect(window.MarkdownEditor.preview.updatePreview).toHaveBeenCalledTimes(1);
        expect(window.MarkdownEditor.syntaxHighlight.updateRawHighlights).toHaveBeenCalledTimes(1);
        expect(window.MarkdownEditor.utils.updateCounters).toHaveBeenCalledTimes(2);
    });
});
