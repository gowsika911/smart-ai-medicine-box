const express = require('express');
const router = express.Router();
const DoseLog = require('../models/DoseLog');
const Medicine = require('../models/Medicine');
const protect = require('../middleware/authMiddleware');

router.use(protect);

// GET /api/alerts - fetch recent problem events (missed, duplicate, mismatched)
router.get('/', async (req, res) => {
  try {
    const problemLogs = await DoseLog.find({
      userId: req.user.id,
      status: { $in: ['missed', 'duplicate', 'mismatched'] },
    })
      .sort({ actualTime: -1 })
      .limit(20)
      .populate('medicineId', 'medicineName compartmentNumber');

    const alerts = problemLogs.map((log) => ({
      id: log._id,
      medicineName: log.medicineId ? log.medicineId.medicineName : 'Unknown',
      compartmentNumber: log.medicineId ? log.medicineId.compartmentNumber : null,
      type: log.status, // missed / duplicate / mismatched
      scheduledTime: log.scheduledTime,
      occurredAt: log.actualTime,
      severity: log.status === 'missed' ? 'high' : log.status === 'mismatched' ? 'high' : 'medium',
    }));

    res.json({ count: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;