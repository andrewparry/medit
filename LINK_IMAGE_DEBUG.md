# Link & Image Button Debugging Guide

## Issue Report
User reports that the Insert Link (🔗) and Insert Image (🖼️) buttons do not work.

## Code Verification ✅

### 1. HTML Buttons (index.html)
```html
<button class="toolbar-btn" type="button" data-format="link" aria-label="Insert link" title="Insert link (Ctrl+K)">
    <span class="btn-icon" aria-hidden="true">🔗</span>
</button>
<button class="toolbar-btn" type="button" data-format="image" aria-label="Insert image" title="Insert image">
    <span class="btn-icon" aria-hidden="true">🖼️</span>
</button>
```
✅ Buttons have correct `data-format` attributes
✅ Buttons are properly structured

### 2. Event Handler (js/editor.js)
```javascript
const handleToolbarClick = (event) => {
    const target = event.target.closest('button[data-format]');
    if (!target) {
        return;
    }
    event.preventDefault();
    console.log('Toolbar button clicked:', target.dataset.format);
    handleFormatting(target.dataset.format);
};
```
✅ Handler uses `closest()` to find button even if span is clicked
✅ Handler calls `handleFormatting()` with correct action

### 3. Formatting Router (js/editor.js)
```javascript
const handleFormatting = (action) => {
    switch (action) {
        // ... other cases
        case 'link':
            insertLink();
            break;
        case 'image':
            insertImage();
            break;
        // ... other cases
    }
};
```
✅ Routes 'link' action to `insertLink()`
✅ Routes 'image' action to `insertImage()`

### 4. Insert Functions (js/editor.js)
```javascript
const insertLink = () => {
    console.log('insertLink function called');
    const { start, end, value } = getSelection();
    const selectedText = value.slice(start, end);

    const url = promptForInput('Link URL (https://...)', 'https://');
    if (!url) {
        console.log('Link insertion cancelled - no URL');
        return;
    }

    const defaultText = selectedText || url;
    const textResponse = promptForInput('Link text (optional)', defaultText);
    if (textResponse === null) {
        console.log('Link insertion cancelled - no text');
        return;
    }

    const linkText = textResponse || defaultText;
    const linkSyntax = `[${linkText}](${url})`;

    console.log('Inserting link:', linkSyntax);
    replaceSelection(linkSyntax, linkSyntax.length);
};

const insertImage = () => {
    console.log('insertImage function called');
    const altResponse = promptForInput('Image description (alt text)', 'Image description');
    if (altResponse === null) {
        console.log('Image insertion cancelled - no alt text');
        return;
    }

    const altText = altResponse || 'image';
    const url = promptForInput('Image URL (https://...)', 'https://');
    if (!url) {
        console.log('Image insertion cancelled - no URL');
        return;
    }

    const imageSyntax = `![${altText}](${url})`;
    console.log('Inserting image:', imageSyntax);
    replaceSelection(imageSyntax, imageSyntax.length);
};
```
✅ Functions use `window.prompt()` for user input
✅ Functions call `replaceSelection()` to insert syntax
✅ Now includes console.log for debugging

### 5. Event Binding (js/editor.js)
```javascript
const bindEvents = () => {
    toolbar.addEventListener('click', handleToolbarClick);
    // ... other bindings
};
```
✅ Toolbar click handler is bound

## Debugging Steps

### Step 1: Open Browser Console
1. Open `index.html` in your browser
2. Press F12 to open Developer Tools
3. Go to the Console tab

### Step 2: Click Link Button
1. Click the 🔗 button in the toolbar
2. Check console for these messages:
   - `Toolbar button clicked: link`
   - `insertLink function called`

### Step 3: Complete the Prompts
1. When prompted for "Link URL", enter: `https://example.com`
2. When prompted for "Link text", enter: `Example` (or press OK for default)
3. Check console for: `Inserting link: [Example](https://example.com)`
4. Check editor content - should contain the link syntax

### Step 4: Click Image Button
1. Click the 🖼️ button in the toolbar
2. Check console for these messages:
   - `Toolbar button clicked: image`
   - `insertImage function called`

### Step 5: Complete the Prompts
1. When prompted for "Image description", enter: `My Image` (or press OK for default)
2. When prompted for "Image URL", enter: `https://example.com/image.png`
3. Check console for: `Inserting image: ![My Image](https://example.com/image.png)`
4. Check editor content - should contain the image syntax

## Possible Issues & Solutions

### Issue 1: No Console Messages
**Symptom:** No messages appear when clicking buttons

**Possible Causes:**
- JavaScript not loaded
- Event handler not bound
- Wrong button clicked

