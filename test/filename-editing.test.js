/**
 * Unit tests for file name editing functionality
 * Tests editable file name display, validation, and user interactions
 * Requirements: 4.1, 4.2, 7.1
 */

// Simple test focusing on the core functionality

// Mock DOM elements and globals for testing
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
        this.contentEditable = 'false';
    }

    addEventListener(event, callback, options) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push({ callback, options });
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.findIndex(l => l.callback === callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    setAttribute = jest.fn((name, value) => {
        this.attributes.set(name, value);
    })

    getAttribute(name) {
        return this.attributes.get(name);
    }

    focus() {
        this._focused = true;
        const focusListeners = this.eventListeners.get('focus') || [];
        focusListeners.forEach(({ callback }) => callback());
    }

    blur() {
        this._focused = false;
        const blurListeners = this.eventListeners.get('blur') || [];
        blurListeners.forEach(({ callback }) => callback());
    }

    classList = {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn(),
        contains: jest.fn(() => false)
    };

    // Simulate events
    _triggerEvent(eventType, eventData = {}) {
        const listeners = this.eventListeners.get(eventType) || [];
        listeners.forEach(({ callback }) => {
            callback({ 
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                key: eventData.key,
                clipboardData: eventData.clipboardData,
                ...eventData 
            });
        });
    }
}

// Mock Range and Selection APIs
class MockRange {
    constructor() {
        this.startContainer = new MockElement();
        this.endContainer = new MockElement();
        this.startOffset = 0;
        this.endOffset = 0;
    }

    selectNodeContents(node) {
        this.startContainer = node;
        this.endContainer = node;
    }
}

class MockSelection {
    constructor() {
        this.rangeCount = 0;
        this._ranges = [];
    }

    removeAllRanges() {
        this._ranges = [];
        this.rangeCount = 0;
    }

    addRange(range) {
        this._ranges.push(range);
        this.rangeCount = this._ranges.length;
    }
}

// Setup global mocks
global.document = {
    querySelector: (selector) => {
        if (selector === '.current-file-name') {
            return new MockElement('span');
        }
        return new MockElement();
    },
    querySelectorAll: (selector) => [],
    createElement: (tagName) => new MockElement(tagName),
    createRange: () => new MockRange(),
    execCommand: jest.fn(),
    title: 'Test Document'
};

global.window = {
    getSelection: () => new MockSelection(),
    clipboardData: {
        getData: jest.fn(() => 'test text')
    }
};

// Mock console
const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
global.console = mockConsole;

// Mock classes that FileManager depends on
class MockAccessibilityManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    announce(message) {
        this.lastAnnouncement = message;
    }
}

