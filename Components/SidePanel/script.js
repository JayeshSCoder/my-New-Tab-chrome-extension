const rightDrawer = document.getElementById("right-drawer");
const openDrawerBtn = document.getElementById("open-right-drawer");

// Theme management
const THEME_STORAGE_KEY = 'app-theme';
const DEFAULT_THEME = 'glassmorphism';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);

  const themeButtons = document.querySelectorAll('.theme-pill-btn');
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}
window.applyTheme = applyTheme;

// Immediately apply saved theme on initial script load
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
document.documentElement.setAttribute('data-theme', savedTheme);

// Show drawer & hide button
if (openDrawerBtn && rightDrawer) {
  openDrawerBtn.addEventListener("click", () => {
    rightDrawer.classList.add("open");
    openDrawerBtn.style.display = "none";
  });

  // Hide drawer when clicking outside
  document.addEventListener("click", (e) => {
    if (!rightDrawer.contains(e.target) && !openDrawerBtn.contains(e.target)) {
      rightDrawer.classList.remove("open");
      openDrawerBtn.style.display = "flex";
    }
  });
}

// Setup all toggles and theme switcher dynamically
document.addEventListener("DOMContentLoaded", () => {
  // Theme switcher buttons
  const themeButtons = document.querySelectorAll('.theme-pill-btn');
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === savedTheme);
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });
  });

  // Feature toggles
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

  // Options that are only shown while another feature is enabled
  document.querySelectorAll("[data-visible-with]").forEach((option) => {
    const controller = document.getElementById(option.dataset.visibleWith);

    if (!controller) return;

    const syncVisibility = () => {
      option.style.display = controller.checked ? "flex" : "none";
    };

    controller.addEventListener("change", syncVisibility);
    syncVisibility();
  });

  // User name input in drawer
  const userNameInput = document.getElementById("user-name-input");
  if (userNameInput) {
    const savedName = localStorage.getItem("user-name") || "user";
    userNameInput.value = savedName;

    userNameInput.addEventListener("input", (e) => {
      const newName = e.target.value.trim() || "user";
      localStorage.setItem("user-name", newName);
      window.dispatchEvent(new CustomEvent("userchange", { detail: { name: newName } }));
    });
  }

  // Also sync input if username changed via terminal CLI command
  window.addEventListener("userchange", (e) => {
    if (userNameInput && e.detail && e.detail.name) {
      userNameInput.value = e.detail.name;
    }
  });
});

// Determine the default display style for different elements
function getDisplayStyle(el) {
  if (el.id === "shortcut-drawer") return "flex";
  if (el.id === "add-sticky-note-btn") return "flex";
  return "block"; // default fallback
}