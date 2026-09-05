

/*
    SEARCH BAR
*/
// Get references to the search input and button
const searchInput = document.querySelector('.search-container input[type="text"]');
const searchButton = document.querySelector('.search-container button');
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');
const clockWidget = document.getElementById('clock-widget');
const CLOCK_POSITION_KEY = 'clock-widget-position-v1';

function performSearch() {
    const query = searchInput.value.trim();
    if (query) {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        searchInput.value = "";
    }
}

// Search on button click
searchButton.addEventListener('click', performSearch);

// Search on "Enter" key press
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        performSearch();
    }
});

function updateClockWidget() {
    if (!clockTime || !clockDate) {
        return;
    }

    const now = new Date();
    clockTime.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    clockDate.textContent = now.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: '2-digit'
    });
}

updateClockWidget();
setInterval(updateClockWidget, 1000);
document.addEventListener('visibilitychange', updateClockWidget);
window.addEventListener('focus', updateClockWidget);

function getSavedClockPosition() {
    try {
        const value = localStorage.getItem(CLOCK_POSITION_KEY);
        return value ? JSON.parse(value) : null;
    } catch (_error) {
        return null;
    }
}

function applyClockPosition(position) {
    if (!clockWidget || !position) return;

    const maxLeft = Math.max(0, window.innerWidth - clockWidget.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - clockWidget.offsetHeight);
    const safeLeft = Math.min(Math.max(0, position.left), maxLeft);
    const safeTop = Math.min(Math.max(0, position.top), maxTop);

    clockWidget.style.position = 'fixed';
    clockWidget.style.left = `${safeLeft}px`;
    clockWidget.style.top = `${safeTop}px`;
    clockWidget.style.right = 'auto';
    clockWidget.style.bottom = 'auto';
    clockWidget.style.transform = 'none';
}

function saveClockPosition(left, top) {
    localStorage.setItem(CLOCK_POSITION_KEY, JSON.stringify({ left, top }));
}

function setupClockDrag() {
    if (!clockWidget) return;

    const savedPosition = getSavedClockPosition();
    if (savedPosition) {
        applyClockPosition(savedPosition);
    }

    let dragging = false;
    let pointerOffsetX = 0;
    let pointerOffsetY = 0;

    clockWidget.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;

        const rect = clockWidget.getBoundingClientRect();
        pointerOffsetX = event.clientX - rect.left;
        pointerOffsetY = event.clientY - rect.top;
        dragging = true;
        clockWidget.style.cursor = 'grabbing';
        clockWidget.setPointerCapture(event.pointerId);
    });

    clockWidget.addEventListener('pointermove', (event) => {
        if (!dragging) return;

        const maxLeft = Math.max(0, window.innerWidth - clockWidget.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - clockWidget.offsetHeight);
        const nextLeft = Math.min(Math.max(0, event.clientX - pointerOffsetX), maxLeft);
        const nextTop = Math.min(Math.max(0, event.clientY - pointerOffsetY), maxTop);

        applyClockPosition({ left: nextLeft, top: nextTop });
    });

    clockWidget.addEventListener('pointerup', (event) => {
        if (!dragging) return;
        dragging = false;
        clockWidget.style.cursor = 'grab';
        clockWidget.releasePointerCapture(event.pointerId);

        const rect = clockWidget.getBoundingClientRect();
        saveClockPosition(rect.left, rect.top);
    });

    window.addEventListener('resize', () => {
        const position = getSavedClockPosition();
        if (position) {
            applyClockPosition(position);
        }
    });
}

setupClockDrag();




/*
    Change Background
*/
document.addEventListener('DOMContentLoaded', () => {
    const changeBackgroundBtn = document.getElementById('changeBackgroundBtn');
    const backgroundFileInput = document.getElementById('backgroundFileInput');

    // Open file input when "Change Background" button is clicked
    changeBackgroundBtn.addEventListener('click', () => {
        backgroundFileInput.click();
    });

    // Handle file selection and store as background image
    backgroundFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const imageUrl = e.target.result;

                // Save the image URL in Chrome storage
                chrome.storage.local.set({ backgroundImage: imageUrl }, () => {
                    // Background image updated
                });
            };
            reader.readAsDataURL(file);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const backgroundElement = document.querySelector('.background');

    // Retrieve and set the background image from Chrome storage
    chrome.storage.local.get('backgroundImage', (data) => {
        if (data.backgroundImage && backgroundElement) {
            backgroundElement.style.backgroundImage = `url(${data.backgroundImage})`;
            backgroundElement.style.backgroundSize = 'cover';
            backgroundElement.style.backgroundPosition = 'center';
        }
    });
});
