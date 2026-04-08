// app.js — Bootstrap: reads ?device=, drives state machine

import { initFirebase, loadDeviceConfig, loadCategories, subscribeToCategories, subscribeToReservations, removeAllListeners }
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
  initState(mainContent, deviceConfig, categories, deviceId);

  // 6. Subscribe to live category updates (re-renders buttons on Drive/Firebase change)
  subscribeToCategories((updatedCategories) => {
    setCategories(updatedCategories);
    _renderCategoryButtons(deviceConfig, updatedCategories);
    evaluateState();
  });

  // 7. Subscribe to today's reservations (live)
  let latestReservations = {};
  _subscribeForDate(_todayString(), (reservations) => {
    latestReservations = reservations;
    setReservations(reservations);
    evaluateState();
  });

  // 8. Periodic re-evaluation (time windows change even without Firebase update)
  setInterval(() => {
    setReservations(latestReservations);
    evaluateState();
  }, STATE_RECHECK_INTERVAL_MS);

  // 9. Midnight rollover
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

  // 10. Kiosk: suppress context menu
  document.addEventListener("contextmenu", (e) => e.preventDefault());
})();

// ── Theme application ───────────────────────────────────────────────────────

function _applyTheme(config) {
  const body = document.body;
  body.dataset.size = config.size || "big";

  const color = config.heading_color || "#003A70";
  const rgb = _hexToRgb(color);
  document.documentElement.style.setProperty("--heading-color", color);
  document.documentElement.style.setProperty("--frame-color", color);
  if (rgb) {
    document.documentElement.style.setProperty("--frame-color-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }
  document.documentElement.style.setProperty("--direction-icon-filter", _colorToSvgFilter(color));
}

function _hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

// Precomputed CSS filter strings to recolor black SVG arrows to brand colors.
const _SVG_FILTERS = {
  '#003a70': 'invert(18%) sepia(99%) saturate(780%) hue-rotate(198deg) brightness(88%) contrast(100%)',
  '#9d2235': 'invert(23%) sepia(79%) saturate(706%) hue-rotate(316deg) brightness(89%) contrast(100%)',
};
function _colorToSvgFilter(hex) {
  return _SVG_FILTERS[hex.toLowerCase()] || _SVG_FILTERS['#003a70'];
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
      if (images.length > 1) {
        // Two stacked images that crossfade between each other
        const wrap = document.createElement("div");
        wrap.className = "cat-btn-img-wrap";

        const imgA = document.createElement("img");
        imgA.src       = images[0];
        imgA.alt       = cat.label || key;
        imgA.className = "cat-btn-img";
        imgA.style.opacity = "1";

        const imgB = document.createElement("img");
        imgB.alt       = cat.label || key;
        imgB.className = "cat-btn-img";
        imgB.style.opacity = "0";

        wrap.appendChild(imgA);
        wrap.appendChild(imgB);
        btn.appendChild(wrap);

        let idx = 0;
        // front/back alternate each cycle
        let front = imgA, back = imgB;
        const intervalId = setInterval(() => {
          idx = (idx + 1) % images.length;
          back.src = images[idx];
          front.style.transition = `opacity ${BUTTON_IMAGE_FADE_MS}ms ease`;
          back.style.transition  = `opacity ${BUTTON_IMAGE_FADE_MS}ms ease`;
          front.style.opacity = "0";
          back.style.opacity  = "1";
          // Swap roles for the next cycle
          [front, back] = [back, front];
        }, BUTTON_IMAGE_CYCLE_MS);
        _btnCycleIntervals.push(intervalId);
      } else {
        const img = document.createElement("img");
        img.src       = images[0];
        img.alt       = cat.label || key;
        img.className = "cat-btn-img";
        btn.appendChild(img);
      }
    } else {
      btn.classList.add("cat-btn--no-image");
    }

    // Label always visible — overlaid at bottom when image present, centered when not
    const labelSpan = document.createElement("span");
    labelSpan.className   = "cat-btn-label";
    labelSpan.textContent = cat.label || key;
    btn.appendChild(labelSpan);

    btn.addEventListener("click", () => {
      showFeedback(btn);
      onCategoryTap(key);
    });

    nav.appendChild(btn);
  });

  // Shrink any label that overflows its button after layout is available
  requestAnimationFrame(() => {
    nav.querySelectorAll(".cat-btn-label").forEach(_fitLabelText);
  });
}

/** Scale down a button label's font-size until the text fits on one line. */
function _fitLabelText(label) {
  label.style.fontSize = "";          // reset to CSS value
  label.style.overflow = "visible";   // lift clip so scrollWidth reflects true text width
  const textWidth = label.scrollWidth;
  label.style.overflow = "";          // restore
  const available = label.offsetWidth;
  if (textWidth <= available) return;
  const computed = parseFloat(getComputedStyle(label).fontSize);
  label.style.fontSize = Math.max(computed * (available / textWidth), 8) + "px";
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
