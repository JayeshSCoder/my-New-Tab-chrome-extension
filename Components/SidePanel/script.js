const rightDrawer = document.getElementById("right-drawer");
const openRightDrawerBtn = document.getElementById("open-right-drawer");

const toggleContests = document.getElementById("toggle-contests");
const toggleShortcuts = document.getElementById("toggle-shortcuts");

const contestSidebar = document.querySelector(".sidebar");
const shortcutDrawer = document.getElementById("shortcut-drawer");

// Toggle drawer visibility
openRightDrawerBtn.addEventListener("click", () => {
    rightDrawer.classList.toggle("visible");
});

// Load saved preferences
document.addEventListener("DOMContentLoaded", () => {
    const showContests = localStorage.getItem("showContests");
    const showShortcuts = localStorage.getItem("showShortcuts");

    if (showContests === "false") {
        contestSidebar.style.display = "none";
        toggleContests.checked = false;
    }

    if (showShortcuts === "false") {
        shortcutDrawer.style.display = "none";
        toggleShortcuts.checked = false;
    }
});

// Handle toggles
toggleContests.addEventListener("change", () => {
    const isVisible = toggleContests.checked;
    contestSidebar.style.display = isVisible ? "block" : "none";
    localStorage.setItem("showContests", isVisible);
});

toggleShortcuts.addEventListener("change", () => {
    const isVisible = toggleShortcuts.checked;
    shortcutDrawer.style.display = isVisible ? "flex" : "none";
    localStorage.setItem("showShortcuts", isVisible);
});




const openDrawerBtn = document.getElementById("open-right-drawer");

openDrawerBtn.addEventListener("click", () => {
    rightDrawer.classList.add("open");
    openDrawerBtn.style.display = "none";
});

// Hide drawer when clicking outside
document.addEventListener("click", (e) => {
    const isClickInsideDrawer = rightDrawer.contains(e.target);
    const isClickOnButton = openDrawerBtn.contains(e.target);

    if (!isClickInsideDrawer && !isClickOnButton) {
        rightDrawer.classList.remove("open");
        openDrawerBtn.style.display = "block";
    }
});
