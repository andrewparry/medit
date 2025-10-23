# Manual Test Scenarios for Verified Fixes

## How to Test the Fixes

Open `index.html` in a browser and follow these test scenarios to verify all fixes are working correctly.

---

## 1. Bold & Italic Formatting

### Test Bold:
1. Type: `Hello world`
2. Select the word `Hello`
3. Click the **B** button or press `Ctrl+B`
4. **Expected:** `**Hello** world` (cursor after the second `**`)
5. Continue typing - text should appear after the bold markup

### Test Italic:
1. Type: `This is italic`
2. Select `is italic`
3. Click the **I** button or press `Ctrl+I`
4. **Expected:** `This *is italic*` (cursor after the closing `*`)

### Test with No Selection:
1. Click in empty editor
2. Press `Ctrl+B`
3. **Expected:** `**bold text**` with "bold text" selected
4. Start typing to replace the placeholder

---

## 2. Inline Code

### Test:
1. Type: `Use the console.log function`
2. Select `console.log`
3. Click the **</>** button or press ``Ctrl+` ``
4. **Expected:** ``Use the `console.log` function`` (cursor after closing backtick)

---

## 3. Code Block

### Test Empty Block:
1. Click in empty editor
2. Click the **{ }** button or press `Ctrl+Shift+C`
3. **Expected:**
   ```
   ```
   
   ```
   ```
   (cursor on the empty line between fences)
4. Start typing code directly

### Test with Selection:
1. Type: `function test() { return true; }`
2. Select all the text
3. Press `Ctrl+Shift+C`
4. **Expected:** Text wrapped in code fences, cursor after closing fence

---

## 4. Table Insertion

### Test Normal Insertion:
1. Type some text: `Here is a table:`
2. Press Enter twice
3. Click the **⊞** button
4. **Expected:** Clean table inserted with proper spacing:
   ```
   Here is a table:

   | Column 1 | Column 2 |
   | --- | --- |
   | Cell 1 | Cell 2 |
   | Cell 3 | Cell 4 |
   ```
5. "Column 1" should be selected for immediate editing

### Test Prevention Inside Code Block:
1. Insert a code block: `Ctrl+Shift+C`
2. Place cursor inside the code block
3. Try to insert a table
4. **Expected:** Status bar shows "Cannot insert table inside code block"
5. No table inserted

---

## 5. Heading & List Interaction

### Test Heading on List Item:
1. Type: `My list item`
2. Press `Ctrl+Shift+8` to make it a bullet list
3. **Expected:** `- My list item`
4. Press `Ctrl+2` to make it H2
5. **Expected:** `- ## My list item` (list marker preserved)

### Test Toggle List Off:
1. With cursor on `- ## My list item`
2. Press `Ctrl+Shift+8` again
3. **Expected:** `## My list item` (only list marker removed)

### Test Heading Level Change:
1. Type: `My heading`
2. Press `Ctrl+1` for H1
3. **Expected:** `# My heading`
4. Press `Ctrl+2` for H2
5. **Expected:** `## My heading` (replaced, not added)
6. Press `Ctrl+2` again
7. **Expected:** `My heading` (heading removed - toggle off)

---

## 6. Word & Character Counters

### Test with Various Content:
1. Type: `# Hello World`
2. **Expected:** Counter shows "2 words / 11 characters" (ignores `#`)

3. Add a list: `- Item one`
4. **Expected:** Counter updates to "4 words / 20 characters" (ignores `-`)

5. Add bold: `**bold text**`
6. **Expected:** Counter includes "bold text" but ignores `**`

7. Add code block with content
8. **Expected:** Counter includes code content

9. Add table
10. **Expected:** Counter includes table cell content, ignores pipes and dashes

### Test Empty Editor:
1. Clear all content
2. **Expected:** "0 words / 0 characters"

---

## 7. Link Insertion

### Test:
1. Type: `Click here for more info`
2. Select `here`
3. Click the **🔗** button or press `Ctrl+K`
4. Enter URL: `https://example.com`
5. Enter text (or keep default "here")
6. **Expected:** `Click [here](https://example.com) for more info`
7. Cursor should be after the closing `)`

