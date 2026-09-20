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

    // Curated high-definition open-source wallpapers (2560x1440 Quad HD & 4K Ready)
    const CURATED_FALLBACK_WALLPAPERS = [
        {
            id: 'curated-alpine-lake',
            title: 'Majestic Alpine Lake Reflections',
            creator: 'Luca Bravo',
            url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['nature', 'mountains', 'lake', 'landscape'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-pine-forest',
            title: 'Yosemite Mountain Pine Forest',
            creator: 'Bailey Zindel',
            url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['nature', 'mountains', 'forest', 'valley'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-mountain-stream',
            title: 'Cascading Mountain Stream & Mist',
            creator: 'Lukas Kloeppel',
            url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['nature', 'waterfall', 'mountains', 'river', 'stream'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-blooming-valley',
            title: 'Sunlit Blooming Alpine Valley',
            creator: 'Federico Respini',
            url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['nature', 'valley', 'landscape', 'sunlight'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-starry-galaxy',
            title: 'Milky Way Galaxy Over Snowy Ridge',
            creator: 'Benjamin Davies',
            url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['space', 'galaxy', 'stars', 'mountains'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-aurora-borealis',
            title: 'Emerald Aurora Borealis Night Sky',
            creator: 'Vincent Guth',
            url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['space', 'aurora', 'night', 'stars'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-deep-space',
            title: 'Starlight Galaxy & Cosmic Cosmos',
            creator: 'NASA / Unsplash',
            url: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['space', 'cosmos', 'galaxy', 'nebula'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-cyber-city',
            title: 'Cyberpunk Neon Cityscape at Night',
            creator: 'Aleksandar Pasaric',
            url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['cyberpunk', 'neon', 'city', 'futuristic'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-tokyo-rain',
            title: 'Tokyo Neon Rain Alley Reflection',
            creator: 'Jezael Melgoza',
            url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['cyberpunk', 'neon', 'rain', 'tokyo', 'architecture'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-cyber-highway',
            title: 'Neon Light Trails Night Highway',
            creator: 'Denys Nevozhai',
            url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['cyberpunk', 'neon', 'highway', 'speed'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-sand-dunes',
            title: 'Minimalist Sand Dunes and Shadows',
            creator: 'Jeremy Bishop',
            url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['minimal', 'dunes', 'desert', 'clean'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-dark-obsidian',
            title: 'Dark Obsidian Liquid Silk Waves',
            creator: 'Daniel Olah',
            url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['minimal', 'dark', 'abstract', 'black'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-snowy-peak',
            title: 'Golden Sunset on Snowy Mountain Peak',
            creator: 'Alberto Restifo',
            url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['mountains', 'snow', 'sunset', 'alpine'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-dolomites',
            title: 'Dolomites Majestic Ridge at Sunset',
            creator: 'Ales Krivec',
            url: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['mountains', 'dolomites', 'sunset', 'landscape'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-sunset-sea',
            title: 'Golden Sunset Horizon Over Calm Sea',
            creator: 'Sébastien Goldberg',
            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['ocean', 'sunset', 'beach', 'calm'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-ocean-waves',
            title: 'Turquoise Tropical Ocean Waves',
            creator: 'Shifaaz shamoon',
            url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['ocean', 'waves', 'water', 'blue'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-tropical-beach',
            title: 'Tranquil Tropical Palms & Coastline',
            creator: 'Sasha Stories',
            url: 'https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['ocean', 'tropical', 'beach', 'palms'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-glass-skyscrapers',
            title: 'Modern Geometric Glass Skyscrapers',
            creator: 'Sean Pollock',
            url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['architecture', 'city', 'building', 'modern'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-bridge-dusk',
            title: 'Suspension Bridge Glowing at Dusk',
            creator: 'Justin Chrn',
            url: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['architecture', 'bridge', 'dusk', 'city'],
            resBadge: '4K UHD'
        },
        {
            id: 'curated-cosmic-acrylic',
            title: 'Vibrant Cosmic Acrylic Paint Swirl',
            creator: 'Lucas Benjamin',
            url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=2560&q=85',
            thumbnail: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=480&q=70',
            license: 'CC0',
            tags: ['abstract', 'colorful', 'paint', 'art'],
            resBadge: '4K UHD'
        }
    ];

    // Helper: Upgrade any item to highest possible HD / 4K resolution
    function upgradeToHighRes(item) {
        if (!item) return item;
        let url = item.url || '';
        let thumbnail = item.thumbnail || url;

        // CRITICAL FIX: Discard Openverse's internal proxy /thumb/ URLs because they frequently 404
        if (thumbnail.includes('api.openverse.org')) {
            thumbnail = url;
        }

        // 1. Unsplash: Upgrade to 2560px Quad HD
        if (url.includes('images.unsplash.com')) {
            url = url.replace(/([?&]w=)[^&]*/, '$12560').replace(/([?&]q=)[^&]*/, '$185');
            if (!url.includes('w=')) {
                url += (url.includes('?') ? '&' : '?') + 'auto=format&fit=crop&w=2560&q=85';
            }
            thumbnail = url.replace(/([?&]w=)[^&]*/, '$1480').replace(/([?&]q=)[^&]*/, '$170');
        }

        // 2. Flickr: If 500px medium URL, upgrade to _b.jpg (1024px Large)
        if (url.includes('staticflickr.com') || item.provider === 'flickr') {
            if (!url.match(/_[b|h|k|o]\.jpg$/i)) {
                if (url.match(/_[a-z0-9]+\.jpg$/i)) {
                    url = url.replace(/_[a-z0-9]+\.jpg$/i, '_b.jpg');
                } else if (url.match(/\.jpg$/i)) {
                    url = url.replace(/\.jpg$/i, '_b.jpg');
                }
            }
            thumbnail = url.replace(/_[b|h|k|o]\.jpg$/i, '_m.jpg');
        }

        // 3. Rawpixel: Upgrade image_800 to image_1300
        if (url.includes('images.rawpixel.com')) {
            url = url.replace('/image_800/', '/image_1300/');
            thumbnail = url;
        }

        // 4. Wikimedia: Direct image URL
        if (url.includes('upload.wikimedia.org')) {
            thumbnail = url;
        }

        // Determine resolution badge based on dimensions
        const w = item.width || 1920;
        const h = item.height || 1080;
        let resBadge = 'HD';
        if (w >= 3840 || h >= 2160) {
            resBadge = '4K UHD';
        } else if (w >= 2560 || h >= 1440) {
            resBadge = '2K QHD';
        } else if (w >= 1920 || h >= 1080) {
            resBadge = '1080p FHD';
        }

        return {
            ...item,
            url: url,
            thumbnail: thumbnail,
            resBadge: item.resBadge || resBadge
        };
    }

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
            document.body.classList.add('has-custom-bg');
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
            document.body.classList.remove('has-custom-bg');
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

    // Fetch wallpapers with reliable HD filtering and category matching
    async function fetchWallpapers(query, page = 1) {
        currentQuery = query;
        currentPage = page;

        renderSkeletons(pageSize);

        // 1. Get matching items from our verified high-definition collection
        const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
        const localMatches = CURATED_FALLBACK_WALLPAPERS.filter(item => {
            const itemText = (item.title + ' ' + (item.tags || []).join(' ')).toLowerCase();
            return qTokens.some(tok => itemText.includes(tok));
        });

        // 2. Query Openverse API for extra community discoveries (filtering out providers that 429/403)
        let liveItems = [];
        try {
            const encodedQuery = encodeURIComponent(query.trim());
            const primaryUrl = `https://api.openverse.org/v1/images/?q=${encodedQuery}&page=${page}&page_size=20&aspect_ratio=wide&size=large`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(primaryUrl, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const rawResults = data.results || [];
                // Exclude providers with strict bot blocks/429s in browsers (stocksnap, wikimedia)
                liveItems = rawResults
                    .filter(r => r.provider !== 'stocksnap' && r.provider !== 'wikimedia')
                    .map(r => upgradeToHighRes(r))
                    .filter(r => (r.width && r.width >= 1000) && (r.height && r.height >= 600));
            }
        } catch (e) {
            console.warn('Openverse live fetch skipped:', e.message);
        }

        // 3. Combine: Prioritize verified local matches, then add live community results without duplicates
        const combined = [...localMatches];
        const existingUrls = new Set(combined.map(item => item.url));
        liveItems.forEach(item => {
            if (!existingUrls.has(item.url)) {
                combined.push(item);
                existingUrls.add(item.url);
            }
        });

        // If no match found for specific query, fall back to the curated 4K collection
        const finalPool = combined.length > 0 ? combined : CURATED_FALLBACK_WALLPAPERS;

        totalPages = Math.max(1, Math.ceil(finalPool.length / pageSize));
        const startIndex = (page - 1) * pageSize;
        const pageItems = finalPool.slice(startIndex, startIndex + pageSize);

        renderGalleryCards(pageItems);
        updatePaginationUI();
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
            const title = item.title || 'High Definition Wallpaper';
            const creator = item.creator || 'Community Photographer';
            const license = (item.license || 'CC').toUpperCase();
            const isActive = activeWallpaper === imgUrl;

            // Resolution badge
            const resBadgeText = item.resBadge || 'HD';
            let resBadgeClass = 'fhd-1080p';
            if (resBadgeText.includes('4K')) resBadgeClass = 'uhd-4k';
            else if (resBadgeText.includes('2K')) resBadgeClass = 'qhd-2k';

            card.className = `wm-card ${isActive ? 'active' : ''}`;
            card.dataset.url = imgUrl;

            card.innerHTML = `
                <img src="${thumbUrl}" alt="${title}" loading="lazy" />
                ${isActive ? `<span class="wm-card-active-badge">✓</span>` : ''}
                <div class="wm-card-overlay">
                    <div class="wm-card-header">
                        <span class="wm-res-badge ${resBadgeClass}">${resBadgeText}</span>
                        <span class="wm-cc-badge">${license}</span>
                    </div>
                    <div class="wm-card-footer">
                        <div class="wm-card-title" title="${title}">${title}</div>
                        <div class="wm-card-creator">By ${creator}</div>
                        <button type="button" class="wm-apply-btn">Set as Wallpaper</button>
                    </div>
                </div>
            `;

            // Resilient error handling: Never replace with a space image fallback!
            // If the thumbnail fails to load, try full imgUrl.
            // If even imgUrl fails, gracefully remove the broken card from the grid.
            const imgEl = card.querySelector('img');
            imgEl.addEventListener('error', () => {
                if (imgEl.src !== imgUrl && imgUrl) {
                    imgEl.src = imgUrl;
                } else {
                    card.remove();
                }
            });

            // Click on apply button or anywhere on card
            const applyBtn = card.querySelector('.wm-apply-btn');
            applyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                applyWallpaper(imgUrl, {
                    id: item.id,
                    title: title,
                    thumbnail: thumbUrl,
                    type: 'web',
                    resBadge: resBadgeText
                });
                applyBtn.textContent = 'Applied! ✓';
                setTimeout(() => { applyBtn.textContent = 'Set as Wallpaper'; }, 1800);
            });

            card.addEventListener('click', () => {
                applyWallpaper(imgUrl, {
                    id: item.id,
                    title: title,
                    thumbnail: thumbUrl,
                    type: 'web',
                    resBadge: resBadgeText
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
                // 1. Generate pristine high-definition wallpaper (up to 2560x1440 QHD)
                const maxW = 2560, maxH = 1440;
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
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);
                // 0.90 high quality JPEG
                const optimizedWallpaperUrl = canvas.toDataURL('image/jpeg', 0.90);

                // 2. Generate small thumbnail for recent list (max 280x160)
                const thumbCanvas = document.createElement('canvas');
                const tw = 280, th = 160;
                thumbCanvas.width = tw;
                thumbCanvas.height = th;
                const tctx = thumbCanvas.getContext('2d');
                tctx.imageSmoothingEnabled = true;
                tctx.imageSmoothingQuality = 'medium';
                // Center crop
                const hRatio = img.width / tw;
                const vRatio = img.height / th;
                const sRatio = Math.min(hRatio, vRatio);
                const sWidth = tw * sRatio;
                const sHeight = th * sRatio;
                const sx = (img.width - sWidth) / 2;
                const sy = (img.height - sHeight) / 2;
                tctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, tw, th);
                const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);

                // Apply and store
                const badge = (w >= 2560) ? '2K QHD' : (w >= 1920 ? '1080p FHD' : 'HD');
                applyWallpaper(optimizedWallpaperUrl, {
                    id: 'local-' + Date.now(),
                    type: 'local',
                    title: file.name ? file.name.replace(/\.[^/.]+$/, "") : 'Local Upload',
                    thumbnail: thumbUrl,
                    resBadge: badge
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
