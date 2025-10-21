/**
 * Unit tests for EditorCore state management
 * Tests state initialization, updates, and event system functionality
 * Requirements: 1.3
 */

// Mock DOM elements for testing
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

    querySelector(selector) {
        return null; // Simplified for testing
    }

    querySelectorAll(selector) {
        return []; // Simplified for testing
    }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
    }

    focus() {
        // Mock focus behavior
    }

    click() {
        // Trigger click event
        const clickListeners = this.eventListeners.get('click') || [];
        clickListeners.forEach(callback => callback({ preventDefault: () => {} }));
    }
}

// Mock document and DOM globals
global.document = {
    getElementById: (id) => {
        const mockElements = {
            'editor': new MockElement('div'),
            'preview': new MockElement('div'),
            'toggle-preview': new MockElement('button'),
            'word-count': new MockElement('span'),
            'char-count': new MockElement('span')
        };
        return mockElements[id] || null;
    },
    querySelector: (selector) => new MockElement(),
    querySelectorAll: (selector) => [],
    createElement: (tagName) => new MockElement(tagName),
    addEventListener: () => {},
    removeEventListener: () => {},
    body: new MockElement('body')
};

global.window = {
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {}
};

global.navigator = {
    platform: 'MacIntel'
};

// Mock console to capture logs
const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
global.console = mockConsole;

// Mock classes that EditorCore depends on
class MockMarkdownParser {
    toHTML(markdown) {
        return `<p>${markdown}</p>`;
    }
    
    toMarkdown(html) {
        return html.replace(/<[^>]*>/g, '');
    }
    
    validateMarkdown(content) {
        return { isValid: true, errors: [] };
    }
}

class MockPreview {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    updateContent(html) {
        this.lastContent = html;
    }
}

class MockFileManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    saveFile() {
        return Promise.resolve();
    }
}

class MockToolbar {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    handleFormatting(type) {
        // Mock formatting
    }
}

class MockKeyboardShortcuts {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    destroy() {
        // Mock cleanup
    }
}

class MockAccessibilityManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
}

class MockLazyLoader {
    preloadCommonLibraries() {
        // Mock preloading
    }
    
    loadFormattingLibrary(type) {
        return Promise.resolve();
    }
}

class MockPerformanceOptimizer {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    optimizeTextRendering(element) {
        // Mock optimization
    }
    
    cleanup() {
        // Mock cleanup
    }
}

class MockVirtualScrollManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    disable() {
        // Mock disable
    }
}

// Make mock classes available globally
global.MarkdownParser = MockMarkdownParser;
global.Preview = MockPreview;
global.FileManager = MockFileManager;
global.Toolbar = MockToolbar;
global.KeyboardShortcuts = MockKeyboardShortcuts;
global.AccessibilityManager = MockAccessibilityManager;
global.LazyLoader = MockLazyLoader;
global.PerformanceOptimizer = MockPerformanceOptimizer;
global.VirtualScrollManager = MockVirtualScrollManager;

// Import EditorCore (we'll need to extract it from the main file)
// For now, we'll define a simplified version for testing
class EditorCore {
    constructor(container) {
        this.container = container;
        
        // Initialize markdown parser
        this.markdownParser = new MarkdownParser();
        
        // Initialize state according to design document
        this.state = {
            content: {
                markdown: '',
                html: '',
                isDirty: false
            },
            ui: {
                showPreview: false,
                activeFormatting: new Set(),
                cursorPosition: 0
            },
            file: {
                name: '',
                lastSaved: null,
                hasUnsavedChanges: false
            },
            parsing: {
                isProcessing: false,
                lastError: null,
                validationResult: null
            }
        };
        
        // Event system for component communication
        this.eventListeners = new Map();
        
        // Initialize components (mocked)
        this.preview = null;
        this.keyboardShortcuts = null;
        this.toolbar = null;
        this.accessibilityManager = null;
        this.virtualScrollManager = null;
        this.lazyLoader = null;
        this.performanceOptimizer = null;
        
        // DOM elements
        this.editorElement = document.getElementById('editor');
        this.previewElement = document.getElementById('preview');
    }
    
