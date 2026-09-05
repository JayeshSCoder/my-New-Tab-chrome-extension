const spotifyElements = {
  container: document.getElementById("spotify-controller"),
  authButton: document.getElementById("spotify-auth-button"),
  clientIdInput: document.getElementById("spotify-client-id"),
  trackName: document.getElementById("spotify-track-name"),
  trackArtist: document.getElementById("spotify-track-artist"),
  playButton: document.getElementById("spotify-play"),
  prevButton: document.getElementById("spotify-prev"),
  nextButton: document.getElementById("spotify-next"),
  seekBar: document.getElementById("spotify-seek"),
  currentTime: document.getElementById("spotify-current-time"),
  totalTime: document.getElementById("spotify-total-time"),
  volume: document.getElementById("spotify-volume"),
};

const SPOTIFY_STATE_KEY = "spotify-auth-state-v1";
const SPOTIFY_CLIENT_ID_KEY = "spotify-client-id-v1";
const SPOTIFY_SCOPES = "user-top-read";
const SEEK_UPDATE_MS = 250;

const spotifyState = {
  accessToken: "",
  refreshToken: "",
  expiresAt: 0,
  tracks: [],
  currentTrackIndex: 0,
  isPlaying: false,
};

const spotifyAudio = new Audio();
spotifyAudio.preload = "none";
spotifyAudio.volume = 0.75;

let seekUpdateTimer = null;
let isSeekingManually = false;

function saveSpotifyState() {
  localStorage.setItem(
    SPOTIFY_STATE_KEY,
    JSON.stringify({
      accessToken: spotifyState.accessToken,
      refreshToken: spotifyState.refreshToken,
      expiresAt: spotifyState.expiresAt,
    })
  );
}

function loadSpotifyState() {
  try {
    const raw = localStorage.getItem(SPOTIFY_STATE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    spotifyState.accessToken = parsed.accessToken || "";
    spotifyState.refreshToken = parsed.refreshToken || "";
    spotifyState.expiresAt = parsed.expiresAt || 0;
  } catch (_error) {
    disconnectSpotify();
  }
}

function updateAuthButton() {
  if (!spotifyElements.authButton) return;
  const connected = Boolean(spotifyState.accessToken || spotifyState.refreshToken);
  spotifyElements.authButton.textContent = connected ? "Disconnect" : "Connect";
}

function saveClientId(value) {
  localStorage.setItem(SPOTIFY_CLIENT_ID_KEY, value);
}

function loadClientId() {
  return localStorage.getItem(SPOTIFY_CLIENT_ID_KEY) || "";
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function updateShortcutAwarePosition() {
  const shortcutsToggle = document.getElementById("toggle-shortcuts");
  if (!spotifyElements.container || !shortcutsToggle) return;
  spotifyElements.container.classList.toggle("shortcuts-hidden", !shortcutsToggle.checked);
}

function setPlayerMessage(name, artist) {
  if (spotifyElements.trackName) spotifyElements.trackName.textContent = name;
  if (spotifyElements.trackArtist) spotifyElements.trackArtist.textContent = artist;
}

function updateSeekUI() {
  if (!spotifyElements.seekBar || !spotifyElements.currentTime || !spotifyElements.totalTime) return;

  const duration = spotifyAudio.duration || 0;
  const currentTime = spotifyAudio.currentTime || 0;
  const percent = duration ? (currentTime / duration) * 100 : 0;

  if (!isSeekingManually) {
    spotifyElements.seekBar.value = String(percent);
  }
  spotifyElements.currentTime.textContent = formatSeconds(currentTime);
  spotifyElements.totalTime.textContent = formatSeconds(duration);
}

function setConnectedUI(connected) {
  if (!spotifyElements.container) return;
  spotifyElements.container.classList.toggle("hidden", !connected);
  updateShortcutAwarePosition();
}

async function sha256Base64Url(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuffer);
  let str = "";
  bytes.forEach((byte) => {
    str += String.fromCharCode(byte);
  });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues, (value) => chars[value % chars.length]).join("");
}

function launchAuthFlow(url) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(redirectUrl || "");
    });
  });
}

async function exchangeCodeForToken({ clientId, code, verifier, redirectUri }) {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Spotify token exchange failed.");
  }

  return response.json();
}

