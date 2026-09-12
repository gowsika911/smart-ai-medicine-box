const express = require('express');
const router = express.Router();
const DoseLog = require('../models/DoseLog');
const protect = require('../middleware/authMiddleware');
const { calculateComplianceScore } = require('../utils/complianceEngine');

router.use(protect);

// GET /api/compliance - overall adherence score across ALL medicines
router.get('/', async (req, res) => {
  try {
    const logs = await DoseLog.find({ userId: req.user.id });
    const result = calculateComplianceScore(logs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/:medicineId - adherence score for ONE specific medicine
router.get('/:medicineId', async (req, res) => {
  try {
    const logs = await DoseLog.find({
      userId: req.user.id,
      medicineId: req.params.medicineId,
    });
    const result = calculateComplianceScore(logs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;