// Turns raw OCR text from a prescription into a list of medicines with dose times.
// Pure functions (no React, no network) so they are easy to test.

const TIMES = {
  morning: '08:00',
  afternoon: '14:00',
  evening: '18:00',
  night: '21:00',
};

const FORM_PREFIX = /^(?:tablet|tab|tabs|capsule|caps|cap|syrup|syp|injection|inj|ointment|oint|drops|drop|cream|gel|susp|suspension)\b\.?\s*/i;
const DOSAGE = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ug|g|ml|iu|units?)\b/i;

// Lines that are clearly NOT medicines.
const IGNORE_LINE = /^(?:dr\b|doctor|name\b|patient|age\b|sex\b|gender|date\b|dt\b|hospital|clinic|reg\b|regn|mob|phone|ph\b|address|diagnosis|dx\b|signature|sign\b|rx\s*$|℞\s*$|advice|follow\s?-?up|review|weight|wt\b|bp\b|pulse|temp|mbbs|md\b|ms\b)/i;

// "1-0-1" style (morning-afternoon-night). OCR often confuses 1/l/I and 0/O.
const PATTERN_3 = /(?<![\w])([01lIOo])\s*[-–—+]\s*([01lIOo])\s*[-–—+]\s*([01lIOo])(?![\w])/;

function digit(ch) {
  return /[1lI]/.test(ch) ? 1 : 0;
}

function timesFromPattern(match) {
  const [m, a, n] = [digit(match[1]), digit(match[2]), digit(match[3])];
  const times = [];
  if (m) times.push(TIMES.morning);
  if (a) times.push(TIMES.afternoon);
  if (n) times.push(TIMES.night);
  return times;
}

const FREQUENCIES = [
  { re: /\b(?:qid|q\.?i\.?d\.?|four\s+times|4\s*times)\b/i, times: ['08:00', '12:00', '16:00', '20:00'] },
  { re: /\b(?:tds|t\.?d\.?s\.?|tid|t\.?i\.?d\.?|thrice|three\s+times|3\s*times)\b/i, times: [TIMES.morning, TIMES.afternoon, TIMES.night] },
  { re: /\b(?:bd|b\.?d\.?|bid|b\.?i\.?d\.?|twice|two\s+times|2\s*times)\b/i, times: [TIMES.morning, TIMES.night] },
  { re: /\b(?:hs|h\.?s\.?|at\s+night|bed\s?time|night)\b/i, times: [TIMES.night] },
  { re: /\b(?:od|o\.?d\.?|qd|once|daily|every\s+day|1\s*time)\b/i, times: [TIMES.morning] },
  { re: /\b(?:morning|am)\b/i, times: [TIMES.morning] },
  { re: /\b(?:afternoon|noon)\b/i, times: [TIMES.afternoon] },
];
const AS_NEEDED = /\b(?:sos|prn|as\s+needed|if\s+required|when\s+required)\b/i;
const WEEKLY = /\b(?:weekly|once\s+(?:a|per)\s+week|per\s+week|alternate\s+days?|every\s+other\s+day)\b/i;

const FOOD = [
  { re: /\b(?:after\s+(?:food|meals?|breakfast|lunch|dinner)|a\/?f|p\.?c\.?)\b/i, text: 'After food' },
  { re: /\b(?:before\s+(?:food|meals?|breakfast|lunch|dinner)|b\/?f|a\.?c\.?)\b/i, text: 'Before food' },
  { re: /\bwith\s+(?:food|meals?|milk)\b/i, text: 'With food' },
  { re: /\bempty\s+stomach\b/i, text: 'Empty stomach' },
];

function detectFrequency(text) {
  const p = text.match(PATTERN_3);
  if (p) {
    const times = timesFromPattern(p);
    if (times.length) return { times, matched: p[0] };
  }
  for (const f of FREQUENCIES) {
    const m = text.match(f.re);
    if (m) return { times: f.times, matched: m[0] };
  }
  return null;
}

function detectFood(text) {
  const hit = FOOD.find((f) => f.re.test(text));
  return hit ? hit.text : '';
}

