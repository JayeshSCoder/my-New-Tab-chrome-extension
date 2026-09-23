/**
 * Background Picker Modal Component
 * Solid colors, gradient presets, and custom color picker for background selection.
 * Supports local file upload from explorer.
 * Enforces a strict 5-item recent backgrounds limit to preserve storage quota.
 * Does NOT call network on tab launch or at any time (fully offline).
 */

(function () {
    // Storage keys
    const STORAGE_KEY_BG = 'backgroundImage';
    const STORAGE_KEY_RECENT = 'recentWallpapers';
    const MAX_RECENT_WALLPAPERS = 5;

    // Curated solid color presets
    const PRESET_COLORS = [
        { id: 'obsidian',         name: 'Obsidian',         hex: '#0a0a0a' },
        { id: 'midnight-blue',    name: 'Midnight Blue',    hex: '#0f172a' },
        { id: 'slate-charcoal',   name: 'Slate Charcoal',   hex: '#1e293b' },
        { id: 'graphite',         name: 'Graphite',         hex: '#374151' },
        { id: 'deep-purple',      name: 'Deep Purple',      hex: '#2e1065' },
        { id: 'forest-green',     name: 'Forest Green',     hex: '#14532d' },
        { id: 'wine-red',         name: 'Wine Red',         hex: '#7f1d1d' },
        { id: 'ocean-teal',       name: 'Ocean Teal',       hex: '#134e4a' },
    ];

    // Curated gradient presets
    const PRESET_GRADIENTS = [
        { id: 'grad-sunset',      name: 'Sunset Glow',      value: 'linear-gradient(135deg, #f97316, #db2777, #7c3aed)' },
        { id: 'grad-ocean',       name: 'Deep Ocean',        value: 'linear-gradient(135deg, #0c4a6e, #164e63, #134e4a)' },
        { id: 'grad-aurora',      name: 'Aurora Borealis',   value: 'linear-gradient(135deg, #065f46, #0e7490, #6d28d9)' },
        { id: 'grad-nebula',      name: 'Cosmic Nebula',     value: 'linear-gradient(135deg, #1e1b4b, #7c3aed, #db2777)' },
        { id: 'grad-midnight',    name: 'Midnight Sky',      value: 'linear-gradient(180deg, #0f172a, #1e293b, #334155)' },
        { id: 'grad-cyber',       name: 'Cyber Neon',        value: 'linear-gradient(135deg, #0f172a, #00f0ff, #ff007f)' },
    ];

    // State
    let isModalOpen = false;
    let activeWallpaper = '';
    let recentWallpapers = [];

    // DOM Elements
    let backdrop, modal, closeBtn, uploadBtn, resetBtn, fileInput;
    let colorGridEl, gradientGridEl;
    let colorPickerInput, pickerHexLabel, applyCustomColorBtn;
    let recentStripEl;
    let bodyContainer;

    function initElements() {
        backdrop = document.getElementById('wallpaper-modal-backdrop');
        modal = document.getElementById('wallpaper-modal');
        closeBtn = document.getElementById('wm-close-btn');
        uploadBtn = document.getElementById('wm-upload-btn');
        resetBtn = document.getElementById('wm-reset-btn');
        fileInput = document.getElementById('backgroundFileInput');

        colorGridEl = document.getElementById('wm-color-grid');
        gradientGridEl = document.getElementById('wm-gradient-grid');

        colorPickerInput = document.getElementById('wm-color-picker');
        pickerHexLabel = document.getElementById('wm-picker-hex-label');
        applyCustomColorBtn = document.getElementById('wm-apply-custom-color-btn');

        recentStripEl = document.getElementById('wm-recent-strip');
        bodyContainer = document.getElementById('wm-body');
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
            type: item.type || 'color',
            url: item.url,
            thumbnail: item.thumbnail || item.url,
            title: item.title || 'Background',
            timestamp: Date.now()
        });

        saveRecentWallpapers();
    }

    // Apply wallpaper/color to tab
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
                bgElement.style.backgroundColor = '';
            } else if (imageUrl.startsWith('#') || imageUrl.startsWith('rgb')) {
                // Solid color
                bgElement.style.backgroundImage = 'none';
                bgElement.style.backgroundColor = imageUrl;
            } else {
                // Image URL (local upload)
                bgElement.style.backgroundImage = `url(${imageUrl})`;
                bgElement.style.backgroundColor = '';
            }
            bgElement.style.backgroundSize = 'cover';
            bgElement.style.backgroundPosition = 'center';
            bgElement.classList.add('has-custom-bg');
            document.body.classList.add('has-custom-bg');
        }

        // Add to recent list (limit 5)
        addToRecentWallpapers({
            id: metadata.id,
            type: metadata.type || 'color',
            url: imageUrl,
            thumbnail: metadata.thumbnail || imageUrl,
            title: metadata.title || 'Custom Background'
        });

        // Update active indicators
        highlightActiveSwatches();
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
            bgElement.style.backgroundColor = '';
            bgElement.classList.remove('has-custom-bg');
            document.body.classList.remove('has-custom-bg');
        }

        renderRecentWallpapers();
        highlightActiveSwatches();
    }

    // Render Recent Backgrounds (Last 5)
    function renderRecentWallpapers() {
        if (!recentStripEl) return;
        recentStripEl.innerHTML = '';

        if (recentWallpapers.length === 0) {
            recentStripEl.innerHTML = `<div class="wm-recent-empty">No recent backgrounds yet. Select a color below or upload an image!</div>`;
            return;
        }

        recentWallpapers.slice(0, MAX_RECENT_WALLPAPERS).forEach(item => {
            const card = document.createElement('div');
            const isActive = activeWallpaper === item.url;
            card.className = `wm-recent-card ${isActive ? 'active' : ''}`;
            card.title = `${item.title} (Click to apply)`;

            // Determine how to render the thumbnail
            const url = item.url || item.thumbnail;
            if (url.startsWith('#') || url.startsWith('rgb')) {
                // Solid color
                card.style.backgroundColor = url;
                card.innerHTML = `
                    <span class="wm-recent-tag">${item.title}</span>
                    ${isActive ? `<span class="wm-recent-active-indicator" title="Active Background">✓</span>` : ''}
                `;
            } else if (url.startsWith('linear-gradient') || url.startsWith('radial-gradient')) {
                // Gradient
                card.style.backgroundImage = url;
                card.innerHTML = `
                    <span class="wm-recent-tag">${item.title}</span>
                    ${isActive ? `<span class="wm-recent-active-indicator" title="Active Background">✓</span>` : ''}
                `;
            } else {
                // Image (local upload)
                card.innerHTML = `
                    <img src="${item.thumbnail}" alt="${item.title}" loading="lazy" />
                    <span class="wm-recent-tag">${item.title}</span>
                    ${isActive ? `<span class="wm-recent-active-indicator" title="Active Background">✓</span>` : ''}
                `;
            }

            card.addEventListener('click', () => {
                applyWallpaper(item.url, item);
            });

            recentStripEl.appendChild(card);
        });
    }

    // Highlight active swatch in color/gradient grids
    function highlightActiveSwatches() {
        const allSwatches = document.querySelectorAll('.wm-color-swatch');
        allSwatches.forEach(swatch => {
            const swatchValue = swatch.dataset.value;
            const isActive = activeWallpaper && activeWallpaper === swatchValue;
            swatch.classList.toggle('active', !!isActive);
        });

        renderRecentWallpapers();
    }

    // Render solid color swatches into grid
    function renderColorGrid() {
        if (!colorGridEl) return;
        colorGridEl.innerHTML = '';

        PRESET_COLORS.forEach(color => {
            const swatch = document.createElement('div');
            const isActive = activeWallpaper === color.hex;
            swatch.className = `wm-color-swatch ${isActive ? 'active' : ''}`;
            swatch.dataset.value = color.hex;
            swatch.title = `${color.name} (${color.hex})`;

            swatch.innerHTML = `
                <div class="wm-swatch-fill" style="background-color: ${color.hex};">
                    ${isActive ? '<span class="wm-swatch-check">✓</span>' : ''}
                </div>
                <span class="wm-swatch-name">${color.name}</span>
                <span class="wm-swatch-hex">${color.hex}</span>
            `;

            swatch.addEventListener('click', () => {
                applyWallpaper(color.hex, {
                    id: color.id,
                    type: 'color',
                    title: color.name,
                    thumbnail: color.hex
                });
            });

            colorGridEl.appendChild(swatch);
        });
    }

    // Render gradient preset swatches into grid
    function renderGradientGrid() {
        if (!gradientGridEl) return;
        gradientGridEl.innerHTML = '';

        PRESET_GRADIENTS.forEach(grad => {
            const swatch = document.createElement('div');
            const isActive = activeWallpaper === grad.value;
            swatch.className = `wm-color-swatch wm-gradient-swatch ${isActive ? 'active' : ''}`;
            swatch.dataset.value = grad.value;
            swatch.title = `${grad.name}`;

            swatch.innerHTML = `
                <div class="wm-swatch-fill" style="background: ${grad.value};">
                    ${isActive ? '<span class="wm-swatch-check">✓</span>' : ''}
                </div>
                <span class="wm-swatch-name">${grad.name}</span>
            `;

            swatch.addEventListener('click', () => {
                applyWallpaper(grad.value, {
                    id: grad.id,
                    type: 'gradient',
                    title: grad.name,
                    thumbnail: grad.value
                });
            });

            gradientGridEl.appendChild(swatch);
        });
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
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);
                const optimizedWallpaperUrl = canvas.toDataURL('image/jpeg', 0.85);

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
        renderColorGrid();
        renderGradientGrid();
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

        // Custom color picker
        if (colorPickerInput) {
            colorPickerInput.addEventListener('input', () => {
                if (pickerHexLabel) {
                    pickerHexLabel.textContent = colorPickerInput.value;
                }
            });
        }

        if (applyCustomColorBtn && colorPickerInput) {
            applyCustomColorBtn.addEventListener('click', () => {
                const hex = colorPickerInput.value;
                applyWallpaper(hex, {
                    id: 'custom-' + hex.replace('#', ''),
                    type: 'color',
                    title: 'Custom ' + hex.toUpperCase(),
                    thumbnail: hex
                });
                // Brief visual feedback
                const originalText = applyCustomColorBtn.querySelector('svg').nextSibling;
                const textNodes = Array.from(applyCustomColorBtn.childNodes).filter(n => n.nodeType === 3);
                if (textNodes.length > 0) {
                    const origText = textNodes[textNodes.length - 1].textContent;
                    textNodes[textNodes.length - 1].textContent = ' Applied! ✓';
                    setTimeout(() => { textNodes[textNodes.length - 1].textContent = origText; }, 1500);
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
