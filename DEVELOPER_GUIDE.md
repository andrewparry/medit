# Developer Guide - Markdown WYSIWYG Editor

## Quick Start

### Running the Editor

```bash
# Open in browser
open index.html

# Or use a local server
npx http-server -p 8080
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- test/formatting.test.js

# Run with coverage
npm test -- --coverage
```

---

## Architecture Overview

### File Structure

```
markdown-wysiwyg-editor/
├── index.html              # Main HTML file
├── styles.css              # All styles (light/dark theme)
├── js/
│   ├── editor.js          # Core editor logic ⭐
│   ├── marked-lite.js     # Markdown parser
│   └── sanitizer.js       # HTML sanitizer
├── test/                  # Test files
└── coverage/              # Test coverage reports
```

### Core Components

#### 1. Editor State

```javascript
const state = {
    autosaveTimer: null,
    dirty: false,
    lastSavedContent: '',
    isPreviewVisible: true
};
```

#### 2. Key Functions

**Formatting Functions:**

- `applyInlineFormat(prefix, suffix, placeholder)` - Bold, italic, code
- `applyHeading(level)` - H1, H2, H3
- `toggleList(type)` - Bullet/numbered lists
- `applyCodeBlock()` - Fenced code blocks
- `insertLink()` - Link insertion with prompts
- `insertImage()` - Image insertion with prompts
- `insertTable()` - Table skeleton insertion

**Content Management:**

- `updatePreview()` - Renders Markdown to HTML
- `updateCounters()` - Updates word/character count
- `stripMarkdown(markdown)` - Removes Markdown syntax

**File Operations:**

- `saveFile()` - Downloads .md file
- `loadFile()` - Opens file picker
- `readFile(file)` - Reads selected file
- `handleNewDocument()` - Creates new document

**Persistence:**

- `scheduleAutosave()` - Autosaves to localStorage
- `restoreAutosave()` - Restores from localStorage
- `persistThemePreference(isDark)` - Saves theme
- `initializePreviewState()` - Restores preview state

---

## Key Implementation Details

### 1. Text Selection & Cursor Positioning

The editor uses `textarea` selection APIs:

```javascript
const getSelection = () => ({
    start: editor.selectionStart,
    end: editor.selectionEnd,
    value: editor.value
});

const setSelection = (start, end) => {
    editor.focus();
    editor.setSelectionRange(start, end);
};
```

**Cursor Positioning Strategy:**

- After inline formatting (bold/italic): cursor after closing delimiter
- After block formatting (headings): cursor at end of line
- After insertions (table/code block): cursor at first editable position
- No selection: placeholder text is selected for easy replacement

### 2. Markdown Stripping for Counters

The `stripMarkdown()` function removes all Markdown syntax:

````javascript
const stripMarkdown = (markdown) => {
    if (!markdown || typeof markdown !== 'string') {
        return '';
    }

    return (
        markdown
            .replace(/```[\s\S]*?```/g, ' ') // Code blocks
            .replace(/`[^`]*`/g, ' ') // Inline code
            .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // Images
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // Links (keep text)
            // ... more replacements
            .trim()
    );
};
````

**Order matters!** Process complex patterns first (code blocks, links) before simple ones (asterisks, hashes).

### 3. Code Block Detection for Tables

Prevents table insertion inside code blocks:

````javascript
const backticksBefore = (beforeText.match(/```/g) || []).length;
const isInsideCodeBlock = backticksBefore % 2 !== 0;

if (isInsideCodeBlock) {
    autosaveStatus.textContent = 'Cannot insert table inside code block';
    return;
}
````

**Logic:** Count triple backticks before cursor. Odd count = inside code block.

### 4. Heading & List Interaction

The `applyHeading()` function handles list prefixes:

```javascript
// Extract list prefix
const listMatch = content.match(/^(\s*(?:[-*+] |\d+\. ))/);
if (listMatch) {
    listPrefix = listMatch[1];
    content = content.slice(listPrefix.length);
}

// Apply heading after list prefix
newLine = `${listPrefix}${hashes} ${normalizedText}`;
```

**Result:** `- ## Heading` (list marker preserved)

### 5. Preview Rendering

Uses `marked-lite.js` for parsing and `sanitizer.js` for safety:

