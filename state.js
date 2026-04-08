// state.js — State machine: EVENTS | DEFAULT_CAROUSEL | GALLERY_MANUAL

import { initEvents,   updateEvents,   destroyEvents   } from "./events.js";
import { initCarousel, destroyCarousel, getCurrentCategoryKey, getCurrentSlideIndex } from "./carousel.js";
import { initGallery,  switchGalleryCategory, destroyGallery } from "./gallery.js";

export const STATE = {
  EVENTS:           "EVENTS",
  DEFAULT_CAROUSEL: "DEFAULT_CAROUSEL",
  GALLERY_MANUAL:   "GALLERY_MANUAL",
};

let _current           = null;   // current state name
let _previous          = null;   // state before GALLERY_MANUAL
let _container         = null;   // #main-content element
let _categories        = {};     // full categories map
let _deviceConfig      = {};     // device config from Firebase
let _deviceId          = null;   // "tv1" | "tv2" | "tv3"
let _reservations      = {};     // latest raw reservations snapshot
let _savedCarouselKey   = null;   // category key to resume when returning to carousel
let _savedCarouselSlide = 0;      // carousel slide index to resume from

/**
 * Boot the state machine.
 * @param {HTMLElement} container
 * @param {Object} deviceConfig
 * @param {Object} categories
 * @param {string} deviceId — "tv1" | "tv2" | "tv3"
 */
export function initState(container, deviceConfig, categories, deviceId) {
  _container    = container;
  _deviceConfig = deviceConfig;
  _categories   = categories;
  _deviceId     = deviceId;
}

/** Update the reservations snapshot (from Firebase live subscription). */
export function setReservations(reservations) {
  _reservations = reservations;
}

/** Update the categories map (after re-scan). */
export function setCategories(categories) {
  _categories = categories;
}

/**
 * Transition to a new state.
 * @param {string} newState          — one of STATE.*
 * @param {string} [categoryKey]     — required when newState === GALLERY_MANUAL
 * @param {number} [galleryStartIndex] — image index to open at in GALLERY_MANUAL (default 0)
 */
export function transitionTo(newState, categoryKey = null, galleryStartIndex = 0) {
  if (newState === _current && newState !== STATE.GALLERY_MANUAL) return; // no-op

  _teardown(_current);

  if (newState === STATE.GALLERY_MANUAL) {
    _previous = _current !== STATE.GALLERY_MANUAL ? _current : _previous;
    if (_current === STATE.DEFAULT_CAROUSEL) {
      _savedCarouselKey = categoryKey; // resume carousel at the category the user browsed
    }
  }

  _current = newState;
  _setup(newState, categoryKey, galleryStartIndex);
}

/** Re-evaluate which state should be active based on current time + reservations. */
export function evaluateState() {
  const hasActive = _countActiveReservations(_reservations) > 0;
  const target = hasActive ? STATE.EVENTS : STATE.DEFAULT_CAROUSEL;

  if (_current === STATE.GALLERY_MANUAL) {
    // Quietly update previousState so gallery returns correctly
    _previous = target;
    return;
  }

  if (target === STATE.EVENTS && _current === STATE.EVENTS) {
    // Already in EVENTS — re-render the table with updated data (no full teardown/setup)
    updateEvents(_reservations, _deviceId);
    return;
  }

  transitionTo(target);
}

/** Called by EVENTS module when a Firebase update means no active entries remain. */
export function onEventsEmpty() {
  transitionTo(STATE.DEFAULT_CAROUSEL);
}

/** Return the current state name (for debugging). */
export function currentState() {
  return _current;
}

// ── Private ────────────────────────────────────────────────────────────────

function _setup(state, categoryKey, galleryStartIndex = 0) {
  const order = _deviceConfig.categories_order || [];

  switch (state) {
    case STATE.EVENTS:
      initEvents(_container, _reservations, _deviceId);
      break;

    case STATE.DEFAULT_CAROUSEL:
      initCarousel(_container, _categories, order, _savedCarouselKey, _onCarouselInteract, _savedCarouselSlide);
      _savedCarouselKey   = null;
      _savedCarouselSlide = 0;
      break;

    case STATE.GALLERY_MANUAL: {
      const cat    = _categories[categoryKey] || {};
      const images = cat.gallery_images || [];
      initGallery(_container, images, categoryKey, _onGalleryExit, galleryStartIndex);
      break;
    }
  }
}

/**
 * Called by carousel on user swipe.
 * Maps carousel slide position → gallery image index and opens GALLERY_MANUAL.
 *
 * Carousel slides: [preview (index 0), gallery_images[0] (index 1), gallery_images[1] (index 2), ...]
 * Gallery images:  [gallery_images[0], gallery_images[1], ...]
 * So: galleryIndex = carouselSlideIndex - 1, adjusted by delta, clamped to valid range.
 */
function _onCarouselInteract(catKey, carouselSlideIndex, delta) {
  const cat    = _categories[catKey] || {};
  const images = cat.gallery_images || [];
  if (images.length === 0) return;

  // Convert carousel slide index to gallery index (slide 0 is preview, slide 1 = gallery[0])
  const galleryIndex = Math.max(0, Math.min(images.length - 1, carouselSlideIndex - 1 + delta));
  transitionTo(STATE.GALLERY_MANUAL, catKey, galleryIndex);
}

function _teardown(state) {
  switch (state) {
    case STATE.EVENTS:          destroyEvents();   break;
    case STATE.DEFAULT_CAROUSEL: destroyCarousel(); break;
    case STATE.GALLERY_MANUAL:  destroyGallery();  break;
  }
}

function _onGalleryExit(galleryIndex = 0) {
  if (_previous === STATE.DEFAULT_CAROUSEL) {
    // galleryIndex is 0-based into gallery_images[].
    // Carousel slides: [preview(0), gallery[0](1), gallery[1](2), ...]
    // "Following image" = gallery index + 1, mapped to carousel = galleryIndex + 1 + 1
    _savedCarouselSlide = galleryIndex + 2;
  }
  console.log('[state] _onGalleryExit: galleryIndex=', galleryIndex,
    '_previous=', _previous,
    '_savedCarouselSlide=', _savedCarouselSlide,
    '_savedCarouselKey=', _savedCarouselKey
  );
  transitionTo(_previous || STATE.DEFAULT_CAROUSEL);
}

/**
 * Handle a category button tap from app.js.
 * If already in GALLERY_MANUAL, switch to the new category instead of re-entering.
 */
export function onCategoryTap(categoryKey) {
  if (_current === STATE.GALLERY_MANUAL) {
    const cat    = _categories[categoryKey] || {};
    const images = cat.gallery_images || [];
    switchGalleryCategory(images, categoryKey);
    _savedCarouselKey = categoryKey; // keep resume point in sync with the category now being viewed
  } else {
    transitionTo(STATE.GALLERY_MANUAL, categoryKey);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _countActiveReservations(reservations) {
  const now = _nowMinutes();
  return Object.values(reservations || {}).filter((r) => {
    if (!r.active) return false;
    const from = _parseTime(r.show_from);
    const end  = _parseTime(r.time_end);
    return from <= now && now <= end;
  }).length;
}

function _nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function _parseTime(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
