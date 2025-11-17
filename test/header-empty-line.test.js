const { JSDOM } = require('jsdom');

describe('Header formatting on trailing blank lines', () => {
    let originalWindow;
    let originalDocument;
    let originalNode;
    let originalNodeFilter;
    let currentDom;

    class FormattingHarness {
        constructor(editorElement, win) {
            this.editorElement = editorElement;
            this.window = win;
            this.document = win.document;
            this.cursorPosition = 0;
        }

        normalizeEditorHtml(html) {
            if (!html) {
                return '';
            }

            let content = html;

            content = content.replace(/^\s*<div[^>]*>/i, '');
            content = content.replace(/<div[^>]*>\s*(?:<br\s*\/?>\s*)<\/div>/gi, '\n');
            content = content.replace(/<div[^>]*>\s*<\/div>/gi, '\n');
            content = content.replace(/<div[^>]*>/gi, '\n');
            content = content.replace(/<\/div>/gi, '');
            content = content.replace(/<p[^>]*>/gi, '');
            content = content.replace(/<\/p>/gi, '\n\n');
            content = content.replace(/<br\s*\/?>/gi, '\n');

            content = content
                .replace(/&nbsp;/gi, ' ')
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .replace(/&amp;/gi, '&')
                .replace(/&quot;/gi, '"')
                .replace(/&#39;/gi, "'");

            content = content.replace(/<[^>]*>/g, '');

            return content;
        }

        getEditorContent() {
            if (!this.editorElement) {
                return '';
            }

            const content = this.normalizeEditorHtml(this.editorElement.innerHTML);
            if (!/[\S\u00A0]/.test(content)) {
                return '';
            }
            return content;
        }

        setEditorContent(content) {
            if (!this.editorElement) {
                return;
            }
            this.editorElement.innerHTML = content.replace(/\n/g, '<br>');
        }

        getNodeTextLength(node) {
            if (!node) {
                return 0;
            }

            if (node.nodeType === this.window.Node.TEXT_NODE) {
                return node.textContent.length;
            }

            if (node.nodeName === 'BR') {
                return 1;
            }

            let length = 0;

            if (node.childNodes && node.childNodes.length) {
                node.childNodes.forEach((child) => {
                    length += this.getNodeTextLength(child);
                });
            }

            if ((node.nodeName === 'DIV' || node.nodeName === 'P') && node !== this.editorElement) {
                const lastChild = node.childNodes[node.childNodes.length - 1];
                if (!lastChild || lastChild.nodeName !== 'BR') {
                    length += 1;
                }
            }

            return length;
        }

        getAccumulatedTextLengthUpToChild(container, offset) {
            if (!container || !container.childNodes) {
                return 0;
            }

            let length = 0;
            const limit = Math.min(offset, container.childNodes.length);
            for (let i = 0; i < limit; i++) {
                length += this.getNodeTextLength(container.childNodes[i]);
            }
            return length;
        }

        getCurrentCursorPositionInText() {
            const selection = this.window.getSelection();
            if (!selection.rangeCount) {
                return 0;
            }

            const range = selection.getRangeAt(0);

            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(this.editorElement);
            preCaretRange.setEnd(range.startContainer, range.startOffset);

            const tempDiv = this.document.createElement('div');
            const fragment = preCaretRange.cloneContents();
            if (fragment && fragment.childNodes && fragment.childNodes.length) {
                tempDiv.appendChild(fragment);
            }

            const textBeforeCursor = this.normalizeEditorHtml(tempDiv.innerHTML);

            if (!textBeforeCursor && range.startContainer) {
                if (range.startContainer === this.editorElement) {
                    return this.getAccumulatedTextLengthUpToChild(
                        this.editorElement,
                        range.startOffset
                    );
                }

                if (range.startContainer.nodeType === this.window.Node.ELEMENT_NODE) {
                    const offsetWithin = this.getAccumulatedTextLengthUpToChild(
                        range.startContainer,
                        range.startOffset
                    );
                    const parent = range.startContainer.parentNode;
                    if (parent) {
                        const index = Array.prototype.indexOf.call(
                            parent.childNodes,
                            range.startContainer
                        );
                        return this.getAccumulatedTextLengthUpToChild(parent, index) + offsetWithin;
                    }
                    return offsetWithin;
                }
            }

            return textBeforeCursor.length;
        }

        setCursorPositionInText(position) {
            if (!this.editorElement) {
                return;
            }

            const content = this.getEditorContent();
            if (position > content.length) {
                position = content.length;
            }
            if (position < 0) {
                position = 0;
            }

            const range = this.document.createRange();
            let remaining = position;
            let found = false;

            const traverse = (node) => {
                if (found || !node) {
                    return;
                }

                if (node.nodeType === this.window.Node.TEXT_NODE) {
                    const length = node.textContent.length;
                    if (remaining <= length) {
                        range.setStart(node, remaining);
                        range.collapse(true);
                        found = true;
                        return;
                    }
                    remaining -= length;
                    return;
                }

                if (node.nodeName === 'BR') {
                    if (remaining === 0) {
                        const parent = node.parentNode;
                        const index = Array.prototype.indexOf.call(parent.childNodes, node);
                        range.setStart(parent, index);
                        range.collapse(true);
                        found = true;
                        return;
                    }
                    remaining -= 1;
                    if (remaining === 0) {
                        const parent = node.parentNode;
                        const index = Array.prototype.indexOf.call(parent.childNodes, node) + 1;
                        range.setStart(parent, index);
                        range.collapse(true);
                        found = true;
                    }
                    return;
                }

                const children = Array.from(node.childNodes || []);
                for (const child of children) {
                    traverse(child);
                    if (found) {
                        return;
                    }
                }
            };

            traverse(this.editorElement);

            if (!found) {
                range.selectNodeContents(this.editorElement);
                range.collapse(false);
            }

            const selection = this.window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            this.cursorPosition = position;
        }

        applyFormatting(formatType) {
            if (!this.editorElement) {
                return;
            }

            const selection = this.window.getSelection();
            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            if (!range) {
                return;
            }

            const selectedText = range.toString();

            const formats = {
                h1: { prefix: '# ', suffix: '', placeholder: 'Header 1', lineStart: true },
                h2: { prefix: '## ', suffix: '', placeholder: 'Header 2', lineStart: true },
                h3: { prefix: '### ', suffix: '', placeholder: 'Header 3', lineStart: true }
            };

            const format = formats[formatType];
            if (!format) {
                return;
            }

            this.applyLineFormatting(format, selectedText);
        }

        applyLineFormatting(format, selectedText) {
            const selection = this.window.getSelection();
            if (!selection.rangeCount) {
                return;
            }

            const cursorPos = this.getCurrentCursorPositionInText();
            const editorContent = this.getEditorContent();
            const lines = editorContent.split('\n');

            let currentLine = 0;
            let charCount = 0;
            let cursorPosInLine = 0;

            for (let i = 0; i < lines.length; i++) {
                const lineLength = lines[i].length;
                if (cursorPos >= charCount && cursorPos <= charCount + lineLength) {
                    currentLine = i;
                    cursorPosInLine = cursorPos - charCount;
                    break;
                }
                charCount += lineLength + 1;
            }

            const currentLineContent = lines[currentLine] || '';
            const isAlreadyFormatted = currentLineContent.startsWith(format.prefix);

            let newCursorPosInLine = cursorPosInLine;

            const hasOtherHeaderFormatting =
                format.lineStart &&
                (currentLineContent.startsWith('# ') ||
                    currentLineContent.startsWith('## ') ||
                    currentLineContent.startsWith('### ')) &&
                !isAlreadyFormatted;

            if (isAlreadyFormatted) {
                lines[currentLine] = currentLineContent.substring(format.prefix.length);
                newCursorPosInLine = Math.max(0, cursorPosInLine - format.prefix.length);
            } else if (hasOtherHeaderFormatting) {
                const existingPrefix = currentLineContent.match(/^#{1,3} /)[0];
                const contentWithoutPrefix = currentLineContent.substring(existingPrefix.length);
                lines[currentLine] = format.prefix + contentWithoutPrefix;
                const prefixDifference = format.prefix.length - existingPrefix.length;
                newCursorPosInLine = cursorPosInLine + prefixDifference;
            } else {
                lines[currentLine] = format.prefix + currentLineContent;
                newCursorPosInLine = cursorPosInLine + format.prefix.length;
            }

            this.setEditorContent(lines.join('\n'));

            const newLineStart =
                lines.slice(0, currentLine).join('\n').length + (currentLine > 0 ? 1 : 0);
            const newCursorPos = newLineStart + newCursorPosInLine;
            this.setCursorPositionInText(newCursorPos);
        }
    }

    beforeEach(() => {
        originalWindow = global.window;
        originalDocument = global.document;
        originalNode = global.Node;
        originalNodeFilter = global.NodeFilter;

        currentDom = new JSDOM(
            '<!doctype html><html><body><div id="editor" contenteditable="true"></div></body></html>',
            {
                pretendToBeVisual: true
            }
        );

        global.window = currentDom.window;
        global.document = currentDom.window.document;
        global.Node = currentDom.window.Node;
        global.NodeFilter = currentDom.window.NodeFilter;
    });

    afterEach(() => {
        if (currentDom && currentDom.window && currentDom.window.close) {
            currentDom.window.close();
        }
        global.window = originalWindow;
        global.document = originalDocument;
        global.Node = originalNode;
        global.NodeFilter = originalNodeFilter;
        currentDom = undefined;
    });

    test('applies H2 formatting on trailing blank line without moving cursor to top', () => {
        const editorElement = document.getElementById('editor');
        const harness = new FormattingHarness(editorElement, window);

        editorElement.innerHTML =
            '<div># Hello world</div><div><br></div><div><br></div><div><br></div><div><br></div>';

        const selection = window.getSelection();
        selection.removeAllRanges();
        const range = document.createRange();
        const lastDiv = editorElement.lastChild;
        range.setStart(lastDiv, lastDiv.childNodes.length);
        range.collapse(true);
        selection.addRange(range);

        harness.applyFormatting('h2');

        const content = harness.getEditorContent();
        const lines = content.split('\n');
        expect(lines[0]).toBe('# Hello world');
        expect(lines[lines.length - 1]).toBe('## ');

        const cursorPosition = harness.getCurrentCursorPositionInText();
        expect(cursorPosition).toBe(content.length);

        const anchorNode = window.getSelection().anchorNode;
        expect(anchorNode && anchorNode.textContent.includes('##')).toBe(true);
    });
});
