




document.addEventListener('DOMContentLoaded', function () {
    const bookmarkList = document.querySelector('.bookmark-list');

    // Check if bookmarks API is available
    if (chrome && chrome.bookmarks) {
        // Fetch bookmarks bar node (usually has ID 1)
        chrome.bookmarks.getChildren("1", (bookmarkTreeNodes) => {
            bookmarkTreeNodes.forEach((node) => processNode(node));
        });
    } else {
        // Chrome bookmarks API is not available
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

        link.href = bookmark.url;
        link.title = bookmark.title;
        link.target = "_self"; // Opens in the same tab

        // Use the favicon as the icon
        icon.src = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(bookmark.url).hostname}`;
        icon.alt = bookmark.title;
        icon.classList.add('bookmark-icon');

        link.appendChild(icon);
        listItem.appendChild(link);
        bookmarkList.appendChild(listItem);
    }
});




/*
    Collapsible Bookmark Bar
*/
const sidebar = document.querySelector('.bookmark-sidebar');
// Show sidebar when mouse is near the left edge
document.addEventListener('mousemove', (event) => {
    if (event.clientX < 20) { // Detects mouse near the left edge
        sidebar.classList.add('show');
    }
});

// Hide sidebar when mouse leaves sidebar area
sidebar.addEventListener('mouseleave', () => {
    sidebar.classList.remove('show');
});
