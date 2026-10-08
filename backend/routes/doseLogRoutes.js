const express = require('express');
const router = express.Router();
const DoseLog = require('../models/DoseLog');
const Medicine = require('../models/Medicine');
const protect = require('../middleware/authMiddleware');
const { localDateString } = require('../utils/dateUtils');

router.use(protect);

// POST /api/doselogs - log a dose event (taken/missed/duplicate/mismatched)
router.post('/', async (req, res) => {
  try {
    const { medicineId, status } = req.body;

    if (!medicineId || !status) {
      return res.status(400).json({ error: 'medicineId and status are required' });
    }

    if (!['taken', 'mismatched'].includes(status)) {
      return res.status(400).json({ error: 'status must be "taken" or "mismatched"' });
    }

    const medicine = await Medicine.findOne({ _id: medicineId, userId: req.user.id });
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    // Calculate delay: compare scheduled time vs now
    const now = new Date();
    const [schedHour, schedMin] = medicine.doseTime.split(':').map(Number);
    const scheduled = new Date(now);
    scheduled.setHours(schedHour, schedMin, 0, 0);

    // Duplicate detection: today's dose was already taken and the user verifies again.
    const alreadyTakenToday =
      medicine.status === 'taken' && medicine.lastResetDate === localDateString(now);
    const finalStatus = status === 'taken' && alreadyTakenToday ? 'duplicate' : status;

    const delayMinutes = finalStatus === 'taken'
      ? Math.max(0, Math.round((now - scheduled) / 60000))
      : 0;

    const log = await DoseLog.create({
      medicineId,
      userId: req.user.id,
      scheduledTime: medicine.doseTime,
      actualTime: now,
      status: finalStatus,
      delayMinutes,
    });

    // Update medicine's current status (a duplicate leaves today's "taken" as is)
    if (finalStatus !== 'duplicate') {
      medicine.status = finalStatus;
      await medicine.save();
    }

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doselogs - fetch all dose logs for logged-in user
router.get('/', async (req, res) => {
  try {
    const logs = await DoseLog.find({ userId: req.user.id }).sort({ actualTime: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doselogs/:medicineId - fetch logs for one specific medicine
router.get('/:medicineId', async (req, res) => {
  try {
    const logs = await DoseLog.find({
      medicineId: req.params.medicineId,
      userId: req.user.id,
    }).sort({ actualTime: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;