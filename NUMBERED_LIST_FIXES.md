# Numbered List Fixes - Implementation Guide

## Fix #1: Enter Key Smart List Continuation

### Problem
Pressing Enter after a numbered list item doesn't automatically create the next numbered item.

### Root Cause
The `handleEnterInList()` function returns `false` before properly handling the list continuation.

### Solution

**File:** `js/editor-formatting.js`

**Location:** Lines 1406-1513 (function `handleEnterInList`)

**Current Issue:** The function needs better debugging to understand why it's not triggering. After testing, the function appears to work in some cases but not consistently.

**Recommended Fix:**

```javascript
const handleEnterInList = () => {
    if (!elements.editor) return false;
    
    const { start, end, value } = utils.getSelection();
    
    // Only handle single cursor (no selection)
    if (start !== end) return false;
    
    const lines = value.split('\n');
    const currentLineIndex = value.slice(0, start).split('\n').length - 1;
    const currentLine = lines[currentLineIndex];
    
    // Get cursor position within the line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const cursorPosInLine = start - lineStart;
    
    // Check if we're in a list item (IMPROVED REGEX)
    const unorderedMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    
    if (!unorderedMatch && !orderedMatch) {
        return false; // Not in a list
    }
    
    const isOrdered = !!orderedMatch;
    const match = isOrdered ? orderedMatch : unorderedMatch;
    const indent = match[1];
    const marker = match[2];
    const content = match[3];
    
    // FIX: Check if cursor is at END of line OR in the content
    const markerEndPos = indent.length + marker.length + (isOrdered ? 1 : 0) + 1; // +1 for space
    const isAtEndOfLine = cursorPosInLine >= currentLine.length;
    const isInContent = cursorPosInLine >= markerEndPos;
    
    // If the list item is empty (only marker), exit the list
    if (content.trim() === '' && (isAtEndOfLine || cursorPosInLine <= markerEndPos)) {
        // Remove the empty list item and exit list
        const before = value.slice(0, lineStart);
        const after = value.slice(value.indexOf('\n', start) !== -1 ? value.indexOf('\n', start) : value.length);
        
        elements.editor.value = before + after;
        elements.editor.setSelectionRange(lineStart, lineStart);
        
        // Trigger updates
        if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
            MarkdownEditor.preview.updatePreview();
        }
        if (utils.updateCounters) {
            utils.updateCounters();
        }
        if (MarkdownEditor.stateManager) {
            MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
        }
        if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
            MarkdownEditor.autosave.scheduleAutosave();
        }
        
        return true;
    }
    
    // Split the content at cursor position
    const contentBeforeCursor = content.slice(0, cursorPosInLine - markerEndPos);
    const contentAfterCursor = content.slice(cursorPosInLine - markerEndPos);
    
    // Determine the next marker
    let nextMarker;
    if (isOrdered) {
        const currentNumber = parseInt(marker, 10);
        nextMarker = `${currentNumber + 1}.`;
    } else {
        nextMarker = `${marker}`;
    }
    
    // Build the new content
    const lineEnd = value.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    
    const before = value.slice(0, lineStart);
    const after = value.slice(actualLineEnd);
    
    const newCurrentLine = isOrdered 
        ? `${indent}${marker}. ${contentBeforeCursor}` 
        : `${indent}${marker} ${contentBeforeCursor}`;
    const newNextLine = `${indent}${nextMarker} ${contentAfterCursor}`;
    
    const newValue = before + newCurrentLine + '\n' + newNextLine + after;
    elements.editor.value = newValue;
    
    // Position cursor at start of content on new line
    const newCursorPos = before.length + newCurrentLine.length + 1 + indent.length + nextMarker.length + 1;
    elements.editor.setSelectionRange(newCursorPos, newCursorPos);
    
    // If ordered list, renumber ALL lists immediately (not just current block)
    if (isOrdered) {
        setTimeout(() => {
            renumberAllOrderedLists(); // Changed from renumberOrderedList()
        }, 0);
    }
    
    // Trigger updates
    if (MarkdownEditor.preview && MarkdownEditor.preview.updatePreview) {
        MarkdownEditor.preview.updatePreview();
    }
    if (utils.updateCounters) {
        utils.updateCounters();
    }
    if (MarkdownEditor.stateManager) {
        MarkdownEditor.stateManager.markDirty(elements.editor.value !== state.lastSavedContent);
    }
    if (MarkdownEditor.autosave && MarkdownEditor.autosave.scheduleAutosave) {
        MarkdownEditor.autosave.scheduleAutosave();
    }
    
    return true;
};
```

