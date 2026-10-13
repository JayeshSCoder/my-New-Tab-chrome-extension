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
            // Ctrl+N or Cmd+N to create new note (only if not in input/editable field)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.target.matches('input, textarea, [contenteditable="true"], .sticky-note-editor')) {
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
        
        const emptyNotesCount = this.notes.filter(note => this.isNoteContentEmpty(note.content)).length;
        
        if (emptyNotesCount > 0) {
            clearBtn.style.background = 'rgba(255, 152, 0, 0.8)';
            clearBtn.title = `Clear ${emptyNotesCount} empty note${emptyNotesCount > 1 ? 's' : ''}`;
        } else {
            clearBtn.style.background = '';
            clearBtn.title = 'No empty notes to clear';
        }
    }

    deleteEmptyNotes() {
        const emptyNotes = this.notes.filter(note => this.isNoteContentEmpty(note.content));
        
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

    // Helper: detect if a note's content is actually empty (even with empty tags/nbsp)
    isNoteContentEmpty(content) {
        if (!content) return true;
        const stripped = content
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .trim();
        const hasMedia = /<img|<svg/i.test(content);
        return stripped.length === 0 && !hasMedia;
    }

    // Helper: basic HTML entity escape
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper: clean pasted or imported HTML preserving inline styles (fonts, colors, size)
    sanitizeHtml(rawHtml) {
        if (!rawHtml) return '';
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml, 'text/html');

            // Strip dangerous/unwanted tags
            const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'applet', 'style'];
            dangerousTags.forEach(tag => {
                const els = doc.querySelectorAll(tag);
                els.forEach(el => el.remove());
            });

            // Strip event handlers and javascript: attributes; preserve inline style, href, src, etc.
            const allElements = doc.querySelectorAll('*');
            allElements.forEach(el => {
                const attrs = Array.from(el.attributes);
                for (const attr of attrs) {
                    const name = attr.name.toLowerCase();
                    if (name.startsWith('on') || name === 'action' || name === 'formaction') {
                        el.removeAttribute(attr.name);
                    }
                    if ((name === 'href' || name === 'src') && attr.value.trim().toLowerCase().startsWith('javascript:')) {
                        el.removeAttribute(attr.name);
                    }
                }
            });

            return doc.body.innerHTML;
        } catch (err) {
            console.error('Error sanitizing HTML:', err);
            return this.escapeHtml(rawHtml);
        }
    }

    // Helper: format content into editor, preserving legacy plain text line breaks
    formatContentForEditor(content) {
        if (!content) return '';
        if (/<[a-z][\s\S]*>/i.test(content)) {
            return this.sanitizeHtml(content);
        }
        return this.escapeHtml(content).replace(/\r?\n/g, '<br>');
    }

    // Exclusion zones: prevents notes from overlapping wallpaper and sticky notes buttons
    getProtectedZones() {
        const zones = [];
        const padding = 16;

        // Bottom-Right feature buttons
        const bgBtn = document.getElementById('changeBackgroundBtn');
        const noteBtn = document.getElementById('add-sticky-note-btn');

        if (bgBtn && noteBtn && bgBtn.offsetParent !== null && noteBtn.offsetParent !== null) {
            const bgRect = bgBtn.getBoundingClientRect();
            const noteRect = noteBtn.getBoundingClientRect();
            zones.push({
                left: Math.min(bgRect.left, noteRect.left) - padding,
                top: Math.min(bgRect.top, noteRect.top) - padding,
                right: Math.max(bgRect.right, noteRect.right) + padding,
                bottom: Math.max(bgRect.bottom, noteRect.bottom) + padding
            });
        } else {
            zones.push({
                left: window.innerWidth - 150,
                top: window.innerHeight - 90,
                right: window.innerWidth,
                bottom: window.innerHeight
            });
        }

        // Top-Right drawer toggle button
        const rightDrawerBtn = document.getElementById('open-right-drawer');
        if (rightDrawerBtn && rightDrawerBtn.offsetParent !== null) {
            const r = rightDrawerBtn.getBoundingClientRect();
            zones.push({
                left: r.left - padding,
                top: r.top - padding,
                right: r.right + padding,
                bottom: r.bottom + padding
            });
        }

        return zones;
    }

    // Keep note inside viewport and away from floating feature buttons
    clampNotePosition(targetX, targetY, width, height) {
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - height);

        let x = Math.max(0, Math.min(maxX, targetX));
        let y = Math.max(0, Math.min(maxY, targetY));

        const zones = this.getProtectedZones();

        for (const zone of zones) {
            const noteRight = x + width;
            const noteBottom = y + height;

            const overlapsX = x < zone.right && noteRight > zone.left;
            const overlapsY = y < zone.bottom && noteBottom > zone.top;

            if (overlapsX && overlapsY) {
                const pushLeft = noteRight - zone.left;
                const pushRight = zone.right - x;
                const pushUp = noteBottom - zone.top;
                const pushDown = zone.bottom - y;

                const candidates = [];

                if (zone.left - width >= 0) {
                    candidates.push({ x: zone.left - width, y: y, dist: pushLeft });
                }
                if (zone.top - height >= 0) {
                    candidates.push({ x: x, y: zone.top - height, dist: pushUp });
                }
                if (zone.right + width <= window.innerWidth) {
                    candidates.push({ x: zone.right, y: y, dist: pushRight });
                }
                if (zone.bottom + height <= window.innerHeight) {
                    candidates.push({ x: x, y: zone.bottom, dist: pushDown });
                }

                if (candidates.length > 0) {
                    candidates.sort((a, b) => a.dist - b.dist);
                    x = candidates[0].x;
                    y = candidates[0].y;
                } else {
                    x = Math.max(0, zone.left - width);
                    y = Math.max(0, zone.top - height);
                }
            }
        }

        return {
            x: Math.max(0, Math.min(maxX, x)),
            y: Math.max(0, Math.min(maxY, y))
        };
    }

    handleWindowResize() {
        this.notes.forEach(note => {
            const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
            if (noteElement) {
                const width = noteElement.offsetWidth || note.width || 250;
                const height = noteElement.offsetHeight || note.height || 180;
                const clamped = this.clampNotePosition(note.x, note.y, width, height);
                
                note.x = clamped.x;
                note.y = clamped.y;
                noteElement.style.left = `${note.x}px`;
                noteElement.style.top = `${note.y}px`;
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

        const width = data?.width || 250;
        const height = data?.height || 180;

        let targetX = data?.x !== undefined ? data.x : Math.random() * (window.innerWidth - 300);
        let targetY = data?.y !== undefined ? data.y : Math.random() * (window.innerHeight - 200);

        // Clamp to prevent sticky notes from spawning over feature buttons
        const safePos = this.clampNotePosition(targetX, targetY, width, height);
        
        const note = {
            id: noteId,
            content: data?.content || '',
            x: safePos.x,
            y: safePos.y,
            width: width,
            height: height,
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
        
        // Focus on editor for new notes
        if (!data) {
            const editor = noteElement.querySelector('.sticky-note-editor');
            if (editor) editor.focus();
        }

        return noteElement;
    }

    createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = `sticky-note ${note.color} ${this.isNoteContentEmpty(note.content) ? 'new' : ''}`;
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
                    <button class="sticky-note-btn format-toggle-btn" title="Formatting Tools">Aa</button>
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
            <div class="sticky-note-toolbar">
                <button type="button" class="sn-tb-btn" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
                <button type="button" class="sn-tb-btn" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
                <button type="button" class="sn-tb-btn" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
                <button type="button" class="sn-tb-btn" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
                <span class="sn-tb-sep"></span>
                <button type="button" class="sn-tb-btn" data-cmd="fontSize" data-val="5" title="Large Title">H</button>
                <button type="button" class="sn-tb-btn" data-cmd="fontSize" data-val="3" title="Normal Text">A</button>
                <span class="sn-tb-sep"></span>
                <button type="button" class="sn-tb-btn" data-cmd="insertUnorderedList" title="Bullet List">•≡</button>
                <button type="button" class="sn-tb-btn" data-cmd="insertOrderedList" title="Numbered List">1≡</button>
                <span class="sn-tb-sep"></span>
                <button type="button" class="sn-tb-btn" data-cmd="removeFormat" title="Clear Formatting">🧹</button>
            </div>
            <div class="sticky-note-content">
                <div class="sticky-note-editor" contenteditable="true" spellcheck="false" data-placeholder="Type or paste formatted note...">${this.formatContentForEditor(note.content)}</div>
            </div>
        `;

        this.setupNoteEventListeners(noteDiv, note);
        return noteDiv;
    }

    setupNoteEventListeners(noteElement, note) {
        const header = noteElement.querySelector('.sticky-note-header');
        const deleteBtn = noteElement.querySelector('.delete-btn');
        const colorBtn = noteElement.querySelector('.color-btn');
        const formatBtn = noteElement.querySelector('.format-toggle-btn');
        const toolbar = noteElement.querySelector('.sticky-note-toolbar');
        const colorPicker = noteElement.querySelector('.color-picker');
        const colorOptions = noteElement.querySelectorAll('.color-option');
        const editor = noteElement.querySelector('.sticky-note-editor');
        const toolbarBtns = noteElement.querySelectorAll('.sn-tb-btn');

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

        // Formatting toolbar toggle
        if (formatBtn && toolbar) {
            formatBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toolbar.classList.toggle('show');
            });
        }

        // Toolbar formatting actions
        toolbarBtns.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Preserve editor selection
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const cmd = btn.getAttribute('data-cmd');
                const val = btn.getAttribute('data-val') || null;
                editor.focus();
                document.execCommand(cmd, false, val);
                note.content = editor.innerHTML;
                this.saveNotesToStorage();
                this.updateClearButtonState();
            });
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

        // Rich Paste handler: preserves formatting (font-size, font-family, colors, styling) as-is
        editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;

            const html = clipboardData.getData('text/html');
            const text = clipboardData.getData('text/plain');

            if (html) {
                const cleanHtml = this.sanitizeHtml(html);
                document.execCommand('insertHTML', false, cleanHtml);
            } else if (text) {
                const cleanText = this.escapeHtml(text).replace(/\r?\n/g, '<br>');
                document.execCommand('insertHTML', false, cleanText);
            }

            note.content = editor.innerHTML;
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveNotesToStorage();
                this.updateClearButtonState();
            }, 600);
        });

        // Open pasted links in a new tab when clicked
        editor.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href) {
                e.preventDefault();
                window.open(link.href, '_blank', 'noopener,noreferrer');
            }
        });

        // Content auto-save with debouncing
        let saveTimeout;
        editor.addEventListener('input', () => {
            note.content = editor.innerHTML;
            
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveNotesToStorage();
                this.updateClearButtonState();
            }, 800);
        });

        // Resize functionality with button boundary avoidance
        let resizeTimeout;
        new ResizeObserver(entries => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                for (let entry of entries) {
                    const rect = entry.contentRect;
                    note.width = rect.width;
                    note.height = rect.height;

                    const clamped = this.clampNotePosition(note.x, note.y, note.width, note.height);
                    if (clamped.x !== note.x || clamped.y !== note.y) {
                        note.x = clamped.x;
                        note.y = clamped.y;
                        noteElement.style.left = `${note.x}px`;
                        noteElement.style.top = `${note.y}px`;
                    }
                    this.saveNotesToStorage();
                }
            }, 300);
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

        if (this.dragData.animationFrame) {
            cancelAnimationFrame(this.dragData.animationFrame);
        }

        this.dragData.animationFrame = requestAnimationFrame(() => {
            const deltaX = e.clientX - this.dragData.startX;
            const deltaY = e.clientY - this.dragData.startY;
            
            const rawX = this.dragData.initialX + deltaX;
            const rawY = this.dragData.initialY + deltaY;
            const width = this.dragData.currentNote.element.offsetWidth || this.dragData.currentNote.data.width || 250;
            const height = this.dragData.currentNote.element.offsetHeight || this.dragData.currentNote.data.height || 180;

            const clamped = this.clampNotePosition(rawX, rawY, width, height);

            this.dragData.currentNote.element.style.transform = `translate(${clamped.x - this.dragData.initialX}px, ${clamped.y - this.dragData.initialY}px)`;
            this.dragData.currentNote.data.x = clamped.x;
            this.dragData.currentNote.data.y = clamped.y;
        });
    }

    handleMouseUp() {
        if (this.dragData.isDragging) {
            if (this.dragData.animationFrame) {
                cancelAnimationFrame(this.dragData.animationFrame);
                this.dragData.animationFrame = null;
            }

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
        const defaultW = 250;
        const defaultH = 180;
        let targetX = position?.x !== undefined ? position.x : Math.random() * (window.innerWidth - 300);
        let targetY = position?.y !== undefined ? position.y : Math.random() * (window.innerHeight - 200);
        const safePos = this.clampNotePosition(targetX, targetY, defaultW, defaultH);

        const noteData = {
            content: content,
            x: safePos.x,
            y: safePos.y,
            width: defaultW,
            height: defaultH
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
