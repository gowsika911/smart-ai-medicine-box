const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const protect = require('../middleware/authMiddleware');
const { chatCompletion, LlmError } = require('../utils/llm');
const {
  buildSystemPrompt,
  sanitizeHistory,
  cleanText,
  EMERGENCY_REGEX,
  EMERGENCY_REPLY,
  MAX_MESSAGE_LENGTH,
} = require('../utils/chatPrompt');

router.use(protect);

// Simple in-memory rate limit per user, so the free API quota is not used up by one person.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const usage = new Map(); // userId -> [timestamps]

function allowRequest(userId, now = Date.now()) {
  const recent = (usage.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    usage.set(userId, recent);
    return false;
  }
  recent.push(now);
  usage.set(userId, recent);
  return true;
}

// POST /api/chat  body: { message: string, history?: [{role, content}] }
router.post('/', async (req, res) => {
  try {
    const message = cleanText(req.body.message, MAX_MESSAGE_LENGTH);
    if (!message) {
      return res.status(400).json({ error: 'Please type a question.' });
    }

    // Emergencies get a fixed safe answer - we never send those to the AI.
    if (EMERGENCY_REGEX.test(message)) {
      return res.json({ reply: EMERGENCY_REPLY, emergency: true });
    }

    if (!allowRequest(String(req.user.id))) {
      return res.status(429).json({ error: 'You have reached the hourly question limit. Please try again later.' });
    }

    const [user, medicines] = await Promise.all([
      User.findById(req.user.id).lean(),
      Medicine.find({ userId: req.user.id }).lean(),
    ]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const messages = [
      { role: 'system', content: buildSystemPrompt(user, medicines) },
      ...sanitizeHistory(req.body.history),
      { role: 'user', content: message },
    ];

    const reply = await chatCompletion(messages);
    res.json({ reply });
  } catch (err) {
    if (err instanceof LlmError) {
      return res.status(err.status || 502).json({ error: err.message });
    }
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
module.exports.allowRequest = allowRequest;
