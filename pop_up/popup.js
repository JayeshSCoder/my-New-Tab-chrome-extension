// Elements
const tabTitleEl = document.getElementById('current-tab-title');
const tabUrlEl = document.getElementById('current-tab-url');
const tabFaviconEl = document.getElementById('current-tab-favicon');
const tabFallbackIconEl = document.getElementById('tab-fallback-icon');
const addShortcutBtn = document.getElementById('add-tab-shortcut-btn');
const addBtnText = document.getElementById('add-btn-text');
const shortcutToast = document.getElementById('shortcut-toast');
const openNewTabBtn = document.getElementById('open-new-tab-btn');

let activeTab = null;

// Initialize active tab inspection
function inspectCurrentTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
        tabTitleEl.textContent = "Current Webpage";
        tabUrlEl.textContent = "chrome-extension://preview";
        return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
            tabTitleEl.textContent = "No active tab detected";
            tabUrlEl.textContent = "";
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
            tabTitleEl.textContent = activeTab.title || "Browser System Page";
            tabUrlEl.textContent = "Navigate to a webpage to add shortcut";
            addShortcutBtn.disabled = true;
            addBtnText.textContent = "Unavailable for this tab";
            return;
        }

        // Valid webpage
        tabTitleEl.textContent = activeTab.title || url;
        tabUrlEl.textContent = url;

        // Favicon handling
        if (activeTab.favIconUrl) {
            tabFaviconEl.src = activeTab.favIconUrl;
            tabFaviconEl.style.display = 'block';
            tabFallbackIconEl.style.display = 'none';
        }

        // Check if tab is already in shortcuts
        checkIfAlreadyInShortcuts(url);
    });
}

function checkIfAlreadyInShortcuts(targetUrl) {
    const checkList = (shortcutsList) => {
        const exists = shortcutsList.some(s => s.url === targetUrl);
        if (exists) {
            addShortcutBtn.disabled = true;
            addBtnText.textContent = "Already in Shortcuts";
        } else {
            addShortcutBtn.disabled = false;
            addBtnText.textContent = "Add Tab to Shortcuts";
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

// Add shortcut handler
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

            // Success feedback
            addShortcutBtn.disabled = true;
            addBtnText.textContent = "Added to Shortcuts!";
            shortcutToast.textContent = "Added to New Tab Shortcuts! 🎉";
            shortcutToast.classList.add('show');
            setTimeout(() => {
                shortcutToast.classList.remove('show');
            }, 2500);
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

// Open New Tab
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
