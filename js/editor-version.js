/*
 * Markdown Editor - Version Module
 * Provides version information and version dialog functionality
 */
(() => {
    'use strict';

    const MarkdownEditor = window.MarkdownEditor || {};
    const { elements } = MarkdownEditor;

    // Application version - keep in sync with package.json
    const APP_VERSION = '1.1.0';

    // Server version endpoint
    const SERVER_VERSION_ENDPOINT = '/version';

    /**
     * Get the application version
     * @returns {string} The application version
     */
    const getAppVersion = () => APP_VERSION;

    /**
     * Fetch the server version
     * @returns {Promise<{version: string, name: string} | null>} Server version info or null if unavailable
     */
    const getServerVersion = async () => {
        try {
            const response = await fetch(SERVER_VERSION_ENDPOINT, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data;
        } catch {
            // Server not running or version endpoint not available
            return null;
        }
    };

    /**
     * Show the version dialog
     * @returns {Promise<void>}
     */
    const showVersionDialog = async () => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog-surface version-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'version-dialog-title');

        // Header with icon
        const header = document.createElement('div');
        header.className = 'version-dialog-header';

        const iconImg = document.createElement('img');
        iconImg.src = 'images/medit_icon.png';
        iconImg.alt = 'Medit';
        iconImg.className = 'version-dialog-icon';

        const titleElement = document.createElement('h2');
        titleElement.id = 'version-dialog-title';
        titleElement.className = 'dialog-label version-dialog-title';
        titleElement.textContent = 'Medit';

        header.appendChild(iconImg);
        header.appendChild(titleElement);

        // Version info container
        const content = document.createElement('div');
        content.className = 'version-dialog-content';

        // App version
        const appVersionRow = document.createElement('div');
        appVersionRow.className = 'version-row';

        const appVersionLabel = document.createElement('span');
        appVersionLabel.className = 'version-label';
        appVersionLabel.textContent = 'Editor Version';

        const appVersionValue = document.createElement('span');
        appVersionValue.className = 'version-value';
        appVersionValue.textContent = APP_VERSION;

        appVersionRow.appendChild(appVersionLabel);
        appVersionRow.appendChild(appVersionValue);
        content.appendChild(appVersionRow);

        // Server version row (with loading state)
        const serverVersionRow = document.createElement('div');
        serverVersionRow.className = 'version-row';

        const serverVersionLabel = document.createElement('span');
        serverVersionLabel.className = 'version-label';
        serverVersionLabel.textContent = 'Server Version';

        const serverVersionValue = document.createElement('span');
        serverVersionValue.className = 'version-value version-loading';
        serverVersionValue.textContent = 'Checking...';

        serverVersionRow.appendChild(serverVersionLabel);
        serverVersionRow.appendChild(serverVersionValue);
        content.appendChild(serverVersionRow);

        // Description
        const description = document.createElement('p');
        description.className = 'version-description';
        description.textContent =
            'A browser-based Markdown editor with real-time preview, local file management, and offline functionality.';

        // Links
        const links = document.createElement('div');
        links.className = 'version-links';

        const githubLink = document.createElement('a');
        githubLink.href = 'https://github.com/andrewparry/medit';
        githubLink.target = '_blank';
        githubLink.rel = 'noopener noreferrer';
        githubLink.className = 'version-link';
        githubLink.textContent = 'GitHub';

        links.appendChild(githubLink);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'dialog-actions';

        const okButton = document.createElement('button');
        okButton.type = 'button';
        okButton.className = 'dialog-btn dialog-btn-primary';
        okButton.textContent = 'OK';
        okButton.autofocus = true;

        const cleanup = () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.removeChild(overlay);
            if (elements.editor) {
                elements.editor.focus();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' || event.key === 'Enter') {
                event.preventDefault();
                cleanup();
            }
        };

        okButton.addEventListener('click', cleanup);

        actions.appendChild(okButton);

        dialog.appendChild(header);
        dialog.appendChild(content);
        dialog.appendChild(description);
        dialog.appendChild(links);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                cleanup();
            }
        });

        document.body.appendChild(overlay);
        document.addEventListener('keydown', handleKeyDown);

        setTimeout(() => okButton.focus(), 10);

        // Fetch server version asynchronously
        const serverInfo = await getServerVersion();
        if (serverInfo && serverInfo.version) {
            serverVersionValue.textContent = serverInfo.version;
            serverVersionValue.classList.remove('version-loading');
            serverVersionValue.classList.add('version-available');
        } else {
            serverVersionValue.textContent = 'Not connected';
            serverVersionValue.classList.remove('version-loading');
            serverVersionValue.classList.add('version-unavailable');
        }
    };

    // Expose public API
    MarkdownEditor.version = {
        getAppVersion,
        getServerVersion,
        showVersionDialog,
        APP_VERSION
    };

    window.MarkdownEditor = MarkdownEditor;
})();
