const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['caregiver', 'patient'],
      default: 'caregiver',
    },
    age: {
      type: Number,
      min: 0,
      max: 130,
    },
    doctorName: {
      type: String,
      trim: true,
    },
    prescriptionNotes: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number'],
    },
    gender: {
      type: String,
      enum: ['', 'male', 'female', 'other'],
    },
    bloodGroup: {
      type: String,
      enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    heightCm: {
      type: Number,
      min: [30, 'Height must be between 30 and 260 cm'],
      max: [260, 'Height must be between 30 and 260 cm'],
    },
    weightKg: {
      type: Number,
      min: [1, 'Weight must be between 1 and 400 kg'],
      max: [400, 'Weight must be between 1 and 400 kg'],
    },
    allergies: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    medicalConditions: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    emergencyContactName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid emergency contact phone number'],
    },
    emergencyContactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address for the emergency contact'],
    },
    // The patient agrees that missed-dose emails are sent to the emergency contact.
    notifyCaregiver: {
      type: Boolean,
      default: false,
    },
    emergencyContactRelation: {
      type: String,
      trim: true,
      maxlength: 50,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
