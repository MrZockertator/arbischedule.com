/**
 * timezone.js — Timezone selection, formatting, and persistence.
 */

const TZ_GROUPS = Object.freeze({
  "America": [
    "America/Anchorage","America/Los_Angeles","America/Denver",
    "America/Chicago","America/New_York","America/Sao_Paulo",
    "America/Argentina/Buenos_Aires","America/Bogota","America/Lima",
    "America/Caracas","America/Halifax","America/Toronto",
    "America/Vancouver","America/Mexico_City","America/Phoenix",
  ],
  "Europe": [
    "Europe/London","Europe/Lisbon","Europe/Dublin",
    "Europe/Paris","Europe/Berlin","Europe/Vienna","Europe/Rome",
    "Europe/Madrid","Europe/Amsterdam","Europe/Brussels",
    "Europe/Warsaw","Europe/Prague","Europe/Budapest",
    "Europe/Stockholm","Europe/Oslo","Europe/Helsinki",
    "Europe/Athens","Europe/Bucharest","Europe/Istanbul",
    "Europe/Moscow","Europe/Kiev",
  ],
  "Africa": [
    "Africa/Cairo","Africa/Lagos","Africa/Nairobi",
    "Africa/Johannesburg","Africa/Casablanca","Africa/Accra",
  ],
  "Asia": [
    "Asia/Dubai","Asia/Karachi","Asia/Kolkata","Asia/Dhaka",
    "Asia/Bangkok","Asia/Jakarta","Asia/Singapore","Asia/Kuala_Lumpur",
    "Asia/Hong_Kong","Asia/Shanghai","Asia/Taipei","Asia/Seoul",
    "Asia/Tokyo","Asia/Manila","Asia/Riyadh","Asia/Tehran",
    "Asia/Tashkent","Asia/Almaty","Asia/Yekaterinburg",
  ],
  "Pacific": [
    "Pacific/Auckland","Pacific/Fiji","Pacific/Honolulu",
    "Pacific/Guam","Australia/Sydney","Australia/Melbourne",
    "Australia/Brisbane","Australia/Perth","Australia/Adelaide",
  ],
  "UTC": ["UTC"],
});

const STORAGE_KEY = "wf_tz";

function getLocalTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function loadTimezone() {
  try {
    return localStorage.getItem(STORAGE_KEY) || getLocalTimezone();
  } catch {
    return getLocalTimezone();
  }
}

function saveTimezone(tz) {
  try { localStorage.setItem(STORAGE_KEY, tz); } catch { /* noop */ }
}

function clearTimezone() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

function getOffset(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return (parts.find(p => p.type === "timeZoneName") || {}).value || "";
  } catch {
    return "";
  }
}

function formatEpoch(epochMs, fmt, tz) {
  const d = new Date(epochMs);
  switch (fmt) {
    case "date":
      return d.toLocaleDateString("en-CA", { timeZone: tz });
    case "time":
      return d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
    case "day":
      return d.toLocaleDateString(undefined, { timeZone: tz, weekday: "long", month: "long", day: "numeric" });
    case "short-date":
      return d.toLocaleDateString("de-DE", { timeZone: tz, day: "2-digit", month: "2-digit", year: "2-digit" });
    default:
      return "";
  }
}

export {
  TZ_GROUPS, STORAGE_KEY,
  getLocalTimezone, loadTimezone, saveTimezone, clearTimezone,
  getOffset, formatEpoch,
};
