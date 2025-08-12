// Aesthetic Bookmark Box Implementation
class AestheticBookmarkBox {
    constructor() {
        this.bookmarkBox = null;
        this.bookmarkContent = null;
        this.isCollapsed = true; // Start collapsed by default
        this.faviconCache = new Map(); // Cache for favicons
        this.init();
    }

    init() {
        this.bookmarkBox = document.getElementById('aesthetic-bookmark-box');
        
        if (!this.bookmarkBox) {
            // Try to find it with different approaches
            const allDivs = document.querySelectorAll('div');
            const boxByClass = document.querySelector('.aesthetic-bookmark-box');
            return;
        }
        
        this.bookmarkContent = this.bookmarkBox.querySelector('.bookmark-box-content');
        
        if (!this.bookmarkContent) {
            return;
        }
        
        // Load saved state from localStorage
        this.loadState();
        this.loadFaviconCache();
        this.setupEventListeners();
        this.loadBookmarks();
    }

    loadFaviconCache() {
        // Load cached favicons from localStorage
        const cachedFavicons = localStorage.getItem('bookmark-favicons-cache');
        if (cachedFavicons) {
            try {
                const faviconData = JSON.parse(cachedFavicons);
                this.faviconCache = new Map(Object.entries(faviconData));
            } catch (error) {
                this.faviconCache = new Map();
            }
        } else {
            this.faviconCache = new Map();
        }
    }

    saveFaviconCache() {
        // Save favicon cache to localStorage
        const faviconData = Object.fromEntries(this.faviconCache);
        localStorage.setItem('bookmark-favicons-cache', JSON.stringify(faviconData));
    }

    async refreshAllFavicons() {
        // Clear current cache
        this.faviconCache.clear();
        localStorage.removeItem('bookmark-favicons-cache');
        
        // Show loading state
        this.showLoading();
        
        // Reload bookmarks which will fetch fresh favicons
        this.loadBookmarks();
    }

    loadState() {
        // Get saved state from localStorage
        const savedState = localStorage.getItem('aesthetic-bookmark-box-state');
        if (savedState) {
            this.isCollapsed = JSON.parse(savedState).isCollapsed;
        }
        
        // Apply the initial state
        this.applyState();
    }

    saveState() {
        // Save current state to localStorage
        const state = {
            isCollapsed: this.isCollapsed
        };
        localStorage.setItem('aesthetic-bookmark-box-state', JSON.stringify(state));
    }

    applyState() {
        const toggleBtn = document.getElementById('bookmark-box-toggle');
        
        if (this.isCollapsed) {
            this.bookmarkBox.classList.add('collapsed');
            this.bookmarkBox.classList.remove('expanded');
            if (toggleBtn) toggleBtn.textContent = '+';
        } else {
            this.bookmarkBox.classList.remove('collapsed');
            this.bookmarkBox.classList.add('expanded');
            if (toggleBtn) toggleBtn.textContent = '−';
        }
    }