```javascript
const updatePreview = () => {
    const markdown = editor.value;
    const rawHtml = window.markedLite.parse(markdown);
    const safeHtml = window.simpleSanitizer.sanitize(rawHtml);
    preview.innerHTML = safeHtml || '<p class="preview-placeholder">Start typing...</p>';
};
```

**Security:** Always sanitize HTML before rendering to prevent XSS.

---

## Keyboard Shortcuts Implementation

### Shortcut Handler

```javascript
const handleShortcut = (event) => {
    const key = event.key.toLowerCase();
    const ctrlOrCmd = event.ctrlKey || event.metaKey;

    if (!ctrlOrCmd) return;

    if (event.shiftKey) {
        switch (key) {
            case '7': // Ctrl+Shift+7
                event.preventDefault();
                handleFormatting('ol');
                return;
            // ... more shift shortcuts
        }
    }

    switch (key) {
        case 'b': // Ctrl+B
            event.preventDefault();
            handleFormatting('bold');
            break;
        // ... more shortcuts
    }
};
```

**Important:** Always call `event.preventDefault()` to prevent browser defaults.

---

## Persistence Strategy

### LocalStorage Keys

```javascript
const AUTOSAVE_KEY = 'markdown-editor-autosave';
const AUTOSAVE_FILENAME_KEY = 'markdown-editor-filename';
const THEME_KEY = 'markdown-editor-theme';
const PREVIEW_KEY = 'markdown-editor-preview';
```

### Autosave Flow

1. User types → `handleInput()` called
2. Debounced autosave scheduled (1.5s delay)
3. Content saved to localStorage
4. Status updated: "Draft saved"

### Restoration Flow

1. Page loads → `restoreAutosave()` called
2. Check localStorage for saved content
3. Populate editor if found
4. Update preview and counters

---

## Testing Strategy

### Test Structure

```javascript
describe('Feature Name', () => {
    let editorCore;
    let mockContainer;

    beforeEach(() => {
        // Setup mocks
        mockContainer = new MockElement('div');
        editorCore = new EditorCore(mockContainer);
    });

    afterEach(() => {
        // Cleanup
        editorCore.eventListeners.clear();
    });

    test('should do something', async () => {
        // Arrange
        editorCore.setMarkdown('test content');

        // Act
        await editorCore.applyFormatting('bold');

        // Assert
        expect(editorCore.getMarkdown()).toBe('**test content**');
    });
});
```

### Mock Objects

- `MockElement` - DOM element mock
- `MockSelection` - Selection API mock
- `MockRange` - Range API mock
- `MockMarkdownParser` - Parser mock

### Running Specific Tests

```bash
# Test formatting only
npm test -- test/formatting.test.js

# Test with pattern
npm test -- --testNamePattern="bold"

# Update snapshots
npm test -- -u
```

---

## Common Development Tasks

### Adding a New Formatting Button

1. **Add HTML button:**

```html
<button
    class="toolbar-btn"
    type="button"
    data-format="strikethrough"
    aria-label="Strikethrough"
    title="Strikethrough (Ctrl+Shift+S)"
>
    <span class="btn-icon" aria-hidden="true">S̶</span>
</button>
```

2. **Add formatting logic:**

```javascript
const handleFormatting = (action) => {
    switch (action) {
        // ... existing cases
        case 'strikethrough':
            applyInlineFormat('~~', '~~', 'strikethrough text');
            break;
    }
};
```

3. **Add keyboard shortcut:**

```javascript
if (event.shiftKey && key === 's') {
    event.preventDefault();
    handleFormatting('strikethrough');
}
```

4. **Add tests:**

```javascript
test('should apply strikethrough formatting', async () => {
    mockRange._setSelectedText('text');
    await editorCore.applyFormatting('strikethrough');
    expect(editorCore.getMarkdown()).toBe('~~text~~');
});
```

### Modifying Counter Logic

Edit `stripMarkdown()` to handle new syntax:

```javascript
const stripMarkdown = (markdown) => {
    return (
        markdown
            // ... existing replacements
            .replace(/~~(.*?)~~/g, '$1')
    ); // Add strikethrough
    // ... rest of replacements
};
```

### Adding New Persistence

```javascript
// Save
const saveNewSetting = (value) => {
    if (window.localStorage) {
        try {
            localStorage.setItem('markdown-editor-newsetting', value);
        } catch (error) {
            console.error('Failed to save setting', error);
        }
    }
};

// Restore
const restoreNewSetting = () => {
    if (window.localStorage) {
        const value = localStorage.getItem('markdown-editor-newsetting');
        if (value) {
            // Apply setting
        }
    }
};

// Call in initialization
restoreNewSetting();
```

