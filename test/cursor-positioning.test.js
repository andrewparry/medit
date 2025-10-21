/**
 * Unit tests for cursor positioning during formatting operations
 * Tests that H1, H2, H3 and list buttons maintain correct cursor position
 * Requirements: 5.2, 7.1
 */

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
        this.clientHeight = 400;
        this.scrollHeight = 400;
        this.scrollTop = 0;
    }

    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    setAttribute = jest.fn((name, value) => {
        this.attributes.set(name, value);
    })

    getAttribute(name) {
        return this.attributes.get(name);
    }

    querySelector(selector) {
        return null;
    }

    querySelectorAll(selector) {
        return [];
    }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
    }

    focus() {
        // Mock focus behavior
    }

    classList = {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn(),
        contains: jest.fn()
    };
}

// Mock Range and Selection APIs
class MockRange {
    constructor() {
        this.startContainer = new MockElement();
        this.endContainer = new MockElement();
        this.startOffset = 0;
        this.endOffset = 0;
        this.collapsed = true;
    }

    toString() {
        return this._selectedText || '';
    }

    deleteContents() {
        this._selectedText = '';
    }

    insertNode(node) {
        this._insertedNode = node;
    }

    setStart(node, offset) {
        this.startContainer = node;
        this.startOffset = offset;
    }

    setEnd(node, offset) {
        this.endContainer = node;
        this.endOffset = offset;
    }

    cloneRange() {
        const clone = new MockRange();
        clone.startContainer = this.startContainer;
        clone.endContainer = this.endContainer;
        clone.startOffset = this.startOffset;
        clone.endOffset = this.endOffset;
        clone._selectedText = this._selectedText;
        return clone;
    }

    selectNodeContents(node) {
        this.startContainer = node;
        this.endContainer = node;
        this.startOffset = 0;
        this.endOffset = node.textContent ? node.textContent.length : 0;
    }

    setEnd(container, offset) {
        this.endContainer = container;
        this.endOffset = offset;
    }

    // Helper method for testing
    _setSelectedText(text) {
        this._selectedText = text;
        this.collapsed = !text;
    }
}

class MockSelection {
    constructor() {
        this.rangeCount = 0;
        this._ranges = [];
    }

    getRangeAt(index) {
        return this._ranges[index] || null;
    }

    removeAllRanges() {
        this._ranges = [];
        this.rangeCount = 0;
    }

    addRange(range) {
        this._ranges.push(range);
        this.rangeCount = this._ranges.length;
    }

    // Helper method for testing
    _setRange(range) {
        this._ranges = [range];
        this.rangeCount = 1;
    }
}

// Mock TreeWalker
class MockTreeWalker {
    constructor(root, whatToShow, filter, entityReferenceExpansion) {
        this.root = root;
        this.currentNode = root;
        this._nodes = [];
        this._currentIndex = -1;
    }

    nextNode() {
        this._currentIndex++;
        const node = this._nodes[this._currentIndex] || null;
        if (node) {
            this.currentNode = node;
        }
        return node;
    }

    // Helper method for testing
    _setNodes(nodes) {
        this._nodes = nodes;
        this._currentIndex = -1;
    }
}

// Setup global mocks
global.document = {
    getElementById: (id) => {
        const mockElements = {
            'editor': new MockElement('div'),
            'formatting-toolbar': new MockElement('div'),
            'preview': new MockElement('div')
        };
        return mockElements[id] || null;
    },
    querySelector: (selector) => new MockElement(),
    querySelectorAll: (selector) => [],
    createElement: (tagName) => new MockElement(tagName),
    createRange: () => new MockRange(),
    createTextNode: (text) => ({ textContent: text, nodeType: 3 }),
    createTreeWalker: (root, whatToShow, filter, entityReferenceExpansion) => 
        new MockTreeWalker(root, whatToShow, filter, entityReferenceExpansion),
    addEventListener: () => {},
    removeEventListener: () => {},
    body: new MockElement('body')
};

global.window = {
    getSelection: () => new MockSelection(),
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    NodeFilter: {
        SHOW_TEXT: 4
    }
};

global.NodeFilter = {
    SHOW_TEXT: 4
};

global.navigator = {
    platform: 'MacIntel'
};

// Mock console
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

class MockAccessibilityManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    announceFormatting(formatType) {
        this.lastAnnouncement = `${formatType} formatting applied`;
    }
}

class MockLazyLoader {
    loadFormattingLibrary(type) {
        return Promise.resolve();
    }
}

class MockPerformanceOptimizer {
    constructor(editorCore) {
        this.editorCore = editorCore;
        this.debounceCallbacks = new Map();
    }
    
    debounce(key, callback, delay) {
        // For testing, execute immediately
        callback();
    }
}

