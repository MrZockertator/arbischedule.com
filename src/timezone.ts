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
    "Europe/Moscow","Europe/Kyiv",
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

function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getOffset(tz: string): string {
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

function formatEpoch(epochMs: number, fmt: string, tz: string): string {
  const d = new Date(epochMs);
  const safeTz = isValidTimezone(tz) ? tz : getLocalTimezone();

  try {
    switch (fmt) {
      case "date":
        return d.toLocaleDateString("en-CA", { timeZone: safeTz });
      case "time":
        return d.toLocaleTimeString("en-GB", {
          timeZone: safeTz,
          hour: "2-digit",
          minute: "2-digit",
        });
      case "day":
        return d.toLocaleDateString(undefined, {
          timeZone: safeTz,
          weekday: "long",
          month: "long",
          day: "numeric",
        });
      case "short-date":
        return d.toLocaleDateString("de-DE", {
          timeZone: safeTz,
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        });
      default:
        return "";
    }
  } catch {
    return "";
  }
}

export {
  TZ_GROUPS,
  getLocalTimezone,
  getOffset, formatEpoch, isValidTimezone,
};
