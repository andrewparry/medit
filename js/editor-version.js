/*
 * Markdown Editor - Version Module
 * Manages version information and display
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};

    // Version information
    const VERSION = {
        major: 1,
        minor: 1,
        patch: 0,
        get full() {
            return `${this.major}.${this.minor}.${this.patch}`;
        },
        name: 'Medit',
        description: 'Markdown WYSIWYG Editor',
        year: new Date().getFullYear(),
        license: 'MIT',
        repository: 'https://github.com/andrewparry/medit'
    };

    /**
     * Show version information dialog
     * Displays app name, version, description, and links
     *
     * @returns {void}
     * @example
     * showVersionInfo(); // Shows version dialog
     */
    const showVersionInfo = () => {
        const { elements } = MarkdownEditor;

        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'dialog-title');

        const titleElement = document.createElement('h2');
        titleElement.id = 'dialog-title';
        titleElement.className = 'dialog-label';
        titleElement.textContent = `About ${VERSION.name}`;
        titleElement.style.marginTop = '0';
        titleElement.style.textAlign = 'center';

        const contentElement = document.createElement('div');
        contentElement.style.textAlign = 'center';
        contentElement.style.padding = '20px';

        // Version info
        const versionText = document.createElement('p');
        versionText.style.fontSize = '1.2em';
        versionText.style.margin = '10px 0';
        versionText.textContent = `Version ${VERSION.full}`;
        contentElement.appendChild(versionText);

        // Description
        const descText = document.createElement('p');
        descText.style.margin = '15px 0';
        descText.textContent = VERSION.description;
        contentElement.appendChild(descText);

        // Subtitle
        const subtitleText = document.createElement('p');
        subtitleText.style.margin = '15px 0';
        subtitleText.style.fontSize = '0.9em';
        subtitleText.innerHTML =
            'A fully functional client-side markdown editor<br>that runs entirely in your browser';
        contentElement.appendChild(subtitleText);

        // Separator
        const separator = document.createElement('div');
        separator.style.marginTop = '20px';
        separator.style.paddingTop = '20px';
        separator.style.borderTop = '1px solid var(--border-color)';

        // GitHub link
        const linkPara = document.createElement('p');
        linkPara.style.margin = '10px 0';
        linkPara.style.fontSize = '0.9em';
        const githubLink = document.createElement('a');
        githubLink.href = VERSION.repository;
        githubLink.target = '_blank';
        githubLink.rel = 'noopener noreferrer';
        githubLink.textContent = 'View on GitHub';
        githubLink.style.textDecoration = 'none';
        linkPara.appendChild(githubLink);
        separator.appendChild(linkPara);

        // Copyright
        const copyrightPara = document.createElement('p');
        copyrightPara.style.margin = '10px 0';
        copyrightPara.style.fontSize = '0.85em';
        copyrightPara.innerHTML = `© ${VERSION.year} Andrew Parry<br>Licensed under ${VERSION.license}`;
        separator.appendChild(copyrightPara);

        contentElement.appendChild(separator);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'dialog-btn dialog-btn-primary';
        closeButton.textContent = 'Close';
        closeButton.autofocus = true;

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
            if (elements.editor) {
                elements.editor.focus();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                cleanup();
            }
        };

        closeButton.addEventListener('click', cleanup);
        actions.appendChild(closeButton);

        dialog.appendChild(titleElement);
        dialog.appendChild(contentElement);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);

        document.addEventListener('keydown', handleKeyDown);
        document.body.appendChild(overlay);

        closeButton.focus();
    };

    /**
     * Get the current version string
     *
     * @returns {string} Version string in format "major.minor.patch"
     * @example
     * const version = getVersion(); // "1.1.0"
     */
    const getVersion = () => {
        return VERSION.full;
    };

    /**
     * Get the full version object
     *
     * @returns {object} Version object with all properties
     * @example
     * const versionInfo = getVersionInfo();
     * console.log(versionInfo.full); // "1.1.0"
     */
    const getVersionInfo = () => {
        return { ...VERSION };
    };

    // Export to global namespace
    MarkdownEditor.version = {
        showVersionInfo,
        getVersion,
        getVersionInfo,
        VERSION
    };

    window.MarkdownEditor = MarkdownEditor;
})();
