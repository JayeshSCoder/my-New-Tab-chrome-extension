/*
    Bookmark bar configuration
*/
const BOOKMARK_BAR_WIDTH_KEY = 'bookmark-bar-width';
const DEFAULT_BOOKMARK_BAR_WIDTH = 220;
const MIN_BOOKMARK_BAR_WIDTH = 60; // Icons only
const MAX_BOOKMARK_BAR_WIDTH = 520;
const ICONS_ONLY_WIDTH = 130; // Below this width the titles are hidden
const EDGE_TRIGGER_ZONE = 20; // Distance from the left edge that opens the bar
const BOOKMARK_BAR_PREVIEW_DURATION = 900; // Time the bar stays visible after slider changes (ms)

// Neutral icon used when a favicon cannot be loaded
const FALLBACK_BOOKMARK_ICON = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="8" fill="#3a3f47"/>' +
    '<path d="M11 7h10a2 2 0 0 1 2 2v16l-7-4-7 4V9a2 2 0 0 1 2-2z" fill="#ffffff"/>' +
    '</svg>'
);


const bookmarkList = document.querySelector('.bookmark-list');
const bookmarkNodes = new Map(); // Bookmark id -> bookmark node, used by the options list

document.addEventListener('DOMContentLoaded', () => {
    if (!bookmarkList) {
        return;
    }

    // Right-clicking an item opens our own options list
    bookmarkList.addEventListener('contextmenu', handleBookmarkItemContextMenu);

    renderBookmarkBar();
});

// (Re)build the list from the browser bookmarks
function renderBookmarkBar() {
    if (!bookmarkList) {
        return;
    }

    // Check if bookmarks API is available
    if (!(chrome && chrome.bookmarks)) {
        // Chrome bookmarks API is not available
        return;
    }

    loadBookmarkBarChildren((bookmarkTreeNodes) => {
        bookmarkList.innerHTML = '';
        bookmarkNodes.clear();
        bookmarkTreeNodes.forEach((node) => processNode(node));
    });
}

function loadBookmarkBarChildren(callback) {
    chrome.bookmarks.getTree((tree) => {
        const root = tree && tree[0];
        const rootChildren = (root && root.children) ? root.children : [];

        const bookmarkBarNode = rootChildren.find((node) =>
            node.id === "1" ||
            node.title === "Bookmarks bar" ||
            node.title === "Bookmarks Bar" ||
            node.title === "Bookmarks toolbar" ||
            node.title === "Favorites bar"
        );

        const fallbackNode = rootChildren.find((node) => Array.isArray(node.children) && node.children.length > 0);
        const targetNode = bookmarkBarNode || fallbackNode;

        callback((targetNode && targetNode.children) ? targetNode.children : []);
    });
}

// Function to process each bookmark node
function processNode(node) {
    if (node.children) {
        // If the node has children, process them as well (for folders)
        node.children.forEach((child) => processNode(child));
    } else if (node.url) {
        // Add bookmarks that have URLs to the sidebar
        addBookmarkToSidebar(node);
    }
}

// Function to add a bookmark item to the sidebar
function addBookmarkToSidebar(bookmark) {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    const icon = document.createElement('img');
    const title = document.createElement('span');
    const hostname = getHostname(bookmark.url);
    const faviconUrl = getBrowserFaviconUrl(bookmark.url, 32);

    link.href = bookmark.url;
    link.title = bookmark.title || hostname;
    link.target = "_self"; // Opens in the same tab
    link.dataset.bookmarkId = bookmark.id;

    // Keep the node so the options list can work on the real bookmark
    bookmarkNodes.set(bookmark.id, bookmark);

    // Favicon kept by the browser itself, no favicon service involved
    icon.src = faviconUrl || FALLBACK_BOOKMARK_ICON;
    icon.alt = bookmark.title || hostname;
    icon.loading = 'lazy';
    icon.classList.add('bookmark-icon');
    icon.addEventListener('error', () => {
        // Keep the bar tidy when a favicon cannot be loaded
        if (icon.src !== FALLBACK_BOOKMARK_ICON) {
            icon.src = FALLBACK_BOOKMARK_ICON;
        }
    });

    // Title shown next to the icon
    title.textContent = bookmark.title || hostname;
    title.classList.add('bookmark-title');

    link.appendChild(icon);
    link.appendChild(title);
    listItem.appendChild(link);
    bookmarkList.appendChild(listItem);
}

