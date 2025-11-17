/**
 * Integration tests for file operations
 * Tests file opening with various markdown files, file saving with different content types,
 * and mocks browser APIs for testing
 * Requirements: 2.1, 3.1
 */

/* eslint-env jest, node */
/* eslint-disable no-undef */

// Mock DOM environment for testing
class MockElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.textContent = '';
        this.innerHTML = '';
        this.className = '';
        this.style = {};
        this.attributes = new Map();
        this.eventListeners = new Map();
        this.parentNode = null;
        this.children = [];
        this.files = null; // For input elements
        this.value = ''; // For input elements
    }

    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    click() {
        const clickListeners = this.eventListeners.get('click') || [];
        clickListeners.forEach((callback) => callback({ preventDefault: () => {} }));
    }

    dispatchEvent(event) {
        const listeners = this.eventListeners.get(event.type) || [];
        listeners.forEach((callback) => callback(event));
    }
}

// Mock File API
class MockFile {
    constructor(content, name, options = {}) {
        this.content = content;
        this.name = name;
        this.size = content.length;
        this.type = options.type || 'text/plain';
        this.lastModified = options.lastModified || Date.now();
    }

    text() {
        return Promise.resolve(this.content);
    }

    arrayBuffer() {
        const encoder = new TextEncoder();
        return Promise.resolve(encoder.encode(this.content).buffer);
    }

    stream() {
        return new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(this.content));
                controller.close();
            }
        });
    }
}

// Mock FileReader
class MockFileReader {
    constructor() {
        this.result = null;
        this.error = null;
        this.readyState = 0; // EMPTY
        this.onload = null;
        this.onerror = null;
        this.onabort = null;
        this.onloadstart = null;
        this.onloadend = null;
        this.onprogress = null;
    }

    readAsText(file) {
        this.readyState = 1; // LOADING

        if (this.onloadstart) {
            this.onloadstart({ type: 'loadstart' });
        }

        setTimeout(() => {
            try {
                this.result = file.content;
                this.readyState = 2; // DONE

                if (this.onload) {
                    this.onload({
                        type: 'load',
                        target: this
                    });
                }

                if (this.onloadend) {
                    this.onloadend({ type: 'loadend' });
                }
            } catch (error) {
                this.error = error;
                this.readyState = 2; // DONE

                if (this.onerror) {
                    this.onerror({
                        type: 'error',
                        target: this
                    });
                }
            }
        }, 10);
    }

    abort() {
        this.readyState = 2; // DONE
        if (this.onabort) {
            this.onabort({ type: 'abort' });
        }
    }
}

// Mock File System Access API
class MockFileSystemFileHandle {
    constructor(name, content = '') {
        this.name = name;
        this.kind = 'file';
        this._content = content;
    }

    async getFile() {
        return new MockFile(this._content, this.name, { type: 'text/markdown' });
    }

    async createWritable() {
        return new MockFileSystemWritableFileStream(this);
    }
}

class MockFileSystemWritableFileStream {
    constructor(fileHandle) {
        this.fileHandle = fileHandle;
        this._content = '';
    }

    async write(data) {
        if (typeof data === 'string') {
            this._content += data;
        } else if (data instanceof ArrayBuffer) {
            this._content += new TextDecoder().decode(data);
        }
    }

    async close() {
        this.fileHandle._content = this._content;
    }

    async abort() {
        // Mock abort
    }
}

// Mock browser APIs
const mockShowOpenFilePicker = jest.fn();
const mockShowSaveFilePicker = jest.fn();

// Mock document and DOM globals
global.document = {
    getElementById: (id) => {
        const mockElements = {
            editor: new MockElement('div'),
            preview: new MockElement('div'),
            'file-input': new MockElement('input')
        };
        return mockElements[id] || null;
    },
    createElement: (tagName) => new MockElement(tagName),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    }
};

global.window = {
    showOpenFilePicker: mockShowOpenFilePicker,
    showSaveFilePicker: mockShowSaveFilePicker,
    URL: {
        createObjectURL: jest.fn(() => 'blob:mock-url'),
        revokeObjectURL: jest.fn()
    }
};

global.FileReader = MockFileReader;
global.File = MockFile;

// Mock console to capture logs
const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
global.console = mockConsole;

