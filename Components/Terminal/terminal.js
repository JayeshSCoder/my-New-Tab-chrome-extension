/**
 * Terminal CLI Engine & Interactive Console Component
 * Provides authentic Linux / macOS / PowerShell CLI experience:
 * - 10-line persistent log buffer with user path prompt (cleared completely with 'clear')
 * - Full-screen maximized by default (hiding shortcuts, bookmarks, and action buttons)
 * - Restorable to floating window revealing all surrounding components
 * - Explicit 'search <text>' to search Google (arbitrary text stays in terminal logs with command-not-found)
 * - Full command control for wallpaper, settings toggles, shortcuts, bookmarks, themes, calc, and tab-autocomplete.
 */

(function () {
    // Constants
    const MAX_LOG_ENTRIES = 10;
    const STORAGE_KEY_USER = "user-name";
    const STORAGE_KEY_WINDOW_STATE = "terminal-window-state";
    const DEFAULT_USER = "user";

    // DOM Elements
    let termWindow, termScreen, termInput, termSuggestions, termClockBadge, termModeBadge;
    let termUserNameEl, termTitleText;
    let btnClose, btnMin, btnMax;

    // State
    let currentUserName = localStorage.getItem(STORAGE_KEY_USER) || DEFAULT_USER;
    let commandHistory = [];
    let historyIndex = -1;
    let draftInput = "";

    // Autocomplete State
    let currentSuggestions = [];

    // Commands List
    const ROOT_COMMANDS = [
        { name: "help", desc: "Show command manual", usage: "help" },
        { name: "search", desc: "Search Google or navigate to URL", usage: "search <query|url>" },
        { name: "shortcuts", desc: "List or manage shortcuts", usage: "shortcuts [ls|open|add]" },
        { name: "sc", desc: "Short alias for shortcuts", usage: "sc [open <id|name>|add]" },
        { name: "bookmarks", desc: "List or open bookmarks", usage: "bookmarks [ls|open|toggle]" },
        { name: "bm", desc: "Short alias for bookmarks", usage: "bm [ls|open <id|name>|toggle]" },
        { name: "wallpaper", desc: "Open wallpaper picker or set color", usage: "wallpaper [#hex|reset]" },
        { name: "bg", desc: "Alias for wallpaper", usage: "bg [#hex|reset]" },
        { name: "settings", desc: "Configure extension options via CLI", usage: "settings [shortcuts|notes|width|open]" },
        { name: "config", desc: "Alias for settings", usage: "config" },
        { name: "notes", desc: "Toggle sticky notes", usage: "notes" },
        { name: "note", desc: "Add quick sticky note", usage: "note add <text>" },
        { name: "theme", desc: "Switch theme or list themes", usage: "theme [name]" },
        { name: "fullscreen", desc: "Toggle fullscreen maximized mode", usage: "fullscreen" },
        { name: "restore", desc: "Restore terminal to windowed mode", usage: "restore" },
        { name: "minimize", desc: "Minimize terminal to compact bar", usage: "minimize" },
        { name: "min", desc: "Alias for minimize", usage: "min" },
        { name: "user", desc: "Change terminal username", usage: "user <name>" },
        { name: "clear", desc: "Clear entire terminal log buffer", usage: "clear" },
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
        termModeBadge = document.getElementById("term-mode-badge");

        termUserNameEl = document.getElementById("term-user-name");
        termTitleText = document.getElementById("terminal-title-text");

        btnClose = document.getElementById("term-btn-close");
        btnMin = document.getElementById("term-btn-min");
        btnMax = document.getElementById("term-btn-max");

        if (!termWindow || !termInput) return;

        // Apply saved username
        updateUserDisplay(currentUserName, true);

        // Sync initial window state based on theme and saved preference
        const activeTheme = document.documentElement.getAttribute("data-theme");
        if (activeTheme === "terminal") {
            const savedState = getSavedWindowState();
            setTerminalWindowState(savedState);
            if (savedState !== "minimized") {
                setTimeout(() => termInput && termInput.focus(), 150);
            }
        }

        // Window controls
        if (btnClose) {
            btnClose.addEventListener("click", () => {
                clearScreen();
                printBanner();
            });
        }

        if (btnMin) {
            btnMin.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleMinimize();
            });
        }

        if (btnMax) {
            btnMax.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleMaximize();
            });
        }

        if (termModeBadge) {
            termModeBadge.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleModeBadge();
            });
        }

        // Click on titlebar to restore when minimized
        const termTitlebar = termWindow.querySelector(".terminal-titlebar");
        if (termTitlebar) {
            termTitlebar.addEventListener("click", (e) => {
                if (termWindow.classList.contains("minimized") && !e.target.closest(".term-btn")) {
                    setTerminalWindowState("restored");
                    termInput && termInput.focus();
                }
            });
        }

        // Click anywhere inside terminal body to focus prompt
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

        // Listen for theme changes to automatically apply saved terminal state and focus
        window.addEventListener("themechange", (e) => {
            if (e.detail && e.detail.theme === "terminal") {
                const savedState = getSavedWindowState();
                setTerminalWindowState(savedState);
                if (savedState !== "minimized") {
                    setTimeout(() => termInput && termInput.focus(), 100);
                }
            } else {
                document.body.classList.remove("terminal-maximized");
            }
        });

        // Listen for external user name changes (e.g. from Settings drawer)
        window.addEventListener("userchange", (e) => {
            if (e.detail && e.detail.name) {
                updateUserDisplay(e.detail.name, true);
            }
        });
    }

    // Window state management
    function getSavedWindowState() {
        return localStorage.getItem(STORAGE_KEY_WINDOW_STATE) || "restored";
    }

    function setTerminalWindowState(state) {
        if (!termWindow) return;
        if (state === "maximized") {
            termWindow.classList.add("maximized");
            termWindow.classList.remove("minimized");
            document.body.classList.add("terminal-maximized");
            if (termModeBadge) {
                termModeBadge.textContent = "FULLSCREEN";
                termModeBadge.title = "Click to restore window";
            }
            if (btnMax) btnMax.title = "Restore Window";
            if (btnMin) btnMin.title = "Minimize Window";
            localStorage.setItem(STORAGE_KEY_WINDOW_STATE, "maximized");
        } else if (state === "minimized") {
            termWindow.classList.remove("maximized");
            termWindow.classList.add("minimized");
            document.body.classList.remove("terminal-maximized");
            if (termModeBadge) {
                termModeBadge.textContent = "MINIMIZED";
                termModeBadge.title = "Click to restore window";
            }
            if (btnMax) btnMax.title = "Maximize to Fullscreen";
            if (btnMin) btnMin.title = "Restore Window";
            localStorage.setItem(STORAGE_KEY_WINDOW_STATE, "minimized");
        } else {
            // 'restored'
            termWindow.classList.remove("maximized");
            termWindow.classList.remove("minimized");
            document.body.classList.remove("terminal-maximized");
            if (termModeBadge) {
                termModeBadge.textContent = "WINDOWED";
                termModeBadge.title = "Click for fullscreen";
            }
            if (btnMax) btnMax.title = "Maximize to Fullscreen";
            if (btnMin) btnMin.title = "Minimize Window";
            localStorage.setItem(STORAGE_KEY_WINDOW_STATE, "restored");
        }
    }

    // Toggle Maximize / Restore
    function toggleMaximize() {
        const isMax = termWindow.classList.contains("maximized");
        setTerminalWindowState(isMax ? "restored" : "maximized");
    }

    // Toggle Minimize / Restore
    function toggleMinimize() {
        const isMin = termWindow.classList.contains("minimized");
        setTerminalWindowState(isMin ? "restored" : "minimized");
    }

    // Toggle Mode Badge
    function toggleModeBadge() {
        if (termWindow.classList.contains("maximized")) {
            setTerminalWindowState("restored");
        } else if (termWindow.classList.contains("minimized")) {
            setTerminalWindowState("restored");
        } else {
            setTerminalWindowState("maximized");
        }
    }

    function updateUserDisplay(name, skipEvent = false) {
        currentUserName = name || DEFAULT_USER;
        localStorage.setItem(STORAGE_KEY_USER, currentUserName);
        const displayName = currentUserName.toLowerCase();
        if (termUserNameEl) termUserNameEl.textContent = displayName;
        if (termTitleText) termTitleText.textContent = `${displayName}@newtab:~ (bash / zsh)`;
        if (!skipEvent) {
            window.dispatchEvent(new CustomEvent("userchange", { detail: { name: currentUserName } }));
        }
    }

    function printBanner() {
        const bannerText = `  _   _                 _____     _      ____   ____  
 | \\ | | _____      __ |_   _|_ _| |__  / ___| / ___| 
 |  \\| |/ _ \\ \\ /\\ / /   | |/ _\` | '_ \\ \\___ \\ \\___ \\ 
 | |\\  |  __/\\ V  V /    | | (_| | |_) | ___) | ___) |
 |_| \\_|\\___| \\_/\\_/     |_|\\__,_|_.__/ |____/ |____/ 
                                                       
 * Terminal OS v2.5.0 (x86_64-chrome-workspace)
 * Type 'help' for command manual, or press [TAB] for autocomplete.
 * Quick: 'search <query>', 'sc', 'bm', 'wallpaper', 'settings', 'theme'`;

        const bannerEntry = document.createElement("div");
        bannerEntry.className = "term-log-entry";
        const div = document.createElement("div");
        div.className = "term-line term-line-banner";
        div.textContent = bannerText;
        bannerEntry.appendChild(div);
        termScreen.appendChild(bannerEntry);
    }

    function updateTerminalClock() {
        if (!termClockBadge) return;
        const now = new Date();
        termClockBadge.textContent = now.toLocaleTimeString([], { hour12: false });
    }

    // Keyboard Handler
    function handleKeyDown(e) {
        // Tab Completion: cycle forward with Tab, backward with Shift+Tab
        if (e.key === "Tab") {
            e.preventDefault();
            handleTabComplete(e.shiftKey);
            return;
        }

        // Enter to execute command
        if (e.key === "Enter") {
            e.preventDefault();
            resetTabCycle();
            hideSuggestions();
            const raw = termInput.value.trim();
            if (!raw) return;

            // Save to history
            commandHistory.push(raw);
            historyIndex = commandHistory.length;
            termInput.value = "";

            // Create a grouped log entry for this command
            executeCommand(raw);
            return;
        }

        // Arrow Up / Down for command history
        if (e.key === "ArrowUp") {
            e.preventDefault();
            resetTabCycle();
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
            resetTabCycle();
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
            resetTabCycle();
            hideSuggestions();
            return;
        }
    }

    function handleInputChange() {
        // Typing or deleting text resets tab cycle so next Tab starts fresh
        resetTabCycle();
        if (termSuggestions && termSuggestions.style.display !== "none") {
            hideSuggestions();
        }
    }

    // ==========================================
    // LOG BUFFER & SCREEN MANAGEMENT (10 LIMIT)
    // ==========================================
    function createLogEntry(rawCmd) {
        const logEntry = document.createElement("div");
        logEntry.className = "term-log-entry";

        // Prompt line
        const cmdLine = document.createElement("div");
        cmdLine.className = "term-line term-line-cmd";
        cmdLine.innerHTML = `<span class="term-prompt"><span class="term-user">${escapeHtml(currentUserName)}</span><span class="term-at">@</span><span class="term-host">newtab</span>:<span class="term-path">~</span><span class="term-sym">$</span> </span><span class="term-cmd-str">${escapeHtml(rawCmd)}</span>`;
        logEntry.appendChild(cmdLine);

        termScreen.appendChild(logEntry);

        // Enforce max 10 entries limit
        trimLogEntries();

        termScreen.scrollTop = termScreen.scrollHeight;
        return logEntry;
    }

    function appendOutputToLog(logEntry, htmlContent, className = "term-line-info") {
        if (!logEntry) return;
        const outDiv = document.createElement("div");
        outDiv.className = `term-line ${className}`;
        outDiv.innerHTML = htmlContent;
        logEntry.appendChild(outDiv);
        termScreen.scrollTop = termScreen.scrollHeight;
    }

    function trimLogEntries() {
        const entries = termScreen.querySelectorAll(".term-log-entry");
        if (entries.length > MAX_LOG_ENTRIES) {
            const excess = entries.length - MAX_LOG_ENTRIES;
            for (let i = 0; i < excess; i++) {
                entries[i].remove();
            }
        }
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

        // 'clear' or 'cls' clears the entire buffer completely
        if (cmd === "clear" || cmd === "cls") {
            clearScreen();
            return;
        }

        // Create log entry container
        const currentEntry = createLogEntry(raw);

        switch (cmd) {
            case "help":
            case "?":
            case "man":
                showHelp(currentEntry);
                break;

            case "search":
            case "google":
                handleSearchCommand(argString, currentEntry);
                break;

            case "shortcuts":
            case "sc":
                handleShortcutsCommand(args, currentEntry);
                break;

            case "bookmarks":
            case "bm":
                handleBookmarksCommand(args, currentEntry);
                break;

            case "wallpaper":
            case "bg":
            case "wp":
                handleWallpaperCommand(args, currentEntry);
                break;

            case "settings":
            case "config":
            case "cfg":
                handleSettingsCommand(args, currentEntry);
                break;

            case "notes":
            case "note":
                handleNotesCommand(args, currentEntry);
                break;

            case "theme":
                handleThemeCommand(args, currentEntry);
                break;

            case "fullscreen":
            case "maximize":
                setTerminalWindowState("maximized");
                appendOutputToLog(currentEntry, "[OK] Terminal maximized to full screen (surrounding UI hidden).", "term-line-success");
                break;

            case "restore":
            case "window":
            case "unmaximize":
                setTerminalWindowState("restored");
                appendOutputToLog(currentEntry, "[OK] Terminal restored to window below clock (shortcuts & bookmarks visible).", "term-line-success");
                break;

            case "minimize":
            case "min":
                setTerminalWindowState("minimized");
                appendOutputToLog(currentEntry, "[OK] Terminal minimized to compact dock bar below clock.", "term-line-success");
                break;

            case "user":
                if (!argString) {
                    appendOutputToLog(currentEntry, `Current username: ${currentUserName}. Usage: user <new_name>`, "term-line-warn");
                } else {
                    updateUserDisplay(argString);
                    appendOutputToLog(currentEntry, `[OK] Username updated to: ${argString}`, "term-line-success");
                }
                break;

            case "calc":
                evaluateMath(argString, currentEntry);
                break;

            case "date":
            case "time":
                const d = new Date();
                appendOutputToLog(currentEntry, `System Time: ${d.toString()}`, "term-line-success");
                break;

            case "history":
                showHistory(currentEntry);
                break;

            case "echo":
                appendOutputToLog(currentEntry, escapeHtml(argString), "term-line-info");
                break;

            case "reload":
            case "refresh":
                appendOutputToLog(currentEntry, "Reloading tab...", "term-line-warn");
                setTimeout(() => window.location.reload(), 300);
                break;

            default:
                // Check if the command directly matches a configured shortcut name
                const allShortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];
                const matchedShortcut = allShortcuts.find(s => 
                    s.name.toLowerCase() === cmd || 
                    s.name.toLowerCase() === raw.trim().toLowerCase()
                );
                if (matchedShortcut) {
                    const targetUrl = matchedShortcut.url.startsWith("http") ? matchedShortcut.url : `https://${matchedShortcut.url}`;
                    appendOutputToLog(currentEntry, `[LAUNCH] Opening shortcut: ${matchedShortcut.name} (${targetUrl})`, "term-line-success");
                    setTimeout(() => window.location.href = targetUrl, 250);
                    break;
                }

                // Check if the command directly matches a known common web target (e.g. github, gitlab, etc.)
                if (typeof COMMON_WEB_TARGETS !== "undefined" && COMMON_WEB_TARGETS[cmd]) {
                    const targetUrl = COMMON_WEB_TARGETS[cmd];
                    appendOutputToLog(currentEntry, `[LAUNCH] Opening web target: ${cmd} (${targetUrl})`, "term-line-success");
                    setTimeout(() => window.location.href = targetUrl, 250);
                    break;
                }

                // IMPORTANT: Do NOT open Google search for arbitrary text!
                // Report command not found and instruct user to use 'search <text>'
                appendOutputToLog(
                    currentEntry,
                    `bash: command not found: "${cmd}". Type 'help' for commands, or 'search ${cmd}' to search Google.`,
                    "term-line-error"
                );
                break;
        }
    }

    // Help
    function showHelp(logEntry) {
        let out = `<div class="term-line-header">── TERMINAL COMMAND MANUAL ─────────────────────────────────────────</div>`;
        out += `<div class="term-line-item"><span class="term-key">search &lt;query|url&gt;</span>     <span class="term-val">Query Google or navigate directly to URL</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">shortcuts (sc)</span>         <span class="term-val">sc ls | sc open &lt;id|name&gt; | sc add &lt;name&gt; &lt;url&gt;</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">bookmarks (bm)</span>         <span class="term-val">bm ls | bm open &lt;id|name&gt; | bm toggle</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">wallpaper (bg)</span>         <span class="term-val">wallpaper (open picker) | bg #hex | bg reset</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">settings (config)</span>      <span class="term-val">View options | settings shortcuts on|off | settings open</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">notes (note)</span>           <span class="term-val">notes (toggle) | note add &lt;text&gt; (create sticky note)</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">theme [name]</span>           <span class="term-val">theme &lt;glass|legacy|macos|windows|vertical|brutalist|terminal&gt;</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">fullscreen / restore / min</span> <span class="term-val">Toggle full-screen / window below clock / minimized</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">user &lt;name&gt;</span>              <span class="term-val">Customize terminal username</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">calc &lt;expression&gt;</span>      <span class="term-val">Fast arithmetic (e.g. calc (15 * 8) + 20)</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">clear (cls)</span>            <span class="term-val">Clear all terminal output</span></div>`;
        out += `<div class="term-line-item"><span class="term-key">date / time / reload</span>  <span class="term-val">System timestamp / Refresh page</span></div>`;
        out += `<div class="term-line-info" style="margin-top:6px; font-style:italic;">Tip: Press [TAB] for smart autocompletion suggestions!</div>`;
        appendOutputToLog(logEntry, out);
    }

    // Search command — ONLY called when explicitly typing 'search <text>'
    function handleSearchCommand(query, logEntry) {
        if (!query) {
            appendOutputToLog(logEntry, "Usage: search <text or URL> (e.g. 'search latest AI tools' or 'search github.com')", "term-line-warn");
            return;
        }

        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
        if (query.startsWith("http://") || query.startsWith("https://")) {
            appendOutputToLog(logEntry, `[NAVIGATE] Opening: ${query}`, "term-line-success");
            setTimeout(() => window.location.href = query, 250);
        } else if (urlPattern.test(query) && !query.includes(" ")) {
            const targetUrl = `https://${query}`;
            appendOutputToLog(logEntry, `[NAVIGATE] Opening: ${targetUrl}`, "term-line-success");
            setTimeout(() => window.location.href = targetUrl, 250);
        } else {
            appendOutputToLog(logEntry, `[SEARCH] Querying Google for: "${query}"...`, "term-line-success");
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            setTimeout(() => window.location.href = searchUrl, 250);
        }
    }

    // Shortcuts Command
    function handleShortcutsCommand(args, logEntry) {
        const sub = args[0] ? args[0].toLowerCase() : "ls";
        const shortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];

        if (sub === "ls" || sub === "list" || args.length === 0) {
            if (shortcuts.length === 0) {
                appendOutputToLog(logEntry, "No shortcuts configured. Use 'sc add <name> <url>' to create one.", "term-line-info");
                return;
            }
            let out = `<div class="term-line-header">── SHORTCUTS (${shortcuts.length}) ──────────────────────────────────</div>`;
            shortcuts.forEach((sc, i) => {
                out += `<div class="term-line-item"><span class="term-key">[${i + 1}]</span> <span class="term-val">${escapeHtml(sc.name)}</span> <span class="term-url">${escapeHtml(sc.url)}</span></div>`;
            });
            out += `<div class="term-line-info" style="margin-top:4px;">Type 'sc open 1' or 'sc open ${shortcuts[0] ? shortcuts[0].name.toLowerCase() : "name"}' to launch.</div>`;
            appendOutputToLog(logEntry, out);
            return;
        }

        if (sub === "open" || !isNaN(parseInt(sub, 10))) {
            const targetParam = sub === "open" ? args.slice(1).join(" ") : sub;
            if (!targetParam) {
                appendOutputToLog(logEntry, "Usage: sc open <number|name>", "term-line-warn");
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
                appendOutputToLog(logEntry, `[LAUNCH] Opening shortcut: ${found.name} (${targetUrl})`, "term-line-success");
                setTimeout(() => window.location.href = targetUrl, 250);
            } else {
                appendOutputToLog(logEntry, `[ERROR] Shortcut not found: "${targetParam}". Type 'sc ls' to view all.`, "term-line-error");
            }
            return;
        }

        if (sub === "add") {
            const name = args[1];
            const url = args[2];
            if (!name || !url) {
                appendOutputToLog(logEntry, "Usage: sc add <name> <url>", "term-line-warn");
                return;
            }
            shortcuts.push({ name, url });
            localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
            if (typeof renderShortcuts === "function") {
                renderShortcuts();
            }
            appendOutputToLog(logEntry, `[OK] Added shortcut: ${name} -> ${url}`, "term-line-success");
            return;
        }

        appendOutputToLog(logEntry, `Unknown shortcuts subcommand: ${sub}. Try: 'sc ls', 'sc open <id|name>', or 'sc add <name> <url>'`, "term-line-warn");
    }

    // Bookmarks Command
    function handleBookmarksCommand(args, logEntry) {
        const sub = args[0] ? args[0].toLowerCase() : "ls";

        if (sub === "toggle") {
            const sb = document.querySelector(".bookmark-sidebar");
            if (sb) {
                sb.classList.toggle("show");
                appendOutputToLog(logEntry, `[OK] Bookmarks bar toggled.`, "term-line-success");
            }
            return;
        }

        if (sub === "show") {
            const sb = document.querySelector(".bookmark-sidebar");
            if (sb) sb.classList.add("show");
            appendOutputToLog(logEntry, `[OK] Bookmarks bar shown.`, "term-line-success");
            return;
        }

        if (sub === "hide") {
            const sb = document.querySelector(".bookmark-sidebar");
            if (sb) sb.classList.remove("show");
            appendOutputToLog(logEntry, `[OK] Bookmarks bar hidden.`, "term-line-success");
            return;
        }

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
                        appendOutputToLog(logEntry, "No bookmarks found in Bookmarks Bar.", "term-line-info");
                        return;
                    }
                    let out = `<div class="term-line-header">── BOOKMARKS (${bookmarks.length}) ──────────────────────────────────</div>`;
                    bookmarks.slice(0, 12).forEach((bm, i) => {
                        out += `<div class="term-line-item"><span class="term-key">[${i + 1}]</span> <span class="term-val">${escapeHtml(bm.title)}</span> <span class="term-url">${escapeHtml(bm.url)}</span></div>`;
                    });
                    if (bookmarks.length > 12) {
                        out += `<div class="term-line-info">... and ${bookmarks.length - 12} more. Type 'bm toggle' to slide open full shelf.</div>`;
                    }
                    out += `<div class="term-line-info" style="margin-top:4px;">Type 'bm open 1' or 'bm open &lt;name&gt;' to launch.</div>`;
                    appendOutputToLog(logEntry, out);
                    return;
                }

                if (sub === "open" || !isNaN(parseInt(sub, 10))) {
                    const targetParam = sub === "open" ? args.slice(1).join(" ") : sub;
                    if (!targetParam) {
                        appendOutputToLog(logEntry, "Usage: bm open <number|name>", "term-line-warn");
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
                        appendOutputToLog(logEntry, `[LAUNCH] Opening bookmark: ${found.title}`, "term-line-success");
                        setTimeout(() => window.location.href = found.url, 250);
                    } else {
                        appendOutputToLog(logEntry, `[ERROR] Bookmark not found: "${targetParam}".`, "term-line-error");
                    }
                    return;
                }

                appendOutputToLog(logEntry, `Unknown bookmarks subcommand: ${sub}. Try: 'bm ls', 'bm open <id|name>', or 'bm toggle'`, "term-line-warn");
            });
        } else {
            appendOutputToLog(logEntry, "Chrome bookmarks API is currently not accessible from this context.", "term-line-warn");
        }
    }

    // Wallpaper Command
    function handleWallpaperCommand(args, logEntry) {
        if (args.length === 0 || args[0] === "picker" || args[0] === "modal" || args[0] === "open") {
            const btn = document.getElementById("changeBackgroundBtn");
            if (btn) {
                btn.click();
                appendOutputToLog(logEntry, "[OK] Wallpaper selection modal opened.", "term-line-success");
            } else {
                appendOutputToLog(logEntry, "[ERROR] Wallpaper modal button not found.", "term-line-error");
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
            appendOutputToLog(logEntry, "[OK] Wallpaper reset to theme default.", "term-line-success");
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
            appendOutputToLog(logEntry, `[OK] Solid wallpaper background set to ${colorVal}`, "term-line-success");
            return;
        }

        appendOutputToLog(logEntry, `Usage: 'wallpaper' (open picker), 'bg #0f172a' (set color), or 'bg reset'`, "term-line-warn");
    }

    // Settings Command — Full CLI configuration options
    function handleSettingsCommand(args, logEntry) {
        const toggleShortcutsInput = document.getElementById("toggle-shortcuts");
        const toggleStickyNotesInput = document.getElementById("toggle-sticky-notes");
        const widthSlider = document.getElementById("bookmark-bar-width");
        const rightDrawer = document.getElementById("right-drawer");
        const currentTheme = document.documentElement.getAttribute("data-theme") || "terminal";

        if (args.length === 0 || args[0] === "show" || args[0] === "status") {
            const shortcutsStatus = toggleShortcutsInput && toggleShortcutsInput.checked ? "ON" : "OFF";
            const notesStatus = toggleStickyNotesInput && toggleStickyNotesInput.checked ? "ON" : "OFF";
            const currentWidth = widthSlider ? widthSlider.value : "220";

            let out = `<div class="term-line-header">── EXTENSION CONFIGURATION OPTIONS ───────────────────────────────</div>`;
            out += `<div class="term-line-item"><span class="term-key">1. shortcuts</span>    : <span class="term-val">[${shortcutsStatus}]</span> (Command: 'settings shortcuts on|off')</div>`;
            out += `<div class="term-line-item"><span class="term-key">2. sticky-notes</span> : <span class="term-val">[${notesStatus}]</span> (Command: 'settings notes on|off')</div>`;
            out += `<div class="term-line-item"><span class="term-key">3. width</span>        : <span class="term-val">[${currentWidth}px]</span> (Command: 'settings width &lt;60-520&gt;')</div>`;
            out += `<div class="term-line-item"><span class="term-key">4. theme</span>        : <span class="term-val">[${currentTheme}]</span> (Command: 'theme &lt;name&gt;')</div>`;
            out += `<div class="term-line-item"><span class="term-key">5. wallpaper</span>    : <span class="term-val">[CUSTOM]</span> (Command: 'wallpaper' to open modal)</div>`;
            out += `<div class="term-line-item"><span class="term-key">6. drawer-panel</span> : <span class="term-val">[GUI]</span> (Command: 'settings open' to slide open drawer)</div>`;
            out += `<div class="term-line-info" style="margin-top:6px;">Type 'settings &lt;option&gt; &lt;value&gt;' to change options directly from CLI!</div>`;
            appendOutputToLog(logEntry, out);
            return;
        }

        const sub = args[0].toLowerCase();
        const val = args[1] ? args[1].toLowerCase() : "";

        if (sub === "shortcuts") {
            if (val === "on" || val === "true" || val === "1") {
                if (toggleShortcutsInput) {
                    toggleShortcutsInput.checked = true;
                    if (typeof toggleShortcutsInput.dispatchEvent === "function") {
                        toggleShortcutsInput.dispatchEvent(new Event("change"));
                    }
                }
                appendOutputToLog(logEntry, "[OK] Shortcuts drawer enabled (ON).", "term-line-success");
            } else if (val === "off" || val === "false" || val === "0") {
                if (toggleShortcutsInput) {
                    toggleShortcutsInput.checked = false;
                    if (typeof toggleShortcutsInput.dispatchEvent === "function") {
                        toggleShortcutsInput.dispatchEvent(new Event("change"));
                    }
                }
                appendOutputToLog(logEntry, "[OK] Shortcuts drawer disabled (OFF).", "term-line-success");
            } else {
                appendOutputToLog(logEntry, "Usage: settings shortcuts on | off", "term-line-warn");
            }
            return;
        }

        if (sub === "notes" || sub === "stickynotes") {
            if (val === "on" || val === "true" || val === "1") {
                if (toggleStickyNotesInput) {
                    toggleStickyNotesInput.checked = true;
                    if (typeof toggleStickyNotesInput.dispatchEvent === "function") {
                        toggleStickyNotesInput.dispatchEvent(new Event("change"));
                    }
                }
                appendOutputToLog(logEntry, "[OK] Sticky notes enabled (ON).", "term-line-success");
            } else if (val === "off" || val === "false" || val === "0") {
                if (toggleStickyNotesInput) {
                    toggleStickyNotesInput.checked = false;
                    if (typeof toggleStickyNotesInput.dispatchEvent === "function") {
                        toggleStickyNotesInput.dispatchEvent(new Event("change"));
                    }
                }
                appendOutputToLog(logEntry, "[OK] Sticky notes disabled (OFF).", "term-line-success");
            } else {
                appendOutputToLog(logEntry, "Usage: settings notes on | off", "term-line-warn");
            }
            return;
        }

        if (sub === "width") {
            const num = parseInt(val, 10);
            if (!isNaN(num) && num >= 60 && num <= 520) {
                if (widthSlider) {
                    widthSlider.value = num;
                    if (typeof widthSlider.dispatchEvent === "function") {
                        widthSlider.dispatchEvent(new Event("input"));
                    }
                }
                localStorage.setItem("bookmark-bar-width", num.toString());
                document.documentElement.style.setProperty("--bookmark-bar-width", `${num}px`);
                appendOutputToLog(logEntry, `[OK] Bookmark bar width set to ${num}px.`, "term-line-success");
            } else {
                appendOutputToLog(logEntry, "Usage: settings width <60-520> (e.g. settings width 260)", "term-line-warn");
            }
            return;
        }

        if (sub === "open" || sub === "gui" || sub === "drawer") {
            if (rightDrawer) {
                rightDrawer.classList.add("open");
                appendOutputToLog(logEntry, "[OK] Graphical Settings drawer opened.", "term-line-success");
            }
            return;
        }

        if (sub === "close") {
            if (rightDrawer) {
                rightDrawer.classList.remove("open");
                appendOutputToLog(logEntry, "[OK] Settings drawer closed.", "term-line-success");
            }
            return;
        }

        appendOutputToLog(logEntry, `Unknown settings option: ${sub}. Type 'settings' to see all available options.`, "term-line-warn");
    }

    // Notes Command
    function handleNotesCommand(args, logEntry) {
        const sub = args[0] ? args[0].toLowerCase() : "toggle";

        if (sub === "toggle" || args.length === 0) {
            const btn = document.getElementById("add-sticky-note-btn");
            if (btn) {
                btn.click();
                appendOutputToLog(logEntry, "[OK] Sticky notes opened.", "term-line-success");
            }
            return;
        }

        if (sub === "add") {
            const noteText = args.slice(1).join(" ").trim();
            if (!noteText) {
                appendOutputToLog(logEntry, "Usage: note add <text of your note>", "term-line-warn");
                return;
            }

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

            if (typeof renderStickyNotes === "function") {
                renderStickyNotes();
            } else {
                const btn = document.getElementById("add-sticky-note-btn");
                if (btn) btn.click();
            }
            appendOutputToLog(logEntry, `[OK] Created new sticky note: "${noteText}"`, "term-line-success");
            return;
        }

        appendOutputToLog(logEntry, `Usage: 'notes' (toggle) or 'note add <text>'`, "term-line-warn");
    }

    // Theme Command
    function handleThemeCommand(args, logEntry) {
        if (args.length === 0 || args[0] === "ls" || args[0] === "list") {
            const current = document.documentElement.getAttribute("data-theme") || "terminal";
            let out = `<div class="term-line-header">── AVAILABLE THEMES ──────────────────────────────────────────</div>`;
            THEME_OPTIONS.forEach(t => {
                const isCurrent = t === current ? " [CURRENT]" : "";
                out += `<div class="term-line-item"><span class="term-key">* ${t}</span> <span class="term-val">${isCurrent}</span></div>`;
            });
            out += `<div class="term-line-info" style="margin-top:4px;">Type 'theme &lt;name&gt;' (e.g. 'theme macos', 'theme brutalist', 'theme terminal') to switch.</div>`;
            appendOutputToLog(logEntry, out);
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
            appendOutputToLog(logEntry, `[OK] Switched theme to: ${targetTheme}`, "term-line-success");
        } else {
            appendOutputToLog(logEntry, `[ERROR] Unknown theme: "${inputTheme}". Type 'theme' to view all themes.`, "term-line-error");
        }
    }

    // Math evaluation
    function evaluateMath(expr, logEntry) {
        if (!expr) {
            appendOutputToLog(logEntry, "Usage: calc <expression> (e.g. calc 14 * 8 + 2)", "term-line-warn");
            return;
        }

        try {
            if (/[^0-9+\-*/().,%^ Math\.EPIsqrtpowsincoatanlg]/.test(expr)) {
                appendOutputToLog(logEntry, "[ERROR] Invalid characters in math expression.", "term-line-error");
                return;
            }
            const sanitized = expr.replace(/\^/g, "**");
            const result = Function(`"use strict"; return (${sanitized});`)();
            appendOutputToLog(logEntry, `Result: ${result}`, "term-line-success");
        } catch (e) {
            appendOutputToLog(logEntry, `[ERROR] Calculation failed: ${e.message}`, "term-line-error");
        }
    }

    // History Command
    function showHistory(logEntry) {
        if (commandHistory.length === 0) {
            appendOutputToLog(logEntry, "No commands in history.", "term-line-info");
            return;
        }
        let out = `<div class="term-line-header">── COMMAND HISTORY ───────────────────────────────────────────</div>`;
        commandHistory.slice(-10).forEach((cmd, i) => {
            out += `<div class="term-line-item"><span class="term-key">${i + 1}</span>  <span class="term-val">${escapeHtml(cmd)}</span></div>`;
        });
        appendOutputToLog(logEntry, out);
    }

    // ==========================================
    // TAB AUTOCOMPLETE & CYCLING ENGINE
    // ==========================================
    const DEFAULT_CLI_TARGETS = [
        "github", "gitlab", "gitbucket", "gatlib", "guthib",
        "google", "gmail", "gist", "stackoverflow", "youtube", "reddit", "twitter", "chatgpt"
    ];

    const COMMON_WEB_TARGETS = {
        "github": "https://github.com",
        "gitlab": "https://gitlab.com",
        "gitbucket": "https://gitbucket.github.io",
        "gatlib": "https://github.com",
        "guthib": "https://github.com",
        "google": "https://google.com",
        "gmail": "https://mail.google.com",
        "gist": "https://gist.github.com",
        "stackoverflow": "https://stackoverflow.com",
        "youtube": "https://youtube.com",
        "reddit": "https://reddit.com",
        "twitter": "https://x.com",
        "chatgpt": "https://chatgpt.com"
    };

    let tabCycleState = {
        active: false,
        prefixBeforeWord: "",
        searchPrefix: "",
        candidates: [],
        currentIndex: -1
    };

    function resetTabCycle() {
        tabCycleState.active = false;
        tabCycleState.prefixBeforeWord = "";
        tabCycleState.searchPrefix = "";
        tabCycleState.candidates = [];
        tabCycleState.currentIndex = -1;
    }

    function getShortcutNames() {
        try {
            const shortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];
            return shortcuts.map(s => (s.name || "").trim()).filter(Boolean);
        } catch (e) {
            return [];
        }
    }

    function getBookmarkNames() {
        const names = [];
        const linkEls = document.querySelectorAll(".bookmark-list a, #bookmarks-list a");
        linkEls.forEach(el => {
            const text = (el.textContent || "").trim();
            if (text && !names.includes(text)) {
                names.push(text);
            }
        });
        return names;
    }

    function getRootCandidates(searchPrefix) {
        const commands = ROOT_COMMANDS.map(c => c.name);
        const shortcuts = getShortcutNames();
        const bookmarks = getBookmarkNames();

        const pool = [];
        const addUnique = (arr) => {
            arr.forEach(item => {
                if (item && !pool.some(p => p.toLowerCase() === item.toLowerCase())) {
                    pool.push(item);
                }
            });
        };

        addUnique(commands);
        addUnique(shortcuts);
        addUnique(DEFAULT_CLI_TARGETS);
        addUnique(bookmarks);

        if (!searchPrefix) {
            return commands;
        }

        const query = searchPrefix.toLowerCase();
        // 1. Matches that start with the query (alphabetically sorted)
        const starts = pool.filter(item => item.toLowerCase().startsWith(query));
        if (starts.length > 0) {
            return starts.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        }

        // 2. Matches that contain the query
        const contains = pool.filter(item => item.toLowerCase().includes(query));
        return contains.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }

    function handleTabComplete(isReverse = false) {
        // If already actively cycling, just advance to the next candidate!
        if (tabCycleState.active && tabCycleState.candidates.length > 0) {
            cycleToNextCandidate(isReverse);
            return;
        }

        // Fresh Tab press: determine context and candidates
        const rawVal = termInput.value;
        const val = rawVal.trimStart();
        const leadingWhitespace = rawVal.slice(0, rawVal.length - val.length);

        let prefixBeforeWord = leadingWhitespace;
        let searchPrefix = "";
        let candidates = [];

        const parts = val.split(" ");
        const firstWord = parts[0].toLowerCase();

        if (parts.length > 1) {
            const subArg = parts.slice(1).join(" ");
            const subArgLower = subArg.toLowerCase();

            if (firstWord === "theme") {
                prefixBeforeWord += `${parts[0]} `;
                searchPrefix = subArg;
                candidates = THEME_OPTIONS.filter(t => t.toLowerCase().startsWith(searchPrefix.toLowerCase()));
            } else if (firstWord === "settings" || firstWord === "config" || firstWord === "cfg") {
                prefixBeforeWord += `${parts[0]} `;
                searchPrefix = subArg;
                const options = ["shortcuts on", "shortcuts off", "notes on", "notes off", "width", "open", "close"];
                candidates = options.filter(o => o.toLowerCase().startsWith(searchPrefix.toLowerCase()));
            } else if (firstWord === "sc" || firstWord === "shortcuts") {
                if (subArgLower.startsWith("open ") || subArgLower === "open") {
                    const openPrefixMatch = subArg.match(/^open\s*/i);
                    const openPrefix = openPrefixMatch ? openPrefixMatch[0] : "open ";
                    prefixBeforeWord += `${parts[0]} ${openPrefix}`;
                    searchPrefix = subArg.slice(openPrefix.length);
                    const scPool = [...getShortcutNames(), ...DEFAULT_CLI_TARGETS];
                    candidates = scPool.filter(n => n.toLowerCase().startsWith(searchPrefix.toLowerCase()));
                } else {
                    prefixBeforeWord += `${parts[0]} `;
                    searchPrefix = subArg;
                    const subCmds = ["ls", "open", "add"];
                    candidates = subCmds.filter(s => s.toLowerCase().startsWith(searchPrefix.toLowerCase()));
                }
            } else if (firstWord === "bm" || firstWord === "bookmarks") {
                if (subArgLower.startsWith("open ") || subArgLower === "open") {
                    const openPrefixMatch = subArg.match(/^open\s*/i);
                    const openPrefix = openPrefixMatch ? openPrefixMatch[0] : "open ";
                    prefixBeforeWord += `${parts[0]} ${openPrefix}`;
                    searchPrefix = subArg.slice(openPrefix.length);
                    const bmPool = getBookmarkNames();
                    candidates = bmPool.filter(n => n.toLowerCase().startsWith(searchPrefix.toLowerCase()));
                } else {
                    prefixBeforeWord += `${parts[0]} `;
                    searchPrefix = subArg;
                    const subCmds = ["ls", "open", "toggle", "show", "hide"];
                    candidates = subCmds.filter(s => s.toLowerCase().startsWith(searchPrefix.toLowerCase()));
                }
            } else if (firstWord === "wallpaper" || firstWord === "bg" || firstWord === "wp") {
                prefixBeforeWord += `${parts[0]} `;
                searchPrefix = subArg;
                const presets = ["picker", "reset", "#0a0a0a", "#0f172a", "#1e293b", "#14532d", "#7f1d1d"];
                candidates = presets.filter(p => p.toLowerCase().startsWith(searchPrefix.toLowerCase()));
            } else if (firstWord === "search" || firstWord === "google") {
                prefixBeforeWord += `${parts[0]} `;
                searchPrefix = subArg;
                const allNames = [...getShortcutNames(), ...DEFAULT_CLI_TARGETS, ...getBookmarkNames()];
                candidates = allNames.filter(n => n.toLowerCase().startsWith(searchPrefix.toLowerCase()));
            } else {
                prefixBeforeWord += `${parts.slice(0, -1).join(" ")} `;
                searchPrefix = parts[parts.length - 1];
                candidates = getRootCandidates(searchPrefix);
            }
        } else {
            // Root prompt / first word
            prefixBeforeWord = leadingWhitespace;
            searchPrefix = val;
            candidates = getRootCandidates(searchPrefix);
        }

        if (candidates.length === 0) {
            hideSuggestions();
            return;
        }

        // Initialize cycling state
        tabCycleState.active = true;
        tabCycleState.prefixBeforeWord = prefixBeforeWord;
        tabCycleState.searchPrefix = searchPrefix;
        tabCycleState.candidates = candidates;
        tabCycleState.currentIndex = isReverse ? candidates.length - 1 : 0;

        // Apply first candidate to input
        const selected = candidates[tabCycleState.currentIndex];
        termInput.value = `${prefixBeforeWord}${selected}`;
        termInput.setSelectionRange(termInput.value.length, termInput.value.length);

        // Show suggestions tray with active index highlighted
        showSuggestions(candidates, prefixBeforeWord, tabCycleState.currentIndex);
    }

    function cycleToNextCandidate(isReverse = false) {
        if (!tabCycleState.candidates.length) return;

        if (isReverse) {
            tabCycleState.currentIndex = (tabCycleState.currentIndex - 1 + tabCycleState.candidates.length) % tabCycleState.candidates.length;
        } else {
            tabCycleState.currentIndex = (tabCycleState.currentIndex + 1) % tabCycleState.candidates.length;
        }

        const selected = tabCycleState.candidates[tabCycleState.currentIndex];
        termInput.value = `${tabCycleState.prefixBeforeWord}${selected}`;
        termInput.setSelectionRange(termInput.value.length, termInput.value.length);

        updateActiveSuggestionChip(tabCycleState.currentIndex);
    }

    function showSuggestions(list, prefixToInsert = "", activeIndex = 0) {
        if (!termSuggestions || list.length === 0) {
            hideSuggestions();
            return;
        }

        currentSuggestions = list;
        termSuggestions.innerHTML = "";

        list.forEach((item, idx) => {
            const chip = document.createElement("div");
            chip.className = "term-suggestion-chip" + (idx === activeIndex ? " active" : "");
            chip.innerHTML = `<span class="chip-glyph">❯</span><span>${escapeHtml(item)}</span>`;

            chip.addEventListener("click", () => {
                tabCycleState.active = true;
                tabCycleState.currentIndex = idx;
                termInput.value = `${tabCycleState.prefixBeforeWord || prefixToInsert}${item}`;
                updateActiveSuggestionChip(idx);
                termInput.focus();
                termInput.setSelectionRange(termInput.value.length, termInput.value.length);
            });

            termSuggestions.appendChild(chip);
        });

        const hint = document.createElement("div");
        hint.className = "term-suggestion-hint";
        hint.textContent = "[TAB] next • [SHIFT+TAB] prev • [ENTER] run";
        termSuggestions.appendChild(hint);

        termSuggestions.style.display = "flex";

        updateActiveSuggestionChip(activeIndex);
    }

    function updateActiveSuggestionChip(activeIndex) {
        if (!termSuggestions) return;
        const chips = termSuggestions.querySelectorAll(".term-suggestion-chip");
        chips.forEach((c, idx) => {
            if (idx === activeIndex) {
                c.classList.add("active");
                c.scrollIntoView({ block: "nearest", inline: "nearest" });
            } else {
                c.classList.remove("active");
            }
        });
    }

    function hideSuggestions() {
        if (termSuggestions) {
            termSuggestions.style.display = "none";
            termSuggestions.innerHTML = "";
        }
        currentSuggestions = [];
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

    // Expose global console interface
    window.terminalConsole = {
        execute: executeCommand,
        clear: clearScreen,
        setMaximized: (max) => setTerminalWindowState(max ? "maximized" : "restored"),
        setWindowState: setTerminalWindowState
    };

    // Auto-init
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
