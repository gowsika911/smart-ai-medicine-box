const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const protect = require('../middleware/authMiddleware');

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    age: user.age ?? null,
    doctorName: user.doctorName || '',
    prescriptionNotes: user.prescriptionNotes || '',
    phone: user.phone || '',
    gender: user.gender || '',
    bloodGroup: user.bloodGroup || '',
    heightCm: user.heightCm ?? null,
    weightKg: user.weightKg ?? null,
    allergies: user.allergies || '',
    medicalConditions: user.medicalConditions || '',
    address: user.address || '',
    emergencyContactName: user.emergencyContactName || '',
    emergencyContactPhone: user.emergencyContactPhone || '',
    emergencyContactEmail: user.emergencyContactEmail || '',
    notifyCaregiver: Boolean(user.notifyCaregiver),
    emergencyContactRelation: user.emergencyContactRelation || '',
  };
}

// Profile fields a user is allowed to edit via PUT /api/auth/profile.
const TEXT_PROFILE_FIELDS = [
  'doctorName', 'prescriptionNotes', 'phone', 'gender', 'bloodGroup',
  'allergies', 'medicalConditions', 'address',
  'emergencyContactName', 'emergencyContactPhone', 'emergencyContactEmail', 'emergencyContactRelation',
];
const NUMBER_PROFILE_FIELDS = ['age', 'heightCm', 'weightKg'];

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, age, doctorName, prescriptionNotes } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      age: age || undefined,
      doctorName: doctorName || undefined,
      prescriptionNotes: prescriptionNotes || undefined,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - fetch the logged-in user's full profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userResponse(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/profile - update patient details (age, doctor, health info, emergency contact)
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    TEXT_PROFILE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    if (req.body.notifyCaregiver !== undefined) {
      user.notifyCaregiver = req.body.notifyCaregiver === true || req.body.notifyCaregiver === 'true';
    }
    if (user.notifyCaregiver && !user.emergencyContactEmail) {
      return res.status(400).json({ error: 'Add your emergency contact\'s email address to turn on missed-dose emails.' });
    }

    // Numbers: null / '' clears the value, otherwise it must be a valid number.
    for (const field of NUMBER_PROFILE_FIELDS) {
      const value = req.body[field];
      if (value === undefined) continue;
      if (value === null || value === '') {
        user[field] = undefined;
      } else if (Number.isNaN(Number(value))) {
        return res.status(400).json({ error: `${field} must be a number` });
      } else {
        user[field] = Number(value);
      }
    }

    await user.save();

    res.json(userResponse(user));
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map((e) => e.message).join('. ');
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
