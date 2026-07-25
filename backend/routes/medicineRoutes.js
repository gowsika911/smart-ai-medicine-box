const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

// POST /api/medicines - create a new medicine entry
router.post('/', async (req, res) => {
  try {
    const { medicineName, doseTime, compartmentNumber } = req.body;

    if (!medicineName || !doseTime || !compartmentNumber) {
      return res.status(400).json({ error: 'medicineName, doseTime, and compartmentNumber are required' });
    }

    const medicine = await Medicine.create({ medicineName, doseTime, compartmentNumber });
    res.status(201).json(medicine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines - fetch all medicine entries
router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ createdAt: -1 });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/medicines/:id - fetch single medicine by id
router.get('/:id', async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/medicines/:id - update medicine (e.g. mark as taken)
router.put('/:id', async (req, res) => {
  try {
    const updated = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/medicines/:id - delete a medicine entry
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json({ message: 'Medicine deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;