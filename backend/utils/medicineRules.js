// Rules about which medicines are "active" and what counts as a duplicate.
//
//  - A medicine is ACTIVE until it is removed, or until its course ends
//    (endDate, calculated from the optional duration in days).
//  - While a medicine is active, the same medicine cannot be added again.
//    Once it is removed or its course is over it can be added next time.

const MAX_DURATION_DAYS = 365;

const normalizeName = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function isActive(medicine, now = new Date()) {
  return !medicine.endDate || new Date(medicine.endDate) >= now;
}

/** Returns a whole number of days (1..365), undefined when blank, or null when invalid. */
function parseDuration(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DURATION_DAYS) return null;
  return n;
}

/**
 * Last day of the course (23:59:59 local time).
 * Day 1 is today, unless today's dose time has already passed - then it starts tomorrow
 * (same rule as Medicine.activeFrom).
 */
function computeEndDate(durationDays, doseTime, now = new Date()) {
  if (!durationDays) return undefined;
  const [h, m] = String(doseTime).split(':').map(Number);
  const todaysDose = new Date(now);
  todaysDose.setHours(h || 0, m || 0, 0, 0);

  const end = new Date(now);
  if (todaysDose <= now) end.setDate(end.getDate() + 1); // first dose is tomorrow
  end.setDate(end.getDate() + durationDays - 1);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Names (from `names`) that already exist as an ACTIVE medicine in `existing`. */
function findActiveDuplicates(existing, names, now = new Date(), ignoreIds = []) {
  const ignored = new Set([].concat(ignoreIds || []).map(String));
  const active = existing.filter((m) => isActive(m, now) && !ignored.has(String(m._id)));
  const taken = new Map(active.map((m) => [normalizeName(m.medicineName), m.medicineName]));
  const dupes = [];
  names.forEach((name) => {
    const hit = taken.get(normalizeName(name));
    if (hit && !dupes.includes(hit)) dupes.push(hit);
  });
  return dupes;
}

function duplicateMessage(dupes) {
  const list = dupes.join(', ');
  return (
    `${list} ${dupes.length === 1 ? 'is' : 'are'} already in your medicine list. ` +
    'Remove it first, or add it again once its course has ended.'
  );
}

/** Active entries that are the same medicine as `medicine` (its other dose times). */
function siblingsOf(existing, medicine, now = new Date()) {
  const key = normalizeName(medicine.medicineName);
  return existing.filter((m) => isActive(m, now) && normalizeName(m.medicineName) === key);
}

const DOSE_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

module.exports = {
  siblingsOf,
  DOSE_TIME_REGEX,
  normalizeName,
  isActive,
  parseDuration,
  computeEndDate,
  findActiveDuplicates,
  duplicateMessage,
  MAX_DURATION_DAYS,
};
