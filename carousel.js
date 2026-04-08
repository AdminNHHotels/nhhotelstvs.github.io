// carousel.js — DEFAULT_CAROUSEL state: auto-cycles through categories and their images

import { highlightCategoryButton, clearEl } from "./ui.js";

let _container    = null;
let _categories   = {};
let _order        = [];
let _catIndex     = 0;
let _slideIndex   = 0;
let _slides       = [];   // [preview_url, ...content_urls] for the current category
let _slideTimer   = null;
let _currentSlide = null; // current slide DOM element (for fade-out)
let _onInteract   = null; // (catKey, slideIndex, delta) => void
let _touchStartX  = 0;
let _touchStartY  = 0;

/**
 * Initialise the DEFAULT_CAROUSEL view.
 * @param {HTMLElement} container        — #main-content
 * @param {Object} categories            — Firebase /categories/ map
 * @param {string[]} order               — category keys in display order
 * @param {string|null} startCategoryKey — resume from this category (optional)
 * @param {Function|null} onInteract     — called with (catKey, slideIndex, delta) on user swipe
 * @param {number} startSlideIndex       — slide index within the start category (default 0)
 */
export function initCarousel(container, categories, order, startCategoryKey = null, onInteract = null, startSlideIndex = 0) {
  _container    = container;
  _categories   = categories;
  _order        = order.filter((k) => k in categories);
  _onInteract   = onInteract;
  _catIndex     = 0;
  if (startCategoryKey) {
    const idx = _order.indexOf(startCategoryKey);
    if (idx >= 0) _catIndex = idx;
  }
  _currentSlide = null;

  clearEl(_container);
  if (_order.length === 0) return;

  _buildCategorySlides();

  // Apply start slide, advancing to next category if it overflows this one
  _slideIndex = startSlideIndex;
  if (_slideIndex >= _slides.length) {
    _catIndex   = (_catIndex + 1) % _order.length;
    _slideIndex = 0;
    _buildCategorySlides();
  }

  _showSlide();
  _scheduleNext();

  _container.addEventListener("touchstart", _onTouchStart, { passive: true });
  _container.addEventListener("touchend",   _onTouchEnd,   { passive: true });
}

/** Update categories data (e.g. after Firebase refresh). */
export function updateCarouselCategories(categories) {
  _categories = categories;
}

/** Tear down carousel — stop timer, clear content, remove highlight. */
export function destroyCarousel() {
  clearTimeout(_slideTimer);
  _slideTimer   = null;
  _currentSlide = null;
  if (_container) {
    _container.removeEventListener("touchstart", _onTouchStart);
    _container.removeEventListener("touchend",   _onTouchEnd);
  }
  _container = null;
  highlightCategoryButton(null);
}

/** Return the key of the currently displayed category. */
export function getCurrentCategoryKey() {
  return _order[_catIndex] || null;
}

/** Return the current slide index within the current category. */
export function getCurrentSlideIndex() {
  return _slideIndex;
}

// ── Internal ────────────────────────────────────────────────────────────────

/** Build _slides = [preview, ...gallery (up to CAROUSEL_MAX_CONTENT)] for current category. */
function _buildCategorySlides() {
  const key     = _order[_catIndex];
  const cat     = _categories[key] || {};
  const preview = cat.button_image_url || (cat.gallery_images && cat.gallery_images[0]) || null;
  const content = (cat.gallery_images || []).slice(0, CAROUSEL_MAX_CONTENT);
  _slides = [preview, ...content].filter(Boolean);
  if (_slides.length === 0) _slides = [null];
}

function _scheduleNext() {
  clearTimeout(_slideTimer);
  _slideTimer = setTimeout(_advance, CAROUSEL_SLIDE_MS);
}

function _advance() {
  _slideIndex++;
  if (_slideIndex >= _slides.length) {
    _catIndex   = (_catIndex + 1) % _order.length;
    _slideIndex = 0;
    _buildCategorySlides();
  }
  _showSlide();
  _scheduleNext();
}

function _showSlide() {
  const key       = _order[_catIndex];
  const cat       = _categories[key] || {};
  const src       = _slides[_slideIndex];
  const isPreview = (_slideIndex === 0);

  highlightCategoryButton(key);

  const bgImg = document.createElement("img");
  bgImg.className = "carousel-bg";
  bgImg.src = src || "";
  bgImg.alt = "";
  bgImg.setAttribute("aria-hidden", "true");

  const mainImg = document.createElement("img");
  mainImg.className = "carousel-image";
  mainImg.alt       = cat.label || key;
  mainImg.src       = src || "";

  const slide = document.createElement("div");
  slide.className = "carousel-slide";
  slide.appendChild(bgImg);
  slide.appendChild(mainImg);

  // Category label only on the preview (first) slide
  if (isPreview) {
    const label = document.createElement("div");
    label.className   = "carousel-label";
    label.textContent = cat.label || key;
    slide.appendChild(label);
  }

  if (_container) {
    slide.style.opacity = "0";
    _container.appendChild(slide);

    requestAnimationFrame(() => {
      slide.style.transition = `opacity ${FADE_TRANSITION_MS}ms ease`;
      slide.style.opacity    = "1";
    });

    if (_currentSlide) {
      const old = _currentSlide;
      old.style.transition = `opacity ${FADE_TRANSITION_MS}ms ease`;
      old.style.opacity    = "0";
      setTimeout(() => old.remove(), FADE_TRANSITION_MS);
    }

    _currentSlide = slide;
  }
}

// ── Touch / swipe ───────────────────────────────────────────────────────────

function _onTouchStart(e) {
  const t = e.touches[0];
  _touchStartX = t.clientX;
  _touchStartY = t.clientY;
}

function _onTouchEnd(e) {
  if (!_onInteract) return;

  const t     = e.changedTouches[0];
  const dx    = t.clientX - _touchStartX;
  const dy    = t.clientY - _touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (Math.max(absDx, absDy) < SWIPE_THRESHOLD_PX) {
    // Tap — open current image in gallery (delta 0 = same position)
    _onInteract(_order[_catIndex], _slideIndex, 0);
    return;
  }

  let delta;
  if (absDx >= absDy) {
    delta = dx > 0 ? -1 : 1;  // swipe right → prev, swipe left → next
  } else {
    delta = dy > 0 ? -1 : 1;  // swipe down  → prev, swipe up   → next
  }

  _onInteract(_order[_catIndex], _slideIndex, delta);
}
