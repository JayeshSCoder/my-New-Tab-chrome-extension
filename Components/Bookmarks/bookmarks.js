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


document.addEventListener('DOMContentLoaded', function () {
    const bookmarkList = document.querySelector('.bookmark-list');

    if (!bookmarkList) {
        return;
    }

    // Check if bookmarks API is available
    if (chrome && chrome.bookmarks) {
        loadBookmarkBarChildren((bookmarkTreeNodes) => {
            bookmarkTreeNodes.forEach((node) => processNode(node));
        });
    } else {
        // Chrome bookmarks API is not available
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

        link.href = bookmark.url;
        link.title = bookmark.title || hostname;
        link.target = "_self"; // Opens in the same tab

        // Use the favicon as the icon
        icon.src = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
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
});

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
        if (!isResizing) {
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
