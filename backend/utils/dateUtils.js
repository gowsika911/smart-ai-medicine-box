// Local calendar date as "YYYY-MM-DD" (uses the server timezone, set via TZ in server.js).
// Do NOT use toISOString() for this - it always returns the UTC date, which is
// wrong for India for the first 5.5 hours of every day.
function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { localDateString };
