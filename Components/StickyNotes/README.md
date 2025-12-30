# Sticky Notes Feature

## Overview
The Sticky Notes feature adds beautiful, draggable, and persistent sticky notes to your Chrome extension new tab page.

## Features

### 📝 **Core Functionality**
- **Draggable**: Click and drag notes anywhere on the screen using the header
- **Persistent Storage**: Notes are automatically saved and persist across browser sessions
- **Aesthetic Design**: Beautiful gradient colors with smooth animations and shadows
- **Adjustable Size**: Resize notes by dragging the corner resize handle

### 🎨 **Customization**
- **5 Color Themes**: Choose from Yellow, Pink, Blue, Green, and Purple
- **Responsive Design**: Works on different screen sizes
- **Smooth Animations**: Elegant appear/disappear transitions

### ⚙️ **Settings Integration**
- **Toggle Visibility**: Enable/disable sticky notes through the settings panel
- **Auto-save**: Content is saved automatically as you type
- **Window Resize Handling**: Notes stay within screen bounds when window is resized

## How to Use

### Creating Notes
1. Click the 📝 floating button in the bottom-right corner
2. A new sticky note will appear with a random color
3. Click in the text area and start typing

### Customizing Notes
- **Change Color**: Click the 🎨 button in the note header and select a new color
- **Move Notes**: Click and drag the header to move the note anywhere
- **Resize Notes**: Drag the bottom-right corner to resize
- **Delete Notes**: Click the 🗑️ button in the note header

### Settings
- Open the settings panel (⚙️ button)
- Toggle "Show Sticky Notes" to show/hide all notes and the add button

## Technical Details

### Storage
- Uses Chrome Storage API for persistence across sessions
- Falls back to localStorage if Chrome Storage is unavailable
- Auto-saves every 5 seconds and on content changes

### Performance
- Efficient drag handling with mousemove events
- CSS transforms for smooth animations
- Minimal DOM manipulation for better performance

### Browser Compatibility
- Requires Chrome Extension Manifest V3
- Uses modern CSS features (gradients, transitions, grid)
- Responsive design for different screen sizes

## File Structure
```
Components/StickyNotes/
├── sticky-notes.css    # All styling and animations
└── sticky-notes.js     # Core functionality and event handling
```

## Permissions Required
- `storage` - For saving notes persistently

## Known Limitations
- Notes are tied to the new tab page only
- Maximum recommended notes: ~50 for performance
- Minimum note size: 200x150px, Maximum: 400x400px

## Future Enhancements
- [ ] Rich text formatting
- [ ] Import/Export notes
- [ ] Search within notes
- [ ] Reminder/alarm functionality
- [ ] Note categories/tags