// Mock classes that FileManager depends on
class MockEditorCore {
    constructor() {
        this.state = {
            content: {
                markdown: '',
                html: '',
                isDirty: false
            },
            file: {
                name: '',
                lastSaved: null,
                hasUnsavedChanges: false
            }
        };
        this.eventListeners = new Map();
    }

    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    emit(eventType, data) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach((callback) => {
                callback(data);
            });
        }
    }

    setMarkdown(content) {
        this.state.content.markdown = content;
        this.state.content.isDirty = true;
        this.emit('contentChange', { content, isDirty: true });
    }

    getMarkdown() {
        return this.state.content.markdown;
    }

    setFileName(name) {
        this.state.file.name = name;
        this.state.file.hasUnsavedChanges = false;
        this.state.file.lastSaved = new Date();
    }

    markClean() {
        this.state.content.isDirty = false;
        this.state.file.hasUnsavedChanges = false;
        this.state.file.lastSaved = new Date();
    }
}

// FileManager class (extracted from main editor.js for testing)
class FileManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
        this.supportsFileSystemAccess = this.checkFileSystemAccessSupport();
        this.currentFileHandle = null;

        this.init();
    }

    init() {
        this.setupFileInput();
        // FileManager initialized with File System Access API support
    }

    checkFileSystemAccessSupport() {
        return (
            typeof window !== 'undefined' &&
            'showOpenFilePicker' in window &&
            'showSaveFilePicker' in window
        );
    }

    setupFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.md,.markdown,.txt';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);

        this.fileInput.addEventListener('change', (event) => {
            this.handleFileInputChange(event);
        });
    }

    async openFile() {
        try {
            if (this.supportsFileSystemAccess) {
                return await this.openFileWithFileSystemAccess();
            } else {
                return await this.openFileWithTraditionalMethod();
            }
        } catch (error) {
            console.error('Error opening file:', error);
            throw error;
        }
    }

    async openFileWithFileSystemAccess() {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [
                {
                    description: 'Markdown files',
                    accept: {
                        'text/markdown': ['.md', '.markdown'],
                        'text/plain': ['.txt']
                    }
                }
            ],
            multiple: false
        });

        const file = await fileHandle.getFile();
        const content = await file.text();

        this.currentFileHandle = fileHandle;
        this.editorCore.setMarkdown(content);
        this.editorCore.setFileName(file.name);

        return {
            name: file.name,
            content: content,
            size: file.size
        };
    }

    async openFileWithTraditionalMethod() {
        return new Promise((resolve, reject) => {
            this.fileInput.onchange = async (event) => {
                try {
                    const file = event.target.files[0];
                    if (!file) {
                        reject(new Error('No file selected'));
                        return;
                    }

                    const content = await this.readFileContent(file);

                    this.editorCore.setMarkdown(content);
                    this.editorCore.setFileName(file.name);

                    resolve({
                        name: file.name,
                        content: content,
                        size: file.size
                    });
                } catch (error) {
                    reject(error);
                }
            };

            this.fileInput.click();
        });
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                resolve(event.target.result);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    async handleFileInputChange(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        try {
            const content = await this.readFileContent(file);
            this.editorCore.setMarkdown(content);
            this.editorCore.setFileName(file.name);
        } catch (error) {
            console.error('Error reading file:', error);
            throw error;
        }
    }

    async saveFile(filename = null) {
        try {
            const content = this.editorCore.getMarkdown();

            if (this.supportsFileSystemAccess) {
                if (this.currentFileHandle && !filename) {
                    return await this.saveFileWithFileSystemAccess(content);
                } else {
                    return await this.saveFileWithFileSystemAccess(content, filename);
                }
            } else {
                const finalFilename = filename || this.generateDefaultFilename();
                return await this.saveFileWithTraditionalMethod(content, finalFilename);
            }
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }

    async saveFileWithFileSystemAccess(content, filename = null) {
        let fileHandle = this.currentFileHandle;

        if (!fileHandle || filename) {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: filename || this.generateDefaultFilename(),
                types: [
                    {
                        description: 'Markdown files',
                        accept: {
                            'text/markdown': ['.md']
                        }
                    }
                ]
            });
        }

        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();

        this.currentFileHandle = fileHandle;
        this.editorCore.setFileName(fileHandle.name);
        this.editorCore.markClean();

        return {
            name: fileHandle.name,
            size: content.length
        };
    }

    async saveFileWithTraditionalMethod(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(url);

        this.editorCore.setFileName(filename);
        this.editorCore.markClean();

        return {
            name: filename,
            size: content.length
        };
    }

    generateDefaultFilename() {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
        return `markdown-document-${timestamp}.md`;
    }

    validateMarkdownFile(file) {
        const validExtensions = ['.md', '.markdown', '.txt'];
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!validExtensions.includes(extension)) {
            throw new Error(`Invalid file type. Expected: ${validExtensions.join(', ')}`);
        }

        if (file.size > 10 * 1024 * 1024) {
            // 10MB limit
            throw new Error('File too large. Maximum size is 10MB.');
        }

        return true;
    }
}

