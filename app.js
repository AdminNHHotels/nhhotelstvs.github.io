// app.js — Bootstrap: reads ?device=, drives state machine

import { initFirebase, loadDeviceConfig, loadCategories, subscribeToReservations, removeAllListeners }
  from "./firebase.js";
import { initState, setReservations, setCategories, evaluateState, onCategoryTap, transitionTo, STATE }
  from "./state.js";
import { showError, showFeedback } from "./ui.js";

// ── Boot ────────────────────────────────────────────────────────────────────

(async function boot() {
  // 1. Read ?device= query param
  const params   = new URLSearchParams(location.search);
  const deviceId = params.get("device");
  if (!deviceId) {
    showError('Missing ?device= parameter. Launch this app with e.g. http://localhost/?device=tv1');
    return;
  }

  // 2. Init Firebase
  initFirebase();

  let deviceConfig, categories;
  try {
    [deviceConfig, categories] = await Promise.all([
      loadDeviceConfig(deviceId),
      loadCategories(),
    ]);
  } catch (err) {
    showError(`Failed to load config: ${err.message}`);
    return;
  }

  // 3. Apply theme from device config
  _applyTheme(deviceConfig);

  // 4. Render category buttons (always visible)
  _renderCategoryButtons(deviceConfig, categories);

  // 5. Init state machine
  const mainContent = document.getElementById("main-content");
  initState(mainContent, deviceConfig, categories);

  // 6. Subscribe to today's reservations (live)
  let latestReservations = {};
  _subscribeForDate(_todayString(), (reservations) => {
    latestReservations = reservations;
    setReservations(reservations);
    evaluateState();
  });

  // 7. Periodic re-evaluation (time windows change even without Firebase update)
  setInterval(() => {
    setReservations(latestReservations);
    evaluateState();
  }, STATE_RECHECK_INTERVAL_MS);

  // 8. Midnight rollover
  _scheduleMidnightRollover(() => {
    removeAllListeners();
    latestReservations = {};
    setReservations({});
    _subscribeForDate(_todayString(), (reservations) => {
      latestReservations = reservations;
      setReservations(reservations);
      evaluateState();
    });
    evaluateState();
  });

  // 9. Kiosk: suppress context menu
  document.addEventListener("contextmenu", (e) => e.preventDefault());
})();

// ── Theme application ───────────────────────────────────────────────────────

function _applyTheme(config) {
  const body = document.body;
  body.dataset.size = config.size || "big";

  const color = config.heading_color || "#0033A0";
  document.documentElement.style.setProperty("--heading-color", color);
}

// ── Category buttons ────────────────────────────────────────────────────────

// Holds active cycling interval IDs so they can be cleared on re-render
let _btnCycleIntervals = [];

function _renderCategoryButtons(deviceConfig, categories) {
  // Clear any running image-cycle intervals from a previous render
  _btnCycleIntervals.forEach((id) => clearInterval(id));
  _btnCycleIntervals = [];

  const nav   = document.getElementById("category-buttons");
  nav.innerHTML = "";
  const order = deviceConfig.categories_order || Object.keys(categories);

  order.forEach((key) => {
    const cat = categories[key];
    if (!cat) return;

    const btn = document.createElement("button");
    btn.className         = "cat-btn";
    btn.dataset.category  = key;
    btn.setAttribute("aria-label", cat.label || key);

    // Resolve button images array (new field) or fall back to single URL (legacy)
    const images = (Array.isArray(cat.button_images) && cat.button_images.length > 0)
      ? cat.button_images
      : (cat.button_image_url ? [cat.button_image_url] : []);

    if (images.length > 0) {
      const img = document.createElement("img");
      img.src       = images[0];
      img.alt       = cat.label || key;
      img.className = "cat-btn-img";
      btn.appendChild(img);

      // Start cycling only when more than one image is available
      if (images.length > 1) {
        let idx = 0;
        const intervalId = setInterval(() => {
          idx = (idx + 1) % images.length;
          img.src = images[idx];
        }, BUTTON_IMAGE_CYCLE_MS);
        _btnCycleIntervals.push(intervalId);
      }
    } else {
      btn.textContent = cat.label || key;
    }

    btn.addEventListener("click", () => {
      showFeedback(btn);
      onCategoryTap(key);
    });

    nav.appendChild(btn);
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function _todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function _subscribeForDate(dateStr, callback) {
  subscribeToReservations(dateStr, callback);
}

function _scheduleMidnightRollover(callback) {
  const now      = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5); // 00:00:05
  const msUntil  = midnight - now;
  setTimeout(() => {
    callback();
    // Re-schedule for the following midnight
    _scheduleMidnightRollover(callback);
  }, msUntil);
}
