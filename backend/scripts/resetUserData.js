/**
 * Deletes ALL medicines and dose logs of ONE user (the account itself is kept).
 * Handy after testing, to start clean.
 *
 *   node scripts/resetUserData.js your-email@example.com
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');

async function main() {
  const email = (process.argv[2] || '').toLowerCase().trim();
  if (!email) throw new Error('Usage: node scripts/resetUserData.js <email>');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set (check backend/.env)');

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (!user) throw new Error(`No user found with email ${email}`);

  const meds = await Medicine.deleteMany({ userId: user._id });
  const logs = await DoseLog.deleteMany({ userId: user._id });
  console.log(`Cleared ${meds.deletedCount} medicines and ${logs.deletedCount} dose logs for ${email}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
