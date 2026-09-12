const mongoose = require('mongoose');

const doseLogSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledTime: {
      type: String, // "HH:mm" - the time it was supposed to be taken
      required: true,
    },
    actualTime: {
      type: Date, // exact timestamp when action happened
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['taken', 'missed', 'duplicate', 'mismatched'],
      required: true,
    },
    delayMinutes: {
      type: Number, // how late the dose was taken (0 if on time)
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DoseLog', doseLogSchema);