/*
 * Minimal DOM sanitizer inspired by DOMPurify.
 * Removes disallowed tags and attributes before injecting preview HTML.
 */
(function (global) {
    const ALLOWED_TAGS = new Set([
        'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'img', 'input', 'li', 'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'u'
    ]);

    const URI_ATTRS = new Set(['href', 'src']);
    const SAFE_PROTOCOL = /^(https?:|mailto:|data:image\/(png|gif|jpeg|webp);base64,|\/|#|\.\/|\.\.\/)/i;

    const sanitizeNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return;
        }

        if (node.nodeType === Node.COMMENT_NODE) {
            node.remove();
            return;
        }

        const tagName = node.nodeName.toLowerCase();
        if (!ALLOWED_TAGS.has(tagName)) {
            const fragment = document.createDocumentFragment();
            while (node.firstChild) {
                fragment.appendChild(node.firstChild);
            }
            node.replaceWith(fragment);
            return;
        }

        [...node.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();
            if (URI_ATTRS.has(name)) {
                if (!SAFE_PROTOCOL.test(attr.value.trim())) {
                    node.removeAttribute(attr.name);
                    return;
                }
            } else if (!['alt', 'title', 'loading', 'rel', 'target', 'class', 'type', 'checked', 'disabled'].includes(name)) {
                node.removeAttribute(attr.name);
                return;
            }
        });

        if (tagName === 'a') {
            node.setAttribute('rel', 'noopener noreferrer');
            node.setAttribute('target', '_blank');
        }

        node.childNodes.forEach(sanitizeNode);
    };

    const sanitize = (html) => {
        const template = document.createElement('template');
        template.innerHTML = html;
        template.content.childNodes.forEach(sanitizeNode);
        return template.innerHTML;
    };

    global.simpleSanitizer = { sanitize };
})(window);
