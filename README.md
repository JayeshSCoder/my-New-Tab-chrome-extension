# ⚡ My New Tab — Modern Glassmorphic Dashboard

<div align="center">

![Manifest V3](https://img.shields.io/badge/Manifest-V3-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white)
![Chrome & Chromium](https://img.shields.io/badge/Browser-Chrome%20%7C%20Brave%20%7C%20Edge-38bdf8?style=for-the-badge&logo=googlechrome&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-f97316?style=for-the-badge)

**A sleek, modern, distraction-free Chrome & Chromium New Tab extension featuring luminous frosted glassmorphism, 6 custom themes, solid colors and gradient wallpapers, resizable bookmark management, and quick shortcut capture.**

[Install Instructions](#-installation-guide) • [Features](#-features) • [Themes](#-6-distinct-themes) • [Credits](#-credits--acknowledgments)

</div>

---

## ✨ Features

### 💎 Luminous Glassmorphic Design
- **Translucent Frosted Acrylic Cards**: Specular top reflections, custom glass borders, and deep background diffusion (`backdrop-filter: blur(28px) saturate(180%)`).
- **Crystal-Clear Visibility**: Carefully weighted white typography and soft depth shadows ensure the clock, search bar, and shortcuts remain crisp and legible over any wallpaper (bright skies, snow, dark scenes, or colorful art) without feeling dark or opaque.

### 🎨 Wallpaper & Color Customization Modal
- **Zero Startup Network Overhead**: Instant new tab load times with zero external network wallpaper calls.
- **Curated Solid Colors**: Quick-select minimalist solid colors (Obsidian, Midnight Blue, Slate Charcoal, Emerald, etc.).
- **Curated Gradients**: Smooth dual-tone gradient presets (Sunset Glow, Ocean Breeze, Cosmic Nebula, etc.).
- **Custom Color Picker**: Choose any custom hex color with native color picker and live application.
- **Local File Explorer Upload**: Upload custom images from your computer with client-side offscreen canvas compression (max 1920x1080 at 0.82 JPEG quality) to prevent storage quota limits (`QUOTA_EXCEEDED_ERR`).
- **Strict Recent 5 History**: Stores only the last 5 set wallpapers and colors in a quick-access shelf for instant 1-click re-application.
- **Theme Reset**: Instant restore to the active theme's default ambient background gradient.

### 🎭 6 Distinct Themes (Shapes, Layouts & Paradigms)
Switch instantly between 6 handcrafted design languages under the **Settings (⚙️)** drawer — altering shapes, dock positioning, search bars, and aesthetics:
1. 💎 **Glassmorphism (Default)**: Modern acrylic frosted glass with glowing highlights, floating dock, and ambient cosmic mesh.
2. 🏛️ **Legacy (Classic)**: Exact replica of the original classic look (solid white search bar, Arial typography, `#007BFF` header, and classic gray shortcut tiles).
3. 🍎 **macOS Sonoma Dock**: Floating Cupertino squircle dock with zoom-up magnification bounce, Spotlight search bar, and iOS-style Notification Center clock widget.
4. 🪟 **Windows 11 Fluent**: Grounded centered taskbar dock along the bottom edge with active indicator lines, Windows 11 search box with bottom highlight, and Mica styling.
5. ⚡ **Vertical Workstation Rail**: Shortcuts relocated to a left-side vertical dock/rail with hover tooltip labels, ultra-wide command palette, and horizontal dashboard clock.
6. 🟨 **Neo-Brutalist**: Radical shape transformation with 0px sharp corners, thick 3px solid borders, hard 3D offset drop-shadows, sticker greeting tags, and high-contrast retro aesthetic.


### 📑 Adaptive Multi-Edge Bookmarks Bar
- **Theme-Adaptive Positioning & Layouts**:
  - **Left Edge Shelf**: In **Glass**, **Windows 11 Fluent**, and **Legacy** themes.
  - **Top Dynamic Safari Shelf**: In **macOS** theme, dropping down from top center with traffic light dots and grid favorites layout.
  - **Right Edge Workstation & Locker Panel**: In **Vertical Rail** and **Neo-Brutalist** themes (eliminating overlap with the left shortcuts rail).
- **Interactive Edge Peek Tab**: Visible glowing tab (`🔖`) peeking from the edge for 1-click or hover reveal.
- **Customizable Width Slider**: Adjust width anywhere from `60px` to `520px` in real time with directional drag resizing.
- Right-click context menu to copy URLs, open in new tab/incognito, or edit/delete bookmarks.

### 🔗 Shortcuts Dock & Quick Capture Companion
- **Bottom Shortcuts Dock**: Clean circular/card shortcuts with auto-fetched favicons.
- **Extension Toolbar Popup**:
  - **1-Click Active Tab Capture**: Automatically inspects the current active tab's title, URL, and favicon from any webpage and adds it directly to your New Tab shortcuts dock with duplicate prevention.
  - **Open New Tab**: Instant launcher button.

### 📝 Draggable Sticky Notes
- Create and position persistent sticky notes across your new tab screen.
- Includes a **Clear Empty Notes** utility inside Settings to keep your workspace tidy.

---

## 🚀 Installation Guide

### Option 1: Load Unpacked (Free Developer Mode)
1. Clone or download this repository:
   ```bash
   git clone https://github.com/JayeshSCoder/my-New-Tab-chrome-extension.git
   ```
2. Open your Chromium browser (**Google Chrome**, **Brave**, **Microsoft Edge**, **Arc**, etc.).
3. Navigate to `chrome://extensions` in the address bar.
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click the **Load unpacked** button in the top-left corner.
6. Select the `my-New-Tab-chrome-extension` root folder.
7. Open a new tab (`Ctrl + T` or `Cmd + T`) and enjoy your dashboard!

---

## 🛠️ Tech Stack & Architecture

- **Core**: HTML5, Vanilla JavaScript (ES6+), Manifest V3
- **Styling**: Vanilla CSS (Custom Properties, Flexbox, Grid, Backdrop Filters)
- **APIs**:
  - [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/): `storage`, `tabs`, `bookmarks`, `favicon`, `clipboardWrite`
  - [Google Fonts](https://fonts.google.com/): *Outfit* & *Plus Jakarta Sans*

```text
├── Components/
│   ├── AddShortcut/          # Bottom shortcuts dock & add modal
│   ├── Bookmarks/            # Left sliding resizable bookmarks bar
│   ├── ContextMenu/          # Right-click context menu
│   ├── Favicon/              # Favicon fetching helper
│   ├── Platform/             # Platform detection utilities
│   ├── SidePanel/            # Settings drawer & theme switcher
│   ├── StickyNotes/          # Draggable sticky notes
│   └── WallpaperModal/       # Openverse wallpaper search & upload modal
├── pop_up/                   # Extension toolbar companion popup
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background.js             # Manifest V3 service worker
├── index.html                # Main New Tab dashboard
├── manifest.json             # Extension configuration
├── script.js                 # Clock, search, and core tab listeners
└── style.css                 # Core design system & theme overrides
```

---

## ❤️ Credits & Acknowledgments

- **Creator & Maintainer**: [Jayesh](https://github.com/JayeshSCoder)
- **Typography**: [Google Fonts](https://fonts.google.com/) (*Outfit* by Rodrigo Fuenzalida; *Plus Jakarta Sans* by Tokotype).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to fork, customize, and share!
