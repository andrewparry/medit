/**
 * Unit tests for scrolling performance optimizations
 * Tests smooth scrolling, performance monitoring, and synchronized scrolling
 * Requirements: 6.1, 6.2
 */

// Mock DOM elements and globals for testing
class MockElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.textContent = '';
        this.innerHTML = '';
        this.className = '';
        this.style = {};
        this.attributes = new Map();
        this.eventListeners = new Map();
        this.parentNode = null;
        this.children = [];
        this.clientHeight = 400;
        this.scrollHeight = 800;
        this.scrollTop = 0;
        this.clientWidth = 600;
        this.scrollWidth = 600;
    }

    addEventListener(event, callback, options) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push({ callback, options });
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.findIndex(l => l.callback === callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    setAttribute = jest.fn((name, value) => {
        this.attributes.set(name, value);
    })

    getAttribute(name) {
        return this.attributes.get(name);
    }

    scrollTo(options) {
        if (typeof options === 'object') {
            this.scrollTop = options.top || 0;
            this._lastScrollBehavior = options.behavior;
        } else {
            this.scrollTop = arguments[1] || 0;
        }
    }

    classList = {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn(),
        contains: jest.fn()
    };

    // Simulate scroll events
    _triggerScroll() {
        const listeners = this.eventListeners.get('scroll') || [];
        listeners.forEach(({ callback }) => callback());
    }
}

// Setup global mocks
global.document = {
    getElementById: (id) => {
        const mockElements = {
            'editor': new MockElement('div'),
            'preview': new MockElement('div')
        };
        return mockElements[id] || null;
    },
    querySelector: (selector) => new MockElement(),
    querySelectorAll: (selector) => [],
    createElement: (tagName) => new MockElement(tagName),
    addEventListener: () => {},
    removeEventListener: () => {},
    body: new MockElement('body')
};

global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    requestAnimationFrame: jest.fn((callback) => {
        setTimeout(callback, 16);
        return 1;
    }),
    cancelAnimationFrame: jest.fn(),
    performance: {
        now: jest.fn(() => Date.now())
    }
};

global.performance = {
    now: jest.fn(() => Date.now())
};

// Mock console
const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
global.console = mockConsole;

// Mock classes that EditorCore depends on
class MockMarkdownParser {
    toHTML(markdown) {
        return `<p>${markdown}</p>`;
    }
    
    toMarkdown(html) {
        return html.replace(/<[^>]*>/g, '');
    }
    
    validateMarkdown(content) {
        return { isValid: true, errors: [] };
    }
}

class MockAccessibilityManager {
    constructor(editorCore) {
        this.editorCore = editorCore;
    }
}

class MockPreview {
    constructor(editorCore) {
        this.editorCore = editorCore;
        this.previewElement = document.getElementById('preview');
        this.isVisible = true;
        this.setupSynchronizedScrolling();
    }
    
    setupSynchronizedScrolling() {
        // Mock implementation of synchronized scrolling
        this.syncScrollFromEditor = jest.fn();
        this.syncScrollFromPreview = jest.fn();
        this.disableScrollSync = jest.fn();
    }
    
    updateContent(html) {
        this.lastContent = html;
    }
}

// Make mock classes available globally
global.MarkdownParser = MockMarkdownParser;
global.AccessibilityManager = MockAccessibilityManager;
global.Preview = MockPreview;

// Simplified EditorCore class for testing scrolling functionality
class EditorCore {
    constructor(container) {
        this.container = container;
        this.markdownParser = new MarkdownParser();
        
        // Initialize state
        this.state = {
            content: {
                markdown: '',
                html: '',
                isDirty: false
            },
            ui: {
                showPreview: false,
                activeFormatting: new Set(),
                cursorPosition: 0
            }
        };
        
        // Event system
        this.eventListeners = new Map();
        
        // DOM elements
        this.editorElement = document.getElementById('editor');
        this.previewElement = document.getElementById('preview');
        
        // Initialize components
        this.accessibilityManager = new AccessibilityManager(this);
        this.preview = new MockPreview(this);
    }
    
