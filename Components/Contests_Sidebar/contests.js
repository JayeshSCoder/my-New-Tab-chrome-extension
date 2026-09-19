/* 
    Upcoming Contests - Codeforces API integration
*/
let contestsLoaded = false;

// Fetch contests from Codeforces API
async function fetchContests() {
    try {
        const response = await fetch('https://codeforces.com/api/contest.list');
        if (!response.ok) return null;
        const data = await response.json();

        // Filter for upcoming contests and sort by start time
        const contests = data.result
            .filter(contest => contest.phase === "BEFORE")
            .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
            .slice(0, 5); // Limit to top 5 upcoming contests

        return contests;
    } catch (error) {
        return null;
    }
}

// Populate contests in the sidebar
async function populateContests() {
    const contestList = document.getElementById('contests');
    if (!contestList) return;

    contestList.innerHTML = '<li style="text-align:center; padding: 12px; color: rgba(255,255,255,0.6);">Loading contests...</li>';

    const contests = await fetchContests();
    contestList.innerHTML = '';

    if (contests && contests.length > 0) {
        contests.forEach(contest => {
            const startTime = new Date(contest.startTimeSeconds * 1000);

            // Format date as DD/MM
            const formattedDate = `${String(startTime.getDate()).padStart(2, '0')}/${String(startTime.getMonth() + 1).padStart(2, '0')}`;

            // Format time as HH:MM AM/PM
            const hours = startTime.getHours();
            const minutes = String(startTime.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const formattedTime = `${(hours % 12 || 12)}:${minutes} ${ampm}`;

            const listItem = document.createElement('li');
            listItem.title = `Click to view ${contest.name} on Codeforces`;
            listItem.innerHTML = `
                <div class="contest-title">${contest.name}</div>
                <div class="contest-meta">
                    <span class="contest-badge">Codeforces</span>
                    <span class="contest-time">📅 ${formattedDate} • ${formattedTime}</span>
                </div>
            `;

            // Open contest registration or contests list on click
            listItem.addEventListener('click', () => {
                window.open(`https://codeforces.com/contests/${contest.id}`, '_blank');
            });

            contestList.appendChild(listItem);
        });
    } else if (contests && contests.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = "No upcoming contests found";
        emptyItem.style.textAlign = 'center';
        emptyItem.style.color = 'rgba(255, 255, 255, 0.6)';
        contestList.appendChild(emptyItem);
    } else {
        // Display error message when offline
        const errorItem = document.createElement('li');
        errorItem.className = "contest-error";
        errorItem.textContent = "Unable to fetch contests (offline)";
        contestList.appendChild(errorItem);
    }
}

// Toggle sidebar visibility and load contests if not loaded
const sidebarToggleBtn = document.getElementById('sidebarToggle');
if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', async () => {
        const contestList = document.getElementById('contestList');
        const arrow = document.getElementById('arrow');
        if (!contestList) return;

        const isVisible = contestList.style.display === 'block';

        if (isVisible) {
            contestList.style.display = 'none';
            if (arrow) arrow.textContent = '▼';
        } else {
            contestList.style.display = 'block';
            if (arrow) arrow.textContent = '▲';

            // Load contests only if they haven't been loaded yet
            if (!contestsLoaded) {
                await populateContests();
                contestsLoaded = true;
            }
        }
    });
}
