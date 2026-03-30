# Markdown Editor Test Suite

This directory contains Jest-based tests and test helpers for the markdown editor. The current suite mixes focused unit-style tests with jsdom-backed integration-style tests and a small number of targeted regression tests.

These tests improve confidence in parser behavior, editor workflows, and browser-API adapters, but they do **not** replace manual validation or a full real-browser smoke suite.

## What the current suite covers

- Markdown parsing and parser regressions
- Formatting operations and cursor-position behavior
- Preview, dialog, filename-editing, and related editor UI flows in jsdom
- File operations and File System Access API wrappers
- Scrolling and large-document behavior checks in the test harness
- End-to-end style editor workflows simulated in jsdom

## Notes on evidence and scope

- `e2e-integration.test.js` simulates browser workflows in jsdom; it is not a full browser-automation suite.
- Accessibility-related assertions in this directory check attributes, structure, and keyboard/screen-reader-oriented behaviors exercised by the tests; they are not an accessibility certification.
- Performance-oriented tests here are regression guards in a controlled test harness, not production benchmarking.
- `npm run test:coverage` is available for local inspection, but coverage output alone should not be treated as a standalone quality guarantee.

## Running tests

### Install dependencies

```bash
npm install
```

### Run tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage output
npm run test:coverage
```

## Test files

- `accessibility-utils.js` - accessibility-focused test helpers
- `codeblocks.test.js` - code block handling tests
- `cursor-positioning.test.js` - cursor position management tests
- `dialogs.test.js` - dialog behavior and accessibility-related checks
- `editor-file-ops-fsa.test.js` - File System Access API file operations tests
- `editorcore.test.js` - state-management-oriented unit-style tests for the legacy EditorCore abstraction used in this suite
- `e2e-integration.test.js` - jsdom-backed end-to-end style workflow tests
- `fileoperations.test.js` - file management unit tests
- `filename-editing.test.js` - filename editing tests
- `formatting.test.js` - formatting operations unit tests
- `header-empty-line.test.js` - header and empty-line interaction tests
- `markdownparser.test.js` - markdown parsing unit tests
- `marked-lite-parser.test.js` - parser regression tests for confirmed markdown defects
- `performance-utils.js` - performance-oriented test helpers
- `preview.test.js` - preview functionality unit tests
- `scrolling-performance.test.js` - scrolling performance regression tests
- `storage-fsa.test.js` - File System Access API storage wrapper tests
- `README.md` - this documentation file
