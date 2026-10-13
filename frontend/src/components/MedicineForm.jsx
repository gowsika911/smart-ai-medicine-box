import { useEffect, useState } from 'react';
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
  const [doseTimes, setDoseTimes] = useState(['08:00']);
  const [compartmentNumber, setCompartmentNumber] = useState(null);
  const [pillColor, setPillColor] = useState('white');
  const [pillShape, setPillShape] = useState('circle');
  const [durationDays, setDurationDays] = useState('');
  const [purposeText, setPurposeText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [activeMedicines, setActiveMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load what the patient is already taking, so a duplicate can be stopped before saving.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get('/medicines');
        setActiveMedicines(res.data.filter((m) => !m.completed));
      } catch (err) {
        console.error('Could not load medicines:', err.message);
      }
    };
    load();
  }, []);

  // Ask the server what this medicine is usually for (after a short pause in typing).
  useEffect(() => {
    const name = medicineName.trim();
    if (name.length < 3) return undefined;
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.post('/medicines/purposes', { names: [name] });
        setSuggestion(res.data.purposes[name] || '');
      } catch {
        setSuggestion('');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [medicineName]);

  const shownSuggestion = medicineName.trim().length >= 3 ? suggestion : '';

  const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const duplicate = medicineName.trim()
    ? activeMedicines.find((m) => normalize(m.medicineName) === normalize(medicineName))
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessMsg('');

    if (!medicineName || doseTimes.length === 0 || !compartmentNumber) {
      setApiError('Please fill in the name, time, and select a compartment.');
      return;
    }
    if (duplicate) {
      setApiError(`${duplicate.medicineName} is already in your list.`);
      return;
    }
    if (new Set(doseTimes).size !== doseTimes.length) {
      setApiError('Two dose times are the same. Change or remove one.');
      return;
    }
    if (durationDays !== '' && (!Number.isInteger(Number(durationDays)) || Number(durationDays) < 1 || Number(durationDays) > 365)) {
      setApiError('Course length must be 1 to 365 days, or leave it empty.');
      return;
    }

    setLoading(true);
    try {
      const course = durationDays === '' ? undefined : Number(durationDays);
      if (doseTimes.length === 1) {
        await axiosInstance.post('/medicines', {
          medicineName,
          doseTime: doseTimes[0],
          compartmentNumber,
          pillColor,
          pillShape,
          purpose: purposeText.trim() || undefined,
          durationDays: course,
        });
      } else {
        // Same medicine taken at several times a day: one entry per dose time.
        await axiosInstance.post('/medicines/bulk', {
          medicines: doseTimes.map((time) => ({
            medicineName,
            doseTime: time,
            compartmentNumber,
            pillColor,
            pillShape,
            purpose: purposeText.trim() || undefined,
            durationDays: course,
          })),
        });
      }

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
              {duplicate && (
                <p className="field-warning" role="alert">
                  {duplicate.medicineName} is already in your list. Remove it first, or add it again
                  after its course ends.
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor="med-time">Dose time{doseTimes.length > 1 ? 's' : ''}</label>
              {doseTimes.map((time, i) => (
                <div className="time-row" key={i}>
                  <TimePicker
                    id={i === 0 ? 'med-time' : `med-time-${i}`}
                    value={time}
                    onChange={(v) => setDoseTimes((prev) => prev.map((t, j) => (j === i ? v : t)))}
                  />
                  {doseTimes.length > 1 && (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => setDoseTimes((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn-link"
                id="add-time"
                onClick={() => setDoseTimes((prev) => [...prev, '21:00'])}
                disabled={doseTimes.length >= 6}
              >
                + Add another time (for medicines taken more than once a day)
              </button>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="med-purpose">What is it for? (optional)</label>
            <input
              id="med-purpose"
              type="text"
              maxLength={100}
              value={purposeText}
              onChange={(e) => setPurposeText(e.target.value)}
              placeholder={shownSuggestion || 'e.g. For blood pressure'}
            />
            {shownSuggestion && !purposeText && (
              <p className="compartment-hint" data-testid="purpose-suggestion">
                Suggested: {shownSuggestion}. Leave empty to use this, or type your own.
              </p>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="med-duration">Course length in days (optional)</label>
            <input
              id="med-duration"
              type="number"
              min="1"
              max="365"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="e.g. 30 - leave empty if it is ongoing"
            />
            <p className="compartment-hint">
              When the course ends, the medicine moves to "Completed" and can be added again.
            </p>
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

          <button type="submit" className="btn-primary" disabled={loading || Boolean(duplicate)}>
            {loading ? 'Adding...' : 'Add medicine'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MedicineForm;
