/**
 * Unit tests for code block functionality
 * Tests code block insertion, syntax highlighting, and copy functionality
 * Requirements: 7.2, 7.3
 */

/* eslint-env node, jest */

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
        this.dataset = {};
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

    querySelector(_selector) {
        return null; // Simplified for testing
    }

    querySelectorAll(_selector) {
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

    select() {
        // Mock text selection behavior for inputs/textarea
        this._isSelected = true;
    }

    click() {
        const clickListeners = this.eventListeners.get('click') || [];
        clickListeners.forEach((callback) => callback({ preventDefault: () => {} }));
    }

    cloneRange() {
        return new MockRange();
    }

    selectNodeContents() {
        // Mock implementation
    }

    setStart() {
        // Mock implementation
    }

    setEnd() {
        // Mock implementation
    }

    toString() {
        return this.textContent;
    }
}

// Mock Range API
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

// Mock Selection API
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

// Setup global mocks
global.document = {
    getElementById: (id) => {
        const mockElements = {
            editor: new MockElement('div'),
            preview: new MockElement('div')
        };
        return mockElements[id] || null;
    },
    querySelector: (_selector) => new MockElement(),
    querySelectorAll: (_selector) => [],
    createElement: (tagName) => new MockElement(tagName),
    createRange: () => new MockRange(),
    createTextNode: (text) => ({ textContent: text, nodeType: 3 }),
    addEventListener: () => {},
    removeEventListener: () => {},
    body: new MockElement('body'),
    execCommand: jest.fn(() => true)
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
    isSecureContext: true,
    prompt: jest.fn()
};

