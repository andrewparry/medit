/*
 * Markdown Editor - File System Access Storage Module (Chromium)
 *
 * Why this exists
 * --------------
 * The browser cannot read/write arbitrary absolute filesystem paths. In Chromium, the
 * File System Access API provides *user-granted* file and directory handles that can
 * be read and written back to disk.
 *
 * This module centralizes everything about:
 * - Feature detection (is the API available?)
 * - Picking files (open/save-as) via the native pickers
 * - Reading/writing text content via handles
 * - Permission checks (query/request)
 * - Optional best-effort persistence hooks (without assuming it always works)
 *
 * IMPORTANT SECURITY / UX NOTES
 * - All picker calls MUST happen in response to a user gesture (click/keyboard).
 * - Permission requests typically also require a user gesture.
 * - Handle persistence is Chromium-only and can fail (private browsing, policies, etc.).
 */
(() => {
    'use strict';

    /**
     * Internal, explicit errors for predictable UI handling.
     * We use `name` so callers can branch without string-matching messages.
     */
    class StorageFsaError extends Error {
        /**
         * @param {string} name - Stable machine-readable error name.
         * @param {string} message - Human-readable message.
         * @param {object} [meta] - Additional metadata for debugging or UI decisions.
         */
        constructor(name, message, meta = undefined) {
            super(message);
            this.name = name;
            this.meta = meta;
        }
    }

    /**
     * Runtime access to window without crashing in Node/Jest.
     * @returns {Window|undefined}
     */
    const getWindow = () => {
        // `globalThis` works in both browsers and Node, but `window` is browser-only.
        if (typeof window !== 'undefined') {
            return window;
        }
        return undefined;
    };

    /**
     * True when Chromium File System Access pickers are available.
     * Note: existence checks only; actual usage can still fail due to permissions/policies.
     * @returns {boolean}
     */
    const isSupported = () => {
        const win = getWindow();
        return !!(
            win &&
            typeof win.showOpenFilePicker === 'function' &&
            typeof win.showSaveFilePicker === 'function'
        );
    };

    /**
     * Build the canonical picker config for Markdown files.
     * Centralized so tests can assert a single, stable shape.
     * @returns {object}
     */
    const buildMarkdownPickerTypes = () => {
        return [
            {
                description: 'Markdown files',
                accept: {
                    'text/markdown': ['.md', '.markdown']
                }
            }
        ];
    };

    /**
     * Validate a file by name and size before reading it into memory.
     * We enforce a maximum size because reading huge files can lock the UI and/or
     * exceed memory constraints.
     *
     * @param {File} file
     * @param {number} maxBytes
     * @returns {void}
     * @throws {StorageFsaError} when validation fails
     */
    const validateMarkdownFile = (file, maxBytes) => {
        if (!file || typeof file.name !== 'string') {
            throw new StorageFsaError('InvalidFile', 'No file selected or file is invalid.');
        }

        if (!/\.(md|markdown)$/i.test(file.name)) {
            throw new StorageFsaError(
                'InvalidFileType',
                'Only Markdown (.md or .markdown) files can be opened.',
                { filename: file.name }
            );
        }

        if (typeof file.size === 'number' && file.size > maxBytes) {
            throw new StorageFsaError('FileTooLarge', 'File size exceeds limit.', {
                filename: file.name,
                maxBytes,
                size: file.size
            });
        }
    };

    /**
     * Query and optionally request permission for a handle.
     *
     * Design goals:
     * - Callers can safely invoke this in non-interactive contexts with allowPrompt=false.
     * - We handle environments where permission methods don't exist by assuming "granted"
     *   only for reads via picker; writes may still fail (callers should catch write errors).
     *
     * @param {any} handle - FileSystemHandle (file or directory)
     * @param {'read'|'readwrite'} mode
     * @param {boolean} allowPrompt - If true, will call requestPermission when needed.
     * @returns {Promise<boolean>}
     */
    const ensurePermission = async (handle, mode = 'readwrite', allowPrompt = false) => {
        if (!handle) {
            return false;
        }

        // Some environments may not expose these methods on the handle prototype.
        const canQuery = typeof handle.queryPermission === 'function';
        const canRequest = typeof handle.requestPermission === 'function';

        // If the browser doesn't support permission querying, we can't proactively know.
        // Returning true keeps UX smooth; actual read/write calls still need try/catch.
        if (!canQuery) {
            return true;
        }

        const descriptor = { mode };
        const state = await handle.queryPermission(descriptor);
        if (state === 'granted') {
            return true;
        }

        // If the state is 'prompt' but we are not allowed to prompt (no user gesture),
        // we must return false so callers can show a "Reconnect" UX.
        if (!allowPrompt) {
            return false;
        }

        if (!canRequest) {
            return false;
        }

        const requested = await handle.requestPermission(descriptor);
        return requested === 'granted';
    };

    /**
     * Ask the user to pick a markdown file and return its handle.
     * @returns {Promise<any>} FileSystemFileHandle
     */
    const pickOpenFileHandle = async () => {
        const win = getWindow();
        if (!win) {
            throw new StorageFsaError('NoWindow', 'Browser window is not available.');
        }
        if (!isSupported()) {
            throw new StorageFsaError(
                'NotSupported',
                'File System Access API is not supported in this browser.'
            );
        }

        const [handle] = await win.showOpenFilePicker({
            types: buildMarkdownPickerTypes(),
            multiple: false
        });

        return handle;
    };

    /**
     * Read a markdown file from a file handle as UTF-8 text.
     * @param {any} fileHandle - FileSystemFileHandle
     * @param {object} options
     * @param {number} options.maxBytes
     * @returns {Promise<{ name: string, content: string, file: File }>}
     */
    const readMarkdownTextFromHandle = async (fileHandle, { maxBytes }) => {
        if (!fileHandle || typeof fileHandle.getFile !== 'function') {
            throw new StorageFsaError('InvalidHandle', 'Selected item is not a readable file.');
        }

        // Read the File object and validate before pulling content into memory.
        const file = await fileHandle.getFile();
        validateMarkdownFile(file, maxBytes);

        const content = await file.text();
        return { name: file.name, content, file };
    };

    /**
     * Ask the user where to save a markdown file (Save As...) and return its handle.
     * @param {object} options
     * @param {string} options.suggestedName
     * @param {any} [options.startIn] - Optional directory handle or well-known string.
     * @returns {Promise<any>} FileSystemFileHandle
     */
    const pickSaveFileHandle = async ({ suggestedName, startIn = undefined }) => {
        const win = getWindow();
        if (!win) {
            throw new StorageFsaError('NoWindow', 'Browser window is not available.');
        }
        if (!isSupported()) {
            throw new StorageFsaError(
                'NotSupported',
                'File System Access API is not supported in this browser.'
            );
        }

        const options = {
            suggestedName,
            types: [
                {
                    description: 'Markdown files',
                    accept: {
                        'text/markdown': ['.md']
                    }
                }
            ]
        };

        // Only set startIn when explicitly provided; otherwise Chromium chooses a sensible default.
        if (startIn) {
            options.startIn = startIn;
        }

        return await win.showSaveFilePicker(options);
    };

    /**
     * Write string content to a file handle.
     * @param {any} fileHandle - FileSystemFileHandle
     * @param {string} content
     * @returns {Promise<void>}
     */
    const writeTextToHandle = async (fileHandle, content) => {
        if (!fileHandle || typeof fileHandle.createWritable !== 'function') {
            throw new StorageFsaError('InvalidHandle', 'No writable file handle available.');
        }
        if (typeof content !== 'string') {
            throw new StorageFsaError('InvalidContent', 'Content must be a string.');
        }

        // The writable stream contract:
        // - createWritable() may prompt for permission depending on handle state
        // - write() accepts string/ArrayBuffer/etc.
        // - close() commits changes to disk
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    };

    // ---- Best-effort handle persistence (Chromium-only) -----------------------
    // We treat persistence as optional because:
    // - Some contexts block IndexedDB
    // - Handle cloning support may be disabled by enterprise policy
    // - In non-Chromium runtimes, handles are not cloneable
    const DB_NAME = 'medit-fsa-storage';
    const DB_VERSION = 1;
    const STORE_NAME = 'kv';
    const KEY_LAST_FILE = 'lastFileHandle';

    /**
     * @returns {IDBFactory|undefined}
     */
    const getIndexedDb = () => {
        const win = getWindow();
        return win && win.indexedDB ? win.indexedDB : undefined;
    };

    /**
     * Open (or create) our IndexedDB database.
     * @returns {Promise<IDBDatabase|null>}
     */
    const openDb = async () => {
        const indexedDb = getIndexedDb();
        if (!indexedDb) {
            return null;
        }

        return await new Promise((resolve, reject) => {
            const req = indexedDb.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    };

    /**
     * Put a value into IndexedDB. Any cloning errors are surfaced to caller.
     * @param {IDBDatabase} db
     * @param {string} key
     * @param {any} value
     * @returns {Promise<void>}
     */
    const idbPut = async (db, key, value) => {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
            tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
        });
    };

    /**
     * Get a value from IndexedDB.
     * @param {IDBDatabase} db
     * @param {string} key
     * @returns {Promise<any>}
     */
    const idbGet = async (db, key) => {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    };

    /**
     * Delete a key from IndexedDB.
     * @param {IDBDatabase} db
     * @param {string} key
     * @returns {Promise<void>}
     */
    const idbDelete = async (db, key) => {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
            tx.onabort = () => reject(tx.error || new Error('IndexedDB delete aborted'));
        });
    };

    // In-memory current handle (the active on-disk file for Save).
    let currentFileHandle = null;

    /**
     * Get the active file handle.
     * @returns {any|null}
     */
    const getCurrentFileHandle = () => currentFileHandle;

    /**
     * Set the active file handle. This does NOT persist automatically.
     * @param {any|null} handle
     */
    const setCurrentFileHandle = (handle) => {
        currentFileHandle = handle || null;
    };

    /**
     * Forget the active file handle.
     */
    const clearCurrentFileHandle = () => {
        currentFileHandle = null;
    };

    /**
     * Persist the active file handle (best-effort).
     * Failures are swallowed and reported as `false` so the editor keeps working.
     *
     * @returns {Promise<boolean>} true if persisted, false otherwise
     */
    const persistCurrentFileHandle = async () => {
        const db = await openDb().catch(() => null);
        if (!db) {
            return false;
        }
        if (!currentFileHandle) {
            // Clear persisted state when there is no active file.
            try {
                await idbDelete(db, KEY_LAST_FILE);
                db.close();
                return true;
            } catch {
                db.close();
                return false;
            }
        }

        try {
            await idbPut(db, KEY_LAST_FILE, currentFileHandle);
            db.close();
            return true;
        } catch {
            // Most likely DataCloneError or policy restrictions.
            db.close();
            return false;
        }
    };

    /**
     * Attempt to restore the last persisted file handle.
     *
     * IMPORTANT:
     * - This does not prompt by default (no user gesture during startup).
     * - If permission is not already granted, it returns null.
     *
     * @param {object} options
     * @param {'read'|'readwrite'} [options.mode]
     * @param {boolean} [options.allowPrompt]
     * @returns {Promise<any|null>}
     */
    const restorePersistedFileHandle = async ({ mode = 'readwrite', allowPrompt = false } = {}) => {
        const db = await openDb().catch(() => null);
        if (!db) {
            return null;
        }

        let handle = null;
        try {
            handle = await idbGet(db, KEY_LAST_FILE);
        } catch {
            // Ignore read errors; treat as "no handle".
            handle = null;
        } finally {
            db.close();
        }

        if (!handle) {
            return null;
        }

        const ok = await ensurePermission(handle, mode, allowPrompt);
        if (!ok) {
            return null;
        }

        currentFileHandle = handle;
        return handle;
    };

    /**
     * Forget the persisted file handle (best-effort).
     * @returns {Promise<void>}
     */
    const forgetPersistedFileHandle = async () => {
        const db = await openDb().catch(() => null);
        if (!db) {
            return;
        }
        try {
            await idbDelete(db, KEY_LAST_FILE);
        } catch {
            // Ignore persistence failures; editor still works without this convenience.
        } finally {
            db.close();
        }
    };

    // Public API for the rest of the application.
    const api = {
        StorageFsaError,
        isSupported,
        buildMarkdownPickerTypes,
        validateMarkdownFile,
        ensurePermission,
        pickOpenFileHandle,
        pickSaveFileHandle,
        readMarkdownTextFromHandle,
        writeTextToHandle,
        getCurrentFileHandle,
        setCurrentFileHandle,
        clearCurrentFileHandle,
        persistCurrentFileHandle,
        restorePersistedFileHandle,
        forgetPersistedFileHandle
    };

    // Attach to the editor namespace for browser runtime usage.
    const win = getWindow();
    if (win) {
        const MarkdownEditor = win.MarkdownEditor || {};
        MarkdownEditor.storageFSA = api;
        win.MarkdownEditor = MarkdownEditor;
    }

    // Also export for Jest/Node tests without bundling.
    // eslint-disable-next-line no-undef
    if (typeof module !== 'undefined' && module.exports) {
        // eslint-disable-next-line no-undef
        module.exports = api;
    }
})();
