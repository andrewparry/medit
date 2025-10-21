# Markdown WYSIWYG Editor

A fully functional browser-based markdown WYSIWYG (What You See Is What You Get) editor that allows users to create, edit, and save markdown files locally. The editor provides a seamless editing experience with real-time preview capabilities and local file management.

## Features

- **WYSIWYG Editing**: Visual markdown editing with formatting toolbar
- **Real-time Preview**: Live preview pane showing rendered markdown
- **Local File Management**: Open and save markdown files directly to your computer
- **Offline Functionality**: Works entirely in the browser without server connectivity
- **Keyboard Shortcuts**: Common formatting shortcuts (Ctrl+B, Ctrl+I, etc.)
- **Accessibility Support**: Full keyboard navigation and screen reader support
- **Responsive Design**: Works on desktop and mobile devices
- **Auto-save**: Automatic content backup to prevent data loss
- **Performance Optimized**: Virtual scrolling for large documents

## Supported Markdown Features

- Headers (H1-H6)
- Text formatting (bold, italic, code, strikethrough)
- Lists (ordered and unordered)
- Links and images
- **Enhanced Code blocks with syntax highlighting**
  - Support for 10+ programming languages (JavaScript, Python, HTML, CSS, JSON, Markdown, etc.)
  - Language-specific syntax highlighting with color coding
  - Copy-to-clipboard functionality with visual feedback
  - Language labels displayed on code blocks
  - Proper handling of special characters and indentation
- Tables
- Blockquotes
- Horizontal rules
- CommonMark compatible output

## Installation

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server or additional software required

### Quick Start

1. **Clone or download the repository:**
   ```bash
   git clone <repository-url>
   cd markdown-wysiwyg-editor
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
   - Click the "Open" button in the header
   - Or use Ctrl+O (Cmd+O on Mac)
   - Select a markdown file from your computer

3. **Saving Files**:
   - Click the "Save" button in the header
   - Or use Ctrl+S (Cmd+S on Mac)
   - Choose a location and filename for your markdown file

4. **Preview**: Click the eye icon in the toolbar to toggle the live preview pane

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
| Bullet List | Ctrl+Shift+8 | Cmd+Shift+8 |
| Numbered List | Ctrl+Shift+7 | Cmd+Shift+7 |
| Save File | Ctrl+S | Cmd+S |
| Open File | Ctrl+O | Cmd+O |
| New File | Ctrl+N | Cmd+N |
| Toggle Preview | Ctrl+Shift+P | Cmd+Shift+P |
| Code Block | Ctrl+Shift+C | Cmd+Shift+C |
| Show Help | Ctrl+/ or F1 | Cmd+/ or F1 |

### Formatting Toolbar

The toolbar provides quick access to common formatting options:

- **Text Formatting**: Bold, Italic, Inline Code
- **Headers**: H1, H2, H3
- **Lists**: Bullet lists, Numbered lists
- **Media**: Links, Images, Tables
- **Code**: Enhanced code blocks with language selection and syntax highlighting
- **View**: Toggle preview pane

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
markdown-wysiwyg-editor/
├── index.html              # Main HTML file
├── js/
│   └── editor.js          # Main JavaScript application
├── styles.css             # CSS styles and themes
├── test/                  # Test files
│   ├── editorcore.test.js
│   ├── markdownparser.test.js
│   ├── fileoperations.test.js
│   ├── formatting.test.js
│   ├── preview.test.js
│   └── e2e-integration.test.js
├── .kiro/
│   └── specs/             # Feature specifications
└── package.json           # Node.js dependencies (for testing)
```

### Architecture

The editor is built with a modular architecture:

- **EditorCore**: Central orchestrator managing editor state
- **MarkdownParser**: Bidirectional markdown ↔ HTML conversion
- **FileManager**: Local file operations using browser APIs
- **Toolbar**: Formatting controls and commands
- **Preview**: Real-time markdown rendering
- **KeyboardShortcuts**: Keyboard shortcut handling
- **AccessibilityManager**: Screen reader and accessibility support

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

This project follows a spec-driven development approach. See the `.kiro/specs/` directory for detailed requirements, design, and implementation plans.

### Development Workflow

1. Review the specifications in `.kiro/specs/markdown-wysiwyg-editor/`
2. Run existing tests to ensure they pass
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Update documentation as needed

## License

This project is open source. See the LICENSE file for details.

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

For issues, questions, or contributions, please refer to the project's issue tracker or documentation in the `.kiro/specs/` directory.