// Background script for handling Chrome extension APIs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openDevTools') {
        // Try to open developer tools for the current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // For Chrome extensions, we can't directly open dev tools
                // But we can try using chrome.debugger API if we have permission
                // Or provide alternative functionality
                
                // Alternative: Focus on the tab and send a response
                chrome.tabs.update(tabs[0].id, { active: true }, () => {
                    sendResponse({ success: false, message: 'Press F12 to open Developer Tools' });
                });
            }
        });
        return true; // Indicates we will send a response asynchronously
    }
    
    if (message.action === 'reload') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.reload(tabs[0].id);
                sendResponse({ success: true });
            }
        });
        return true;
    }
    
    if (message.action === 'goForward') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.goForward(tabs[0].id, () => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, message: 'No forward history available' });
                    } else {
                        sendResponse({ success: true });
                    }
                });
            }
        });
        return true;
    }
});