**Key Changes:**
1. Improved cursor position detection to handle end-of-line cases
2. Fixed content splitting calculation
3. Changed `renumberOrderedList()` to `renumberAllOrderedLists()` for consistency
4. Better handling of empty list items

---

## Fix #2: Nested List Renumbering (CRITICAL)

### Problem
Nested lists under different parent items continue numbering instead of resetting to 1.

**Example:**
```markdown
1. Parent 1
  1. Child 1
  2. Child 2
2. Parent 2
  3. Child 3  ← WRONG! Should be "1. Child 3"
```

### Root Cause
The `renumberAllOrderedLists()` function tracks counters by nesting level but doesn't recognize when a nested list ends and a new one begins under a different parent.

### Solution

**File:** `js/editor-formatting.js`

**Location:** Lines 1329-1391 (function `renumberAllOrderedLists`)

**Replace the entire function with:**

```javascript
const renumberAllOrderedLists = () => {
    if (!elements.editor) return;
    
    const { start, end, value } = utils.getSelection();
    const lines = value.split('\n');
    let modified = false;
    
    // Track list state at each VISUAL nesting level
    // Map structure: Map<level, { counter: number, parentLineIndex: number }>
    const listState = new Map();
    let prevLevel = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Convert tabs to 4 spaces for consistent handling
        const normalizedLine = line.replace(/\t/g, '    ');
        
        const listMatch = normalizedLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
        
        if (listMatch) {
            const indentSpaces = listMatch[1].length;
            const currentNumber = parseInt(listMatch[2], 10);
            const content = listMatch[3];
            
            // Calculate nesting level (2 spaces = 1 level)
            const level = Math.floor(indentSpaces / 2);
            
            // Normalize indentation to standard 2-space increments
            const normalizedIndent = '  '.repeat(level);
            
            // **FIX: Detect when we need to reset nested list counters**
            
            // Case 1: We moved to a shallower level (back to parent or higher)
            if (prevLevel !== -1 && level < prevLevel) {
                // Clear all deeper level counters
                for (const [key] of listState) {
                    if (key > level) {
                        listState.delete(key);
                    }
                }
            }
            
            // Case 2: We're at a nested level and the parent level counter changed
            // This means we're starting a NEW nested list under a DIFFERENT parent
            if (level > 0 && prevLevel !== -1) {
                const parentLevel = level - 1;
                
                // Check if parent level counter changed since last time we were at this level
                if (listState.has(level)) {
                    const currentState = listState.get(level);
                    
                    // If we have a parent level, check its counter
                    if (listState.has(parentLevel)) {
                        const parentState = listState.get(parentLevel);
                        
                        // If parent counter changed, this is a NEW nested list
                        if (currentState.parentCounter !== parentState.counter) {
                            // Reset this level's counter
                            listState.delete(level);
                            // Also clear any deeper levels
                            for (const [key] of listState) {
                                if (key > level) {
                                    listState.delete(key);
                                }
                            }
                        }
                    }
                }
            }
            
            // Get or initialize counter for this level
            if (!listState.has(level)) {
                // Get parent counter for tracking
                const parentLevel = level - 1;
                const parentCounter = level > 0 && listState.has(parentLevel) 
                    ? listState.get(parentLevel).counter 
                    : 0;
                
                listState.set(level, { 
                    counter: 1, 
                    parentCounter: parentCounter 
                });
            }
            
            const expectedNumber = listState.get(level).counter;
            
            // If number doesn't match expected OR indentation needs normalizing, update it
            if (currentNumber !== expectedNumber || listMatch[1] !== normalizedIndent) {
                lines[i] = `${normalizedIndent}${expectedNumber}. ${content}`;
                modified = true;
            }
            
            // Increment counter for next item at this level
            listState.get(level).counter++;
            
            // Update parent counter reference after incrementing
            const parentLevel = level - 1;
            if (level > 0 && listState.has(parentLevel)) {
                listState.get(level).parentCounter = listState.get(parentLevel).counter;
            }
            
            prevLevel = level;
        } else {
            // Non-list line: reset all counters (list has ended)
            if (normalizedLine.trim() !== '') {
                listState.clear();
                prevLevel = -1;
            }
        }
    }
    
    if (modified) {
        elements.editor.value = lines.join('\n');
        elements.editor.setSelectionRange(start, end);
    }
};
```

