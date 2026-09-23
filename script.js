/*
    SEARCH BAR & CLOCK
*/
// Get references to elements
const searchInput = document.querySelector('.search-container input[type="text"]');
const searchButton = document.querySelector('.search-container button');
const clockWidget = document.getElementById('clock-widget');
const clockGreeting = document.getElementById('clock-greeting');
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');

function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    // Direct navigation if user typed a full URL or valid domain
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    if (query.startsWith('http://') || query.startsWith('https://')) {
        window.location.href = query;
    } else if (urlPattern.test(query) && !query.includes(' ')) {
        window.location.href = `https://${query}`;
    } else {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
    searchInput.value = "";
}

// Search on button click
if (searchButton) {
    searchButton.addEventListener('click', performSearch);
}

// Search on "Enter" key press
if (searchInput) {
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
}

function updateClockWidget() {
    if (!clockTime || !clockDate) {
        return;
    }

    const now = new Date();
    const hours = now.getHours();

    if (clockGreeting) {
        let greeting = "Good morning";
        if (hours >= 12 && hours < 17) {
            greeting = "Good afternoon";
        } else if (hours >= 17 && hours < 22) {
            greeting = "Good evening";
        } else if (hours >= 22 || hours < 5) {
            greeting = "Good night";
        }
        clockGreeting.textContent = greeting;
    }

    clockTime.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // Show AM / PM
    });

    clockDate.textContent = now.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

updateClockWidget();
setInterval(updateClockWidget, 1000);

// Remove preload transition blocker after the initial paint is stable
window.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.documentElement.classList.remove('preload');
        });
    });
});




/*
    Change Background is managed by Components/WallpaperModal/wallpaper-modal.js
*/

document.addEventListener('DOMContentLoaded', () => {
    const backgroundElement = document.querySelector('.background');
    if (!backgroundElement) return;

    const applyBg = (imageUrl) => {
        if (!imageUrl) {
            backgroundElement.style.backgroundImage = '';
            backgroundElement.style.backgroundColor = '';
            backgroundElement.classList.remove('has-custom-bg');
            document.body.classList.remove('has-custom-bg');
            return;
        }

        if (imageUrl.startsWith('linear-gradient') || imageUrl.startsWith('radial-gradient')) {
            backgroundElement.style.backgroundImage = imageUrl;
            backgroundElement.style.backgroundColor = '';
        } else if (imageUrl.startsWith('#') || imageUrl.startsWith('rgb')) {
            // Solid color
            backgroundElement.style.backgroundImage = 'none';
            backgroundElement.style.backgroundColor = imageUrl;
        } else {
            backgroundElement.style.backgroundImage = `url(${imageUrl})`;
            backgroundElement.style.backgroundColor = '';
        }
        backgroundElement.style.backgroundSize = 'cover';
        backgroundElement.style.backgroundPosition = 'center';
        backgroundElement.classList.add('has-custom-bg');
        document.body.classList.add('has-custom-bg');
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('backgroundImage', (data) => {
            if (data && data.backgroundImage) {
                applyBg(data.backgroundImage);
            } else {
                applyBg(localStorage.getItem('backgroundImage'));
            }
        });

        // Listen for live background updates from popup
        if (chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && 'backgroundImage' in changes) {
                    applyBg(changes.backgroundImage.newValue);
                }
            });
        }
    } else {
        applyBg(localStorage.getItem('backgroundImage'));
    }
});
