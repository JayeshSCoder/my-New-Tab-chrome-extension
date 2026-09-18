/*
    Favicons served by the browser itself.

    Needs the "favicon" permission in manifest.json, which lets the extension
    read the favicons Chrome already keeps locally instead of downloading
    them from a third party service.
*/
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

window.getBrowserFaviconUrl = getBrowserFaviconUrl;