**Key Changes:**

1. **Enhanced state tracking:** Changed from `Map<level, number>` to `Map<level, { counter, parentCounter }>`

2. **Parent change detection:** When at a nested level, check if the parent's counter has changed since we last saw this nested level. If it has, we're under a DIFFERENT parent → reset the nested counter.

3. **Level transition handling:** When moving from deeper to shallower level, clear ALL deeper level states.

4. **Maintains backward compatibility:** Still handles all the existing cases correctly (single-level lists, separated lists, etc.)

### Algorithm Explanation

**Before:**
```javascript
// Simple counter per level
Map {
  0 => 2,  // Parent level at 2
  1 => 3   // Nested level at 3 (WRONG!)
}
```

**After:**
```javascript
// Counter + parent context per level
Map {
  0 => { counter: 2, parentCounter: 0 },
  1 => { counter: 1, parentCounter: 2 }  // parentCounter = 2 means "under Parent 2"
}

// When we see level 1 again, we check:
// Is parentCounter still 2? 
// - Yes → continue counting (2, 3, 4...)
// - No → NEW nested list, reset to 1
```

---

## Fix #3: Tab Indentation Spacing (Minor)

### Problem
Tab key adds 4 spaces instead of documented 2 spaces.

### Investigation Needed
Check if `indentListItem()` is being called twice or if there's another source adding extra spaces.

### Temporary Fix

**File:** `js/editor-formatting.js`

**Location:** Line 1157 in `indentListItem()`

**Verify this line only adds 2 spaces:**
```javascript
newLine = `  ${originalLine}`;  // Exactly 2 spaces
```

**Add logging to debug:**
```javascript
if (i >= startLineIndex && i <= endLineIndex) {
    const listMatch = originalLine.match(/^(\s*)([-*+]|\d+\.)\s+/);
    if (listMatch) {
        console.log(`Indenting line ${i}: "${originalLine}" → "${  }${originalLine}"`);
        newLine = `  ${originalLine}`;
        modified = true;
    }
}
```

**Alternative:** If users prefer 4-space indentation, update the level calculation:
```javascript
// Change from:
const level = Math.floor(indentSpaces / 2);

// To:
const level = Math.floor(indentSpaces / 4);
```

But this would require coordinating with the parser in `marked-lite.js`.

---

## Testing Strategy

### Unit Test Cases

**Test 1: Enter Key Continuation**
```javascript
test('Enter key continues numbered list', () => {
    editor.value = '1. First item';
    editor.setSelectionRange(14, 14); // End of line
    
    // Simulate Enter press
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    editor.dispatchEvent(event);
    
    expect(editor.value).toBe('1. First item\n2. ');
    expect(editor.selectionStart).toBe(17); // After "2. "
});
```

