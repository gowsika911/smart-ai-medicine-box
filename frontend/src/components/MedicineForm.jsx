import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function MedicineForm() {
  const navigate = useNavigate();

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

      setSuccessMsg('Medicine added successfully.');
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to add medicine.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <header className="page-header">
        <div>
          <h1>Add a medicine</h1>
          <p className="page-subtitle">Assign it to a compartment and set the daily dose time.</p>
        </div>
      </header>

      <div className="card-panel form-panel">
        {apiError && <div className="alert-banner">{apiError}</div>}
        {successMsg && <div className="alert-banner alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="med-name">Medicine name</label>
            <input
              id="med-name"
              type="text"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="e.g. Metformin 500mg"
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="med-time">Dose time</label>
              <input
                id="med-time"
                type="time"
                value={doseTime}
                onChange={(e) => setDoseTime(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="med-compartment">Compartment number</label>
              <input
                id="med-compartment"
                type="number"
                min="1"
                value={compartmentNumber}
                onChange={(e) => setCompartmentNumber(e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add medicine'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MedicineForm;