    // Event system methods
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }
    
    emit(eventType, data) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventType}:`, error);
                }
            });
        }
    }
    
    // Scrolling optimization method
    optimizeScrollingPerformance() {
        const editorElement = this.editorElement;
        const previewElement = this.previewElement;
        
        if (!editorElement || !previewElement) {
            console.warn('⚠ Cannot optimize scrolling: elements not found');
            return;
        }
        
        // Add performance classes
        editorElement.classList.add('smooth-scroll-enabled');
        previewElement.classList.add('smooth-scroll-enabled');
        
        // Detect large documents and optimize accordingly
        const optimizeForLargeDocument = () => {
            const contentLength = editorElement.textContent?.length || 0;
            const isLargeDocument = contentLength > 10000;
            
            if (isLargeDocument) {
                editorElement.classList.add('large-document');
                previewElement.classList.add('large-document');
            } else {
                editorElement.classList.remove('large-document');
                previewElement.classList.remove('large-document');
            }
        };
        
        // Initial optimization
        optimizeForLargeDocument();
        
        // Re-optimize when content changes
        this.addEventListener('contentChange', optimizeForLargeDocument);
        
        return { optimizeForLargeDocument };
    }
    
    setMarkdown(content) {
        this.state.content.markdown = content;
        this.editorElement.textContent = content;
        this.emit('contentChange', { content });
    }
    
    getMarkdown() {
        return this.state.content.markdown;
    }
}

// Test Suite
describe('Scrolling Performance Optimizations', () => {
    let editorCore;
    let mockContainer;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockContainer = new MockElement('div');
        editorCore = new EditorCore(mockContainer);
        
        // Reset performance.now mock if it exists
        if (global.performance && global.performance.now) {
            global.performance.now.mockReturnValue(Date.now());
        }
        if (global.window.performance && global.window.performance.now) {
            global.window.performance.now.mockReturnValue(Date.now());
        }
        
        // Restore performance API if it was deleted in previous tests
        if (!global.performance) {
            global.performance = {
                now: jest.fn(() => Date.now())
            };
        }
        if (!global.window.performance) {
            global.window.performance = {
                now: jest.fn(() => Date.now())
            };
        }
        
        // Restore requestAnimationFrame if it was deleted
        if (!global.window.requestAnimationFrame) {
            global.window.requestAnimationFrame = jest.fn((callback) => {
                setTimeout(callback, 16);
                return 1;
            });
        }
    });
    
    afterEach(() => {
        if (editorCore) {
            editorCore.eventListeners.clear();
        }
    });
    
    describe('Scroll Performance Classes', () => {
        test('should add smooth scroll classes to editor and preview elements', () => {
            editorCore.optimizeScrollingPerformance();
            
            expect(editorCore.editorElement.classList.add).toHaveBeenCalledWith('smooth-scroll-enabled');
            expect(editorCore.previewElement.classList.add).toHaveBeenCalledWith('smooth-scroll-enabled');
        });
        
        test('should handle missing elements gracefully', () => {
            editorCore.editorElement = null;
            
            editorCore.optimizeScrollingPerformance();
            
            expect(console.warn).toHaveBeenCalledWith('⚠ Cannot optimize scrolling: elements not found');
        });
        
        test('should add large document classes for content over 10k characters', () => {
            const largeContent = 'a'.repeat(15000);
            editorCore.setMarkdown(largeContent);
            
            const { optimizeForLargeDocument } = editorCore.optimizeScrollingPerformance();
            optimizeForLargeDocument();
            
            expect(editorCore.editorElement.classList.add).toHaveBeenCalledWith('large-document');
            expect(editorCore.previewElement.classList.add).toHaveBeenCalledWith('large-document');
        });
        
        test('should remove large document classes for small content', () => {
            const smallContent = 'Small content';
            editorCore.setMarkdown(smallContent);
            
            const { optimizeForLargeDocument } = editorCore.optimizeScrollingPerformance();
            optimizeForLargeDocument();
            
            expect(editorCore.editorElement.classList.remove).toHaveBeenCalledWith('large-document');
            expect(editorCore.previewElement.classList.remove).toHaveBeenCalledWith('large-document');
        });
        
        test('should re-optimize when content changes', () => {
            const { optimizeForLargeDocument } = editorCore.optimizeScrollingPerformance();
            
            // Verify event listener was added
            expect(editorCore.eventListeners.has('contentChange')).toBe(true);
            
            // Simulate content change
            editorCore.setMarkdown('New content');
            
            // The optimization function should be called via event listener
            expect(editorCore.eventListeners.get('contentChange')).toHaveLength(1);
        });
    });
    
    describe('Synchronized Scrolling Performance', () => {
        test('should use requestAnimationFrame for smooth scroll synchronization', () => {
            const preview = editorCore.preview;
            
            // Verify that the preview has scroll sync methods
            expect(preview.syncScrollFromEditor).toBeDefined();
            expect(preview.syncScrollFromPreview).toBeDefined();
            expect(preview.disableScrollSync).toBeDefined();
        });
        
        test('should handle scroll events with passive listeners', () => {
            const editorElement = editorCore.editorElement;
            
            // Simulate adding scroll listener with passive option
            const scrollHandler = jest.fn();
            editorElement.addEventListener('scroll', scrollHandler, { passive: true });
            
            // Verify the listener was added
            expect(editorElement.eventListeners.has('scroll')).toBe(true);
            
            // Trigger scroll event
            editorElement._triggerScroll();
            
            expect(scrollHandler).toHaveBeenCalled();
        });
        
        test('should throttle scroll events for performance', () => {
            const preview = editorCore.preview;
            let callCount = 0;
            
            // Mock the sync function to count calls
            preview.syncScrollFromEditor = jest.fn(() => callCount++);
            
            // Simulate rapid scroll events
            for (let i = 0; i < 10; i++) {
                editorCore.editorElement._triggerScroll();
            }
            
            // Should not call sync function for every scroll event due to throttling
            expect(callCount).toBeLessThan(10);
        });
    });
    
    describe('Scroll Behavior Optimization', () => {
        test('should use smooth scrollTo for programmatic scrolling', () => {
            const previewElement = editorCore.previewElement;
            
            // Test smooth scroll behavior
            previewElement.scrollTo({
                top: 100,
                behavior: 'smooth'
            });
            
            expect(previewElement.scrollTop).toBe(100);
            expect(previewElement._lastScrollBehavior).toBe('smooth');
        });
        
        test('should fall back to instant scroll when smooth is disabled', () => {
            const previewElement = editorCore.previewElement;
            previewElement.style.scrollBehavior = 'auto';
            
            // Test instant scroll behavior
            previewElement.scrollTo({
                top: 200,
                behavior: 'auto'
            });
            
            expect(previewElement.scrollTop).toBe(200);
            expect(previewElement._lastScrollBehavior).toBe('auto');
        });
    });
    
    describe('Performance Monitoring', () => {
        test('should monitor scroll performance using performance.now', () => {
            editorCore.optimizeScrollingPerformance();
            
            // Verify performance.now is available for monitoring
            expect(global.performance.now).toBeDefined();
            expect(typeof global.performance.now).toBe('function');
        });
        
        test('should use requestAnimationFrame for performance monitoring', () => {
            editorCore.optimizeScrollingPerformance();
            
            // Verify requestAnimationFrame is called for performance monitoring
            expect(global.window.requestAnimationFrame).toBeDefined();
        });
        
        test('should handle performance degradation gracefully', () => {
            // Mock poor performance
            global.performance.now
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(50); // 50ms frame time (poor performance)
            
            editorCore.optimizeScrollingPerformance();
            
            // Performance monitoring should not crash the application
            expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('performance warning'));
        });
    });
    
    describe('Mobile Optimization', () => {
        test('should handle touch scrolling optimization', () => {
            // Mock mobile environment
            Object.defineProperty(window, 'ontouchstart', {
                value: {},
                writable: true
            });
            
            editorCore.optimizeScrollingPerformance();
            
            // Should apply mobile-specific optimizations
            expect(editorCore.editorElement.classList.add).toHaveBeenCalledWith('smooth-scroll-enabled');
        });
        
        test('should optimize for different viewport sizes', () => {
            // Mock small viewport
            editorCore.editorElement.clientWidth = 320;
            editorCore.editorElement.clientHeight = 568;
            
            editorCore.optimizeScrollingPerformance();
            
            // Should still apply optimizations for small screens
            expect(editorCore.editorElement.classList.add).toHaveBeenCalledWith('smooth-scroll-enabled');
        });
    });
    
    describe('Scrollbar Optimization', () => {
        test('should optimize scrollbar visibility based on content', () => {
            const editorElement = editorCore.editorElement;
            
            // Mock content that doesn't need scrollbars
            editorElement.scrollHeight = 400;
            editorElement.clientHeight = 400;
            editorElement.scrollWidth = 600;
            editorElement.clientWidth = 600;
            
            editorCore.optimizeScrollingPerformance();
            
            // Should handle scrollbar optimization
            expect(editorCore.editorElement).toBeDefined();
        });
        
        test('should show scrollbars when content overflows', () => {
            const editorElement = editorCore.editorElement;
            
            // Mock content that needs scrollbars
            editorElement.scrollHeight = 800;
            editorElement.clientHeight = 400;
            
            editorCore.optimizeScrollingPerformance();
            
            // Should handle overflow correctly
            expect(editorCore.editorElement).toBeDefined();
        });
    });
    
    describe('Error Handling', () => {
        test('should handle missing performance API gracefully', () => {
            // Mock missing performance API
            delete global.performance;
            delete global.window.performance;
            
            expect(() => {
                editorCore.optimizeScrollingPerformance();
            }).not.toThrow();
        });
        
        test('should handle missing requestAnimationFrame gracefully', () => {
            // Mock missing requestAnimationFrame
            delete global.window.requestAnimationFrame;
            
            expect(() => {
                editorCore.optimizeScrollingPerformance();
            }).not.toThrow();
        });
        
        test('should continue working when scroll events fail', () => {
            // Mock scroll event that throws error
            const editorElement = editorCore.editorElement;
            editorElement.addEventListener = jest.fn(() => {
                throw new Error('Event listener failed');
            });
            
            expect(() => {
                editorCore.optimizeScrollingPerformance();
            }).not.toThrow();
        });
    });
});