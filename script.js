

/*
    SEARCH BAR
*/
// Get references to the search input and button
const searchInput = document.querySelector('.search-container input[type="text"]');
const searchButton = document.querySelector('.search-container button');
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');

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