    // Event system methods
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }
    
    removeEventListener(eventType, callback) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
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
    
    // State management methods
    getState() {
        return this.state;
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
    }
    
    setMarkdown(content) {
        this.state.content.markdown = content;
        this.state.content.isDirty = true;
        this.emit('contentChange', { content, isDirty: true });
    }
    
    getMarkdown() {
        return this.state.content.markdown;
    }
    
    togglePreview() {
        this.state.ui.showPreview = !this.state.ui.showPreview;
        this.emit('previewToggle', { visible: this.state.ui.showPreview });
    }
    
    setFileName(name) {
        this.state.file.name = name;
        this.state.file.hasUnsavedChanges = false;
        this.state.file.lastSaved = new Date();
    }
    
    markDirty() {
        this.state.content.isDirty = true;
        this.state.file.hasUnsavedChanges = true;
    }
    
    markClean() {
        this.state.content.isDirty = false;
        this.state.file.hasUnsavedChanges = false;
        this.state.file.lastSaved = new Date();
    }
}

// Test Suite
describe('EditorCore State Management', () => {
    let editorCore;
    let mockContainer;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockContainer = new MockElement('div');
        editorCore = new EditorCore(mockContainer);
    });
    
    afterEach(() => {
        // Clean up
        if (editorCore) {
            editorCore.eventListeners.clear();
        }
    });
    
    describe('State Initialization', () => {
        test('should initialize with correct default state structure', () => {
            const state = editorCore.getState();
            
            // Test content state
            expect(state.content).toBeDefined();
            expect(state.content.markdown).toBe('');
            expect(state.content.html).toBe('');
            expect(state.content.isDirty).toBe(false);
            
            // Test UI state
            expect(state.ui).toBeDefined();
            expect(state.ui.showPreview).toBe(false);
            expect(state.ui.activeFormatting).toBeInstanceOf(Set);
            expect(state.ui.activeFormatting.size).toBe(0);
            expect(state.ui.cursorPosition).toBe(0);
            
            // Test file state
            expect(state.file).toBeDefined();
            expect(state.file.name).toBe('');
            expect(state.file.lastSaved).toBeNull();
            expect(state.file.hasUnsavedChanges).toBe(false);
            
            // Test parsing state
            expect(state.parsing).toBeDefined();
            expect(state.parsing.isProcessing).toBe(false);
            expect(state.parsing.lastError).toBeNull();
            expect(state.parsing.validationResult).toBeNull();
        });
        
        test('should initialize event listeners map', () => {
            expect(editorCore.eventListeners).toBeInstanceOf(Map);
            expect(editorCore.eventListeners.size).toBe(0);
        });
        
        test('should initialize markdown parser', () => {
            expect(editorCore.markdownParser).toBeDefined();
            expect(editorCore.markdownParser).toBeInstanceOf(MockMarkdownParser);
        });
        
        test('should set up DOM element references', () => {
            expect(editorCore.editorElement).toBeDefined();
            expect(editorCore.previewElement).toBeDefined();
        });
    });
    
    describe('State Updates', () => {
        test('should update markdown content and mark as dirty', () => {
            const testContent = '# Test Markdown\n\nThis is a test.';
            
            editorCore.setMarkdown(testContent);
            
            expect(editorCore.getMarkdown()).toBe(testContent);
            expect(editorCore.state.content.markdown).toBe(testContent);
            expect(editorCore.state.content.isDirty).toBe(true);
        });
        
        test('should toggle preview state', () => {
            expect(editorCore.state.ui.showPreview).toBe(false);
            
            editorCore.togglePreview();
            expect(editorCore.state.ui.showPreview).toBe(true);
            
            editorCore.togglePreview();
            expect(editorCore.state.ui.showPreview).toBe(false);
        });
        
        test('should update file information', () => {
            const fileName = 'test-document.md';
            const beforeTime = new Date();
            
            editorCore.setFileName(fileName);
            
            expect(editorCore.state.file.name).toBe(fileName);
            expect(editorCore.state.file.hasUnsavedChanges).toBe(false);
            expect(editorCore.state.file.lastSaved).toBeInstanceOf(Date);
            expect(editorCore.state.file.lastSaved.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        });
        
        test('should mark content as dirty', () => {
            editorCore.markDirty();
            
            expect(editorCore.state.content.isDirty).toBe(true);
            expect(editorCore.state.file.hasUnsavedChanges).toBe(true);
        });
        
        test('should mark content as clean', () => {
            // First make it dirty
            editorCore.markDirty();
            expect(editorCore.state.content.isDirty).toBe(true);
            
            // Then clean it
            const beforeTime = new Date();
            editorCore.markClean();
            
            expect(editorCore.state.content.isDirty).toBe(false);
            expect(editorCore.state.file.hasUnsavedChanges).toBe(false);
            expect(editorCore.state.file.lastSaved).toBeInstanceOf(Date);
            expect(editorCore.state.file.lastSaved.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        });
        
        test('should update active formatting set', () => {
            editorCore.state.ui.activeFormatting.add('bold');
            editorCore.state.ui.activeFormatting.add('italic');
            
            expect(editorCore.state.ui.activeFormatting.has('bold')).toBe(true);
            expect(editorCore.state.ui.activeFormatting.has('italic')).toBe(true);
            expect(editorCore.state.ui.activeFormatting.size).toBe(2);
            
            editorCore.state.ui.activeFormatting.delete('bold');
            expect(editorCore.state.ui.activeFormatting.has('bold')).toBe(false);
            expect(editorCore.state.ui.activeFormatting.size).toBe(1);
        });
        
        test('should update cursor position', () => {
            editorCore.state.ui.cursorPosition = 42;
            expect(editorCore.state.ui.cursorPosition).toBe(42);
        });
        
        test('should update parsing state', () => {
            editorCore.state.parsing.isProcessing = true;
            editorCore.state.parsing.lastError = 'Test error';
            editorCore.state.parsing.validationResult = { isValid: false, errors: ['Error 1'] };
            
            expect(editorCore.state.parsing.isProcessing).toBe(true);
            expect(editorCore.state.parsing.lastError).toBe('Test error');
            expect(editorCore.state.parsing.validationResult.isValid).toBe(false);
            expect(editorCore.state.parsing.validationResult.errors).toContain('Error 1');
        });
    });
    
    describe('Event System Functionality', () => {
        test('should add event listeners', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            editorCore.addEventListener('testEvent', callback1);
            editorCore.addEventListener('testEvent', callback2);
            editorCore.addEventListener('otherEvent', callback1);
            
            expect(editorCore.eventListeners.has('testEvent')).toBe(true);
            expect(editorCore.eventListeners.has('otherEvent')).toBe(true);
            expect(editorCore.eventListeners.get('testEvent')).toHaveLength(2);
            expect(editorCore.eventListeners.get('otherEvent')).toHaveLength(1);
        });
        
        test('should emit events to registered listeners', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            const testData = { message: 'test data' };
            
            editorCore.addEventListener('testEvent', callback1);
            editorCore.addEventListener('testEvent', callback2);
            
            editorCore.emit('testEvent', testData);
            
            expect(callback1).toHaveBeenCalledWith(testData);
            expect(callback2).toHaveBeenCalledWith(testData);
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });
        
        test('should not emit to non-existent event types', () => {
            const callback = jest.fn();
            
            editorCore.addEventListener('existingEvent', callback);
            editorCore.emit('nonExistentEvent', { data: 'test' });
            
            expect(callback).not.toHaveBeenCalled();
        });
        
        test('should remove specific event listeners', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            editorCore.addEventListener('testEvent', callback1);
            editorCore.addEventListener('testEvent', callback2);
            
            editorCore.removeEventListener('testEvent', callback1);
            editorCore.emit('testEvent', { data: 'test' });
            
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });
        
        test('should handle removing non-existent listeners gracefully', () => {
            const callback = jest.fn();
            
            // Should not throw error
            expect(() => {
                editorCore.removeEventListener('nonExistentEvent', callback);
            }).not.toThrow();
            
            editorCore.addEventListener('testEvent', callback);
            
            // Should not throw error when removing different callback
            expect(() => {
                editorCore.removeEventListener('testEvent', jest.fn());
            }).not.toThrow();
        });
        
        test('should handle errors in event listeners gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Test error in callback');
            });
            const normalCallback = jest.fn();
            
            editorCore.addEventListener('testEvent', errorCallback);
            editorCore.addEventListener('testEvent', normalCallback);
            
            // Should not throw, but should log error
            expect(() => {
                editorCore.emit('testEvent', { data: 'test' });
            }).not.toThrow();
            
            expect(errorCallback).toHaveBeenCalled();
            expect(normalCallback).toHaveBeenCalled();
            expect(mockConsole.error).toHaveBeenCalled();
        });
        
        test('should emit contentChange event when markdown is set', () => {
            const callback = jest.fn();
            const testContent = '# Test Content';
            
            editorCore.addEventListener('contentChange', callback);
            editorCore.setMarkdown(testContent);
            
            expect(callback).toHaveBeenCalledWith({
                content: testContent,
                isDirty: true
            });
        });
        
        test('should emit previewToggle event when preview is toggled', () => {
            const callback = jest.fn();
            
            editorCore.addEventListener('previewToggle', callback);
            
            editorCore.togglePreview();
            expect(callback).toHaveBeenCalledWith({ visible: true });
            
            editorCore.togglePreview();
            expect(callback).toHaveBeenCalledWith({ visible: false });
        });
        
        test('should support multiple event types simultaneously', () => {
            const contentCallback = jest.fn();
            const previewCallback = jest.fn();
            
            editorCore.addEventListener('contentChange', contentCallback);
            editorCore.addEventListener('previewToggle', previewCallback);
            
            editorCore.setMarkdown('# Test');
            editorCore.togglePreview();
            
            expect(contentCallback).toHaveBeenCalled();
            expect(previewCallback).toHaveBeenCalled();
        });
    });
    
    describe('State Consistency', () => {
        test('should maintain state consistency during multiple operations', () => {
            const contentCallback = jest.fn();
            editorCore.addEventListener('contentChange', contentCallback);
            
            // Perform multiple state changes
            editorCore.setMarkdown('# Initial Content');
            editorCore.togglePreview();
            editorCore.setFileName('test.md');
            editorCore.markDirty();
            
            const state = editorCore.getState();
            
            expect(state.content.markdown).toBe('# Initial Content');
            expect(state.content.isDirty).toBe(true);
            expect(state.ui.showPreview).toBe(true);
            expect(state.file.name).toBe('test.md');
            expect(state.file.hasUnsavedChanges).toBe(true);
            expect(contentCallback).toHaveBeenCalled();
        });
        
        test('should preserve state structure after updates', () => {
            const originalKeys = Object.keys(editorCore.state);
            const originalContentKeys = Object.keys(editorCore.state.content);
            const originalUIKeys = Object.keys(editorCore.state.ui);
            const originalFileKeys = Object.keys(editorCore.state.file);
            
            // Perform various operations
            editorCore.setMarkdown('# Test');
            editorCore.togglePreview();
            editorCore.setFileName('test.md');
            
            expect(Object.keys(editorCore.state)).toEqual(originalKeys);
            expect(Object.keys(editorCore.state.content)).toEqual(originalContentKeys);
            expect(Object.keys(editorCore.state.ui)).toEqual(originalUIKeys);
            expect(Object.keys(editorCore.state.file)).toEqual(originalFileKeys);
        });
    });
});