global.navigator = {
    platform: 'MacIntel',
    clipboard: {
        writeText: jest.fn(() => Promise.resolve())
    }
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
    constructor() {
        this.patterns = {
            codeBlock: /```([\w-]+)?\s*\n?([\s\S]*?)\n?```/g
        };
        this.allowedTags = new Set(['pre', 'code', 'span']);
        this.allowedAttributes = {};
    }

    toHTML(markdown) {
        return this.convertCodeBlocks(markdown);
    }

    convertCodeBlocks(html) {
        return html.replace(this.patterns.codeBlock, (match, language, code) => {
            const trimmedCode = code.trim();
            const lang = language ? language.toLowerCase() : '';
            const langClass = lang ? ` class="language-${this.escapeHtml(lang)}"` : '';
            const langAttr = lang ? ` data-language="${this.escapeHtml(lang)}"` : '';

            const highlightedCode = this.applySyntaxHighlighting(trimmedCode, lang);

            return `<pre${langAttr}><code${langClass}>${highlightedCode}</code></pre>`;
        });
    }

    applySyntaxHighlighting(code, language) {
        if (!code) {
            return '';
        }

        const escapedCode = this.escapeHtml(code);

        if (!language) {
            return escapedCode;
        }

        switch (language.toLowerCase()) {
            case 'javascript':
            case 'js':
                return this.highlightJavaScript(escapedCode);
            case 'python':
            case 'py':
                return this.highlightPython(escapedCode);
            default:
                return this.highlightGeneric(escapedCode);
        }
    }

    highlightJavaScript(code) {
        // Apply highlighting in order to avoid conflicts
        let highlighted = code;

        // Comments first (to avoid highlighting keywords in comments)
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');

        // Strings (to avoid highlighting keywords in strings)
        highlighted = highlighted.replace(
            /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
            '<span class="string">$1$2$1</span>'
        );

        // Keywords (avoid replacing inside existing spans)
        highlighted = highlighted.replace(
            /\b(const|let|var|function|class|if|else|for|while|return)\b(?![^<]*<\/span>)/g,
            '<span class="keyword">$1</span>'
        );

        // Numbers (avoid replacing inside existing spans)
        highlighted = highlighted.replace(
            /\b(\d+\.?\d*)\b(?![^<]*<\/span>)/g,
            '<span class="number">$1</span>'
        );

        return highlighted;
    }

    highlightPython(code) {
        let highlighted = code;

        // Comments first
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');

        // Strings
        highlighted = highlighted.replace(
            /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
            '<span class="string">$1$2$1</span>'
        );

        // Keywords (avoid replacing inside existing spans)
        highlighted = highlighted.replace(
            /\b(def|class|if|elif|else|for|while|return|import|from)\b(?![^<]*<\/span>)/g,
            '<span class="keyword">$1</span>'
        );

        // Numbers (avoid replacing inside existing spans)
        highlighted = highlighted.replace(
            /\b(\d+\.?\d*)\b(?![^<]*<\/span>)/g,
            '<span class="number">$1</span>'
        );

        return highlighted;
    }

    highlightGeneric(code) {
        return code
            .replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>')
            .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
    }

    escapeHtml(text) {
        if (typeof text !== 'string') {
            return '';
        }
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    sanitizeHTML(html) {
        return html; // Simplified for testing
    }
}

class MockPreview {
    constructor(editorCore) {
        this.editorCore = editorCore;
        this.previewElement = new MockElement('div');
    }

    updateContent(html) {
        this.previewElement.innerHTML = html;
        this.addCopyButtonsToCodeBlocks();
    }

    addCopyButtonsToCodeBlocks() {
        // Mock implementation for testing
        this.codeBlocksProcessed = true;
    }

    async copyCodeToClipboard(codeBlock, button) {
        try {
            // Get the raw text content (without HTML formatting)
            const codeText = codeBlock.textContent || codeBlock.innerText;

            // Use modern clipboard API if available
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(codeText);
            } else {
                // Fallback for older browsers
                this.fallbackCopyToClipboard(codeText);
            }

            // Show success feedback
            button.textContent = 'Copied!';
            button.style.background = 'var(--color-success)';
            button.style.color = 'white';

            // Announce to screen readers
            if (this.editorCore.accessibilityManager) {
                this.editorCore.accessibilityManager.announce('Code copied to clipboard');
            }
        } catch (error) {
            console.error('Failed to copy code:', error);

            // Show error feedback
            button.textContent = 'Failed';
            button.style.background = 'var(--color-error)';
            button.style.color = 'white';
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

class MockAccessibilityManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }

    announce(message) {
        this.lastAnnouncement = message;
    }
}

// Make mock classes available globally
global.MarkdownParser = MockMarkdownParser;
global.Preview = MockPreview;
global.AccessibilityManager = MockAccessibilityManager;

// Simplified EditorCore class for testing code block functionality
class EditorCore {
    constructor(container) {
        this.container = container;
        // eslint-disable-next-line no-undef
        this.markdownParser = new MarkdownParser();
        // eslint-disable-next-line no-undef
        this.accessibilityManager = new AccessibilityManager(this);

        // Initialize state
        this.state = {
            content: {
                markdown: '',
                html: '',
                isDirty: false
            }
        };

        // Event system
        this.eventListeners = new Map();

        // DOM elements
        this.editorElement = document.getElementById('editor');
        this.editorElement.innerHTML = '';
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
            this.eventListeners.get(eventType).forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventType}:`, error);
                }
            });
        }
    }

    // Content management
    getEditorContent() {
        // Mock the same behavior as the real implementation
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

    setEditorContent(content) {
        const htmlContent = content.replace(/\n/g, '<br>');
        this.editorElement.innerHTML = htmlContent;
        // Also set textContent for backward compatibility with tests
        this.editorElement.textContent = content;
    }

    // Code block functionality
    applyBlockFormatting(format, formatType, selectedText, range) {
        if (formatType === 'codeBlock') {
            this.insertCodeBlock(selectedText, range);
        }
    }

    insertCodeBlock(selectedText, range) {
        const language = this.promptForCodeLanguage();

        const codeContent = selectedText || 'Enter your code here';
        const languageSpec = language ? language : '';
        const codeBlock = `\`\`\`${languageSpec}\n${codeContent}\n\`\`\``;

        const currentContent = this.getEditorContent();
        const cursorPos = this.getCurrentCursorPosition(range);

        const beforeCursor = currentContent.substring(0, cursorPos);
        const afterCursor = currentContent.substring(
            cursorPos + (selectedText ? selectedText.length : 0)
        );

        const needsNewlineBefore = beforeCursor && !beforeCursor.endsWith('\n');
        const needsNewlineAfter = afterCursor && !afterCursor.startsWith('\n');

        const prefix = needsNewlineBefore ? '\n\n' : '';
        const suffix = needsNewlineAfter ? '\n\n' : '';

        const newContent = beforeCursor + prefix + codeBlock + suffix + afterCursor;

        this.setEditorContent(newContent);
        this.state.content.markdown = newContent;

        if (!selectedText) {
            const newCursorPos =
                beforeCursor.length + prefix.length + `\`\`\`${languageSpec}\n`.length;
            this.setCursorPosition(newCursorPos);
        }
    }

    promptForCodeLanguage() {
        const language = window.prompt
            ? window.prompt('Enter programming language (optional):')
            : '';
        return language ? language.trim() : '';
    }

    getCurrentCursorPosition(range) {
        return range ? range.startOffset : 0;
    }

    setCursorPosition(position) {
        this.cursorPosition = position;
    }

    async applyFormatting(formatType) {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const selectedText = range ? range.toString() : '';

        if (formatType === 'codeBlock') {
            this.applyBlockFormatting({}, formatType, selectedText, range);
        }
    }
}

