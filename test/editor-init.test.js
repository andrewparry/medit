/**
 * Regression tests for editor initialization event binding.
 */

/* eslint-env jest, node */

const { JSDOM } = require('jsdom');

describe('Editor initialization events', () => {
    let dom;
    let editor;
    let handleShortcut;

    beforeEach(() => {
        jest.resetModules();

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

        Object.defineProperty(document, 'readyState', {
            value: 'loading',
            configurable: true
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
                dirty: false
            },
            constants: {
                AUTOSAVE_INTERVAL: 1500
            },
            ui: {
                handleShortcut,
                handleToolbarClick: jest.fn()
            }
        };

        require('../js/editor-init.js');
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
        window.MarkdownEditor.init.bindEvents();

        editor.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'b',
                ctrlKey: true,
                bubbles: true
            })
        );

        expect(handleShortcut).toHaveBeenCalledTimes(1);
    });
});