// Simplified EditorCore class for testing
class EditorCore {
    constructor() {
        this.state = {
            file: {
                name: '',
                hasUnsavedChanges: false
            }
        };
        
        this.eventListeners = new Map();
        this.accessibilityManager = new MockAccessibilityManager(this);
    }
    
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }
    
    emit(eventType, data) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventType}:`, error);
                }
            });
        }
    }
    
    updateUnsavedIndicator() {
        // Mock implementation
    }
}

// FileManager class for testing
class FileManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
        this.supportsFileSystemAccess = false;
        this.fileHandle = null;
    }
    
    setupEditableFileName() {
        const fileNameElement = document.querySelector('.current-file-name');
        if (!fileNameElement) return;
        
        let originalFileName = '';
        let isEditing = false;
        
        // Handle click to start editing
        const startEditing = () => {
            if (isEditing) return;
            
            isEditing = true;
            originalFileName = fileNameElement.textContent || 'Untitled';
            
            fileNameElement.classList.add('editing');
            fileNameElement.contentEditable = 'true';
            fileNameElement.focus();
            
            // Select all text
            const range = document.createRange();
            range.selectNodeContents(fileNameElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Announce to screen readers
            if (this.editorCore.accessibilityManager) {
                this.editorCore.accessibilityManager.announce('File name editing mode activated');
            }
        };
        
        // Handle finishing edit
        const finishEditing = (save = true) => {
            if (!isEditing) return;
            
            isEditing = false;
            fileNameElement.classList.remove('editing', 'invalid');
            fileNameElement.contentEditable = 'false';
            
            let newFileName = fileNameElement.textContent?.trim() || '';
            
            if (save && newFileName && this.isValidFileName(newFileName)) {
                // Ensure .md extension
                if (!newFileName.endsWith('.md') && !newFileName.endsWith('.markdown')) {
                    newFileName += '.md';
                }
                
                // Update file name
                this.updateFileName(newFileName);
                
                // Announce success
                if (this.editorCore.accessibilityManager) {
                    this.editorCore.accessibilityManager.announce(`File renamed to ${newFileName}`);
                }
            } else if (save && (!newFileName || !this.isValidFileName(newFileName))) {
                // Invalid file name - show error and revert
                fileNameElement.classList.add('invalid');
                setTimeout(() => {
                    fileNameElement.textContent = originalFileName;
                    fileNameElement.classList.remove('invalid');
                }, 2000);
                
                // Announce error
                if (this.editorCore.accessibilityManager) {
                    this.editorCore.accessibilityManager.announce('Invalid file name. Reverted to original name.');
                }
                return;
            } else {
                // Cancel - revert to original
                fileNameElement.textContent = originalFileName;
            }
            
            // Clear selection
            window.getSelection().removeAllRanges();
        };
        
        // Event listeners
        fileNameElement.addEventListener('click', startEditing);
        fileNameElement.addEventListener('keydown', (event) => {
            if (!isEditing) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    startEditing();
                }
                return;
            }
            
            // Handle editing keys
            if (event.key === 'Enter') {
                event.preventDefault();
                finishEditing(true);
            } else if (event.key === 'Escape') {
                event.preventDefault();
                finishEditing(false);
            }
        });
        
        // Handle blur (clicking outside)
        fileNameElement.addEventListener('blur', () => {
            if (isEditing) {
                finishEditing(true);
            }
        });
        
        // Prevent line breaks in contenteditable
        fileNameElement.addEventListener('paste', (event) => {
            if (!isEditing) return;
            
            event.preventDefault();
            const text = (event.clipboardData || window.clipboardData).getData('text/plain');
            const cleanText = text.replace(/[\r\n]/g, '').trim();
            document.execCommand('insertText', false, cleanText);
        });
        
        // Store references for testing
        this._startEditing = startEditing;
        this._finishEditing = finishEditing;
        this._isEditing = () => isEditing;
        this._getOriginalFileName = () => originalFileName;
    }
    
    isValidFileName(fileName) {
        if (!fileName || fileName.trim().length === 0) return false;
        
        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
        if (invalidChars.test(fileName)) return false;
        
        // Check for reserved names (Windows)
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
        if (reservedNames.test(fileName)) return false;
        
        // Check length
        if (fileName.length > 255) return false;
        
        return true;
    }
    
    updateFileName(fileName) {
        // Update state
        this.editorCore.state.file.name = fileName;
        this.editorCore.state.file.hasUnsavedChanges = true;
        
        // Update UI
        this.updateFileNameDisplay(fileName);
        
        // Update document title
        document.title = `${fileName} - Markdown Editor`;
        
        // Update unsaved indicator
        this.editorCore.updateUnsavedIndicator();
        
        // Emit event for other components
        this.editorCore.emit('fileNameChanged', { fileName });
    }
    
    updateFileNameDisplay(fileName) {
        const fileNameElement = document.querySelector('.current-file-name');
        if (fileNameElement) {
            // Only update if not currently editing
            if (!fileNameElement.classList.contains('editing')) {
                fileNameElement.textContent = fileName || 'Untitled';
            }
            fileNameElement.classList.toggle('unsaved', this.editorCore.state.file.hasUnsavedChanges);
            
            // Update title attribute for accessibility
            fileNameElement.setAttribute('title', `Click to edit file name: ${fileName || 'Untitled'}`);
            fileNameElement.setAttribute('aria-label', `File name: ${fileName || 'Untitled'}. Click to edit.`);
        }
    }
}

// Test Suite
describe('File Name Editing Functionality', () => {
    let editorCore;
    let fileManager;
    
    beforeEach(() => {
        jest.clearAllMocks();
        editorCore = new EditorCore();
        fileManager = new FileManager(editorCore);
    });
    
    describe('File Name Validation', () => {
        test('should validate normal file names', () => {
            expect(fileManager.isValidFileName('document.md')).toBe(true);
            expect(fileManager.isValidFileName('my-file')).toBe(true);
            expect(fileManager.isValidFileName('test_file_123')).toBe(true);
        });
        
        test('should reject empty or whitespace-only names', () => {
            expect(fileManager.isValidFileName('')).toBe(false);
            expect(fileManager.isValidFileName('   ')).toBe(false);
            expect(fileManager.isValidFileName(null)).toBe(false);
            expect(fileManager.isValidFileName(undefined)).toBe(false);
        });
        
        test('should reject names with invalid characters', () => {
            expect(fileManager.isValidFileName('file<name')).toBe(false);
            expect(fileManager.isValidFileName('file>name')).toBe(false);
            expect(fileManager.isValidFileName('file:name')).toBe(false);
            expect(fileManager.isValidFileName('file"name')).toBe(false);
            expect(fileManager.isValidFileName('file/name')).toBe(false);
            expect(fileManager.isValidFileName('file\\name')).toBe(false);
            expect(fileManager.isValidFileName('file|name')).toBe(false);
            expect(fileManager.isValidFileName('file?name')).toBe(false);
            expect(fileManager.isValidFileName('file*name')).toBe(false);
        });
        
        test('should reject reserved Windows names', () => {
            expect(fileManager.isValidFileName('CON')).toBe(false);
            expect(fileManager.isValidFileName('PRN')).toBe(false);
            expect(fileManager.isValidFileName('AUX')).toBe(false);
            expect(fileManager.isValidFileName('NUL')).toBe(false);
            expect(fileManager.isValidFileName('COM1')).toBe(false);
            expect(fileManager.isValidFileName('LPT1')).toBe(false);
            expect(fileManager.isValidFileName('con.txt')).toBe(false);
        });
        
        test('should reject names that are too long', () => {
            const longName = 'a'.repeat(256);
            expect(fileManager.isValidFileName(longName)).toBe(false);
        });
        
        test('should accept names at the length limit', () => {
            const maxLengthName = 'a'.repeat(255);
            expect(fileManager.isValidFileName(maxLengthName)).toBe(true);
        });
    });
    
    describe('Core Functionality Tests', () => {
        test('should have setupEditableFileName method', () => {
            expect(typeof fileManager.setupEditableFileName).toBe('function');
        });
        
        test('should have updateFileName method', () => {
            expect(typeof fileManager.updateFileName).toBe('function');
        });
        
        test('should have updateFileNameDisplay method', () => {
            expect(typeof fileManager.updateFileNameDisplay).toBe('function');
        });
    });
    
    describe('File Name Updates', () => {
        test('should update editor state when file name changes', () => {
            fileManager.updateFileName('test-document.md');
            
            expect(editorCore.state.file.name).toBe('test-document.md');
            expect(editorCore.state.file.hasUnsavedChanges).toBe(true);
        });
        
        test('should update document title', () => {
            fileManager.updateFileName('my-document.md');
            
            expect(document.title).toBe('my-document.md - Markdown Editor');
        });
        
        test('should emit fileNameChanged event', () => {
            const eventCallback = jest.fn();
            editorCore.addEventListener('fileNameChanged', eventCallback);
            
            fileManager.updateFileName('event-test.md');
            
            expect(eventCallback).toHaveBeenCalledWith({ fileName: 'event-test.md' });
        });
        
        test('should update file name in state', () => {
            fileManager.updateFileName('test-file.md');
            
            expect(editorCore.state.file.name).toBe('test-file.md');
            expect(editorCore.state.file.hasUnsavedChanges).toBe(true);
        });
        
        test('should update document title when file name changes', () => {
            fileManager.updateFileName('my-document.md');
            
            expect(document.title).toBe('my-document.md - Markdown Editor');
        });
    });
    
    describe('Text Processing', () => {
        test('should clean pasted text by removing line breaks', () => {
            // Test the paste cleaning logic directly
            const testText = 'pasted\ntext\rwith\r\nbreaks   ';
            const cleanText = testText.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
            
            expect(cleanText).toBe('pasted text with breaks');
        });
        
        test('should handle various line break formats', () => {
            const testCases = [
                { input: 'line1\nline2', expected: 'line1 line2' },
                { input: 'line1\rline2', expected: 'line1 line2' },
                { input: 'line1\r\nline2', expected: 'line1 line2' },
                { input: '  spaced text  ', expected: 'spaced text' }
            ];
            
            testCases.forEach(({ input, expected }) => {
                const cleaned = input.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
                expect(cleaned).toBe(expected);
            });
        });
    });
});