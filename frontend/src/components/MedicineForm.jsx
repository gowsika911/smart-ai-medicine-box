import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

function MedicineForm() {
  const [medicineName, setMedicineName] = useState('');
  const [doseTime, setDoseTime] = useState('');
  const [compartmentNumber, setCompartmentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessMsg('');

    if (!medicineName || !doseTime || !compartmentNumber) {
      setApiError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/medicines', {
        medicineName,
        doseTime,
        compartmentNumber: Number(compartmentNumber),
      });

      setSuccessMsg('Medicine added successfully!');
      setMedicineName('');
      setDoseTime('');
      setCompartmentNumber('');
    } catch (err) {
      if (err.response?.status === 401) {
        setApiError('Please login first to add a medicine.');
      } else {
        setApiError(err.response?.data?.error || 'Failed to add medicine.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Add New Medicine</h2>

      {apiError && <p className="error-text">{apiError}</p>}
      {successMsg && <p className="success-text">{successMsg}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Medicine Name</label>
          <input
            type="text"
            value={medicineName}
            onChange={(e) => setMedicineName(e.target.value)}
            placeholder="e.g. Metformin"
            required
          />
        </div>

        <div className="form-group">
          <label>Dose Time</label>
          <input
            type="time"
            value={doseTime}
            onChange={(e) => setDoseTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Compartment Number</label>
          <input
            type="number"
            value={compartmentNumber}
            onChange={(e) => setCompartmentNumber(e.target.value)}
            placeholder="e.g. 1"
            min="1"
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Medicine'}
        </button>
      </form>
    </div>
  );
}

export default MedicineForm;