    setupEventListeners() {
        // Toggle button functionality
        const toggleBtn = document.getElementById('bookmark-box-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                this.toggleBox();
            });
        }

        // Make the entire header clickable
        const header = this.bookmarkBox.querySelector('.bookmark-box-header');
        if (header) {
            header.addEventListener('click', (e) => {
                // Only toggle if the click is not on the toggle button
                if (e.target !== toggleBtn) {
                    this.toggleBox();
                }
            });
            
            // Add cursor pointer style to indicate clickability
            header.style.cursor = 'pointer';
        }
    }

    toggleBox() {
        this.isCollapsed = !this.isCollapsed;
        this.applyState();
        this.saveState();
    }

    async loadBookmarks() {
        if (!chrome || !chrome.bookmarks) {
            this.showError('Chrome bookmarks API is not available.');
            return;
        }

        try {
            this.showLoading();
            
            // Get the entire bookmark tree
            const bookmarkTree = await this.getBookmarkTree();
            
            // Process bookmarks excluding the bookmark bar
            this.processBookmarks(bookmarkTree);
            
        } catch (error) {
            this.showError('Failed to load bookmarks.');
        }
    }

    getBookmarkTree() {
        return new Promise((resolve) => {
            chrome.bookmarks.getTree((tree) => {
                resolve(tree);
            });
        });
    }

    processBookmarks(bookmarkTree) {
        if (!this.bookmarkBox) {
            this.showError('Bookmark box element not found');
            return;
        }
        
        let foldersContainer = this.bookmarkBox.querySelector('.bookmark-folders');
        let itemsContainer = this.bookmarkBox.querySelector('.bookmark-items');
        
        // If containers don't exist, create them
        if (!foldersContainer || !itemsContainer) {
            // Clear the content and recreate the structure
            this.bookmarkContent.innerHTML = `
                <div class="bookmark-folders">
                    <!-- Bookmark folders will be populated here -->
                </div>
                <div class="bookmark-items">
                    <!-- Non-bookmark-bar bookmarks will be populated here -->
                </div>
            `;
            
            foldersContainer = this.bookmarkBox.querySelector('.bookmark-folders');
            itemsContainer = this.bookmarkBox.querySelector('.bookmark-items');
        }
        
        if (!foldersContainer || !itemsContainer) {
            this.showError('Failed to create UI elements');
            return;
        }
        
        // Clear existing content
        foldersContainer.innerHTML = '';
        itemsContainer.innerHTML = '';

        // Find the root bookmarks folder (usually at index 0)
        const rootFolder = bookmarkTree[0];
        if (!rootFolder || !rootFolder.children) {
            this.showEmpty();
            return;
        }

        let hasBookmarks = false;

        // Process each main folder
        rootFolder.children.forEach((folder, index) => {
            // Skip the bookmark bar (usually the first folder with id "1")
            if (folder.id === "1" || folder.title === "Bookmarks bar") {
                return;
            }

            if (folder.children && folder.children.length > 0) {
                this.createFolderElement(folder, foldersContainer);
                hasBookmarks = true;
            }
        });

        // If no bookmarks found, show empty state
        if (!hasBookmarks) {
            this.showEmpty();
        } else {
            this.hideLoading();
        }
    }

    createFolderElement(folder, container) {
        const folderElement = document.createElement('div');
        folderElement.className = 'bookmark-folder';
        
        // Determine folder depth for styling
        const depth = this.getFolderDepth(container);
        const folderIcon = depth === 0 ? '📁' : (depth === 1 ? '📂' : '🗂️');
        
        // Create folder header
        const folderHeader = document.createElement('div');
        folderHeader.className = 'bookmark-folder-header';
        
        const folderTitle = document.createElement('div');
        folderTitle.className = 'bookmark-folder-title';
        folderTitle.innerHTML = `
            <span class="bookmark-folder-icon">${folderIcon}</span>
            <span>${this.escapeHtml(folder.title)}</span>
        `;
        
        const folderToggle = document.createElement('span');
        folderToggle.className = 'bookmark-folder-toggle';
        folderToggle.textContent = '▶';
        
        folderHeader.appendChild(folderTitle);
        folderHeader.appendChild(folderToggle);
        
        // Create folder items container
        const folderItems = document.createElement('div');
        folderItems.className = 'bookmark-folder-items';
        
        // Add bookmarks to folder
        this.addBookmarksToFolder(folder.children, folderItems);
        
        // Toggle functionality
        folderHeader.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            e.preventDefault(); // Prevent any default behavior
            
            folderElement.classList.toggle('expanded');
        });
        
        folderElement.appendChild(folderHeader);
        folderElement.appendChild(folderItems);
        container.appendChild(folderElement);
    }

    getFolderDepth(container) {
        let depth = 0;
        let current = container;
        while (current && !current.classList.contains('bookmark-box-content')) {
            if (current.classList.contains('bookmark-folder-items')) {
                depth++;
            }
            current = current.parentElement;
        }
        return depth;
    }

    addBookmarksToFolder(children, container) {
        children.forEach((child, index) => {
            if (child.url) {
                // It's a bookmark
                const bookmarkElement = this.createBookmarkElement(child);
                container.appendChild(bookmarkElement);
            } else if (child.children) {
                // It's a subfolder - create it as a collapsible folder
                this.createFolderElement(child, container);
            }
        });
    }

    createBookmarkElement(bookmark) {
        const bookmarkElement = document.createElement('a');
        bookmarkElement.className = 'bookmark-item';
        bookmarkElement.href = bookmark.url;
        bookmarkElement.target = '_blank';
        bookmarkElement.title = bookmark.title;
        
        // Get domain and favicon
        const domain = this.getDomainFromUrl(bookmark.url);
        
        // Create favicon img element
        const faviconImg = document.createElement('img');
        faviconImg.className = 'bookmark-favicon';
        faviconImg.alt = '';
        faviconImg.onerror = function() { this.style.display = 'none'; };
        
        // Create title div
        const titleDiv = document.createElement('div');
        titleDiv.className = 'bookmark-title';
        titleDiv.textContent = bookmark.title;
        
        // Create URL div
        const urlDiv = document.createElement('div');
        urlDiv.className = 'bookmark-url';
        urlDiv.textContent = domain;
        
        // Check if we have cached favicon
        if (this.faviconCache.has(domain)) {
            const cachedFavicon = this.faviconCache.get(domain);
            faviconImg.src = cachedFavicon;
        } else {
            // Use Google favicon service immediately and cache in background
            const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
            faviconImg.src = faviconUrl;
            
            // Cache favicon in background without waiting
            this.cacheFaviconInBackground(domain, faviconUrl);
        }
        
        // Append elements
        bookmarkElement.appendChild(faviconImg);
        bookmarkElement.appendChild(titleDiv);
        bookmarkElement.appendChild(urlDiv);
        
        return bookmarkElement;
    }
    
    cacheFaviconInBackground(domain, faviconUrl) {
        // Cache favicon without blocking the UI
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const base64 = canvas.toDataURL('image/png');
                this.faviconCache.set(domain, base64);
                this.saveFaviconCache();
            } catch (error) {
                // If conversion fails, just cache the original URL
                this.faviconCache.set(domain, faviconUrl);
                this.saveFaviconCache();
            }
        };
        
        img.onerror = () => {
            // Cache a default favicon
            const fallbackFavicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
            this.faviconCache.set(domain, fallbackFavicon);
            this.saveFaviconCache();
        };
        
        img.src = faviconUrl;
    }

    getDomainFromUrl(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return url;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        if (this.bookmarkContent) {
            // Don't overwrite the entire content, just add loading message
            const foldersContainer = this.bookmarkContent.querySelector('.bookmark-folders');
            const itemsContainer = this.bookmarkContent.querySelector('.bookmark-items');
            
            if (foldersContainer) {
                foldersContainer.innerHTML = `
                    <div class="bookmark-box-loading">
                        Loading bookmarks...
                    </div>
                `;
            }
            
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
            }
        }
    }

    showEmpty() {
        if (this.bookmarkContent) {
            const foldersContainer = this.bookmarkContent.querySelector('.bookmark-folders');
            const itemsContainer = this.bookmarkContent.querySelector('.bookmark-items');
            
            if (foldersContainer) {
                foldersContainer.innerHTML = `
                    <div class="bookmark-box-empty">
                        📚 No bookmarks found outside the bookmark bar
                    </div>
                `;
            }
            
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
            }
        }
    }

    showError(message) {
        if (this.bookmarkContent) {
            const foldersContainer = this.bookmarkContent.querySelector('.bookmark-folders');
            const itemsContainer = this.bookmarkContent.querySelector('.bookmark-items');
            
            if (foldersContainer) {
                foldersContainer.innerHTML = `
                    <div class="bookmark-box-empty">
                        ⚠️ ${message}
                    </div>
                `;
            }
            
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
            }
        }
    }

    hideLoading() {
        const loadingElement = this.bookmarkContent.querySelector('.bookmark-box-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }
}

// Initialize the aesthetic bookmark box when DOM is loaded
let bookmarkBoxInitialized = false;

function initializeBookmarkBox() {
    if (bookmarkBoxInitialized) {
        return;
    }
    
    // Check if the element exists
    const element = document.getElementById('aesthetic-bookmark-box');
    
    if (element) {
        try {
            bookmarkBoxInitialized = true;
            window.aestheticBookmarkBoxInstance = new AestheticBookmarkBox();
        } catch (error) {
            bookmarkBoxInitialized = false;
        }
    } else {
        setTimeout(initializeBookmarkBox, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeBookmarkBox, 1000);
});

// Also initialize if the script is loaded after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeBookmarkBox, 1000);
    });
} else {
    setTimeout(initializeBookmarkBox, 1000);
}

// Global function to refresh favicons (can be called from settings)
window.refreshBookmarkFavicons = function() {
    if (window.aestheticBookmarkBoxInstance) {
        window.aestheticBookmarkBoxInstance.refreshAllFavicons();
    }
};
