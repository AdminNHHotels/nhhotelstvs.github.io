// firebase.js — Firebase SDK initialisation and data access layer

import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue, off, get }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let _db = null;
let _activeListeners = {}; // path → unsubscribe fn

/** Initialise Firebase. Must be called once before any other function. */
export function initFirebase() {
  const app = initializeApp(FIREBASE_CONFIG);
  _db = getDatabase(app);
  _setupConnectionMonitor();
}

/** Load device config from /devices/{deviceId} once (no live subscription). */
export async function loadDeviceConfig(deviceId) {
  const snapshot = await get(ref(_db, `devices/${deviceId}`));
  if (!snapshot.exists()) {
    throw new Error(`No device config found for "${deviceId}" in Firebase /devices/`);
  }
  return snapshot.val();
}

/** Load the categories map from /categories once. */
export async function loadCategories() {
  const snapshot = await get(ref(_db, "categories"));
  if (!snapshot.exists()) return {};
  return snapshot.val();
}

/**
 * Subscribe to live updates for today's reservations.
 * @param {string} dateStr — "YYYY-MM-DD"
 * @param {function} callback — called with the raw reservations object (or {})
 * @returns {function} unsubscribe — call to stop listening
 */
export function subscribeToReservations(dateStr, callback) {
  const path = `reservations/${dateStr}`;
  _removeListener(path);

  const dbRef = ref(_db, path);
  const unsub = onValue(dbRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });

  _activeListeners[path] = () => off(dbRef, "value", unsub);
  return _activeListeners[path];
}

/** Remove an active listener by path. */
function _removeListener(path) {
  if (_activeListeners[path]) {
    _activeListeners[path]();
    delete _activeListeners[path];
  }
}

/** Remove ALL active listeners (call on date rollover). */
export function removeAllListeners() {
  Object.keys(_activeListeners).forEach(_removeListener);
}

// ── Connection monitoring ──────────────────────────────────────────────────

let _disconnectTimer = null;

function _setupConnectionMonitor() {
  const connRef = ref(_db, ".info/connected");
  onValue(connRef, (snap) => {
    const connected = snap.val() === true;
    if (connected) {
      clearTimeout(_disconnectTimer);
      _disconnectTimer = null;
      hideConnecting();
    } else {
      // Only show overlay after RECONNECT_OVERLAY_DELAY_MS to avoid flicker on boot
      if (!_disconnectTimer) {
        _disconnectTimer = setTimeout(showConnecting, RECONNECT_OVERLAY_DELAY_MS);
      }
    }
  });
}

// These are resolved lazily to avoid circular dependency with ui.js
function showConnecting() {
  const el = document.getElementById("overlay-connecting");
  if (el) el.hidden = false;
}

function hideConnecting() {
  const el = document.getElementById("overlay-connecting");
  if (el) el.hidden = true;
}
