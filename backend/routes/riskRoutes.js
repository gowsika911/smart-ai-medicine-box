const express = require('express');
const router = express.Router();
const DoseLog = require('../models/DoseLog');
const Medicine = require('../models/Medicine');
const protect = require('../middleware/authMiddleware');
const { predictRisk } = require('../utils/riskModel');
const { isActive } = require('../utils/medicineRules');

router.use(protect);

// GET /api/risk - predicted chance of missing each medicine's NEXT dose
router.get('/', async (req, res) => {
  try {
    const [logs, medicines] = await Promise.all([
      DoseLog.find({ userId: req.user.id }).lean(),
      Medicine.find({ userId: req.user.id }).lean(),
    ]);
    res.json(predictRisk(logs, medicines.filter((m) => isActive(m))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
