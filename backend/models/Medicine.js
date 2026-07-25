const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    doseTime: {
      type: String, // format: "HH:mm" e.g. "09:00"
      required: [true, 'Dose time is required'],
    },
    compartmentNumber: {
      type: Number,
      required: [true, 'Compartment number is required'],
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'taken', 'missed', 'mismatched'],
      default: 'pending',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // will make required once auth (User model) is built
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model('Medicine', medicineSchema);