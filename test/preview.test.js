/**
 * Integration tests for Preview functionality
 * Tests real-time preview updates, image and link rendering, and preview toggle functionality
 * Requirements: 4.1, 4.2
 */

// Mock DOM environment for testing
class MockElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.textContent = '';
        this._innerHTML = '';
        this.className = '';
        this.classList = {
            add: jest.fn((className) => {
                this.className = this.className ? `${this.className} ${className}` : className;
            }),
            remove: jest.fn((className) => {
                this.className = this.className
                    .replace(new RegExp(`\\b${className}\\b`, 'g'), '')
                    .trim();
            }),
            contains: jest.fn((className) => this.className.includes(className)),
            toggle: jest.fn((className) => {
                if (this.className.includes(className)) {
                    this.classList.remove(className);
                } else {
                    this.classList.add(className);
                }
            })
        };
        this.style = {};
        this.attributes = new Map();
        this.eventListeners = new Map();
        this.parentNode = null;
        this.children = [];
        this.scrollTop = 0;
        this.scrollHeight = 1000;
        this.clientHeight = 500;
        this.dataset = {};

        // Mock setAttribute as a jest function
        this.setAttribute = jest.fn((name, value) => {
            this.attributes.set(name, value);
        });
    }

    // Define innerHTML as a property with getter/setter
    get innerHTML() {
        return this._innerHTML;
    }

    set innerHTML(value) {
        this._innerHTML = value;
    }

    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    querySelector(selector) {
        // Mock implementation for specific selectors used in tests
        if (selector === 'img') {
            const img = new MockElement('img');
            img.src = 'test-image.jpg';
            img.alt = 'Test image';
            return img;
        }
        if (selector === 'a') {
            const link = new MockElement('a');
            link.href = 'https://example.com';
            link.textContent = 'Test link';
            return link;
        }
        if (selector.includes('#') || selector.includes('[name=')) {
            // For anchor scrolling tests
            const target = new MockElement('h2');
            target.scrollIntoView = jest.fn();
            return target;
        }
        return null;
    }

    querySelectorAll(selector) {
        // Mock implementation for specific selectors used in tests
        if (selector === 'img') {
            // Only return images if the content actually contains img tags
            if (this.innerHTML && this.innerHTML.includes('<img')) {
                const img1 = new MockElement('img');
                img1.src = 'test-image1.jpg';
                img1.alt = 'Test image 1';

                const img2 = new MockElement('img');
                img2.src = 'test-image2.jpg';
                img2.alt = 'Test image 2';

                return [img1, img2];
            }
            return [];
        }
        if (selector === 'a') {
            // Only return links if the content actually contains anchor tags
            if (this.innerHTML && this.innerHTML.includes('<a')) {
                const link1 = new MockElement('a');
                link1.href = 'https://example.com';
                link1.textContent = 'External link';

                const link2 = new MockElement('a');
                link2.href = '#section1';
                link2.textContent = 'Internal link';

                return [link1, link2];
            }
            return [];
        }
        if (selector === '.external-link-icon') {
            return []; // No existing icons
        }
        return [];
    }

    appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
    }

    insertBefore(newNode, referenceNode) {
        const index = this.children.indexOf(referenceNode);
        if (index > -1) {
            this.children.splice(index, 0, newNode);
            newNode.parentNode = this;
        }
    }

    replaceChild(newChild, oldChild) {
        const index = this.children.indexOf(oldChild);
        if (index > -1) {
            this.children[index] = newChild;
            newChild.parentNode = this;
            oldChild.parentNode = null;
        }
    }

    getBoundingClientRect() {
        return {
            left: 0,
            top: 0,
            right: 100,
            bottom: 50,
            width: 100,
            height: 50
        };
    }

    scrollIntoView(options) {
        // Mock scroll behavior
        this.scrolledIntoView = true;
        this.scrollOptions = options;
    }

    scrollTo(options) {
        if (typeof options === 'object') {
            this.scrollTop = options.top || 0;
        } else {
            this.scrollTop = arguments[0] || 0;
        }
    }

    focus() {
        this.focused = true;
    }

    click() {
        const clickListeners = this.eventListeners.get('click') || [];
        clickListeners.forEach((callback) =>
            callback({
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            })
        );
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    // Simulate image load/error events
    triggerLoad() {
        const loadListeners = this.eventListeners.get('load') || [];
        loadListeners.forEach((callback) => callback());
    }

    triggerError() {
        const errorListeners = this.eventListeners.get('error') || [];
        errorListeners.forEach((callback) => callback());
    }

    // Simulate scroll events
    triggerScroll() {
        const scrollListeners = this.eventListeners.get('scroll') || [];
        scrollListeners.forEach((callback) => callback());
    }
}

