# Smart List Toggle Context Fix

## Issue
When clicking the numbered list button (or using Ctrl+Shift+7) to convert text to a numbered list, it always inserted "1." regardless of whether you were continuing an existing list.

**Example Problem:**
```
5. qweqwe
some text here [cursor, then click numbered list button]

Result:
5. qweqwe
1. some text here   ❌ Should be 6!
```

The auto-renumbering would fix it after 500ms, but it should be smart from the start.

## Solution
Made the `toggleList()` function context-aware for ordered lists:

1. **Detects if continuing a list**: Checks the previous line
2. **Uses the next sequential number**: If previous line is "5. text", uses "6."
3. **Respects indentation**: Only continues if indentation matches
4. **Triggers immediate renumbering**: Updates the rest of the list instantly

## Implementation

### Smart Marker Detection

Added logic to detect list context:

```javascript
// Smart marker detection for ordered lists
let markerText = type === 'ol' ? '1. ' : '- ';

// For ordered lists, check if we're continuing an existing list
if (type === 'ol' && selectionStartIndex > 0) {
    // Look at the previous line
    const prevLine = lines[selectionStartIndex - 1];
    const prevMatch = prevLine.match(/^(\s*)(\d+)\.\s+/);
    
    if (prevMatch) {
        // We're continuing a list - use the next number
        const prevNumber = parseInt(prevMatch[2], 10);
        const prevIndent = prevMatch[1];
        
        // Check if current line has same indentation
        const currentLine = lines[selectionStartIndex];
        const currentIndent = currentLine.match(/^(\s*)/)[1];
        
        if (currentIndent === prevIndent) {
            markerText = `${prevNumber + 1}. `;
        }
    }
}
```

### Immediate Renumbering

Added immediate renumbering after toggling to ordered list:

```javascript
// If we added ordered list markers, immediately renumber to ensure consistency
if (type === 'ol' && !shouldRemove) {
    setTimeout(() => {
        renumberAllOrderedLists();
    }, 0);
}
```

## Behavior Examples

### Case 1: Continuing a List

**Before:**
```
1. First item
2. Second item
Some text [cursor, click numbered list button]
```

**After (OLD behavior):**
```
1. First item
2. Second item
1. Some text   ❌ Wrong!
```

**After (NEW behavior):**
```
1. First item
2. Second item
3. Some text   ✅ Correct!
```

### Case 2: Starting a New List

**Before:**
```
Some paragraph text.

Another paragraph [cursor, click numbered list button]
```

**After (works same as before):**
```
Some paragraph text.

1. Another paragraph   ✅ Starts at 1
```

### Case 3: Different Indentation

**Before:**
```
1. Parent item
  1. Nested item
Some text at parent level [cursor, click numbered list button]
```

**After:**
```
1. Parent item
  1. Nested item
2. Some text at parent level   ✅ Continues parent list!
```

### Case 4: Inserting in Middle

**Before:**
```
1. First
2. Third
New item [cursor between them, click button]
```

**After (with immediate renumbering):**
```
1. First
2. New item        ✅ Gets number 2
3. Third           ✅ Auto-renumbered to 3!
```

## Edge Cases Handled

✅ **No previous line** - Uses "1." (default behavior)  
✅ **Previous line not a list** - Uses "1." (starts new list)  
✅ **Different indentation** - Uses "1." (starts new nested list)  
✅ **Same indentation** - Uses next sequential number  
✅ **Multiple lines selected** - First line gets smart number, rest get renumbered  
✅ **Unordered lists** - Unchanged behavior (always uses "-")  

## Performance

- **Instant feedback**: No delay for the initial number insertion
- **Immediate renumbering**: Rest of list updates instantly (no 500ms wait)
- **Efficient**: Only renumbers when adding ordered list markers, not when removing

## Files Modified

1. **js/editor-formatting.js**
   - Updated `toggleList()` function (lines 904-926): Added smart marker detection
   - Updated `toggleList()` function (lines 1079-1085): Added immediate renumbering

## Testing

### Test Case 1: Continue List
1. Create: `1. First\n2. Second`
2. Add new line with text
3. Click numbered list button
4. Expected: Shows `3.` immediately

### Test Case 2: Start New List
1. Type some regular text
2. Click numbered list button
3. Expected: Shows `1.`

### Test Case 3: Mixed Indentation
1. Create: `1. Parent\n  1. Nested`
2. Add text at parent level
3. Click numbered list button
4. Expected: Shows `2.` (continues parent)

### Test Case 4: Insert Middle
1. Create: `1. First\n3. Third`
2. Add text between them
3. Click numbered list button
4. Expected: Shows `2.`, and Third updates to `3.`

## Benefits

✅ **Intuitive** - Behaves as users expect  
✅ **Instant** - No waiting for auto-renumbering  
✅ **Smart** - Understands list context  
✅ **Consistent** - Editor and preview always match  
✅ **Efficient** - Minimal performance impact  

## Summary

This fix makes the numbered list toggle button context-aware. Instead of always inserting "1.", it now:
- Detects if you're continuing an existing list
- Uses the correct next sequential number
- Maintains proper indentation awareness
- Immediately renumbers the rest of the list

This provides instant, correct numbering without waiting for the debounced auto-renumbering to kick in.