// Open the bookmark options list where the item was right-clicked
function handleBookmarkItemContextMenu(event) {
    const link = event.target.closest('.bookmark-list a');

    if (!link) {
        return;
    }

    const bookmark = bookmarkNodes.get(link.dataset.bookmarkId);

    if (!bookmark) {
        return;
    }

    // Keep the native menu and the page context menu out of the way
    event.preventDefault();
    event.stopPropagation();

    if (window.showBookmarkContextMenu) {
        window.showBookmarkContextMenu(event, bookmark, renderBookmarkBar);
    }
}

// Read the hostname without breaking on malformed URLs
function getHostname(url) {
    try {
        return new URL(url).hostname;
    } catch (error) {
        return '';
    }
}


/*
    Collapsible Bookmark Bar
    - Slides out when the mouse reaches the left edge of the page
    - Shows the site icon together with the bookmark title
    - Width adjustments: drag the right edge, or use the Settings slider
    - Scrolls when needed, but the scrollbar itself stays invisible
*/
const sidebar = document.querySelector('.bookmark-sidebar');
const resizeHandle = document.getElementById('bookmarkResizeHandle');
const widthSlider = document.getElementById('bookmark-bar-width');
const widthValueLabel = document.getElementById('bookmark-bar-width-value');

let currentWidth = DEFAULT_BOOKMARK_BAR_WIDTH;
let isResizing = false;
let previewTimeoutId = null;

if (sidebar) {
    initBookmarkBar();
}

function initBookmarkBar() {
    // Restore the saved width before the bar becomes visible
    applyBookmarkBarWidth(getSavedBookmarkBarWidth());

    // Show sidebar when mouse is near the left edge
    document.addEventListener('mousemove', (event) => {
        if (event.clientX <= EDGE_TRIGGER_ZONE) { // Detects mouse near the left edge
            showBookmarkBar();
        }
    });

    // Keep the sidebar open while the mouse is over it
    sidebar.addEventListener('mouseenter', showBookmarkBar);

    // Hide sidebar when mouse leaves sidebar area
    sidebar.addEventListener('mouseleave', () => {
        // Stay open while a bookmark is being edited from the bar
        // (the class is set by Components/Bookmarks/bookmarkMenu.js)
        if (!isResizing && !document.body.classList.contains('bookmark-editor-open')) {
            hideBookmarkBar();
        }
    });

    setupBookmarkBarResize();
    setupBookmarkBarSlider();

    // Keep the bar inside the viewport when the window is resized
    window.addEventListener('resize', () => applyBookmarkBarWidth(getSavedBookmarkBarWidth()));
}

// Show the sidebar
function showBookmarkBar() {
    clearTimeout(previewTimeoutId);
    sidebar.classList.add('show');
}

// Hide the sidebar
function hideBookmarkBar() {
    clearTimeout(previewTimeoutId);
    sidebar.classList.remove('show');
}

// Reveal the sidebar briefly so width changes can be seen
function previewBookmarkBar() {
    showBookmarkBar();
    previewTimeoutId = setTimeout(() => {
        if (!sidebar.matches(':hover')) {
            sidebar.classList.remove('show');
        }
    }, BOOKMARK_BAR_PREVIEW_DURATION);
}

// The bar never grows wider than the viewport
function getMaxBookmarkBarWidth() {
    return Math.min(MAX_BOOKMARK_BAR_WIDTH, Math.max(MIN_BOOKMARK_BAR_WIDTH, window.innerWidth - 40));
}