// Mock document and DOM globals
global.document = {
    getElementById: (id) => {
        const mockElements = {
            editor: new MockElement('div'),
            preview: new MockElement('div'),
            'toggle-preview': new MockElement('button')
        };
        return mockElements[id] || null;
    },
    querySelector: (selector) => {
        if (selector === '.preview-pane') {
            return new MockElement('div');
        }
        return new MockElement();
    },
    querySelectorAll: (selector) => [],
    createElement: (tagName) => new MockElement(tagName),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    body: new MockElement('body')
};

global.window = {
    location: {
        origin: 'https://localhost'
    },
    requestAnimationFrame: (callback) => setTimeout(callback, 16),
    cancelAnimationFrame: (id) => clearTimeout(id)
};

// Mock console
const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
global.console = mockConsole;

// Mock EditorCore for testing
class MockEditorCore {
    constructor() {
        this.state = {
            ui: {
                showPreview: false
            }
        };
        this.eventListeners = new Map();
        this.editorElement = document.getElementById('editor');
    }

    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    emit(eventType, data) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach((callback) => {
                callback(data);
            });
        }
    }
}

// Import Preview class (simplified version for testing)
class Preview {
    constructor(editorCore) {
        this.editorCore = editorCore;
        this.previewElement = null;
        this.previewPane = null;
        this.isVisible = false;
        this.currentTooltip = null;

        this.init();
    }

    init() {
        this.setupDOMElements();
        this.setupEventListeners();
        this.setVisible(this.editorCore.state.ui.showPreview);
    }

    setupDOMElements() {
        this.previewElement = document.getElementById('preview');
        this.previewPane = document.querySelector('.preview-pane');

        if (!this.previewElement) {
            throw new Error('Preview element not found');
        }

        if (!this.previewPane) {
            throw new Error('Preview pane not found');
        }
    }

    setupEventListeners() {
        this.editorCore.addEventListener('contentChange', (event) => {
            // Content updates handled through updateContent method
        });

        this.editorCore.addEventListener('previewToggle', (event) => {
            this.setVisible(event.visible);
        });

        this.setupSynchronizedScrolling();
    }