**Solution:**
1. Check browser console for JavaScript errors
2. Verify `js/editor.js` is loaded (check Network tab)
3. Try refreshing the page (Ctrl+F5 / Cmd+Shift+R)

### Issue 2: Prompts Don't Appear
**Symptom:** Console shows function called but no prompt appears

**Possible Causes:**
- Browser blocking prompts
- Pop-up blocker active
- `window.prompt` not available

**Solution:**
1. Check if browser allows prompts
2. Disable pop-up blocker for localhost
3. Try a different browser

### Issue 3: Prompts Cancelled
**Symptom:** Prompts appear but nothing is inserted

**Possible Causes:**
- User clicking Cancel
- Empty URL provided
- Prompt returning null

**Solution:**
1. Make sure to enter a URL (not just "https://")
2. Don't click Cancel - click OK
3. Check console for cancellation messages

### Issue 4: Content Not Inserted
**Symptom:** Prompts completed but content doesn't appear

**Possible Causes:**
- `replaceSelection()` not working
- Editor not focused
- Selection issue

**Solution:**
1. Click in the editor textarea first
2. Check console for "Inserting link/image" message
3. Manually check `editor.value` in console

## Testing with Standalone File

A standalone test file has been created: `test-link-image.html`

To use it:
1. Open `test-link-image.html` in your browser
2. Click the buttons
3. Watch the console log appear on the page
4. See the result update in real-time

This file has the exact same logic but with visual debugging.

## Keyboard Shortcuts

The buttons also have keyboard shortcuts:
- **Link:** Ctrl+K (Cmd+K on Mac)
- **Image:** No default shortcut

Try using Ctrl+K to insert a link and see if that works.

## Expected Behavior

### Link Insertion:
1. Click 🔗 button
2. Prompt 1: "Link URL (https://...)" → Enter URL
3. Prompt 2: "Link text (optional)" → Enter text or use default
4. Result: `[text](url)` inserted at cursor position
5. Cursor positioned after the closing `)`

### Image Insertion:
1. Click 🖼️ button
2. Prompt 1: "Image description (alt text)" → Enter description
3. Prompt 2: "Image URL (https://...)" → Enter URL
4. Result: `![description](url)` inserted at cursor position
5. Cursor positioned after the closing `)`

## Verification Checklist

- [ ] Browser console open (F12)
- [ ] No JavaScript errors in console
- [ ] Clicked in editor textarea first
- [ ] Clicked the correct button (🔗 or 🖼️)
- [ ] Console shows "Toolbar button clicked: link/image"
- [ ] Console shows "insertLink/insertImage function called"
- [ ] Prompt appeared
- [ ] Entered valid URL (not just "https://")
- [ ] Clicked OK (not Cancel)
- [ ] Console shows "Inserting link/image: ..."
- [ ] Content appears in editor

## Still Not Working?

If buttons still don't work after following all steps:

1. **Check browser compatibility:**
   - Try Chrome, Firefox, or Edge
   - Ensure JavaScript is enabled

2. **Check file loading:**
   - Open Network tab in DevTools
   - Verify `js/editor.js` loads successfully (200 status)
   - Check for any 404 errors

3. **Try the test file:**
   - Open `test-link-image.html`
   - This has the same logic with visual debugging

4. **Check for conflicts:**
   - Disable browser extensions
   - Try in incognito/private mode

5. **Verify the fix:**
   - Run `npm test` to ensure all tests pass
   - Check that `js/editor.js` has the latest changes

## Console Commands for Manual Testing

Open browser console and try these commands:

```javascript
// Check if functions exist
console.log(typeof insertLink);  // Should not be "undefined"
console.log(typeof insertImage); // Should not be "undefined"

// Check editor element
console.log(document.getElementById('editor'));

// Check toolbar
console.log(document.getElementById('formatting-toolbar'));

// Check buttons
console.log(document.querySelector('[data-format="link"]'));
console.log(document.querySelector('[data-format="image"]'));
```

Note: The functions are inside an IIFE (Immediately Invoked Function Expression), so they won't be directly accessible in the console. This is normal and expected.

## Success Indicators

When working correctly, you should see:

1. ✅ Console message when button clicked
2. ✅ Prompt dialog appears
3. ✅ Console message when inserting
4. ✅ Markdown syntax appears in editor
5. ✅ Preview updates with link/image
6. ✅ Cursor positioned correctly

---

**If you're still experiencing issues after following this guide, please provide:**
1. Browser name and version
2. Console error messages (if any)
3. Screenshot of what happens when you click the button
4. Whether the keyboard shortcut (Ctrl+K) works for links
