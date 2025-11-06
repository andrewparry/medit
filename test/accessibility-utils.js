/**
 * Accessibility Testing Utilities
 * Helper functions for testing accessibility compliance
 */

/* eslint-env node */

/**
 * Check if element has proper ARIA attributes
 * @param {HTMLElement} element - Element to check
 * @param {Object} expectedAttributes - Expected ARIA attributes
 * @returns {Object} - Validation results
 */
function validateAriaAttributes(element, expectedAttributes) {
    const results = {
        passed: true,
        errors: [],
        warnings: []
    };

    Object.entries(expectedAttributes).forEach(([attr, expectedValue]) => {
        const actualValue = element.getAttribute(attr);

        if (expectedValue === null) {
            // Attribute should not exist
            if (actualValue !== null) {
                results.passed = false;
                results.errors.push(`Expected ${attr} to not exist, but found: ${actualValue}`);
            }
        } else if (actualValue !== expectedValue) {
            results.passed = false;
            results.errors.push(`Expected ${attr}="${expectedValue}", but found: ${actualValue}`);
        }
    });

    return results;
}

/**
 * Check semantic HTML structure
 * @param {Document} document - Document to check
 * @returns {Object} - Validation results
 */
function validateSemanticStructure(document) {
    const results = {
        passed: true,
        errors: [],
        warnings: []
    };

    // Check for required landmarks
    const requiredLandmarks = [
        { selector: '[role="banner"], header', name: 'banner' },
        { selector: '[role="main"], main', name: 'main' },
        { selector: '[role="contentinfo"], footer', name: 'contentinfo' }
    ];

    requiredLandmarks.forEach(({ selector, name }) => {
        const element = document.querySelector(selector);
        if (!element) {
            results.passed = false;
            results.errors.push(`Missing required landmark: ${name}`);
        }
    });

    // Check heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));

        if (index === 0 && level !== 1) {
            results.warnings.push('First heading should be h1');
        }

        if (level > previousLevel + 1) {
            results.warnings.push(`Heading level skipped: h${previousLevel} to h${level}`);
        }

        previousLevel = level;
    });

    return results;
}

/**
 * Check keyboard navigation support
 * @param {Document} document - Document to check
 * @returns {Object} - Validation results
 */
function validateKeyboardNavigation(document) {
    const results = {
        passed: true,
        errors: [],
        warnings: []
    };

    // Check focusable elements
    const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
    ];

    const focusableElements = document.querySelectorAll(focusableSelectors.join(', '));

    focusableElements.forEach((element) => {
        const tabIndex = element.getAttribute('tabindex');

        // Check for positive tabindex (anti-pattern)
        if (tabIndex && parseInt(tabIndex) > 0) {
            results.warnings.push(
                `Element has positive tabindex: ${element.tagName} (${tabIndex})`
            );
        }

        // Check for missing accessible names on interactive elements
        if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
            const hasAccessibleName =
                element.getAttribute('aria-label') ||
                element.getAttribute('aria-labelledby') ||
                element.textContent.trim() ||
                (element.tagName === 'INPUT' && element.getAttribute('placeholder'));

            if (!hasAccessibleName) {
                results.warnings.push(
                    `Interactive element missing accessible name: ${element.tagName}`
                );
            }
        }
    });

    return results;
}

/**
 * Check color contrast (simplified check)
 * @param {HTMLElement} element - Element to check
 * @returns {Object} - Validation results
 */
function validateColorContrast(element) {
    const results = {
        passed: true,
        errors: [],
        warnings: []
    };

    const computedStyle = window.getComputedStyle ? window.getComputedStyle(element) : {};
    const color = computedStyle.color;
    const backgroundColor = computedStyle.backgroundColor;

    // This is a simplified check - in real scenarios, you'd use a proper contrast calculation
    if (color && backgroundColor) {
        // Check if colors are too similar (basic check)
        if (color === backgroundColor) {
            results.passed = false;
            results.errors.push('Text color matches background color');
        }
    }

    return results;
}

/**
 * Check form accessibility
 * @param {Document} document - Document to check
 * @returns {Object} - Validation results
 */
function validateFormAccessibility(document) {
    const results = {
        passed: true,
        errors: [],
        warnings: []
    };

    const formElements = document.querySelectorAll('input, select, textarea');

    formElements.forEach((element) => {
        const id = element.getAttribute('id');
        const ariaLabel = element.getAttribute('aria-label');
        const ariaLabelledBy = element.getAttribute('aria-labelledby');

        // Check for associated label
        let hasLabel = false;

        if (id) {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) {
                hasLabel = true;
            }
        }

        if (ariaLabel || ariaLabelledBy) {
            hasLabel = true;
        }

        if (!hasLabel && element.type !== 'hidden' && element.type !== 'submit') {
            results.warnings.push(
                `Form element missing label: ${element.tagName} (type: ${element.type})`
            );
        }

        // Check for required field indicators
        if (element.hasAttribute('required')) {
            const ariaRequired = element.getAttribute('aria-required');
            if (ariaRequired !== 'true') {
                results.warnings.push('Required field should have aria-required="true"');
            }
        }
    });

    return results;
}