async function refreshAccessToken(clientId) {
  if (!spotifyState.refreshToken) return false;

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: spotifyState.refreshToken,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  spotifyState.accessToken = data.access_token || "";
  spotifyState.expiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
  if (data.refresh_token) {
    spotifyState.refreshToken = data.refresh_token;
  }
  saveSpotifyState();
  return Boolean(spotifyState.accessToken);
}

async function ensureSpotifyToken() {
  const clientId = loadClientId();
  if (!spotifyState.accessToken) {
    if (!clientId) return false;
    return refreshAccessToken(clientId);
  }

  if (Date.now() < spotifyState.expiresAt - 60_000) return true;
  if (!clientId) return false;
  return refreshAccessToken(clientId);
}

async function spotifyApiRequest(path) {
  const tokenReady = await ensureSpotifyToken();
  if (!tokenReady) {
    disconnectSpotify();
    return null;
  }

  const headers = {};
  headers.Authorization = `Be` + `arer ${spotifyState.accessToken}`;
  const response = await fetch(`https://api.spotify.com/v1${path}`, { headers });

  if (response.status === 401) {
    const clientId = loadClientId();
    const refreshed = clientId ? await refreshAccessToken(clientId) : false;
    if (!refreshed) {
      disconnectSpotify();
      return null;
    }
    return spotifyApiRequest(path);
  }

  if (!response.ok) return null;
  return response.json();
}

async function loadSpotifyTracks() {
  const topTracks = await spotifyApiRequest("/me/top/tracks?limit=25");
  let tracks = (topTracks?.items || []).filter((track) => track.preview_url);

  if (!tracks.length) {
    const searchResult = await spotifyApiRequest("/search?type=track&limit=25&q=top%20hits");
    tracks = (searchResult?.tracks?.items || []).filter((track) => track.preview_url);
  }

  spotifyState.tracks = tracks;
  spotifyState.currentTrackIndex = 0;

  if (!tracks.length) {
    setPlayerMessage("No preview tracks found", "Try another Spotify account");
    spotifyAudio.pause();
    spotifyState.isPlaying = false;
    updatePlayButton();
    return;
  }

  setCurrentTrack(0, false);
}

function updatePlayButton() {
  if (!spotifyElements.playButton) return;
  spotifyElements.playButton.textContent = spotifyState.isPlaying ? "⏸" : "▶";
}

function setCurrentTrack(index, autoPlay = true) {
  const track = spotifyState.tracks[index];
  if (!track) return;

  spotifyState.currentTrackIndex = index;
  spotifyAudio.src = track.preview_url || "";
  spotifyAudio.currentTime = 0;

  const artistNames = (track.artists || []).map((artist) => artist.name).join(", ");
  setPlayerMessage(track.name || "Unknown track", artistNames || "Unknown artist");
  updateSeekUI();

  if (autoPlay) {
    spotifyAudio.play().catch(() => {
      spotifyState.isPlaying = false;
      updatePlayButton();
    });
  }
}

function playNextTrack(direction = 1) {
  if (!spotifyState.tracks.length) return;
  const nextIndex =
    (spotifyState.currentTrackIndex + direction + spotifyState.tracks.length) % spotifyState.tracks.length;
  setCurrentTrack(nextIndex, spotifyState.isPlaying);
}

function disconnectSpotify() {
  spotifyAudio.pause();
  spotifyAudio.removeAttribute("src");
  spotifyState.accessToken = "";
  spotifyState.refreshToken = "";
  spotifyState.expiresAt = 0;
  spotifyState.tracks = [];
  spotifyState.currentTrackIndex = 0;
  spotifyState.isPlaying = false;
  localStorage.removeItem(SPOTIFY_STATE_KEY);
  updatePlayButton();
  setConnectedUI(false);
  updateAuthButton();
  setPlayerMessage("Not playing", "Connect Spotify to start");
  if (spotifyElements.seekBar) spotifyElements.seekBar.value = "0";
  if (spotifyElements.currentTime) spotifyElements.currentTime.textContent = "0:00";
  if (spotifyElements.totalTime) spotifyElements.totalTime.textContent = "0:00";
}

