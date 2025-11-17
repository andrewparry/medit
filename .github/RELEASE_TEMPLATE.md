# Release v1.0.0 - Initial Public Release

## 🎉 Welcome to Markdown Editor v1.0.0!

We're excited to announce the initial public release of Markdown Editor - a fully functional, browser-based WYSIWYG markdown editor.

### ✨ Highlights

- **Complete WYSIWYG editing** with visual formatting toolbar
- **Real-time preview** with synchronized scrolling
- **Local file management** with modern File System Access API
- **Offline-first** - works entirely in your browser
- **Accessibility focused** - WCAG 2.1 AA compliant
- **340 comprehensive tests** ensuring reliability

### 🚀 Try It Now

**[Launch the editor →](https://andrewparry.github.io/medit/)**

### 📦 What's Included

#### Core Features

- **Text Formatting**: Bold, italic, underline, strikethrough, inline code, blockquotes, horizontal rules
- **Headers**: All six levels (H1-H6) with keyboard shortcuts
- **Lists**: Ordered, unordered, and task lists with smart numbering
- **Links & Images**: Easy insertion with dialog prompts
- **Tables**: Customizable markdown tables
- **Code Blocks**: Syntax highlighting for 10+ languages via Prism.js
- **Footnotes**: Support for footnote references and definitions

#### Editor Features

- **Auto-save**: Automatic backup to browser storage (1.5s interval)
- **Dark Mode**: Toggle between light and dark themes
- **Find & Replace**: Advanced search with regex, case sensitivity, whole word matching
- **Undo/Redo**: Full history management
- **Export**: PDF, HTML, and plain text export
- **Keyboard Shortcuts**: Comprehensive shortcuts for all operations
- **Resizable Panes**: Adjust editor/preview split

### 🔧 Technical Details

- **Size**: ~200KB JavaScript (unminified), 24KB CSS
- **Dependencies**: Only Prism.js for syntax highlighting (loaded from CDN)
- **Architecture**: Modular design with 16 separate JavaScript modules
- **Browser Support**: Chrome 86+, Firefox 82+, Safari 14+, Edge 86+
- **Tests**: 340 passing tests with comprehensive coverage

### 📚 Documentation

- **[README](https://github.com/andrewparry/medit#readme)** - Quick start and features
- **[Developer Guide](https://github.com/andrewparry/medit/blob/main/DEVELOPER_GUIDE.md)** - Implementation details
- **[Contributing](https://github.com/andrewparry/medit/blob/main/CONTRIBUTING.md)** - How to contribute
- **[Security Policy](https://github.com/andrewparry/medit/blob/main/SECURITY.md)** - Security information

### 🛡️ Security

- ✅ 0 vulnerabilities (npm audit)
- ✅ XSS protection via HTML sanitizer
- ✅ No data transmission to external servers
- ✅ Local-only storage

### ♿ Accessibility

- ✅ WCAG 2.1 AA compliant
- ✅ Full keyboard navigation
- ✅ Screen reader support
- ✅ Proper ARIA labels and semantic HTML

### 🙏 Thank You

Thank you to everyone who contributed to making this release possible!

### 📝 Full Changelog

See [CHANGELOG.md](https://github.com/andrewparry/medit/blob/main/CHANGELOG.md) for detailed changes.

---

## Installation

### Option 1: Use Online (Recommended)

Simply visit **[https://andrewparry.github.io/medit/](https://andrewparry.github.io/medit/)**

### Option 2: Download and Run Locally

```bash
# Clone the repository
git clone https://github.com/andrewparry/medit.git
cd medit

# Open index.html in your browser
# Or serve with a local server:
python -m http.server 8000
# Then navigate to http://localhost:8000
```

### Option 3: Download Release Archive

Download the source code archive from the [releases page](https://github.com/andrewparry/medit/releases/tag/v1.0.0) and extract it.

---

## Feedback & Support

- **Issues**: [Report bugs or request features](https://github.com/andrewparry/medit/issues)
- **Discussions**: [Ask questions](https://github.com/andrewparry/medit/discussions)
- **Contributing**: See [CONTRIBUTING.md](https://github.com/andrewparry/medit/blob/main/CONTRIBUTING.md)

---

**License**: MIT  
**Author**: Andrew Parry  
**Repository**: https://github.com/andrewparry/medit
