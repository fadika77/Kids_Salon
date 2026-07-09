/**
 * Local-timezone date helpers.
 *
 * NEVER use new Date().toISOString() to get "today" — toISOString() converts
 * to UTC, which is 2-3 hours behind Israel time. Between midnight and ~03:00
 * local time that returns YESTERDAY's date, shifting everything by one day.
 * These helpers use the device's local calendar date instead.
 */

/** Format a Date as YYYY-MM-DD using LOCAL time (not UTC). */
export function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's date as YYYY-MM-DD in the device's local timezone. */
export function todayISO() {
  return toLocalISO(new Date());
}
