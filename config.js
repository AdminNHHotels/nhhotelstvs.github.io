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
const INACTIVITY_MS = 60_000;

// Default carousel interval — time each category is shown (ms)
// Overridden per-device from Firebase /devices/{id}/carousel_interval_ms
const CAROUSEL_MS = 60_000;

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

// Direction labels and icons (Czech localization)
const DIRECTION_MAP = {
  north:     { icon: "assets/icons/arrow-north.svg",     label: "Rovně"        },
  northeast: { icon: "assets/icons/arrow-northeast.svg", label: "Nahoru vpravo" },
  east:      { icon: "assets/icons/arrow-east.svg",      label: "Vpravo"       },
  southeast: { icon: "assets/icons/arrow-southeast.svg", label: "Dolu vpravo"  },
  south:     { icon: "assets/icons/arrow-south.svg",     label: "Dolů"         },
  southwest: { icon: "assets/icons/arrow-southwest.svg", label: "Dolu vlevo"   },
  west:      { icon: "assets/icons/arrow-west.svg",      label: "Vlevo"        },
  northwest: { icon: "assets/icons/arrow-northwest.svg", label: "Nahoru vlevo" },
  elevator:  { icon: "assets/icons/elevator.svg",        label: "Výtah"        },
};
