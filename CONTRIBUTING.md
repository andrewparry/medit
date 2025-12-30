# Contributing to Markdown Editor

First off, thank you for considering contributing to Markdown Editor! It's people like you that make this tool better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected
- **Include screenshots or animated GIFs** if relevant
- **Specify your browser and OS version**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed feature
- **Explain why this enhancement would be useful** to most users
- **List any alternatives** you've considered

### Pull Requests

We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`
2. Follow the branch naming convention:
    - `feature/your-feature-name` for new features
    - `bugfix/issue-description` for bug fixes
    - `docs/what-you-changed` for documentation updates
3. Make your changes and ensure they follow our coding standards
4. Add tests for any new functionality
5. Update documentation as needed
6. Ensure all tests pass: `npm test`
7. Update the CHANGELOG.md with your changes
8. Submit your pull request!

## Development Setup

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Node.js 14+ and npm (for running tests only)
- Git

### Getting Started

This is a **pure client-side application** - no server setup required!

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/medit.git
cd medit

# Install dependencies (for testing only)
npm install

# Open the editor
# Option 1: Simply open medit.html in your browser (easiest)
open medit.html

# Option 2: Use a local server (optional, for development)
python -m http.server 8000
# Then navigate to http://localhost:8000
```

**Note:** The editor works by simply opening `medit.html` - no build step or server required!

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

All tests must pass before your pull request can be merged.

## Coding Standards

### JavaScript Style Guide

- Use **4 spaces** for indentation (not tabs)
- Use **single quotes** for strings
- Add **semicolons** at the end of statements
- Use **camelCase** for variable and function names
- Use **PascalCase** for constructor functions and classes
- Add **JSDoc comments** for all functions

#### Example

```javascript
/**
 * Apply inline formatting to selected text
 * @param {string} prefix - Opening delimiter
 * @param {string} suffix - Closing delimiter
 * @param {string} placeholder - Default text when no selection
 */
const applyInlineFormat = (prefix, suffix, placeholder) => {
    const selection = getSelection();
    // Implementation here
};
```

### Modular Architecture

The codebase uses a modular IIFE pattern for a **pure client-side architecture**:

- Each module is self-contained in its own file
- Uses the `MarkdownEditor` namespace
- Exposes only necessary public APIs
- No server-side code - all operations happen in the browser
- File operations use the File System Access API with fallbacks
- Follows the existing pattern in `js/` directory

### File Organization

```
js/
├── editor-core.js           # Core namespace and constants
├── editor-state.js          # State management
├── editor-utils.js          # Utility functions
├── editor-formatting.js     # Text formatting operations
├── editor-inserts.js        # Insert operations
├── editor-file-ops.js       # File operations
└── ...                      # Other modules
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, no logic change)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Examples:**

```
feat: add keyboard shortcut for strikethrough formatting
fix: correct cursor positioning after code block insertion
docs: update README with new keyboard shortcuts
test: add tests for table insertion edge cases
```

## Testing Guidelines

### Test Structure

- Tests are located in the `test/` directory
- Each module should have corresponding test file(s)
- Use descriptive test names that explain what is being tested

### Writing Tests

```javascript
describe('Feature Name', () => {
    beforeEach(() => {
        // Setup
    });

    test('should do something specific', () => {
        // Arrange
        const input = 'test content';

        // Act
        const result = someFunction(input);

        // Assert
        expect(result).toBe('expected output');
    });
});
```

### Test Coverage

- Aim for high test coverage (80%+ for new code)
- Test edge cases and error conditions
- Include integration tests for complex workflows

## Documentation

### Code Comments

- Add JSDoc comments for all public functions
- Include parameter types and descriptions
- Document return values
- Add usage examples for complex functions

### README Updates

If your change affects user-facing functionality:

- Update the README.md with new features
- Add or update keyboard shortcuts table
- Update the feature list if applicable

### Developer Guide

For architectural changes or new patterns:

- Update DEVELOPER_GUIDE.md
- Document design decisions
- Provide implementation examples

## Review Process

### What Happens After You Submit a PR?

1. **Automated Checks**: CI will run tests and linting
2. **Code Review**: A maintainer will review your code
3. **Feedback**: You may receive requests for changes
4. **Approval**: Once approved, your PR will be merged

### Review Criteria

We look for:

- ✅ Clean, readable code following our style guide
- ✅ Comprehensive tests with good coverage
- ✅ Updated documentation
- ✅ No breaking changes (or clearly documented if necessary)
- ✅ Addresses the issue or feature request completely

## Getting Help

### Where to Ask Questions

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community support
- **Code Review**: Ask questions directly in your pull request

### Resources

- [README.md](README.md) - Project overview and features
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Implementation details
- [TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md) - Manual testing guide

## Recognition

Contributors will be recognized in:

- GitHub contributors page
- Release notes for significant contributions
- Our gratitude and appreciation! 🎉

## License

By contributing to Markdown Editor, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! Your efforts help make this project better for everyone. 💙
