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
let draggedIndex = null;
let hasDragged = false;
let dragResetTimeout = null;

if (shortcutsContainer) {
    shortcutsContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
    });
}

// Immediate render during parsing so cards are present on first frame
if (shortcutsContainer && shortcuts.length > 0) {
    renderShortcuts();
}

function openShortcutModal(isEdit = false) {
    if (isEdit && editingIndex !== null) {
        const shortcut = shortcuts[editingIndex];
        nameInput.value = shortcut.name;
        urlInput.value = shortcut.url;
    } else {
        editingIndex = null;
        nameInput.value = "";
        urlInput.value = "";
    }
    modal.classList.add("show");
    setTimeout(() => nameInput.focus(), 50);
}

function closeShortcutModal() {
    modal.classList.remove("show");
    editingIndex = null;
    nameInput.value = "";
    urlInput.value = "";
}

function renderShortcuts() {
    shortcutsContainer.innerHTML = "";

    // Add all shortcut cards
    shortcuts.forEach(({ name, url }, index) => {
        const card = document.createElement("div");
        card.className = "shortcut-card";
        card.title = `${name} (${url})`;
        card.draggable = true;
        card.dataset.index = index;

        const formattedURL = url.startsWith("http") ? url : `https://${url}`;
        card.innerHTML = `
            <img alt="favicon" width="28" height="28" draggable="false" />
            <div>${name}</div>
        `;

        // Browser favicon first, then the icon of the site itself
        applyFaviconWithFallback(card.querySelector('img'), formattedURL, { size: 32 });

        // Drag & Drop events for reordering
        card.addEventListener("dragstart", (e) => {
            draggedIndex = index;
            hasDragged = true;
            if (dragResetTimeout) clearTimeout(dragResetTimeout);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", index.toString());
            setTimeout(() => {
                if (draggedIndex !== null) {
                    card.classList.add("dragging");
                }
            }, 0);
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
            document.querySelectorAll(".shortcut-card, #add-shortcut-btn").forEach(el => el.classList.remove("drag-over"));
            draggedIndex = null;
            if (dragResetTimeout) clearTimeout(dragResetTimeout);
            dragResetTimeout = setTimeout(() => {
                hasDragged = false;
            }, 120);
        });

        card.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
        });

        card.addEventListener("dragenter", (e) => {
            e.preventDefault();
            if (draggedIndex !== null && draggedIndex !== index) {
                card.classList.add("drag-over");
            }
        });

        card.addEventListener("dragleave", (e) => {
            if (!card.contains(e.relatedTarget)) {
                card.classList.remove("drag-over");
            }
        });

        card.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            card.classList.remove("drag-over");

            const rawData = e.dataTransfer.getData("text/plain");
            const fromIndex = rawData !== "" ? parseInt(rawData, 10) : draggedIndex;

            if (fromIndex !== null && !isNaN(fromIndex) && fromIndex !== index) {
                const [movedItem] = shortcuts.splice(fromIndex, 1);
                shortcuts.splice(index, 0, movedItem);
                saveAndSyncShortcuts();
                renderShortcuts();
            }
        });

        card.onclick = () => {
            if (hasDragged) return;
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
    const addShortcutBtn = document.createElement("button");
    addShortcutBtn.id = "add-shortcut-btn";
    addShortcutBtn.textContent = "+";
    addShortcutBtn.title = "Add Shortcut";
    addShortcutBtn.onclick = () => {
        openShortcutModal(false);
    };

    // Dropping on "+" moves the dragged shortcut to the end of the list
    addShortcutBtn.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    });

    addShortcutBtn.addEventListener("dragenter", (e) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== shortcuts.length - 1) {
            addShortcutBtn.classList.add("drag-over");
        }
    });

    addShortcutBtn.addEventListener("dragleave", (e) => {
        if (!addShortcutBtn.contains(e.relatedTarget)) {
            addShortcutBtn.classList.remove("drag-over");
        }
    });

    addShortcutBtn.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        addShortcutBtn.classList.remove("drag-over");

        const rawData = e.dataTransfer.getData("text/plain");
        const fromIndex = rawData !== "" ? parseInt(rawData, 10) : draggedIndex;

        if (fromIndex !== null && !isNaN(fromIndex) && fromIndex < shortcuts.length - 1) {
            const [movedItem] = shortcuts.splice(fromIndex, 1);
            shortcuts.push(movedItem);
            saveAndSyncShortcuts();
            renderShortcuts();
        }
    });

    shortcutsContainer.appendChild(addShortcutBtn);
}

function showContextMenu(x, y) {
    contextMenu.innerHTML = `
        <div class="context-option" id="edit-option">✏️ Edit</div>
        <div class="context-option" id="delete-option">🗑️ Delete</div>
    `;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    contextMenu.classList.remove("hidden");

    setTimeout(() => {
        const editOpt = document.getElementById("edit-option");
        const deleteOpt = document.getElementById("delete-option");
        if (editOpt) editOpt.onclick = handleEdit;
        if (deleteOpt) deleteOpt.onclick = handleDelete;
    }, 10);
}

function hideContextMenu() {
    contextMenu.classList.add("hidden");
}

function handleEdit() {
    if (editingIndex !== null) {
        openShortcutModal(true);
    }
    hideContextMenu();
}

function handleDelete() {
    if (editingIndex !== null) {
        shortcuts.splice(editingIndex, 1);
        saveAndSyncShortcuts();
        renderShortcuts();
    }
    hideContextMenu();
}

// Add button opens modal
if (addBtn) {
    addBtn.onclick = () => openShortcutModal(false);
}

// Cancel button hides modal
if (cancelBtn) {
    cancelBtn.onclick = closeShortcutModal;
}

function saveAndSyncShortcuts() {
    localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ shortcuts: shortcuts });
    }
}

// Close when clicking modal backdrop
if (modal) {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeShortcutModal();
        }
    });
}

// Save (either add new or update existing)
if (saveBtn) {
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

        saveAndSyncShortcuts();
        renderShortcuts();
        closeShortcutModal();
    };
}

// Enter key in inputs saves shortcut
[nameInput, urlInput].forEach(input => {
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                saveBtn.click();
            } else if (e.key === "Escape") {
                closeShortcutModal();
            }
        });
    }
});

// Global click hides context menu (unless clicked inside)
document.addEventListener("click", (e) => {
    if (!contextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        hideContextMenu();
        closeShortcutModal();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    renderShortcuts();

    // Sync shortcuts with chrome.storage.local
    if (typeof chrome !== 'undefined' && chrome.storage) {
        if (chrome.storage.local) {
            chrome.storage.local.get('shortcuts', (data) => {
                if (data && Array.isArray(data.shortcuts) && data.shortcuts.length > 0) {
                    shortcuts = data.shortcuts;
                    localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
                    renderShortcuts();
                } else if (shortcuts.length > 0) {
                    // Seed chrome.storage.local with existing localStorage shortcuts
                    chrome.storage.local.set({ shortcuts: shortcuts });
                }
            });
        }
        if (chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes.shortcuts) {
                    shortcuts = changes.shortcuts.newValue || [];
                    localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
                    renderShortcuts();
                }
            });
        }
    }
});
