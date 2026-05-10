/**
 * Regression tests for the lightweight markdown parser.
 */

/* eslint-env jest, node */

describe('marked-lite parser', () => {
    beforeEach(() => {
        jest.resetModules();
        global.window = {};
        require('../js/marked-lite.js');
    });

    afterEach(() => {
        delete global.window;
    });

    test('renders literal inline-code placeholder text without crashing', () => {
        expect(() => window.markedLite.parse('literal §§CODE0§§ token')).not.toThrow();
        expect(window.markedLite.parse('literal §§CODE0§§ token')).toBe(
            '<p>literal §§CODE0§§ token</p>'
        );
    });

    test('renders literal footnote placeholder text without crashing', () => {
        expect(() => window.markedLite.parse('literal §§FOOTNOTE0§§ token')).not.toThrow();
        expect(window.markedLite.parse('literal §§FOOTNOTE0§§ token')).toBe(
            '<p>literal §§FOOTNOTE0§§ token</p>'
        );
    });

    test('numbers footnote references that appear before definitions', () => {
        const html = window.markedLite.parse('Hello[^note]\n\n[^note]: Footnote text');

        expect(html).toContain(
            '<p>Hello<sup><a href="#fn-note" id="fnref-note" class="footnote-ref">1</a></sup></p>'
        );
        expect(html).toContain(
            '<li id="fn-note">Footnote text <a href="#fnref-note" class="footnote-backref">↩</a></li>'
        );
    });
});
