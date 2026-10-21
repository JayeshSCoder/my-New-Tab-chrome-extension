// Popup DOM Elements
const tabTitleEl = document.getElementById('current-tab-title');
const tabUrlEl = document.getElementById('current-tab-url');
const tabFaviconEl = document.getElementById('current-tab-favicon');
const tabFallbackIconEl = document.getElementById('tab-fallback-icon');
const bookmarkBtn = document.getElementById('bookmark-tab-btn');
const bookmarkBtnText = document.getElementById('bookmark-btn-text');
const addShortcutBtn = document.getElementById('add-tab-shortcut-btn');
const addBtnText = document.getElementById('add-btn-text');
const popupToast = document.getElementById('popup-toast');
const openNewTabBtn = document.getElementById('open-new-tab-btn');

let activeTab = null;
let toastTimeout = null;

function showToast(message) {
    if (!popupToast) return;
    popupToast.textContent = message;
    popupToast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        popupToast.classList.remove('show');
    }, 2400);
}

// Inspect the currently active tab
function inspectCurrentTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
        tabTitleEl.textContent = "Preview Mode";
        tabUrlEl.textContent = "chrome-extension://newtab";
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
            tabTitleEl.textContent = "No active tab detected";
            tabUrlEl.textContent = "";
            bookmarkBtn.disabled = true;
            addShortcutBtn.disabled = true;
            return;
        }

        activeTab = tabs[0];
        const url = activeTab.url || "";
        const isSystemTab = !url ||
            url.startsWith('chrome://') ||
            url.startsWith('edge://') ||
            url.startsWith('about:') ||
            url.startsWith('chrome-extension://');

        if (isSystemTab) {
            tabTitleEl.textContent = activeTab.title || "Browser System Tab";
            tabUrlEl.textContent = "Internal page cannot be saved";
            bookmarkBtn.disabled = true;
            addShortcutBtn.disabled = true;
            bookmarkBtnText.textContent = "Unavailable";
            addBtnText.textContent = "Unavailable";
            return;
        }

        // Display page title and readable domain/url
        tabTitleEl.textContent = activeTab.title || url;
        try {
            const parsed = new URL(url);
            tabUrlEl.textContent = parsed.hostname + (parsed.pathname.length > 1 ? parsed.pathname : "");
        } catch {
            tabUrlEl.textContent = url;
        }

        // Show favicon if available
        if (activeTab.favIconUrl) {
            tabFaviconEl.src = activeTab.favIconUrl;
            tabFaviconEl.style.display = 'block';
            tabFallbackIconEl.style.display = 'none';
        }

        // Check if tab is already in Shortcuts & Bookmarks
        checkIfAlreadyInShortcuts(url);
        checkIfAlreadyBookmarked(url);
    });
}

// Check if tab is already saved in Chrome Bookmarks
function checkIfAlreadyBookmarked(targetUrl) {
    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.search) {
        chrome.bookmarks.search({ url: targetUrl }, (results) => {
            if (results && results.length > 0) {
                bookmarkBtn.disabled = true;
                bookmarkBtn.classList.add('saved');
                bookmarkBtnText.textContent = "Bookmarked ✓";
            } else {
                bookmarkBtn.disabled = false;
                bookmarkBtn.classList.remove('saved');
                bookmarkBtnText.textContent = "Bookmark Tab";
            }
        });
    } else {
        bookmarkBtn.disabled = false;
        bookmarkBtn.classList.remove('saved');
        bookmarkBtnText.textContent = "Bookmark Tab";
    }
}

// Check if tab is already saved in Dashboard Shortcuts
function checkIfAlreadyInShortcuts(targetUrl) {
    const checkList = (shortcutsList) => {
        const exists = shortcutsList.some(s => s.url === targetUrl);
        if (exists) {
            addShortcutBtn.disabled = true;
            addShortcutBtn.classList.add('saved');
            addBtnText.textContent = "In Shortcuts ✓";
        } else {
            addShortcutBtn.disabled = false;
            addShortcutBtn.classList.remove('saved');
            addBtnText.textContent = "Add to Shortcuts";
        }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('shortcuts', (data) => {
            const list = (data && data.shortcuts) || JSON.parse(localStorage.getItem('shortcuts')) || [];
            checkList(list);
        });
    } else {
        const list = JSON.parse(localStorage.getItem('shortcuts')) || [];
        checkList(list);
    }
}

// Bookmark Button Click Handler
if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
        if (!activeTab || !activeTab.url) return;

        const title = (activeTab.title || activeTab.url).trim();
        const url = activeTab.url.trim();

        if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.create) {
            chrome.bookmarks.getTree((tree) => {
                let parentId = undefined;
                try {
                    const root = tree && tree[0];
                    const rootChildren = (root && root.children) ? root.children : [];
                    const bar = rootChildren.find(node =>
                        node.id === "1" ||
                        (node.title && node.title.toLowerCase().includes("bar"))
                    );
                    if (bar) parentId = bar.id;
                } catch (e) {
                    console.error("Error finding bookmark bar:", e);
                }

                const createData = { title, url };
                if (parentId) createData.parentId = parentId;

                chrome.bookmarks.create(createData, () => {
                    if (chrome.runtime.lastError) {
                        // Fallback without parentId if specified parentId failed
                        chrome.bookmarks.create({ title, url }, onBookmarkSuccess);
                    } else {
                        onBookmarkSuccess();
                    }
                });
            });
        } else {
            onBookmarkSuccess();
        }
    });
}

function onBookmarkSuccess() {
    bookmarkBtn.disabled = true;
    bookmarkBtn.classList.add('saved');
    bookmarkBtnText.textContent = "Bookmarked ✓";
    showToast("Tab saved to bookmarks!");
}

// Add to Shortcuts Click Handler
if (addShortcutBtn) {
    addShortcutBtn.addEventListener('click', () => {
        if (!activeTab || !activeTab.url) return;

        const name = (activeTab.title || new URL(activeTab.url).hostname).trim();
        const url = activeTab.url.trim();

        const saveShortcut = (existingShortcuts) => {
            const list = Array.isArray(existingShortcuts) ? existingShortcuts : [];
            list.push({ name, url });

            localStorage.setItem('shortcuts', JSON.stringify(list));
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ shortcuts: list });
            }

            addShortcutBtn.disabled = true;
            addShortcutBtn.classList.add('saved');
            addBtnText.textContent = "In Shortcuts ✓";
            showToast("Added to dashboard shortcuts!");
        };

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('shortcuts', (data) => {
                const list = (data && data.shortcuts) || JSON.parse(localStorage.getItem('shortcuts')) || [];
                saveShortcut(list);
            });
        } else {
            const list = JSON.parse(localStorage.getItem('shortcuts')) || [];
            saveShortcut(list);
        }
    });
}

// Open New Tab Dashboard
if (openNewTabBtn) {
    openNewTabBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: 'chrome://newtab' });
        } else {
            window.open('../index.html', '_blank');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    inspectCurrentTab();
});
