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
let currentBookmarkId = null;
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

// Update Bookmark Button UI State
function setBookmarkBtnState(isBookmarked, bookmarkId = null) {
    currentBookmarkId = bookmarkId;
    bookmarkBtn.disabled = false;

    if (isBookmarked) {
        bookmarkBtn.classList.add('saved');
        bookmarkBtn.dataset.bookmarked = "true";
        bookmarkBtnText.textContent = "Bookmarked ✓";
        bookmarkBtn.title = "Click to remove bookmark";
    } else {
        bookmarkBtn.classList.remove('saved');
        bookmarkBtn.dataset.bookmarked = "false";
        bookmarkBtnText.textContent = "Bookmark Tab";
        bookmarkBtn.title = "Add tab to bookmarks";
    }
}

// Check if tab is already saved in Chrome Bookmarks
function checkIfAlreadyBookmarked(targetUrl) {
    if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.search) {
        chrome.bookmarks.search({ url: targetUrl }, (results) => {
            if (results && results.length > 0) {
                setBookmarkBtnState(true, results[0].id);
            } else {
                setBookmarkBtnState(false, null);
            }
        });
    } else {
        setBookmarkBtnState(false, null);
    }
}

// Hover cues for removing bookmark
if (bookmarkBtn) {
    bookmarkBtn.addEventListener('mouseenter', () => {
        if (bookmarkBtn.dataset.bookmarked === "true") {
            bookmarkBtnText.textContent = "Remove Bookmark ✕";
        }
    });

    bookmarkBtn.addEventListener('mouseleave', () => {
        if (bookmarkBtn.dataset.bookmarked === "true") {
            bookmarkBtnText.textContent = "Bookmarked ✓";
        }
    });

    // Toggle Bookmark: Add or Remove
    bookmarkBtn.addEventListener('click', () => {
        if (!activeTab || !activeTab.url) return;

        const isCurrentlyBookmarked = bookmarkBtn.dataset.bookmarked === "true";

        if (isCurrentlyBookmarked) {
            // Remove Bookmark
            const removeById = (idToRemove) => {
                if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.remove && idToRemove) {
                    chrome.bookmarks.remove(idToRemove, () => {
                        setBookmarkBtnState(false, null);
                        showToast("Bookmark removed");
                    });
                } else {
                    setBookmarkBtnState(false, null);
                    showToast("Bookmark removed");
                }
            };

            if (currentBookmarkId) {
                removeById(currentBookmarkId);
            } else if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.search) {
                chrome.bookmarks.search({ url: activeTab.url }, (results) => {
                    if (results && results.length > 0) {
                        removeById(results[0].id);
                    } else {
                        setBookmarkBtnState(false, null);
                        showToast("Bookmark removed");
                    }
                });
            } else {
                setBookmarkBtnState(false, null);
                showToast("Bookmark removed");
            }
        } else {
            // Add Bookmark
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

                    chrome.bookmarks.create(createData, (newEntry) => {
                        if (chrome.runtime.lastError) {
                            // Fallback without parentId if specific parent failed
                            chrome.bookmarks.create({ title, url }, (fallbackEntry) => {
                                setBookmarkBtnState(true, fallbackEntry ? fallbackEntry.id : null);
                                showToast("Tab saved to bookmarks!");
                            });
                        } else {
                            setBookmarkBtnState(true, newEntry ? newEntry.id : null);
                            showToast("Tab saved to bookmarks!");
                        }
                    });
                });
            } else {
                setBookmarkBtnState(true, "preview-id");
                showToast("Tab saved to bookmarks!");
            }
        }
    });
}

// Update Shortcut Button UI State
function setShortcutBtnState(isSaved) {
    addShortcutBtn.disabled = false;
    if (isSaved) {
        addShortcutBtn.classList.add('saved');
        addShortcutBtn.dataset.saved = "true";
        addBtnText.textContent = "In Shortcuts ✓";
        addShortcutBtn.title = "Click to remove from shortcuts";
    } else {
        addShortcutBtn.classList.remove('saved');
        addShortcutBtn.dataset.saved = "false";
        addBtnText.textContent = "Add to Shortcuts";
        addShortcutBtn.title = "Add tab to dashboard shortcuts";
    }
}

// Check if tab is already saved in Dashboard Shortcuts
function checkIfAlreadyInShortcuts(targetUrl) {
    const checkList = (shortcutsList) => {
        const exists = shortcutsList.some(s => s.url === targetUrl);
        setShortcutBtnState(exists);
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

// Hover cues for removing shortcut
if (addShortcutBtn) {
    addShortcutBtn.addEventListener('mouseenter', () => {
        if (addShortcutBtn.dataset.saved === "true") {
            addBtnText.textContent = "Remove Shortcut ✕";
        }
    });

    addShortcutBtn.addEventListener('mouseleave', () => {
        if (addShortcutBtn.dataset.saved === "true") {
            addBtnText.textContent = "In Shortcuts ✓";
        }
    });

    // Toggle Shortcut: Add or Remove
    addShortcutBtn.addEventListener('click', () => {
        if (!activeTab || !activeTab.url) return;

        const isCurrentlySaved = addShortcutBtn.dataset.saved === "true";
        const url = activeTab.url.trim();

        const updateShortcuts = (existingShortcuts) => {
            let list = Array.isArray(existingShortcuts) ? existingShortcuts : [];

            if (isCurrentlySaved) {
                // Remove shortcut
                list = list.filter(item => item.url !== url);
                setShortcutBtnState(false);
                showToast("Shortcut removed");
            } else {
                // Add shortcut
                const name = (activeTab.title || new URL(url).hostname).trim();
                list.push({ name, url });
                setShortcutBtnState(true);
                showToast("Added to dashboard shortcuts!");
            }

            localStorage.setItem('shortcuts', JSON.stringify(list));
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ shortcuts: list });
            }
        };

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('shortcuts', (data) => {
                const list = (data && data.shortcuts) || JSON.parse(localStorage.getItem('shortcuts')) || [];
                updateShortcuts(list);
            });
        } else {
            const list = JSON.parse(localStorage.getItem('shortcuts')) || [];
            updateShortcuts(list);
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