function clampBookmarkBarWidth(width) {
    return Math.round(Math.min(Math.max(width, MIN_BOOKMARK_BAR_WIDTH), getMaxBookmarkBarWidth()));
}

function getSavedBookmarkBarWidth() {
    const savedWidth = parseFloat(localStorage.getItem(BOOKMARK_BAR_WIDTH_KEY));
    return Number.isFinite(savedWidth) ? savedWidth : DEFAULT_BOOKMARK_BAR_WIDTH;
}

function saveBookmarkBarWidth() {
    localStorage.setItem(BOOKMARK_BAR_WIDTH_KEY, String(currentWidth));
}

// Apply a width to the bar and optionally remember it for the next visit
function applyBookmarkBarWidth(width, persist = false) {
    currentWidth = clampBookmarkBarWidth(width);

    sidebar.style.setProperty('--bookmark-bar-width', `${currentWidth}px`);
    sidebar.classList.toggle('icons-only', currentWidth <= ICONS_ONLY_WIDTH);

    if (widthSlider) {
        widthSlider.max = String(getMaxBookmarkBarWidth());
        widthSlider.value = String(currentWidth);
    }

    if (widthValueLabel) {
        widthValueLabel.textContent = `${currentWidth}px`;
    }

    if (persist) {
        saveBookmarkBarWidth();
    }

    return currentWidth;
}

// Drag the right edge of the bar to change its width
function setupBookmarkBarResize() {
    if (!resizeHandle) {
        return;
    }

    let startX = 0;
    let startWidth = 0;

    const onPointerMove = (event) => {
        if (!isResizing) {
            return;
        }
        applyBookmarkBarWidth(startWidth + (event.clientX - startX));
    };

    const stopResizing = (event) => {
        if (!isResizing) {
            return;
        }

        isResizing = false;
        resizeHandle.classList.remove('active');
        sidebar.classList.remove('resizing');
        document.body.classList.remove('bookmark-bar-resizing');

        resizeHandle.removeEventListener('pointermove', onPointerMove);
        resizeHandle.removeEventListener('pointerup', stopResizing);
        resizeHandle.removeEventListener('pointercancel', stopResizing);

        if (event && resizeHandle.hasPointerCapture && resizeHandle.hasPointerCapture(event.pointerId)) {
            resizeHandle.releasePointerCapture(event.pointerId);
        }

        saveBookmarkBarWidth();

        // Hide the bar again when the drag ended outside of it
        const rect = sidebar.getBoundingClientRect();
        const x = event ? event.clientX : null;
        const y = event ? event.clientY : null;
        const endedOutside = typeof x === 'number' && typeof y === 'number' &&
            (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom);

        if (endedOutside) {
            hideBookmarkBar();
        }
    };

    resizeHandle.addEventListener('pointerdown', (event) => {
        event.preventDefault();

        isResizing = true;
        startX = event.clientX;
        startWidth = sidebar.getBoundingClientRect().width;

        showBookmarkBar();
        resizeHandle.classList.add('active');
        sidebar.classList.add('resizing');
        document.body.classList.add('bookmark-bar-resizing');

        // Capture the pointer so the drag keeps working outside of the handle
        try {
            resizeHandle.setPointerCapture(event.pointerId);
        } catch (error) {
            // Pointer capture is only an enhancement, the drag works without it
        }

        resizeHandle.addEventListener('pointermove', onPointerMove);
        resizeHandle.addEventListener('pointerup', stopResizing);
        resizeHandle.addEventListener('pointercancel', stopResizing);
    });

    // Double-clicking the handle restores the default width
    resizeHandle.addEventListener('dblclick', () => {
        applyBookmarkBarWidth(DEFAULT_BOOKMARK_BAR_WIDTH, true);
        previewBookmarkBar();
    });
}

// Optional slider in the settings drawer, kept in sync with the handle
function setupBookmarkBarSlider() {
    if (!widthSlider) {
        return;
    }

    widthSlider.addEventListener('input', () => {
        applyBookmarkBarWidth(Number(widthSlider.value), true);
        previewBookmarkBar();
    });
}
