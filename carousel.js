// carousel.js — DEFAULT_CAROUSEL state: auto-cycles category images

import { highlightCategoryButton, clearEl } from "./ui.js";

let _container      = null;
let _categories     = {};   // full categories map from Firebase
let _order          = [];   // array of category keys in display order
let _currentIndex   = 0;
let _intervalId     = null;
let _intervalMs     = CAROUSEL_MS;
let _currentImg     = null; // currently displayed <img>

/**
 * Initialise the DEFAULT_CAROUSEL view.
 * @param {HTMLElement} container — #main-content
 * @param {Object} categories    — Firebase /categories/ map
 * @param {string[]} order       — category keys in display order (from device config)
 * @param {number} intervalMs    — ms per slide
 */
export function initCarousel(container, categories, order, intervalMs = CAROUSEL_MS) {
  _container  = container;
  _categories = categories;
  _order      = order.filter((k) => k in categories); // only keys that exist
  _intervalMs = intervalMs;
  _currentIndex = 0;

  clearEl(_container);

  if (_order.length === 0) return;

  _showSlide(_currentIndex);
  _intervalId = setInterval(_advance, _intervalMs);
}

/** Update categories data (e.g. after Firebase refresh). */
export function updateCarouselCategories(categories) {
  _categories = categories;
}

/** Tear down carousel — stop timer, clear content, remove highlight. */
export function destroyCarousel() {
  clearInterval(_intervalId);
  _intervalId = null;
  _container  = null;
  highlightCategoryButton(null);
}

/** Return the key of the currently displayed category. */
export function getCurrentCategoryKey() {
  return _order[_currentIndex] || null;
}

// ── Internal ───────────────────────────────────────────────────────────────

function _advance() {
  _currentIndex = (_currentIndex + 1) % _order.length;
  _showSlide(_currentIndex);
}

function _showSlide(index) {
  const key  = _order[index];
  const cat  = _categories[key];
  if (!cat) return;

  highlightCategoryButton(key);

  // Image source: button_image_url first, fallback to first gallery image
  const src = cat.button_image_url || (cat.gallery_images && cat.gallery_images[0]) || "";

  const newImg = document.createElement("img");
  newImg.className = "carousel-image";
  newImg.alt       = cat.label || key;
  newImg.src       = src;

  // Label overlay
  const label = document.createElement("div");
  label.className  = "carousel-label";
  label.textContent = cat.label || key;

  const slide = document.createElement("div");
  slide.className = "carousel-slide";
  slide.appendChild(newImg);
  slide.appendChild(label);

  // Fade transition: append new, then remove old
  if (_container) {
    // Force the new slide to start invisible
    slide.style.opacity = "0";
    _container.appendChild(slide);

    // Fade in new
    requestAnimationFrame(() => {
      slide.style.transition = `opacity ${FADE_TRANSITION_MS}ms ease`;
      slide.style.opacity    = "1";
    });

    // Fade out + remove old slide after transition
    if (_currentImg) {
      const old = _currentImg;
      old.style.transition = `opacity ${FADE_TRANSITION_MS}ms ease`;
      old.style.opacity    = "0";
      setTimeout(() => old.remove(), FADE_TRANSITION_MS);
    }

    _currentImg = slide;
  }
}
