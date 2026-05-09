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
});
