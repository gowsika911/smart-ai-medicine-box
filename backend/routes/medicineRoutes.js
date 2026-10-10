const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const protect = require('../middleware/authMiddleware');
const { localDateString } = require('../utils/dateUtils');

// All routes below require login
router.use(protect);

function todayString() {
  return localDateString(); // "YYYY-MM-DD" in local time
}

// POST /api/medicines - create a new medicine entry (linked to logged-in user)
router.post('/', async (req, res) => {
  try {
    const { medicineName, doseTime, compartmentNumber, pillColor, pillShape } = req.body;

    if (!medicineName || !doseTime || !compartmentNumber) {
      return res.status(400).json({ error: 'medicineName, doseTime, and compartmentNumber are required' });
    }

    const medicine = await Medicine.create({
      medicineName,
      doseTime,
      compartmentNumber,
      pillColor,
      pillShape,
      userId: req.user.id,
      lastResetDate: todayString(),
    });
    res.status(201).json(medicine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines - fetch only the logged-in user's medicines
router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(medicines);
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
