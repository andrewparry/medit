# UI Improvements - Action Items

This document provides specific, actionable improvements for the markdown editor UI based on code analysis.

## Critical Issues - Immediate Action Required

### 1. Replace Browser Native Dialogs with Accessible Custom Dialogs ✅ COMPLETE

**Issue:** Using `window.prompt()`, `window.alert()`, and `window.confirm()` creates accessibility problems and inconsistent UX.

**Status:** ✅ **RESOLVED** - All native dialogs replaced with accessible custom dialogs

**Implementation:**
- ✅ Created `alertDialog()`, `confirmDialog()`, and `promptDialog()` utility functions
- ✅ Replaced all `window.prompt()` calls (5 instances) in:
  - `insertLink()` function (2 calls)
  - `insertImage()` function (2 calls)  
  - `saveFile()` function (1 call)
- ✅ Replaced all `window.alert()` calls (2 instances) in:
  - `readFile()` validation (1 call)
  - `readFile()` error handler (1 call)
- ✅ Replaced all `window.confirm()` calls (1 instance) in:
  - `loadFile()` function (1 call)

**See:** `CRITICAL_ISSUE_1_RESOLUTION.md` for complete details and test results.

### 2. localStorage Quota Exceeded Handling ✅ COMPLETE

**Issue:** Autosave will silently fail if localStorage quota is exceeded.

**Status:** ✅ **RESOLVED** - Complete quota exceeded handling with user-friendly dialog and recovery options

