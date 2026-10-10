const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const protect = require('../middleware/authMiddleware');
const { localDateString } = require('../utils/dateUtils');
const {
  isActive,
  parseDuration,
  computeEndDate,
  findActiveDuplicates,
  duplicateMessage,
} = require('../utils/medicineRules');

// All routes below require login
router.use(protect);

function todayString() {
  return localDateString(); // "YYYY-MM-DD" in local time
}

// Adds the `completed` flag the app uses to split active medicines from finished courses.
function withCompleted(medicine) {
  const plain = typeof medicine.toObject === 'function' ? medicine.toObject() : medicine;
  return { ...plain, completed: !isActive(plain) };
}

// POST /api/medicines - create a new medicine entry (linked to logged-in user)
router.post('/', async (req, res) => {
  try {
    const { medicineName, doseTime, compartmentNumber, pillColor, pillShape } = req.body;

    if (!medicineName || !doseTime || !compartmentNumber) {
      return res.status(400).json({ error: 'medicineName, doseTime, and compartmentNumber are required' });
    }

    const durationDays = parseDuration(req.body.durationDays);
    if (durationDays === null) {
      return res.status(400).json({ error: 'Duration must be a whole number of days between 1 and 365.' });
    }

    // The same medicine cannot be added again while it is still active.
    const existing = await Medicine.find({ userId: req.user.id }).lean();
    const dupes = findActiveDuplicates(existing, [medicineName]);
    if (dupes.length) {
      return res.status(409).json({ error: duplicateMessage(dupes), duplicates: dupes });
    }

    const medicine = await Medicine.create({
      medicineName,
      doseTime,
      compartmentNumber,
      pillColor,
      pillShape,
      durationDays,
      endDate: computeEndDate(durationDays, doseTime),
      userId: req.user.id,
      lastResetDate: todayString(),
    });
    res.status(201).json(medicine);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/medicines/bulk - add several rows at once (e.g. from a scanned prescription).
// One medicine may appear several times in the same request (different dose times),
// but none of the names may already be active in the user's list.
router.post('/bulk', async (req, res) => {
  try {
    const items = req.body.medicines;
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return res.status(400).json({ error: 'Send between 1 and 30 medicines.' });
    }

    const existing = await Medicine.find({ userId: req.user.id }).lean();
    const dupes = findActiveDuplicates(existing, items.map((i) => i.medicineName));
    if (dupes.length) {
      return res.status(409).json({ error: duplicateMessage(dupes), duplicates: dupes });
    }

    const docs = [];
    for (const item of items) {
      if (!item.medicineName || !item.doseTime || !item.compartmentNumber) {
        return res.status(400).json({ error: 'Every medicine needs a name, dose time and compartment.' });
      }
      const durationDays = parseDuration(item.durationDays);
      if (durationDays === null) {
        return res.status(400).json({ error: `Duration for ${item.medicineName} must be 1 to 365 days.` });
      }
      const doc = new Medicine({
        medicineName: item.medicineName,
        doseTime: item.doseTime,
        compartmentNumber: item.compartmentNumber,
        pillColor: item.pillColor,
        pillShape: item.pillShape,
        durationDays,
        endDate: computeEndDate(durationDays, item.doseTime),
        userId: req.user.id,
        lastResetDate: todayString(),
      });
      await doc.validate(); // throws ValidationError -> 400 below; nothing is saved yet
      docs.push(doc);
    }

    const saved = await Medicine.insertMany(docs);
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines - fetch only the logged-in user's medicines
router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(medicines.map(withCompleted));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines/:id - fetch single medicine (only if it belongs to user)
router.get('/:id', async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ _id: req.params.id, userId: req.user.id });
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/medicines/:id - update medicine (only if it belongs to user)
router.put('/:id', async (req, res) => {
  try {
    // Only allow these fields to be edited (prevents changing userId etc.)
    const allowed = ['medicineName', 'doseTime', 'compartmentNumber', 'pillColor', 'pillShape'];
    const changes = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) changes[key] = req.body[key];
    });

    // Renaming into a medicine that is already active would create a duplicate.
    if (changes.medicineName) {
      const existing = await Medicine.find({ userId: req.user.id }).lean();
      const dupes = findActiveDuplicates(existing, [changes.medicineName], new Date(), req.params.id);
      if (dupes.length) {
        return res.status(409).json({ error: duplicateMessage(dupes), duplicates: dupes });
      }
    }

    // Changing the dose time restarts the clock (see Medicine.activeFrom).
    if (changes.doseTime) changes.activeFrom = new Date();

    const updated = await Medicine.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      changes,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/medicines/:id - delete medicine (only if it belongs to user)
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Medicine.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json({ message: 'Medicine deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
