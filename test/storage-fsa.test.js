/**
 * Unit tests for the File System Access storage layer.
 *
 * These tests intentionally avoid real browser pickers and instead validate:
 * - Feature detection
 * - Picker option shapes
 * - Permission flow decisions
 * - Read/write mechanics against mocked handles
 * - Best-effort persistence behavior when IndexedDB is unavailable (Node/Jest)
 */

/* eslint-env jest, node */

describe('storageFSA (File System Access storage)', () => {
    let storage;

    beforeEach(() => {
        jest.resetModules();

        // Fresh, minimal "browser" global.
        global.window = {
            MarkdownEditor: {}
        };

        // Load the module after window is defined so it can attach to the namespace.
        // eslint-disable-next-line global-require
        storage = require('../js/editor-storage-fsa.js');
    });

    afterEach(() => {
        delete global.window;
        jest.clearAllMocks();
    });

    test('isSupported returns false when pickers are missing', () => {
        expect(storage.isSupported()).toBe(false);
    });

    test('isSupported returns true when pickers exist', () => {
        global.window.showOpenFilePicker = jest.fn();
        global.window.showSaveFilePicker = jest.fn();
        expect(storage.isSupported()).toBe(true);
    });

    test('pickOpenFileHandle calls showOpenFilePicker with markdown types', async () => {
        const mockHandle = { name: 'test.md', kind: 'file' };
        global.window.showOpenFilePicker = jest.fn().mockResolvedValue([mockHandle]);
        global.window.showSaveFilePicker = jest.fn();

        const handle = await storage.pickOpenFileHandle();

        expect(handle).toBe(mockHandle);
        expect(global.window.showOpenFilePicker).toHaveBeenCalledWith({
            types: storage.buildMarkdownPickerTypes(),
            multiple: false
        });
    });

    test('validateMarkdownFile rejects non-markdown extensions', () => {
        const file = { name: 'notes.txt', size: 1 };
        expect(() => storage.validateMarkdownFile(file, 10)).toThrow(storage.StorageFsaError);
        try {
            storage.validateMarkdownFile(file, 10);
        } catch (e) {
            expect(e.name).toBe('InvalidFileType');
        }
    });

    test('validateMarkdownFile rejects files larger than maxBytes', () => {
        const file = { name: 'big.md', size: 11 };
        expect(() => storage.validateMarkdownFile(file, 10)).toThrow(storage.StorageFsaError);
        try {
            storage.validateMarkdownFile(file, 10);
        } catch (e) {
            expect(e.name).toBe('FileTooLarge');
            expect(e.meta).toEqual(
                expect.objectContaining({
                    filename: 'big.md',
                    maxBytes: 10,
                    size: 11
                })
            );
        }
    });

    test('readMarkdownTextFromHandle reads text and returns name/content', async () => {
        const file = {
            name: 'doc.md',
            size: 5,
            text: jest.fn().mockResolvedValue('# Hi')
        };
        const handle = {
            name: 'doc.md',
            kind: 'file',
            getFile: jest.fn().mockResolvedValue(file)
        };

        const result = await storage.readMarkdownTextFromHandle(handle, { maxBytes: 100 });

        expect(handle.getFile).toHaveBeenCalled();
        expect(file.text).toHaveBeenCalled();
        expect(result).toEqual({ name: 'doc.md', content: '# Hi', file });
    });

    test('ensurePermission returns true when queryPermission grants', async () => {
        const handle = {
            queryPermission: jest.fn().mockResolvedValue('granted')
        };
        await expect(storage.ensurePermission(handle, 'readwrite', false)).resolves.toBe(true);
        expect(handle.queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });

    test('ensurePermission returns false when prompt is required and allowPrompt=false', async () => {
        const handle = {
            queryPermission: jest.fn().mockResolvedValue('prompt'),
            requestPermission: jest.fn()
        };
        await expect(storage.ensurePermission(handle, 'readwrite', false)).resolves.toBe(false);
        expect(handle.requestPermission).not.toHaveBeenCalled();
    });

    test('ensurePermission requests permission when allowPrompt=true', async () => {
        const handle = {
            queryPermission: jest.fn().mockResolvedValue('prompt'),
            requestPermission: jest.fn().mockResolvedValue('granted')
        };
        await expect(storage.ensurePermission(handle, 'readwrite', true)).resolves.toBe(true);
        expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
    });

    test('writeTextToHandle writes content and closes the writable stream', async () => {
        const writable = {
            write: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined)
        };
        const handle = {
            createWritable: jest.fn().mockResolvedValue(writable)
        };

        await storage.writeTextToHandle(handle, 'hello');

        expect(handle.createWritable).toHaveBeenCalled();
        expect(writable.write).toHaveBeenCalledWith('hello');
        expect(writable.close).toHaveBeenCalled();
    });

    test('persistence functions are safe no-ops when IndexedDB is unavailable', async () => {
        // In Node/Jest we typically do not have indexedDB on window.
        storage.setCurrentFileHandle({ name: 'x.md' });

        await expect(storage.persistCurrentFileHandle()).resolves.toBe(false);
        await expect(storage.restorePersistedFileHandle()).resolves.toBeNull();
        await expect(storage.forgetPersistedFileHandle()).resolves.toBeUndefined();
    });
});
