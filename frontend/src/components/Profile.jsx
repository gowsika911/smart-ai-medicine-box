import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const EMPTY_FORM = {
  age: '',
  gender: '',
  bloodGroup: '',
  heightCm: '',
  weightKg: '',
  phone: '',
  address: '',
  doctorName: '',
  allergies: '',
  medicalConditions: '',
  prescriptionNotes: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
};

const PHONE_REGEX = /^\+?[0-9 ()-]{7,20}$/;

function bmiInfo(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!h || !w) return null;
  const bmi = w / ((h / 100) ** 2);
  let label = 'Normal';
  if (bmi < 18.5) label = 'Underweight';
  else if (bmi >= 30) label = 'Obese';
  else if (bmi >= 25) label = 'Overweight';
  return { value: bmi.toFixed(1), label };
}

function Profile() {
  const { updateUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/auth/me');
      const profile = response.data;
      setName(profile.name);
      setEmail(profile.email);
      setForm({
        age: profile.age ?? '',
        gender: profile.gender || '',
        bloodGroup: profile.bloodGroup || '',
        heightCm: profile.heightCm ?? '',
        weightKg: profile.weightKg ?? '',
        phone: profile.phone || '',
        address: profile.address || '',
        doctorName: profile.doctorName || '',
        allergies: profile.allergies || '',
        medicalConditions: profile.medicalConditions || '',
        prescriptionNotes: profile.prescriptionNotes || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        emergencyContactRelation: profile.emergencyContactRelation || '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (form.phone && !PHONE_REGEX.test(form.phone)) return 'Enter a valid phone number.';
    if (form.emergencyContactPhone && !PHONE_REGEX.test(form.emergencyContactPhone)) {
      return 'Enter a valid emergency contact phone number.';
    }
    if (form.age !== '' && (Number(form.age) < 0 || Number(form.age) > 130)) {
      return 'Age must be between 0 and 130.';
    }
    if (form.heightCm !== '' && (Number(form.heightCm) < 30 || Number(form.heightCm) > 260)) {
      return 'Height must be between 30 and 260 cm.';
    }
    if (form.weightKg !== '' && (Number(form.weightKg) < 1 || Number(form.weightKg) > 400)) {
      return 'Weight must be between 1 and 400 kg.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const toNumberOrNull = (v) => (v === '' ? null : Number(v));
      const response = await axiosInstance.put('/auth/profile', {
        ...form,
        age: toNumberOrNull(form.age),
        heightCm: toNumberOrNull(form.heightCm),
        weightKg: toNumberOrNull(form.weightKg),
      });
      updateUser(response.data);
      setSuccessMsg('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading profile...</p>
      </div>
    );
  }

  const bmi = bmiInfo(form.heightCm, form.weightKg);

  return (
    <div className="form-page">
      <header className="page-header">
        <div>
          <h1>Patient profile</h1>
          <p className="page-subtitle">
            Keep health details and an emergency contact on hand — useful for caregivers and doctors.
          </p>
        </div>
      </header>

      <div className="card-panel form-panel-wide">
        {error && <div className="alert-banner">{error}</div>}
        {successMsg && <div className="alert-banner alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <h2 className="profile-section-title">Basic details</h2>
          <div className="field-row">
            <div className="field-group">
              <label htmlFor="profile-name">Name</label>
              <input id="profile-name" type="text" value={name} disabled />
            </div>
            <div className="field-group">
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" type="text" value={email} disabled />
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="profile-age">Age</label>
              <input
                id="profile-age"
                type="number"
                min="0"
                max="130"
                value={form.age}
                onChange={setField('age')}
                placeholder="e.g. 68"
              />
            </div>
            <div className="field-group">
              <label htmlFor="profile-gender">Gender</label>
              <select id="profile-gender" value={form.gender} onChange={setField('gender')}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                type="tel"
                value={form.phone}
                onChange={setField('phone')}
                placeholder="e.g. +91 98765 43210"
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="profile-address">Address</label>
            <input
              id="profile-address"
              type="text"
              value={form.address}
              onChange={setField('address')}
              placeholder="e.g. 12, Gandhi Street, Chennai"
            />
          </div>

          <h2 className="profile-section-title">Health information</h2>
          <div className="field-row">
            <div className="field-group">
              <label htmlFor="profile-blood">Blood group</label>
              <select id="profile-blood" value={form.bloodGroup} onChange={setField('bloodGroup')}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="profile-height">Height (cm)</label>
              <input
                id="profile-height"
                type="number"
                min="30"
                max="260"
                value={form.heightCm}
                onChange={setField('heightCm')}
                placeholder="e.g. 165"
              />
            </div>
            <div className="field-group">
              <label htmlFor="profile-weight">Weight (kg)</label>
              <input
                id="profile-weight"
                type="number"
                min="1"
                max="400"
                value={form.weightKg}
                onChange={setField('weightKg')}
                placeholder="e.g. 62"
              />
            </div>
          </div>
          {bmi && (
            <p className="profile-bmi">
              BMI: <strong>{bmi.value}</strong> ({bmi.label})
            </p>
          )}

          <div className="field-group">
            <label htmlFor="profile-allergies">Allergies</label>
            <textarea
              id="profile-allergies"
              rows="2"
              value={form.allergies}
              onChange={setField('allergies')}
              placeholder="e.g. Penicillin, peanuts"
            />
          </div>

          <div className="field-group">
            <label htmlFor="profile-conditions">Medical conditions</label>
            <textarea
              id="profile-conditions"
              rows="2"
              value={form.medicalConditions}
              onChange={setField('medicalConditions')}
              placeholder="e.g. Type 2 diabetes, hypertension"
            />
          </div>

          <h2 className="profile-section-title">Doctor &amp; prescription</h2>
          <div className="field-group">
            <label htmlFor="profile-doctor">Doctor's name</label>
            <input
              id="profile-doctor"
              type="text"
              value={form.doctorName}
              onChange={setField('doctorName')}
              placeholder="e.g. Dr. Ramesh Kumar"
            />
          </div>

          <div className="field-group">
            <label htmlFor="profile-prescription">Prescription notes</label>
            <textarea
              id="profile-prescription"
              rows="4"
              value={form.prescriptionNotes}
              onChange={setField('prescriptionNotes')}
              placeholder="e.g. Metformin 500mg twice daily, Amlodipine 5mg once daily after breakfast"
            />
          </div>

          <h2 className="profile-section-title">Emergency contact</h2>
          <div className="field-row">
            <div className="field-group">
              <label htmlFor="profile-ec-name">Contact name</label>
              <input
                id="profile-ec-name"
                type="text"
                value={form.emergencyContactName}
                onChange={setField('emergencyContactName')}
                placeholder="e.g. Priya Kumar"
              />
            </div>
            <div className="field-group">
              <label htmlFor="profile-ec-relation">Relationship</label>
              <input
                id="profile-ec-relation"
                type="text"
                value={form.emergencyContactRelation}
                onChange={setField('emergencyContactRelation')}
                placeholder="e.g. Daughter"
              />
            </div>
            <div className="field-group">
              <label htmlFor="profile-ec-phone">Contact phone</label>
              <input
                id="profile-ec-phone"
                type="tel"
                value={form.emergencyContactPhone}
                onChange={setField('emergencyContactPhone')}
                placeholder="e.g. 98765 43210"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