function titleCase(str) {
  const letters = str.replace(/[^A-Za-z]/g, '');
  const mostlyUpper = letters.length > 3 && letters === letters.toUpperCase();
  const base = mostlyUpper ? str.toLowerCase() : str;
  return base.replace(/\b([a-z])([a-z]*)/g, (_, first, rest) => first.toUpperCase() + rest);
}

function looksLikeMedicine(line) {
  if (IGNORE_LINE.test(line)) return false;
  const stripped = line.replace(/^\s*(?:\d{1,2}\s*[.)]|[-•*])\s*/, '');
  if (FORM_PREFIX.test(stripped)) return true;
  if (DOSAGE.test(stripped)) return true;
  return false;
}

function extractName(line, frequencyMatch) {
  let text = line.replace(/^\s*(?:\d{1,2}\s*[.)]|[-•*])\s*/, ''); // "1." / "2)" numbering
  text = text.replace(FORM_PREFIX, '');

  // cut everything from the frequency pattern onward
  if (frequencyMatch) {
    const idx = text.toLowerCase().indexOf(frequencyMatch.toLowerCase());
    if (idx > 0) text = text.slice(0, idx);
  }
  const p = text.match(PATTERN_3);
  if (p && p.index > 0) text = text.slice(0, p.index);

  // drop trailing instructions / durations
  text = text
    .replace(/\b(?:after|before|with)\s+(?:food|meals?|breakfast|lunch|dinner|milk)\b.*$/i, '')
    .replace(/\b(?:x|for)\s*\d+\s*(?:days?|weeks?|months?)\b.*$/i, '')
    .replace(/\b(?:once|twice|thrice)\b.*$/i, '')
    .replace(/\b(?:sos|prn|as\s+needed|if\s+required|when\s+required)\b.*$/i, '')
    .replace(/[^A-Za-z0-9.%/ ()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.\-–—:]+|[\s.\-–—:,]+$/g, '');

  // OCR often reads the "I" of "IU" as "/" or "|" ("60000/U")
  text = text.replace(/(\d)\s?[/|]U\b/gi, '$1IU');

  return titleCase(text).replace(/\b(\d+(?:\.\d+)?)\s?(Mg|Mcg|Ug|G|Ml|Iu)\b/g, (_, n, u) => `${n}${u.toLowerCase()}`);
}

/**
 * @param {string} rawText OCR output
 * @returns {Array<{name:string, times:string[], note:string, assumed:boolean, skipReason:string, source:string}>}
 */
export function parsePrescription(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 2);

  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!looksLikeMedicine(line)) continue;

    // The schedule is sometimes printed on the following line.
    let scheduleText = line;
    const next = lines[i + 1];
    const nextIsDetail =
      next &&
      next.length < 70 &&
      !looksLikeMedicine(next) &&
      !IGNORE_LINE.test(next) &&
      (detectFrequency(next) || AS_NEEDED.test(next) || WEEKLY.test(next) || detectFood(next));
    if (!detectFrequency(line) && nextIsDetail) {
      scheduleText = `${line} ${next}`;
    }

    const freq = detectFrequency(scheduleText);
    const name = extractName(line, freq?.matched);
    if (name.length < 3 || !/[A-Za-z]{3}/.test(name)) continue;

    const asNeeded = AS_NEEDED.test(scheduleText);
    const weekly = WEEKLY.test(scheduleText);
    // This app schedules DAILY doses, so as-needed and weekly medicines can't be
    // added automatically - we show them but leave them unticked.
    let skipReason = '';
    if (weekly) skipReason = 'Weekly / alternate-day dose - this app schedules daily doses';
    else if (asNeeded && !freq) skipReason = 'Taken only when needed (SOS) - no fixed time';

    results.push({
      name,
      times: skipReason ? [] : freq ? freq.times : [TIMES.morning],
      note: detectFood(scheduleText),
      assumed: !freq && !skipReason, // no schedule found, we guessed 08:00
      skipReason,
      source: line,
    });
  }

  // merge duplicates of the same name
  const seen = new Set();
  return results.filter((r) => {
    const key = r.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { TIMES };
