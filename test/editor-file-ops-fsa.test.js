/**
 * Integration tests for the in-repo `js/editor-file-ops.js` module with the
 * Chromium File System Access storage layer.
 *
 * Goal:
 * - Validate that the editor uses handles (not server paths) for open/save.
 * - Validate "Save" vs "Save As" behavior based on handle/name matching.
 * - Ensure user-facing state (editor value, filename display, status) updates.
 */

/* eslint-env jest, node */

const { JSDOM } = require('jsdom');

describe('editor-file-ops (File System Access integration)', () => {
    let dom;
    let window;
    let document;

    /**
     * Create a minimal writable stream mock that records written content.
     * @returns {{ write: jest.Mock, close: jest.Mock, _getWritten: () => string }}
     */
    const createWritable = () => {
        let written = '';
        return {
            write: jest.fn(async (data) => {
                written += String(data);
            }),
            close: jest.fn(async () => {}),
            _getWritten: () => written
        };
    };

    /**
     * Create a minimal FileSystemFileHandle-like mock.
     * @param {string} name
     * @param {string} initialContent
     */
    const createFileHandle = (name, initialContent = '') => {
        const writable = createWritable();
        return {
            name,
            kind: 'file',
            getFile: jest.fn(async () => ({
                name,
                size: initialContent.length,
                text: jest.fn(async () => initialContent)
            })),
            createWritable: jest.fn(async () => writable),
            __writable: writable
        };
    };

    beforeEach(() => {
        jest.resetModules();

        dom = new JSDOM(
            `
            <!doctype html>
            <html>
              <body>
                <textarea id="editor"></textarea>
                <div id="preview"></div>
                <input type="file" id="file-input" />
                <button id="open-file"><span class="btn-text">Open</span></button>
                <button id="save-file"><span class="btn-text">Save</span></button>
                <span id="file-name">Untitled.md</span>
                <span id="autosave-status"></span>
              </body>
            </html>
        `,
            { url: 'http://localhost', pretendToBeVisual: true }
        );

        window = dom.window;
        document = window.document;

        global.window = window;
        global.document = document;

        // Provide picker APIs to enable the File System Access path.
        window.showOpenFilePicker = jest.fn();
        window.showSaveFilePicker = jest.fn();

        // Build the minimal MarkdownEditor namespace the module expects.
        window.MarkdownEditor = {
            elements: {
                editor: document.getElementById('editor'),
                preview: document.getElementById('preview'),
                fileInput: document.getElementById('file-input'),
                openButton: document.getElementById('open-file'),
                saveButton: document.getElementById('save-file'),
                fileNameDisplay: document.getElementById('file-name'),
                autosaveStatus: document.getElementById('autosave-status'),
                // Optional elements referenced by the module; keep null to avoid extra setup.
                findBar: null,
                findInput: null,
                replaceInput: null,
                findCount: null,
                toggleFindButton: null,
                editorHighlights: null
            },
            state: {
                autosaveTimer: null,
                dirty: false,
                lastSavedContent: ''
            },
            utils: {
                updateCounters: jest.fn(),
                setSelection: jest.fn()
            },
            dialogs: {
                alertDialog: jest.fn(async () => {}),
                confirmDialog: jest.fn(async () => true),
                promptDialog: jest.fn(async (_msg, defaultValue) => defaultValue)
            },
            history: {
                initHistory: jest.fn()
            },
            stateManager: {
                markDirty: jest.fn(),
                resetSearchState: jest.fn()
            },
            preview: {
                updatePreview: jest.fn()
            },
            formatting: {
                updateToolbarStates: jest.fn()
            },
            autosave: {
                scheduleAutosave: jest.fn(),
                clearAutosaveDraft: jest.fn()
            }
        };

        // Load the storage module first (index.html does this in production).
        // eslint-disable-next-line global-require
        require('../js/editor-storage-fsa.js');
        // Then load file-ops, which reads MarkdownEditor.storageFSA at module init.
        // eslint-disable-next-line global-require
        require('../js/editor-file-ops.js');
    });

    afterEach(() => {
        dom.window.close();
        jest.clearAllMocks();
        delete global.window;
        delete global.document;
    });

    test('loadFile opens via picker, loads content, and sets current handle', async () => {
        const handle = createFileHandle('picked.md', '# Hello');
        window.showOpenFilePicker.mockResolvedValue([handle]);

        await window.MarkdownEditor.fileOps.loadFile();

        expect(window.showOpenFilePicker).toHaveBeenCalled();
        expect(window.MarkdownEditor.elements.editor.value).toBe('# Hello');
        expect(window.MarkdownEditor.elements.fileNameDisplay.textContent).toBe('picked.md');
        expect(window.MarkdownEditor.storageFSA.getCurrentFileHandle()).toBe(handle);
    });

    test('saveFile writes to existing handle without showing save picker when name matches', async () => {
        const handle = createFileHandle('same.md', 'old');
        window.showOpenFilePicker.mockResolvedValue([handle]);
        await window.MarkdownEditor.fileOps.loadFile();

        // Modify editor content to trigger save.
        window.MarkdownEditor.elements.editor.value = 'new content';

        await window.MarkdownEditor.fileOps.saveFile();

        expect(window.showSaveFilePicker).not.toHaveBeenCalled();
        expect(handle.createWritable).toHaveBeenCalled();
        expect(handle.__writable._getWritten()).toBe('new content');
        expect(window.MarkdownEditor.stateManager.markDirty).toHaveBeenCalledWith(false);
    });

    test('saveFile uses Save As (showSaveFilePicker) when display name differs from handle name', async () => {
        const handle = createFileHandle('original.md', 'old');
        window.showOpenFilePicker.mockResolvedValue([handle]);
        await window.MarkdownEditor.fileOps.loadFile();

        window.MarkdownEditor.elements.editor.value = 'content';
        window.MarkdownEditor.elements.fileNameDisplay.textContent = 'renamed.md';

        const newHandle = createFileHandle('renamed.md', '');
        window.showSaveFilePicker.mockResolvedValue(newHandle);

        await window.MarkdownEditor.fileOps.saveFile();

        expect(window.showSaveFilePicker).toHaveBeenCalledWith(
            expect.objectContaining({
                suggestedName: 'renamed.md'
            })
        );
        expect(newHandle.createWritable).toHaveBeenCalled();
        expect(newHandle.__writable._getWritten()).toBe('content');
        expect(window.MarkdownEditor.storageFSA.getCurrentFileHandle()).toBe(newHandle);
        expect(window.MarkdownEditor.elements.fileNameDisplay.textContent).toBe('renamed.md');
    });
});
