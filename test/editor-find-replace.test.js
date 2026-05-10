/**
 * Regression tests for find/replace edge cases.
 */

/* eslint-env jest, node */

const { JSDOM } = require('jsdom');

describe('Find/replace regex handling', () => {
    let dom;
    let editor;
    let findRegex;
    let findInput;
    let replaceInput;

    beforeEach(() => {
        jest.resetModules();

        dom = new JSDOM(
            `<!DOCTYPE html>
            <html>
            <body>
                <textarea id="editor"></textarea>
                <input id="find-input">
                <input id="replace-input">
                <input id="find-regex" type="checkbox">
                <input id="find-case" type="checkbox">
                <input id="find-whole" type="checkbox">
                <span id="find-count"></span>
                <pre id="editor-highlights"></pre>
                <div id="preview"></div>
            </body>
            </html>`,
            { url: 'http://localhost' }
        );

        global.window = dom.window;
        global.document = dom.window.document;
        global.NodeFilter = dom.window.NodeFilter;
        global.requestAnimationFrame = (callback) => callback();
        global.getComputedStyle = dom.window.getComputedStyle;

        editor = document.getElementById('editor');
        findInput = document.getElementById('find-input');
        replaceInput = document.getElementById('replace-input');
        findRegex = document.getElementById('find-regex');

        window.MarkdownEditor = {
            elements: {
                editor,
                findInput,
                replaceInput,
                findRegex,
                findCase: document.getElementById('find-case'),
                findWhole: document.getElementById('find-whole'),
                findCount: document.getElementById('find-count'),
                editorHighlights: document.getElementById('editor-highlights'),
                preview: document.getElementById('preview')
            },
            state: {
                lastSavedContent: ''
            },
            searchState: {
                matches: [],
                current: -1,
                lastIndex: 0,
                freshQuery: false
            },
            utils: {
                escapeHtml: (value) =>
                    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                getSelection: () => ({
                    start: editor.selectionStart,
                    end: editor.selectionEnd,
                    value: editor.value
                }),
                updateCounters: jest.fn()
            },
            preview: {
                updatePreview: jest.fn()
            },
            stateManager: {
                markDirty: jest.fn()
            },
            autosave: {
                scheduleAutosave: jest.fn()
            },
            history: {
                pushHistory: jest.fn()
            }
        };

        require('../js/editor-find-replace.js');
    });

    afterEach(() => {
        dom.window.close();
        delete global.window;
        delete global.document;
        delete global.NodeFilter;
        delete global.requestAnimationFrame;
        delete global.getComputedStyle;
    });

    test('replaceAll skips zero-length regex matches instead of hanging', () => {
        editor.value = 'aaa';
        findInput.value = 'a*';
        replaceInput.value = 'X';
        findRegex.checked = true;

        const count = window.MarkdownEditor.findReplace.replaceAll();

        expect(count).toBe(1);
        expect(editor.value).toBe('X');
    });

    test('regex capture groups replace the full match in regex mode', () => {
        editor.value = 'foo bar';
        findInput.value = '(foo)';
        replaceInput.value = 'X';
        findRegex.checked = true;

        const count = window.MarkdownEditor.findReplace.replaceAll();

        expect(count).toBe(1);
        expect(editor.value).toBe('X bar');
    });
});
