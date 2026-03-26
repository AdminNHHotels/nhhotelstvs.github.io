// gallery.js — GALLERY_MANUAL state: swipeable image gallery

import { highlightCategoryButton, showFeedback, clearEl } from "./ui.js";
import { startTimer, resetTimer, clearTimer }             from "./inactivity.js";

let _container   = null;
let _images      = [];
let _index       = 0;
let _onExit      = null;  // callback to return to previous state
let _touchStartX = 0;
let _touchStartY = 0;
let _imgEl       = null;  // current <img>

/**
 * Initialise the gallery view.
 * @param {HTMLElement} container     — #main-content
 * @param {string[]} images           — ordered array of image URLs
 * @param {string} categoryKey        — for button highlight
 * @param {function} onExit           — called when user exits (inactivity or back btn)
 */
export function initGallery(container, images, categoryKey, onExit) {
  _container = container;
  _images    = images || [];
  _index     = 0;
  _onExit    = onExit;

  clearEl(_container);
  highlightCategoryButton(categoryKey);

  if (_images.length === 0) {
    _renderEmpty();
    startTimer(_exit, INACTIVITY_MS);
    return;
  }

  _buildLayout();
  _renderImage(0, null);

  // Swipe
  _container.addEventListener("touchstart", _onTouchStart, { passive: true });
  _container.addEventListener("touchend",   _onTouchEnd,   { passive: true });

  startTimer(_exit, INACTIVITY_MS);
}

/** Switch to a different category while gallery is open. */
export function switchGalleryCategory(images, categoryKey) {
  _images = images || [];
  _index  = 0;
  highlightCategoryButton(categoryKey);

  if (_images.length === 0) {
    // Switching to an empty category — clear whatever is shown and show empty state
    clearEl(_container);
    _imgEl = null;
    _container.removeEventListener("touchstart", _onTouchStart);
    _container.removeEventListener("touchend",   _onTouchEnd);
    _renderEmpty();
  } else if (!_imgEl) {
    // Coming from an empty category — build the full layout for the first time
    clearEl(_container);
    _buildLayout();
    _container.addEventListener("touchstart", _onTouchStart, { passive: true });
    _container.addEventListener("touchend",   _onTouchEnd,   { passive: true });
    _renderImage(0, null);
  } else {
    _renderImage(0, null);
  }

  resetTimer();
}

/** Tear down gallery. */
export function destroyGallery() {
  clearTimer();
  if (_container) {
    _container.removeEventListener("touchstart", _onTouchStart);
    _container.removeEventListener("touchend",   _onTouchEnd);
  }
  _container = null;
  highlightCategoryButton(null);
}

// ── Internal ────────────────────────────────────────────────────────────────

function _renderEmpty() {
  const backBtn = document.createElement("button");
  backBtn.className   = "gallery-back-btn";
  backBtn.textContent = "← Back";
  backBtn.addEventListener("click", () => {
    showFeedback(backBtn);
    _exit();
  });

  const msg = document.createElement("p");
  msg.className   = "gallery-empty";
  msg.textContent = "No images available.";

  _container.appendChild(backBtn);
  _container.appendChild(msg);
}

function _buildLayout() {
  // Back button
  const backBtn = document.createElement("button");
  backBtn.className   = "gallery-back-btn";
  backBtn.textContent = "← Back";
  backBtn.addEventListener("click", () => {
    showFeedback(backBtn);
    _exit();
  });

  // Image wrapper
  const imgWrap = document.createElement("div");
  imgWrap.className = "gallery-image-wrap";

  _imgEl = document.createElement("img");
  _imgEl.className = "gallery-image";
  imgWrap.appendChild(_imgEl);

  // Page indicator
  const indicator = document.createElement("div");
  indicator.className = "gallery-indicator";
  indicator.id        = "gallery-indicator";

  // Prev / Next arrow buttons (for non-touch fallback)
  const prevBtn = document.createElement("button");
  prevBtn.className   = "gallery-nav-btn gallery-prev";
  prevBtn.textContent = "‹";
  prevBtn.setAttribute("aria-label", "Previous image");
  prevBtn.addEventListener("click", () => {
    showFeedback(prevBtn);
    _navigate(-1, "slide-right");
    resetTimer();
  });

  const nextBtn = document.createElement("button");
  nextBtn.className   = "gallery-nav-btn gallery-next";
  nextBtn.textContent = "›";
  nextBtn.setAttribute("aria-label", "Next image");
  nextBtn.addEventListener("click", () => {
    showFeedback(nextBtn);
    _navigate(1, "slide-left");
    resetTimer();
  });

  _container.appendChild(backBtn);
  _container.appendChild(prevBtn);
  _container.appendChild(imgWrap);
  _container.appendChild(nextBtn);
  _container.appendChild(indicator);
}

function _renderImage(index, slideDirection) {
  if (!_imgEl) return;

  const src = _images[index];
  _index = index;

  // Slide animation
  if (slideDirection) {
    const enterFrom = slideDirection === "slide-left" ? "100%"  : "-100%";
    const exitTo    = slideDirection === "slide-left" ? "-100%" : "100%";

    const oldImg = _imgEl.cloneNode(true);
    _imgEl.parentNode.appendChild(oldImg);
    oldImg.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;`;

    // Exit old image
    oldImg.style.transition = `transform ${SLIDE_TRANSITION_MS}ms ease`;
    requestAnimationFrame(() => {
      oldImg.style.transform = `translateX(${exitTo})`;
    });
    setTimeout(() => oldImg.remove(), SLIDE_TRANSITION_MS);

    // Enter new image
    _imgEl.style.transform  = `translateX(${enterFrom})`;
    _imgEl.src = src;
    requestAnimationFrame(() => {
      _imgEl.style.transition = `transform ${SLIDE_TRANSITION_MS}ms ease`;
      _imgEl.style.transform  = "translateX(0)";
    });
    setTimeout(() => { _imgEl.style.transition = ""; }, SLIDE_TRANSITION_MS);
  } else {
    _imgEl.src = src;
  }

  // Update indicator
  const ind = document.getElementById("gallery-indicator");
  if (ind) ind.textContent = `${index + 1} / ${_images.length}`;
}

function _navigate(delta, direction) {
  if (_images.length === 0) return;
  const next = (_index + delta + _images.length) % _images.length;
  _renderImage(next, direction);
}

// ── Swipe handlers ──────────────────────────────────────────────────────────

function _onTouchStart(e) {
  const t = e.touches[0];
  _touchStartX = t.clientX;
  _touchStartY = t.clientY;
}

function _onTouchEnd(e) {
  const t    = e.changedTouches[0];
  const dx   = t.clientX - _touchStartX;
  const dy   = t.clientY - _touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (Math.max(absDx, absDy) < SWIPE_THRESHOLD_PX) return; // too short

  resetTimer();

  // Any swipe direction: up/right → previous; down/left → next
  if (absDx >= absDy) {
    // Horizontal swipe
    if (dx > 0) _navigate(-1, "slide-right"); // swipe right → prev
    else        _navigate(1,  "slide-left");  // swipe left  → next
  } else {
    // Vertical swipe
    if (dy > 0) _navigate(-1, "slide-right"); // swipe down → prev
    else        _navigate(1,  "slide-left");  // swipe up   → next
  }
}

function _exit() {
  destroyGallery();
  if (typeof _onExit === "function") _onExit();
}
