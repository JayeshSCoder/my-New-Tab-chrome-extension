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

                // Save the image URL in Chrome storage with localStorage fallback
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ backgroundImage: imageUrl });
                } else {
                    localStorage.setItem('backgroundImage', imageUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const backgroundElement = document.querySelector('.background');
    if (!backgroundElement) return;

    const applyBg = (imageUrl) => {
        if (imageUrl) {
            backgroundElement.style.backgroundImage = `url(${imageUrl})`;
            backgroundElement.style.backgroundSize = 'cover';
            backgroundElement.style.backgroundPosition = 'center';
            backgroundElement.classList.add('has-custom-bg');
        }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('backgroundImage', (data) => {
            if (data && data.backgroundImage) {
                applyBg(data.backgroundImage);
            } else {
                applyBg(localStorage.getItem('backgroundImage'));
            }
        });
    } else {
        applyBg(localStorage.getItem('backgroundImage'));
    }
});
