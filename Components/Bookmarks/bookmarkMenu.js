/*
    Right-click menu for the bookmarks shown in the bookmark bar.

    Every option works on the real browser bookmarks:
    - Edit opens a small editor showing the saved name and URL and writes the
      changes back with chrome.bookmarks.update()
    - Open in new tab, Open in incognito and Copy link use the matching
      browser APIs

    While the menu is open the bookmark bar is kept visible, so moving the
    pointer from the bar onto the menu does not close the bar.
*/

const BOOKMARK_MENU_ID = 'bookmark-context-menu';
const BOOKMARK_EDITOR_ID = 'bookmark-editor';
const BOOKMARK_EDITOR_OPEN_CLASS = 'bookmark-editor-open'; // Keeps the bar visible while editing
const BOOKMARK_MENU_OPEN_CLASS = 'bookmark-menu-open'; // Keeps the bar visible while the menu is open

let bookmarkMenuElement = null;
let bookmarkEditorElement = null;
let bookmarkMenuTarget = null; // Bookmark the menu is acting on
let bookmarkMenuRefresh = null; // Reloads the bookmark bar after a change
let bookmarkToastTimeoutId = null;

// Build the menu and the editor once, on first use
function buildBookmarkMenu() {
    if (bookmarkMenuElement) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="${BOOKMARK_MENU_ID}" class="bookmark-context-menu">
            <div class="bookmark-context-option" data-action="edit">✏️ Edit</div>
            <div class="bookmark-context-separator"></div>
            <div class="bookmark-context-option" data-action="open">↗️ Open in new tab</div>
            <div class="bookmark-context-option" data-action="incognito">🕶️ Open in incognito</div>
            <div class="bookmark-context-option" data-action="copy">🔗 Copy link</div>
        </div>
        <div id="${BOOKMARK_EDITOR_ID}" class="bookmark-editor hidden">
            <div class="bookmark-editor-dialog">
                <h3>Edit bookmark</h3>
                <label for="bookmark-editor-name">Name</label>
                <input type="text" id="bookmark-editor-name" placeholder="Bookmark name" autocomplete="off">
                <label for="bookmark-editor-url">URL</label>
                <input type="text" id="bookmark-editor-url" placeholder="https://example.com" autocomplete="off">
                <div id="bookmark-editor-message" class="bookmark-editor-message"></div>
                <div class="bookmark-editor-buttons">
                    <button type="button" id="bookmark-editor-save">Save</button>
                    <button type="button" id="bookmark-editor-cancel">Cancel</button>
                </div>
            </div>
        </div>
        <div id="bookmark-menu-toast" class="bookmark-menu-toast"></div>
    `);

    bookmarkMenuElement = document.getElementById(BOOKMARK_MENU_ID);
    bookmarkEditorElement = document.getElementById(BOOKMARK_EDITOR_ID);

    bookmarkMenuElement.addEventListener('click', (event) => {
        const option = event.target.closest('.bookmark-context-option');
        if (!option) {
            return;
        }

        const action = option.getAttribute('data-action');
        const bookmark = bookmarkMenuTarget;
        hideBookmarkContextMenu();

        if (action === 'edit') {
            openBookmarkEditor(bookmark);
        } else if (action === 'open') {
            openBookmarkInNewTab(bookmark);
        } else if (action === 'incognito') {
            openBookmarkInIncognito(bookmark);
        } else if (action === 'copy') {
            copyBookmarkLink(bookmark);
        }
    });

    // Dismiss the menu on any other click, on scroll or with Escape
    document.addEventListener('click', (event) => {
        if (!bookmarkMenuElement.contains(event.target)) {
            hideBookmarkContextMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideBookmarkContextMenu();
            closeBookmarkEditor();
        }
    });

    document.addEventListener('scroll', hideBookmarkContextMenu, true);

    setupBookmarkEditor();
}

// Open the menu next to the pointer
function showBookmarkContextMenu(event, bookmark, onChanged) {
    if (!bookmark || !bookmark.id) {
        return;
    }

    buildBookmarkMenu();

    bookmarkMenuTarget = bookmark;
    bookmarkMenuRefresh = typeof onChanged === 'function' ? onChanged : null;

    bookmarkMenuElement.style.left = `${event.pageX}px`;
    bookmarkMenuElement.style.top = `${event.pageY}px`;
    bookmarkMenuElement.classList.add('show');

    // Keep the bookmark bar visible while the pointer is on the menu
    document.body.classList.add(BOOKMARK_MENU_OPEN_CLASS);

    // Keep the whole menu inside the window
    const rect = bookmarkMenuElement.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (event.pageX + rect.width > windowWidth) {
        bookmarkMenuElement.style.left = `${Math.max(0, windowWidth - rect.width - 10)}px`;
    }

    if (event.pageY + rect.height > windowHeight) {
        bookmarkMenuElement.style.top = `${Math.max(0, windowHeight - rect.height - 10)}px`;
    }
}

function hideBookmarkContextMenu() {
    if (bookmarkMenuElement) {
        bookmarkMenuElement.classList.remove('show');
    }

    document.body.classList.remove(BOOKMARK_MENU_OPEN_CLASS);
}

// ---------------- Bookmark editor (name and URL of the browser bookmark) ----------------

function setupBookmarkEditor() {
    const nameInput = document.getElementById('bookmark-editor-name');
    const urlInput = document.getElementById('bookmark-editor-url');

    document.getElementById('bookmark-editor-save').addEventListener('click', saveBookmarkEditor);
    document.getElementById('bookmark-editor-cancel').addEventListener('click', closeBookmarkEditor);

    // Clicking the dark backdrop closes the editor
    bookmarkEditorElement.addEventListener('click', (event) => {
        if (event.target === bookmarkEditorElement) {
            closeBookmarkEditor();
        }
    });

    // Enter saves, Escape cancels
    [nameInput, urlInput].forEach((input) => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveBookmarkEditor();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                closeBookmarkEditor();
            }
        });
    });
}

function openBookmarkEditor(bookmark) {
    if (!bookmark) {
        return;
    }

    buildBookmarkMenu();
    hideBookmarkContextMenu();
    bookmarkMenuTarget = bookmark;

    const nameInput = document.getElementById('bookmark-editor-name');
    const urlInput = document.getElementById('bookmark-editor-url');
    const message = document.getElementById('bookmark-editor-message');

    // Show the name and the URL exactly as they are saved in the browser
    nameInput.value = bookmark.title || '';
    urlInput.value = bookmark.url || '';
    message.textContent = '';

    bookmarkEditorElement.classList.remove('hidden');

    // Keep the bookmark bar visible while editing
    document.body.classList.add(BOOKMARK_EDITOR_OPEN_CLASS);
    if (typeof showBookmarkBar === 'function') {
        showBookmarkBar();
    }

    // Put the cursor on the name so it can be edited straight away
    nameInput.focus();
    nameInput.select();
}

function closeBookmarkEditor() {
    if (!bookmarkEditorElement) {
        return;
    }

    bookmarkEditorElement.classList.add('hidden');
    document.body.classList.remove(BOOKMARK_EDITOR_OPEN_CLASS);
}

// Save the changes into the browser bookmark
function saveBookmarkEditor() {
    const bookmark = bookmarkMenuTarget;
    const title = document.getElementById('bookmark-editor-name').value.trim();
    const url = document.getElementById('bookmark-editor-url').value.trim();

    if (!bookmark) {
        closeBookmarkEditor();
        return;
    }

    if (typeof chrome === 'undefined' || !chrome.bookmarks) {
        showBookmarkEditorMessage('The bookmarks API is not available.');
        return;
    }

    if (!isValidBookmarkUrl(url)) {
        showBookmarkEditorMessage('Please enter a valid URL, for example https://example.com');
        return;
    }

    // update() accepts the title and the url, everything else stays untouched
    chrome.bookmarks.update(bookmark.id, { title: title, url: url }, () => {
        if (chrome.runtime.lastError) {
            showBookmarkEditorMessage(chrome.runtime.lastError.message || 'Could not save the bookmark.');
            return;
        }

        closeBookmarkEditor();

        if (bookmarkMenuRefresh) {
            bookmarkMenuRefresh();
        }
    });
}

function showBookmarkEditorMessage(text) {
    const message = document.getElementById('bookmark-editor-message');
    if (message) {
        message.textContent = text;
    }
}

function isValidBookmarkUrl(url) {
    if (!url) {
        return false;
    }

    try {
        const parsed = new URL(url);
        // Keep the risky schemes out of the bookmark bar
        return parsed.protocol !== 'javascript:' && parsed.protocol !== 'data:';
    } catch (error) {
        return false;
    }
}

// ---------------- Other menu actions ----------------

function openBookmarkInNewTab(bookmark) {
    if (!bookmark || !bookmark.url) {
        return;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: bookmark.url });
    } else {
        window.open(bookmark.url, '_blank');
    }
}

function copyBookmarkLink(bookmark) {
    if (!bookmark || !bookmark.url) {
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(bookmark.url)
            .then(() => showBookmarkMenuToast('Link copied'))
            .catch(() => copyBookmarkLinkFallback(bookmark.url));
    } else {
        copyBookmarkLinkFallback(bookmark.url);
    }
}

// Fallback for when the async clipboard is not allowed
function copyBookmarkLinkFallback(url) {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        showBookmarkMenuToast('Link copied');
    } catch (error) {
        showBookmarkMenuToast('Could not copy the link');
    }

    document.body.removeChild(textarea);
}

function openBookmarkInIncognito(bookmark) {
    if (!bookmark || !bookmark.url) {
        return;
    }

    if (typeof chrome === 'undefined' || !chrome.windows || !chrome.windows.create) {
        showBookmarkMenuToast('Incognito windows are not available');
        return;
    }

    isIncognitoAllowed().then((allowed) => {
        if (!allowed) {
            showBookmarkMenuToast('Allow this extension in Incognito first');
            return;
        }

        // chrome.windows.create() only works when the extension is allowed in
        // incognito mode (chrome://extensions -> Details -> Allow in Incognito)
        chrome.windows.create({ url: bookmark.url, incognito: true }, () => {
            if (chrome.runtime.lastError) {
                showBookmarkMenuToast('Allow this extension in Incognito first');
            }
        });
    });
}

// Ask Chrome whether the extension may use incognito mode
function isIncognitoAllowed() {
    return new Promise((resolve) => {
        if (!(chrome.extension && chrome.extension.isAllowedIncognitoAccess)) {
            resolve(true);
            return;
        }

        let settled = false;
        const finish = (allowed) => {
            if (!settled) {
                settled = true;
                resolve(allowed !== false);
            }
        };

        try {
            // Works with both the callback and the promise flavour of the API
            const result = chrome.extension.isAllowedIncognitoAccess(finish);
            if (result && typeof result.then === 'function') {
                result.then(finish, () => finish(true));
            }
        } catch (error) {
            finish(true);
        }
    });
}

// Small feedback message used by the menu actions
function showBookmarkMenuToast(text) {
    buildBookmarkMenu();

    const toast = document.getElementById('bookmark-menu-toast');
    toast.textContent = text;
    toast.classList.add('show');

    clearTimeout(bookmarkToastTimeoutId);
    bookmarkToastTimeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 1800);
}

window.showBookmarkContextMenu = showBookmarkContextMenu;