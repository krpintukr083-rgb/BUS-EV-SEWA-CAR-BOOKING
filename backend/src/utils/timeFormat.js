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

/**
 * Computes an absolute UTC Date for a schedule's departure given its travelDate and departureTime.
 * The standard operational timezone for YatraSewanp is Nepal Time (UTC+05:45, +345 minutes).
 * travelDate can be a Date object or ISO string. The calendar date (YYYY-MM-DD in Nepal time)
 * is combined with the clock departureTime to calculate the precise departure moment.
 *
 * @param {Date|string} travelDate
 * @param {string} departureTime - e.g. "07:00 AM" or "18:30"
 * @param {number} tzOffsetMinutes - Timezone offset in minutes (default +345 for Nepal UTC+5:45)
 * @returns {Date|null}
 */
function getScheduleDepartureDateTime(travelDate, departureTime, tzOffsetMinutes = 345) {
  if (!travelDate) return null;
  const d = new Date(travelDate);
  if (Number.isNaN(d.getTime())) return null;

  const normalized = normalizeScheduleTime(departureTime);
  const match = normalized ? normalized.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/) : null;
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3];

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  // Compute the calendar year, month, date in the target timezone (Nepal: UTC+5:45)
  // Shift by tzOffset to read UTC components representing local calendar day
  const localMs = d.getTime() + tzOffsetMinutes * 60000;
  const localDate = new Date(localMs);
  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth();
  const date = localDate.getUTCDate();

  // Reconstruct UTC timestamp for the local departure:
  // departureUtc = Date.UTC(year, month, date, hours, minutes, 0) - tzOffsetMinutes * 60000
  const departureUtcMs = Date.UTC(year, month, date, hours, minutes, 0) - tzOffsetMinutes * 60000;
  return new Date(departureUtcMs);
}

/**
 * Checks if a schedule's departure time has already passed relative to now.
 *
 * @param {Date|string} travelDate
 * @param {string} departureTime
 * @param {number} [bufferMinutes=0] - Optional buffer (e.g. 0 min for strict departure)
 * @param {Date} [referenceNow=new Date()]
 * @returns {boolean}
 */
function isScheduleDeparted(travelDate, departureTime, bufferMinutes = 0, referenceNow = new Date()) {
  const departureDate = getScheduleDepartureDateTime(travelDate, departureTime);
  if (!departureDate) return false;
  return referenceNow.getTime() >= (departureDate.getTime() + bufferMinutes * 60000);
}

module.exports = {
  normalizeScheduleTime,
  validateScheduleTime,
  getScheduleDepartureDateTime,
  isScheduleDeparted
};

