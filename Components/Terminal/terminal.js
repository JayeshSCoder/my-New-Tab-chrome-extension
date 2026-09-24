/**
 * Terminal CLI Engine & Interactive Console Component
 * Provides authentic bash/zsh/PowerShell CLI experience with full command execution,
 * shortcuts & bookmarks access, settings, wallpaper, tab-autocomplete & interactive suggestions.
 */

(function () {
    // DOM Elements
    let termWindow, termScreen, termInput, termSuggestions, termClockBadge;
    let btnClose, btnMin, btnMax;

    // Command History
    let commandHistory = [];
    let historyIndex = -1;
    let draftInput = "";

    // Autocomplete State
    let activeSuggestionIndex = -1;
    let currentSuggestions = [];

    // Commands List
    const ROOT_COMMANDS = [
        { name: "help", desc: "Show command manual", usage: "help" },
        { name: "search", desc: "Search Google or navigate to URL", usage: "search <query|url>" },
        { name: "shortcuts", desc: "List or manage shortcuts", usage: "shortcuts [ls|open|add]" },
        { name: "sc", desc: "Short alias for shortcuts", usage: "sc [open <id|name>|add]" },
        { name: "bookmarks", desc: "List or open bookmarks", usage: "bookmarks [ls|open|toggle]" },
        { name: "bm", desc: "Short alias for bookmarks", usage: "bm [ls|open <id|name>|toggle]" },
        { name: "wallpaper", desc: "Open wallpaper picker", usage: "wallpaper" },
        { name: "bg", desc: "Wallpaper shortcut or set color", usage: "bg [#hex|reset]" },
        { name: "settings", desc: "Open settings drawer", usage: "settings" },
        { name: "config", desc: "Alias for settings", usage: "config" },
        { name: "notes", desc: "Toggle sticky notes", usage: "notes" },
        { name: "note", desc: "Add quick sticky note", usage: "note add <text>" },
        { name: "theme", desc: "Switch theme or list themes", usage: "theme [name]" },
        { name: "clear", desc: "Clear terminal screen", usage: "clear" },
        { name: "cls", desc: "Alias for clear", usage: "cls" },
        { name: "date", desc: "Display current date & time", usage: "date" },
        { name: "time", desc: "Display current system time", usage: "time" },
        { name: "calc", desc: "Evaluate math expression", usage: "calc <expression>" },
        { name: "history", desc: "Show command history", usage: "history" },
        { name: "echo", desc: "Print text to terminal", usage: "echo <text>" },
        { name: "reload", desc: "Reload current tab", usage: "reload" }
    ];

    const THEME_OPTIONS = [
        "glassmorphism",
        "legacy",
        "macos-dock",
        "windows-fluent",
        "vertical-dock",
        "neo-brutalist",
        "terminal"
    ];

    function init() {
        termWindow = document.getElementById("terminal-window");
        termScreen = document.getElementById("terminal-screen");
        termInput = document.getElementById("terminal-input");
        termSuggestions = document.getElementById("terminal-suggestions");
        termClockBadge = document.getElementById("term-clock-badge");

        btnClose = document.getElementById("term-btn-close");
        btnMin = document.getElementById("term-btn-min");
        btnMax = document.getElementById("term-btn-max");

        if (!termWindow || !termInput) return;

        // Window controls
        if (btnClose) {
            btnClose.addEventListener("click", () => {
                clearScreen();
                printBanner();
            });
        }

        if (btnMin) {
            btnMin.addEventListener("click", () => {
                termWindow.classList.toggle("minimized");
            });
        }

        if (btnMax) {
            btnMax.addEventListener("click", () => {
                termWindow.classList.toggle("maximized");
            });
        }

        // Click anywhere inside terminal body to focus input
        termWindow.addEventListener("click", (e) => {
            if (!window.getSelection().toString() && e.target !== termInput) {
                termInput.focus();
            }
        });

        // Key listeners
        termInput.addEventListener("keydown", handleKeyDown);
        termInput.addEventListener("input", handleInputChange);

        // Initial Banner
        printBanner();

        // Start clock ticker
        updateTerminalClock();
        setInterval(updateTerminalClock, 1000);

        // Auto-focus if terminal theme is currently active
        const currentTheme = document.documentElement.getAttribute("data-theme");
        if (currentTheme === "terminal") {
            setTimeout(() => termInput && termInput.focus(), 150);
        }

        // Listen for theme changes to auto-focus terminal
        window.addEventListener("themechange", (e) => {
            if (e.detail && e.detail.theme === "terminal") {
                setTimeout(() => termInput && termInput.focus(), 100);
            }
        });
    }

    // Print welcome banner
    function printBanner() {
        const bannerText = `  _   _                 _____     _      ____   ____  
 | \\ | | _____      __ |_   _|_ _| |__  / ___| / ___| 
 |  \\| |/ _ \\ \\ /\\ / /   | |/ _\` | '_ \\ \\___ \\ \\___ \\ 
 | |\\  |  __/\\ V  V /    | | (_| | |_) | ___) | ___) |
 |_| \\_|\\___| \\_/\\_/     |_|\\__,_|_.__/ |____/ |____/ 
                                                       
 * Terminal OS v2.5.0 (x86_64-chrome-workspace)
 * Type 'help' for command list or press [TAB] for autocomplete.
 * Quick: 'search <query>', 'bm', 'sc', 'wallpaper', 'settings', 'theme'`;

        printLine(bannerText, "term-line-banner");
    }

    function updateTerminalClock() {
        if (!termClockBadge) return;
        const now = new Date();
        termClockBadge.textContent = now.toLocaleTimeString([], { hour12: false });
    }

    // Keyboard Handler
    function handleKeyDown(e) {
        // Tab Completion
        if (e.key === "Tab") {
            e.preventDefault();
            handleTabComplete();
            return;
        }

        // Enter to execute command
        if (e.key === "Enter") {
            e.preventDefault();
            hideSuggestions();
            const raw = termInput.value.trim();
            if (!raw) return;

            // Save to history
            commandHistory.push(raw);
            historyIndex = commandHistory.length;
            termInput.value = "";

            // Print command line
            printLine(`guest@newtab:~$ ${raw}`, "term-line-cmd");

            // Execute
            executeCommand(raw);
            return;
        }

        // Arrow Up / Down for command history
        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (historyIndex === commandHistory.length) {
                draftInput = termInput.value;
            }
            if (historyIndex > 0) {
                historyIndex--;
                termInput.value = commandHistory[historyIndex];
                hideSuggestions();
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                termInput.value = commandHistory[historyIndex];
                hideSuggestions();
            } else if (historyIndex === commandHistory.length - 1) {
                historyIndex++;
                termInput.value = draftInput;
                hideSuggestions();
            }
            return;
        }

        // Escape to dismiss suggestions
        if (e.key === "Escape") {
            hideSuggestions();
            return;
        }
    }

    function handleInputChange() {
        if (termSuggestions && termSuggestions.style.display !== "none") {
            hideSuggestions();
        }
    }

    // Output formatting helpers
    function printLine(text, className = "term-line-info") {
        const div = document.createElement("div");
        div.className = `term-line ${className}`;
        div.textContent = text;
        termScreen.appendChild(div);
        termScreen.scrollTop = termScreen.scrollHeight;
    }

    function printRawHtml(html, className = "term-line-info") {
        const div = document.createElement("div");
        div.className = `term-line ${className}`;
        div.innerHTML = html;
        termScreen.appendChild(div);
        termScreen.scrollTop = termScreen.scrollHeight;
    }

    function clearScreen() {
        termScreen.innerHTML = "";
    }

    // ==========================================
    // COMMAND EXECUTION LOGIC
    // ==========================================
    function executeCommand(raw) {
        const parts = raw.split(" ").filter(p => p.length > 0);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        const argString = args.join(" ").trim();

        switch (cmd) {
            case "help":
            case "?":
            case "man":
                showHelp();
                break;

            case "clear":
            case "cls":
                clearScreen();
                break;

            case "date":
            case "time":
                const d = new Date();
                printLine(`System Time: ${d.toString()}`, "term-line-success");
                break;

            case "echo":
                printLine(argString, "term-line-info");
                break;

            case "reload":
            case "refresh":
                printLine("Reloading tab...", "term-line-warn");
                setTimeout(() => window.location.reload(), 300);
                break;

            case "calc":
                evaluateMath(argString);
                break;

            case "history":
                showHistory();
                break;

            // Shortcuts commands
            case "shortcuts":
            case "sc":
                handleShortcutsCommand(args);
                break;

            // Bookmarks commands
            case "bookmarks":
            case "bm":
                handleBookmarksCommand(args);
                break;

            // Wallpaper commands
            case "wallpaper":
            case "bg":
            case "wp":
                handleWallpaperCommand(args);
                break;

            // Settings commands
            case "settings":
            case "config":
            case "cfg":
                handleSettingsCommand();
                break;

            // Sticky Notes commands
            case "notes":
            case "note":
                handleNotesCommand(args);
                break;

            // Theme commands
            case "theme":
                handleThemeCommand(args);
                break;

            // Search command
            case "search":
            case "find":
            case "google":
                performSearch(argString);
                break;

            default:
                // If not a built-in command, treat as search query or direct URL
                performSearch(raw);
                break;
        }
    }

    // Help
    function showHelp() {
        let out = `<div class="term-line-header">── TERMINAL COMMAND MANUAL ─────────────────────────────────────────</div>`;
        out += `<div class="term-line-item"><span class="term-key">search &lt;query|url&gt;</span>    <span class="term-val">Search Google or open URL directly</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">shortcuts (sc)</span>        <span class="term-val">List shortcuts | sc open &lt;id|name&gt; | sc add &lt;name&gt; &lt;url&gt;</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">bookmarks (bm)</span>        <span class="term-val">List bookmarks | bm open &lt;id|name&gt; | bm toggle</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">wallpaper (bg)</span>        <span class="term-val">Open wallpaper picker | bg #hex to set color</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">settings (config)</span>     <span class="term-val">Open extension configuration drawer</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">notes (note)</span>          <span class="term-val">Toggle notes | note add &lt;text&gt; to create</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">theme [name]</span>          <span class="term-val">List themes or switch: glass, macos, win, brutalist, terminal</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">calc &lt;expression&gt;</span>     <span class="term-val">Evaluate math (e.g. calc (15 * 8) + 20)</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">clear (cls)</span>           <span class="term-val">Clear terminal output</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">date / time</span>           <span class="term-val">Display current timestamp</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">history / reload</span>      <span class="term-val">View past commands / Refresh page</span></div>`;
        out += `<div class="term-line-info" style="margin-top:6px; font-style:italic;">Tip: Press [TAB] at any time for intelligent auto-completion!</div>`;
        printRawHtml(out);
    }

    // Search or open URL
    function performSearch(query) {
        if (!query) {
            printLine("Usage: search <query or URL>", "term-line-warn");
            return;
        }

        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
        if (query.startsWith("http://") || query.startsWith("https://")) {
            printLine(`[NAVIGATE] Opening: ${query}`, "term-line-success");
            setTimeout(() => window.location.href = query, 200);
        } else if (urlPattern.test(query) && !query.includes(" ")) {
            const targetUrl = `https://${query}`;
            printLine(`[NAVIGATE] Opening: ${targetUrl}`, "term-line-success");
            setTimeout(() => window.location.href = targetUrl, 200);
        } else {
            printLine(`[SEARCH] Querying Google for: "${query}"...`, "term-line-success");
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            setTimeout(() => window.location.href = searchUrl, 200);
        }
    }

    // Shortcuts Command
    function handleShortcutsCommand(args) {
        const sub = args[0] ? args[0].toLowerCase() : "ls";
        const shortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];

        if (sub === "ls" || sub === "list" || args.length === 0) {
            if (shortcuts.length === 0) {
                printLine("No shortcuts configured. Use 'sc add <name> <url>' to add one.", "term-line-info");
                return;
            }
            let out = `<div class="term-line-header">── SHORTCUTS (${shortcuts.length}) ──────────────────────────────────</div>`;
            shortcuts.forEach((sc, i) => {
                out += `<div class="term-line-item"><span class="term-key">[${i + 1}]</span> <span class="term-val">${escapeHtml(sc.name)}</span> <span class="term-url">${escapeHtml(sc.url)}</span></div>`;
            });
            out += `<div class="term-line-info" style="margin-top:4px;">Type 'sc open 1' or 'sc open ${shortcuts[0] ? shortcuts[0].name.toLowerCase() : "name"}' to launch.</div>`;
            printRawHtml(out);
            return;
        }

        if (sub === "open" || !isNaN(parseInt(sub, 10))) {
            const targetParam = sub === "open" ? args.slice(1).join(" ") : sub;
            if (!targetParam) {
                printLine("Usage: sc open <number|name>", "term-line-warn");
                return;
            }

            let found = null;
            const index = parseInt(targetParam, 10);
            if (!isNaN(index) && index >= 1 && index <= shortcuts.length) {
                found = shortcuts[index - 1];
            } else {
                const query = targetParam.toLowerCase();
                found = shortcuts.find(s => s.name.toLowerCase().includes(query));
            }

            if (found) {
                const targetUrl = found.url.startsWith("http") ? found.url : `https://${found.url}`;
                printLine(`[LAUNCH] Launching shortcut: ${found.name} (${targetUrl})`, "term-line-success");
                setTimeout(() => window.location.href = targetUrl, 200);
            } else {
                printLine(`[ERROR] Shortcut not found for: "${targetParam}". Type 'sc ls' to view all.`, "term-line-error");
            }
            return;
        }

        if (sub === "add") {
            const name = args[1];
            const url = args[2];
            if (!name || !url) {
                printLine("Usage: sc add <name> <url>", "term-line-warn");
                return;
            }
            shortcuts.push({ name, url });
            localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
            if (typeof renderShortcuts === "function") {
                renderShortcuts();
            }
            printLine(`[OK] Successfully added shortcut: ${name} -> ${url}`, "term-line-success");
            return;
        }

        printLine(`Unknown shortcuts subcommand: ${sub}. Try: 'sc ls', 'sc open <id|name>', or 'sc add <name> <url>'`, "term-line-warn");
    }

    // Bookmarks Command
    function handleBookmarksCommand(args) {
        const sub = args[0] ? args[0].toLowerCase() : "ls";

        if (sub === "toggle") {
            const sb = document.querySelector(".bookmark-sidebar");
            if (sb) {
                sb.classList.toggle("show");
                printLine(`[OK] Bookmarks bar toggled.`, "term-line-success");
            }
            return;
        }

        if (sub === "show") {
            const sb = document.querySelector(".bookmark-sidebar");
            if (sb) sb.classList.add("show");
            printLine(`[OK] Bookmarks bar visible.`, "term-line-success");
            return;
        }

        if (sub === "hide") {
            const sb = document.querySelector(".bookmark-sidebar");
            if (sb) sb.classList.remove("show");
            printLine(`[OK] Bookmarks bar hidden.`, "term-line-success");
            return;
        }

        // Fetch bookmarks
        if (chrome && chrome.bookmarks && chrome.bookmarks.getTree) {
            chrome.bookmarks.getTree((tree) => {
                const root = tree && tree[0];
                const rootChildren = (root && root.children) ? root.children : [];
                const barNode = rootChildren.find(n => n.id === "1" || n.title.toLowerCase().includes("bar")) || rootChildren[0];
                const bookmarks = [];

                function traverse(node) {
                    if (node.url) {
                        bookmarks.push({ title: node.title || node.url, url: node.url });
                    }
                    if (node.children) {
                        node.children.forEach(traverse);
                    }
                }

                if (barNode && barNode.children) {
                    barNode.children.forEach(traverse);
                }

                if (sub === "ls" || sub === "list" || args.length === 0) {
                    if (bookmarks.length === 0) {
                        printLine("No bookmarks found in Bookmarks Bar.", "term-line-info");
                        return;
                    }
                    let out = `<div class="term-line-header">── BOOKMARKS (${bookmarks.length}) ──────────────────────────────────</div>`;
                    bookmarks.slice(0, 15).forEach((bm, i) => {
                        out += `<div class="term-line-item"><span class="term-key">[${i + 1}]</span> <span class="term-val">${escapeHtml(bm.title)}</span> <span class="term-url">${escapeHtml(bm.url)}</span></div>`;
                    });
                    if (bookmarks.length > 15) {
                        out += `<div class="term-line-info">... and ${bookmarks.length - 15} more. Type 'bm toggle' to slide open full bar.</div>`;
                    }
                    out += `<div class="term-line-info" style="margin-top:4px;">Type 'bm open 1' or 'bm open &lt;name&gt;' to launch.</div>`;
                    printRawHtml(out);
                    return;
                }

                if (sub === "open" || !isNaN(parseInt(sub, 10))) {
                    const targetParam = sub === "open" ? args.slice(1).join(" ") : sub;
                    if (!targetParam) {
                        printLine("Usage: bm open <number|name>", "term-line-warn");
                        return;
                    }

                    let found = null;
                    const index = parseInt(targetParam, 10);
                    if (!isNaN(index) && index >= 1 && index <= bookmarks.length) {
                        found = bookmarks[index - 1];
                    } else {
                        const query = targetParam.toLowerCase();
                        found = bookmarks.find(b => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query));
                    }

                    if (found) {
                        printLine(`[LAUNCH] Opening bookmark: ${found.title}`, "term-line-success");
                        setTimeout(() => window.location.href = found.url, 200);
                    } else {
                        printLine(`[ERROR] Bookmark not found for: "${targetParam}".`, "term-line-error");
                    }
                    return;
                }

                printLine(`Unknown bookmarks subcommand: ${sub}. Try: 'bm ls', 'bm open <id|name>', or 'bm toggle'`, "term-line-warn");
            });
        } else {
            printLine("Chrome bookmarks API is currently not accessible from this context.", "term-line-warn");
        }
    }

    // Wallpaper Command
    function handleWallpaperCommand(args) {
        if (args.length === 0 || args[0] === "picker" || args[0] === "modal") {
            const btn = document.getElementById("changeBackgroundBtn");
            if (btn) {
                btn.click();
                printLine("[OK] Wallpaper selector modal opened.", "term-line-success");
            } else {
                printLine("[ERROR] Wallpaper selector button not found.", "term-line-error");
            }
            return;
        }

        const colorVal = args[0];
        if (colorVal === "reset") {
            localStorage.removeItem("backgroundImage");
            const early = document.getElementById("early-bg-style");
            if (early) early.remove();
            const bgEl = document.querySelector(".background");
            if (bgEl) {
                bgEl.style.backgroundImage = "";
                bgEl.style.backgroundColor = "";
            }
            printLine("[OK] Wallpaper reset to theme default.", "term-line-success");
            return;
        }

        if (colorVal.startsWith("#") || colorVal.startsWith("rgb")) {
            localStorage.setItem("backgroundImage", colorVal);
            let early = document.getElementById("early-bg-style");
            if (!early) {
                early = document.createElement("style");
                early.id = "early-bg-style";
                document.head.appendChild(early);
            }
            early.textContent = `.background { background-image: none !important; background-color: ${colorVal} !important; } body { background-image: none !important; background-color: ${colorVal} !important; }`;
            printLine(`[OK] Background color updated to ${colorVal}`, "term-line-success");
            return;
        }

        printLine(`Usage: 'wallpaper' (open picker), 'bg #0f172a' (set color), or 'bg reset'`, "term-line-warn");
    }

    // Settings Command
    function handleSettingsCommand() {
        const btn = document.getElementById("open-right-drawer");
        if (btn) {
            btn.click();
            printLine("[OK] Settings drawer opened.", "term-line-success");
        } else {
            printLine("[ERROR] Settings drawer toggle button not found.", "term-line-error");
        }
    }

    // Notes Command
    function handleNotesCommand(args) {
        const sub = args[0] ? args[0].toLowerCase() : "toggle";

        if (sub === "toggle" || args.length === 0) {
            const btn = document.getElementById("add-sticky-note-btn");
            if (btn) {
                btn.click();
                printLine("[OK] Sticky notes opened.", "term-line-success");
            }
            return;
        }

        if (sub === "add") {
            const noteText = args.slice(1).join(" ").trim();
            if (!noteText) {
                printLine("Usage: note add <text of your note>", "term-line-warn");
                return;
            }

            // Read notes
            const notes = JSON.parse(localStorage.getItem("stickyNotes") || "[]");
            notes.push({
                id: Date.now().toString(),
                text: noteText,
                color: "#ffd000",
                x: 120 + (notes.length % 5) * 30,
                y: 120 + (notes.length % 5) * 30,
                pinned: false
            });
            localStorage.setItem("stickyNotes", JSON.stringify(notes));

            // Reload notes in container if function available
            if (typeof renderStickyNotes === "function") {
                renderStickyNotes();
            } else {
                const btn = document.getElementById("add-sticky-note-btn");
                if (btn) btn.click();
            }
            printLine(`[OK] Created new sticky note: "${noteText}"`, "term-line-success");
            return;
        }

        printLine(`Usage: 'notes' (toggle) or 'note add <text>'`, "term-line-warn");
    }

    // Theme Command
    function handleThemeCommand(args) {
        if (args.length === 0 || args[0] === "ls" || args[0] === "list") {
            const current = document.documentElement.getAttribute("data-theme") || "glassmorphism";
            let out = `<div class="term-line-header">── AVAILABLE THEMES ──────────────────────────────────────────</div>`;
            THEME_OPTIONS.forEach(t => {
                const isCurrent = t === current ? " [CURRENT]" : "";
                out += `<div class="term-line-item"><span class="term-key">* ${t}</span> <span class="term-val">${isCurrent}</span></div>`;
            });
            out += `<div class="term-line-info" style="margin-top:4px;">Type 'theme &lt;name&gt;' (e.g. 'theme macos', 'theme brutalist', 'theme terminal') to switch.</div>`;
            printRawHtml(out);
            return;
        }

        const inputTheme = args[0].toLowerCase();
        const aliasMap = {
            "glass": "glassmorphism",
            "glassmorphism": "glassmorphism",
            "legacy": "legacy",
            "mac": "macos-dock",
            "macos": "macos-dock",
            "macos-dock": "macos-dock",
            "win": "windows-fluent",
            "windows": "windows-fluent",
            "windows-fluent": "windows-fluent",
            "vertical": "vertical-dock",
            "vertical-dock": "vertical-dock",
            "brutalist": "neo-brutalist",
            "neo": "neo-brutalist",
            "neo-brutalist": "neo-brutalist",
            "terminal": "terminal",
            "term": "terminal"
        };

        const targetTheme = aliasMap[inputTheme];
        if (targetTheme) {
            if (typeof window.applyTheme === "function") {
                window.applyTheme(targetTheme);
            } else {
                document.documentElement.setAttribute("data-theme", targetTheme);
                localStorage.setItem("app-theme", targetTheme);
            }
            printLine(`[OK] Switched theme to: ${targetTheme}`, "term-line-success");
        } else {
            printLine(`[ERROR] Unknown theme: "${inputTheme}". Type 'theme' to view all available themes.`, "term-line-error");
        }
    }

    // Math evaluation
    function evaluateMath(expr) {
        if (!expr) {
            printLine("Usage: calc <expression> (e.g. calc 14 * 8 + 2)", "term-line-warn");
            return;
        }

        try {
            // Safe math check: only numbers, operators, parens, Math functions
            if (/[^0-9+\-*/().,%^ Math\.EPIsqrtpowsincoatanlg]/.test(expr)) {
                printLine("[ERROR] Invalid characters in math expression.", "term-line-error");
                return;
            }
            const sanitized = expr.replace(/\^/g, "**");
            const result = Function(`"use strict"; return (${sanitized});`)();
            printLine(`Result: ${result}`, "term-line-success");
        } catch (e) {
            printLine(`[ERROR] Calculation failed: ${e.message}`, "term-line-error");
        }
    }

    // History Command
    function showHistory() {
        if (commandHistory.length === 0) {
            printLine("No commands in history.", "term-line-info");
            return;
        }
        let out = `<div class="term-line-header">── COMMAND HISTORY ───────────────────────────────────────────</div>`;
        commandHistory.slice(-20).forEach((cmd, i) => {
            out += `<div class="term-line-item"><span class="term-key">${i + 1}</span>  <span class="term-val">${escapeHtml(cmd)}</span></div>`;
        });
        printRawHtml(out);
    }

    // ==========================================
    // TAB AUTOCOMPLETE & SMART SUGGESTIONS ENGINE
    // ==========================================
    function handleTabComplete() {
        const val = termInput.value;
        const trimmed = val.trim();

        // Case 1: Empty input -> Show all main commands
        if (!trimmed) {
            const allCmdNames = ROOT_COMMANDS.map(c => c.name);
            showSuggestions(allCmdNames, "");
            return;
        }

        const parts = val.split(" ");
        const firstWord = parts[0].toLowerCase();

        // Case 2: User is typing the root command (only 1 word, no trailing space)
        if (parts.length === 1) {
            const matches = ROOT_COMMANDS.filter(c => c.name.startsWith(firstWord)).map(c => c.name);
            if (matches.length === 0) {
                hideSuggestions();
                return;
            }

            if (matches.length === 1) {
                // Exactly 1 match: autocomplete with space
                termInput.value = matches[0] + " ";
                hideSuggestions();
                return;
            }

            // Multiple matches: show suggestions & fill common prefix
            const prefix = findCommonPrefix(matches);
            if (prefix.length > firstWord.length) {
                termInput.value = prefix;
            }
            showSuggestions(matches, prefix);
            return;
        }

        // Case 3: Command with subarguments (e.g. 'theme ...', 'sc ...', 'bm ...', 'bg ...')
        const subArg = parts.slice(1).join(" ").toLowerCase();

        if (firstWord === "theme") {
            const matches = THEME_OPTIONS.filter(t => t.startsWith(subArg));
            if (matches.length === 1) {
                termInput.value = `theme ${matches[0]}`;
                hideSuggestions();
                return;
            }
            showSuggestions(matches.length > 0 ? matches : THEME_OPTIONS, "theme ", true);
            return;
        }

        if (firstWord === "sc" || firstWord === "shortcuts") {
            const shortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];
            const subCmds = ["ls", "open", "add"];
            if (!subArg) {
                showSuggestions(subCmds, `${firstWord} `);
                return;
            }
            if (subArg.startsWith("open ")) {
                const query = subArg.replace("open ", "");
                const names = shortcuts.map(s => s.name.toLowerCase()).filter(n => n.startsWith(query));
                showSuggestions(names, `${firstWord} open `, true);
                return;
            }
            const matchingSub = subCmds.filter(s => s.startsWith(subArg));
            if (matchingSub.length === 1) {
                termInput.value = `${firstWord} ${matchingSub[0]} `;
                hideSuggestions();
                return;
            }
            showSuggestions(matchingSub.length > 0 ? matchingSub : subCmds, `${firstWord} `);
            return;
        }

        if (firstWord === "bm" || firstWord === "bookmarks") {
            const subCmds = ["ls", "open", "toggle", "show", "hide"];
            const matchingSub = subCmds.filter(s => s.startsWith(subArg));
            if (matchingSub.length === 1) {
                termInput.value = `${firstWord} ${matchingSub[0]} `;
                hideSuggestions();
                return;
            }
            showSuggestions(matchingSub.length > 0 ? matchingSub : subCmds, `${firstWord} `);
            return;
        }

        if (firstWord === "wallpaper" || firstWord === "bg") {
            const presets = ["picker", "reset", "#0a0a0a", "#0f172a", "#1e293b", "#14532d", "#7f1d1d"];
            const matching = presets.filter(p => p.startsWith(subArg));
            if (matching.length === 1) {
                termInput.value = `${firstWord} ${matching[0]}`;
                hideSuggestions();
                return;
            }
            showSuggestions(matching.length > 0 ? matching : presets, `${firstWord} `);
            return;
        }

        hideSuggestions();
    }

    function showSuggestions(list, prefixToInsert = "", isSubarg = false) {
        if (!termSuggestions || list.length === 0) {
            hideSuggestions();
            return;
        }

        currentSuggestions = list;
        activeSuggestionIndex = -1;
        termSuggestions.innerHTML = "";

        list.forEach((item, index) => {
            const chip = document.createElement("div");
            chip.className = "term-suggestion-chip";
            chip.innerHTML = `<span class="chip-glyph">❯</span><span>${escapeHtml(item)}</span>`;

            chip.addEventListener("click", () => {
                if (isSubarg) {
                    termInput.value = `${prefixToInsert}${item}`;
                } else if (prefixToInsert) {
                    termInput.value = `${prefixToInsert}${item} `;
                } else {
                    termInput.value = `${item} `;
                }
                hideSuggestions();
                termInput.focus();
            });

            termSuggestions.appendChild(chip);
        });

        const hint = document.createElement("div");
        hint.className = "term-suggestion-hint";
        hint.textContent = "[TAB] cycle • [ESC] dismiss";
        termSuggestions.appendChild(hint);

        termSuggestions.style.display = "flex";
    }

    function hideSuggestions() {
        if (termSuggestions) {
            termSuggestions.style.display = "none";
            termSuggestions.innerHTML = "";
        }
        currentSuggestions = [];
        activeSuggestionIndex = -1;
    }

    function findCommonPrefix(strings) {
        if (!strings.length) return "";
        let prefix = strings[0];
        for (let i = 1; i < strings.length; i++) {
            while (!strings[i].startsWith(prefix)) {
                prefix = prefix.slice(0, -1);
                if (!prefix) return "";
            }
        }
        return prefix;
    }

    function escapeHtml(str) {
        return (str || "").replace(/[&<>"']/g, (m) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[m]));
    }

    // Expose global initializer & command executor
    window.terminalConsole = {
        execute: executeCommand,
        print: printLine,
        clear: clearScreen
    };

    // Auto-init on DOMContentLoaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