---

## Debugging Tips

### 1. Check Selection State

```javascript
console.log('Selection:', {
    start: editor.selectionStart,
    end: editor.selectionEnd,
    text: editor.value.slice(editor.selectionStart, editor.selectionEnd)
});
```

### 2. Monitor Autosave

```javascript
// Add to scheduleAutosave()
console.log('Autosave scheduled', {
    content: editor.value,
    length: editor.value.length,
    dirty: state.dirty
});
```

### 3. Debug Counter Issues

```javascript
// Add to updateCounters()
const plain = stripMarkdown(editor.value);
console.log('Counter debug:', {
    original: editor.value,
    stripped: plain,
    words: plain.split(' ').filter(Boolean).length,
    chars: plain.length
});
```

### 4. Test Markdown Stripping

```javascript
// In browser console
const test = '# Hello **world** with `code`';
console.log(stripMarkdown(test)); // Should output: "Hello world with code"
```

---

## Performance Considerations

### 1. Debounced Operations

- Autosave: 1.5s delay
- Preview update: Immediate (but could be debounced for large docs)
- Counter update: Immediate

### 2. Optimization Opportunities

```javascript
// Debounce preview for large documents
const debouncedUpdatePreview = debounce(updatePreview, 300);

// Use requestAnimationFrame for smooth updates
const smoothUpdate = () => {
    requestAnimationFrame(() => {
        updatePreview();
        updateCounters();
    });
};
```

### 3. Memory Management

- Clear autosave timer on cleanup
- Remove event listeners when needed
- Revoke object URLs after file download

---

## Browser Compatibility

### Supported Browsers

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Required APIs

- `localStorage` - For persistence
- `FileReader` - For file opening
- `Blob` & `URL.createObjectURL` - For file saving
- `textarea.setSelectionRange` - For cursor positioning

### Fallbacks

```javascript
// Check localStorage availability
if (!window.localStorage) {
    console.warn('localStorage not available, autosave disabled');
    return;
}

// Check File API
if (!window.FileReader) {
    console.warn('FileReader not available, file opening disabled');
    return;
}
```

---

## Security Considerations

### 1. HTML Sanitization

Always sanitize HTML before rendering:

```javascript
const safeHtml = window.simpleSanitizer.sanitize(rawHtml);
preview.innerHTML = safeHtml;
```

### 2. File Type Validation

```javascript
if (!/\.(md|markdown)$/i.test(file.name)) {
    window.alert('Please choose a Markdown file.');
    return;
}
```

### 3. Content Validation

- No eval() or Function() calls
- No inline event handlers
- No script tag injection

---

## Troubleshooting

### Issue: Counters show 0

**Solution:** Check `stripMarkdown()` function, ensure it handles all syntax

### Issue: Cursor in wrong position

**Solution:** Verify `replaceSelection()` offset calculations

### Issue: Preview not updating

**Solution:** Check `updatePreview()` is called after content changes

### Issue: Autosave not working

**Solution:** Check localStorage availability and error handling

### Issue: Keyboard shortcuts not working

**Solution:** Verify `event.preventDefault()` is called

---

## Contributing

### Code Style

- Use 4 spaces for indentation
- Use single quotes for strings
- Add JSDoc comments for functions
- Keep functions small and focused

### Commit Messages

```
feat: Add strikethrough formatting
fix: Correct cursor positioning in code blocks
docs: Update developer guide
test: Add tests for table insertion
```

### Pull Request Process

1. Create feature branch
2. Write tests
3. Ensure all tests pass
4. Update documentation
5. Submit PR with description

---

## Resources

### Documentation

- [Markdown Spec](https://spec.commonmark.org/)
- [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Jest Testing](https://jestjs.io/docs/getting-started)

### Tools

- [Markdown Preview](https://markdownlivepreview.com/)
- [Regex Tester](https://regex101.com/)
- [Can I Use](https://caniuse.com/)

---

## Support

For issues or questions:

1. Check this guide
2. Review test files for examples
3. Check browser console for errors
4. Review FIXES_SUMMARY.md for recent changes

---

**Happy Coding! 🚀**
