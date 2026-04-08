// carousel.js — DEFAULT_CAROUSEL state: auto-cycles through categories and their images

import { highlightCategoryButton, showFeedback, clearEl } from "./ui.js";

let _container    = null;
let _categories   = {};
let _order        = [];
let _catIndex     = 0;
let _slideIndex   = 0;
let _slides       = [];   // [preview_url, ...content_urls] for the current category
let _slideTimer   = null;
let _inactTimer   = null;
let _paused       = false;
let _resumeMode   = false;  // true after inactivity resume
let _resumeLeft   = 0;      // slides remaining in post-resume budget
let _currentSlide = null;   // current slide DOM element (for fade-out)
let _touchStartX  = 0;
let _touchStartY  = 0;

/**
 * Initialise the DEFAULT_CAROUSEL view.
 * @param {HTMLElement} container        — #main-content
 * @param {Object} categories            — Firebase /categories/ map
 * @param {string[]} order               — category keys in display order
 * @param {string|null} startCategoryKey — resume from this category (optional)
 */
export function initCarousel(container, categories, order, startCategoryKey = null) {
  _container    = container;
  _categories   = categories;
  _order        = order.filter((k) => k in categories);
  _catIndex     = 0;
  if (startCategoryKey) {
    const idx = _order.indexOf(startCategoryKey);
    if (idx >= 0) _catIndex = idx;
  }
  _slideIndex   = 0;
  _paused       = false;
  _resumeMode   = false;
  _resumeLeft   = 0;
  _currentSlide = null;

  clearEl(_container);
  if (_order.length === 0) return;

  _buildNav();
  _buildCategorySlides();
  _showSlide();
  _scheduleNext();

  _container.addEventListener("touchstart", _onTouchStart, { passive: true });
  _container.addEventListener("touchend",   _onTouchEnd,   { passive: true });
}

/** Update categories data (e.g. after Firebase refresh). */
export function updateCarouselCategories(categories) {
  _categories = categories;
}

/** Tear down carousel — stop timers, clear content, remove highlight. */
export function destroyCarousel() {
  clearTimeout(_slideTimer);
  clearTimeout(_inactTimer);
  _slideTimer   = null;
  _inactTimer   = null;
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

// ── Internal ────────────────────────────────────────────────────────────────

/**
 * Build persistent nav buttons and slide indicator into the container.
 * These stay across slide transitions; only .carousel-slide elements are swapped.
 */
function _buildNav() {
  const prevBtn = document.createElement("button");
  prevBtn.className = "carousel-nav-btn carousel-prev";
  prevBtn.textContent = "‹";
  prevBtn.setAttribute("aria-label", "Previous");
  prevBtn.addEventListener("click", () => {
    showFeedback(prevBtn);
    _navigate(-1);
  });

  const nextBtn = document.createElement("button");
  nextBtn.className = "carousel-nav-btn carousel-next";
  nextBtn.textContent = "›";
  nextBtn.setAttribute("aria-label", "Next");
  nextBtn.addEventListener("click", () => {
    showFeedback(nextBtn);
    _navigate(1);
  });

  const indicator = document.createElement("div");
  indicator.className = "carousel-indicator";
  indicator.id        = "carousel-indicator";

  _container.appendChild(prevBtn);
  _container.appendChild(nextBtn);
  _container.appendChild(indicator);
}

/** Build _slides = [preview, ...gallery (up to CAROUSEL_MAX_CONTENT)] for current category. */
function _buildCategorySlides() {
  const key     = _order[_catIndex];
  const cat     = _categories[key] || {};
  const preview = cat.button_image_url || (cat.gallery_images && cat.gallery_images[0]) || null;
  const content = (cat.gallery_images || []).slice(0, CAROUSEL_MAX_CONTENT);
  _slides = [preview, ...content].filter(Boolean);
  if (_slides.length === 0) _slides = [null]; // keep at least one slot so indicator renders
}

function _scheduleNext() {
  clearTimeout(_slideTimer);
  _slideTimer = setTimeout(_advance, CAROUSEL_SLIDE_MS);
}

function _advance() {
  if (_paused) return;

  // In resume mode: count down budget; when exhausted, switch category immediately
  if (_resumeMode) {
    _resumeLeft--;
    if (_resumeLeft <= 0) {
      _nextCategory();
      return;
    }
  }

  _slideIndex++;
  if (_slideIndex >= _slides.length) {
    _nextCategory();
  } else {
    _showSlide();
    _scheduleNext();
  }
}

function _nextCategory() {
  _catIndex   = (_catIndex + 1) % _order.length;
  _slideIndex = 0;
  _resumeMode = false;
  _resumeLeft = 0;
  _buildCategorySlides();
  _showSlide();
  _scheduleNext();
}

function _showSlide() {
  const key         = _order[_catIndex];
  const cat         = _categories[key] || {};
  const src         = _slides[_slideIndex];
  const isPreview   = (_slideIndex === 0);

  highlightCategoryButton(key);

  // Update persistent indicator
  const ind = document.getElementById("carousel-indicator");
  if (ind) ind.textContent = `${_slideIndex + 1} / ${_slides.length}`;

  // Blurred background fill
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
    // Insert before nav buttons so slides stay behind them
    const firstNav = _container.querySelector(".carousel-nav-btn");
    _container.insertBefore(slide, firstNav);

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

/** Called on any user interaction — pauses auto-advance and resets inactivity timer. */
function _onUserInteract() {
  if (!_paused) {
    _paused = true;
    clearTimeout(_slideTimer);
  }
  clearTimeout(_inactTimer);
  _inactTimer = setTimeout(_onInactivity, INACTIVITY_MS);
}

/** Called when inactivity timer fires — resumes auto-advance with a limited budget. */
function _onInactivity() {
  _resumeMode = true;
  _resumeLeft = CAROUSEL_RESUME_BUDGET;
  _paused     = false;
  _scheduleNext();
}

/** Navigate within the current category's slides. */
function _navigate(delta) {
  const newIdx = _slideIndex + delta;
  _onUserInteract();
  if (newIdx < 0 || newIdx >= _slides.length) return; // boundary — interact but don't move
  _slideIndex = newIdx;
  _showSlide();
}

// ── Touch / swipe ───────────────────────────────────────────────────────────

function _onTouchStart(e) {
  const t = e.touches[0];
  _touchStartX = t.clientX;
  _touchStartY = t.clientY;
}

function _onTouchEnd(e) {
  const t     = e.changedTouches[0];
  const dx    = t.clientX - _touchStartX;
  const dy    = t.clientY - _touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (Math.max(absDx, absDy) < SWIPE_THRESHOLD_PX) return;

  if (absDx >= absDy) {
    if (dx > 0) _navigate(-1);
    else        _navigate(1);
  } else {
    if (dy > 0) _navigate(-1);
    else        _navigate(1);
  }
}
