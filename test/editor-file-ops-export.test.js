/**
 * Regression tests for file export output.
 */

/* eslint-env jest, node */

const { JSDOM } = require('jsdom');

describe('File export', () => {
    let dom;
    let editor;
    let fileNameDisplay;
    let createObjectURL;

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();

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

        createObjectURL = jest.fn(() => 'blob:export');
        global.URL = {
            createObjectURL,
            revokeObjectURL: jest.fn()
        };

        editor = document.getElementById('editor');
        fileNameDisplay = document.getElementById('file-name');

        window.markedLite = {
            parse: jest.fn(() => '<p>Rendered</p>')
        };
        window.simpleSanitizer = {
            sanitize: jest.fn((html) => html)
        };

        window.MarkdownEditor = {
            elements: {
                editor,
                fileNameDisplay
            },
            state: {
                renderHtml: false
            },
            dialogs: {
                alertDialog: jest.fn()
            }
        };

        require('../js/editor-file-ops.js');
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        dom.window.close();
        delete global.window;
        delete global.document;
        delete global.URL;
    });

    test('escapes the document title in exported HTML', async () => {
        editor.value = '# Content';
        fileNameDisplay.textContent = '</title><script>alert(1)</script>.md';

        await window.MarkdownEditor.fileOps.exportToHtml();

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        const [blob] = createObjectURL.mock.calls[0];
        const html = await blob.text();

        expect(html).toContain(
            '<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>'
        );
        expect(html).not.toContain('<title></title><script>alert(1)</script>');
    });
});
