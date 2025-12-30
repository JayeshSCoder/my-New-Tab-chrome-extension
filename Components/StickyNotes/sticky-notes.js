// Sticky Notes Functionality
class StickyNotes {
    constructor() {
        this.notes = [];
        this.dragData = {
            isDragging: false,
            currentNote: null,
            startX: 0,
            startY: 0,
            initialX: 0,
            initialY: 0,
            animationFrame: null
        };
        this.noteCounter = 0;
        this.colors = ['yellow', 'pink', 'blue', 'green', 'purple'];
        
        this.init();
    }

    init() {
        this.setupAddButton();
        this.loadNotesFromStorage();
        this.setupEventListeners();
    }

    setupAddButton() {
        const addBtn = document.getElementById('add-sticky-note-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.createNote());
            
            // Add pulse animation if no notes exist
            setTimeout(() => {
                if (this.notes.length === 0) {
                    addBtn.classList.add('pulse');
                }
            }, 2000);
        }
    }

    setupEventListeners() {
        // Global mouse events for dragging
        document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: false });
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Prevent text selection during drag
        document.addEventListener('selectstart', (e) => {
            if (this.dragData.isDragging) {
                e.preventDefault();
            }
        });

        // Auto-save notes periodically (reduced frequency to improve performance)
        setInterval(() => {
            this.saveNotesToStorage();
        }, 10000);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Handle sticky notes toggle
        this.setupStickyNotesToggle();
        
        // Setup clear empty notes functionality
        this.setupClearEmptyNotes();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup settings panel observer
        this.setupSettingsPanelObserver();
    }

    setupSettingsPanelObserver() {
        const rightDrawer = document.getElementById('right-drawer');
        if (rightDrawer) {
            // Create a mutation observer to watch for class changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const isOpen = rightDrawer.classList.contains('open');
                        this.adjustNotesZIndex(isOpen);
                    }
                });
            });

            observer.observe(rightDrawer, {
                attributes: true,
                attributeFilter: ['class']
            });

            // Also check initial state
            this.adjustNotesZIndex(rightDrawer.classList.contains('open'));
        }
    }

    adjustNotesZIndex(settingsPanelOpen) {
        const allNotes = document.querySelectorAll('.sticky-note');
        const baseZIndex = settingsPanelOpen ? 500 : 1000; // Lower z-index when settings panel is open
        
        allNotes.forEach((noteElement, index) => {
            const noteId = noteElement.getAttribute('data-note-id');
            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                const newZIndex = baseZIndex + note.zIndex - 1000 + index;
                noteElement.style.zIndex = newZIndex;
                
                // Add/remove dimmed effect
                if (settingsPanelOpen) {
                    noteElement.classList.add('dimmed');
                } else {
                    noteElement.classList.remove('dimmed');
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+N or Cmd+N to create new note (only if not in input field)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.createNote();
            }
            
            // Escape to stop dragging
            if (e.key === 'Escape' && this.dragData.isDragging) {
                this.handleMouseUp();
            }
        });
    }

    setupClearEmptyNotes() {
        const clearBtn = document.getElementById('clear-empty-notes');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.deleteEmptyNotes();
            });
            
            // Check for empty notes periodically and update button style
            setInterval(() => {
                this.updateClearButtonState();
            }, 3000);
        }
    }

    updateClearButtonState() {
        const clearBtn = document.getElementById('clear-empty-notes');
        if (!clearBtn) return;
        
        const emptyNotesCount = this.notes.filter(note => !note.content.trim()).length;
        
        if (emptyNotesCount > 0) {
            clearBtn.style.background = 'rgba(255, 152, 0, 0.8)';
            clearBtn.title = `Clear ${emptyNotesCount} empty note${emptyNotesCount > 1 ? 's' : ''}`;
        } else {
            clearBtn.style.background = '';
            clearBtn.title = 'No empty notes to clear';
        }
    }

    deleteEmptyNotes() {
        const emptyNotes = this.notes.filter(note => !note.content.trim());
        
        if (emptyNotes.length === 0) {
            // Visual feedback that no empty notes were found
            const clearBtn = document.getElementById('clear-empty-notes');
            if (clearBtn) {
                const originalText = clearBtn.innerHTML;
                clearBtn.innerHTML = '✅';
                setTimeout(() => {
                    clearBtn.innerHTML = originalText;
                }, 1000);
            }
            return;
        }

        // Delete all empty notes
        emptyNotes.forEach(note => {
            this.deleteNote(note.id);
        });

        // Visual feedback
        const clearBtn = document.getElementById('clear-empty-notes');
        if (clearBtn) {
            const originalText = clearBtn.innerHTML;
            clearBtn.innerHTML = `✅ ${emptyNotes.length}`;
            setTimeout(() => {
                clearBtn.innerHTML = originalText;
            }, 2000);
        }
    }

    handleWindowResize() {
        this.notes.forEach(note => {
            const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
            if (noteElement) {
                // Ensure notes stay within screen bounds
                const maxX = window.innerWidth - noteElement.offsetWidth;
                const maxY = window.innerHeight - noteElement.offsetHeight;
                
                if (note.x > maxX) {
                    note.x = Math.max(0, maxX);
                    noteElement.style.left = `${note.x}px`;
                }
                
                if (note.y > maxY) {
                    note.y = Math.max(0, maxY);
                    noteElement.style.top = `${note.y}px`;
                }
            }
        });
        this.saveNotesToStorage();
    }

    setupStickyNotesToggle() {
        const toggle = document.getElementById('toggle-sticky-notes');
        if (toggle) {
            toggle.addEventListener('change', () => {
                const isEnabled = toggle.checked;
                const addBtn = document.getElementById('add-sticky-note-btn');
                const allNotes = document.querySelectorAll('.sticky-note');
                
                if (isEnabled) {
                    if (addBtn) addBtn.style.display = 'flex';
                    allNotes.forEach(note => note.style.display = 'block');
                } else {
                    if (addBtn) addBtn.style.display = 'none';
                    allNotes.forEach(note => note.style.display = 'none');
                }
            });
        }
    }

    createNote(data = null) {
        const noteId = data?.id || `note_${Date.now()}_${++this.noteCounter}`;
        const color = data?.color || this.colors[Math.floor(Math.random() * this.colors.length)];
        
        // Check if settings panel is open to set appropriate z-index
        const rightDrawer = document.getElementById('right-drawer');
        const settingsPanelOpen = rightDrawer && rightDrawer.classList.contains('open');
        const baseZIndex = settingsPanelOpen ? 500 : 1000;
        
        const note = {
            id: noteId,
            content: data?.content || '',
            x: data?.x || Math.random() * (window.innerWidth - 300),
            y: data?.y || Math.random() * (window.innerHeight - 200),
            width: data?.width || 250,
            height: data?.height || 180,
            color: color,
            zIndex: data?.zIndex || 1000 // Store relative z-index
        };

        const noteElement = this.createNoteElement(note);
        document.body.appendChild(noteElement);
        
        this.notes.push(note);
        this.saveNotesToStorage();
        
        // Remove pulse animation from add button when first note is created
        const addBtn = document.getElementById('add-sticky-note-btn');
        if (addBtn && this.notes.length === 1) {
            addBtn.classList.remove('pulse');
        }
        
        // Focus on textarea for new notes
        if (!data) {
            const textarea = noteElement.querySelector('.sticky-note-textarea');
            textarea.focus();
        }

        return noteElement;
    }

    createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = `sticky-note ${note.color} ${!note.content ? 'new' : ''}`;
        noteDiv.style.left = `${note.x}px`;
        noteDiv.style.top = `${note.y}px`;
        noteDiv.style.width = `${note.width}px`;
        noteDiv.style.height = `${note.height}px`;
        noteDiv.setAttribute('data-note-id', note.id);

        // Set z-index based on current settings panel state
        const rightDrawer = document.getElementById('right-drawer');
        const settingsPanelOpen = rightDrawer && rightDrawer.classList.contains('open');
        const baseZIndex = settingsPanelOpen ? 500 : 1000;
        const displayZIndex = baseZIndex + (note.zIndex - 1000);
        noteDiv.style.zIndex = displayZIndex;

        // Check if sticky notes are enabled
        const toggle = document.getElementById('toggle-sticky-notes');
        if (toggle && !toggle.checked) {
            noteDiv.style.display = 'none';
        }

        noteDiv.innerHTML = `
            <div class="sticky-note-header">
                <div class="sticky-note-title">📝 Note</div>
                <div class="sticky-note-controls">
                    <button class="sticky-note-btn color-btn" title="Change Color">🎨</button>
                    <button class="sticky-note-btn delete-btn" title="Delete Note">🗑️</button>
                </div>
                <div class="color-picker">
                    <div class="color-options">
                        <div class="color-option yellow" data-color="yellow"></div>
                        <div class="color-option pink" data-color="pink"></div>
                        <div class="color-option blue" data-color="blue"></div>
                        <div class="color-option green" data-color="green"></div>
                        <div class="color-option purple" data-color="purple"></div>
                    </div>
                </div>
            </div>
            <div class="sticky-note-content">
                <textarea class="sticky-note-textarea" placeholder="Type your note here...">${note.content}</textarea>
            </div>
        `;

        this.setupNoteEventListeners(noteDiv, note);
        return noteDiv;
    }

    setupNoteEventListeners(noteElement, note) {
        const header = noteElement.querySelector('.sticky-note-header');
        const deleteBtn = noteElement.querySelector('.delete-btn');
        const colorBtn = noteElement.querySelector('.color-btn');
        const colorPicker = noteElement.querySelector('.color-picker');
        const colorOptions = noteElement.querySelectorAll('.color-option');
        const textarea = noteElement.querySelector('.sticky-note-textarea');

        // Dragging functionality
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.sticky-note-btn')) return;
            this.startDrag(e, noteElement, note);
        });

        // Delete functionality
        deleteBtn.addEventListener('click', () => {
            this.deleteNote(note.id);
        });

        // Color picker functionality
        colorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            colorPicker.classList.toggle('show');
        });

        // Color selection
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                const newColor = option.getAttribute('data-color');
                this.changeNoteColor(noteElement, note, newColor);
                colorPicker.classList.remove('show');
            });
        });

        // Close color picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.color-picker') && !e.target.closest('.color-btn')) {
                colorPicker.classList.remove('show');
            }
        });

        // Content auto-save with debouncing
        let saveTimeout;
        textarea.addEventListener('input', () => {
            note.content = textarea.value;
            
            // Debounce saving to reduce lag
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveNotesToStorage();
                this.updateClearButtonState(); // Update clear button state after content change
            }, 1000);
        });

        // Resize functionality with debouncing
        let resizeTimeout;
        new ResizeObserver(entries => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                for (let entry of entries) {
                    const rect = entry.contentRect;
                    note.width = rect.width;
                    note.height = rect.height;
                    this.saveNotesToStorage();
                }
            }, 500);
        }).observe(noteElement);

        // Bring to front on click
        noteElement.addEventListener('mousedown', () => {
            this.bringToFront(noteElement, note);
        });
    }

    startDrag(e, noteElement, note) {
        this.dragData.isDragging = true;
        this.dragData.currentNote = { element: noteElement, data: note };
        this.dragData.startX = e.clientX;
        this.dragData.startY = e.clientY;
        this.dragData.initialX = note.x;
        this.dragData.initialY = note.y;

        noteElement.classList.add('dragging');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        
        // Add grab cursor to the dragging element
        noteElement.style.cursor = 'grabbing';
        
        e.preventDefault();
        e.stopPropagation();
    }

    handleMouseMove(e) {
        if (!this.dragData.isDragging || !this.dragData.currentNote) return;

        // Use requestAnimationFrame for smoother dragging
        if (this.dragData.animationFrame) {
            cancelAnimationFrame(this.dragData.animationFrame);
        }

        this.dragData.animationFrame = requestAnimationFrame(() => {
            const deltaX = e.clientX - this.dragData.startX;
            const deltaY = e.clientY - this.dragData.startY;
            
            const newX = Math.max(0, Math.min(
                window.innerWidth - this.dragData.currentNote.element.offsetWidth,
                this.dragData.initialX + deltaX
            ));
            const newY = Math.max(0, Math.min(
                window.innerHeight - this.dragData.currentNote.element.offsetHeight,
                this.dragData.initialY + deltaY
            ));

            // Use transform instead of changing left/top for better performance
            this.dragData.currentNote.element.style.transform = `translate(${newX - this.dragData.initialX}px, ${newY - this.dragData.initialY}px)`;
            this.dragData.currentNote.data.x = newX;
            this.dragData.currentNote.data.y = newY;
        });
    }

    handleMouseUp() {
        if (this.dragData.isDragging) {
            // Cancel any pending animation frame
            if (this.dragData.animationFrame) {
                cancelAnimationFrame(this.dragData.animationFrame);
                this.dragData.animationFrame = null;
            }

            // Finalize position by updating left/top and removing transform
            const element = this.dragData.currentNote.element;
            const data = this.dragData.currentNote.data;
            
            element.style.left = `${data.x}px`;
            element.style.top = `${data.y}px`;
            element.style.transform = '';
            element.style.cursor = 'move';
            element.classList.remove('dragging');
            
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            this.saveNotesToStorage();
            
            this.dragData.isDragging = false;
            this.dragData.currentNote = null;
        }
    }

    changeNoteColor(noteElement, note, color) {
        // Remove all color classes
        this.colors.forEach(c => noteElement.classList.remove(c));
        // Add new color class
        noteElement.classList.add(color);
        note.color = color;
        this.saveNotesToStorage();
    }

    bringToFront(noteElement, note) {
        const rightDrawer = document.getElementById('right-drawer');
        const settingsPanelOpen = rightDrawer && rightDrawer.classList.contains('open');
        const baseZIndex = settingsPanelOpen ? 500 : 1000;
        
        const maxZ = Math.max(...this.notes.map(n => n.zIndex)) + 1;
        const newZIndex = Math.max(baseZIndex, maxZ);
        
        noteElement.style.zIndex = newZIndex;
        note.zIndex = maxZ; // Store relative z-index
        this.saveNotesToStorage();
    }

    deleteNote(noteId) {
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            noteElement.classList.add('deleting');
            
            setTimeout(() => {
                noteElement.remove();
            }, 300);
        }
        
        this.notes = this.notes.filter(note => note.id !== noteId);
        this.saveNotesToStorage();
    }

    saveNotesToStorage() {
        try {
            chrome.storage.local.set({
                stickyNotes: this.notes
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving sticky notes:', chrome.runtime.lastError);
                }
            });
        } catch (error) {
            console.error('Error saving to chrome storage:', error);
            // Fallback to localStorage
            localStorage.setItem('stickyNotes', JSON.stringify(this.notes));
        }
    }

    loadNotesFromStorage() {
        try {
            chrome.storage.local.get(['stickyNotes'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('Error loading sticky notes:', chrome.runtime.lastError);
                    this.loadFromLocalStorage();
                    return;
                }
                
                const savedNotes = result.stickyNotes || [];
                savedNotes.forEach(noteData => {
                    this.createNote(noteData);
                });
            });
        } catch (error) {
            console.error('Error loading from chrome storage:', error);
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        try {
            const savedNotes = JSON.parse(localStorage.getItem('stickyNotes')) || [];
            savedNotes.forEach(noteData => {
                this.createNote(noteData);
            });
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }

    // Public method to create a note programmatically
    addNote(content = '', position = null) {
        const noteData = {
            content: content,
            x: position?.x || Math.random() * (window.innerWidth - 300),
            y: position?.y || Math.random() * (window.innerHeight - 200)
        };
        return this.createNote(noteData);
    }

    // Public method to get all notes
    getAllNotes() {
        return this.notes;
    }

    // Public method to clear all notes
    clearAllNotes() {
        this.notes.forEach(note => {
            this.deleteNote(note.id);
        });
    }
}

// Initialize sticky notes when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.stickyNotes = new StickyNotes();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.stickyNotes) {
            window.stickyNotes = new StickyNotes();
        }
    });
} else {
    if (!window.stickyNotes) {
        window.stickyNotes = new StickyNotes();
    }
}
