/**
 * Time formatting and normalization utility for Schedules and Vehicles.
 * Preserves exact clock-only times (12-hour AM/PM format) without using
 * JavaScript Date objects to avoid timezone / UTC / locale shifting.
 */

/**
 * Normalizes a time string into standard 12-hour format: "HH:MM AM" or "HH:MM PM"
 * Examples:
 *   "06:00 PM" -> "06:00 PM"
 *   "6:00 PM"  -> "06:00 PM"
 *   "06:00pm"  -> "06:00 PM"
 *   "18:00"    -> "06:00 PM"
 *   "06:00 AM" -> "06:00 AM"
 *   "11:30 AM" -> "11:30 AM"
 *   "12:00 AM" -> "12:00 AM"
 *   "01:00 AM" -> "01:00 AM"
 *   "12:00 PM" -> "12:00 PM"
 *   "01:00 PM" -> "01:00 PM"
 *   "05:30 PM" -> "05:30 PM"
 *   "10:45 PM" -> "10:45 PM"
 */
function normalizeScheduleTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // 1. Matches 12-hour format: e.g. "06:00 PM", "6:00 PM", "06:00pm", "12:00 AM"
  const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*([APap][mM])$/);
  if (match12) {
    const hours = match12[1].padStart(2, '0');
    const minutes = match12[2];
    const meridiem = match12[3].toUpperCase();
    return `${hours}:${minutes} ${meridiem}`;
  }

  // 2. Matches 24-hour format: e.g. "18:00", "06:00", "00:00", "12:00", "23:59"
  const match24 = trimmed.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/);
  if (match24) {
    const hours24 = parseInt(match24[1], 10);
    const minutes = match24[2];
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;
    return `${String(hours12).padStart(2, '0')}:${minutes} ${meridiem}`;
  }

  return trimmed;
}

/**
 * Validates whether a time string is a valid clock time.
 */
function validateScheduleTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const normalized = normalizeScheduleTime(timeStr);
  return /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(normalized);
}

module.exports = {
  normalizeScheduleTime,
  validateScheduleTime
};
