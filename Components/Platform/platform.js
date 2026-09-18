/*
    Small cross platform helpers so the extension behaves the same on
    Windows, macOS and Linux (keyboard labels differ per platform).
*/

function getOperatingSystem() {
    const userAgentDataPlatform = navigator.userAgentData && navigator.userAgentData.platform;
    const platform = String(userAgentDataPlatform || navigator.platform || navigator.userAgent || '').toLowerCase();

    if (platform.includes('mac') || platform.includes('darwin') || platform.includes('iphone') || platform.includes('ipad')) {
        return 'mac';
    }

    if (platform.includes('win')) {
        return 'windows';
    }

    if (platform.includes('linux') || platform.includes('x11') || platform.includes('cros') || platform.includes('android')) {
        return 'linux';
    }

    return 'other';
}

function isMacOS() {
    return getOperatingSystem() === 'mac';
}

// How the browser developer tools are opened on this platform
function getDevToolsShortcutLabel() {
    return isMacOS() ? '⌘ + ⌥ + I' : 'F12 or Ctrl + Shift + I';
}

window.getOperatingSystem = getOperatingSystem;
window.isMacOS = isMacOS;
window.getDevToolsShortcutLabel = getDevToolsShortcutLabel;