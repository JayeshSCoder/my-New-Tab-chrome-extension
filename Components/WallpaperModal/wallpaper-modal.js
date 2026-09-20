/**
 * Wallpaper Gallery Modal Component
 * Integrates Openverse Creative Commons open-source wallpaper search & custom explorer upload
 * Enforces a strict 5-item recent wallpapers limit to preserve storage quota.
 * Does NOT call network on tab launch; only fetches when modal is opened.
 */

(function () {
    // Storage keys
    const STORAGE_KEY_BG = 'backgroundImage';
    const STORAGE_KEY_RECENT = 'recentWallpapers';
    const MAX_RECENT_WALLPAPERS = 5;

    // Fallback curated open-source wallpapers (Creative Commons / Unsplash / Public Domain)
    const CURATED_FALLBACK_WALLPAPERS = [
        {
            id: 'fallback-1',
            title: 'Cosmic Nebula in Deep Space',
            creator: 'NASA / ESA',
            url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=70',
            license: 'CC0'
        },
        {
            id: 'fallback-2',
            title: 'Majestic Alpine Lake Reflections',
            creator: 'Luca Bravo',
            url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=70',
            license: 'CC0'
        },
        {
            id: 'fallback-3',
            title: 'Cyberpunk Neon Cityscape at Night',
            creator: 'Aleksandar Pasaric',
            url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=70',
            license: 'CC0'
        },
        {
            id: 'fallback-4',
            title: 'Mist Over Mountain Pine Forest',
            creator: 'Kalvis Svilāns',
            url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1920&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=400&q=70',
            license: 'CC0'
        },
        {
            id: 'fallback-5',
            title: 'Golden Sunset Horizon Over Calm Sea',
            creator: 'Sébastien Goldberg',
            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=70',
            license: 'CC0'
        },
        {
            id: 'fallback-6',
            title: 'Minimalist Sand Dunes and Shadows',
            creator: 'Jeremy Bishop',
            url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80',
            thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=70',
            license: 'CC0'
        }
    ];

    // State
    let isModalOpen = false;
    let hasLoadedGallery = false;
    let currentQuery = 'wallpaper landscape nature';
    let currentPage = 1;
    let totalPages = 1;
    let pageSize = 12;
    let activeWallpaper = '';
    let recentWallpapers = [];

    // DOM Elements
    let backdrop, modal, closeBtn, uploadBtn, resetBtn, fileInput;
    let searchInput, searchBtn, clearSearchBtn, tagsContainer;
    let gridContainer, statusMessage, bodyContainer;
    let prevPageBtn, nextPageBtn, currentPageEl, totalPagesEl;
    let recentStripEl;

    function initElements() {
        backdrop = document.getElementById('wallpaper-modal-backdrop');
        modal = document.getElementById('wallpaper-modal');
        closeBtn = document.getElementById('wm-close-btn');
        uploadBtn = document.getElementById('wm-upload-btn');
        resetBtn = document.getElementById('wm-reset-btn');
        fileInput = document.getElementById('backgroundFileInput');

        searchInput = document.getElementById('wm-search-input');
        searchBtn = document.getElementById('wm-search-submit-btn');
        clearSearchBtn = document.getElementById('wm-search-clear-btn');
        tagsContainer = document.querySelector('.wm-tags-scroller');

        gridContainer = document.getElementById('wm-grid');
        statusMessage = document.getElementById('wm-status-message');
        bodyContainer = document.getElementById('wm-body');

        prevPageBtn = document.getElementById('wm-prev-page-btn');
        nextPageBtn = document.getElementById('wm-next-page-btn');
        currentPageEl = document.getElementById('wm-current-page');
        totalPagesEl = document.getElementById('wm-total-pages');

        recentStripEl = document.getElementById('wm-recent-strip');
    }

    // Load active wallpaper & recent wallpapers from storage
    async function loadStorageData() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([STORAGE_KEY_BG, STORAGE_KEY_RECENT], (data) => {
                    activeWallpaper = (data && data[STORAGE_KEY_BG]) || localStorage.getItem(STORAGE_KEY_BG) || '';
                    recentWallpapers = (data && data[STORAGE_KEY_RECENT]) || JSON.parse(localStorage.getItem(STORAGE_KEY_RECENT) || '[]');
                    if (!Array.isArray(recentWallpapers)) recentWallpapers = [];
                    resolve();
                });
            } else {
                activeWallpaper = localStorage.getItem(STORAGE_KEY_BG) || '';
                try {
                    recentWallpapers = JSON.parse(localStorage.getItem(STORAGE_KEY_RECENT) || '[]');
                } catch {
                    recentWallpapers = [];
                }
                if (!Array.isArray(recentWallpapers)) recentWallpapers = [];
                resolve();
            }
        });
    }

    // Save recent wallpapers (strictly limited to last 5)
    function saveRecentWallpapers() {
        // Enforce max 5 items
        recentWallpapers = recentWallpapers.slice(0, MAX_RECENT_WALLPAPERS);

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [STORAGE_KEY_RECENT]: recentWallpapers });
        }
        try {
            localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(recentWallpapers));
        } catch (e) {
            console.warn('LocalStorage quota limit reached while saving recent wallpapers:', e);
        }

        renderRecentWallpapers();
    }

    // Add an item to recent wallpapers
    function addToRecentWallpapers(item) {
        // Deduplicate by URL or ID
        recentWallpapers = recentWallpapers.filter(w => w.url !== item.url && w.id !== item.id);
        
        // Put newest first
        recentWallpapers.unshift({
            id: item.id || 'wp-' + Date.now(),
            type: item.type || 'web',
            url: item.url,
            thumbnail: item.thumbnail || item.url,
            title: item.title || 'Wallpaper',
            timestamp: Date.now()
        });

        saveRecentWallpapers();
    }

    // Apply wallpaper to tab
    function applyWallpaper(imageUrl, metadata = {}) {
        if (!imageUrl) return;

        activeWallpaper = imageUrl;

        // Save active background
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [STORAGE_KEY_BG]: imageUrl });
        }
        try {
            localStorage.setItem(STORAGE_KEY_BG, imageUrl);
        } catch (e) {
            console.warn('LocalStorage quota limit reached while saving background:', e);
        }

        // Live update background DOM element directly
        const bgElement = document.querySelector('.background');
        if (bgElement) {
            if (imageUrl.startsWith('linear-gradient') || imageUrl.startsWith('radial-gradient')) {
                bgElement.style.backgroundImage = imageUrl;
            } else {
                bgElement.style.backgroundImage = `url(${imageUrl})`;
            }
            bgElement.style.backgroundSize = 'cover';
            bgElement.style.backgroundPosition = 'center';
            bgElement.classList.add('has-custom-bg');
        }

        // Add to recent list (limit 5)
        addToRecentWallpapers({
            id: metadata.id,
            type: metadata.type || (imageUrl.startsWith('data:') ? 'local' : 'web'),
            url: imageUrl,
            thumbnail: metadata.thumbnail || imageUrl,
            title: metadata.title || 'Custom Wallpaper'
        });

        // Update active checkmarks in grid
        highlightActiveCards();
    }

    // Reset wallpaper to theme default
    function resetWallpaper() {
        activeWallpaper = '';

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove(STORAGE_KEY_BG);
        }
        localStorage.removeItem(STORAGE_KEY_BG);

        const bgElement = document.querySelector('.background');
        if (bgElement) {
            bgElement.style.backgroundImage = '';
            bgElement.classList.remove('has-custom-bg');
        }

        renderRecentWallpapers();
        highlightActiveCards();
    }

    // Render Recent Wallpapers (Last 5)
    function renderRecentWallpapers() {
        if (!recentStripEl) return;
        recentStripEl.innerHTML = '';

        if (recentWallpapers.length === 0) {
            recentStripEl.innerHTML = `<div class="wm-recent-empty">No recent wallpapers yet. Select one below or upload from your computer!</div>`;
            return;
        }

        recentWallpapers.slice(0, MAX_RECENT_WALLPAPERS).forEach(item => {
            const card = document.createElement('div');
            const isActive = activeWallpaper === item.url;
            card.className = `wm-recent-card ${isActive ? 'active' : ''}`;
            card.title = `${item.title} (Click to apply)`;

            card.innerHTML = `
                <img src="${item.thumbnail}" alt="${item.title}" loading="lazy" />
                <span class="wm-recent-tag">${item.title}</span>
                ${isActive ? `<span class="wm-recent-active-indicator" title="Active Wallpaper">✓</span>` : ''}
            `;

            card.addEventListener('click', () => {
                applyWallpaper(item.url, item);
            });

            recentStripEl.appendChild(card);
        });
    }

    // Highlight active card in gallery grid
    function highlightActiveCards() {
        const cards = document.querySelectorAll('.wm-card');
        cards.forEach(card => {
            const cardUrl = card.dataset.url;
            const isActive = activeWallpaper && activeWallpaper === cardUrl;
            card.classList.toggle('active', !!isActive);

            let badge = card.querySelector('.wm-card-active-badge');
            if (isActive) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'wm-card-active-badge';
                    badge.innerHTML = '✓';
                    card.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        });

        renderRecentWallpapers();
    }

    // Render Skeleton Loading Placeholders
    function renderSkeletons(count = 12) {
        if (!gridContainer) return;
        gridContainer.innerHTML = '';
        if (statusMessage) statusMessage.classList.add('hidden');

        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'wm-skeleton-card';
            gridContainer.appendChild(skeleton);
        }
    }

    // Fetch wallpapers from Openverse Creative Commons API
    async function fetchWallpapers(query, page = 1) {
        currentQuery = query;
        currentPage = page;

        renderSkeletons(pageSize);

        const encodedQuery = encodeURIComponent(query.trim());
        const endpoint = `https://api.openverse.org/v1/images/?q=${encodedQuery}&page=${page}&page_size=${pageSize}&aspect_ratio=wide`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 9000);

            const response = await fetch(endpoint, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Openverse API returned status ${response.status}`);
            }

            const data = await response.json();
            const results = data.results || [];

            totalPages = Math.min(data.page_count || 1, 50);

            if (results.length === 0) {
                renderEmptyState(`No wallpapers found for "${query}". Try another keyword!`);
                return;
            }

            renderGalleryCards(results);
            updatePaginationUI();

        } catch (err) {
            console.warn('Openverse API fetch failed, loading curated fallback collection:', err.message);
            // Graceful fallback to curated open-source wallpapers
            renderGalleryCards(CURATED_FALLBACK_WALLPAPERS);
            totalPages = 1;
            updatePaginationUI();
            if (statusMessage) {
                statusMessage.innerHTML = `
                    <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-bottom: 8px;">
                        Showing curated open-source collection (Live search offline or rate-limited).
                    </div>
                `;
                statusMessage.classList.remove('hidden');
            }
        }
    }

    // Render Wallpapers Grid Cards
    function renderGalleryCards(items) {
        if (!gridContainer) return;
        gridContainer.innerHTML = '';
        if (statusMessage) statusMessage.classList.add('hidden');

        items.forEach(item => {
            const card = document.createElement('div');
            const imgUrl = item.url;
            const thumbUrl = item.thumbnail || item.url;
            const title = item.title || 'Creative Commons Wallpaper';
            const creator = item.creator || 'Openverse Contributor';
            const license = (item.license || 'CC').toUpperCase();
            const isActive = activeWallpaper === imgUrl;

            card.className = `wm-card ${isActive ? 'active' : ''}`;
            card.dataset.url = imgUrl;

            card.innerHTML = `
                <img src="${thumbUrl}" alt="${title}" loading="lazy" />
                ${isActive ? `<span class="wm-card-active-badge">✓</span>` : ''}
                <div class="wm-card-overlay">
                    <div class="wm-card-header">
                        <span class="wm-cc-badge">${license}</span>
                    </div>
                    <div class="wm-card-footer">
                        <div class="wm-card-title" title="${title}">${title}</div>
                        <div class="wm-card-creator">By ${creator}</div>
                        <button type="button" class="wm-apply-btn">Set as Wallpaper</button>
                    </div>
                </div>
            `;

            // Fallback for broken image URLs
            const imgEl = card.querySelector('img');
            imgEl.addEventListener('error', () => {
                imgEl.src = 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=70';
            });

            // Click on apply button or anywhere on card
            const applyBtn = card.querySelector('.wm-apply-btn');
            applyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                applyWallpaper(imgUrl, {
                    id: item.id,
                    title: title,
                    thumbnail: thumbUrl,
                    type: 'web'
                });
                applyBtn.textContent = 'Applied! ✓';
                setTimeout(() => { applyBtn.textContent = 'Set as Wallpaper'; }, 1800);
            });

            card.addEventListener('click', () => {
                applyWallpaper(imgUrl, {
                    id: item.id,
                    title: title,
                    thumbnail: thumbUrl,
                    type: 'web'
                });
            });

            gridContainer.appendChild(card);
        });
    }

    // Render Empty State
    function renderEmptyState(message) {
        if (!gridContainer) return;
        gridContainer.innerHTML = '';
        if (statusMessage) {
            statusMessage.innerHTML = `
                <div class="wm-status-icon">🔍</div>
                <div>${message}</div>
                <button class="wm-retry-btn" id="wm-empty-reset-btn">Browse Nature Wallpapers</button>
            `;
            statusMessage.classList.remove('hidden');

            const resetSearchBtn = document.getElementById('wm-empty-reset-btn');
            if (resetSearchBtn) {
                resetSearchBtn.addEventListener('click', () => {
                    if (searchInput) searchInput.value = '';
                    fetchWallpapers('wallpaper landscape nature', 1);
                });
            }
        }
    }

    // Update Pagination UI
    function updatePaginationUI() {
        if (currentPageEl) currentPageEl.textContent = currentPage;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;

        if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    }

    // Handle Local File Upload with offscreen compression to respect quota
    function handleFileUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const rawDataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                // 1. Generate optimized wallpaper (max 1920x1080)
                const maxW = 1920, maxH = 1080;
                let w = img.width, h = img.height;
                if (w > maxW || h > maxH) {
                    const ratio = Math.min(maxW / w, maxH / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const optimizedWallpaperUrl = canvas.toDataURL('image/jpeg', 0.82);

                // 2. Generate small thumbnail for recent list (max 280x160)
                const thumbCanvas = document.createElement('canvas');
                const tw = 280, th = 160;
                thumbCanvas.width = tw;
                thumbCanvas.height = th;
                const tctx = thumbCanvas.getContext('2d');
                // Center crop
                const hRatio = img.width / tw;
                const vRatio = img.height / th;
                const sRatio = Math.min(hRatio, vRatio);
                const sWidth = tw * sRatio;
                const sHeight = th * sRatio;
                const sx = (img.width - sWidth) / 2;
                const sy = (img.height - sHeight) / 2;
                tctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, tw, th);
                const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

                // Apply and store
                applyWallpaper(optimizedWallpaperUrl, {
                    id: 'local-' + Date.now(),
                    type: 'local',
                    title: file.name ? file.name.replace(/\.[^/.]+$/, "") : 'Local Upload',
                    thumbnail: thumbUrl
                });
            };
            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
    }

    // Open Modal
    async function openModal() {
        isModalOpen = true;
        await loadStorageData();

        if (backdrop) {
            backdrop.classList.remove('hidden');
            // Allow CSS transition to trigger
            requestAnimationFrame(() => {
                backdrop.classList.add('visible');
            });
        }

        renderRecentWallpapers();

        // ONLY fetch when opened, not on extension open
        if (!hasLoadedGallery) {
            hasLoadedGallery = true;
            fetchWallpapers(currentQuery, 1);
        } else {
            highlightActiveCards();
        }
    }

    // Close Modal
    function closeModal() {
        isModalOpen = false;
        if (backdrop) {
            backdrop.classList.remove('visible');
            setTimeout(() => {
                backdrop.classList.add('hidden');
            }, 300);
        }
    }

    // Bind all event listeners
    function bindEvents() {
        const changeBgBtn = document.getElementById('changeBackgroundBtn');
        if (changeBgBtn) {
            changeBgBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // Close on clicking backdrop outside modal
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    closeModal();
                }
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                closeModal();
            }
        });

        // Upload from explorer
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    handleFileUpload(file);
                    // Reset input so re-selecting same file triggers change
                    fileInput.value = '';
                }
            });
        }

        // Reset to default
        if (resetBtn) {
            resetBtn.addEventListener('click', resetWallpaper);
        }

        // Search bar events
        if (searchBtn && searchInput) {
            const doSearch = () => {
                const q = searchInput.value.trim();
                if (q) {
                    // Unselect tag chips
                    document.querySelectorAll('.wm-tag').forEach(t => t.classList.remove('active'));
                    fetchWallpapers(q, 1);
                }
            };

            searchBtn.addEventListener('click', doSearch);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') doSearch();
            });

            searchInput.addEventListener('input', () => {
                if (clearSearchBtn) {
                    clearSearchBtn.classList.toggle('hidden', !searchInput.value);
                }
            });
        }

        if (clearSearchBtn && searchInput) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearSearchBtn.classList.add('hidden');
                searchInput.focus();
            });
        }

        // Quick Tag Chips
        if (tagsContainer) {
            tagsContainer.addEventListener('click', (e) => {
                const tag = e.target.closest('.wm-tag');
                if (!tag) return;

                document.querySelectorAll('.wm-tag').forEach(t => t.classList.remove('active'));
                tag.classList.add('active');

                const query = tag.dataset.query || tag.textContent;
                if (searchInput) searchInput.value = tag.textContent;
                if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');

                fetchWallpapers(query, 1);
            });
        }

        // Pagination buttons
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    fetchWallpapers(currentQuery, currentPage - 1);
                    if (bodyContainer) bodyContainer.scrollTop = 0;
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    fetchWallpapers(currentQuery, currentPage + 1);
                    if (bodyContainer) bodyContainer.scrollTop = 0;
                }
            });
        }
    }

    // Initialize component on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        initElements();
        bindEvents();
        // Load initial storage silently (no network requests made)
        loadStorageData();
    });
})();