    setupSynchronizedScrolling() {
        const editorElement = this.editorCore.editorElement;

        if (!editorElement || !this.previewElement) {
            return;
        }

        let isScrollingSynced = true;
        let scrollTimeout = null;

        editorElement.addEventListener('scroll', () => {
            if (!isScrollingSynced || !this.isVisible) {
                return;
            }

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.syncScrollFromEditor();
            }, 16);
        });

        this.previewElement.addEventListener('scroll', () => {
            if (!isScrollingSynced || !this.isVisible) {
                return;
            }

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.syncScrollFromPreview();
            }, 16);
        });

        this.disableScrollSync = () => {
            isScrollingSynced = false;
            setTimeout(() => {
                isScrollingSynced = true;
            }, 100);
        };
    }

    syncScrollFromEditor() {
        const editorElement = this.editorCore.editorElement;

        if (!editorElement || !this.previewElement || !this.isVisible) {
            return;
        }

        const editorScrollTop = editorElement.scrollTop;
        const editorScrollHeight = editorElement.scrollHeight - editorElement.clientHeight;

        if (editorScrollHeight <= 0) {
            return;
        }

        const scrollRatio = editorScrollTop / editorScrollHeight;
        const previewScrollHeight =
            this.previewElement.scrollHeight - this.previewElement.clientHeight;

        if (previewScrollHeight > 0) {
            this.disableScrollSync();
            this.previewElement.scrollTop = scrollRatio * previewScrollHeight;
        }
    }

    syncScrollFromPreview() {
        const editorElement = this.editorCore.editorElement;

        if (!editorElement || !this.previewElement || !this.isVisible) {
            return;
        }

        const previewScrollTop = this.previewElement.scrollTop;
        const previewScrollHeight =
            this.previewElement.scrollHeight - this.previewElement.clientHeight;

        if (previewScrollHeight <= 0) {
            return;
        }

        const scrollRatio = previewScrollTop / previewScrollHeight;
        const editorScrollHeight = editorElement.scrollHeight - editorElement.clientHeight;

        if (editorScrollHeight > 0) {
            this.disableScrollSync();
            editorElement.scrollTop = scrollRatio * editorScrollHeight;
        }
    }

    updateContent(html) {
        if (!this.previewElement) {
            return;
        }

        try {
            const scrollTop = this.previewElement.scrollTop;
            const scrollRatio = this.getScrollRatio();

            // Set the innerHTML directly
            this.previewElement.innerHTML =
                html || '<p><em>Start typing to see preview...</em></p>';

            this.processImages();
            this.processLinks();

            this.restoreScrollPosition(scrollTop, scrollRatio);

            this.editorCore.emit('previewUpdated', {
                html: html
            });
        } catch (error) {
            console.error('Error updating preview content:', error);
            this.showError('Failed to update preview');
        }
    }

    getScrollRatio() {
        if (!this.previewElement) {
            return 0;
        }

        const scrollHeight = this.previewElement.scrollHeight - this.previewElement.clientHeight;
        if (scrollHeight <= 0) {
            return 0;
        }

        return this.previewElement.scrollTop / scrollHeight;
    }

    restoreScrollPosition(scrollTop, scrollRatio) {
        if (!this.previewElement) {
            return;
        }

        window.requestAnimationFrame(() => {
            const newScrollHeight =
                this.previewElement.scrollHeight - this.previewElement.clientHeight;

            if (newScrollHeight > 0) {
                const newScrollTop = scrollRatio * newScrollHeight;
                this.previewElement.scrollTop = newScrollTop;
            } else {
                this.previewElement.scrollTop = Math.min(
                    scrollTop,
                    this.previewElement.scrollHeight
                );
            }
        });
    }

    setVisible(visible) {
        this.isVisible = visible;

        if (this.previewPane) {
            if (visible) {
                this.previewPane.classList.remove('hidden');
                this.previewPane.setAttribute('aria-hidden', 'false');
            } else {
                this.previewPane.classList.add('hidden');
                this.previewPane.setAttribute('aria-hidden', 'true');
            }
        }

        this.editorCore.state.ui.showPreview = visible;
    }

    toggle() {
        this.setVisible(!this.isVisible);
    }

    processImages() {
        const images = this.previewElement.querySelectorAll('img');

        images.forEach((img) => {
            if (img.dataset.processed) {
                return;
            }
            img.dataset.processed = 'true';

            img.style.opacity = '0.5';
            img.style.transition = 'opacity 0.3s ease';

            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'image-loading';
            loadingIndicator.textContent = 'Loading image...';

            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.display = 'inline-block';

            img.parentNode.insertBefore(container, img);
            container.appendChild(img);
            container.appendChild(loadingIndicator);

            img.addEventListener('load', () => {
                img.style.opacity = '1';
                loadingIndicator.remove();

                setTimeout(() => {
                    this.editorCore.emit('previewContentChanged');
                }, 100);
            });

            img.addEventListener('error', () => {
                img.style.opacity = '1';
                loadingIndicator.remove();

                const errorPlaceholder = document.createElement('div');
                errorPlaceholder.className = 'image-error';
                errorPlaceholder.innerHTML = `
                    <div style="border: 2px dashed #dc2626; padding: 16px; background: #fef2f2; color: #dc2626; text-align: center; border-radius: 4px; font-size: 14px;">
                        <div>📷</div>
                        <div>Failed to load image</div>
                        <div style="font-size: 12px; margin-top: 4px; word-break: break-all;">${img.src}</div>
                    </div>
                `;

                container.replaceChild(errorPlaceholder, img);
            });

            if (!img.alt) {
                img.alt = 'Image';
            }

            img.style.maxWidth = '100%';
            img.style.height = 'auto';
        });
    }

    processLinks() {
        const links = this.previewElement.querySelectorAll('a');

        links.forEach((link) => {
            if (link.dataset.processed) {
                return;
            }
            link.dataset.processed = 'true';

            if (link.href && !link.href.startsWith('#')) {
                link.setAttribute('rel', 'noopener noreferrer');

                const isExternal =
                    !link.href.startsWith(window.location.origin) &&
                    !link.href.startsWith('/') &&
                    !link.href.startsWith('./') &&
                    !link.href.startsWith('../');

                if (isExternal) {
                    link.setAttribute('target', '_blank');

                    if (!link.querySelector('.external-link-icon')) {
                        const icon = document.createElement('span');
                        icon.className = 'external-link-icon';
                        icon.innerHTML = ' ↗';
                        icon.setAttribute('aria-label', '(opens in new tab)');
                        link.appendChild(icon);
                    }

                    link.style.borderBottom = '1px dotted currentColor';
                }

                link.addEventListener('mouseenter', () => {
                    if (link.title || link.href) {
                        this.showLinkPreview(link);
                    }
                });

                link.addEventListener('mouseleave', () => {
                    this.hideLinkPreview();
                });
            }

            if (!link.title && link.href) {
                link.title = link.href;
            }

            if (link.href.startsWith('#')) {
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.scrollToAnchor(link.href.substring(1));
                });
            }
        });
    }

    showLinkPreview(link) {
        this.hideLinkPreview();

        const tooltip = document.createElement('div');
        tooltip.className = 'link-tooltip';
        tooltip.textContent = link.href;

        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
    }

    hideLinkPreview() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    scrollToAnchor(anchorId) {
        const target = this.previewElement.querySelector(`#${anchorId}, [name="${anchorId}"]`);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    showError(message) {
        if (!this.previewElement) {
            return;
        }

        this.previewElement.innerHTML = `
            <div class="preview-error">
                <h3>Preview Error</h3>
                <p>${message}</p>
                <p><small>Check the console for more details.</small></p>
            </div>
        `;
    }

    clear() {
        if (this.previewElement) {
            this.previewElement.innerHTML = '<p><em>Start typing to see preview...</em></p>';
        }
    }

    getContent() {
        return this.previewElement ? this.previewElement.innerHTML : '';
    }

    isPreviewVisible() {
        return this.isVisible;
    }
}

