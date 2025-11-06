# Recommended Improvements for WYSIWYG Markdown Editor

## Observations from Testing

- **Formatting behavior**: Some formatting buttons (bold, italic, inline code) insert Markdown symbols in unexpected places when no text is selected, causing duplication or misplaced text (e.g., `Bold **bold text**text` or `Italic* *text`).
- **Link insertion**: The insert-link dialog incorrectly inserted links inside code blocks and concatenated the link text with selected content.
- **Code blocks**: The code-block button inserted triple backticks in the wrong locations, splitting existing content.
- **Inline code**: The inline-code button duplicated selected text and only partially wrapped it with backticks.
- **Task lists**: The task-list button inserts only unchecked boxes (`[ ]`) with no way to mark items as complete (`[x]`).
- **Formatting selection**: Buttons require manual text selection; clicking a button without selection has inconsistent results.
- **Undo/redo**: There are no visible undo or redo buttons — users must rely on shortcuts, which may not be obvious.
- **Interactive preview**: Tasks in preview cannot be toggled; checkboxes are static.
- **Headings**: Heading buttons work, but headings show only as raw Markdown rather than styled text, reducing the “what-you-see” aspect.
- **Link dialog UX**: Both link text and URL must be entered manually; selected text is not auto-filled into the link text field.
- **Dark mode and accessibility**: Dark mode exists but has no accessibility settings like font size, high contrast, or keyboard navigation.
- **Image and table buttons**: The image button does not open any file dialog; the table button does not function.
- **Save/export**: Prompts about unsaved changes appear, but saving and exporting are limited or unavailable.

---

## Recommended Improvements

### 1. Improve Formatting Behavior

Ensure all formatting buttons wrap selected text correctly and handle cases with no selection gracefully by inserting placeholders or wrapping the current word.

### 2. Task List Enhancements

Enable toggling between unchecked (`[ ]`) and checked (`[x]`) states via toolbar or by clicking in preview. Add keyboard shortcuts for task completion.

### 3. Link Insertion UX

Auto-fill the “Link text” field with selected text. Ensure the link is inserted at the correct cursor position, not within code blocks. Validate URLs and offer quick protocol suggestions (e.g., `https://`).

### 4. Code Block Handling

When inserting code blocks, place triple backticks on separate lines surrounding the selection or placeholder. Optionally allow users to choose a language for syntax highlighting.

### 5. Inline Code Handling

Wrap selected text with backticks (`\``) without duplicating it. Ensure consistent wrapping even when no text is selected.

### 6. Undo/Redo Buttons

Add visible undo and redo buttons (e.g., circular arrows) alongside keyboard shortcuts for more intuitive error recovery.

### 7. True WYSIWYG Editing

Provide a “visual editing” mode where text styles are rendered (bold appears bold, headings are sized) instead of plain Markdown symbols, while retaining raw Markdown mode for advanced users.

### 8. List and Task Shortcuts

Enhance toolbar icons for bullet, numbered, and task lists. Support Tab/Shift+Tab for indenting/outdenting nested list items.

### 9. Image and Table Insertion

Implement dialogs for adding images (upload or URL) and inserting tables (with size and caption options). Ensure they insert valid Markdown syntax cleanly.

### 10. Accessibility Features

Add controls for font size, high-contrast themes, and keyboard navigation. Provide ARIA labels and proper focus outlines for screen readers.

### 11. Link Preview and Editing

Enable link tooltips in preview mode and allow users to edit or remove links easily without manually editing Markdown.

### 12. Footnote Management

Add automatic numbering and referencing for footnotes. Ensure inserting footnotes doesn’t disturb other content.

---

### Summary

Addressing these improvements will significantly enhance **usability**, **accessibility**, and **true WYSIWYG behavior**, making the Markdown editor far more robust and user-friendly for technical and non-technical audiences alike.