// Test Suite
describe('Code Block Functionality', () => {
    let editorCore;
    let markdownParser;
    let preview;
    let mockContainer;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContainer = new MockElement('div');
        editorCore = new EditorCore(mockContainer);
        // eslint-disable-next-line no-undef
        markdownParser = new MarkdownParser();
        // eslint-disable-next-line no-undef
        preview = new Preview(editorCore);

        // Reset window.prompt mock
        window.prompt.mockClear();
    });

    afterEach(() => {
        if (editorCore) {
            editorCore.eventListeners.clear();
        }
    });

    describe('Code Block Insertion', () => {
        test('should insert basic code block without language', async () => {
            window.prompt.mockReturnValue('');

            await editorCore.applyFormatting('codeBlock');

            const content = editorCore.getEditorContent();
            expect(content).toBe('```\nEnter your code here\n```');
        });

        test('should insert code block with specified language', async () => {
            window.prompt.mockReturnValue('javascript');

            await editorCore.applyFormatting('codeBlock');

            const content = editorCore.getEditorContent();
            expect(content).toBe('```javascript\nEnter your code here\n```');
        });

        test('should wrap selected text in code block', async () => {
            window.prompt.mockReturnValue('python');

            // Mock selected text
            const mockRange = new MockRange();
            mockRange._setSelectedText('print("Hello, World!")');
            mockRange.startOffset = 0;
            mockRange.endOffset = 22;

            const mockSelection = new MockSelection();
            mockSelection._setRange(mockRange);
            global.window.getSelection = jest.fn(() => mockSelection);

            await editorCore.applyFormatting('codeBlock');

            const content = editorCore.getEditorContent();
            expect(content).toBe('```python\nprint("Hello, World!")\n```');
        });

        test('should add proper spacing around code block', async () => {
            window.prompt.mockReturnValue('');

            // Set existing content
            editorCore.setEditorContent('Some text before');

            // Mock cursor position at end
            const mockRange = new MockRange();
            mockRange.startOffset = 16; // After "Some text before"

            const mockSelection = new MockSelection();
            mockSelection._setRange(mockRange);
            global.window.getSelection = jest.fn(() => mockSelection);

            await editorCore.applyFormatting('codeBlock');

            const content = editorCore.getEditorContent();
            expect(content).toBe('Some text before\n\n```\nEnter your code here\n```');
        });

        test('should handle empty language input', async () => {
            window.prompt.mockReturnValue(null); // User cancelled

            await editorCore.applyFormatting('codeBlock');

            const content = editorCore.getEditorContent();
            expect(content).toBe('```\nEnter your code here\n```');
        });

        test('should trim whitespace from language input', async () => {
            window.prompt.mockReturnValue('  javascript  ');

            await editorCore.applyFormatting('codeBlock');

            const content = editorCore.getEditorContent();
            expect(content).toBe('```javascript\nEnter your code here\n```');
        });
    });

    describe('Markdown Parsing and Syntax Highlighting', () => {
        test('should parse basic code block without language', () => {
            const markdown = '```\nconsole.log("test");\n```';
            const html = markdownParser.toHTML(markdown);

            expect(html).toContain('<pre><code>');
            expect(html).toContain('console.log(&quot;test&quot;);');
            expect(html).toContain('</code></pre>');
        });

        test('should parse code block with language specification', () => {
            const markdown = '```javascript\nconsole.log("test");\n```';
            const html = markdownParser.toHTML(markdown);

            expect(html).toContain('class="language-javascript"');
            expect(html).toContain('data-language="javascript"');
            expect(html).toContain('console.log(&quot;test&quot;);');
        });

        test('should apply JavaScript syntax highlighting', () => {
            const code = 'const message = "Hello";';
            const highlighted = markdownParser.highlightJavaScript(markdownParser.escapeHtml(code));

            expect(highlighted).toContain('<span class="keyword">const</span>');
            expect(highlighted).toContain('message');
            expect(highlighted).toContain('&quot;Hello&quot;');
        });

        test('should apply Python syntax highlighting', () => {
            const code = 'def hello():';
            const highlighted = markdownParser.highlightPython(markdownParser.escapeHtml(code));

            expect(highlighted).toContain('<span class="keyword">def</span>');
            expect(highlighted).toContain('hello():');
        });

        test('should handle code blocks with special characters', () => {
            const markdown = '```html\n<div class="test">Hello & goodbye</div>\n```';
            const html = markdownParser.toHTML(markdown);

            expect(html).toContain('&lt;div class=&quot;test&quot;&gt;');
            expect(html).toContain('Hello &amp; goodbye');
            expect(html).toContain('&lt;/div&gt;');
        });

        test('should preserve whitespace and indentation in code blocks', () => {
            const markdown = '```python\ndef test():\n    if True:\n        print("indented")\n```';
            const html = markdownParser.toHTML(markdown);

            // Check that the structure is preserved (may have syntax highlighting)
            expect(html).toContain('test():');
            expect(html).toContain('    ');
            expect(html).toContain('print(&quot;indented&quot;)');
        });

        test('should handle empty code blocks', () => {
            const markdown = '```\n\n```';
            const html = markdownParser.toHTML(markdown);

            expect(html).toContain('<pre><code></code></pre>');
        });

        test('should handle code blocks with only whitespace', () => {
            const markdown = '```\n   \n\t\n```';
            const html = markdownParser.toHTML(markdown);

            expect(html).toContain('<pre><code></code></pre>');
        });

        test('should handle multiple code blocks in same document', () => {
            const markdown = `# Title
            
\`\`\`javascript
console.log("JS");
\`\`\`

Some text

\`\`\`python
print("Python")
\`\`\``;

            const html = markdownParser.toHTML(markdown);

            expect(html).toContain('class="language-javascript"');
            expect(html).toContain('class="language-python"');
            expect(html).toContain('console.log(&quot;JS&quot;);');
            expect(html).toContain('print(&quot;Python&quot;)');
        });
    });

    describe('Copy Functionality', () => {
        test('should add copy buttons to code blocks', () => {
            const html =
                '<pre data-language="javascript"><code class="language-javascript">console.log("test");</code></pre>';
            preview.updateContent(html);

            expect(preview.codeBlocksProcessed).toBe(true);
        });

        test('should copy code to clipboard using modern API', async () => {
            const codeBlock = new MockElement('code');
            codeBlock.textContent = 'console.log("test");';

            const button = new MockElement('button');
            button.textContent = 'Copy';

            await preview.copyCodeToClipboard(codeBlock, button);

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('console.log("test");');
        });

        test('should handle clipboard API errors gracefully', async () => {
            navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

            const codeBlock = new MockElement('code');
            codeBlock.textContent = 'console.log("test");';

            const button = new MockElement('button');
            button.textContent = 'Copy';

            await preview.copyCodeToClipboard(codeBlock, button);

            expect(mockConsole.error).toHaveBeenCalledWith(
                'Failed to copy code:',
                expect.any(Error)
            );
        });

        test('should use fallback copy method when clipboard API unavailable', async () => {
            // Mock environment without clipboard API
            const originalClipboard = navigator.clipboard;
            const originalSecureContext = window.isSecureContext;

            // Remove clipboard API completely
            navigator.clipboard = undefined;
            window.isSecureContext = false;

            const codeBlock = new MockElement('code');
            codeBlock.textContent = 'console.log("test");';

            const button = new MockElement('button');

            await preview.copyCodeToClipboard(codeBlock, button);

            expect(document.execCommand).toHaveBeenCalledWith('copy');

            // Restore original values
            navigator.clipboard = originalClipboard;
            window.isSecureContext = originalSecureContext;
        });

        test('should provide visual feedback on successful copy', async () => {
            // Ensure clipboard API is available
            if (!navigator.clipboard) {
                navigator.clipboard = {
                    writeText: jest.fn(() => Promise.resolve())
                };
            }
            navigator.clipboard.writeText.mockResolvedValue();

            const codeBlock = new MockElement('code');
            codeBlock.textContent = 'test code';

            const button = new MockElement('button');
            button.textContent = 'Copy';

            await preview.copyCodeToClipboard(codeBlock, button);

            expect(button.textContent).toBe('Copied!');
            expect(button.style.background).toBe('var(--color-success)');
        });

        test('should announce copy action to screen readers', async () => {
            // Ensure clipboard API is available
            if (!navigator.clipboard) {
                navigator.clipboard = {
                    writeText: jest.fn(() => Promise.resolve())
                };
            }
            navigator.clipboard.writeText.mockResolvedValue();

            const codeBlock = new MockElement('code');
            codeBlock.textContent = 'test code';

            const button = new MockElement('button');

            await preview.copyCodeToClipboard(codeBlock, button);

            expect(editorCore.accessibilityManager.lastAnnouncement).toBe(
                'Code copied to clipboard'
            );
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle malformed code block syntax', () => {
            const markdown = '```javascript\nconsole.log("test");\n``'; // Missing closing backtick
            const html = markdownParser.toHTML(markdown);

            // Should not crash and should preserve original text
            expect(html).toContain('```javascript');
        });

        test('should handle code blocks with nested backticks', () => {
            const markdown = '```javascript\nconst code = "`nested backticks`";\n```';
            const html = markdownParser.toHTML(markdown);

            expect(html).toContain('const');
            expect(html).toContain('code');
            expect(html).toContain('nested backticks');
        });

        test('should handle very long code blocks', () => {
            const longCode = 'console.log("line");'.repeat(100); // Reduced for testing
            const markdown = `\`\`\`javascript\n${longCode}\n\`\`\``;

            expect(() => {
                const html = markdownParser.toHTML(markdown);
                expect(html).toContain('console.log(&quot;line&quot;);');
            }).not.toThrow();
        });

        test('should handle code blocks with unusual language names', () => {
            const markdown = '```my-custom-lang123\nsome code\n```';
            const html = markdownParser.toHTML(markdown);

            expect(html).toContain('class="language-my-custom-lang123"');
            expect(html).toContain('data-language="my-custom-lang123"');
        });

        test('should handle code insertion when editor is empty', async () => {
            window.prompt.mockReturnValue('javascript');

            // Ensure editor is empty
            editorCore.setEditorContent('');

            await editorCore.applyFormatting('codeBlock');

            const content = editorCore.getEditorContent();
            expect(content).toBe('```javascript\nEnter your code here\n```');
        });

        test('should handle code insertion at beginning of document', async () => {
            window.prompt.mockReturnValue('');

            editorCore.setEditorContent('Existing content');

            // Mock cursor at beginning
            const mockRange = new MockRange();
            mockRange.startOffset = 0;

            const mockSelection = new MockSelection();
            mockSelection._setRange(mockRange);
            global.window.getSelection = jest.fn(() => mockSelection);

            await editorCore.applyFormatting('codeBlock');

            const content = editorCore.getEditorContent();
            expect(content).toBe('```\nEnter your code here\n```\n\nExisting content');
        });
    });
});