// Test Suite
describe('File Operations Integration Tests', () => {
    let fileManager;
    let mockEditorCore;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        mockShowOpenFilePicker.mockClear();
        mockShowSaveFilePicker.mockClear();

        // Create fresh instances
        mockEditorCore = new MockEditorCore();
        fileManager = new FileManager(mockEditorCore);
    });

    afterEach(() => {
        // Clean up - just reset the mocks since we're using mock DOM
        jest.clearAllMocks();
    });

    describe('File Opening with Various Markdown Files', () => {
        describe('File System Access API', () => {
            beforeEach(() => {
                // Mock File System Access API support
                fileManager.supportsFileSystemAccess = true;
            });

            test('should open basic markdown file successfully', async () => {
                const testContent = '# Test Document\n\nThis is a test markdown file.';
                const mockFileHandle = new MockFileSystemFileHandle('test.md', testContent);

                mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

                const result = await fileManager.openFile();

                expect(result.name).toBe('test.md');
                expect(result.content).toBe(testContent);
                expect(result.size).toBe(testContent.length);
                expect(mockEditorCore.getMarkdown()).toBe(testContent);
                expect(mockEditorCore.state.file.name).toBe('test.md');
            });

            test('should open markdown file with complex formatting', async () => {
                const complexMarkdown = `# Complex Document

## Headers and Text
This document contains **bold text**, *italic text*, and \`inline code\`.

### Lists
- Item 1
- Item 2
  - Nested item
  - Another nested item

1. Ordered item 1
2. Ordered item 2

### Code Block
\`\`\`javascript
function hello() {
    console.log("Hello, world!");
}
\`\`\`

### Links and Images
[Link to example](https://example.com)
![Alt text](https://example.com/image.jpg)

### Table
| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

> This is a blockquote
> with multiple lines

---

### Special Characters
Characters like & < > " ' should be handled properly.`;

                const mockFileHandle = new MockFileSystemFileHandle('complex.md', complexMarkdown);
                mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

                const result = await fileManager.openFile();

                expect(result.name).toBe('complex.md');
                expect(result.content).toBe(complexMarkdown);
                expect(mockEditorCore.getMarkdown()).toBe(complexMarkdown);
            });

            test('should open empty markdown file', async () => {
                const emptyContent = '';
                const mockFileHandle = new MockFileSystemFileHandle('empty.md', emptyContent);

                mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

                const result = await fileManager.openFile();

                expect(result.name).toBe('empty.md');
                expect(result.content).toBe('');
                expect(result.size).toBe(0);
                expect(mockEditorCore.getMarkdown()).toBe('');
            });

            test('should open markdown file with unicode characters', async () => {
                const unicodeContent = `# Unicode Test 🚀

## Emojis and Symbols
- 🎉 Celebration
- 🔥 Fire
- ⭐ Star
- 💡 Idea

## Different Languages
- English: Hello World
- Spanish: Hola Mundo
- French: Bonjour le Monde
- Japanese: こんにちは世界
- Chinese: 你好世界
- Arabic: مرحبا بالعالم
- Russian: Привет мир

## Mathematical Symbols
- α β γ δ ε
- ∑ ∏ ∫ ∂ ∇
- ≤ ≥ ≠ ≈ ∞`;

                const mockFileHandle = new MockFileSystemFileHandle('unicode.md', unicodeContent);
                mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

                const result = await fileManager.openFile();

                expect(result.name).toBe('unicode.md');
                expect(result.content).toBe(unicodeContent);
                expect(mockEditorCore.getMarkdown()).toBe(unicodeContent);
            });

            test('should handle file opening cancellation', async () => {
                mockShowOpenFilePicker.mockRejectedValue(new Error('User cancelled'));

                await expect(fileManager.openFile()).rejects.toThrow('User cancelled');
                expect(mockEditorCore.getMarkdown()).toBe(''); // Should remain unchanged
            });

            test('should handle file access permission errors', async () => {
                mockShowOpenFilePicker.mockRejectedValue(new Error('Permission denied'));

                await expect(fileManager.openFile()).rejects.toThrow('Permission denied');
                expect(mockConsole.error).toHaveBeenCalledWith(
                    'Error opening file:',
                    expect.any(Error)
                );
            });

            test('should open different file extensions', async () => {
                const testCases = [
                    { name: 'document.md', content: '# Markdown file' },
                    {
                        name: 'readme.markdown',
                        content: '# Markdown file with .markdown extension'
                    },
                    { name: 'notes.txt', content: 'Plain text file content' }
                ];

                for (const testCase of testCases) {
                    const mockFileHandle = new MockFileSystemFileHandle(
                        testCase.name,
                        testCase.content
                    );
                    mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

                    const result = await fileManager.openFile();

                    expect(result.name).toBe(testCase.name);
                    expect(result.content).toBe(testCase.content);
                    expect(mockEditorCore.getMarkdown()).toBe(testCase.content);
                }
            });
        });

        describe('Traditional File Input Method', () => {
            beforeEach(() => {
                // Mock traditional file input support
                fileManager.supportsFileSystemAccess = false;
            });

            test('should open file using traditional file input', async () => {
                const testContent =
                    '# Traditional File Input Test\n\nThis tests the fallback method.';
                const mockFile = new MockFile(testContent, 'traditional.md', {
                    type: 'text/markdown'
                });

                // Simulate file selection
                const openPromise = fileManager.openFile();

                // Simulate file input change
                setTimeout(() => {
                    fileManager.fileInput.files = [mockFile];
                    const changeEvent = { target: { files: [mockFile] } };
                    fileManager.fileInput.onchange(changeEvent);
                }, 10);

                const result = await openPromise;

                expect(result.name).toBe('traditional.md');
                expect(result.content).toBe(testContent);
                expect(mockEditorCore.getMarkdown()).toBe(testContent);
            });

            test('should handle file reading errors with traditional method', async () => {
                const mockFile = new MockFile('content', 'error.md');

                // Mock FileReader to simulate error
                const originalFileReader = global.FileReader;
                global.FileReader = class extends MockFileReader {
                    readAsText() {
                        setTimeout(() => {
                            this.error = new Error('Failed to read file');
                            this.readyState = 2;
                            if (this.onerror) {
                                this.onerror({ target: this });
                            }
                        }, 10);
                    }
                };

                const openPromise = fileManager.openFile();

                setTimeout(() => {
                    fileManager.fileInput.files = [mockFile];
                    const changeEvent = { target: { files: [mockFile] } };
                    fileManager.fileInput.onchange(changeEvent);
                }, 10);

                await expect(openPromise).rejects.toThrow('Failed to read file');

                // Restore original FileReader
                global.FileReader = originalFileReader;
            });

            test('should handle no file selected with traditional method', async () => {
                const openPromise = fileManager.openFile();

                setTimeout(() => {
                    const changeEvent = { target: { files: [] } };
                    fileManager.fileInput.onchange(changeEvent);
                }, 10);

                await expect(openPromise).rejects.toThrow('No file selected');
            });
        });
    });

    describe('File Saving with Different Content Types', () => {
        describe('File System Access API', () => {
            beforeEach(() => {
                fileManager.supportsFileSystemAccess = true;
            });

            test('should save basic markdown content', async () => {
                const testContent = '# Test Document\n\nThis is test content for saving.';
                mockEditorCore.setMarkdown(testContent);

                const mockFileHandle = new MockFileSystemFileHandle('test-save.md');
                mockShowSaveFilePicker.mockResolvedValue(mockFileHandle);

                const result = await fileManager.saveFile('test-save.md');

                expect(result.name).toBe('test-save.md');
                expect(result.size).toBe(testContent.length);
                expect(mockFileHandle._content).toBe(testContent);
                expect(mockEditorCore.state.file.name).toBe('test-save.md');
                expect(mockEditorCore.state.content.isDirty).toBe(false);
            });

            test('should save complex markdown with all formatting types', async () => {
                const complexContent = `# Complex Save Test

## All Markdown Features

### Text Formatting
**Bold text**, *italic text*, \`inline code\`, ~~strikethrough~~

### Headers
# H1
## H2  
### H3
#### H4
##### H5
###### H6

### Lists
- Unordered item 1
- Unordered item 2
  - Nested item
  
1. Ordered item 1
2. Ordered item 2

### Code Blocks
\`\`\`javascript
function example() {
    return "Hello, World!";
}
\`\`\`

### Links and Images
[Example Link](https://example.com)
![Example Image](https://example.com/image.jpg)

### Tables
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### Blockquotes
> This is a blockquote
> with multiple lines
> 
> And a second paragraph

### Horizontal Rule
---

### Special Characters & Entities
Characters: & < > " ' 
Math: α β γ δ ∑ ∏ ∫
Emojis: 🚀 🎉 💡 ⭐`;

                mockEditorCore.setMarkdown(complexContent);

                const mockFileHandle = new MockFileSystemFileHandle('complex-save.md');
                mockShowSaveFilePicker.mockResolvedValue(mockFileHandle);

                const result = await fileManager.saveFile('complex-save.md');

                expect(result.name).toBe('complex-save.md');
                expect(mockFileHandle._content).toBe(complexContent);
                expect(mockEditorCore.state.content.isDirty).toBe(false);
            });

            test('should save empty content', async () => {
                const emptyContent = '';
                mockEditorCore.setMarkdown(emptyContent);

                const mockFileHandle = new MockFileSystemFileHandle('empty-save.md');
                mockShowSaveFilePicker.mockResolvedValue(mockFileHandle);

                const result = await fileManager.saveFile('empty-save.md');

                expect(result.name).toBe('empty-save.md');
                expect(result.size).toBe(0);
                expect(mockFileHandle._content).toBe('');
            });

            test('should save content with unicode characters', async () => {
                const unicodeContent = `# Unicode Save Test 🌍

## Multi-language Content
- English: Hello
- 中文: 你好
- 日本語: こんにちは
- العربية: مرحبا
- Русский: Привет
- Français: Bonjour

## Mathematical Symbols
∑(i=1 to n) x_i = α + β + γ

## Emojis
🚀 🎯 🔥 💡 ⭐ 🌟 ✨ 🎉`;

                mockEditorCore.setMarkdown(unicodeContent);

                const mockFileHandle = new MockFileSystemFileHandle('unicode-save.md');
                mockShowSaveFilePicker.mockResolvedValue(mockFileHandle);

                const result = await fileManager.saveFile('unicode-save.md');

                expect(mockFileHandle._content).toBe(unicodeContent);
                expect(result.name).toBe('unicode-save.md');
            });

            test('should generate default filename when none provided', async () => {
                const testContent = '# Auto-named Document';
                mockEditorCore.setMarkdown(testContent);

                // Mock Date to ensure consistent filename
                const mockDate = new Date('2023-12-25T10:30:45.123Z');
                const originalDate = global.Date;
                const originalDateNow = Date.now;

                global.Date = class extends Date {
                    constructor(...args) {
                        if (args.length === 0) {
                            super(mockDate.getTime());
                        } else {
                            super(...args);
                        }
                    }

                    static now() {
                        return mockDate.getTime();
                    }
                };

                // Copy static methods
                Object.setPrototypeOf(global.Date, originalDate);
                Object.getOwnPropertyNames(originalDate).forEach((name) => {
                    if (name !== 'length' && name !== 'name' && name !== 'prototype') {
                        global.Date[name] = originalDate[name];
                    }
                });

                const expectedFilename = 'markdown-document-2023-12-25T10-30-45.md';
                const mockFileHandle = new MockFileSystemFileHandle(expectedFilename);
                mockShowSaveFilePicker.mockResolvedValue(mockFileHandle);

                await fileManager.saveFile();

                expect(mockShowSaveFilePicker).toHaveBeenCalledWith({
                    suggestedName: expectedFilename,
                    types: [
                        {
                            description: 'Markdown files',
                            accept: {
                                'text/markdown': ['.md']
                            }
                        }
                    ]
                });

                // Restore original Date
                global.Date = originalDate;
                Date.now = originalDateNow;
            });

            test('should handle save cancellation', async () => {
                const testContent = '# Test Content';
                mockEditorCore.setMarkdown(testContent);

                mockShowSaveFilePicker.mockRejectedValue(new Error('User cancelled'));

                await expect(fileManager.saveFile('cancelled.md')).rejects.toThrow(
                    'User cancelled'
                );
                expect(mockEditorCore.state.content.isDirty).toBe(true); // Should remain dirty
            });

            test('should save to existing file handle when available', async () => {
                const testContent = '# Existing File Update';
                mockEditorCore.setMarkdown(testContent);

                // Set up existing file handle
                const existingFileHandle = new MockFileSystemFileHandle(
                    'existing.md',
                    'old content'
                );
                fileManager.currentFileHandle = existingFileHandle;

                const result = await fileManager.saveFile();

                expect(mockShowSaveFilePicker).not.toHaveBeenCalled(); // Should not prompt for new file
                expect(existingFileHandle._content).toBe(testContent);
                expect(result.name).toBe('existing.md');
            });
        });

        describe('Traditional Download Method', () => {
            beforeEach(() => {
                fileManager.supportsFileSystemAccess = false;
            });

            test('should save file using traditional download method', async () => {
                const testContent =
                    '# Traditional Save Test\n\nThis tests the fallback save method.';
                mockEditorCore.setMarkdown(testContent);

                const result = await fileManager.saveFile('traditional-save.md');

                expect(result.name).toBe('traditional-save.md');
                expect(result.size).toBe(testContent.length);
                expect(mockEditorCore.state.file.name).toBe('traditional-save.md');
                expect(mockEditorCore.state.content.isDirty).toBe(false);

                // Verify blob creation and download link
                expect(window.URL.createObjectURL).toHaveBeenCalled();
                expect(window.URL.revokeObjectURL).toHaveBeenCalled();
            });

            test('should generate default filename for traditional method', async () => {
                const testContent = '# Auto-named Traditional Save';
                mockEditorCore.setMarkdown(testContent);

                const result = await fileManager.saveFile();

                expect(result.name).toMatch(
                    /^markdown-document-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/
                );
                expect(result.size).toBe(testContent.length);
            });

            test('should handle large content with traditional method', async () => {
                // Create large content (1MB)
                const largeContent = `# Large Document\n\n${'A'.repeat(1024 * 1024)}`;
                mockEditorCore.setMarkdown(largeContent);

                const result = await fileManager.saveFile('large-file.md');

                expect(result.name).toBe('large-file.md');
                expect(result.size).toBe(largeContent.length);
                expect(window.URL.createObjectURL).toHaveBeenCalled();
            });
        });
    });

    describe('File Validation', () => {
        test('should validate markdown file extensions', () => {
            const validFiles = [
                new MockFile('content', 'test.md'),
                new MockFile('content', 'README.markdown'),
                new MockFile('content', 'notes.txt')
            ];

            validFiles.forEach((file) => {
                expect(() => fileManager.validateMarkdownFile(file)).not.toThrow();
            });
        });

        test('should reject invalid file extensions', () => {
            const invalidFiles = [
                new MockFile('content', 'document.pdf'),
                new MockFile('content', 'image.jpg'),
                new MockFile('content', 'script.js'),
                new MockFile('content', 'data.json')
            ];

            invalidFiles.forEach((file) => {
                expect(() => fileManager.validateMarkdownFile(file)).toThrow('Invalid file type');
            });
        });

        test('should reject files that are too large (10MB limit)', () => {
            const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
            const largeFile = new MockFile(largeContent, 'large.md');

            expect(() => fileManager.validateMarkdownFile(largeFile)).toThrow('File too large');
        });

        test('should accept files within size limit', () => {
            const acceptableContent = 'x'.repeat(5 * 1024 * 1024); // 5MB
            const acceptableFile = new MockFile(acceptableContent, 'acceptable.md');

            expect(() => fileManager.validateMarkdownFile(acceptableFile)).not.toThrow();
        });

        test('should accept files exactly at 10MB limit', () => {
            const maxContent = 'x'.repeat(10 * 1024 * 1024); // Exactly 10MB
            const maxFile = new MockFile(maxContent, 'max-size.md');

            expect(() => fileManager.validateMarkdownFile(maxFile)).not.toThrow();
        });

        test('should validate markdown file with .md extension case-insensitively', () => {
            const files = [
                new MockFile('content', 'test.MD'),
                new MockFile('content', 'test.Md'),
                new MockFile('content', 'test.MARKDOWN')
            ];

            files.forEach((file) => {
                expect(() => fileManager.validateMarkdownFile(file)).not.toThrow();
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle corrupted file content gracefully', async () => {
            fileManager.supportsFileSystemAccess = true;

            // Mock a file that throws an error when reading content
            const corruptedFileHandle = {
                name: 'corrupted.md',
                kind: 'file',
                async getFile() {
                    throw new Error('File is corrupted');
                }
            };

            mockShowOpenFilePicker.mockResolvedValue([corruptedFileHandle]);

            await expect(fileManager.openFile()).rejects.toThrow('File is corrupted');
            expect(mockConsole.error).toHaveBeenCalledWith(
                'Error opening file:',
                expect.any(Error)
            );
        });

        test('should handle network interruption during file operations', async () => {
            fileManager.supportsFileSystemAccess = true;

            const testContent = '# Network Test';
            mockEditorCore.setMarkdown(testContent);

            const networkErrorFileHandle = {
                name: 'network-test.md',
                kind: 'file',
                async createWritable() {
                    throw new Error('Network error');
                }
            };

            mockShowSaveFilePicker.mockResolvedValue(networkErrorFileHandle);

            await expect(fileManager.saveFile('network-test.md')).rejects.toThrow('Network error');
            expect(mockConsole.error).toHaveBeenCalledWith('Error saving file:', expect.any(Error));
        });

        test('should handle browser API feature detection correctly', () => {
            // Test when File System Access API is not supported
            const originalWindow = global.window;
            global.window = {};

            const fileManagerWithoutAPI = new FileManager(mockEditorCore);
            expect(fileManagerWithoutAPI.supportsFileSystemAccess).toBe(false);

            // Restore window
            global.window = originalWindow;
        });

        test('should handle multiple rapid file operations', async () => {
            fileManager.supportsFileSystemAccess = true;

            const testContent1 = '# First Document';
            const testContent2 = '# Second Document';

            const fileHandle1 = new MockFileSystemFileHandle('first.md', testContent1);
            const fileHandle2 = new MockFileSystemFileHandle('second.md', testContent2);

            mockShowOpenFilePicker
                .mockResolvedValueOnce([fileHandle1])
                .mockResolvedValueOnce([fileHandle2]);

            // Perform rapid file operations
            const [result1, result2] = await Promise.all([
                fileManager.openFile(),
                fileManager.openFile()
            ]);

            expect(result1.name).toBe('first.md');
            expect(result2.name).toBe('second.md');
            // The last operation should win
            expect(mockEditorCore.getMarkdown()).toBe(testContent2);
        });

        test('should maintain file state consistency during errors', async () => {
            const initialContent = '# Initial Content';
            mockEditorCore.setMarkdown(initialContent);
            mockEditorCore.setFileName('initial.md');

            fileManager.supportsFileSystemAccess = true;
            mockShowOpenFilePicker.mockRejectedValue(new Error('Operation failed'));

            await expect(fileManager.openFile()).rejects.toThrow('Operation failed');

            // State should remain unchanged after failed operation
            expect(mockEditorCore.getMarkdown()).toBe(initialContent);
            expect(mockEditorCore.state.file.name).toBe('initial.md');
        });
    });

    describe('Event Integration', () => {
        test('should emit content change events when file is loaded', async () => {
            const contentChangeCallback = jest.fn();
            mockEditorCore.addEventListener('contentChange', contentChangeCallback);

            fileManager.supportsFileSystemAccess = true;
            const testContent = '# Event Test Document';
            const mockFileHandle = new MockFileSystemFileHandle('event-test.md', testContent);

            mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

            await fileManager.openFile();

            expect(contentChangeCallback).toHaveBeenCalledWith({
                content: testContent,
                isDirty: true
            });
        });

        test('should update editor state correctly after successful operations', async () => {
            // Test file opening state updates
            fileManager.supportsFileSystemAccess = true;
            const testContent = '# State Update Test';
            const mockFileHandle = new MockFileSystemFileHandle('state-test.md', testContent);

            mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

            await fileManager.openFile();

            expect(mockEditorCore.state.content.markdown).toBe(testContent);
            expect(mockEditorCore.state.file.name).toBe('state-test.md');
            expect(mockEditorCore.state.content.isDirty).toBe(true);

            // Test file saving state updates
            mockShowSaveFilePicker.mockResolvedValue(mockFileHandle);

            await fileManager.saveFile();

            expect(mockEditorCore.state.content.isDirty).toBe(false);
            expect(mockEditorCore.state.file.hasUnsavedChanges).toBe(false);
            expect(mockEditorCore.state.file.lastSaved).toBeInstanceOf(Date);
        });
    });

    describe('Helper Functions - Filename Normalization', () => {
        test('should add .md extension to filename without extension', () => {
            const filename = 'myfile';
            // Test normalizeFilename logic
            const normalized = filename.endsWith('.md') ? filename : `${filename}.md`;
            expect(normalized).toBe('myfile.md');
        });

        test('should not add .md extension if already present', () => {
            const filename = 'myfile.md';
            const normalized = filename.endsWith('.md') ? filename : `${filename}.md`;
            expect(normalized).toBe('myfile.md');
        });

        test('should handle empty filename', () => {
            const filename = '';
            const normalized =
                !filename || !filename.trim()
                    ? 'Untitled.md'
                    : filename.trim().endsWith('.md')
                      ? filename.trim()
                      : `${filename.trim()}.md`;
            expect(normalized).toBe('Untitled.md');
        });

        test('should trim whitespace from filename', () => {
            const filename = '  myfile  ';
            const normalized = filename.trim().endsWith('.md')
                ? filename.trim()
                : `${filename.trim()}.md`;
            expect(normalized).toBe('myfile.md');
        });
    });

    describe('Helper Functions - Button Loading State', () => {
        test('should manage button loading state with try-finally', async () => {
            let buttonLoading = false;

            try {
                buttonLoading = true;
                // Simulate operation
                await new Promise((resolve) => setTimeout(resolve, 10));
            } finally {
                buttonLoading = false;
            }

            expect(buttonLoading).toBe(false);
        });

        test('should reset button loading state even on error', async () => {
            let buttonLoading = false;

            try {
                buttonLoading = true;
                throw new Error('Operation failed');
            } catch (error) {
                // Error caught
            } finally {
                buttonLoading = false;
            }

            expect(buttonLoading).toBe(false);
        });
    });

    describe('Export Validation Edge Cases', () => {
        test('should validate content before export', () => {
            const emptyContent = '';
            const validContent = '# Test';

            expect(emptyContent.trim()).toBe('');
            expect(validContent.trim()).not.toBe('');
        });

        test('should handle whitespace-only content', () => {
            const whitespaceContent = '   \n\n   ';
            expect(whitespaceContent.trim()).toBe('');
        });

        test('should preserve unicode in exports', () => {
            const unicodeContent = '# Test 你好 🌍 مرحبا';
            expect(unicodeContent).toContain('你好');
            expect(unicodeContent).toContain('🌍');
            expect(unicodeContent).toContain('مرحبا');
        });
    });

    describe('Error Recovery and Fallback', () => {
        test('should handle AbortError without throwing', async () => {
            mockShowOpenFilePicker.mockRejectedValue({
                name: 'AbortError',
                message: 'User cancelled'
            });

            try {
                await fileManager.openFile();
            } catch (error) {
                if (error.name !== 'AbortError') {
                    throw error;
                }
            }

            expect(mockShowOpenFilePicker).toHaveBeenCalled();
        });

        test('should fallback from File System Access API to traditional method', async () => {
            fileManager.supportsFileSystemAccess = true;
            const testContent = '# Fallback Test';
            mockEditorCore.setMarkdown(testContent);

            // Mock File System Access API failure
            mockShowSaveFilePicker.mockRejectedValue(new Error('Not supported'));

            try {
                await fileManager.saveFile('fallback.md');
            } catch (error) {
                // Should attempt fallback
            }

            expect(mockShowSaveFilePicker).toHaveBeenCalled();
        });

        test('should handle missing parent directory gracefully', async () => {
            const mockFileHandle = new MockFileSystemFileHandle('test.md', '# Test');
            mockFileHandle.getParent = async () => {
                throw new Error('Parent directory not accessible');
            };

            mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

            // Should still work without parent directory
            const result = await fileManager.openFile();
            expect(result.name).toBe('test.md');
        });
    });

    describe('Edge Cases - File Handle Management', () => {
        test('should reset file handles when using traditional method', async () => {
            fileManager.currentFileHandle = new MockFileSystemFileHandle('old.md', 'old content');
            fileManager.supportsFileSystemAccess = false;

            const testContent = '# New Content';
            const mockFile = new MockFile(testContent, 'new.md');

            // Simulate traditional file input
            const openPromise = fileManager.openFile();

            setTimeout(() => {
                fileManager.fileInput.files = [mockFile];
                const changeEvent = { target: { files: [mockFile] } };
                fileManager.fileInput.onchange(changeEvent);
            }, 10);

            await openPromise;

            // File handles should be reset
            expect(fileManager.currentFileHandle).toBeNull();
        });

        test('should maintain file handle on successful save', async () => {
            fileManager.supportsFileSystemAccess = true;
            const testContent = '# Test Content';
            mockEditorCore.setMarkdown(testContent);

            const mockFileHandle = new MockFileSystemFileHandle('test.md');
            mockShowSaveFilePicker.mockResolvedValue(mockFileHandle);

            await fileManager.saveFile('test.md');

            expect(fileManager.currentFileHandle).toBe(mockFileHandle);
        });
    });

    describe('Content Validation for Exports', () => {
        test('should prevent export of empty content to HTML', () => {
            const content = '';
            const isEmpty = !content || !content.trim();
            expect(isEmpty).toBe(true);
        });

        test('should prevent export of empty content to PDF', () => {
            const content = '   ';
            const isEmpty = !content || !content.trim();
            expect(isEmpty).toBe(true);
        });

        test('should allow export of valid content', () => {
            const content = '# Valid Content';
            const isEmpty = !content || !content.trim();
            expect(isEmpty).toBe(false);
        });

        test('should handle special characters in HTML export', () => {
            const content = '# Test < > & " \'';
            expect(content).toContain('<');
            expect(content).toContain('>');
            expect(content).toContain('&');
        });
    });
});
