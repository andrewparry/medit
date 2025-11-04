# Markdown Editor

A fully functional browser-based markdown WYSIWYG (What You See Is What You Get) editor that allows users to create, edit, and save markdown files locally. The editor provides a seamless editing experience with real-time preview capabilities and local file management.

## Features

- **WYSIWYG Editing**: Visual markdown editing with comprehensive formatting toolbar
- **Real-time Preview**: Live preview pane showing rendered markdown with synchronized scrolling
- **Local File Management**: Open and save markdown files directly to your computer
- **Offline Functionality**: Works entirely in the browser without server connectivity
- **Keyboard Shortcuts**: Extensive keyboard shortcuts for all common operations (Ctrl+B, Ctrl+I, Ctrl+K, etc.)
- **Accessibility Support**: Full keyboard navigation and screen reader support
- **Responsive Design**: Works on desktop and mobile devices
- **Auto-save**: Automatic content backup to browser storage (every 1.5 seconds)
- **Dark Mode**: Toggle between light and dark themes
- **Find & Replace**: Advanced search with regex support, case sensitivity, and whole word matching
- **Undo/Redo**: Full history management with Ctrl+Z and Ctrl+Y/Ctrl+Shift+Z
- **Export**: Export and print functionality for sharing documents
- **Performance Optimized**: Efficient rendering for large documents

## Supported Markdown Features

- **Headers**: All six levels (H1-H6) with keyboard shortcuts
- **Text Formatting**: 
  - Bold, italic, underline, strikethrough
  - Inline code with backticks
  - Blockquotes
  - Horizontal rules
- **Lists**: 
  - Ordered (numbered) lists with smart numbering
  - Unordered (bullet) lists
  - Task lists (checkboxes) with `- [ ]` and `- [x]` syntax
  - Nested lists with indentation support (Tab/Shift+Tab)
- **Links and Images**: Insert with dialog prompts or paste URLs
- **Tables**: Insert markdown tables with customizable rows and columns
- **Footnotes**: Insert footnote references and definitions
- **Enhanced Code blocks with syntax highlighting**
  - Support for 10+ programming languages (JavaScript, Python, HTML, CSS, JSON, Markdown, SQL, Bash, Java, C, C++, etc.)
  - Language-specific syntax highlighting with Prism.js
  - Copy-to-clipboard functionality with visual feedback
  - Language labels displayed on code blocks
  - Proper handling of special characters and indentation
  - Automatic language detection via Prism autoloader
- **HTML Rendering**: Toggle HTML rendering in preview (Ctrl+Shift+H)
- **CommonMark compatible output**: Standard markdown syntax throughout

## Installation

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server or additional software required

### Quick Start

1. **Clone or download the repository:**
   ```bash
   git clone <repository-url>
   cd mdedit
   ```

2. **Open the editor:**
   - Simply open `index.html` in your web browser
   - Or serve it using a local web server (recommended for development)

### Using a Local Web Server (Recommended)

For the best experience, especially when developing or testing, serve the files using a local web server:

#### Option 1: Python (if you have Python installed)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option 2: Node.js (if you have Node.js installed)
```bash
# Install a simple HTTP server globally
npm install -g http-server

# Serve the files
http-server
```

#### Option 3: PHP (if you have PHP installed)
```bash
php -S localhost:8000
```

Then open your browser and navigate to `http://localhost:8000`

## Usage

### Basic Operations

1. **Creating Content**: Start typing in the editor pane. Use the formatting toolbar or keyboard shortcuts to apply formatting.

2. **Opening Files**: 
   - Click the "Open" button (📁) in the toolbar
   - Or use Ctrl+O (Cmd+O on Mac)
   - Select a markdown file from your computer

3. **Saving Files**:
   - Click the "Save" button (💾) in the toolbar
   - Or use Ctrl+S (Cmd+S on Mac)
   - Choose a location and filename for your markdown file

4. **Preview**: Click the eye icon (👁️) in the toolbar to toggle the live preview pane

5. **List Indentation**: 
   - Press Tab to indent list items (create nested lists)
   - Press Shift+Tab to outdent list items
   - Smart numbering automatically adjusts for nested lists

### Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Bold | Ctrl+B | Cmd+B |
| Italic | Ctrl+I | Cmd+I |
| Inline Code | Ctrl+` | Cmd+` |
| Link | Ctrl+K | Cmd+K |
| Header 1 | Ctrl+1 | Cmd+1 |
| Header 2 | Ctrl+2 | Cmd+2 |
| Header 3 | Ctrl+3 | Cmd+3 |
| Header 4 | Ctrl+4 | Cmd+4 |
| Header 5 | Ctrl+5 | Cmd+5 |
| Header 6 | Ctrl+6 | Cmd+6 |
| Bullet List | Ctrl+Shift+8 | Cmd+Shift+8 |
| Numbered List | Ctrl+Shift+7 | Cmd+Shift+7 |
| Code Block | Ctrl+Shift+C | Cmd+Shift+C |
| Toggle Preview | Ctrl+Shift+P | Cmd+Shift+P |
| Toggle HTML Rendering | Ctrl+Shift+H | Cmd+Shift+H |
| Find & Replace | Ctrl+F | Cmd+F |
| Save File | Ctrl+S | Cmd+S |
| Open File | Ctrl+O | Cmd+O |
| New File | Ctrl+N | Cmd+N |
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Y or Ctrl+Shift+Z | Cmd+Y or Cmd+Shift+Z |
| Show Help | Ctrl+/ or F1 | Cmd+/ or F1 |