---

## 8. Image Insertion

### Test:
1. Click the **🖼️** button
2. Enter alt text: `Logo`
3. Enter URL: `https://example.com/logo.png`
4. **Expected:** `![Logo](https://example.com/logo.png)`
5. Cursor after closing `)`

---

## 9. Preview Toggle Persistence

### Test:
1. Click the **👁️** button to hide preview
2. Refresh the page (F5)
3. **Expected:** Preview remains hidden after refresh

4. Click **👁️** to show preview
5. Refresh the page
6. **Expected:** Preview remains visible after refresh

---

## 10. Dark Mode Persistence

### Test:
1. Click the **🌙 Dark** button to enable dark mode
2. Refresh the page
3. **Expected:** Dark mode persists after refresh

4. Click **☀️ Light** button
5. Refresh the page
6. **Expected:** Light mode persists

---

## 11. File Operations

### Test Save:
1. Type some content: `# My Document\n\nThis is a test.`
2. Click **💾 Save**
3. Enter filename: `test-doc`
4. **Expected:** File `test-doc.md` downloads
5. Status bar shows "Saved test-doc.md"

### Test Open:
1. Click **📁 Open**
2. Select a `.md` file
3. **Expected:** File content loads into editor
4. Filename updates in status bar
5. Preview updates

### Test New:
1. Make some edits (don't save)
2. Click **🆕 New**
3. **Expected:** Dialog appears: "You have unsaved changes. Save before starting a new document?"
4. Options: Save / Don't Save / Cancel

#### If "Save":
- File saves, then editor clears

#### If "Don't Save":
- Editor clears immediately

#### If "Cancel":
- Dialog closes, content remains

---

## 12. Keyboard Shortcuts

### Test All Shortcuts:
- `Ctrl+B` → Bold
- `Ctrl+I` → Italic
- `Ctrl+K` → Link
- ``Ctrl+` `` → Inline code
- `Ctrl+1` → H1
- `Ctrl+2` → H2
- `Ctrl+3` → H3
- `Ctrl+Shift+7` → Numbered list
- `Ctrl+Shift+8` → Bullet list
- `Ctrl+Shift+C` → Code block
- `Ctrl+Shift+P` → Toggle preview
- `Ctrl+S` → Save
- `Ctrl+O` → Open

**Expected:** All shortcuts work and prevent default browser behavior (no browser save dialog, etc.)

---

## 13. Autosave

### Test:
1. Type some content
2. Wait 2 seconds
3. **Expected:** Status bar shows "Draft saved"
4. Refresh the page
5. **Expected:** Content restored from autosave

---

## 14. Filename Editing

### Test:
1. Click on "Untitled.md" in status bar
2. **Expected:** Filename becomes editable
3. Type new name: `my-document`
4. Press Enter
5. **Expected:** Filename updates to "my-document.md"
6. Click Save
7. **Expected:** File downloads with name "my-document.md"

---

## 15. Preview Rendering

### Test:
1. Type various Markdown:
   ```
   # Heading 1
   ## Heading 2
   
   **Bold text** and *italic text*
   
   `inline code`
   
   - List item 1
   - List item 2
   
   1. Numbered item
   2. Another item
   
   [Link](https://example.com)
   
   ![Image](https://via.placeholder.com/150)
   ```

2. **Expected:** Preview pane shows:
   - Properly formatted headings
   - Bold and italic text rendered
   - Inline code with background
   - Bullet and numbered lists
   - Clickable link
   - Image displayed

---

## ✅ All Tests Should Pass

If all these scenarios work as expected, the editor is fully functional and all issues have been resolved!

---

## 🐛 If You Find Issues

If any test fails:
1. Check browser console for errors
2. Verify you're using a modern browser (Chrome, Firefox, Safari, Edge)
3. Clear browser cache and reload
4. Check that all JavaScript files are loaded correctly
