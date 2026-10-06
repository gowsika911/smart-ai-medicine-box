import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import TimePicker from './TimePicker';

const TOTAL_COMPARTMENTS = 8;

function MedicineForm() {
  const navigate = useNavigate();

  const [medicineName, setMedicineName] = useState('');
  const [doseTime, setDoseTime] = useState('08:00');
  const [compartmentNumber, setCompartmentNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessMsg('');

    if (!medicineName || !doseTime || !compartmentNumber) {
      setApiError('Please fill in the name, time, and select a compartment.');
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post('/medicines', {
        medicineName,
        doseTime,
        compartmentNumber,
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
          <p className="page-subtitle">
            Set the name, the time it should be taken, and which box slot it's loaded in.
          </p>
        </div>
      </header>

      <div className="card-panel form-panel-wide">
        {apiError && <div className="alert-banner">{apiError}</div>}
        {successMsg && <div className="alert-banner alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-row">
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

            <div className="field-group">
              <label htmlFor="med-time">Dose time</label>
              <TimePicker id="med-time" value={doseTime} onChange={setDoseTime} />
            </div>
          </div>

          <div className="compartment-picker-block">
            <label>Which compartment is it loaded in?</label>
            <p className="compartment-hint">
              This is the numbered slot in the physical medicine box. At dose time, that
              slot is what unlocks — so your loved one just opens the one shown, without
              needing to remember which pill goes when.
            </p>

            <div className="compartment-grid">
              {Array.from({ length: TOTAL_COMPARTMENTS }, (_, i) => i + 1).map((num) => (
                <button
                  type="button"
                  key={num}
                  className={`compartment-tile ${compartmentNumber === num ? 'compartment-tile-selected' : ''}`}
                  onClick={() => setCompartmentNumber(num)}
                >
                  {num}
                </button>
              ))}
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
