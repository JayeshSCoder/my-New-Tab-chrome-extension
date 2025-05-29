const addBtn = document.getElementById("add-shortcut-btn");
const modal = document.getElementById("shortcut-modal");
const saveBtn = document.getElementById("save-shortcut");
const cancelBtn = document.getElementById("cancel-shortcut");
const nameInput = document.getElementById("shortcut-name");
const urlInput = document.getElementById("shortcut-url");
const shortcutsContainer = document.getElementById("shortcuts-container");

// Create context menu
const contextMenu = document.createElement("div");
contextMenu.id = "custom-context-menu";
contextMenu.classList.add("hidden");
document.body.appendChild(contextMenu);

let shortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];
let editingIndex = null;

function renderShortcuts() {
    shortcutsContainer.innerHTML = "";

    // Add all shortcut cards
    shortcuts.forEach(({ name, url }, index) => {
        const card = document.createElement("div");
        card.className = "shortcut-card";

        const formattedURL = url.startsWith("http") ? url : `https://${url}`;
        const faviconURL = `https://www.google.com/s2/favicons?sz=64&domain_url=${formattedURL}`;

        card.innerHTML = `
      <img src="${faviconURL}" alt="favicon" width="24" height="24" style="margin-bottom: 6px;" />
      <div style="font-size: 13px;">${name}</div>
    `;

        card.onclick = () => {
            window.location.href = formattedURL;
        };

        card.oncontextmenu = (e) => {
            e.preventDefault();
            editingIndex = index;
            showContextMenu(e.pageX, e.pageY);
        };

        shortcutsContainer.appendChild(card);
    });

    // Add the "+" button
    const addBtn = document.createElement("button");
    addBtn.id = "add-shortcut-btn";
    addBtn.textContent = "+";
    addBtn.onclick = () => {
        editingIndex = null;
        nameInput.value = "";
        urlInput.value = "";
        modal.style.display = "block";
    };

    shortcutsContainer.appendChild(addBtn);
}


function showContextMenu(x, y) {
    contextMenu.innerHTML = `
    <div class="context-option" id="edit-option">📝 Edit</div>
    <div class="context-option" id="delete-option">❌ Delete</div>
  `;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    contextMenu.classList.remove("hidden");

    // Delay attaching events so the menu isn't instantly hidden
    setTimeout(() => {
        document.getElementById("edit-option").onclick = handleEdit;
        document.getElementById("delete-option").onclick = handleDelete;
    }, 10);
}

function hideContextMenu() {
    contextMenu.classList.add("hidden");
}

function handleEdit() {
    if (editingIndex !== null) {
        const shortcut = shortcuts[editingIndex];
        nameInput.value = shortcut.name;
        urlInput.value = shortcut.url;
        modal.style.display = "block";
    }
    hideContextMenu();
}

function handleDelete() {
    if (editingIndex !== null) {
        shortcuts.splice(editingIndex, 1);
        localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
        renderShortcuts();
    }
    hideContextMenu();
}

// Add button opens modal
addBtn.onclick = () => {
    editingIndex = null;
    nameInput.value = "";
    urlInput.value = "";
    modal.style.display = "block";
};

// Cancel button hides modal
cancelBtn.onclick = () => {
    modal.style.display = "none";
    editingIndex = null;
    nameInput.value = "";
    urlInput.value = "";
};

// Save (either add new or update existing)
saveBtn.onclick = () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
        alert("Please enter both name and URL.");
        return;
    }

    if (editingIndex !== null) {
        // Update existing shortcut
        shortcuts[editingIndex] = { name, url };
    } else {
        // Add new shortcut
        shortcuts.push({ name, url });
    }

    localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
    renderShortcuts();
    modal.style.display = "none";
    editingIndex = null;
};

// Global click hides context menu (unless clicked inside)
document.addEventListener("click", (e) => {
    if (!contextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

document.addEventListener("DOMContentLoaded", renderShortcuts);

