// Background script for handling Chrome extension APIs
console.log('Background script loaded');

// Check if we're in a service worker context
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('Chrome runtime available');
    
    // Only add listener if onMessage exists
    if (chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Message received in background:', message);
            
            if (message.action === 'openDevTools') {
                // Try to open developer tools for the current tab
                if (chrome.tabs && chrome.tabs.query) {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]) {
                            // For Chrome extensions, we can't directly open dev tools
                            sendResponse({ success: false, message: 'Press F12 to open Developer Tools' });
                        }
                    });
                } else {
                    sendResponse({ success: false, message: 'Press F12 to open Developer Tools' });
                }
                return true; // Indicates we will send a response asynchronously
            }
            
            if (message.action === 'reload') {
                if (chrome.tabs && chrome.tabs.query && chrome.tabs.reload) {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]) {
                            chrome.tabs.reload(tabs[0].id);
                            sendResponse({ success: true });
                        }
                    });
                } else {
                    sendResponse({ success: false, message: 'Tab reload not available' });
                }
                return true;
            }
            
            if (message.action === 'goForward') {
                if (chrome.tabs && chrome.tabs.query && chrome.tabs.goForward) {
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
                } else {
                    sendResponse({ success: false, message: 'Tab navigation not available' });
                }
                return true;
            }
        });
    } else {
        console.log('chrome.runtime.onMessage not available');
    }
} else {
    console.log('Chrome runtime API not available in background script');
}
