const express = require('express');
const router = express.Router();
const User = require('../models/User');
const protect = require('../middleware/authMiddleware');
const { sendMail, isMailConfigured } = require('../utils/mailer');

router.use(protect);

const WINDOW_MS = 60 * 60 * 1000;
const MAX_TESTS_PER_WINDOW = 5;
const tests = new Map(); // userId -> [timestamps]

// POST /api/notify/test - sends a test email to the user's emergency contact
router.post('/test', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.emergencyContactEmail) {
      return res.status(400).json({ error: 'Save an emergency contact email in your profile first.' });
    }
    if (!isMailConfigured()) {
      return res.status(503).json({ error: 'Email is not set up on the server yet (missing BREVO_API_KEY / MAIL_FROM_EMAIL).' });
    }

    const now = Date.now();
    const recent = (tests.get(String(user._id)) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_TESTS_PER_WINDOW) {
      return res.status(429).json({ error: 'Too many test emails. Try again in an hour.' });
    }
    recent.push(now);
    tests.set(String(user._id), recent);

    const patient = user.name || 'A MedBox user';
    const result = await sendMail({
      to: user.emergencyContactEmail,
      subject: `MedBox test email from ${patient}`,
      text:
        `Hello ${user.emergencyContactName || 'there'},\n\n` +
        `${patient} added you as an emergency contact in MedBox. ` +
        `If they turn on missed-dose emails, you will be told when a dose is missed.\n\n` +
        `This is only a test. Nothing is wrong.`,
    });

    if (!result.sent) {
      return res.status(502).json({ error: 'The email service could not send the message. Check the API key and sender address.' });
    }
    res.json({ sent: true, to: user.emergencyContactEmail });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
