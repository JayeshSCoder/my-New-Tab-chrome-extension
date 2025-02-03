
/* 
    SIDEBAR
*/
let contestsLoaded = false; // Flag to check if contests are already loaded

// Fetch contests from Codeforces API
async function fetchContests() {
    try {
        const response = await fetch('https://codeforces.com/api/contest.list');
        const data = await response.json();

        // Filter for upcoming contests and sort by start time
        const contests = data.result
            .filter(contest => contest.phase === "BEFORE") // Filter for upcoming contests
            .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds) // Sort by start time ascending
            .slice(0, 4); // Limit to 4 contests

        return contests;
    } catch (error) {
        // console.error('Error fetching contests:', error);
        return null; // Return null on error
    }
}

// Populate contests in the sidebar
async function populateContests() {
    const contests = await fetchContests();
    const contestList = document.getElementById('contests');

    // Clear the existing contests
    contestList.innerHTML = '';

    if (contests) {
        contests.forEach(contest => {
            const startTime = new Date(contest.startTimeSeconds * 1000);

            // Format date as DD/MM/YYYY
            const formattedDate = `${String(startTime.getDate()).padStart(2, '0')}/${String(startTime.getMonth() + 1).padStart(2, '0')}/${startTime.getFullYear()}`;

            // Format time as HH:MM AM/PM
            const hours = startTime.getHours();
            const minutes = String(startTime.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const formattedTime = `${(hours % 12 || 12)}:${minutes} ${ampm}`;

            const listItem = document.createElement('li');
            listItem.textContent = `${contest.name} - Date: ${formattedDate}, Starts at: ${formattedTime}`;
            contestList.appendChild(listItem);
        });
    } else {
        // Display error message when no internet
        const errorItem = document.createElement('li');
        errorItem.textContent = "Oops!! No Internet";
        errorItem.style.color = 'red'; // Optional: change text color to indicate error
        contestList.appendChild(errorItem);

    }
}

// Toggle sidebar visibility and load contests if not loaded
document.getElementById('sidebarToggle').addEventListener('click', async () => {
    const contestList = document.getElementById('contestList');
    const arrow = document.getElementById('arrow');

    if (contestList.style.display === 'block') {
        contestList.style.display = 'none';
        arrow.textContent = '▼'; // Downward arrow
    } else {
        contestList.style.display = 'block';
        arrow.textContent = '▲'; // Upward arrow

        // Load contests only if they haven't been loaded yet
        if (!contestsLoaded) {
            await populateContests();
            contestsLoaded = true; // Set flag to true after loading
        }
    }
});


