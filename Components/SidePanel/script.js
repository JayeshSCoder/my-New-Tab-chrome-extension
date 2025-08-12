const rightDrawer = document.getElementById("right-drawer");
const openDrawerBtn = document.getElementById("open-right-drawer");


// Show drawer & hide button
openDrawerBtn.addEventListener("click", () => {
  rightDrawer.classList.add("open");
  openDrawerBtn.style.display = "none";
});

// Hide drawer when clicking outside
document.addEventListener("click", (e) => {
  if (!rightDrawer.contains(e.target) && !openDrawerBtn.contains(e.target)) {
    rightDrawer.classList.remove("open");
    openDrawerBtn.style.display = "block";
  }
});



// Setup all toggles dynamically
document.addEventListener("DOMContentLoaded", () => {
  const toggles = document.querySelectorAll(".toggle-switch");

  toggles.forEach(toggle => {
    const targetSelector = toggle.dataset.target;
    const targetEl = document.querySelector(targetSelector);

    if (!targetEl) return;

    // Apply saved preference
    const savedValue = localStorage.getItem(toggle.id);
    if (savedValue === "false") {
      toggle.checked = false;
      targetEl.style.display = "none";
    } else {
      toggle.checked = true;
      targetEl.style.display = getDisplayStyle(targetEl);
    }

    // Listen to changes
    toggle.addEventListener("change", () => {
      const isChecked = toggle.checked;
      localStorage.setItem(toggle.id, isChecked);
      targetEl.style.display = isChecked ? getDisplayStyle(targetEl) : "none";
    });
  });

  // Setup refresh favicons button
  const refreshFaviconsBtn = document.getElementById("refresh-favicons");
  if (refreshFaviconsBtn) {
    refreshFaviconsBtn.addEventListener("click", async () => {
      // Add loading state
      refreshFaviconsBtn.classList.add("loading");
      refreshFaviconsBtn.disabled = true;
      
      try {
        // Call the global refresh function
        if (window.refreshBookmarkFavicons) {
          await window.refreshBookmarkFavicons();
        }
      } catch (error) {
        // Error handling without console output
      } finally {
        // Remove loading state
        setTimeout(() => {
          refreshFaviconsBtn.classList.remove("loading");
          refreshFaviconsBtn.disabled = false;
        }, 1000);
      }
    });
  }
});


// Determine the default display style for different elements
function getDisplayStyle(el) {
  if (el.id === "shortcut-drawer") return "flex";
  if (el.id === "aesthetic-bookmark-box") return "block";
  return "block"; // default fallback
}