/**
 * Creates a demo patient with 90 days of realistic dose history so the
 * "AI risk prediction" and compliance score have something to show.
 *
 * Usage (from the backend folder):   node scripts/seedDemoData.js
 * Login afterwards with:             demo@medbox.com / demo123
 *
 * Re-running it replaces the demo user's data. It never touches other users.
 */
require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Kolkata';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const { localDateString } = require('../utils/dateUtils');

const DAYS = 90;

// miss probability: night pills are skipped more, especially on weekends
const MEDS = [
  { medicineName: 'Metformin 500mg', doseTime: '08:00', compartmentNumber: 1, pillColor: 'white', pillShape: 'circle', weekday: 0.05, weekend: 0.1 },
  { medicineName: 'Amlodipine 5mg', doseTime: '14:00', compartmentNumber: 2, pillColor: 'yellow', pillShape: 'oval', weekday: 0.1, weekend: 0.2 },
  { medicineName: 'Atorvastatin 10mg', doseTime: '21:00', compartmentNumber: 3, pillColor: 'pink', pillShape: 'circle', weekday: 0.2, weekend: 0.6 },
];

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set (check backend/.env)');
  await mongoose.connect(process.env.MONGO_URI);

  const email = 'demo@medbox.com';
  const old = await User.findOne({ email });
  if (old) {
    await DoseLog.deleteMany({ userId: old._id });
    await Medicine.deleteMany({ userId: old._id });
    await User.deleteOne({ _id: old._id });
  }

  const user = await User.create({
    name: 'Demo Patient',
    email,
    password: await bcrypt.hash('demo123', 10),
    role: 'caregiver',
    age: 68,
    gender: 'male',
    bloodGroup: 'B+',
    heightCm: 168,
    weightKg: 72,
    phone: '+91 98765 43210',
    doctorName: 'Dr. Ramesh Kumar',
    allergies: 'Penicillin',
    medicalConditions: 'Type 2 diabetes, hypertension',
    emergencyContactName: 'Priya Kumar',
    emergencyContactRelation: 'Daughter',
    emergencyContactPhone: '9876543210',
  });

  const medicines = [];
  for (const m of MEDS) {
    medicines.push(
      await Medicine.create({
        medicineName: m.medicineName,
        doseTime: m.doseTime,
        compartmentNumber: m.compartmentNumber,
        pillColor: m.pillColor,
        pillShape: m.pillShape,
        userId: user._id,
        lastResetDate: localDateString(),
        status: 'pending',
      })
    );
  }

  const logs = [];
  const today = new Date();
  for (let d = DAYS; d >= 1; d--) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);
    const weekend = day.getDay() === 0 || day.getDay() === 6;

    medicines.forEach((medicine, i) => {
      const cfg = MEDS[i];
      const [h, m] = cfg.doseTime.split(':').map(Number);
      const scheduled = new Date(day);
      scheduled.setHours(h, m, 0, 0);

      const missed = Math.random() < (weekend ? cfg.weekend : cfg.weekday);
      const delayMinutes = missed ? 0 : Math.floor(Math.random() * 25);
      const actual = new Date(scheduled.getTime() + (missed ? 30 : delayMinutes) * 60000);

      logs.push({
        medicineId: medicine._id,
        userId: user._id,
        scheduledTime: cfg.doseTime,
        actualTime: actual,
        status: missed ? 'missed' : 'taken',
        delayMinutes: missed ? 30 : delayMinutes,
      });
    });
  }
  await DoseLog.insertMany(logs);

  console.log(`Demo data ready: ${medicines.length} medicines, ${logs.length} dose logs.`);
  console.log('Login: demo@medbox.com / demo123');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
