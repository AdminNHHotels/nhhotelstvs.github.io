// events.js — EVENTS state: renders the active reservations table

import { buildLogoImg, buildDirectionCell, clearEl } from "./ui.js";

let _container = null;

/**
 * Initialise the EVENTS view inside the given container element.
 * @param {HTMLElement} container — #main-content
 * @param {Object} reservations — raw Firebase reservations object for today
 */
export function initEvents(container, reservations) {
  _container = container;
  clearEl(_container);

  const table = _buildTable(reservations);
  _container.appendChild(table);
}

/**
 * Update the events table with fresh data (called on live Firebase update).
 * @param {Object} reservations — raw Firebase reservations object
 * @returns {boolean} — true if at least one active reservation is visible
 */
export function updateEvents(reservations) {
  if (!_container) return false;
  const active = _getActiveReservations(reservations);
  clearEl(_container);
  _container.appendChild(_buildTable(reservations));
  return active.length > 0;
}

/** Tear down — nothing persistent to clean up. */
export function destroyEvents() {
  _container = null;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function _getActiveReservations(reservations) {
  const now = _nowMinutes();
  return Object.values(reservations || {}).filter((r) => {
    if (!r.active) return false;
    const from = _parseTime(r.show_from);
    const end  = _parseTime(r.time_end);
    return from <= now && now <= end;
  });
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
  ["", "Room / Note", "Time", "Direction"].forEach((h) => {
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
    timeTd.textContent = `${r.time_start || ""}–${r.time_end || ""}`;

    // Direction
    const dirTd = tr.insertCell();
    dirTd.className = "event-direction";
    dirTd.appendChild(buildDirectionCell(r.direction || "straight"));
  });

  return table;
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
