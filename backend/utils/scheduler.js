const cron = require('node-cron');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');

// How many minutes after the scheduled dose time we wait before
// treating an un-verified dose as missed.
const MISSED_GRACE_MINUTES = 30;

function todayString() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function buildScheduledDate(doseTime) {
  const [hour, minute] = doseTime.split(':').map(Number);
  const scheduled = new Date();
  scheduled.setHours(hour, minute, 0, 0);
  return scheduled;
}

/**
 * Runs once a minute for every medicine in the system:
 *  1. If the medicine's status still belongs to a previous day, reset it
 *     to "pending" for the new day (daily recurring dose).
 *  2. If today's dose is still "pending" and the grace period after the
 *     scheduled time has passed with no webcam verification, mark it
 *     "missed" and write a DoseLog entry so alerts/compliance pick it up.
 */
async function runSchedulerTick() {
  const today = todayString();
  const now = new Date();

  let medicines;
  try {
    medicines = await Medicine.find({});
  } catch (err) {
    console.error('Scheduler: failed to load medicines:', err.message);
    return;
  }

  for (const medicine of medicines) {
    try {
      if (medicine.lastResetDate !== today) {
        medicine.status = 'pending';
        medicine.lastResetDate = today;
        await medicine.save();
        continue; // give it this tick before checking for "missed"
      }

      if (medicine.status !== 'pending') {
        continue;
      }

      const scheduled = buildScheduledDate(medicine.doseTime);
      const minutesPast = (now - scheduled) / 60000;

      if (minutesPast >= MISSED_GRACE_MINUTES) {
        await DoseLog.create({
          medicineId: medicine._id,
          userId: medicine.userId,
          scheduledTime: medicine.doseTime,
          actualTime: now,
          status: 'missed',
          delayMinutes: Math.round(minutesPast),
        });

        medicine.status = 'missed';
        await medicine.save();
      }
    } catch (err) {
      console.error(`Scheduler: failed processing medicine ${medicine._id}:`, err.message);
    }
  }
}

function startScheduler() {
  // Runs at the top of every minute.
  cron.schedule('* * * * *', () => {
    runSchedulerTick();
  });
  console.log('Dose scheduler started (checks run every minute).');
}

module.exports = { startScheduler, runSchedulerTick };