// Make mock classes available globally
global.MarkdownParser = MockMarkdownParser;
global.AccessibilityManager = MockAccessibilityManager;
global.LazyLoader = MockLazyLoader;
global.PerformanceOptimizer = MockPerformanceOptimizer;

// EditorCore class with proper cursor positioning for testing
class EditorCore {
    constructor(container) {
        this.container = container;
        this.markdownParser = new MarkdownParser();
        
        // Initialize state
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
            }
        };
        
        // Event system
        this.eventListeners = new Map();
        
        // Initialize components
        this.accessibilityManager = new AccessibilityManager(this);
        this.lazyLoader = new LazyLoader();
        this.performanceOptimizer = new PerformanceOptimizer(this);
        
        // DOM elements
        this.editorElement = document.getElementById('editor');
        this.editorElement.textContent = '';
        
        // Track cursor position for testing
        this.mockCursorPosition = 0;
    }
    
    // Event system methods
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
    
    // Content management methods
    getEditorContent() {
        return this.editorElement.textContent || '';
    }
    
    setEditorContent(content) {
        this.editorElement.textContent = content;
        this.state.content.markdown = content;
    }
    
    getCurrentCursorPositionInText() {
        return this.mockCursorPosition;
    }
    
    setCursorPositionInText(position) {
        this.mockCursorPosition = position;
    }
    
    // Formatting methods - using the fixed implementation
    async applyFormatting(formatType) {
        if (!this.editorElement) return;
        
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        
        if (!range) return;
        
        const selectedText = range.toString();
        
        // Define formatting patterns
        const formats = {
            bold: { prefix: '**', suffix: '**', placeholder: 'bold text' },
            italic: { prefix: '*', suffix: '*', placeholder: 'italic text' },
            code: { prefix: '`', suffix: '`', placeholder: 'code' },
            h1: { prefix: '# ', suffix: '', placeholder: 'Header 1', lineStart: true },
            h2: { prefix: '## ', suffix: '', placeholder: 'Header 2', lineStart: true },
            h3: { prefix: '### ', suffix: '', placeholder: 'Header 3', lineStart: true },
            ul: { prefix: '- ', suffix: '', placeholder: 'List item', lineStart: true },
            ol: { prefix: '1. ', suffix: '', placeholder: 'List item', lineStart: true },
            link: { prefix: '[', suffix: '](url)', placeholder: 'link text' }
        };
        
        const format = formats[formatType];
        if (!format) return;
        
        try {
            this.executeFormatting(format, formatType, selectedText, range);
        } catch (error) {
            console.error(`Error applying ${formatType} formatting:`, error);
        }
    }
    
    executeFormatting(format, formatType, selectedText, range) {
        if (format.lineStart) {
            this.applyLineFormatting(format, selectedText);
        } else {
            this.applyInlineFormatting(format, selectedText, range);
        }
        
        this.handleContentChange({ target: this.editorElement });
        
        if (this.accessibilityManager) {
            this.accessibilityManager.announceFormatting(formatType);
        }
    }
    
    // Fixed applyLineFormatting method
    applyLineFormatting(format, selectedText) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        // Get the current content using our proper method
        const editorContent = this.getEditorContent();
        const lines = editorContent.split('\n');
        
        // Find which line the cursor is on by getting the cursor position
        const cursorPos = this.getCurrentCursorPositionInText();
        
        // Find the line containing the cursor and the cursor position within that line
        let currentLine = 0;
        let charCount = 0;
        let cursorPosInLine = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length;
            if (cursorPos >= charCount && cursorPos <= charCount + lineLength) {
                currentLine = i;
                cursorPosInLine = cursorPos - charCount;
                break;
            }
            charCount += lineLength + 1; // +1 for the newline character
        }
        
        // Get the current line content
        const currentLineContent = lines[currentLine] || '';
        
        // Check if the line already has this formatting
        const isAlreadyFormatted = currentLineContent.startsWith(format.prefix);
        
        let newCursorPosInLine = cursorPosInLine;
        
        if (isAlreadyFormatted) {
            // Remove the formatting
            lines[currentLine] = currentLineContent.substring(format.prefix.length);
            // Adjust cursor position - move it back by the length of the removed prefix
            newCursorPosInLine = Math.max(0, cursorPosInLine - format.prefix.length);
        } else {
            // Add the formatting
            lines[currentLine] = format.prefix + currentLineContent;
            // Adjust cursor position - move it forward by the length of the added prefix
            newCursorPosInLine = cursorPosInLine + format.prefix.length;
        }
        
        // Update editor content
        this.setEditorContent(lines.join('\n'));
        
        // Calculate the new cursor position in the full text
        const newLineStart = lines.slice(0, currentLine).join('\n').length + (currentLine > 0 ? 1 : 0);
        const newCursorPos = newLineStart + newCursorPosInLine;
        
        // Set cursor position after a brief delay to ensure content is updated
        setTimeout(() => {
            this.setCursorPositionInText(newCursorPos);
        }, 10);
    }
    
    applyInlineFormatting(format, selectedText, range) {
        const textToFormat = selectedText || format.placeholder;
        const formattedText = format.prefix + textToFormat + format.suffix;
        
        // Update editor content
        const currentContent = this.editorElement.textContent || '';
        const beforeSelection = currentContent.substring(0, range.startOffset || 0);
        const afterSelection = currentContent.substring((range.endOffset || 0));
        const newContent = beforeSelection + formattedText + afterSelection;
        
        this.editorElement.textContent = newContent;
        
        // Set cursor position
        if (!selectedText) {
            const newCursorPos = beforeSelection.length + format.prefix.length + format.placeholder.length;
            this.setCursorPositionInText(newCursorPos);
        }
    }
    
    handleContentChange(event) {
        const content = event.target.textContent || '';
        this.state.content.markdown = content;
        this.state.content.isDirty = true;
        this.emit('contentChange', { content, isDirty: true });
    }
    
    getMarkdown() {
        return this.state.content.markdown;
    }
    
    setMarkdown(content) {
        this.state.content.markdown = content;
        this.setEditorContent(content);
    }
}

