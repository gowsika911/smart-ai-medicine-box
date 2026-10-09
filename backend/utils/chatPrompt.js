// Builds the system prompt: safety rules + the patient's medicines (NO name/phone/email/address).

const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY = 8; // last N messages sent to the model

const EMERGENCY_REGEX =
  /\b(overdos\w*|chest pain|can'?t breathe|cannot breathe|difficulty breathing|unconscious|seizure|severe bleeding|suicid\w*|kill myself|poison\w*|anaphyla\w*|swollen (?:face|tongue|throat))\b/i;

const EMERGENCY_REPLY =
  'This sounds like it could be an emergency. Please call your local emergency number right now ' +
  '(112 in India, or 108 for an ambulance) or go to the nearest hospital. If someone is with you, ask them to help. ' +
  'I am an assistant and cannot handle emergencies.';

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function formatTime(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

function buildSystemPrompt(user, medicines) {
  const meds = medicines.length
    ? medicines
        .map((m) => `- ${cleanText(m.medicineName, 80)} at ${formatTime(m.doseTime)} (compartment ${m.compartmentNumber})`)
        .join('\n')
    : '- (no medicines added yet)';

  const profileLines = [
    user.age ? `Age: ${user.age}` : '',
    user.allergies ? `Allergies: ${cleanText(user.allergies, 200)}` : '',
    user.medicalConditions ? `Medical conditions: ${cleanText(user.medicalConditions, 200)}` : '',
  ].filter(Boolean);

  return [
    'You are MedBox Assistant, a friendly helper inside a smart medicine box app used mainly by patients and caregivers in India.',
    '',
    'Rules you must always follow:',
    '- You are NOT a doctor. Give general, educational information about medicines, side effects, food/timing guidance and healthy habits.',
    '- Never diagnose. Never tell the user to start, stop, skip, double or change the dose of any medicine. For those questions say to ask their doctor or pharmacist.',
    '- If the user may have taken a wrong or extra dose, or describes serious symptoms, tell them to contact a doctor or emergency services (112 / 108 in India) immediately.',
    '- If you are not sure, say so. Do not invent facts, brand names or doses.',
    '- Keep answers short (under 120 words), simple and kind. Reply in the language the user writes in (English, Tamil or Tanglish are all fine).',
    '- Only talk about health, medicines and using this app. Politely decline anything else.',
    '- End answers about medicines with a brief reminder to confirm with their doctor or pharmacist when it matters.',
    '',
    "The patient's current medicines (from the app):",
    meds,
    profileLines.length ? `\nPatient details:\n${profileLines.join('\n')}` : '',
  ].join('\n');
}

/** Validates the client history and keeps only the last few well-formed messages. */
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: cleanText(m.content, MAX_MESSAGE_LENGTH) }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY);
}

module.exports = {
  buildSystemPrompt,
  sanitizeHistory,
  cleanText,
  EMERGENCY_REGEX,
  EMERGENCY_REPLY,
  MAX_MESSAGE_LENGTH,
};