**Implementation:**
- ✅ Added detection for `QuotaExceededError`, `NS_ERROR_DOM_QUOTA_REACHED`, and error code 22
- ✅ Created `showQuotaExceededDialog()` with three options:
  - **Clear Drafts** - Clears old autosave data and retries saving
  - **Disable Autosave** - Permanently disables autosave (persisted in localStorage)
  - **Continue** - Continues without autosave (doesn't disable permanently)
- ✅ Added `disableAutosave()` and `enableAutosave()` functions
- ✅ Added `clearAllAutosaveData()` function to free up storage
- ✅ Added `checkAutosaveStatus()` to restore disabled state on page load
- ✅ Added state tracking for `autosaveDisabled` and `quotaExceededShown`
- ✅ Updated `scheduleAutosave()` to handle quota errors gracefully
- ✅ Dialog shows only once per session to avoid spam

**Features:**
- User-friendly dialog with clear options
- Automatic retry after clearing drafts
- Persistent disabled state across page reloads
- Helpful status messages in status bar

### 3. Dark Mode Toggle Icon Update ✅ COMPLETE

**Issue:** Icon doesn't change when toggling between light/dark mode.

**Status:** ✅ **RESOLVED** - Icon now updates correctly when toggling between light and dark mode

**Implementation:**
- ✅ Updated `applyTheme()` function to change icon element text content
- ✅ Icon shows 🌙 (moon) in light mode and ☀️ (sun) in dark mode
- ✅ Icon updates alongside text and aria-checked attribute
- ✅ Safe check for icon element existence before updating

**Changes Made:**
- Modified `js/editor.js` - `applyTheme()` function (line ~1360)
- Added: `iconElement.textContent = isDark ? '☀️' : '🌙';`

---

## Medium Priority Improvements

### 4. Visual Loading States ✅ COMPLETE

**Issue:** File operations provide no visual feedback during processing.

**Status:** ✅ **RESOLVED** - File operations now show visual loading states with spinner and disabled button

**Implementation:**
- ✅ Created `setButtonLoading()` helper function to manage button loading states
- ✅ Added loading spinner CSS animation (rotating circle)
- ✅ Updated `loadFile()` function to show loading state:
  - Shows loading when file dialog opens
  - Shows loading while file is being read
  - Updates status bar with "Opening file..." message
- ✅ Updated `saveFile()` function to show loading state:
  - Shows loading immediately when save starts
  - Updates status bar with "Saving..." message
  - Clears loading after download completes
- ✅ Added disabled button styles with reduced opacity and not-allowed cursor
- ✅ Loading spinner appears in place of button text during operations
- ✅ Button text changes to "Loading..." during operations

**Features:**
- Visual spinner animation during file operations
- Button disabled state prevents multiple clicks
- Status bar messages provide additional feedback
- Loading state automatically clears on completion or error

### 5. Toolbar Button Active States

**Issue:** No visual indication when formatting is applied to selected text.

**Current:** Buttons don't show active state based on cursor position or selection.

**Solution:** Add function to detect formatting at cursor and update button states accordingly.

**Example:**
```javascript
const updateToolbarStates = () => {
    const selection = getSelection();
    const text = selection.value.slice(selection.start - 2, selection.end + 2);
    
    // Check for bold (**text**)
    const isBold = /(\*\*|__).+?\1/.test(text);
    boldButton.classList.toggle('active', isBold);
    // Similar for italic, code, etc.
};
```

### 6. Table Customization Dialog

**Issue:** Table always inserts 2 columns, can't customize before insertion.

**Location:** `js/editor.js:592` - `insertTable()` function

**Solution:** Create dialog to select rows/columns before insertion.

### 7. Undo/Redo Functionality

**Issue:** No undo/redo support.

**Solution:** Implement state history management.

**Approach:**
- Maintain array of editor states
- Push state on each change (debounced)
- Limit history size (e.g., 50 states)
- Implement `Ctrl+Z` and `Ctrl+Shift+Z` or `Ctrl+Y`

### 8. Preview-Editor Scroll Synchronization

**Issue:** Scrolling editor doesn't sync with preview.

**Solution:** Calculate approximate position mapping and sync scroll events.

---

### 10. Find/Replace Functionality

**Add:** `Ctrl+F` for find, `Ctrl+H` for find and replace.

**Implementation:** Add search bar above editor or overlay dialog.

### 11. Syntax Highlighting in Editor

**Add:** Optional markdown syntax highlighting using library like:
- CodeMirror (lightweight)
- Monaco Editor (VS Code editor)
- Highlight.js (simpler)

**Note:** This would be a significant architectural change.

### 12. Export Options

**Add:** Export to PDF, HTML, or plain text.

**Implementation:** 
- HTML: Use existing preview HTML
- PDF: Use browser print API or library like jsPDF
- Plain text: Simple text download

**13. Markdown functions and elements that aren’t currently supported by the editor:**

- 1. Strikethrough: wrapping text with ~~ (e.g., ~~deleted~~) isn’t available.
- 2. Blockquotes: the ability to prepend > to create quoted sections is missing.
- 3. Horizontal rules: inserting a horizontal line using ---, *** or ___ isn’t implemented.
- 4. Headings beyond H3: the toolbar only provides H1–H3; higher-level headings (H4–H6) are absent.
- 5. Nested or multi‑level lists: there’s no way to indent list items to create sublists.
- 6. Task/checkbox lists: Markdown checkboxes (- [ ] / - [x]) aren’t supported.
- 7. While underline isn’t standard Markdown but is in some dialects.
- 8. Footnotes: Markdown footnote syntax ([^1]…[^1]:) isn’t handled.
- 9. Automatic link detection: pasting a URL doesn’t auto‑convert it to a link.
- 10. Escaped characters and inline HTML: there’s no way to toggle between escaped code and rendered HTML snippets.

## Low Priority Enhancements

### 14. Keyboard Shortcut Overlay

**Add:** Press `?` to show all available keyboard shortcuts.

**Implementation:** Create modal with table of shortcuts, similar to unsaved changes dialog.
---

## Specific Code Fixes

### Fix 1: Update Dark Mode Icon
**File:** `js/editor.js`
**Line:** ~701

```javascript
const applyTheme = (isDark) => {
    document.body.classList.toggle('theme-dark', isDark);
    document.body.classList.toggle('theme-light', !isDark);
    darkModeToggle.setAttribute('aria-checked', isDark);
    darkModeToggle.querySelector('.btn-text').textContent = isDark ? 'Light' : 'Dark';
    // ADD THIS:
    darkModeToggle.querySelector('.btn-icon').textContent = isDark ? '☀️' : '🌙';
};
```

### Fix 2: Enhanced Autosave Error Handling
**File:** `js/editor.js`
**Line:** ~92-101

```javascript
state.autosaveTimer = setTimeout(() => {
    try {
        localStorage.setItem(AUTOSAVE_KEY, editor.value);
        localStorage.setItem(AUTOSAVE_FILENAME_KEY, fileNameDisplay.textContent.trim());
        autosaveStatus.textContent = 'Draft saved';
    } catch (error) {
        console.error('Autosave failed', error);
        // IMPROVE THIS:
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            autosaveStatus.textContent = 'Storage full - autosave disabled';
            // Optionally show dialog to clear drafts
        } else {
            autosaveStatus.textContent = 'Autosave unavailable';
        }
    }
}, AUTOSAVE_INTERVAL);
```

### Fix 3: Add Loading State to Save Button
**File:** `js/editor.js`
**Line:** ~787

```javascript
const saveFile = () => {
    // ADD:
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    let filename = fileNameDisplay.textContent.trim();
    // ... existing code ...
    
    // BEFORE return/finally:
    saveButton.disabled = false;
    saveButton.querySelector('.btn-text').textContent = 'Save';
};
```

---

## Testing Checklist

Before implementing fixes, ensure:

- [ ] All existing tests still pass
- [ ] No console errors introduced
- [ ] Accessibility verified with screen reader
- [ ] Works in Chrome, Firefox, Safari, Edge
- [ ] Mobile responsiveness maintained
- [ ] Dark mode still works correctly
- [ ] Autosave still functions
- [ ] All keyboard shortcuts work

---

## Implementation Priority Order

1. **Week 1:** Critical issues (#1, #2, #3)
2. **Week 2:** Medium priority (#4, #5, #6)
3. **Week 3:** Undo/redo (#7)
4. **Ongoing:** Low priority items as needed

---

## Notes

- Most improvements maintain backward compatibility
- Consider creating a feature flag system for larger changes
- Keep accessibility in mind for all new features
- Test on actual devices, not just browser dev tools

