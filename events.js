// events.js — EVENTS state: renders the active reservations table

import { buildLogoImg, buildDirectionCell, clearEl } from "./ui.js";

let _container = null;
let _deviceId  = null;
let _wrap      = null; // scroll wrapper element

/**
 * Initialise the EVENTS view inside the given container element.
 * @param {HTMLElement} container — #main-content
 * @param {Object} reservations — raw Firebase reservations object for today
 * @param {string} deviceId — e.g. "tv1", "tv2", "tv3"
 */
export function initEvents(container, reservations, deviceId) {
  _container = container;
  _deviceId  = deviceId;
  clearEl(_container);

  _wrap = document.createElement("div");
  _wrap.className = "events-scroll-wrap";

  const table = _buildTable(reservations);
  _wrap.appendChild(table);
  _container.appendChild(_wrap);

  // Measure overflow after layout and activate scroll animation if needed
  requestAnimationFrame(() => _activateScrollIfNeeded(_wrap, table));
}

/**
 * Update the events table with fresh data (called on live Firebase update).
 * @param {Object} reservations — raw Firebase reservations object
 * @param {string} [deviceId] — optional; defaults to the value set at init
 * @returns {boolean} — true if at least one active reservation is visible
 */
export function updateEvents(reservations, deviceId) {
  if (!_container) return false;
  if (deviceId) _deviceId = deviceId;
  const active = _getActiveReservations(reservations);

  // Rebuild inside the existing scroll wrapper (or the container if wrap is gone)
  const host = _wrap || _container;
  clearEl(host);
  const table = _buildTable(reservations);
  host.appendChild(table);

  if (_wrap) {
    _wrap.classList.remove("is-scrolling");
    requestAnimationFrame(() => _activateScrollIfNeeded(_wrap, table));
  }

  return active.length > 0;
}

/** Tear down — nothing persistent to clean up. */
export function destroyEvents() {
  _container = null;
  _deviceId  = null;
  _wrap      = null;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function _getActiveReservations(reservations) {
  const now       = _nowMinutes();
  const activeKey = _deviceId ? `active_${_deviceId}` : "active_tv1"; // e.g. "active_tv1"
  return Object.values(reservations || {})
    .filter((r) => {
      if (!r[activeKey]) return false;
      const from = _parseTime(r.show_from);
      const end  = _parseTime(r.time_end);
      return from <= now && now <= end;
    })
    .sort((a, b) => _parseTime(a.time_start) - _parseTime(b.time_start));
}

function _buildTable(reservations) {
  const active = _getActiveReservations(reservations);

  if (active.length === 0) {
    const empty = document.createElement("p");
    empty.className = "events-empty";
    empty.textContent = "No events scheduled.";
    return empty;
  }

  const table = document.createElement("table");
  table.className = "events-table";

  const thead = table.createTHead();
  const hr = thead.insertRow();
  ["Company", "Room / Note", "Time", "Direction"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    hr.appendChild(th);
  });

  const tbody = table.createTBody();
  active.forEach((r) => {
    const tr = tbody.insertRow();
    tr.className = "event-row";

    // Logo
    const logoTd = tr.insertCell();
    logoTd.className = "event-logo";
    logoTd.appendChild(buildLogoImg(r.logo_url || null, r.company || ""));

    // Room + note
    const roomTd = tr.insertCell();
    roomTd.className = "event-room";
    const roomName = document.createElement("span");
    roomName.className = "event-room-name";
    roomName.textContent = r.room || "";
    roomTd.appendChild(roomName);
    if (r.note) {
      const note = document.createElement("span");
      note.className = "event-note";
      note.textContent = r.note;
      roomTd.appendChild(note);
    }

    // Time
    const timeTd = tr.insertCell();
    timeTd.className = "event-time";
    timeTd.textContent = `${r.time_start || ""} – ${r.time_end || ""}`;

    // Direction — per-TV key (direction_tv1 / direction_tv2 / direction_tv3)
    const directionKey = _deviceId ? `direction_${_deviceId}` : "direction_tv1";
    const dirTd = tr.insertCell();
    dirTd.className = "event-direction";
    dirTd.appendChild(buildDirectionCell(r[directionKey] || "north"));
  });

  return table;
}

/**
 * If the table is taller than its clipping wrapper, set CSS custom properties
 * and add the .is-scrolling class to start the scroll animation.
 * Duration scales with the overflow amount so the scroll speed stays consistent.
 */
function _activateScrollIfNeeded(wrap, table) {
  const overflow = table.offsetHeight - wrap.offsetHeight;
  if (overflow <= 0) return;

  // ~4 s per 100 px of overflow, minimum 12 s
  const duration = Math.max(12, Math.round(overflow / 100) * 4);
  wrap.style.setProperty("--scroll-offset", `-${overflow}px`);
  wrap.style.setProperty("--scroll-duration", `${duration}s`);
  wrap.classList.add("is-scrolling");
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
