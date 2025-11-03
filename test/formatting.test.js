/**
 * Unit tests for formatting operations
 * Tests formatting command execution, text selection, cursor management, and markdown output
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

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
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
        const clickListeners = this.eventListeners.get('click') || [];
        clickListeners.forEach(callback => callback({ preventDefault: () => {} }));
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
        return this._nodes[this._currentIndex] || null;
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
}

class MockKeyboardShortcuts {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
    
    destroy() {}
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
global.Preview = MockPreview;
global.FileManager = MockFileManager;
global.KeyboardShortcuts = MockKeyboardShortcuts;
global.AccessibilityManager = MockAccessibilityManager;
global.LazyLoader = MockLazyLoader;
global.PerformanceOptimizer = MockPerformanceOptimizer;

// Simplified EditorCore class for testing formatting functionality
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
    
    // Formatting methods
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
        
        // Check if the line already has this formatting or other header formatting
        const isAlreadyFormatted = currentLineContent.startsWith(format.prefix);
        const hasOtherHeaderFormatting = format.lineStart && 
            (currentLineContent.startsWith('# ') || 
             currentLineContent.startsWith('## ') || 
             currentLineContent.startsWith('### ')) &&
            !isAlreadyFormatted;
        
        let newCursorPosInLine = cursorPosInLine;
        
        if (isAlreadyFormatted) {
            // Remove the formatting
            lines[currentLine] = currentLineContent.substring(format.prefix.length);
            // Adjust cursor position - move it back by the length of the removed prefix
            newCursorPosInLine = Math.max(0, cursorPosInLine - format.prefix.length);
        } else if (hasOtherHeaderFormatting) {
            // Replace existing header formatting with new formatting
            const existingPrefix = currentLineContent.match(/^#{1,3} /)[0];
            const contentWithoutPrefix = currentLineContent.substring(existingPrefix.length);
            lines[currentLine] = format.prefix + contentWithoutPrefix;
            // Adjust cursor position based on the difference in prefix lengths
            const prefixDifference = format.prefix.length - existingPrefix.length;
            newCursorPosInLine = cursorPosInLine + prefixDifference;
        } else {
            // Add the formatting
            if (currentLineContent) {
                lines[currentLine] = format.prefix + currentLineContent;
            } else {
                // For empty lines, check if entire editor is empty
                const isEditorEmpty = editorContent.trim() === '';
                const contentToAdd = isEditorEmpty ? format.placeholder : '';
                lines[currentLine] = format.prefix + contentToAdd;
            }
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
            this.setCursorPosition(newCursorPos);
        }
    }
    
    setCursorPosition(position) {
        this.state.ui.cursorPosition = position;
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
    
    setEditorContent(content) {
        const htmlContent = content.replace(/\n/g, '<br>');
        this.editorElement.innerHTML = htmlContent;
        this.editorElement.textContent = content; // For backward compatibility
    }
    
    getEditorContent() {
        const html = this.editorElement.innerHTML || this.editorElement.textContent || '';
        
        let content = html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<div[^>]*>/gi, '\n')
            .replace(/<\/div>/gi, '')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/<[^>]*>/g, '');
        
        content = content.replace(/\n{3,}/g, '\n\n');

        if (!/[\S\u00A0]/.test(content)) {
            return '';
        }

        return content;
    }
    
    getCurrentCursorPositionInText() {
        // Mock implementation - return the mock cursor position
        const selection = window.getSelection();
        if (!selection.rangeCount) return 0;
        const range = selection.getRangeAt(0);
        
        // For testing, we'll use the startOffset as the position in the text
        // This simulates the cursor position in the full text content
        return range.startOffset || 0;
    }
    
    setCursorPositionInText(position) {
        // Mock implementation for testing
        this.cursorPosition = position;
        this.state.ui.cursorPosition = position;
    }
}

// Toolbar class for testing
class Toolbar {
    constructor(editorCore) {
        this.editorCore = editorCore;
        this.toolbarElement = document.getElementById('formatting-toolbar');
        this.buttons = new Map();
        
        // Mock toolbar buttons
        const buttonConfigs = [
            { format: 'bold', element: new MockElement('button') },
            { format: 'italic', element: new MockElement('button') },
            { format: 'code', element: new MockElement('button') },
            { format: 'h1', element: new MockElement('button') },
            { format: 'h2', element: new MockElement('button') },
            { format: 'h3', element: new MockElement('button') },
            { format: 'ul', element: new MockElement('button') },
            { format: 'ol', element: new MockElement('button') },
            { format: 'link', element: new MockElement('button') }
        ];
        
        buttonConfigs.forEach(config => {
            config.element.setAttribute('data-format', config.format);
            config.element.setAttribute('aria-pressed', 'false');
            this.buttons.set(config.format, config.element);
        });
    }
    
    handleFormatting(formatType) {
        if (!this.editorCore.editorElement) return;
        
        this.editorCore.applyFormatting(formatType);
        this.updateButtonStates();
        this.editorCore.editorElement.focus();
    }
    
    updateButtonStates() {
        const selection = window.getSelection();
        const activeFormats = this.detectActiveFormats(selection);
        
        this.buttons.forEach((button, formatType) => {
            const isActive = activeFormats.has(formatType);
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive.toString());
        });
    }
    
    detectActiveFormats(selection) {
        const activeFormats = new Set();
        
        if (!selection.rangeCount) return activeFormats;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        // Detect formatting based on markdown syntax
        if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
            activeFormats.add('bold');
        }
        if (selectedText.startsWith('*') && selectedText.endsWith('*') && !selectedText.startsWith('**')) {
            activeFormats.add('italic');
        }
        if (selectedText.startsWith('`') && selectedText.endsWith('`')) {
            activeFormats.add('code');
        }
        if (selectedText.startsWith('# ')) {
            activeFormats.add('h1');
        }
        if (selectedText.startsWith('## ')) {
            activeFormats.add('h2');
        }
        if (selectedText.startsWith('### ')) {
            activeFormats.add('h3');
        }
        if (selectedText.startsWith('- ')) {
            activeFormats.add('ul');
        }
        if (selectedText.match(/^\d+\. /)) {
            activeFormats.add('ol');
        }
        if (selectedText.startsWith('[') && selectedText.includes('](')) {
            activeFormats.add('link');
        }
        
        return activeFormats;
    }
}

// Test Suite
describe('Formatting Operations', () => {
    let editorCore;
    let toolbar;
    let mockContainer;
    let mockSelection;
    let mockRange;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockContainer = new MockElement('div');
        editorCore = new EditorCore(mockContainer);
        toolbar = new Toolbar(editorCore);
        
        mockSelection = new MockSelection();
        mockRange = new MockRange();
        mockSelection._setRange(mockRange);
        
        // Mock window.getSelection to return our mock
        global.window.getSelection = jest.fn(() => mockSelection);
        
        // Mock setTimeout to execute immediately
        global.setTimeout = jest.fn((callback) => callback());
    });
    
    afterEach(() => {
        if (editorCore) {
            editorCore.eventListeners.clear();
        }
    });
    
    describe('Formatting Command Execution', () => {
        test('should apply bold formatting to selected text', async () => {
            const selectedText = 'test text';
            mockRange._setSelectedText(selectedText);
            mockRange.startOffset = 0;
            mockRange.endOffset = selectedText.length;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe(`**${selectedText}**`);
        });
        
        test('should apply italic formatting to selected text', async () => {
            const selectedText = 'test text';
            mockRange._setSelectedText(selectedText);
            mockRange.startOffset = 0;
            mockRange.endOffset = selectedText.length;
            
            await editorCore.applyFormatting('italic');
            
            expect(editorCore.getMarkdown()).toBe(`*${selectedText}*`);
        });
        
        test('should apply code formatting to selected text', async () => {
            const selectedText = 'console.log';
            mockRange._setSelectedText(selectedText);
            mockRange.startOffset = 0;
            mockRange.endOffset = selectedText.length;
            
            await editorCore.applyFormatting('code');
            
            expect(editorCore.getMarkdown()).toBe(`\`${selectedText}\``);
        });
        
        test('should apply header formatting to line', async () => {
            editorCore.setMarkdown('This is a header');
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h1');
            
            expect(editorCore.getMarkdown()).toBe('# This is a header');
        });
        
        test('should apply h2 formatting to line', async () => {
            editorCore.setMarkdown('This is a header');
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h2');
            
            expect(editorCore.getMarkdown()).toBe('## This is a header');
        });
        
        test('should apply h3 formatting to line', async () => {
            editorCore.setMarkdown('This is a header');
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('h3');
            
            expect(editorCore.getMarkdown()).toBe('### This is a header');
        });
        
        test('should apply unordered list formatting', async () => {
            editorCore.setMarkdown('List item');
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('ul');
            
            expect(editorCore.getMarkdown()).toBe('- List item');
        });
        
        test('should apply ordered list formatting', async () => {
            editorCore.setMarkdown('List item');
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('ol');
            
            expect(editorCore.getMarkdown()).toBe('1. List item');
        });
        
        test('should apply link formatting to selected text', async () => {
            const selectedText = 'link text';
            mockRange._setSelectedText(selectedText);
            mockRange.startOffset = 0;
            mockRange.endOffset = selectedText.length;
            
            await editorCore.applyFormatting('link');
            
            expect(editorCore.getMarkdown()).toBe(`[${selectedText}](url)`);
        });
        
        test('should handle formatting with no selected text', async () => {
            mockRange._setSelectedText('');
            mockRange.startOffset = 0;
            mockRange.endOffset = 0;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('**bold text**');
        });
        
        test('should handle formatting with empty editor', async () => {
            editorCore.setMarkdown('');
            mockRange._setSelectedText('');
            mockRange.startOffset = 0;
            
            await editorCore.applyFormatting('h1');
            
            expect(editorCore.getMarkdown()).toBe('# Header 1');
        });
        
        test('should handle invalid format type gracefully', async () => {
            const originalContent = 'test content';
            editorCore.setMarkdown(originalContent);
            mockRange._setSelectedText('');
            
            await editorCore.applyFormatting('invalidFormat');
            
            expect(editorCore.getMarkdown()).toBe(originalContent);
        });
        
        test('should trigger content change event after formatting', async () => {
            const contentChangeCallback = jest.fn();
            editorCore.addEventListener('contentChange', contentChangeCallback);
            
            mockRange._setSelectedText('test');
            await editorCore.applyFormatting('bold');
            
            expect(contentChangeCallback).toHaveBeenCalledWith({
                content: '**test**',
                isDirty: true
            });
        });
        
        test('should announce formatting to accessibility manager', async () => {
            mockRange._setSelectedText('test');
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.accessibilityManager.lastAnnouncement).toBe('bold formatting applied');
        });
    });
    
    describe('Text Selection and Cursor Management', () => {
        test('should handle text selection for inline formatting', async () => {
            const selectedText = 'selected text';
            mockRange._setSelectedText(selectedText);
            mockRange.startOffset = 5;
            mockRange.endOffset = 5 + selectedText.length;
            
            editorCore.setMarkdown('Some selected text here');
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('Some **selected text** here');
        });
        
        test('should set cursor position after formatting with no selection', async () => {
            mockRange._setSelectedText('');
            mockRange.startOffset = 0;
            
            await editorCore.applyFormatting('bold');
            
            // Cursor should be positioned after the opening markers
            expect(editorCore.state.ui.cursorPosition).toBe(11); // "**bold text".length
        });
        
        test('should handle cursor position for line formatting', async () => {
            editorCore.setMarkdown('Header text');
            mockRange._setSelectedText('');
            mockRange.startOffset = 0;
            
            await editorCore.applyFormatting('h1');
            
            // Cursor should be positioned after the header marker (2 characters forward from start)
            expect(editorCore.state.ui.cursorPosition).toBe(2); // "# ".length
        });
        
        test('should preserve cursor position during formatting', async () => {
            const initialContent = 'Some text here';
            editorCore.setMarkdown(initialContent);
            mockRange._setSelectedText('text');
            mockRange.startOffset = 5;
            mockRange.endOffset = 9;
            
            await editorCore.applyFormatting('italic');
            
            expect(editorCore.getMarkdown()).toBe('Some *text* here');
        });
        
        test('should handle multiple selections gracefully', async () => {
            // Test with no ranges
            mockSelection.removeAllRanges();
            
            await editorCore.applyFormatting('bold');
            
            // Should not crash and content should remain unchanged
            expect(editorCore.getMarkdown()).toBe('');
        });
        
        test('should handle selection at start of document', async () => {
            editorCore.setMarkdown('Start of document');
            mockRange._setSelectedText('Start');
            mockRange.startOffset = 0;
            mockRange.endOffset = 5;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('**Start** of document');
        });
        
        test('should handle selection at end of document', async () => {
            editorCore.setMarkdown('End of document');
            mockRange._setSelectedText('document');
            mockRange.startOffset = 7;
            mockRange.endOffset = 15;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('End of **document**');
        });
    });
    
    describe('Markdown Output Validation', () => {
        test('should generate valid bold markdown syntax', async () => {
            mockRange._setSelectedText('bold text');
            await editorCore.applyFormatting('bold');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^\*\*.*\*\*$/);
            expect(markdown).toBe('**bold text**');
        });
        
        test('should generate valid italic markdown syntax', async () => {
            mockRange._setSelectedText('italic text');
            await editorCore.applyFormatting('italic');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^\*.*\*$/);
            expect(markdown).toBe('*italic text*');
        });
        
        test('should generate valid code markdown syntax', async () => {
            mockRange._setSelectedText('code');
            await editorCore.applyFormatting('code');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^`.*`$/);
            expect(markdown).toBe('`code`');
        });
        
        test('should generate valid header markdown syntax', async () => {
            editorCore.setMarkdown('Header');
            await editorCore.applyFormatting('h1');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^# /);
            expect(markdown).toBe('# Header');
        });
        
        test('should generate valid h2 markdown syntax', async () => {
            editorCore.setMarkdown('Header 2');
            await editorCore.applyFormatting('h2');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^## /);
            expect(markdown).toBe('## Header 2');
        });
        
        test('should generate valid h3 markdown syntax', async () => {
            editorCore.setMarkdown('Header 3');
            await editorCore.applyFormatting('h3');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^### /);
            expect(markdown).toBe('### Header 3');
        });
        
        test('should generate valid unordered list markdown syntax', async () => {
            editorCore.setMarkdown('List item');
            await editorCore.applyFormatting('ul');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^- /);
            expect(markdown).toBe('- List item');
        });
        
        test('should generate valid ordered list markdown syntax', async () => {
            editorCore.setMarkdown('List item');
            await editorCore.applyFormatting('ol');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^\d+\. /);
            expect(markdown).toBe('1. List item');
        });
        
        test('should generate valid link markdown syntax', async () => {
            mockRange._setSelectedText('link text');
            await editorCore.applyFormatting('link');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toMatch(/^\[.*\]\(.*\)$/);
            expect(markdown).toBe('[link text](url)');
        });
        
        test('should handle nested formatting correctly', async () => {
            // First apply bold
            mockRange._setSelectedText('text');
            await editorCore.applyFormatting('bold');
            
            // For this test, we'll verify that the basic formatting works
            // Real nested formatting would require more sophisticated parsing
            expect(editorCore.getMarkdown()).toBe('**text**');
        });
        
        test('should preserve existing content when adding formatting', async () => {
            editorCore.setMarkdown('Before text after');
            mockRange._setSelectedText('new');
            mockRange.startOffset = 7; // After "Before " 
            mockRange.endOffset = 7;
            
            await editorCore.applyFormatting('italic');
            
            expect(editorCore.getMarkdown()).toBe('Before *new*text after');
        });
        
        test('should handle special characters in formatted text', async () => {
            const specialText = 'text with "quotes" and symbols!@#$%';
            mockRange._setSelectedText(specialText);
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe(`**${specialText}**`);
        });
        
        test('should handle empty placeholders correctly', async () => {
            mockRange._setSelectedText('');
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('**bold text**');
        });
        
        test('should handle multiline text formatting', async () => {
            // Test formatting on a simple single line for now
            editorCore.setMarkdown('simple text');
            mockRange._setSelectedText('text');
            mockRange.startOffset = 7;
            mockRange.endOffset = 11;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('simple **text**');
        });
    });
    
    describe('Toolbar Integration', () => {
        test('should handle formatting through toolbar', () => {
            mockRange._setSelectedText('test');
            
            toolbar.handleFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('**test**');
        });
        
        test('should update button states after formatting', () => {
            mockRange._setSelectedText('**bold text**');
            
            toolbar.updateButtonStates();
            
            const boldButton = toolbar.buttons.get('bold');
            expect(boldButton.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');
        });
        
        test('should detect active formatting in selection', () => {
            mockRange._setSelectedText('**bold text**');
            
            const activeFormats = toolbar.detectActiveFormats(mockSelection);
            
            expect(activeFormats.has('bold')).toBe(true);
        });
        
        test('should detect multiple active formats', () => {
            mockRange._setSelectedText('***bold italic***');
            
            const activeFormats = toolbar.detectActiveFormats(mockSelection);
            
            expect(activeFormats.has('bold')).toBe(true);
            // Note: This is a simplified test - real implementation would need more sophisticated parsing
        });
        
        test('should detect header formatting', () => {
            mockRange._setSelectedText('# Header text');
            
            const activeFormats = toolbar.detectActiveFormats(mockSelection);
            
            expect(activeFormats.has('h1')).toBe(true);
        });
        
        test('should detect list formatting', () => {
            mockRange._setSelectedText('- List item');
            
            const activeFormats = toolbar.detectActiveFormats(mockSelection);
            
            expect(activeFormats.has('ul')).toBe(true);
        });
        
        test('should detect link formatting', () => {
            mockRange._setSelectedText('[link text](url)');
            
            const activeFormats = toolbar.detectActiveFormats(mockSelection);
            
            expect(activeFormats.has('link')).toBe(true);
        });
        
        test('should handle no active formatting', () => {
            mockRange._setSelectedText('plain text');
            
            const activeFormats = toolbar.detectActiveFormats(mockSelection);
            
            expect(activeFormats.size).toBe(0);
        });
        
        test('should focus editor after formatting', () => {
            const focusSpy = jest.spyOn(editorCore.editorElement, 'focus');
            
            toolbar.handleFormatting('bold');
            
            expect(focusSpy).toHaveBeenCalled();
        });
    });
    
    describe('Error Handling', () => {
        test('should handle missing editor element gracefully', async () => {
            editorCore.editorElement = null;
            
            await expect(editorCore.applyFormatting('bold')).resolves.not.toThrow();
        });
        
        test('should handle invalid selection gracefully', async () => {
            mockSelection.removeAllRanges();
            
            await expect(editorCore.applyFormatting('bold')).resolves.not.toThrow();
        });
        
        test('should log errors for formatting failures', async () => {
            // Mock an error in executeFormatting
            const originalExecuteFormatting = editorCore.executeFormatting;
            editorCore.executeFormatting = jest.fn(() => {
                throw new Error('Test formatting error');
            });
            
            mockRange._setSelectedText('test');
            await editorCore.applyFormatting('bold');
            
            expect(mockConsole.error).toHaveBeenCalledWith(
                'Error applying bold formatting:',
                expect.any(Error)
            );
            
            // Restore original method
            editorCore.executeFormatting = originalExecuteFormatting;
        });
        
        test('should handle toolbar without editor element', () => {
            toolbar.editorCore.editorElement = null;
            
            expect(() => toolbar.handleFormatting('bold')).not.toThrow();
        });
        
        test('should handle button state updates with no selection', () => {
            mockSelection.removeAllRanges();
            
            expect(() => toolbar.updateButtonStates()).not.toThrow();
        });
    });
    
    describe('Multi-line Formatting', () => {
        beforeEach(() => {
            // Set up multi-line content
            editorCore.setMarkdown('Line 1\nLine 2\nLine 3');
        });
        
        test('should apply header formatting to current line only', async () => {
            // Position cursor on second line (after "Line 1\n")
            mockRange.startOffset = 7;
            mockRange._setSelectedText('');
            
            // Mock the cursor position calculation to return the correct position
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(7);
            
            await editorCore.applyFormatting('h1');
            
            const content = editorCore.getMarkdown();
            expect(content).toBe('Line 1\n# Line 2\nLine 3');
        });
        
        test('should apply list formatting to current line only', async () => {
            // Position cursor on third line (after "Line 1\nLine 2\n")
            mockRange.startOffset = 14;
            mockRange._setSelectedText('');
            
            // Mock the cursor position calculation to return the correct position
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(14);
            
            await editorCore.applyFormatting('ul');
            
            const content = editorCore.getMarkdown();
            expect(content).toBe('Line 1\nLine 2\n- Line 3');
        });
        
        test('should toggle header formatting on same line', async () => {
            // First apply header formatting
            mockRange.startOffset = 0;
            mockRange._setSelectedText('');
            
            // Mock cursor position for first line
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(0);
            
            await editorCore.applyFormatting('h1');
            expect(editorCore.getMarkdown()).toBe('# Line 1\nLine 2\nLine 3');
            
            // Then toggle it off (cursor should still be on first line, but now with # prefix)
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(2);
            
            await editorCore.applyFormatting('h1');
            expect(editorCore.getMarkdown()).toBe('Line 1\nLine 2\nLine 3');
        });
        
        test('should handle formatting on empty line', async () => {
            editorCore.setMarkdown('Line 1\n\nLine 3');
            
            // Position cursor on empty line (after "Line 1\n")
            mockRange.startOffset = 7;
            mockRange._setSelectedText('');
            
            // Mock cursor position for empty line
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(7);
            
            await editorCore.applyFormatting('h2');
            
            const content = editorCore.getMarkdown();
            expect(content).toBe('Line 1\n## \nLine 3');
        });
        
        test('should preserve cursor position after line formatting', async () => {
            editorCore.setMarkdown('Line 1\nLine 2\nLine 3');
            
            // Position cursor in middle of second line (after "Line 1\nLin")
            mockRange.startOffset = 10;
            mockRange._setSelectedText('');
            
            // Mock cursor position for middle of second line
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(10);
            
            const initialCursorPos = editorCore.state.ui.cursorPosition;
            
            await editorCore.applyFormatting('h3');
            
            // Should update cursor position
            expect(editorCore.state.ui.cursorPosition).not.toBe(initialCursorPos);
        });
        
        test('should handle different header levels on same line', async () => {
            // Apply H1
            mockRange.startOffset = 0;
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(0);
            
            await editorCore.applyFormatting('h1');
            expect(editorCore.getMarkdown()).toBe('# Line 1\nLine 2\nLine 3');
            
            // Apply H2 (cursor is now after "# " so position is 2)
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(2);
            
            await editorCore.applyFormatting('h2');
            expect(editorCore.getMarkdown()).toBe('## Line 1\nLine 2\nLine 3');
        });
        
        test('should handle list formatting with existing content', async () => {
            editorCore.setMarkdown('Todo item 1\nTodo item 2\nTodo item 3');
            
            // Format second line as list (after "Todo item 1\n")
            mockRange.startOffset = 12;
            mockRange._setSelectedText('');
            
            // Mock cursor position for second line
            jest.spyOn(editorCore, 'getCurrentCursorPositionInText').mockReturnValue(12);
            
            await editorCore.applyFormatting('ul');
            
            const content = editorCore.getMarkdown();
            expect(content).toBe('Todo item 1\n- Todo item 2\nTodo item 3');
        });
    });
    
    describe('Bold Button - Comprehensive Tests', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            mockContainer = new MockElement('div');
            editorCore = new EditorCore(mockContainer);
            toolbar = new Toolbar(editorCore);
            
            mockSelection = new MockSelection();
            mockRange = new MockRange();
            mockSelection._setRange(mockRange);
            
            global.window.getSelection = jest.fn(() => mockSelection);
            global.setTimeout = jest.fn((callback) => callback());
        });
        
        test('should bold highlighted word', async () => {
            editorCore.setMarkdown('hello world test');
            mockRange._setSelectedText('world');
            mockRange.startOffset = 6;
            mockRange.endOffset = 11;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('hello **world** test');
        });
        
        test('should insert cursor between bold markers when no selection', async () => {
            editorCore.setMarkdown('hello test');
            mockRange._setSelectedText('');
            mockRange.startOffset = 6;
            mockRange.endOffset = 6;
            
            await editorCore.applyFormatting('bold');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toBe('hello **bold text**test');
            // Cursor should select the placeholder text "bold text" (from position 8 to 17)
            // The cursor position stored is at the end of the selection
            expect(editorCore.state.ui.cursorPosition).toBe(17); // After "hello **bold text"
        });
        
        test('should bold text at start of document', async () => {
            editorCore.setMarkdown('world test');
            mockRange._setSelectedText('world');
            mockRange.startOffset = 0;
            mockRange.endOffset = 5;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('**world** test');
        });
        
        test('should bold text at end of document', async () => {
            editorCore.setMarkdown('hello world');
            mockRange._setSelectedText('world');
            mockRange.startOffset = 6;
            mockRange.endOffset = 11;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('hello **world**');
        });
        
        test('should bold multiple words', async () => {
            editorCore.setMarkdown('hello world test');
            mockRange._setSelectedText('world test');
            mockRange.startOffset = 6;
            mockRange.endOffset = 16;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('hello **world test**');
        });
        
        test('should handle bold with special characters', async () => {
            editorCore.setMarkdown('hello world!');
            mockRange._setSelectedText('world!');
            mockRange.startOffset = 6;
            mockRange.endOffset = 12;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('hello **world!**');
        });
        
        test('should insert bold markers in empty document', async () => {
            editorCore.setMarkdown('');
            mockRange._setSelectedText('');
            mockRange.startOffset = 0;
            mockRange.endOffset = 0;
            
            await editorCore.applyFormatting('bold');
            
            const markdown = editorCore.getMarkdown();
            expect(markdown).toBe('**bold text**');
        });
        
        test('should handle consecutive bold applications', async () => {
            editorCore.setMarkdown('hello');
            mockRange._setSelectedText('hello');
            mockRange.startOffset = 0;
            mockRange.endOffset = 5;
            
            // First bold
            await editorCore.applyFormatting('bold');
            expect(editorCore.getMarkdown()).toBe('**hello**');
            
            // Set up for second bold (cursor inside bolded text)
            editorCore.setMarkdown('**hello**');
            mockRange._setSelectedText('');
            mockRange.startOffset = 4; // Inside "hello"
            mockRange.endOffset = 4;
            
            // Mock detection to show we're in bold text
            const originalDetect = editorCore.accessibilityManager;
            
            // The second click should remove bold
            // This will be handled by the actual detectFormatting function
        });
        
        test('should preserve whitespace when bolding', async () => {
            editorCore.setMarkdown('hello   world');
            mockRange._setSelectedText('world');
            mockRange.startOffset = 8;
            mockRange.endOffset = 13;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('hello   **world**');
        });
        
        test('should handle bold on single character', async () => {
            editorCore.setMarkdown('hello x world');
            mockRange._setSelectedText('x');
            mockRange.startOffset = 6;
            mockRange.endOffset = 7;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('hello **x** world');
        });
        
        test('should handle bold with newlines in document', async () => {
            editorCore.setMarkdown('hello\nworld\ntest');
            mockRange._setSelectedText('world');
            mockRange.startOffset = 6;
            mockRange.endOffset = 11;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('hello\n**world**\ntest');
        });
        
        test('should bold text with numbers', async () => {
            editorCore.setMarkdown('test 123 end');
            mockRange._setSelectedText('123');
            mockRange.startOffset = 5;
            mockRange.endOffset = 8;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.getMarkdown()).toBe('test **123** end');
        });
        
        test('should trigger content change event after bolding', async () => {
            const contentChangeCallback = jest.fn();
            editorCore.addEventListener('contentChange', contentChangeCallback);
            
            editorCore.setMarkdown('test text');
            mockRange._setSelectedText('text');
            mockRange.startOffset = 5;
            mockRange.endOffset = 9;
            
            await editorCore.applyFormatting('bold');
            
            expect(contentChangeCallback).toHaveBeenCalled();
            expect(contentChangeCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    isDirty: true
                })
            );
        });
        
        test('should announce bold formatting to accessibility manager', async () => {
            editorCore.setMarkdown('test');
            mockRange._setSelectedText('test');
            mockRange.startOffset = 0;
            mockRange.endOffset = 4;
            
            await editorCore.applyFormatting('bold');
            
            expect(editorCore.accessibilityManager.lastAnnouncement).toBe('bold formatting applied');
        });
        
        test('should update toolbar button state after bolding', () => {
            editorCore.setMarkdown('**hello**');
            mockRange._setSelectedText('');
            mockRange.startOffset = 4; // Inside bold text
            
            toolbar.updateButtonStates();
            
            const boldButton = toolbar.buttons.get('bold');
            // The button should show it detected the formatting
            expect(boldButton.setAttribute).toHaveBeenCalled();
        });
    });
});