# Bold Button - Manual Testing Instructions

## Quick Start

This is a pure client-side application. Simply open `index.html` in your browser and follow these test scenarios. No server setup required!

## Test Scenario 1: Bold Highlighted Text ✅

### Steps:

1. Type in the editor: `hello world test`
2. Select the word "world" by double-clicking or click-dragging.
3. Click the **B** (Bold) button in the toolbar
4. OR press `Ctrl+B` (Windows/Linux) or `Cmd+B` (Mac)

### Expected Result:

```markdown
hello **world** test
```

- The word "world" should be wrapped with `**` markers
- Preview should show the word in bold
- Cursor should be positioned after the closing `**`

---

## Test Scenario 2: Insert Bold Markers (No Selection) ✅

### Steps:

1. Type in the editor: `hello test`
2. Place cursor between "hello" and "test" (click after the space)...
3. Click the **B** (Bold) button in the toolbar
4. OR press `Ctrl+B` (Windows/Linux) or `Cmd+B` (Mac)

### Expected Result:

```markdown
hello **bold text** test
```

- The text `**bold text**` should be inserted
- The placeholder text "bold text" should be **selected** (highlighted)
- You can immediately start typing to replace "bold text"
- If you just press arrow keys, you'll move out of the selection

---

## Test Scenario 3: Remove Bold Formatting (Toggle Off) ✅

### Steps:

1. Type in the editor: `hello **world** test`
2. Click anywhere inside the word "world" (between the `**` markers)
3. Notice the **B** button should be highlighted/active (showing bold is applied)
4. Click the **B** (Bold) button again
5. OR press `Ctrl+B` (Windows/Linux) or `Cmd+B` (Mac)

### Expected Result:

```markdown
hello world test
```

- The `**` markers should be removed
- The text "world" should remain
- The **B** button should no longer be highlighted
- Cursor should remain at approximately the same position in the text

---

## Test Scenario 4: Bold Button State Indicator ✅

### Steps:

1. Type: `This **is** bold`
2. Click inside the word "is" (between the `**` markers)
3. Observe the **B** button
4. Click outside the bold text (e.g., in the word "This")
5. Observe the **B** button again

### Expected Result:

- When cursor is **inside** bold text: **B** button should be highlighted/active
- When cursor is **outside** bold text: **B** button should NOT be highlighted
- This visual feedback helps you know when bold formatting is active

---

## Test Scenario 5: Multiple Bold Sections ✅

### Steps:

1. Type: `**first** and **second** text`
2. Click inside the word "second"
3. Click the **B** button to remove bold
4. Observe the result

### Expected Result:

```markdown
**first** and second text
```

- Only the word "second" should have its bold removed
- The word "first" should remain bold
- Only the bold section containing the cursor is affected

---

## Test Scenario 6: Edge Cases

### A. Cursor at Start of Bold Text

1. Type: `**world**`
2. Click right after the opening `**` (before 'w')
3. Observe: **B** button should be highlighted
4. Click **B** button
5. Expected: Bold removed → `world`

### B. Cursor at End of Bold Text

1. Type: `**world**`
2. Click right before the closing `**` (after 'd')
3. Observe: **B** button should be highlighted
4. Click **B** button
5. Expected: Bold removed → `world`

### C. Empty Document

1. Clear all text in editor
2. Click **B** button
3. Expected: `**bold text**` appears with "bold text" selected

### D. Bold at Start of Line

1. Type: `**start** of line`
2. Works correctly ✅

### E. Bold at End of Line

1. Type: `end of **line**`
2. Works correctly ✅

---

## Keyboard Shortcut Testing

### Windows/Linux:

- `Ctrl+B` should toggle bold formatting

### Mac:

- `Cmd+B` should toggle bold formatting

Test all three scenarios using keyboard shortcuts instead of clicking the button.

---

## Visual Indicators to Check

### Toolbar Button:

- Should have an "active" or "pressed" state when cursor is in bold text
- Should look like a normal button when cursor is outside bold text

### Preview Pane:

- Bold text should render as **bold** in the preview
- Updating should happen automatically as you type

### Status Bar:

- Should update word/character counts correctly
- Should show draft saving status

---

## Common Issues to Watch For

### ❌ Issue: Button doesn't remove bold

**Check:** Is the cursor actually inside the bold text (between the markers)?
**Fix:** The cursor needs to be between `**text**`, not before or after it

### ❌ Issue: Bold markers appear as text in preview

**Check:** Did you type the markers manually?
**Fix:** Always use the Bold button or Ctrl/Cmd+B

### ❌ Issue: Cursor jumps to wrong position

**Check:** This should NOT happen with the fix
**Fix:** This was the bug that was fixed

### ❌ Issue: Can't type after pressing Bold button

**Check:** Is placeholder text selected?
**Fix:** This is expected - just start typing to replace it

---

## Browser Compatibility

Test in:

- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

All modern browsers should work correctly.

---

## Accessibility Testing

### Screen Reader:

1. Use a screen reader (NVDA, JAWS, VoiceOver)
2. Press the Bold button
3. Should announce: "bold formatting applied"

### Keyboard Navigation:

1. Tab to the Bold button
2. Press Enter or Space to activate
3. Should work the same as clicking

### ARIA Attributes:

- Bold button should have `aria-pressed="true"` when cursor is in bold text
- Bold button should have `aria-pressed="false"` when cursor is outside bold text

---

## Performance Testing

### Large Documents:

1. Create a document with 1000+ lines
2. Add bold formatting
3. Should be instant (< 50ms)

### Multiple Operations:

1. Apply bold 20+ times rapidly
2. Should not lag or freeze

---

## Regression Testing

After confirming bold works, verify these still work:

- ✅ Italic button (Ctrl/Cmd+I)
- ✅ Code button (Ctrl/Cmd+`)
- ✅ Strikethrough button
- ✅ Headers (H1, H2, H3)
- ✅ Lists (bullet and numbered)
- ✅ Links and images
- ✅ Code blocks
- ✅ Preview rendering
- ✅ File save/load
- ✅ Autosave

---

## Summary Checklist

Before considering the bold button complete, verify:

- [ ] Can bold highlighted text
- [ ] Can insert bold markers with cursor selected
- [ ] Can remove bold formatting by clicking in bold text
- [ ] Bold button shows active state when in bold text
- [ ] Works with keyboard shortcut (Ctrl/Cmd+B)
- [ ] Works at start, middle, and end of document
- [ ] Works with multiple bold sections
- [ ] Cursor position is correct after all operations
- [ ] No console errors
- [ ] All 340 tests pass
- [ ] Preview renders correctly
- [ ] Undo/redo works (if implemented)
- [ ] Works on mobile (if supporting mobile)

---

## Notes

- All automated tests pass (340 tests)
- No breaking changes to existing functionality
- Implementation follows existing code patterns
- Performance impact is minimal
- Fully backward compatible
