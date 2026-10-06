import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { updateUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/auth/me');
      const profile = response.data;
      setName(profile.name);
      setEmail(profile.email);
      setAge(profile.age ?? '');
      setDoctorName(profile.doctorName || '');
      setPrescriptionNotes(profile.prescriptionNotes || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSaving(true);
    try {
      const response = await axiosInstance.put('/auth/profile', {
        age: age === '' ? undefined : Number(age),
        doctorName,
        prescriptionNotes,
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

  return (
    <div className="form-page">
      <header className="page-header">
        <div>
          <h1>Patient profile</h1>
          <p className="page-subtitle">
            Keep age and doctor details on hand — useful for caregivers and in an emergency.
          </p>
        </div>
      </header>

      <div className="card-panel form-panel-wide">
        {error && <div className="alert-banner">{error}</div>}
        {successMsg && <div className="alert-banner alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
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
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 68"
              />
            </div>
            <div className="field-group">
              <label htmlFor="profile-doctor">Doctor's name</label>
              <input
                id="profile-doctor"
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Ramesh Kumar"
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="profile-prescription">Prescription notes</label>
            <textarea
              id="profile-prescription"
              rows="4"
              value={prescriptionNotes}
              onChange={(e) => setPrescriptionNotes(e.target.value)}
              placeholder="e.g. Metformin 500mg twice daily, Amlodipine 5mg once daily after breakfast"
            />
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
