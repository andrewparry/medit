# Claude AI Assistant Guidelines

This document contains rules and guidelines for AI assistants (like Claude) working on this codebase to prevent common issues and ensure code quality.

## Code Quality Rules

### 1. ESLint Compliance

**CRITICAL**: All code changes MUST pass ESLint validation before committing.

#### Pre-Commit Checklist

- [ ] Run `npm run lint` to check for ESLint errors
- [ ] Run `npm run lint:fix` to auto-fix issues where possible
- [ ] Fix any remaining ESLint errors manually
- [ ] Verify the commit will pass the git pre-commit hook

#### Common ESLint Violations to Avoid

**Unused Variables:**

- ❌ **DON'T**: Declare variables that are never used
    ```javascript
    const selectedText = value.slice(start, end); // Never used
    ```
- ✅ **DO**: Remove unused variables or prefix with `_` if intentionally unused
    ```javascript
    // Remove if not needed, or:
    const _unusedVar = value.slice(start, end); // If needed for debugging
    ```

**Unused Function Parameters:**

- ❌ **DON'T**: Keep unused parameters in function signatures
    ```javascript
    const applyInlineFormat = (prefix, suffix, placeholder = '') => {
        // placeholder never used
    };
    ```
- ✅ **DO**: Remove unused parameters or prefix with `_`
    ```javascript
    const applyInlineFormat = (prefix, suffix) => {
        // Clean function signature
    };
    ```

**Empty Block Statements:**

- ❌ **DON'T**: Use empty catch blocks
    ```javascript
    try {
        doSomething();
    } catch (_) {}
    ```
- ✅ **DO**: Add a comment explaining why the error is ignored
    ```javascript
    try {
        doSomething();
    } catch {
        // Ignore pointer capture errors (not supported in all browsers)
    }
    ```

**Console Statements:**

- ❌ **DON'T**: Leave `console.log()` statements in production code
    ```javascript
    console.log('Debug info:', data);
    ```
- ✅ **DO**: Remove console.log statements or use console.warn/error if appropriate
    ```javascript
    // Remove debug logs, or use:
    console.warn('Warning:', message); // Only if necessary
    ```

### 2. Testing Requirements

**Before Committing:**

- [ ] Run `npm test` to ensure all tests pass
- [ ] Run tests for modified files specifically
- [ ] Ensure no test coverage regressions

### 3. Code Staging

**IMPORTANT**: When fixing ESLint errors:

1. Make the code changes
2. Run `npm run lint:fix` to auto-fix issues
3. Stage the fixed files: `git add <file>`
4. Verify staged files pass ESLint: `npx eslint --fix --ignore-path .gitignore <files>`
5. Only then attempt to commit

**Common Mistake**: Fixing files but not staging them, causing the git hook to fail on the old staged version.

### 4. Function Signature Changes

When removing unused parameters:

1. Update the function definition
2. Update ALL call sites to remove the parameter
3. Verify no other code depends on the parameter

Example:

```javascript
// Before
const format = (prefix, suffix, placeholder) => { ... }
format('**', '**', 'bold text');

// After
const format = (prefix, suffix) => { ... }
format('**', '**');
```

### 5. Error Handling

When using try-catch blocks:

- Always add a comment explaining why errors are ignored
- Use `catch` without parameter if error object isn't needed
- Document browser compatibility issues if relevant

```javascript
try {
    element.setPointerCapture(pointerId);
} catch {
    // Ignore pointer capture errors (not supported in all browsers)
}
```

## Workflow Best Practices

### Before Making Changes

1. Read the relevant code sections thoroughly
2. Understand the existing patterns and conventions
3. Check for similar code that might need the same fix

### During Development

1. Make incremental changes
2. Test frequently: `npm test`
3. Lint frequently: `npm run lint`
4. Fix issues as they arise, don't accumulate them

### Before Committing

1. **Run lint check**: `npm run lint`
2. **Run tests**: `npm test`
3. **Stage files**: `git add <files>`
4. **Verify staged files**: `npx eslint --fix --ignore-path .gitignore <staged-files>`
5. **Commit**: `git commit -m "message"`

### If Pre-Commit Hook Fails

1. Read the ESLint error messages carefully
2. Fix the issues in the working directory
3. Stage the fixed files: `git add <files>`
4. Verify: `npx eslint --fix --ignore-path .gitignore <files>`
5. Try committing again

## Common Patterns

### Removing Unused Code

```javascript
// Identify unused variables/parameters
// Remove them completely
// Update all references
// Test to ensure nothing breaks
```

### Fixing Empty Blocks

```javascript
// Add explanatory comment
catch {
    // Reason for ignoring error
}
```

### Removing Debug Code

```javascript
// Remove console.log statements
// Keep console.warn/error only if necessary for production
```

## File-Specific Guidelines

### `js/editor-formatting.js`

- Be careful with formatting function signatures
- Ensure all formatting functions are called consistently
- Watch for unused variables in complex formatting logic

### `js/editor-ui.js`

- Avoid empty catch blocks in event handlers
- Remove debug console.log statements
- Ensure event handler cleanup is properly documented

## Quick Reference Commands

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Run tests
npm test

# Check specific files
npx eslint js/editor-formatting.js js/editor-ui.js

# Stage and verify
git add <files>
npx eslint --fix --ignore-path .gitignore <files>
```

## Remember

- **ESLint errors block commits** - fix them before committing
- **Staged files are what the hook checks** - always stage your fixes
- **Test your changes** - don't break existing functionality
- **Follow existing patterns** - maintain code consistency
- **Document your changes** - especially when ignoring errors
