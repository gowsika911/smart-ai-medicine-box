import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import TimePicker from './TimePicker';

const TOTAL_COMPARTMENTS = 8;
const PILL_COLORS = ['white', 'red', 'orange', 'yellow', 'green', 'blue', 'pink'];

const normalize = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const formatTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

function EditMedicine() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState(null);
  const [siblings, setSiblings] = useState([]); // all dose times of the same medicine
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [doseTime, setDoseTime] = useState('08:00');
  const [compartment, setCompartment] = useState(null);
  const [pillColor, setPillColor] = useState('white');
  const [pillShape, setPillShape] = useState('circle');
  const [durationDays, setDurationDays] = useState('');
  const [newTime, setNewTime] = useState('21:00');

  const load = async () => {
    setError('');
    try {
      const res = await axiosInstance.get('/medicines');
      const current = res.data.find((m) => m._id === id);
      if (!current) {
        setError('That medicine was not found. It may have been removed.');
        setMedicine(null);
        return;
      }
      setMedicine(current);
      setSiblings(
        res.data
          .filter((m) => !m.completed && normalize(m.medicineName) === normalize(current.medicineName))
          .sort((a, b) => a.doseTime.localeCompare(b.doseTime))
      );
      setName(current.medicineName);
      setDoseTime(current.doseTime);
      setCompartment(current.compartmentNumber);
      setPillColor(current.pillColor || 'white');
      setPillShape(current.pillShape || 'circle');
      setDurationDays(current.durationDays ? String(current.durationDays) : '');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the medicine.');
    }
  };

  useEffect(() => {
    const run = async () => {
      await load();
      setLoading(false);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!name.trim()) return setError('The medicine needs a name.');
    if (!compartment) return setError('Choose a compartment.');
    if (durationDays !== '' && (!Number.isInteger(Number(durationDays)) || Number(durationDays) < 1 || Number(durationDays) > 365)) {
      return setError('Course length must be 1 to 365 days, or leave it empty.');
    }

    setSaving(true);
    try {
      await axiosInstance.put(`/medicines/${id}`, {
        medicineName: name.trim(),
        doseTime,
        compartmentNumber: compartment,
        pillColor,
        pillShape,
        durationDays: durationDays === '' ? '' : Number(durationDays),
      });
      setMessage('Changes saved.');
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTime = async () => {
    setError('');
    setMessage('');
    try {
      await axiosInstance.post(`/medicines/${id}/times`, { doseTime: newTime });
      setMessage(`Added a dose at ${formatTime(newTime)}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add that time.');
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="form-page">
      <header className="page-header">
        <div>
          <h1>Edit medicine</h1>
          <p className="page-subtitle">Change the details, or add another time it is taken each day.</p>
        </div>
      </header>

      <div className="card-panel form-panel-wide">
        {error && <div className="alert-banner">{error}</div>}
        {message && <div className="alert-banner alert-success">{message}</div>}

        {!medicine ? (
          <Link to="/dashboard" className="btn-secondary">Back to dashboard</Link>
        ) : (
          <form onSubmit={handleSave} noValidate>
            <div className="field-row">
              <div className="field-group">
                <label htmlFor="edit-name">Medicine name</label>
                <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field-group">
                <label htmlFor="edit-time">This dose time</label>
                <TimePicker id="edit-time" value={doseTime} onChange={setDoseTime} />
              </div>
            </div>

            <div className="field-group">
              <label>All dose times for this medicine</label>
              <div className="sibling-chips" data-testid="dose-times">
                {siblings.map((m) => (
                  <span key={m._id} className={`scan-tag ${m._id === id ? 'chip-current' : ''}`}>
                    {formatTime(m.doseTime)}{m._id === id ? ' (editing)' : ''}
                  </span>
                ))}
              </div>
              <div className="time-row">
                <TimePicker id="edit-new-time" value={newTime} onChange={setNewTime} />
                <button type="button" id="add-dose-time" className="btn-secondary" onClick={handleAddTime}>
                  Add this time
                </button>
              </div>
              <p className="compartment-hint">
                Name, compartment, pill look and course length are shared by all dose times of this medicine.
              </p>
            </div>

            <div className="field-group">
              <label htmlFor="edit-duration">Course length in days (optional)</label>
              <input
                id="edit-duration"
                type="number"
                min="1"
                max="365"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="leave empty if it is ongoing"
              />
              <p className="compartment-hint">
                Saving a number counts the course from today. Empty means it continues until you remove it.
              </p>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label htmlFor="edit-color">Pill color</label>
                <select id="edit-color" value={pillColor} onChange={(e) => setPillColor(e.target.value)}>
                  {PILL_COLORS.map((c) => (
                    <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="edit-shape">Pill shape</label>
                <select id="edit-shape" value={pillShape} onChange={(e) => setPillShape(e.target.value)}>
                  <option value="circle">Round (circle)</option>
                  <option value="oval">Oval / capsule</option>
                </select>
              </div>
            </div>

            <div className="compartment-picker-block">
              <label>Compartment</label>
              <div className="compartment-grid">
                {Array.from({ length: TOTAL_COMPARTMENTS }, (_, i) => i + 1).map((num) => (
                  <button
                    type="button"
                    key={num}
                    className={`compartment-tile ${compartment === num ? 'compartment-tile-selected' : ''}`}
                    onClick={() => setCompartment(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <Link to="/dashboard" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EditMedicine;
