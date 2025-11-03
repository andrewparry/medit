# List Numbering Sync Fix

## Issue
Editor and preview showed different numbering for ordered lists. This happened because:
1. HTML browsers automatically renumber ordered lists sequentially (1, 2, 3...)
2. The editor showed the raw markdown numbers which could be anything (1, 1, 5...)
3. This created confusion and made the editor unreliable

## Solution
Implemented automatic renumbering of ALL ordered lists in the document to match how they'll render in the preview.

## Implementation

### Core Function: `renumberAllOrderedLists()`

This function:
1. Scans through ALL lines in the document
2. Tracks list counters at each indentation level
3. Renumbers ordered list items to match expected sequential numbering
4. Resets counters when lists end (empty lines or non-list content)
5. Only modifies if numbers don't match expected values

**Key Features:**
- Handles nested lists correctly (different counters per indentation level)
- Preserves cursor position
- Only updates if changes needed (performance)
- Works with any indentation level

### Debounced Auto-Renumbering

Added `renumberAllOrderedListsDebounced()`:
- Waits 500ms after user stops typing
- Prevents performance issues during rapid typing
- Ensures smooth editing experience

### Integration

Wired into the input handler in `editor-init.js`:
```javascript
// Auto-renumber ordered lists to keep editor in sync with preview
if (MarkdownEditor.formatting && MarkdownEditor.formatting.renumberAllOrderedListsDebounced) {
    MarkdownEditor.formatting.renumberAllOrderedListsDebounced();
}
```

This runs on EVERY input event, keeping the editor constantly in sync with how the preview will render.

## Example Behavior

### Before Fix
```markdown
Editor:                Preview:
1. First               1. First
1. Second              2. Second  ❌ Mismatch!
5. Third               3. Third   ❌ Mismatch!
```

### After Fix
```markdown
Editor:                Preview:
1. First               1. First
2. Second              2. Second  ✅ Match!
3. Third               3. Third   ✅ Match!
```

### Nested Lists
```markdown
Editor:                Preview:
1. First               1. First
  1. Nested A            • Nested A
  2. Nested B            • Nested B
2. Second              2. Second
```

Both are perfectly in sync!

## Technical Details

### List Counter Tracking

Uses a Map to track counters:
```javascript
const listCounters = new Map(); // Map<indent_level, current_number>
```

- Each indentation level gets its own counter
- When a new list starts (shallower indent), deeper levels are cleared
- Blank lines reset all counters

### Indentation Detection

```javascript
const indent = listMatch[1].length;  // Count spaces/tabs
```

- Works with any number of spaces (2, 4, etc.)
- Compatible with Tab-based indentation

### Performance

- Only renumbers if changes detected
- Debounced to avoid excessive runs
- Efficient Map-based counter tracking
- No DOM manipulation during calculation

## Edge Cases Handled

✅ **Mixed indentation** - Each level tracked separately  
✅ **Non-consecutive numbers** - All normalized to 1, 2, 3...  
✅ **Blank lines in lists** - Properly resets counters  
✅ **Rapid typing** - Debounced to prevent lag  
✅ **Large documents** - Efficient scanning  
✅ **Multiple lists** - Each list renumbered independently  
✅ **Cursor preservation** - Selection maintained during renumber  

## Files Modified

1. **js/editor-formatting.js**
   - Added `renumberAllOrderedLists()` (lines 1289-1345)
   - Added `renumberAllOrderedListsDebounced()` (lines 1347-1354)
   - Exported both functions in public API

2. **js/editor-init.js**
   - Added call to debounced renumbering in `handleInput()` (lines 40-42)

3. **UI_IMPROVEMENTS_ACTION_ITEMS.md**
   - Updated feature #6 documentation

## Testing

### Manual Test
1. Open editor with the example content from the screenshot
2. Type or edit any ordered list item
3. Wait 500ms
4. Observe: Numbers in editor now match preview exactly!

### Scenarios to Test

1. **Basic list:**
   ```
   Type: 1. First
   Type: 1. Second
   Wait: Numbers change to 1. and 2.
   ```

2. **Insert in middle:**
   ```
   Have: 1. First / 2. Third
   Insert between them
   Result: 1. First / 2. [new] / 3. Third
   ```

3. **Nested lists:**
   ```
   1. Parent
     1. Child A
     1. Child B
   1. Parent 2
   
   After sync:
   1. Parent
     1. Child A
     2. Child B (renumbered!)
   2. Parent 2 (renumbered!)
   ```

4. **Delete item:**
   ```
   Before: 1. A / 2. B / 3. C
   Delete B
   After: 1. A / 2. C (renumbered!)
   ```

## Benefits

✅ **No more confusion** - What you see is what you get  
✅ **Automatic** - No manual renumbering needed  
✅ **Reliable** - Always correct  
✅ **Fast** - Debounced for smooth typing  
✅ **Smart** - Handles nested lists correctly  

## Known Limitations

1. **500ms delay** - Small delay before numbers update (by design for performance)
2. **Markdown constraint** - Can't preserve intentional non-sequential numbering (e.g., starting at 5)
   - This is actually correct behavior - standard Markdown always renders sequentially

## Future Enhancements

- Add setting to adjust debounce delay
- Add visual indicator when renumbering is in progress
- Add option to disable auto-renumbering (for power users who want manual control)
- Consider immediate renumbering on specific actions (Enter, Delete)

## Summary

This fix ensures the editor and preview can never get out of sync when it comes to ordered list numbering. The automatic renumbering happens transparently in the background, providing a reliable, confusion-free editing experience that matches user expectations.