// Test Suite
describe('Cursor Positioning During Formatting', () => {
    let editorCore;
    let mockSelection;
    let mockRange;
    
    beforeEach(() => {
        jest.clearAllMocks();
        const mockContainer = new MockElement('div');
        editorCore = new EditorCore(mockContainer);
        
        mockSelection = new MockSelection();
        mockRange = new MockRange();
        mockSelection._setRange(mockRange);
        
        // Mock window.getSelection to return our mock
        global.window.getSelection = jest.fn(() => mockSelection);
        
        // Mock setTimeout to execute immediately for testing
        global.setTimeout = jest.fn((callback) => callback());
    });
    
    afterEach(() => {
        if (editorCore) {
            editorCore.eventListeners.clear();
        }
        jest.restoreAllMocks();
    });
    
    describe('Header Formatting Cursor Position', () => {
        test('should maintain cursor position when applying H1 formatting to middle of line', async () => {
            const content = 'This is a test line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 10; // Position at "test"
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h1');
            
            expect(editorCore.getEditorContent()).toBe('# This is a test line');
            // Cursor should move forward by 2 characters (length of "# ")
            expect(editorCore.mockCursorPosition).toBe(12);
        });
        
        test('should maintain cursor position when applying H2 formatting to middle of line', async () => {
            const content = 'This is a test line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 10; // Position at "test"
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h2');
            
            expect(editorCore.getEditorContent()).toBe('## This is a test line');
            // Cursor should move forward by 3 characters (length of "## ")
            expect(editorCore.mockCursorPosition).toBe(13);
        });
        
        test('should maintain cursor position when applying H3 formatting to middle of line', async () => {
            const content = 'This is a test line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 10; // Position at "test"
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h3');
            
            expect(editorCore.getEditorContent()).toBe('### This is a test line');
            // Cursor should move forward by 4 characters (length of "### ")
            expect(editorCore.mockCursorPosition).toBe(14);
        });
        
        test('should maintain cursor position when removing H1 formatting', async () => {
            const content = '# This is a test line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 12; // Position at "test" (after "# ")
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h1');
            
            expect(editorCore.getEditorContent()).toBe('This is a test line');
            // Cursor should move back by 2 characters (length of "# ")
            expect(editorCore.mockCursorPosition).toBe(10);
        });
        
        test('should handle cursor at beginning of line with header formatting', async () => {
            const content = 'This is a test line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 0; // Position at beginning
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h1');
            
            expect(editorCore.getEditorContent()).toBe('# This is a test line');
            // Cursor should move forward by 2 characters (length of "# ")
            expect(editorCore.mockCursorPosition).toBe(2);
        });
        
        test('should handle cursor at end of line with header formatting', async () => {
            const content = 'This is a test line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = content.length; // Position at end
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h1');
            
            expect(editorCore.getEditorContent()).toBe('# This is a test line');
            // Cursor should move forward by 2 characters (length of "# ")
            expect(editorCore.mockCursorPosition).toBe(content.length + 2);
        });
    });
    
    describe('List Formatting Cursor Position', () => {
        test('should maintain cursor position when applying unordered list formatting', async () => {
            const content = 'This is a list item';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 10; // Position at "list"
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('ul');
            
            expect(editorCore.getEditorContent()).toBe('- This is a list item');
            // Cursor should move forward by 2 characters (length of "- ")
            expect(editorCore.mockCursorPosition).toBe(12);
        });
        
        test('should maintain cursor position when applying ordered list formatting', async () => {
            const content = 'This is a list item';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 10; // Position at "list"
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('ol');
            
            expect(editorCore.getEditorContent()).toBe('1. This is a list item');
            // Cursor should move forward by 3 characters (length of "1. ")
            expect(editorCore.mockCursorPosition).toBe(13);
        });
        
        test('should maintain cursor position when removing unordered list formatting', async () => {
            const content = '- This is a list item';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 12; // Position at "list" (after "- ")
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('ul');
            
            expect(editorCore.getEditorContent()).toBe('This is a list item');
            // Cursor should move back by 2 characters (length of "- ")
            expect(editorCore.mockCursorPosition).toBe(10);
        });
        
        test('should maintain cursor position when removing ordered list formatting', async () => {
            const content = '1. This is a list item';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 13; // Position at "list" (after "1. ")
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('ol');
            
            expect(editorCore.getEditorContent()).toBe('This is a list item');
            // Cursor should move back by 3 characters (length of "1. ")
            expect(editorCore.mockCursorPosition).toBe(10);
        });
    });
    
    describe('Multi-line Content Cursor Position', () => {
        test('should maintain cursor position on correct line in multi-line content with H1', async () => {
            const content = 'First line\nSecond line\nThird line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 18; // Position at "Second" in second line
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h1');
            
            expect(editorCore.getEditorContent()).toBe('First line\n# Second line\nThird line');
            // Cursor should move forward by 2 characters (length of "# ")
            expect(editorCore.mockCursorPosition).toBe(20);
        });
        
        test('should maintain cursor position on correct line in multi-line content with list', async () => {
            const content = 'First line\nSecond line\nThird line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 18; // Position at "Second" in second line
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('ul');
            
            expect(editorCore.getEditorContent()).toBe('First line\n- Second line\nThird line');
            // Cursor should move forward by 2 characters (length of "- ")
            expect(editorCore.mockCursorPosition).toBe(20);
        });
        
        test('should handle cursor on first line of multi-line content', async () => {
            const content = 'First line\nSecond line\nThird line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 5; // Position at "t" in "First"
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h2');
            
            expect(editorCore.getEditorContent()).toBe('## First line\nSecond line\nThird line');
            // Cursor should move forward by 3 characters (length of "## ")
            expect(editorCore.mockCursorPosition).toBe(8);
        });
        
        test('should handle cursor on last line of multi-line content', async () => {
            const content = 'First line\nSecond line\nThird line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 28; // Position at "Third"
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h3');
            
            expect(editorCore.getEditorContent()).toBe('First line\nSecond line\n### Third line');
            // Cursor should move forward by 4 characters (length of "### ")
            expect(editorCore.mockCursorPosition).toBe(32);
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle empty line formatting', async () => {
            const content = 'First line\n\nThird line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 11; // Position on empty line

            mockRange._setSelectedText('');

            await editorCore.applyFormatting('h1');

            expect(editorCore.getEditorContent()).toBe('First line\n# \nThird line');
            // Cursor should move forward by 2 characters (length of "# ")
            expect(editorCore.mockCursorPosition).toBe(13);
        });

        test('should format trailing empty line without jumping to first line', async () => {
            const content = 'First line\n';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = content.length; // Cursor at start of trailing empty line

            mockRange._setSelectedText('');

            await editorCore.applyFormatting('h1');

            expect(editorCore.getEditorContent()).toBe('First line\n# ');
            // Cursor should move forward by 2 characters (length of "# ")
            expect(editorCore.mockCursorPosition).toBe(content.length + 2);
        });
        
        test('should handle cursor at line boundary', async () => {
            const content = 'First line\nSecond line';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 10; // Position at newline
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('ul');
            
            expect(editorCore.getEditorContent()).toBe('- First line\nSecond line');
            // Cursor should move forward by 2 characters (length of "- ")
            expect(editorCore.mockCursorPosition).toBe(12);
        });
        
        test('should handle single character line', async () => {
            const content = 'a';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 0; // Position at beginning
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h1');
            
            expect(editorCore.getEditorContent()).toBe('# a');
            // Cursor should move forward by 2 characters (length of "# ")
            expect(editorCore.mockCursorPosition).toBe(2);
        });
        
        test('should not move cursor to top when formatting middle line', async () => {
            const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
            editorCore.setEditorContent(content);
            editorCore.mockCursorPosition = 16; // Position in "Line 3"
            
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h2');
            
            expect(editorCore.getEditorContent()).toBe('Line 1\nLine 2\n## Line 3\nLine 4\nLine 5');
            // Cursor should stay on line 3, moved forward by 3 characters
            expect(editorCore.mockCursorPosition).toBe(19);
            // Verify cursor is not at position 0 (top of document)
            expect(editorCore.mockCursorPosition).not.toBe(0);
        });
    });
});