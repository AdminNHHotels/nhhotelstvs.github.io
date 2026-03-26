// ui.js — Shared DOM helpers used across all state modules

/**
 * Flash a brief "pressed" visual on an element.
 * Adds .pressed CSS class, removes after PRESS_FEEDBACK_MS.
 */
export function showFeedback(element) {
  if (!element) return;
  element.classList.add("pressed");
  setTimeout(() => element.classList.remove("pressed"), PRESS_FEEDBACK_MS);
}

/**
 * Highlight one category button in the top bar; clear all others.
 * @param {string|null} key — category key, or null to clear all
 */
export function highlightCategoryButton(key) {
  document.querySelectorAll("#category-buttons .cat-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === key);
  });
}

/** Show the "Connecting…" overlay. */
export function showConnecting() {
  const el = document.getElementById("overlay-connecting");
  if (el) el.hidden = false;
}

/** Hide the "Connecting…" overlay. */
export function hideConnecting() {
  const el = document.getElementById("overlay-connecting");
  if (el) el.hidden = true;
}

/**
 * Show a full-screen error message and hide all other content.
 * @param {string} msg — human-readable error message
 */
export function showError(msg) {
  const el = document.getElementById("overlay-error");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  const main = document.getElementById("main-content");
  if (main) main.hidden = true;
}

/**
 * Build an <img> element with a fallback to the placeholder logo on error.
 * @param {string|null} src — logo URL (may be null)
 * @param {string} alt
 * @returns {HTMLImageElement}
 */
export function buildLogoImg(src, alt = "") {
  const img = document.createElement("img");
  img.alt = alt;
  img.loading = "lazy";
  img.src = src || PLACEHOLDER_LOGO_SRC;
  img.onerror = () => { img.src = PLACEHOLDER_LOGO_SRC; };
  return img;
}

/**
 * Build a direction cell: icon + label text.
 * @param {string} direction — key from DIRECTION_MAP
 * @returns {HTMLElement}
 */
export function buildDirectionCell(direction) {
  const map = DIRECTION_MAP[direction] || DIRECTION_MAP.north;
  const wrap = document.createElement("span");
  wrap.className = "direction-cell";

  const icon = document.createElement("img");
  icon.src   = map.icon;
  icon.alt   = map.label;
  icon.className = "direction-icon";

  const label = document.createElement("span");
  label.className = "direction-label";
  label.textContent = map.label;

  wrap.append(icon, label);
  return wrap;
}

/**
 * Clear all children of an element.
 * @param {Element} el
 */
export function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
