const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const protect = require('../middleware/authMiddleware');
const { localDateString } = require('../utils/dateUtils');
const { lookupPurpose, cleanPurpose } = require('../utils/medicineInfo');
const {
  isActive,
  parseDuration,
  computeEndDate,
  findActiveDuplicates,
  duplicateMessage,
  normalizeName,
  siblingsOf,
  DOSE_TIME_REGEX,
} = require('../utils/medicineRules');

// All routes below require login
router.use(protect);

function todayString() {
  return localDateString(); // "YYYY-MM-DD" in local time
}

// Adds the `completed` flag the app uses to split active medicines from finished courses.
function withCompleted(medicine) {
  const plain = typeof medicine.toObject === 'function' ? medicine.toObject() : medicine;
  return {
    ...plain,
    completed: !isActive(plain),
    // the line shown next to the medicine: the user's own text, else our suggestion
    usedFor: plain.purpose || lookupPurpose(plain.medicineName) || '',
    purposeIsCustom: Boolean(plain.purpose),
  };
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
    const purpose = cleanPurpose(req.body.purpose);
    if (purpose === null) {
      return res.status(400).json({ error: '"Used for" must be 100 characters or fewer.' });
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
      purpose,
      durationDays,
      endDate: computeEndDate(durationDays, doseTime),
      userId: req.user.id,
      lastResetDate: todayString(),
    });
    res.status(201).json(withCompleted(medicine));
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
      const purpose = cleanPurpose(item.purpose);
      if (purpose === null) {
        return res.status(400).json({ error: `"Used for" for ${item.medicineName} must be 100 characters or fewer.` });
      }
      const doc = new Medicine({
        purpose,
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

// POST /api/medicines/purposes - { names: [...] } -> { purposes: { name: "one line" | "" } }
// Used by the Add and Scan pages to show what a medicine is for before it is saved.
router.post('/purposes', (req, res) => {
  const names = Array.isArray(req.body.names) ? req.body.names.slice(0, 30) : [];
  const purposes = {};
  names.forEach((name) => {
    if (typeof name === 'string') purposes[name] = lookupPurpose(name);
  });
  res.json({ purposes });
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

// PUT /api/medicines/:id - edit a medicine (only if it belongs to the user).
// Name, compartment, pill look and course length are shared by ALL dose times of the
// same medicine; the dose time itself only changes for the entry being edited.
router.put('/:id', async (req, res) => {
  try {
    const current = await Medicine.findOne({ _id: req.params.id, userId: req.user.id });
    if (!current) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const existing = await Medicine.find({ userId: req.user.id }).lean();
    const group = siblingsOf(existing, current);
    const groupIds = new Set([String(current._id), ...group.map((m) => String(m._id))]);

    const shared = {};
    ['medicineName', 'compartmentNumber', 'pillColor', 'pillShape'].forEach((key) => {
      if (req.body[key] !== undefined) shared[key] = req.body[key];
    });

    // Renaming into a medicine that is already active would create a duplicate.
    if (shared.medicineName && normalizeName(shared.medicineName) !== normalizeName(current.medicineName)) {
      const others = existing.filter((m) => !groupIds.has(String(m._id)));
      const dupes = findActiveDuplicates(others, [shared.medicineName]);
      if (dupes.length) {
        return res.status(409).json({ error: duplicateMessage(dupes), duplicates: dupes });
      }
    }

    let newDoseTime;
    if (req.body.doseTime !== undefined) {
      if (!DOSE_TIME_REGEX.test(req.body.doseTime)) {
        return res.status(400).json({ error: 'Dose time must look like 08:30.' });
      }
      newDoseTime = req.body.doseTime;
      const clash = group.find(
        (m) => String(m._id) !== String(current._id) && m.doseTime === newDoseTime
      );
      if (clash) {
        return res.status(409).json({ error: `${current.medicineName} already has a dose at ${newDoseTime}.` });
      }
    }

    // Course length: blank clears it (ongoing), a number restarts the countdown from today.
    const unset = {};
    if (req.body.durationDays !== undefined) {
      const durationDays = parseDuration(req.body.durationDays);
      if (durationDays === null) {
        return res.status(400).json({ error: 'Duration must be a whole number of days between 1 and 365.' });
      }
      if (durationDays === undefined) {
        unset.durationDays = '';
        unset.endDate = '';
      } else {
        shared.durationDays = durationDays;
        shared.endDate = computeEndDate(durationDays, newDoseTime || current.doseTime);
      }
    }

    // "Used for": blank clears the custom text (the suggestion shows again)
    if (req.body.purpose !== undefined) {
      const purpose = cleanPurpose(req.body.purpose);
      if (purpose === null) {
        return res.status(400).json({ error: '"Used for" must be 100 characters or fewer.' });
      }
      if (purpose === undefined) unset.purpose = '';
      else shared.purpose = purpose;
    }

    const update = {};
    if (Object.keys(shared).length) update.$set = shared;
    if (Object.keys(unset).length) update.$unset = unset;
    if (Object.keys(update).length) {
      await Medicine.updateMany(
        { _id: { $in: [...groupIds] }, userId: req.user.id },
        update,
        { runValidators: true }
      );
    }

    if (newDoseTime && newDoseTime !== current.doseTime) {
      // Changing the dose time restarts the clock (see Medicine.activeFrom).
      await Medicine.updateOne(
        { _id: current._id, userId: req.user.id },
        { $set: { doseTime: newDoseTime, activeFrom: new Date() } },
        { runValidators: true }
      );
    }

    const updated = await Medicine.findOne({ _id: req.params.id, userId: req.user.id });
    res.json(withCompleted(updated));
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/medicines/:id/times - add another dose time for an existing medicine
// (same name, compartment, pill look and course end).
router.post('/:id/times', async (req, res) => {
  try {
    const source = await Medicine.findOne({ _id: req.params.id, userId: req.user.id });
    if (!source) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    if (!isActive(source)) {
      return res.status(400).json({ error: 'This course has ended. Add the medicine again as a new one.' });
    }

    const { doseTime } = req.body;
    if (!DOSE_TIME_REGEX.test(doseTime || '')) {
      return res.status(400).json({ error: 'Dose time must look like 08:30.' });
    }

    const existing = await Medicine.find({ userId: req.user.id }).lean();
    if (siblingsOf(existing, source).some((m) => m.doseTime === doseTime)) {
      return res.status(409).json({ error: `${source.medicineName} already has a dose at ${doseTime}.` });
    }

    const created = await Medicine.create({
      medicineName: source.medicineName,
      doseTime,
      compartmentNumber: source.compartmentNumber,
      pillColor: source.pillColor,
      pillShape: source.pillShape,
      purpose: source.purpose,
      durationDays: source.durationDays,
      endDate: source.endDate,
      userId: req.user.id,
      lastResetDate: todayString(),
    });
    res.status(201).json(withCompleted(created));
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
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