### Formatting Toolbar

The toolbar provides quick access to all formatting options:

- **Text Formatting**: Bold, Italic, Underline, Strikethrough, Inline Code, Blockquote, Horizontal Rule
- **Headers**: H1 through H6
- **Lists**: Bullet lists, Numbered lists, Task lists (checkboxes)
- **Inserts**: Links, Images, Tables, Footnotes
- **Code**: Enhanced code blocks with language selection and syntax highlighting
- **View**: Toggle preview pane, Find & Replace, Toggle HTML rendering
- **File Operations**: New file, Open file, Save file, Export/Print, Dark mode toggle
- **Help**: Keyboard shortcuts cheat sheet

### Additional Features

- **Find & Replace**: 
  - Press Ctrl+F (Cmd+F on Mac) to open find bar
  - Options for case sensitivity, regex matching, and whole word matching
  - Replace one or replace all functionality
- **Filename Editing**: Click on the filename in the status bar to rename
- **Resizable Panes**: Drag the resize handle between editor and preview to adjust split ratio
- **Status Bar**: Shows filename, word count, character count, and auto-save status

### Code Block Features

The editor provides enhanced code block functionality:

1. **Language Selection**: When inserting a code block, you'll be prompted to specify the programming language
2. **Syntax Highlighting**: Automatic color coding for:
   - JavaScript/TypeScript
   - Python
   - HTML/XML
   - CSS
   - JSON
   - Markdown
   - And more with generic highlighting for other languages
3. **Copy Functionality**: Each code block includes a copy button that:
   - Copies the raw code to your clipboard
   - Provides visual feedback (button changes to "Copied!")
   - Works with modern clipboard API and falls back for older browsers
   - Announces actions to screen readers for accessibility
4. **Language Labels**: Code blocks display the language name in the top-right corner
5. **Proper Formatting**: Preserves indentation, whitespace, and special characters

## Development

### Running Tests

The project includes comprehensive unit and integration tests:

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Project Structure

```
mdedit/
├── index.html                    # Main HTML file
├── styles.css                    # CSS styles and themes (light/dark)
├── js/                           # Modular JavaScript architecture
│   ├── editor-core.js           # Core editor orchestrator
│   ├── editor-state.js          # State management
│   ├── editor-utils.js           # Utility functions
│   ├── editor-dialogs.js         # Dialog management
│   ├── editor-history.js         # Undo/redo functionality
│   ├── editor-autosave.js        # Auto-save to localStorage
│   ├── editor-preview.js         # Preview rendering
│   ├── editor-syntax-highlight.js # Code block syntax highlighting
│   ├── editor-formatting.js      # Text formatting operations
│   ├── editor-inserts.js         # Insert operations (links, images, tables, etc.)
│   ├── editor-find-replace.js    # Find and replace functionality
│   ├── editor-file-ops.js        # File operations (open, save, export)
│   ├── editor-ui.js              # UI interactions and keyboard shortcuts
│   ├── editor-init.js            # Initialization and setup
│   ├── marked-lite.js            # Markdown parser
│   └── sanitizer.js              # HTML sanitizer for security
├── test/                         # Test files
│   ├── editorcore.test.js
│   ├── markdownparser.test.js
│   ├── fileoperations.test.js
│   ├── formatting.test.js
│   ├── preview.test.js
│   ├── dialogs.test.js
│   ├── cursor-positioning.test.js
│   ├── codeblocks.test.js
│   ├── scrolling-performance.test.js
│   ├── e2e-integration.test.js
│   └── ...
├── images/                       # Project assets
│   ├── medit_icon.png
│   ├── medit_icon.svg
│   └── medit_icon.ai
├── coverage/                     # Test coverage reports
└── package.json                  # Node.js dependencies (for testing)
```

### Architecture

The editor is built with a modular, event-driven architecture:

