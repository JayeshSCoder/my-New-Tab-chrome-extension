const openTabBtn = document.getElementById('open-new-tab-btn');
if (openTabBtn) {
    openTabBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: 'chrome://newtab' });
        } else {
            window.open('../index.html', '_blank');
        }
    });
}