**Test 2: Nested List Reset**
```javascript
test('Nested lists reset under different parents', () => {
    editor.value = '1. Parent 1\n  5. Child\n2. Parent 2\n  9. Child';
    triggerInput();
    waitForDebounce();
    
    expect(editor.value).toBe('1. Parent 1\n  1. Child\n2. Parent 2\n  1. Child');
});
```

**Test 3: Deep Nesting**
```javascript
test('Deep nesting (3 levels)', () => {
    editor.value = '1. L0\n  1. L1\n    1. L2\n2. L0\n  1. L1\n    5. L2';
    triggerInput();
    waitForDebounce();
    
    const lines = editor.value.split('\n');
    expect(lines[5]).toBe('    1. L2'); // Should reset to 1
});
```

### Integration Test

**Test: Full Workflow**
1. Type "1. First"
2. Press Enter → Should show "2. "
3. Type "Second"
4. Press Tab → Should indent and show "    1. Second"
5. Press Enter → Should show "    2. "
6. Type "Third"
7. Press Shift+Tab → Should outdent
8. Wait 1 second → All lists should be renumbered correctly

**Expected Final State:**
```markdown
1. First
    1. Second
    2. Third   (outdented, so continues from Second)
```

---

## Deployment Checklist

- [ ] Apply Fix #1 (Enter key)
- [ ] Apply Fix #2 (Nested renumbering)
- [ ] Test all scenarios from NUMBERED_LIST_ANALYSIS.md
- [ ] Run existing test suite
- [ ] Manual testing in browser
- [ ] Check for regressions in:
  - [ ] Bullet lists (unordered)
  - [ ] Mixed list types
  - [ ] Undo/redo
  - [ ] Copy/paste
- [ ] Performance test with 100+ item lists
- [ ] Update documentation
- [ ] Commit with descriptive message

---

## Implementation Priority

1. **CRITICAL:** Fix #2 (Nested list renumbering) - Causes editor/preview mismatch
2. **HIGH:** Fix #1 (Enter key continuation) - Expected UX for markdown editors
3. **LOW:** Fix #3 (Tab spacing) - Minor cosmetic issue

---

## Rollback Plan

If fixes cause regressions:

1. Keep a copy of original `editor-formatting.js`
2. Test in dev environment first
3. Deploy to staging before production
4. Monitor error logs for JavaScript exceptions
5. Have rollback script ready: `git checkout HEAD~1 js/editor-formatting.js`

---

## Performance Considerations

**Fix #2 Complexity:**
- Before: O(n) where n = number of lines
- After: O(n) with slightly more work per iteration
- Added overhead: ~2 extra map lookups per list item
- **Impact:** Negligible for documents < 10,000 lines

**Memory Usage:**
- Before: Map with ~10 entries (one per nesting level)
- After: Map with ~10 entries, but each entry is an object instead of a number
- **Impact:** Additional ~1KB memory for typical documents

---

## Success Metrics

After deployment, verify:

1. ✅ All test cases pass
2. ✅ No console errors in browser
3. ✅ Editor and preview match in all scenarios
4. ✅ Renumbering completes within 50ms for 100-item lists
5. ✅ No user reports of list numbering issues
6. ✅ Undo/redo works correctly with new fixes
7. ✅ Performance remains smooth (no lag or flicker)

---

## Future Enhancements

**Optional improvements for future iterations:**

1. **Smart numbering style detection:** If user types "a. Item", continue with "b. Item", "c. Item"
2. **Roman numerals:** Support for i., ii., iii., etc.
3. **Start number override:** Allow lists to start at arbitrary numbers (e.g., "5. Item" stays as 5)
4. **Custom list markers:** Support for custom prefixes like "Step 1:", "Task 1:", etc.
5. **List item drag-and-drop:** Reorder items with drag-and-drop and auto-renumber
6. **Multi-selection operations:** Select multiple items and indent/outdent together

But these are **out of scope** for the current fix - focus on correctness first!

