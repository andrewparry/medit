# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-05

### Added

- **Pure client-side architecture** - no server required, runs entirely in the browser
- **Complete WYSIWYG markdown editor** with visual formatting toolbar
- **Real-time preview** pane with synchronized scrolling
- **Local file management** using File System Access API with fallbacks for older browsers
- **Offline functionality** - full functionality without internet connectivity
- **Comprehensive keyboard shortcuts** for all formatting operations
- **Full accessibility support** with ARIA labels and keyboard navigation
- **Responsive design** for desktop and mobile devices
- **Auto-save functionality** to browser localStorage (every 1.5 seconds)
- **Dark mode** with persistent theme preference
- **Find & Replace** with regex support, case sensitivity, and whole word matching
- **Undo/Redo** with full history management (Ctrl+Z, Ctrl+Y)
- **Export functionality** for PDF, HTML, and plain text
- **Enhanced code blocks** with syntax highlighting via Prism.js
    - Support for 10+ programming languages
    - Copy-to-clipboard functionality with visual feedback
    - Language labels on code blocks
    - Automatic language detection
- **Text formatting** - Bold, italic, underline, strikethrough, inline code, blockquote, horizontal rules
- **Headers** - All six levels (H1-H6) with keyboard shortcuts
- **Lists** - Ordered, unordered, and task lists with smart numbering and nested list support
- **Links and images** with dialog prompts
- **Tables** with customizable rows and columns
- **Footnotes** with numeric and named identifiers
- **HTML rendering toggle** to enable/disable HTML in preview
- **Help button** with keyboard shortcuts cheat sheet
- **Resizable panes** between editor and preview
- **Status bar** with filename, word count, character count, and auto-save status
- **Filename editing** by clicking on status bar
- **Modular architecture** with 16 separate JavaScript modules
- **Comprehensive test suite** with 340 passing tests
- **Test coverage** for core functionality, formatting, file operations, accessibility, and performance

### Fixed

- **Bold and italic formatting** - Correct cursor positioning after wrapping text
- **Code block insertion** - Insert empty blocks instead of placeholder text
- **Table insertion** - Prevent insertion inside code blocks
- **Word/character counters** - Accurate counting by stripping markdown syntax
- **Preview state persistence** - Toggle state saved across sessions
- **List interaction with headings** - Proper handling of mixed markdown syntax
- **Ordered list renumbering** - Automatic renumbering on toggle
- **Cursor positioning** - Consistent behavior across all formatting operations
- **Scroll lock issues** - Fixed scrolling performance
- **Nested list support** - Proper indentation with Tab/Shift+Tab

### Changed

- **Refactored monolithic editor.js** into modular architecture
- **Toolbar layout** improved for better organization and accessibility
- **Status bar layout** uses flexbox for better alignment
- **Header layout** adjusted for cleaner appearance
- **Test structure** reorganized for better maintainability

### Documentation

- Comprehensive README with features, installation, and usage instructions
- DEVELOPER_GUIDE with implementation details and architecture
- TESTING_INSTRUCTIONS for manual testing scenarios
- Proper MIT license with third-party attribution (NOTICE file)
- API documentation in code comments

### Security

- XSS protection via HTML sanitizer
- Content validation for all user inputs
- Proper escaping in preview rendering
- **100% client-side** - no data transmission to any servers
- Local-only storage using browser APIs
- Privacy-focused design - all operations happen in your browser

## [Unreleased]

### Planned

- GitHub Pages deployment for live demo
- CI/CD pipeline with automated testing
- Code quality tools (ESLint, Prettier)
- Automated dependency updates
- Performance optimizations for very large documents
- Additional export formats
- Plugin system for extensibility

---

## Version History

- **1.0.0** - Initial public release with full feature set

[1.0.0]: https://github.com/andrewparry/medit/releases/tag/v1.0.0
