/*
    Favicons served by the browser itself.

    Needs the "favicon" permission in manifest.json, which lets the extension
    read the favicons Chrome already keeps locally instead of downloading
    them from a third party service. Works on Windows, macOS and Linux.
*/

// Favicon Chrome keeps for a page
function getBrowserFaviconUrl(pageUrl, size = 32) {
    if (!pageUrl) {
        return '';
    }

    try {
        const faviconUrl = new URL(chrome.runtime.getURL('/_favicon/'));
        faviconUrl.searchParams.set('pageUrl', pageUrl);
        faviconUrl.searchParams.set('size', String(size));
        return faviconUrl.toString();
    } catch (error) {
        return '';
    }
}

// Icon of the site itself, used when Chrome has no stored favicon for the page
function getSiteFaviconUrl(pageUrl) {
    try {
        const parsed = new URL(pageUrl);

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return '';
        }

        return `${parsed.origin}/favicon.ico`;
    } catch (error) {
        return '';
    }
}

/*
    Point an <img> at the best available icon and walk through the fallbacks:
    browser favicon -> icon of the site itself -> placeholder
*/
function applyFaviconWithFallback(image, pageUrl, options = {}) {
    const size = options.size || 32;
    const sources = [
        getBrowserFaviconUrl(pageUrl, size),
        getSiteFaviconUrl(pageUrl),
        options.placeholder || ''
    ].filter(Boolean);

    if (!sources.length) {
        image.style.display = 'none';
        return;
    }

    let sourceIndex = 0;

    image.addEventListener('error', () => {
        sourceIndex++;

        if (sourceIndex < sources.length) {
            image.src = sources[sourceIndex];
        } else {
            image.style.display = 'none';
        }
    });

    image.src = sources[0];
}

window.getBrowserFaviconUrl = getBrowserFaviconUrl;
window.getSiteFaviconUrl = getSiteFaviconUrl;
window.applyFaviconWithFallback = applyFaviconWithFallback;
