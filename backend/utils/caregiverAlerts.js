// Emails the patient's emergency contact when doses are missed - only if the patient
// turned this on in their profile (the email contains medicine names).
const User = require('../models/User');
const DoseLog = require('../models/DoseLog');
const { sendMail } = require('./mailer');
const { localDateString } = require('./dateUtils');

const MAX_ALERTS_PER_USER_PER_DAY = 8;
const sentToday = new Map(); // userId -> { day, count }

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function underDailyLimit(userId, today = localDateString()) {
  const entry = sentToday.get(userId);
  return !entry || entry.day !== today || entry.count < MAX_ALERTS_PER_USER_PER_DAY;
}

function recordSend(userId, today = localDateString()) {
  const entry = sentToday.get(userId);
  if (!entry || entry.day !== today) sentToday.set(userId, { day: today, count: 1 });
  else entry.count += 1;
}

function buildMissedDoseEmail(user, missed) {
  const patient = user.name || 'Your family member';
  const contact = user.emergencyContactName || 'there';
  const lines = missed.map(
    (m) => `${m.medicineName} (scheduled ${m.doseTime}${m.compartmentNumber ? `, compartment ${m.compartmentNumber}` : ''})`
  );

  const subject = `MedBox alert: ${patient} missed ${missed.length === 1 ? 'a dose' : `${missed.length} doses`}`;
  const text =
    `Hello ${contact},\n\n` +
    `MedBox did not get a confirmation that ${patient} took:\n` +
    lines.map((l) => `  - ${l}`).join('\n') +
    `\n\nPlease check on them and remind them to take the medicine.\n\n` +
    `This is an automated message. You received it because ${patient} added you as an emergency contact in MedBox ` +
    `and chose to send missed-dose emails.`;
  const html =
    `<p>Hello ${escapeHtml(contact)},</p>` +
    `<p>MedBox did not get a confirmation that <strong>${escapeHtml(patient)}</strong> took:</p>` +
    `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` +
    `<p>Please check on them and remind them to take the medicine.</p>` +
    `<p style="color:#666;font-size:12px">This is an automated message. You received it because ${escapeHtml(patient)} ` +
    `added you as an emergency contact in MedBox and chose to send missed-dose emails.</p>`;
  return { subject, text, html };
}

/**
 * @param {Map<string, Array<{logId, medicineName, doseTime, compartmentNumber}>>} missedByUser
 * One email per patient per scheduler tick, however many doses were missed.
 */
async function notifyMissedDoses(missedByUser) {
  for (const [userId, missed] of missedByUser) {
    try {
      const user = await User.findById(userId).lean();
      if (!user || !user.notifyCaregiver || !user.emergencyContactEmail) continue;
      if (!underDailyLimit(userId)) continue;

      const { subject, text, html } = buildMissedDoseEmail(user, missed);
      const result = await sendMail({ to: user.emergencyContactEmail, subject, text, html });

      if (result.sent) {
        recordSend(userId);
        const ids = missed.map((m) => m.logId).filter(Boolean);
        if (ids.length) await DoseLog.updateMany({ _id: { $in: ids } }, { caregiverNotifiedAt: new Date() });
      }
    } catch (err) {
      console.error(`Caregiver alert failed for user ${userId}:`, err.message);
    }
  }
}

module.exports = { notifyMissedDoses, buildMissedDoseEmail, MAX_ALERTS_PER_USER_PER_DAY };