async function connectSpotify() {
  if (!chrome?.identity?.launchWebAuthFlow || !chrome?.identity?.getRedirectURL) {
    alert("Spotify connect is not available in this browser context.");
    return;
  }

  const clientId = (spotifyElements.clientIdInput?.value || "").trim();
  if (!clientId) {
    alert("Please enter your Spotify Client ID first.");
    return;
  }
  saveClientId(clientId);

  const redirectUri = chrome.identity.getRedirectURL("spotify");
  const verifier = randomString(96);
  const challenge = await sha256Base64Url(verifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("scope", SPOTIFY_SCOPES);
  authUrl.searchParams.set("show_dialog", "true");

  try {
    const redirectResponse = await launchAuthFlow(authUrl.toString());
    const parsedUrl = new URL(redirectResponse);
    const code = parsedUrl.searchParams.get("code");
    if (!code) {
      throw new Error("Authorization did not return a code.");
    }

    const tokenData = await exchangeCodeForToken({
      clientId,
      code,
      verifier,
      redirectUri,
    });

    spotifyState.accessToken = tokenData.access_token || "";
    spotifyState.refreshToken = tokenData.refresh_token || "";
    spotifyState.expiresAt = Date.now() + ((tokenData.expires_in || 3600) * 1000);
    saveSpotifyState();
    updateAuthButton();
    setConnectedUI(true);
    await loadSpotifyTracks();
  } catch (_error) {
    alert("Spotify connection failed. Please verify Client ID and app redirect URI.");
    disconnectSpotify();
  }
}

function setupSpotifyEvents() {
  spotifyAudio.addEventListener("play", () => {
    spotifyState.isPlaying = true;
    updatePlayButton();
  });

  spotifyAudio.addEventListener("pause", () => {
    spotifyState.isPlaying = false;
    updatePlayButton();
  });

  spotifyAudio.addEventListener("ended", () => {
    playNextTrack(1);
  });

  spotifyAudio.addEventListener("loadedmetadata", updateSeekUI);
  spotifyAudio.addEventListener("timeupdate", updateSeekUI);

  if (spotifyElements.playButton) {
    spotifyElements.playButton.addEventListener("click", () => {
      if (!spotifyState.tracks.length) return;
      if (spotifyAudio.paused) {
        spotifyAudio.play().catch(() => {});
      } else {
        spotifyAudio.pause();
      }
    });
  }

  spotifyElements.prevButton?.addEventListener("click", () => playNextTrack(-1));
  spotifyElements.nextButton?.addEventListener("click", () => playNextTrack(1));

  spotifyElements.volume?.addEventListener("input", (event) => {
    const target = event.target;
    spotifyAudio.volume = Number(target.value) / 100;
  });

  spotifyElements.seekBar?.addEventListener("input", () => {
    isSeekingManually = true;
  });

  spotifyElements.seekBar?.addEventListener("change", (event) => {
    const target = event.target;
    const percent = Number(target.value) / 100;
    if (Number.isFinite(spotifyAudio.duration) && spotifyAudio.duration > 0) {
      spotifyAudio.currentTime = spotifyAudio.duration * percent;
    }
    isSeekingManually = false;
    updateSeekUI();
  });

  spotifyElements.authButton?.addEventListener("click", async () => {
    const connected = Boolean(spotifyState.accessToken || spotifyState.refreshToken);
    if (connected) {
      disconnectSpotify();
      return;
    }
    await connectSpotify();
  });

  spotifyElements.clientIdInput?.addEventListener("change", (event) => {
    const value = event.target.value.trim();
    if (!value) return;
    saveClientId(value);
  });

  document.getElementById("toggle-shortcuts")?.addEventListener("change", updateShortcutAwarePosition);
}

async function initializeSpotify() {
  if (!spotifyElements.container || !spotifyElements.authButton || !spotifyElements.clientIdInput) return;

  const storedClientId = loadClientId();
  if (storedClientId) {
    spotifyElements.clientIdInput.value = storedClientId;
  }

  loadSpotifyState();
  setupSpotifyEvents();
  updateAuthButton();
  updatePlayButton();
  updateSeekUI();

  const connected = Boolean(spotifyState.accessToken || spotifyState.refreshToken);
  setConnectedUI(connected);

  if (connected) {
    const ready = await ensureSpotifyToken();
    if (ready) {
      await loadSpotifyTracks();
    } else {
      disconnectSpotify();
    }
  }

  if (seekUpdateTimer) {
    window.clearInterval(seekUpdateTimer);
  }
  seekUpdateTimer = window.setInterval(updateSeekUI, SEEK_UPDATE_MS);
}

document.addEventListener("DOMContentLoaded", initializeSpotify);