/**
 * Check live regions
 * @param {Document} document - Document to check
 * @returns {Object} - Validation results
 */
function validateLiveRegions(document) {
    const results = {
        passed: true,
        errors: [],
        warnings: []
    };

    const liveRegions = document.querySelectorAll('[aria-live]');

    liveRegions.forEach((element) => {
        const ariaLive = element.getAttribute('aria-live');
        const validValues = ['off', 'polite', 'assertive'];

        if (!validValues.includes(ariaLive)) {
            results.passed = false;
            results.errors.push(`Invalid aria-live value: ${ariaLive}`);
        }

        // Check if live region has appropriate role
        const role = element.getAttribute('role');
        if (ariaLive === 'assertive' && !role) {
            results.warnings.push('Assertive live region should have appropriate role');
        }
    });

    return results;
}

/**
 * Comprehensive accessibility audit
 * @param {Document} document - Document to audit
 * @returns {Object} - Complete audit results
 */
function auditAccessibility(document) {
    const results = {
        passed: true,
        errors: [],
        warnings: [],
        sections: {}
    };

    // Run all accessibility checks
    const checks = [
        { name: 'semantic', fn: () => validateSemanticStructure(document) },
        { name: 'keyboard', fn: () => validateKeyboardNavigation(document) },
        { name: 'forms', fn: () => validateFormAccessibility(document) },
        { name: 'liveRegions', fn: () => validateLiveRegions(document) }
    ];

    checks.forEach(({ name, fn }) => {
        try {
            const sectionResults = fn();
            results.sections[name] = sectionResults;

            if (!sectionResults.passed) {
                results.passed = false;
            }

            results.errors.push(...sectionResults.errors);
            results.warnings.push(...sectionResults.warnings);
        } catch (error) {
            results.passed = false;
            results.errors.push(`Error in ${name} check: ${error.message}`);
        }
    });

    return results;
}

/**
 * Simulate keyboard navigation
 * @param {Document} document - Document to test
 * @param {Array} keys - Array of key sequences to simulate
 * @returns {Object} - Navigation results
 */
function simulateKeyboardNavigation(document, keys = ['Tab', 'Shift+Tab', 'Enter', 'Space']) {
    const results = {
        passed: true,
        errors: [],
        focusPath: []
    };

    const focusableElements = document.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
            'textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), ' +
            '[contenteditable="true"]'
    );

    let currentFocusIndex = -1;

    keys.forEach((key) => {
        try {
            if (key === 'Tab') {
                currentFocusIndex = Math.min(currentFocusIndex + 1, focusableElements.length - 1);
            } else if (key === 'Shift+Tab') {
                currentFocusIndex = Math.max(currentFocusIndex - 1, 0);
            }

            if (currentFocusIndex >= 0 && currentFocusIndex < focusableElements.length) {
                const element = focusableElements[currentFocusIndex];
                results.focusPath.push({
                    key,
                    element: element.tagName,
                    id: element.id,
                    ariaLabel: element.getAttribute('aria-label')
                });
            }
        } catch (error) {
            results.passed = false;
            results.errors.push(`Keyboard navigation error with ${key}: ${error.message}`);
        }
    });

    return results;
}

/**
 * Check screen reader compatibility
 * @param {HTMLElement} element - Element to check
 * @returns {Object} - Screen reader compatibility results
 */
function validateScreenReaderCompatibility(element) {
    const results = {
        passed: true,
        errors: [],
        warnings: []
    };

    // Check for hidden content that should be accessible
    const hiddenElements = element.querySelectorAll('[aria-hidden="true"]');
    hiddenElements.forEach((hidden) => {
        if (hidden.textContent.trim() && !hidden.getAttribute('aria-label')) {
            results.warnings.push('Hidden element contains text but no alternative');
        }
    });

    // Check for decorative images
    const images = element.querySelectorAll('img');
    images.forEach((img) => {
        const alt = img.getAttribute('alt');
        const role = img.getAttribute('role');

        if (alt === null && role !== 'presentation') {
            results.warnings.push('Image missing alt attribute');
        }
    });

    return results;
}

module.exports = {
    validateAriaAttributes,
    validateSemanticStructure,
    validateKeyboardNavigation,
    validateColorContrast,
    validateFormAccessibility,
    validateLiveRegions,
    auditAccessibility,
    simulateKeyboardNavigation,
    validateScreenReaderCompatibility
};
