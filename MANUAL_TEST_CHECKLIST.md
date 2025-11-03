# Manual Test Checklist - Scroll Lock Verification

## Quick Test Instructions

Open `index.html` in your browser and follow these tests:

---

## ✅ Test 1: Strikethrough Button

**Steps:**
1. Open editor
2. Type several paragraphs (or paste lorem ipsum)
3. Scroll to middle of content
4. Highlight a word
5. Click **strikethrough button** (~~S~~) in toolbar

**Expected Results:**
- ✅ Document stays at same scroll position
- ✅ Text shows `~~strikethrough~~` formatting
- ✅ No jumping or shifting

---

## ✅ Test 2: Bold (Ctrl+B)

**Steps:**
1. Scroll down in editor
2. Select text "make this bold"
3. Press **Ctrl+B** (Windows/Linux) or **Cmd+B** (Mac)

**Expected Results:**
- ✅ No scroll movement
- ✅ Text changes to `**make this bold**`
- ✅ Cursor stays in same visual position

---

## ✅ Test 3: Italic (Ctrl+I)

**Steps:**
1. Scroll to bottom of document
2. Select word "italic"
3. Press **Ctrl+I** (Windows/Linux) or **Cmd+I** (Mac)

**Expected Results:**
- ✅ Scroll position maintained
- ✅ Text changes to `*italic*`
- ✅ No document shift

---

## ✅ Test 4: Inline Code (Ctrl+`)

**Steps:**
1. Scroll to middle
2. Select text "console.log()"
3. Press **Ctrl+`** (Windows/Linux) or **Cmd+`** (Mac)

**Expected Results:**
- ✅ Document doesn't move
- ✅ Text changes to `` `console.log()` ``
- ✅ Smooth operation

---

## ✅ Test 5: Bold Without Selection

**Steps:**
1. Scroll to any position
2. Click in editor (no selection, just cursor)
3. Click **Bold button** (B) in toolbar

**Expected Results:**
- ✅ No scroll
- ✅ `**bold text**` inserted
- ✅ "bold text" is selected

---

## ✅ Test 6: Link Insertion (Ctrl+K)

**Steps:**
1. Scroll down
2. Select text "click here"
3. Press **Ctrl+K** (Windows/Linux) or **Cmd+K** (Mac)
4. Enter URL: `https://example.com`
5. Click OK

**Expected Results:**
- ✅ No scroll after dialog closes
- ✅ Text changes to `[click here](https://example.com)`
- ✅ Document stays at same position

---

## ✅ Test 7: Rapid Formatting

**Steps:**
1. Scroll to middle
2. Select text
3. Quickly press: Ctrl+B, then Ctrl+I, then Ctrl+`

**Expected Results:**
- ✅ No scroll during rapid operations
- ✅ All formatting applied correctly
- ✅ Text shows: `` `***text***` ``

---

## ✅ Test 8: Headings (Already Fixed)

**Steps:**
1. Scroll down
2. Select line of text
3. Press **Ctrl+1** for H1

**Expected Results:**
- ✅ No scroll
- ✅ Text prefixed with `# `

---

## ✅ Test 9: Lists (Already Fixed)

**Steps:**
1. Scroll to middle
2. Select multiple lines
3. Press **Ctrl+Shift+8** for bullet list

**Expected Results:**
- ✅ No scroll
- ✅ Lines prefixed with `- `

---

## Browser Testing

Test in multiple browsers:

- [ ] **Chrome** (latest)
- [ ] **Firefox** (latest)
- [ ] **Safari** (if on Mac)
- [ ] **Edge** (latest)

All should behave identically with no scroll jumping.

---

## If You See Issues

If scroll still jumps:

1. **Open browser console** (F12)
2. Check for JavaScript errors
3. Try **hard refresh**: Ctrl+Shift+R (or Cmd+Shift+R)
4. Report which browser and which specific operation fails

---

## Success Criteria

**ALL formatting operations should:**
- ✅ Keep document at same scroll position
- ✅ Apply formatting correctly
- ✅ Feel smooth and professional
- ✅ No visual jumping or shifting

---

## Quick Verification

**Fastest test:**
1. Type lots of text
2. Scroll to middle
3. Select word
4. Click strikethrough
5. **Document should NOT move at all**

If this works, everything else should work too! 🎉