- **EditorCore** (`editor-core.js`): Central orchestrator managing editor state and coordinating modules
- **EditorState** (`editor-state.js`): State management and persistence
- **EditorUtils** (`editor-utils.js`): Shared utility functions and helpers
- **EditorDialogs** (`editor-dialogs.js`): Dialog and prompt management
- **EditorHistory** (`editor-history.js`): Undo/redo history management
- **EditorAutosave** (`editor-autosave.js`): Auto-save functionality with localStorage
- **EditorPreview** (`editor-preview.js`): Real-time markdown rendering
- **EditorSyntaxHighlight** (`editor-syntax-highlight.js`): Code block syntax highlighting with Prism.js
- **EditorFormatting** (`editor-formatting.js`): Text formatting operations (bold, italic, headers, etc.)
- **EditorInserts** (`editor-inserts.js`): Insert operations (links, images, tables, footnotes, code blocks)
- **EditorFindReplace** (`editor-find-replace.js`): Find and replace functionality
- **EditorFileOps** (`editor-file-ops.js`): File operations using File System Access API with fallbacks
- **EditorUI** (`editor-ui.js`): UI interactions, keyboard shortcuts, and toolbar management
- **EditorInit** (`editor-init.js`): Initialization, module coordination, and event binding
- **MarkedLite** (`marked-lite.js`): Lightweight markdown parser
- **Sanitizer** (`sanitizer.js`): HTML sanitization for XSS protection

## Browser Compatibility

### Modern Browsers (Full Features)
- Chrome 86+
- Firefox 82+
- Safari 14+
- Edge 86+

### Legacy Browser Support
The editor gracefully degrades for older browsers:
- File operations fall back to traditional download/upload methods
- Advanced features may be limited but core functionality remains

### Required Browser Features
- ES6+ JavaScript support
- CSS Grid and Flexbox
- File API for file operations
- Local Storage for auto-save

## File System Access

The editor uses modern browser APIs for file operations:

1. **File System Access API** (Chrome 86+, Edge 86+): Direct file system access
2. **Traditional File API** (All browsers): Fallback using file input and downloads

Files are saved in standard markdown format (.md) and are compatible with any markdown editor or processor.

## Privacy and Security

- **No Server Communication**: All operations happen locally in your browser
- **No Data Collection**: No analytics, tracking, or data transmission
- **XSS Protection**: Content is sanitized to prevent security issues
- **Local Storage Only**: Auto-save uses browser's local storage

## Troubleshooting

### Common Issues

1. **File operations not working**:
   - Ensure you're using a modern browser
   - Try refreshing the page
   - Check browser console for errors

2. **Formatting not applying**:
   - Make sure text is selected for inline formatting
   - Try using keyboard shortcuts instead of toolbar
   - Check if cursor is positioned correctly

3. **Preview not updating**:
   - Toggle preview off and on again
   - Check browser console for JavaScript errors
   - Ensure content is valid markdown

4. **Performance issues with large files**:
   - The editor supports virtual scrolling for files over 1000 lines
   - Consider breaking very large documents into smaller files
   - Close other browser tabs to free up memory

### Browser-Specific Issues

- **Safari**: Some keyboard shortcuts may conflict with system shortcuts
- **Firefox**: File System Access API not supported, uses fallback methods
- **Mobile browsers**: Touch interactions may differ from desktop experience

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. Run existing tests to ensure they pass: `npm test`
2. Create a feature branch for your changes
3. Make your changes following the existing code style
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Update documentation as needed (README, DEVELOPER_GUIDE.md)
7. Submit a pull request with a clear description of changes

### Code Style

- Use 4 spaces for indentation
- Use single quotes for strings
- Add JSDoc comments for functions
- Keep functions small and focused
- Follow the existing modular architecture pattern

### Testing

- Write tests for new features in the `test/` directory
- Use descriptive test names
- Ensure edge cases are covered
- Run tests before submitting: `npm test`

## License

This project is open source and licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Third-Party Libraries

This project uses the following open source libraries:

- **Prism.js** (v1.29.0) - MIT License
  - Used for syntax highlighting in code blocks
  - Loaded from CDN in production
  
- **Jest** (v29.7.0) - MIT License
  - Used for testing (development only)
  
- **jsdom** (v22.1.0) - MIT License
  - Used for DOM testing (development only)

All third-party libraries are open source and MIT licensed, compatible with this project's license. For complete license information and attribution details, see the [NOTICE](NOTICE) file.

## Changelog

### Version 1.0.0
- Initial release with full WYSIWYG editing capabilities
- Local file management with browser API support
- Real-time preview and formatting toolbar
- Comprehensive keyboard shortcuts
- Accessibility support and responsive design
- Auto-save and error recovery features
- Performance optimizations for large documents

## Support

For issues, questions, or contributions:
- Check the [Developer Guide](DEVELOPER_GUIDE.md) for implementation details
- Review [Testing Instructions](TESTING_INSTRUCTIONS.md) for manual testing scenarios
- Check the browser console for error messages
- Review recent fixes and improvements in the project documentation files

## Related Documentation

- [Developer Guide](DEVELOPER_GUIDE.md) - Detailed implementation guide for developers
- [Testing Instructions](TESTING_INSTRUCTIONS.md) - Manual testing scenarios and checklists