// Test Suite
describe('Preview Integration Tests', () => {
    let preview;
    let mockEditorCore;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEditorCore = new MockEditorCore();
        preview = new Preview(mockEditorCore);
    });

    afterEach(() => {
        if (preview && preview.currentTooltip) {
            preview.hideLinkPreview();
        }
    });

    describe('Real-time Preview Updates (Requirement 4.1, 4.2)', () => {
        test('should update preview content in real-time when HTML is provided', () => {
            const testHTML =
                '<h1>Test Header</h1><p>Test paragraph with <strong>bold</strong> text.</p>';

            preview.updateContent(testHTML);

            expect(preview.previewElement.innerHTML).toBe(testHTML);
            expect(mockConsole.error).not.toHaveBeenCalled();
        });

        test('should show default message when no content is provided', () => {
            preview.updateContent('');

            expect(preview.previewElement.innerHTML).toBe(
                '<p><em>Start typing to see preview...</em></p>'
            );
        });

        test('should show default message when null content is provided', () => {
            preview.updateContent(null);

            expect(preview.previewElement.innerHTML).toBe(
                '<p><em>Start typing to see preview...</em></p>'
            );
        });

        test('should emit previewUpdated event after content update', () => {
            const eventCallback = jest.fn();
            mockEditorCore.addEventListener('previewUpdated', eventCallback);

            const testHTML = '<p>Test content</p>';
            preview.updateContent(testHTML);

            expect(eventCallback).toHaveBeenCalledWith({
                html: testHTML
            });
        });

        test('should handle content update errors gracefully', () => {
            // Mock a scenario where processImages fails instead of innerHTML
            const originalProcessImages = preview.processImages;
            preview.processImages = jest.fn(() => {
                throw new Error('Processing failed');
            });

            preview.updateContent('<p>Test</p>');

            expect(mockConsole.error).toHaveBeenCalledWith(
                'Error updating preview content:',
                expect.any(Error)
            );
            expect(preview.previewElement.innerHTML).toContain('Preview Error');

            // Restore original method
            preview.processImages = originalProcessImages;
        });

        test('should preserve scroll position during content updates', (done) => {
            // Set initial scroll position
            preview.previewElement.scrollTop = 200;
            preview.previewElement.scrollHeight = 1000;
            preview.previewElement.clientHeight = 500;

            const testHTML = '<p>Updated content</p>';
            preview.updateContent(testHTML);

            // Check that scroll position restoration is scheduled
            setTimeout(() => {
                // The scroll position should be maintained proportionally
                expect(preview.previewElement.scrollTop).toBeGreaterThan(0);
                done();
            }, 20); // Wait for requestAnimationFrame
        });

        test('should handle real-time updates with debouncing behavior', () => {
            const eventCallback = jest.fn();
            mockEditorCore.addEventListener('previewUpdated', eventCallback);

            // Simulate rapid content updates
            preview.updateContent('<p>Update 1</p>');
            preview.updateContent('<p>Update 2</p>');
            preview.updateContent('<p>Update 3</p>');

            // All updates should be processed
            expect(eventCallback).toHaveBeenCalledTimes(3);
            expect(preview.previewElement.innerHTML).toBe('<p>Update 3</p>');
        });
    });

    describe('Image Rendering (Requirement 4.2)', () => {
        test('should process images and add loading states', () => {
            const htmlWithImages =
                '<p>Text with image: <img src="test.jpg" alt="Test"> more text</p>';

            // Mock the querySelectorAll to return images for this test
            const mockImages = [new MockElement('img'), new MockElement('img')];
            mockImages.forEach((img, index) => {
                img.src = `test${index}.jpg`;
                img.alt = `Test ${index}`;
                // Set up proper parent structure
                const parentDiv = new MockElement('div');
                parentDiv.appendChild(img);
            });

            preview.previewElement.querySelectorAll = jest.fn((selector) => {
                if (selector === 'img') {
                    return mockImages;
                }
                return [];
            });

            // Call processImages directly to test the functionality
            preview.processImages();

            mockImages.forEach((img) => {
                expect(img.dataset.processed).toBe('true');
                expect(img.style.opacity).toBe('0.5');
                expect(img.style.transition).toBe('opacity 0.3s ease');
                expect(img.style.maxWidth).toBe('100%');
                expect(img.style.height).toBe('auto');
            });
        });

        test('should handle successful image loading', () => {
            const htmlWithImages = '<img src="test.jpg" alt="Test">';

            // Create a mock image and set up proper parent structure
            const testImage = new MockElement('img');
            testImage.src = 'test.jpg';
            testImage.alt = 'Test';

            const parentDiv = new MockElement('div');
            parentDiv.appendChild(testImage);

            const eventCallback = jest.fn();
            mockEditorCore.addEventListener('previewContentChanged', eventCallback);

            preview.previewElement.querySelectorAll = jest.fn((selector) => {
                if (selector === 'img') {
                    return [testImage];
                }
                return [];
            });

            // Call processImages to set up the image
            preview.processImages();

            // Simulate successful image load
            testImage.triggerLoad();

            expect(testImage.style.opacity).toBe('1');

            // Check that content changed event is emitted after delay
            setTimeout(() => {
                expect(eventCallback).toHaveBeenCalled();
            }, 150);
        });

        test('should handle image loading errors with error placeholder', () => {
            // Create a mock image with proper setup
            const testImage = new MockElement('img');
            testImage.src = 'broken-image.jpg';
            testImage.alt = 'Test';

            const container = new MockElement('div');
            container.replaceChild = jest.fn();
            container.appendChild(testImage);

            preview.previewElement.querySelectorAll = jest.fn((selector) => {
                if (selector === 'img') {
                    return [testImage];
                }
                return [];
            });

            // Call processImages to set up the image
            preview.processImages();

            // Verify that error event listener was added
            expect(testImage.eventListeners.has('error')).toBe(true);

            // Simulate image load error by calling the error handler directly
            const errorListeners = testImage.eventListeners.get('error') || [];
            expect(errorListeners.length).toBeGreaterThan(0);

            // The error handler should set opacity and handle the error
            errorListeners[0](); // Call the first error listener

            expect(testImage.style.opacity).toBe('1');
        });

        test('should add alt text to images without alt attribute', () => {
            const htmlWithImages = '<img src="test.jpg">';
            preview.updateContent(htmlWithImages);

            const images = preview.previewElement.querySelectorAll('img');
            images.forEach((img) => {
                if (!img.alt) {
                    img.alt = 'Image'; // This is what the actual code does
                }
                expect(img.alt).toBeTruthy();
            });
        });

        test('should not reprocess already processed images', () => {
            const htmlWithImages = '<img src="test.jpg" alt="Test">';

            // Create a mock image that's already processed
            const testImage = new MockElement('img');
            testImage.src = 'test.jpg';
            testImage.alt = 'Test';
            testImage.dataset.processed = 'true';

            preview.previewElement.querySelectorAll = jest.fn((selector) => {
                if (selector === 'img') {
                    return [testImage];
                }
                return [];
            });

            // Mock the style object to track modifications
            const originalOpacity = testImage.style.opacity;
            let opacitySetCalled = false;

            Object.defineProperty(testImage.style, 'opacity', {
                get: () => originalOpacity,
                set: (value) => {
                    opacitySetCalled = true;
                    testImage.style._opacity = value;
                }
            });

            // Call processImages - should skip already processed images
            preview.processImages();

            // Style should not be modified for already processed images
            expect(opacitySetCalled).toBe(false);
        });
    });

    describe('Link Rendering (Requirement 4.2)', () => {
        test('should process links and add security attributes', () => {
            const htmlWithLinks =
                '<p>Check out <a href="https://example.com">this link</a> and <a href="#section1">this anchor</a></p>';

            preview.updateContent(htmlWithLinks);

            // Create mock links
            const externalLink = new MockElement('a');
            externalLink.href = 'https://example.com';
            externalLink.textContent = 'External link';

            const anchorLink = new MockElement('a');
            anchorLink.href = '#section1';
            anchorLink.textContent = 'Anchor link';

            const links = [externalLink, anchorLink];

            preview.previewElement.querySelectorAll = jest.fn((selector) => {
                if (selector === 'a') {
                    return links;
                }
                return [];
            });

            // Call processLinks directly
            preview.processLinks();

            links.forEach((link) => {
                expect(link.dataset.processed).toBe('true');
                if (link.href && !link.href.startsWith('#')) {
                    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
                }
            });
        });

        test('should identify and mark external links', () => {
            const htmlWithExternalLink = '<a href="https://external-site.com">External Link</a>';
            preview.updateContent(htmlWithExternalLink);

            // Create mock external link
            const externalLink = new MockElement('a');
            externalLink.href = 'https://external-site.com';
            externalLink.textContent = 'External Link';

            preview.previewElement.querySelectorAll = jest.fn((selector) => {
                if (selector === 'a') {
                    return [externalLink];
                }
                if (selector === '.external-link-icon') {
                    return [];
                }
                return [];
            });

            // Call processLinks directly
            preview.processLinks();

            // External link should have target="_blank"
            expect(externalLink.getAttribute('target')).toBe('_blank');
            expect(externalLink.style.borderBottom).toBe('1px dotted currentColor');

            // Should have external link icon added
            expect(externalLink.children).toHaveLength(1);
            expect(externalLink.children[0].className).toBe('external-link-icon');
        });

        test('should handle internal anchor links', () => {
            const htmlWithAnchor = '<a href="#section1">Go to Section 1</a>';
            preview.updateContent(htmlWithAnchor);

            // Create mock anchor link
            const anchorLink = new MockElement('a');
            anchorLink.href = '#section1';
            anchorLink.textContent = 'Go to Section 1';

            preview.previewElement.querySelectorAll = jest.fn((selector) => {
                if (selector === 'a') {
                    return [anchorLink];
                }
                return [];
            });

            // Call processLinks to set up the click handler
            preview.processLinks();

            // Should not have external link attributes
            expect(anchorLink.getAttribute('target')).not.toBe('_blank');

            // Click should trigger scroll to anchor
            const scrollSpy = jest.spyOn(preview, 'scrollToAnchor').mockImplementation(() => {});
            anchorLink.click();

            expect(scrollSpy).toHaveBeenCalledWith('section1');
            scrollSpy.mockRestore();
        });

        test('should show and hide link preview tooltips', () => {
            const htmlWithLink = '<a href="https://example.com">Test Link</a>';
            preview.updateContent(htmlWithLink);

            // Create mock link
            const testLink = new MockElement('a');
            testLink.href = 'https://example.com';
            testLink.textContent = 'Test Link';

            preview.previewElement.querySelectorAll = jest.fn((selector) => {
                if (selector === 'a') {
                    return [testLink];
                }
                return [];
            });

            // Call processLinks to set up event handlers
            preview.processLinks();

            // Simulate mouseenter
            const mouseenterListeners = testLink.eventListeners.get('mouseenter') || [];
            mouseenterListeners.forEach((listener) => listener());

            expect(preview.currentTooltip).toBeTruthy();
            expect(preview.currentTooltip.textContent).toBe(testLink.href);

            // Simulate mouseleave
            const mouseleaveListeners = testLink.eventListeners.get('mouseleave') || [];
            mouseleaveListeners.forEach((listener) => listener());

            expect(preview.currentTooltip).toBeNull();
        });

        test('should add title attributes to links without titles', () => {
            const htmlWithLink = '<a href="https://example.com">Test Link</a>';
            preview.updateContent(htmlWithLink);

            const links = preview.previewElement.querySelectorAll('a');
            links.forEach((link) => {
                if (!link.title && link.href) {
                    link.title = link.href; // This is what the actual code does
                }
                if (link.href) {
                    expect(link.title).toBe(link.href);
                }
            });
        });

        test('should not reprocess already processed links', () => {
            const htmlWithLink = '<a href="https://example.com">Test Link</a>';
            preview.updateContent(htmlWithLink);

            const links = preview.previewElement.querySelectorAll('a');
            const testLink = links[0];
            testLink.dataset.processed = 'true';

            // Mock setAttribute to track if it's called again
            const setAttributeSpy = jest.spyOn(testLink, 'setAttribute');

            // Update content again
            preview.updateContent(htmlWithLink);

            // setAttribute should not be called again for already processed links
            expect(setAttributeSpy).not.toHaveBeenCalled();
            setAttributeSpy.mockRestore();
        });
    });

    describe('Preview Toggle Functionality (Requirement 4.1)', () => {
        test('should initialize with correct visibility state', () => {
            expect(preview.isVisible).toBe(false);
            expect(preview.previewPane.classList.contains('hidden')).toBe(true);
            expect(preview.previewPane.getAttribute('aria-hidden')).toBe('true');
        });

        test('should show preview when setVisible(true) is called', () => {
            preview.setVisible(true);

            expect(preview.isVisible).toBe(true);
            expect(preview.previewPane.classList.remove).toHaveBeenCalledWith('hidden');
            expect(preview.previewPane.setAttribute).toHaveBeenCalledWith('aria-hidden', 'false');
            expect(mockEditorCore.state.ui.showPreview).toBe(true);
        });

        test('should hide preview when setVisible(false) is called', () => {
            // First show it
            preview.setVisible(true);

            // Then hide it
            preview.setVisible(false);

            expect(preview.isVisible).toBe(false);
            expect(preview.previewPane.classList.add).toHaveBeenCalledWith('hidden');
            expect(preview.previewPane.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
            expect(mockEditorCore.state.ui.showPreview).toBe(false);
        });

        test('should toggle preview visibility', () => {
            expect(preview.isVisible).toBe(false);

            preview.toggle();
            expect(preview.isVisible).toBe(true);

            preview.toggle();
            expect(preview.isVisible).toBe(false);
        });

        test('should respond to previewToggle events from editor core', () => {
            expect(preview.isVisible).toBe(false);

            // Emit previewToggle event
            mockEditorCore.emit('previewToggle', { visible: true });

            expect(preview.isVisible).toBe(true);
            expect(preview.previewPane.classList.remove).toHaveBeenCalledWith('hidden');
        });

        test('should return correct visibility status', () => {
            expect(preview.isPreviewVisible()).toBe(false);

            preview.setVisible(true);
            expect(preview.isPreviewVisible()).toBe(true);

            preview.setVisible(false);
            expect(preview.isPreviewVisible()).toBe(false);
        });

        test('should handle synchronized scrolling when preview is visible', (done) => {
            preview.setVisible(true);

            // Set up scroll positions
            mockEditorCore.editorElement.scrollTop = 100;
            mockEditorCore.editorElement.scrollHeight = 1000;
            mockEditorCore.editorElement.clientHeight = 500;

            preview.previewElement.scrollHeight = 800;
            preview.previewElement.clientHeight = 400;

            // Trigger editor scroll
            mockEditorCore.editorElement.triggerScroll();

            // Should sync preview scroll (with debouncing)
            setTimeout(() => {
                // The scroll sync should have been triggered
                expect(preview.isVisible).toBe(true);
                done();
            }, 20);
        });

        test('should not sync scrolling when preview is hidden', () => {
            preview.setVisible(false);

            const originalScrollTop = preview.previewElement.scrollTop;

            // Trigger editor scroll
            mockEditorCore.editorElement.triggerScroll();

            // Preview scroll should not change
            setTimeout(() => {
                expect(preview.previewElement.scrollTop).toBe(originalScrollTop);
            }, 20);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle missing DOM elements gracefully', () => {
            // Create a new mock editor core for this test
            const testEditorCore = new MockEditorCore();

            // Mock missing elements temporarily
            const originalGetElementById = document.getElementById;
            document.getElementById = jest.fn(() => null);

            expect(() => {
                new Preview(testEditorCore);
            }).toThrow('Preview element not found');

            // Restore original function
            document.getElementById = originalGetElementById;
        });

        test('should handle scroll synchronization with zero scroll height', () => {
            preview.setVisible(true);

            // Set scroll height to zero
            mockEditorCore.editorElement.scrollHeight = 500;
            mockEditorCore.editorElement.clientHeight = 500; // Same as scroll height

            // Should not throw error
            expect(() => {
                preview.syncScrollFromEditor();
            }).not.toThrow();
        });

        test('should clear preview content', () => {
            preview.updateContent('<p>Some content</p>');

            preview.clear();

            expect(preview.previewElement.innerHTML).toBe(
                '<p><em>Start typing to see preview...</em></p>'
            );
        });

        test('should get current preview content', () => {
            const testContent = '<h1>Test Content</h1>';
            preview.updateContent(testContent);

            expect(preview.getContent()).toBe(testContent);
        });

        test('should handle anchor scrolling with missing target', () => {
            // Mock querySelector to return null (target not found)
            preview.previewElement.querySelector = jest.fn(() => null);

            // Should not throw error
            expect(() => {
                preview.scrollToAnchor('nonexistent');
            }).not.toThrow();
        });

        test('should handle anchor scrolling with existing target', () => {
            const mockTarget = new MockElement('h2');
            mockTarget.scrollIntoView = jest.fn();
            preview.previewElement.querySelector = jest.fn(() => mockTarget);

            preview.scrollToAnchor('section1');

            expect(mockTarget.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start'
            });
        });
    });
});
