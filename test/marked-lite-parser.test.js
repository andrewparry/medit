/**
 * Regression tests for confirmed marked-lite parser defects.
 *
 * Defect 1: Balanced parentheses in link/image URLs
 *   URLs containing parentheses (e.g. Wikipedia-style links) were truncated
 *   at the first closing paren because the URL regex used [^)]+ .
 *
 * Defect 2: Forward footnote reference numbering
 *   When a footnote reference appeared before its definition, the rendered
 *   link text showed the raw identifier instead of a sequential number.
 */

/* eslint-env node, jest */

// marked-lite.js is an IIFE that expects `window` as its global object.
// Expose the Node global so the IIFE can attach markedLite/marked to it.
global.window = global;

require('../js/marked-lite.js');

const { parse } = global.markedLite;

// ---------------------------------------------------------------------------
// Helper: strip leading/trailing whitespace and normalise internal whitespace
// for easier snapshot comparisons.
// ---------------------------------------------------------------------------
const normalise = (str) => str.trim().replace(/\s+/g, ' ');

// ---------------------------------------------------------------------------
// Defect 1: balanced parentheses in link/image URLs
// ---------------------------------------------------------------------------
describe('Balanced parentheses in link/image URLs', () => {
    test('link URL with a single level of parentheses renders the full URL', () => {
        const result = parse('[Foobar](https://en.wikipedia.org/wiki/Foobar_(computing))');
        // escapeAttribute encodes ( as &#40; and ) as &#41;
        expect(result).toContain('href="https://en.wikipedia.org/wiki/Foobar_&#40;computing&#41;"');
        expect(result).toContain('>Foobar</a>');
    });

    test('plain link URL without parentheses still renders correctly', () => {
        const result = parse('[Example](https://example.com/page)');
        expect(result).toContain('href="https://example.com/page"');
        expect(result).toContain('>Example</a>');
    });

    test('link URL with parenthesised path segment renders the full URL', () => {
        const result = parse('[docs](https://example.com/api/v1(stable)/ref)');
        expect(result).toContain('href="https://example.com/api/v1&#40;stable&#41;/ref"');
    });

    test('image URL with parentheses renders the full src', () => {
        const result = parse('![chart](https://example.com/chart(v2).png)');
        expect(result).toContain('src="https://example.com/chart&#40;v2&#41;.png"');
        expect(result).toContain('alt="chart"');
    });

    test('image URL without parentheses still renders correctly', () => {
        const result = parse('![logo](https://example.com/logo.png)');
        expect(result).toContain('src="https://example.com/logo.png"');
        expect(result).toContain('alt="logo"');
    });
});

// ---------------------------------------------------------------------------
// Defect 2: forward footnote reference numbering
// ---------------------------------------------------------------------------
describe('Forward footnote reference numbering', () => {
    test('reference before definition renders numeric label, not identifier', () => {
        const md = 'See [^note].\n\n[^note]: The footnote text.';
        const result = parse(md);
        // The superscript link text must be "1", not "note"
        expect(result).toMatch(/class="footnote-ref">1<\/a>/);
        expect(result).not.toMatch(/class="footnote-ref">note<\/a>/);
    });

    test('two forward references receive sequential numbers in reference order', () => {
        const md =
            'First [^alpha] and second [^beta].\n\n[^alpha]: Alpha text.\n\n[^beta]: Beta text.';
        const result = parse(md);
        expect(result).toMatch(/href="#fn-alpha"[^>]*>1<\/a>/);
        expect(result).toMatch(/href="#fn-beta"[^>]*>2<\/a>/);
    });

    test('definition before reference still assigns sequential numbers', () => {
        const md = '[^early]: Definition first.\n\nNow the reference [^early].';
        const result = parse(md);
        // "early" is defined first but referenced later; it should still get number 1
        expect(result).toMatch(/class="footnote-ref">1<\/a>/);
    });

    test('mixed forward and backward references number by reference-appearance order', () => {
        // [^b] appears before [^a] in body text → b=1, a=2
        const md = 'See [^b] then [^a].\n\n[^a]: Text for a.\n\n[^b]: Text for b.';
        const result = parse(md);
        expect(result).toMatch(/href="#fn-b"[^>]*>1<\/a>/);
        expect(result).toMatch(/href="#fn-a"[^>]*>2<\/a>/);
    });

    test('footnote definitions section uses correct numbers', () => {
        const md = 'Ref [^x].\n\n[^x]: X footnote.';
        const result = parse(md);
        // The definition list item should have id="fn-x"
        expect(result).toContain('id="fn-x"');
        // The back-reference link should exist
        expect(result).toContain('href="#fnref-x"');
    });
});
