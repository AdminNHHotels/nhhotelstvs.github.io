// config.js — Firebase credentials and app-wide constants
// IMPORTANT: Replace placeholder values with real Firebase project credentials before deployment.

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCs9HWJdYo_7AmSTbcmwiJth3LhiMyt7eM",
  authDomain:        "nh-hotels-tvs.firebaseapp.com",
  databaseURL:       "https://nh-hotels-tvs-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "nh-hotels-tvs",
  storageBucket:     "nh-hotels-tvs.firebasestorage.app",
  messagingSenderId: "235307932233",
  appId:             "1:235307932233:web:021124b8322265090dbd98",
};

// Inactivity timeout before gallery auto-exits (ms)
const INACTIVITY_MS = 20_000;

// Carousel: duration each individual slide is shown (ms)
const CAROUSEL_SLIDE_MS = 10_000;

// Carousel: max gallery images shown per category (after the preview) during normal auto-play
const CAROUSEL_MAX_CONTENT = 5;

// Carousel: how many slides auto-play after resuming from manual gallery inactivity
// (e.g. 4 slides × 10s = 40s max additional auto-play before switching category)
const CAROUSEL_RESUME_BUDGET = 4;


// How long before event start should the reservation be shown (hours)
// Overridden per-device from Firebase /devices/{id}/show_before_hours
const SHOW_BEFORE_HOURS_DEFAULT = 2;

// Firebase connection check — show overlay if disconnected longer than this (ms)
const RECONNECT_OVERLAY_DELAY_MS = 5_000;

// Swipe detection threshold (px)
const SWIPE_THRESHOLD_PX = 50;

// UI feedback animation duration (ms)
const PRESS_FEEDBACK_MS = 200;

// Image slide transition duration (ms)
const SLIDE_TRANSITION_MS = 300;

// Carousel fade transition duration (ms)
const FADE_TRANSITION_MS = 500;

// State re-evaluation interval (ms) — checks time windows even without Firebase update
const STATE_RECHECK_INTERVAL_MS = 60_000;

// Interval between category button image changes when multiple images are uploaded (ms)
const BUTTON_IMAGE_CYCLE_MS = 30_000;

// Crossfade duration for button image cycling (ms)
const BUTTON_IMAGE_FADE_MS = 2_000;

// Placeholder logo shown when company logo URL is missing or fails to load
const PLACEHOLDER_LOGO_SRC = "assets/icons/placeholder-logo.svg";

// Direction labels and icons
const DIRECTION_MAP = {
  north:     { icon: "assets/icons/arrow-north.svg",     label: "Straight"     },
  northeast: { icon: "assets/icons/arrow-northeast.svg", label: "Up Right"     },
  east:      { icon: "assets/icons/arrow-east.svg",      label: "Right"        },
  southeast: { icon: "assets/icons/arrow-southeast.svg", label: "Down Right"   },
  south:     { icon: "assets/icons/arrow-south.svg",     label: "Down"         },
  southwest: { icon: "assets/icons/arrow-southwest.svg", label: "Down Left"    },
  west:      { icon: "assets/icons/arrow-west.svg",      label: "Left"         },
  northwest: { icon: "assets/icons/arrow-northwest.svg", label: "Up Left"      },
  elevator:  { icon: "assets/icons/elevator.svg",        label: "Elevator"     },
};
