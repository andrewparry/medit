# Markdown WYSIWYG Editor Test Suite

This directory contains comprehensive tests for the Markdown WYSIWYG Editor, including unit tests, integration tests, and end-to-end tests.

## Test Coverage

### Unit Tests

The unit tests cover the following aspects of EditorCore state management as required by **Requirement 1.3**:

### State Initialization Tests

- ✅ Correct default state structure initialization
- ✅ Event listeners map initialization
- ✅ Markdown parser initialization
- ✅ DOM element references setup

### State Updates Tests

- ✅ Markdown content updates and dirty state tracking
- ✅ Preview toggle state management
- ✅ File information updates (name, save time, unsaved changes)
- ✅ Content dirty/clean state management
- ✅ Active formatting set management
- ✅ Cursor position tracking
- ✅ Parsing state management

### Event System Functionality Tests

- ✅ Event listener registration
- ✅ Event emission to registered listeners
- ✅ Event listener removal
- ✅ Error handling in event callbacks
- ✅ Multiple event types support
- ✅ Built-in events (contentChange, previewToggle)

### State Consistency Tests

- ✅ State consistency during multiple operations
- ✅ State structure preservation after updates

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

The tests use Jest as the testing framework and include:

- **Mock DOM Environment**: Complete DOM mocking for browser-independent testing
- **Mock Dependencies**: All EditorCore dependencies are mocked for isolated testing
- **Comprehensive Coverage**: 23 test cases covering all state management aspects
- **Error Handling**: Tests verify graceful error handling in event system

### End-to-End Integration Tests

The end-to-end integration tests cover complete user workflows, performance, and accessibility compliance as required by **Requirements 6.1 and 1.1**:

#### Complete User Workflows

- ✅ Create → Edit → Save workflow testing
- ✅ Open → Edit → Save existing file workflow
- ✅ Multi-step formatting operations
- ✅ Preview toggle and content synchronization

#### Performance Testing

- ✅ Large document loading (10,000+ lines)
- ✅ Rapid typing performance in large documents
- ✅ Preview update efficiency with large content
- ✅ Memory usage optimization validation

#### Accessibility Compliance

- ✅ ARIA labels and semantic HTML structure
- ✅ Button accessibility attributes
- ✅ Editor accessibility attributes
- ✅ Live regions for screen readers
- ✅ Keyboard navigation support
- ✅ Proper heading hierarchy
- ✅ Focus management
- ✅ Alternative text and descriptions

#### Cross-Browser Compatibility

- ✅ Different user agent scenarios
- ✅ File System Access API availability detection
- ✅ localStorage availability handling

## Test Files

- `editorcore.test.js` - EditorCore state management unit tests
- `markdownparser.test.js` - Markdown parsing unit tests
- `formatting.test.js` - Formatting operations unit tests
- `fileoperations.test.js` - File management unit tests
- `preview.test.js` - Preview functionality unit tests
- `e2e-integration.test.js` - End-to-end integration tests
- `performance-utils.js` - Performance testing utilities
- `accessibility-utils.js` - Accessibility testing utilities
- `README.md` - This documentation file

## Requirements Verification

These tests verify compliance with **Requirement 1.3** from the requirements document:

> "WHEN the user types text THEN the system SHALL maintain proper markdown structure in the background"

The tests ensure that:

1. State is properly initialized and maintained
2. Content changes are tracked and events are emitted
3. The event system works reliably for component communication
4. State consistency is maintained across operations
