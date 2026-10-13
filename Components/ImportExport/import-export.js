/**
 * Import / Export Modal Component
 *
 * Handles importing and exporting of all user data:
 *   - Shortcuts            (localStorage: 'shortcuts' + chrome.storage.local)
 *   - Sticky Notes         (chrome.storage.local: 'stickyNotes')
 *   - App Settings         (localStorage: theme, user-name, toggles, wallpaper, etc.)
 *   - Wallpaper / Background (localStorage: 'backgroundImage', 'recentWallpapers')
 *   - Bookmark Bar Width   (localStorage: 'bookmark-bar-width')
 *
 * File format: JSON with schema version so future additions stay backward-compatible.
 */

(function () {
    'use strict';

    /* -----------------------------------------------------------------------
       Data manifest — each entry describes one exportable data slice.
       Add new slices here to make them appear in the Export checklist.
    ----------------------------------------------------------------------- */
    const DATA_MANIFEST = [
        {
            key: 'shortcuts',
            label: 'Shortcuts',
            description: 'Your custom shortcut links & favicons',
            icon: '🔗',
            read: readShortcuts,
            write: writeShortcuts,
        },
        {
            key: 'stickyNotes',
            label: 'Sticky Notes',
            description: 'All sticky notes content and positions',
            icon: '📝',
            read: readStickyNotes,
            write: writeStickyNotes,
        },
        {
            key: 'settings',
            label: 'App Settings',
            description: 'Theme, username, toggles, and UI preferences',
            icon: '⚙️',
            read: readSettings,
            write: writeSettings,
        },
        {
            key: 'wallpaper',
            label: 'Wallpaper',
            description: 'Current background image / color / gradient',
            icon: '🎨',
            read: readWallpaper,
            write: writeWallpaper,
        },
    ];

    const SCHEMA_VERSION = 1;
    const FILE_MIME = 'application/octet-stream';
    const FILE_EXT = '.mntbackup';
    const VAULT_HEADER = '-----BEGIN MY NEW TAB ENCRYPTED BACKUP-----';
    const VAULT_FOOTER = '-----END MY NEW TAB ENCRYPTED BACKUP-----';

    /* -----------------------------------------------------------------------
       DOM references (populated after DOMContentLoaded)
    ----------------------------------------------------------------------- */
    let backdrop, modal, closeBtn, importTab, exportTab;
    let importPanel, exportPanel;
    let dropzone, browseBtn, fileInput, importPreview;
    let previewFileName, previewFileMeta, previewRemoveBtn;
    let importItemsPreview, importActionBtn, importFooterInfo;
    let exportChecklist, selectAllBtn, selectedCountEl;
    let exportActionBtn, exportFooterInfo;
    let toastEl;

    // Parsed data from a loaded import file
    let pendingImportData = null;
    let pendingRawFile = null;
    let pendingRawContent = null;
    let isEncryptedFile = false;

    // Secret Key DOM elements
    let exportKeyInput, exportKeyToggle;
    let importKeyCard, importKeyInput, importKeyToggle, unlockBtn, keyFeedbackEl;
    let previewFileIcon;

    // State for export checklist
    let selectedKeys = new Set(DATA_MANIFEST.map(m => m.key)); // all selected by default

    /* -----------------------------------------------------------------------
       Init
    ----------------------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        injectHTML();
        cacheElements();
        setupTabs();
        setupExportChecklist();
        setupImportZone();
        setupCloseHandlers();
        setupOpenTrigger();
    });

    /* -----------------------------------------------------------------------
       HTML Injection (mirrors WallpaperModal pattern)
    ----------------------------------------------------------------------- */
    function injectHTML() {
        const el = document.createElement('div');
        el.innerHTML = `
        <div id="ie-backdrop" class="ie-backdrop hidden" aria-hidden="true">
            <div id="ie-modal" class="ie-modal" role="dialog" aria-labelledby="ie-modal-title">

                <!-- Header -->
                <div class="ie-header">
                    <div class="ie-title-group">
                        <div class="ie-title-icon">💾</div>
                        <div>
                            <h2 id="ie-modal-title" class="ie-title">Import &amp; Export</h2>
                            <p class="ie-subtitle">Back up or restore your dashboard data</p>
                        </div>
                    </div>
                    <button type="button" id="ie-close-btn" class="ie-close-btn" aria-label="Close">✕</button>
                </div>

                <!-- Tab Bar -->
                <div class="ie-tabs">
                    <button type="button" id="ie-tab-export" class="ie-tab active">
                        <span class="ie-tab-icon">📤</span> Export
                    </button>
                    <button type="button" id="ie-tab-import" class="ie-tab">
                        <span class="ie-tab-icon">📥</span> Import
                    </button>
                </div>

                <!-- Scrollable Body -->
                <div class="ie-body">

                    <!-- ===== EXPORT PANEL ===== -->
                    <div id="ie-panel-export" class="ie-panel active">
                        <div class="ie-section">
                            <div class="ie-section-title">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                                Choose what to export
                            </div>
                            <div class="ie-select-all-row">
                                <button type="button" id="ie-select-all-btn" class="ie-select-all-btn">Select All</button>
                                <span id="ie-selected-count" class="ie-selected-count">4 of 4 selected</span>
                            </div>
                            <div id="ie-export-checklist" class="ie-checklist">
                                <!-- populated by JS -->
                            </div>
                        </div>

                        <!-- Secret Key Section -->
                        <div class="ie-section ie-key-section">
                            <div class="ie-section-title">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                Secret Encryption Key (Required)
                            </div>
                            <div class="ie-key-container">
                                <p class="ie-key-hint">
                                    Set a secret password/key to protect your backup. The exported <strong>.mntbackup</strong> file is encrypted and cannot be viewed or understood by anyone without this key.
                                </p>
                                <div class="ie-key-input-row">
                                    <input type="password" id="ie-export-key" class="ie-key-input" placeholder="Create your secret key..." autocomplete="new-password">
                                    <button type="button" id="ie-export-key-toggle" class="ie-key-toggle-btn" title="Toggle visibility">👁️</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ===== IMPORT PANEL ===== -->
                    <div id="ie-panel-import" class="ie-panel">

                        <!-- Drop Zone -->
                        <div id="ie-dropzone" class="ie-dropzone">
                            <div class="ie-dropzone-icon">🔒</div>
                            <div class="ie-dropzone-text">Drop your encrypted backup file here</div>
                            <div class="ie-dropzone-hint">Supports <strong>.mntbackup</strong> files encrypted with your secret key</div>
                            <button type="button" id="ie-browse-btn" class="ie-dropzone-browse">Browse File…</button>
                        </div>
                        <input type="file" id="ie-file-input" accept=".mntbackup,.json,.bak,*" style="display:none">

                        <!-- Import Preview (shown after file parsed) -->
                        <div id="ie-import-preview" class="ie-import-preview">
                            <div id="ie-preview-file" class="ie-preview-file">
                                <span id="ie-preview-file-icon" class="ie-preview-file-icon">📁</span>
                                <div class="ie-preview-file-info">
                                    <div id="ie-preview-file-name" class="ie-preview-file-name">backup.mntbackup</div>
                                    <div id="ie-preview-file-meta" class="ie-preview-file-meta">—</div>
                                </div>
                                <button type="button" id="ie-preview-remove" class="ie-preview-remove" title="Remove file">✕</button>
                            </div>

                            <!-- Secret Key Unlock Box (for encrypted files) -->
                            <div id="ie-import-key-card" class="ie-import-key-card" style="display:none">
                                <div class="ie-import-key-header">
                                    <span class="ie-key-icon">🔐</span>
                                    <div>
                                        <div class="ie-import-key-title">Enter Secret Key to Decrypt</div>
                                        <div class="ie-import-key-desc">This backup is encrypted. Enter the secret key used during export:</div>
                                    </div>
                                </div>
                                <div class="ie-key-input-row">
                                    <input type="password" id="ie-import-key" class="ie-key-input" placeholder="Enter secret key..." autocomplete="current-password">
                                    <button type="button" id="ie-import-key-toggle" class="ie-key-toggle-btn" title="Toggle visibility">👁️</button>
                                    <button type="button" id="ie-unlock-btn" class="ie-btn ie-btn-unlock">Unlock</button>
                                </div>
                                <div id="ie-key-feedback" class="ie-key-feedback"></div>
                            </div>

                            <div id="ie-import-items-preview" class="ie-import-items-preview">
                                <!-- summary rows populated by JS -->
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Footer -->
                <div class="ie-footer">
                    <span id="ie-footer-info" class="ie-footer-info">Data is stored locally — never uploaded anywhere.</span>
                    <button type="button" id="ie-export-action-btn" class="ie-btn ie-btn-primary">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download Backup
                    </button>
                    <button type="button" id="ie-import-action-btn" class="ie-btn ie-btn-primary" style="display:none" disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Import &amp; Merge
                    </button>
                </div>

            </div>
        </div>
        <div id="ie-toast" class="ie-toast" role="status" aria-live="polite"></div>
        `;
        document.body.appendChild(el.firstElementChild);
        document.body.appendChild(el.lastElementChild);
    }

    /* -----------------------------------------------------------------------
       Cache DOM
    ----------------------------------------------------------------------- */
    function cacheElements() {
        backdrop = document.getElementById('ie-backdrop');
        modal    = document.getElementById('ie-modal');
        closeBtn = document.getElementById('ie-close-btn');

        importTab  = document.getElementById('ie-tab-import');
        exportTab  = document.getElementById('ie-tab-export');
        importPanel = document.getElementById('ie-panel-import');
        exportPanel = document.getElementById('ie-panel-export');

        dropzone         = document.getElementById('ie-dropzone');
        browseBtn        = document.getElementById('ie-browse-btn');
        fileInput        = document.getElementById('ie-file-input');
        importPreview    = document.getElementById('ie-import-preview');
        previewFileName  = document.getElementById('ie-preview-file-name');
        previewFileMeta  = document.getElementById('ie-preview-file-meta');
        previewFileIcon  = document.getElementById('ie-preview-file-icon');
        previewRemoveBtn = document.getElementById('ie-preview-remove');
        importItemsPreview = document.getElementById('ie-import-items-preview');
        importActionBtn  = document.getElementById('ie-import-action-btn');
        importFooterInfo = document.getElementById('ie-footer-info');

        exportChecklist  = document.getElementById('ie-export-checklist');
        selectAllBtn     = document.getElementById('ie-select-all-btn');
        selectedCountEl  = document.getElementById('ie-selected-count');
        exportActionBtn  = document.getElementById('ie-export-action-btn');

        exportKeyInput   = document.getElementById('ie-export-key');
        exportKeyToggle  = document.getElementById('ie-export-key-toggle');
        importKeyCard    = document.getElementById('ie-import-key-card');
        importKeyInput   = document.getElementById('ie-import-key');
        importKeyToggle  = document.getElementById('ie-import-key-toggle');
        unlockBtn        = document.getElementById('ie-unlock-btn');
        keyFeedbackEl    = document.getElementById('ie-key-feedback');

        toastEl = document.getElementById('ie-toast');
    }

    /* -----------------------------------------------------------------------
       Open / Close
    ----------------------------------------------------------------------- */
    function openModal() {
        backdrop.classList.remove('hidden');
        requestAnimationFrame(() => {
            backdrop.classList.add('visible');
            backdrop.setAttribute('aria-hidden', 'false');
        });
        // Always start on Export tab
        switchToTab('export');
        updateExportBtn();
    }

    function closeModal() {
        backdrop.classList.remove('visible');
        backdrop.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            backdrop.classList.add('hidden');
            // Reset import panel
            clearImportState();
        }, 320);
    }

    function setupCloseHandlers() {
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', e => {
            if (e.target === backdrop) closeModal();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    /* -----------------------------------------------------------------------
       Open Trigger — "Import & Export" button in the settings drawer
    ----------------------------------------------------------------------- */
    function setupOpenTrigger() {
        const triggerBtn = document.getElementById('ie-open-btn');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', openModal);
        }
        // Also expose globally so terminal command can call it
        window.openImportExportModal = openModal;
    }

    /* -----------------------------------------------------------------------
       Tabs
    ----------------------------------------------------------------------- */
    function switchToTab(tab) {
        const isExport = tab === 'export';

        exportTab.classList.toggle('active', isExport);
        importTab.classList.toggle('active', !isExport);
        exportPanel.classList.toggle('active', isExport);
        importPanel.classList.toggle('active', !isExport);

        exportActionBtn.style.display = isExport ? '' : 'none';
        importActionBtn.style.display = isExport ? 'none' : '';
    }

    function setupTabs() {
        exportTab.addEventListener('click', () => switchToTab('export'));
        importTab.addEventListener('click', () => switchToTab('import'));
    }

    /* -----------------------------------------------------------------------
       Export — Checklist
    ----------------------------------------------------------------------- */
    function setupExportChecklist() {
        exportChecklist.innerHTML = '';

        DATA_MANIFEST.forEach(item => {
            const row = document.createElement('div');
            row.className = 'ie-check-item selected';
            row.dataset.key = item.key;
            row.innerHTML = `
                <div class="ie-checkbox"><span class="ie-checkbox-tick">✓</span></div>
                <div class="ie-check-label">
                    <span class="ie-check-name">${item.icon}  ${item.label}</span>
                    <span class="ie-check-desc">${item.description}</span>
                </div>
            `;
            row.addEventListener('click', () => toggleExportItem(item.key, row));
            exportChecklist.appendChild(row);
        });

        // Select All / Deselect All
        selectAllBtn.addEventListener('click', () => {
            const allSelected = selectedKeys.size === DATA_MANIFEST.length;
            if (allSelected) {
                // Deselect all
                selectedKeys.clear();
                exportChecklist.querySelectorAll('.ie-check-item').forEach(r => r.classList.remove('selected'));
            } else {
                // Select all
                DATA_MANIFEST.forEach(m => selectedKeys.add(m.key));
                exportChecklist.querySelectorAll('.ie-check-item').forEach(r => r.classList.add('selected'));
            }
            updateExportCountLabel();
            updateExportBtn();
        });

        updateExportCountLabel();

        // Setup export secret key toggle
        if (exportKeyToggle && exportKeyInput) {
            exportKeyToggle.addEventListener('click', () => {
                const isPass = exportKeyInput.type === 'password';
                exportKeyInput.type = isPass ? 'text' : 'password';
                exportKeyToggle.textContent = isPass ? '🙈' : '👁️';
            });
        }

        // Action
        exportActionBtn.addEventListener('click', doExport);
    }

    function toggleExportItem(key, row) {
        if (selectedKeys.has(key)) {
            selectedKeys.delete(key);
            row.classList.remove('selected');
        } else {
            selectedKeys.add(key);
            row.classList.add('selected');
        }
        updateExportCountLabel();
        updateExportBtn();
    }

    function updateExportCountLabel() {
        const total = DATA_MANIFEST.length;
        const n = selectedKeys.size;
        selectedCountEl.textContent = `${n} of ${total} selected`;
        selectAllBtn.textContent = (n === total) ? 'Deselect All' : 'Select All';
    }

    function updateExportBtn() {
        exportActionBtn.disabled = selectedKeys.size === 0;
    }

    /* -----------------------------------------------------------------------
       Cryptographic Encryption & Decryption (AES-256-GCM + PBKDF2)
    ----------------------------------------------------------------------- */
    function bufferToBase64(buf) {
        const bytes = new Uint8Array(buf);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToBuffer(b64) {
        const binary = atob(b64.trim());
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async function deriveAesKey(passphrase, saltBytes) {
        const enc = new TextEncoder();
        const passKey = await crypto.subtle.importKey(
            'raw',
            enc.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBytes,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function encryptPayload(payloadObj, passphrase) {
        const enc = new TextEncoder();
        const jsonStr = JSON.stringify(payloadObj);
        const plaintext = enc.encode(jsonStr);

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const aesKey = await deriveAesKey(passphrase, salt);
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            aesKey,
            plaintext
        );

        const armored = [
            VAULT_HEADER,
            'Format: MNT-AES256-GCM',
            'Version: 1',
            `Salt: ${bufferToBase64(salt)}`,
            `IV: ${bufferToBase64(iv)}`,
            `Payload: ${bufferToBase64(ciphertext)}`,
            VAULT_FOOTER
        ].join('\n');

        return armored;
    }

    async function decryptPayload(fileText, passphrase) {
        if (!fileText.includes(VAULT_HEADER) || !fileText.includes(VAULT_FOOTER)) {
            throw new Error('NOT_AN_ENCRYPTED_BACKUP');
        }

        const saltMatch = fileText.match(/Salt:\s*([A-Za-z0-9+/=]+)/);
        const ivMatch = fileText.match(/IV:\s*([A-Za-z0-9+/=]+)/);
        const payloadMatch = fileText.match(/Payload:\s*([A-Za-z0-9+/=]+)/);

        if (!saltMatch || !ivMatch || !payloadMatch) {
            throw new Error('CORRUPTED_FILE');
        }

        const salt = new Uint8Array(base64ToBuffer(saltMatch[1]));
        const iv = new Uint8Array(base64ToBuffer(ivMatch[1]));
        const ciphertext = base64ToBuffer(payloadMatch[1]);

        const aesKey = await deriveAesKey(passphrase, salt);

        let decryptedBuffer;
        try {
            decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                ciphertext
            );
        } catch {
            throw new Error('INVALID_KEY');
        }

        const dec = new TextDecoder();
        const jsonStr = dec.decode(decryptedBuffer);
        return JSON.parse(jsonStr);
    }

    /* -----------------------------------------------------------------------
       Export — Generate & Download Encrypted Backup
    ----------------------------------------------------------------------- */
    async function doExport() {
        if (selectedKeys.size === 0) return;

        const secretKey = exportKeyInput ? exportKeyInput.value.trim() : '';
        if (!secretKey) {
            showToast('⚠️ Please enter a secret key to encrypt your backup.', 'error');
            if (exportKeyInput) {
                exportKeyInput.focus();
                exportKeyInput.classList.add('ie-input-error');
                setTimeout(() => exportKeyInput.classList.remove('ie-input-error'), 1800);
            }
            return;
        }

        try {
            exportActionBtn.disabled = true;
            exportActionBtn.textContent = 'Encrypting…';

            const payload = {
                _schema: SCHEMA_VERSION,
                _exported: new Date().toISOString(),
                _extension: 'my-new-tab',
            };

            // Collect data for selected slices
            await Promise.all(
                DATA_MANIFEST.filter(m => selectedKeys.has(m.key)).map(async m => {
                    try {
                        payload[m.key] = await m.read();
                    } catch (e) {
                        console.warn(`[IE] failed to read ${m.key}:`, e);
                        payload[m.key] = null;
                    }
                })
            );

            const encryptedArmored = await encryptPayload(payload, secretKey);
            const blob = new Blob([encryptedArmored], { type: FILE_MIME });
            const url  = URL.createObjectURL(blob);

            const dateStr = new Date().toISOString().slice(0, 10);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my-new-tab-backup-${dateStr}${FILE_EXT}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('🔒 Encrypted backup downloaded! Remember your secret key.', 'success');
        } catch (err) {
            console.error('[IE] Export failed:', err);
            showToast('❌ Export failed — see console for details.', 'error');
        } finally {
            exportActionBtn.disabled = false;
            exportActionBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Backup`;
        }
    }

    /* -----------------------------------------------------------------------
       Import — Drag & Drop + Browse
    ----------------------------------------------------------------------- */
    function setupImportZone() {
        // Browse button
        browseBtn.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('click', e => {
            if (e.target !== browseBtn) fileInput.click();
        });

        fileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) handleFile(file);
            fileInput.value = ''; // allow same file again
        });

        // Drag & Drop
        dropzone.addEventListener('dragover', e => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });
        dropzone.addEventListener('drop', e => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            const file = e.dataTransfer?.files[0];
            if (file) handleFile(file);
        });

        // Key toggle in import
        if (importKeyToggle && importKeyInput) {
            importKeyToggle.addEventListener('click', () => {
                const isPass = importKeyInput.type === 'password';
                importKeyInput.type = isPass ? 'text' : 'password';
                importKeyToggle.textContent = isPass ? '🙈' : '👁️';
            });
        }

        // Unlock action
        if (unlockBtn) {
            unlockBtn.addEventListener('click', attemptUnlock);
        }
        if (importKeyInput) {
            importKeyInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    attemptUnlock();
                }
            });
        }

        // Remove / clear
        previewRemoveBtn.addEventListener('click', clearImportState);

        // Import action
        importActionBtn.addEventListener('click', doImport);
    }

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = async e => {
            const content = String(e.target.result || '');
            pendingRawContent = content;
            pendingRawFile = file;

            if (content.includes(VAULT_HEADER)) {
                isEncryptedFile = true;
                showEncryptedPrompt(file);
                if (importKeyInput && importKeyInput.value.trim()) {
                    await attemptUnlock();
                }
            } else {
                // Check if legacy plain JSON
                isEncryptedFile = false;
                try {
                    const data = JSON.parse(content);
                    if (data._extension !== 'my-new-tab') {
                        showToast('⚠️ This file was not created by My New Tab.', 'error');
                        return;
                    }
                    pendingImportData = data;
                    if (importKeyCard) importKeyCard.style.display = 'none';
                    showImportPreview(file, data, false);
                } catch {
                    showToast('❌ Unsupported file format. Please upload your .mntbackup file.', 'error');
                }
            }
        };
        reader.readAsText(file);
    }

    function showEncryptedPrompt(file) {
        previewFileName.textContent = file.name;
        const kb = (file.size / 1024).toFixed(1);
        previewFileMeta.textContent = `${kb} KB · Encrypted with AES-256`;
        if (previewFileIcon) previewFileIcon.textContent = '🔒';

        if (importKeyCard) importKeyCard.style.display = 'block';
        importItemsPreview.innerHTML = '';
        if (keyFeedbackEl) {
            keyFeedbackEl.textContent = '';
            keyFeedbackEl.className = 'ie-key-feedback';
        }
        importPreview.classList.add('visible');
        importActionBtn.disabled = true;
        if (importKeyInput) importKeyInput.focus();
    }

    async function attemptUnlock() {
        if (!pendingRawContent) return;
        const key = importKeyInput ? importKeyInput.value.trim() : '';
        if (!key) {
            if (keyFeedbackEl) {
                keyFeedbackEl.textContent = '⚠️ Please enter your secret key.';
                keyFeedbackEl.className = 'ie-key-feedback error';
            }
            if (importKeyInput) importKeyInput.focus();
            return;
        }

        if (unlockBtn) {
            unlockBtn.disabled = true;
            unlockBtn.textContent = 'Decrypting…';
        }
        if (keyFeedbackEl) {
            keyFeedbackEl.textContent = '';
            keyFeedbackEl.className = 'ie-key-feedback';
        }

        try {
            const data = await decryptPayload(pendingRawContent, key);
            if (data._extension !== 'my-new-tab') {
                throw new Error('INVALID_EXTENSION');
            }
            pendingImportData = data;
            if (keyFeedbackEl) {
                keyFeedbackEl.textContent = '🔓 Correct key! Backup unlocked successfully.';
                keyFeedbackEl.className = 'ie-key-feedback success';
            }
            if (previewFileIcon) previewFileIcon.textContent = '✅';
            showImportPreview(pendingRawFile, data, true);
        } catch (err) {
            pendingImportData = null;
            importActionBtn.disabled = true;
            importItemsPreview.innerHTML = '';
            if (keyFeedbackEl) {
                if (err.message === 'INVALID_KEY') {
                    keyFeedbackEl.textContent = '❌ Incorrect secret key. Please check your key and try again.';
                } else {
                    keyFeedbackEl.textContent = '❌ Corrupted or invalid backup file format.';
                }
                keyFeedbackEl.className = 'ie-key-feedback error';
            }
            if (importKeyInput) {
                importKeyInput.classList.add('ie-input-error');
                setTimeout(() => importKeyInput.classList.remove('ie-input-error'), 1800);
            }
        } finally {
            if (unlockBtn) {
                unlockBtn.disabled = false;
                unlockBtn.textContent = 'Unlock';
            }
        }
    }

    function showImportPreview(file, data, isUnlocked) {
        // Show file info
        previewFileName.textContent = file ? file.name : 'backup.mntbackup';
        const kb = file ? (file.size / 1024).toFixed(1) : '—';
        const dateStr = data._exported ? new Date(data._exported).toLocaleString() : 'Unknown date';
        previewFileMeta.textContent = `${kb} KB · Exported ${dateStr}`;
        if (previewFileIcon) previewFileIcon.textContent = '✅';

        // Build per-slice summary
        importItemsPreview.innerHTML = '';
        DATA_MANIFEST.forEach(m => {
            if (!(m.key in data)) return;
            const val = data[m.key];
            const count = countItems(m.key, val);

            const row = document.createElement('div');
            row.className = 'ie-import-item-row';
            row.innerHTML = `
                <span>${m.icon}  ${m.label}</span>
                <span class="ie-import-item-count">${count}</span>
            `;
            importItemsPreview.appendChild(row);
        });

        importPreview.classList.add('visible');
        importActionBtn.disabled = false;
    }

    function countItems(key, val) {
        if (val === null || val === undefined) return 'empty';
        if (key === 'shortcuts' && Array.isArray(val)) return `${val.length} shortcuts`;
        if (key === 'stickyNotes' && Array.isArray(val)) return `${val.length} notes`;
        if (key === 'settings' && typeof val === 'object') return `${Object.keys(val).length} keys`;
        if (key === 'wallpaper' && typeof val === 'object') {
            return val.backgroundImage ? '1 background' : 'default';
        }
        return 'data';
    }

    function clearImportState() {
        pendingImportData = null;
        pendingRawFile = null;
        pendingRawContent = null;
        isEncryptedFile = false;
        if (importKeyCard) importKeyCard.style.display = 'none';
        if (importKeyInput) importKeyInput.value = '';
        if (keyFeedbackEl) {
            keyFeedbackEl.textContent = '';
            keyFeedbackEl.className = 'ie-key-feedback';
        }
        if (previewFileIcon) previewFileIcon.textContent = '📁';
        importPreview.classList.remove('visible');
        importItemsPreview.innerHTML = '';
        importActionBtn.disabled = true;
    }

    /* -----------------------------------------------------------------------
       Import — Merge & Apply
    ----------------------------------------------------------------------- */
    async function doImport() {
        if (!pendingImportData) return;

        try {
            importActionBtn.disabled = true;
            importActionBtn.textContent = 'Importing…';

            const data = pendingImportData;

            await Promise.all(
                DATA_MANIFEST.filter(m => m.key in data && data[m.key] !== null).map(async m => {
                    try {
                        await m.write(data[m.key]);
                    } catch (e) {
                        console.warn(`[IE] failed to write ${m.key}:`, e);
                    }
                })
            );

            showToast('✅  Data imported! Reloading…', 'success');
            setTimeout(() => window.location.reload(), 1400);
        } catch (err) {
            console.error('[IE] Import failed:', err);
            showToast('❌  Import failed — see console for details.', 'error');
            importActionBtn.disabled = false;
            importActionBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import &amp; Merge`;
        }
    }

    /* -----------------------------------------------------------------------
       Toast
    ----------------------------------------------------------------------- */
    let toastTimer = null;
    function showToast(msg, type = '') {
        toastEl.textContent = msg;
        toastEl.className = 'ie-toast visible' + (type ? ' ' + type : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastEl.classList.remove('visible');
        }, 3200);
    }

    /* ======================================================================
       DATA READERS
    ====================================================================== */

    function readShortcuts() {
        return new Promise(resolve => {
            const lsVal = JSON.parse(localStorage.getItem('shortcuts') || '[]');
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get('shortcuts', data => {
                    resolve(data.shortcuts || lsVal);
                });
            } else {
                resolve(lsVal);
            }
        });
    }

    function readStickyNotes() {
        return new Promise(resolve => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get('stickyNotes', data => {
                    resolve(data.stickyNotes || []);
                });
            } else {
                try {
                    resolve(JSON.parse(localStorage.getItem('stickyNotes') || '[]'));
                } catch {
                    resolve([]);
                }
            }
        });
    }

    function readSettings() {
        // Collect all relevant localStorage keys for settings
        const SETTING_KEYS = [
            'app-theme',
            'user-name',
            'toggle-shortcuts',
            'toggle-sticky-notes',
            'bookmark-bar-width',
            'terminal-window-state',
        ];
        const result = {};
        SETTING_KEYS.forEach(k => {
            const v = localStorage.getItem(k);
            if (v !== null) result[k] = v;
        });
        return Promise.resolve(result);
    }

    function readWallpaper() {
        return new Promise(resolve => {
            const result = {};
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['backgroundImage', 'recentWallpapers'], data => {
                    result.backgroundImage  = data.backgroundImage  || localStorage.getItem('backgroundImage')  || null;
                    result.recentWallpapers = data.recentWallpapers || tryParseJSON(localStorage.getItem('recentWallpapers')) || [];
                    resolve(result);
                });
            } else {
                result.backgroundImage  = localStorage.getItem('backgroundImage')  || null;
                result.recentWallpapers = tryParseJSON(localStorage.getItem('recentWallpapers')) || [];
                resolve(result);
            }
        });
    }

    /* ======================================================================
       DATA WRITERS  (append/merge — never destructively overwrite)
    ====================================================================== */

    function writeShortcuts(incoming) {
        return new Promise(resolve => {
            if (!Array.isArray(incoming)) return resolve();

            // Merge: append items whose URLs don't already exist
            const existing = JSON.parse(localStorage.getItem('shortcuts') || '[]');
            const existingUrls = new Set(existing.map(s => s.url));
            const toAdd = incoming.filter(s => !existingUrls.has(s.url));
            const merged = [...existing, ...toAdd];

            localStorage.setItem('shortcuts', JSON.stringify(merged));

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ shortcuts: merged }, resolve);
            } else {
                resolve();
            }
        });
    }

    function writeStickyNotes(incoming) {
        return new Promise(resolve => {
            if (!Array.isArray(incoming)) return resolve();

            // Merge: append notes whose IDs don't already exist
            const getExisting = () => new Promise(res => {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get('stickyNotes', d => res(d.stickyNotes || []));
                } else {
                    res(tryParseJSON(localStorage.getItem('stickyNotes')) || []);
                }
            });

            getExisting().then(existing => {
                const existingIds = new Set(existing.map(n => n.id));
                const toAdd = incoming.filter(n => !existingIds.has(n.id));
                const merged = [...existing, ...toAdd];

                localStorage.setItem('stickyNotes', JSON.stringify(merged));

                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ stickyNotes: merged }, resolve);
                } else {
                    resolve();
                }
            });
        });
    }

    function writeSettings(incoming) {
        if (typeof incoming !== 'object' || !incoming) return Promise.resolve();

        // Write each key from the backup into localStorage (overwrite only settings keys)
        const ALLOWED_KEYS = [
            'app-theme',
            'user-name',
            'toggle-shortcuts',
            'toggle-sticky-notes',
            'bookmark-bar-width',
            'terminal-window-state',
        ];
        ALLOWED_KEYS.forEach(k => {
            if (k in incoming) {
                localStorage.setItem(k, incoming[k]);
            }
        });
        return Promise.resolve();
    }

    function writeWallpaper(incoming) {
        return new Promise(resolve => {
            if (typeof incoming !== 'object' || !incoming) return resolve();

            if (incoming.backgroundImage) {
                localStorage.setItem('backgroundImage', incoming.backgroundImage);
            }
            if (Array.isArray(incoming.recentWallpapers) && incoming.recentWallpapers.length > 0) {
                // Merge recent wallpapers (keep newest first, cap at 5)
                let existing = tryParseJSON(localStorage.getItem('recentWallpapers')) || [];
                const merged = [...incoming.recentWallpapers, ...existing];
                // Deduplicate by value
                const seen = new Set();
                const deduped = merged.filter(v => {
                    if (seen.has(v)) return false;
                    seen.add(v);
                    return true;
                }).slice(0, 5);
                localStorage.setItem('recentWallpapers', JSON.stringify(deduped));
            }

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const toSet = {};
                if (incoming.backgroundImage) toSet.backgroundImage = incoming.backgroundImage;
                chrome.storage.local.set(toSet, resolve);
            } else {
                resolve();
            }
        });
    }

    /* ======================================================================
       Helpers
    ====================================================================== */
    function tryParseJSON(str) {
        try { return JSON.parse(str); } catch { return null; }
    }

})();
