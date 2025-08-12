// Custom Context Menu Implementation
class CustomContextMenu {
    constructor() {
        this.menu = null;
        this.init();
    }

    init() {
        this.createMenu();
        this.setupEventListeners();
    }

    createMenu() {
        // Create the context menu HTML
        const menuHTML = `
            <div id="customContextMenu" class="custom-context-menu">
                <div class="context-menu-item reload" data-action="reload">
                    Reload
                </div>
                <div class="context-menu-item forward" data-action="forward">
                    Forward
                </div>
                <div class="context-menu-item inspect" data-action="inspect">
                    Inspect
                </div>
            </div>
        `;

        // Add the menu to the document
        document.body.insertAdjacentHTML('beforeend', menuHTML);
        this.menu = document.getElementById('customContextMenu');

        // Add click handlers for menu items
        this.menu.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (action) {
                this.handleAction(action);
                this.hideMenu();
            }
        });
    }

    setupEventListeners() {
        // Prevent default context menu and show custom menu
        document.addEventListener('contextmenu', (e) => {
            // Check if the right-click is on a shortcut or shortcut-related element
            if (this.isShortcutElement(e.target)) {
                // Allow default context menu for shortcuts
                return;
            }
            
            e.preventDefault();
            this.showMenu(e.pageX, e.pageY);
        });

        // Hide menu on click anywhere else
        document.addEventListener('click', () => {
            this.hideMenu();
        });

        // Hide menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideMenu();
            }
        });

        // Hide menu on scroll
        document.addEventListener('scroll', () => {
            this.hideMenu();
        });
    }

    isShortcutElement(element) {
        // Check if the element or any of its parents is a shortcut-related element
        let currentElement = element;
        
        while (currentElement && currentElement !== document.body) {
            // Check for shortcut-related classes and IDs
            if (currentElement.classList && (
                currentElement.classList.contains('shortcut-card') ||
                currentElement.classList.contains('shortcut-drawer') ||
                currentElement.id === 'shortcut-drawer' ||
                currentElement.id === 'shortcuts-container' ||
                currentElement.id === 'add-shortcut-btn' ||
                currentElement.id === 'shortcut-modal' ||
                currentElement.closest('#shortcut-drawer') ||
                currentElement.closest('#shortcut-modal') ||
                currentElement.closest('.shortcut-card')
            )) {
                return true;
            }
            
            // Also check if it's inside the bookmark sidebar or aesthetic bookmark box
            if (currentElement.classList && (
                currentElement.classList.contains('bookmark-sidebar') ||
                currentElement.classList.contains('bookmark-list') ||
                currentElement.classList.contains('aesthetic-bookmark-box') ||
                currentElement.id === 'aesthetic-bookmark-box' ||
                currentElement.closest('.bookmark-sidebar') ||
                currentElement.closest('.aesthetic-bookmark-box')
            )) {
                return true;
            }
            
            currentElement = currentElement.parentElement;
        }
        
        return false;
    }

    showMenu(x, y) {
        if (!this.menu) return;

        // Position the menu at cursor location
        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;

        // Ensure menu doesn't go off-screen
        const rect = this.menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Adjust horizontal position if menu goes off right edge
        if (x + rect.width > windowWidth) {
            this.menu.style.left = `${windowWidth - rect.width - 10}px`;
        }

        // Adjust vertical position if menu goes off bottom edge
        if (y + rect.height > windowHeight) {
            this.menu.style.top = `${windowHeight - rect.height - 10}px`;
        }

        // Show the menu
        this.menu.classList.add('show');
    }

    hideMenu() {
        if (this.menu) {
            this.menu.classList.remove('show');
        }
    }

    handleAction(action) {
        switch (action) {
            case 'reload':
                this.reload();
                break;
            case 'forward':
                this.forward();
                break;
            case 'inspect':
                this.inspect();
                break;
        }
    }

    reload() {
        // Use Chrome API if available, otherwise fallback to window.location.reload
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ action: 'reload' }, (response) => {
                if (chrome.runtime.lastError || !response?.success) {
                    // Fallback to direct reload
                    window.location.reload();
                }
            });
        } else {
            window.location.reload();
        }
    }

    forward() {
        // Use Chrome API if available, otherwise fallback to history.forward
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ action: 'goForward' }, (response) => {
                if (chrome.runtime.lastError || !response?.success) {
                    // Fallback to browser history
                    if (window.history.length > 1) {
                        window.history.forward();
                    } else {
                        this.showNotification(response?.message || 'No forward history available');
                    }
                }
            });
        } else {
            if (window.history.length > 1) {
                window.history.forward();
            } else {
                this.showNotification('No forward history available');
            }
        }
    }

    inspect() {
        // For New Tab page, we'll implement a practical alternative
        // Since opening DevTools programmatically is restricted
        
        // Option 1: Try keyboard shortcut simulation (most reliable)
        this.simulateDevToolsShortcut();
        
        // Option 2: Show helpful information
        this.showInspectHelp();
    }
    
    simulateDevToolsShortcut() {
        // Create a keyboard event for F12
        try {
            const event = new KeyboardEvent('keydown', {
                key: 'F12',
                code: 'F12',
                keyCode: 123,
                which: 123,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(event);
            
            // Also try Ctrl+Shift+I
            const ctrlShiftI = new KeyboardEvent('keydown', {
                key: 'I',
                code: 'KeyI',
                keyCode: 73,
                which: 73,
                ctrlKey: true,
                shiftKey: true,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(ctrlShiftI);
            
        } catch (error) {
            // Error handling without console output
        }
    }
    
    showInspectHelp() {
        // Create a more detailed help dialog
        const helpDialog = document.createElement('div');
        helpDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2c2c2c, #404040);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
            z-index: 10002;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 350px;
            text-align: center;
            border: 1px solid #555;
        `;
        
        helpDialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #fff;">Open Developer Tools</h3>
            <p style="margin: 10px 0; line-height: 1.5;">Use one of these keyboard shortcuts:</p>
            <div style="background: #1a1a1a; padding: 10px; border-radius: 6px; margin: 10px 0;">
                <strong>F12</strong> or <strong>Ctrl + Shift + I</strong>
            </div>
            <p style="margin: 10px 0; font-size: 12px; color: #ccc;">
                Right-click on any element and select "Inspect Element" for element-specific inspection.
            </p>
            <button id="closeInspectHelp" style="
                background: #007acc;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
                font-size: 13px;
            ">Got it!</button>
        `;
        
        document.body.appendChild(helpDialog);
        
        // Close button functionality
        const closeBtn = helpDialog.querySelector('#closeInspectHelp');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(helpDialog);
        });
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (helpDialog.parentNode) {
                helpDialog.parentNode.removeChild(helpDialog);
            }
        }, 8000);
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && helpDialog.parentNode) {
                document.body.removeChild(helpDialog);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    showNotification(message) {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the custom context menu when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CustomContextMenu();
});

// Also initialize if the script is loaded after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CustomContextMenu();
    });
} else {
    new CustomContextMenu();
}
