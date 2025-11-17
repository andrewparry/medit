/**
 * Performance Testing Utilities
 * Helper functions for measuring and validating performance in tests
 */

/**
 * Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: any, duration: number}>}
 */
async function measureExecutionTime(fn) {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();

    return {
        result,
        duration: endTime - startTime
    };
}

/**
 * Generate large markdown content for performance testing
 * @param {number} lines - Number of lines to generate
 * @param {Object} options - Content generation options
 * @returns {string}
 */
function generateLargeMarkdownContent(lines = 1000, options = {}) {
    const {
        includeHeaders = true,
        includeLists = true,
        includeLinks = true,
        includeCode = true,
        includeImages = false
    } = options;

    const contentTypes = [];

    if (includeHeaders) {
        contentTypes.push((i) => `# Header ${i}\n## Subheader ${i}\n### Sub-subheader ${i}`);
    }

    if (includeLists) {
        contentTypes.push(
            (i) => `- List item ${i}\n  - Nested item ${i}.1\n  - Nested item ${i}.2`
        );
        contentTypes.push(
            (i) => `1. Numbered item ${i}\n2. Numbered item ${i + 1}\n3. Numbered item ${i + 2}`
        );
    }

    if (includeLinks) {
        contentTypes.push(
            (i) => `This is a paragraph with a [link ${i}](http://example.com/${i}) in it.`
        );
    }

    if (includeCode) {
        contentTypes.push(
            (i) =>
                `Here is some \`inline code ${i}\` and a code block:\n\n\`\`\`javascript\nfunction test${i}() {\n  return ${i};\n}\n\`\`\``
        );
    }

    if (includeImages) {
        contentTypes.push(
            (i) => `![Image ${i}](http://example.com/image${i}.jpg "Image ${i} description")`
        );
    }

    // Default content if no types specified
    if (contentTypes.length === 0) {
        contentTypes.push((i) => `Line ${i}: This is sample content for performance testing.`);
    }

    const content = [];
    for (let i = 0; i < lines; i++) {
        const typeIndex = i % contentTypes.length;
        content.push(contentTypes[typeIndex](i));

        // Add some spacing
        if (i % 10 === 9) {
            content.push('');
        }
    }

    return content.join('\n');
}

/**
 * Simulate rapid user input for performance testing
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to input
 * @param {number} delay - Delay between characters (ms)
 * @returns {Promise<number>} - Total time taken
 */
async function simulateRapidInput(element, text, delay = 1) {
    const startTime = performance.now();

    for (let i = 0; i < text.length; i++) {
        element.textContent += text[i];

        // Simulate input event
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text[i]
        });
        element.dispatchEvent(inputEvent);

        if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    return performance.now() - startTime;
}

/**
 * Memory usage measurement helper
 * @returns {Object} - Memory usage information
 */
function getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage();
    }

    // Browser environment fallback
    if (performance.memory) {
        return {
            heapUsed: performance.memory.usedJSHeapSize,
            heapTotal: performance.memory.totalJSHeapSize,
            heapLimit: performance.memory.jsHeapSizeLimit
        };
    }

    return {
        heapUsed: 0,
        heapTotal: 0,
        heapLimit: 0
    };
}

/**
 * Performance benchmark runner
 * @param {string} name - Benchmark name
 * @param {Function} fn - Function to benchmark
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} - Benchmark results
 */
async function runBenchmark(name, fn, options = {}) {
    const {
        iterations = 1,
        warmupIterations = 0,
        maxDuration = 5000 // 5 seconds max
    } = options;

    // Warmup runs
    for (let i = 0; i < warmupIterations; i++) {
        await fn();
    }

    const results = [];
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        const iterationStart = performance.now();

        // Check if we've exceeded max duration
        if (iterationStart - startTime > maxDuration) {
            break;
        }

        const memoryBefore = getMemoryUsage();
        await fn();
        const memoryAfter = getMemoryUsage();

        const iterationEnd = performance.now();

        results.push({
            iteration: i + 1,
            duration: iterationEnd - iterationStart,
            memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
        });
    }

    // Calculate statistics
    const durations = results.map((r) => r.duration);
    const memoryDeltas = results.map((r) => r.memoryDelta);

    return {
        name,
        iterations: results.length,
        totalDuration: performance.now() - startTime,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        averageMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
        results
    };
}

/**
 * Assert performance meets requirements
 * @param {number} actualDuration - Actual execution time
 * @param {number} maxExpectedDuration - Maximum expected time
 * @param {string} operation - Operation description
 */
function assertPerformance(actualDuration, maxExpectedDuration, operation) {
    if (actualDuration > maxExpectedDuration) {
        throw new Error(
            `Performance assertion failed for ${operation}: ` +
                `Expected <= ${maxExpectedDuration}ms, but got ${actualDuration}ms`
        );
    }
}

/**
 * Create performance test data sets
 * @returns {Object} - Various test data sets
 */
function createPerformanceTestData() {
    return {
        small: generateLargeMarkdownContent(100),
        medium: generateLargeMarkdownContent(1000),
        large: generateLargeMarkdownContent(5000),
        extraLarge: generateLargeMarkdownContent(10000),
        complex: generateLargeMarkdownContent(1000, {
            includeHeaders: true,
            includeLists: true,
            includeLinks: true,
            includeCode: true,
            includeImages: true
        })
    };
}

module.exports = {
    measureExecutionTime,
    generateLargeMarkdownContent,
    simulateRapidInput,
    getMemoryUsage,
    runBenchmark,
    assertPerformance,
    createPerformanceTestData
};
