import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import TimePicker from './TimePicker';

const TOTAL_COMPARTMENTS = 8;

const PILL_COLORS = [
  { value: 'white', label: 'White', css: '#f5f5f5' },
  { value: 'red', label: 'Red', css: '#d32f2f' },
  { value: 'orange', label: 'Orange', css: '#f57c00' },
  { value: 'yellow', label: 'Yellow', css: '#fbc02d' },
  { value: 'green', label: 'Green', css: '#388e3c' },
  { value: 'blue', label: 'Blue', css: '#1976d2' },
  { value: 'pink', label: 'Pink', css: '#f48fb1' },
];

function MedicineForm() {
  const navigate = useNavigate();

  const [medicineName, setMedicineName] = useState('');
  const [doseTime, setDoseTime] = useState('08:00');
  const [compartmentNumber, setCompartmentNumber] = useState(null);
  const [pillColor, setPillColor] = useState('white');
  const [pillShape, setPillShape] = useState('circle');
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
        pillColor,
        pillShape,
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

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="pill-color">Pill color</label>
              <select id="pill-color" value={pillColor} onChange={(e) => setPillColor(e.target.value)}>
                {PILL_COLORS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="pill-shape">Pill shape</label>
              <select id="pill-shape" value={pillShape} onChange={(e) => setPillShape(e.target.value)}>
                <option value="circle">Round (circle)</option>
                <option value="oval">Oval / capsule</option>
              </select>
            </div>
          </div>
          <p className="compartment-hint">
            The webcam check compares the pill you show against this color and shape.
          </p>

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
