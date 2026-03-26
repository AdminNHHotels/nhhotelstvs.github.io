// inactivity.js — Idle timer that drives gallery auto-exit

let _timerId    = null;
let _callback   = null;
let _durationMs = INACTIVITY_MS;

const _EVENTS = ["touchstart", "click", "keydown", "mousemove"];

/** Start (or restart) the inactivity timer. Resets on any user gesture. */
export function startTimer(callback, ms = _durationMs) {
  _callback   = callback;
  _durationMs = ms;
  _EVENTS.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));
  resetTimer();
}

/** Reset the countdown (called internally on interaction, and externally from gallery.js). */
export function resetTimer() {
  clearTimeout(_timerId);
  _timerId = setTimeout(_fire, _durationMs);
}

/** Stop the timer and detach all listeners. */
export function clearTimer() {
  clearTimeout(_timerId);
  _timerId = null;
  _EVENTS.forEach((e) => document.removeEventListener(e, resetTimer));
}

function _fire() {
  clearTimer();
  if (typeof _callback === "function") _callback();
}
