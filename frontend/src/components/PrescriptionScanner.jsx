import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import TimePicker from './TimePicker';
import { parsePrescription } from '../utils/prescriptionParser';

const TOTAL_COMPARTMENTS = 8;
const MAX_IMAGE_WIDTH = 1800;

const PILL_COLORS = ['white', 'red', 'orange', 'yellow', 'green', 'blue', 'pink'];

// Load the photo, scale it, convert to high-contrast grayscale - this makes OCR
// noticeably more accurate on phone photos with uneven lighting.
function preprocessImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      let min = 255;
      let max = 0;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = gray;
        if (gray < min) min = gray;
        if (gray > max) max = gray;
      }
      const range = Math.max(1, max - min);
      for (let i = 0; i < d.length; i += 4) {
        const v = ((d[i] - min) / range) * 255;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);

      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image. Try a JPG or PNG photo.'));
    };
    img.src = url;
  });
}

const normalizeName = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function buildRows(parsed, activeMedicines) {
  const used = new Set(activeMedicines.map((m) => m.compartmentNumber));
  const activeNames = new Set(activeMedicines.map((m) => normalizeName(m.medicineName)));
  const rows = [];

  parsed.forEach((med, medIndex) => {
    let compartment = null;
    for (let n = 1; n <= TOTAL_COMPARTMENTS; n++) {
      if (!used.has(n)) {
        compartment = n;
        used.add(n);
        break;
      }
    }

    const times = med.times.length ? med.times : ['08:00'];
    times.forEach((time, i) => {
      rows.push({
        key: `${medIndex}-${i}`,
        include: !med.skipReason && !activeNames.has(normalizeName(med.name)),
        name: med.name,
        doseTime: time,
        compartment,
        pillColor: 'white',
        pillShape: 'circle',
        durationDays: med.durationDays ? String(med.durationDays) : '',
        purpose: '',
        originalName: med.name,
        note: med.note,
        assumed: med.assumed,
        skipReason: med.skipReason,
      });
    });
  });

  return rows;
}

function PrescriptionScanner() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [existingMedicines, setExistingMedicines] = useState([]);
  const [suggestions, setSuggestions] = useState({}); // name -> usual use
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [rawText, setRawText] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await axiosInstance.get('/medicines');
        setExistingMedicines(res.data);
      } catch (err) {
        console.error('Could not load existing medicines:', err.message);
      }
    };
    loadExisting();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Medicines the patient is taking right now (finished courses don't count).
  const activeMedicines = existingMedicines.filter((m) => !m.completed);
  const activeNames = new Set(activeMedicines.map((m) => normalizeName(m.medicineName)));
  const isBlocked = (row) => activeNames.has(normalizeName(row.name));

  const updateRow = (key, changes) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG or PNG).');
      return;
    }

    setError('');
    setSaveMsg('');
    setRows(null);
    setRawText('');
    setConfidence(null);
    setProgress(0);
    setPreviewUrl(URL.createObjectURL(file));
    setScanning(true);
    setStatusText('Preparing image...');

    let worker;
    try {
      const canvas = await preprocessImage(file);

      // Loaded on demand so the OCR engine (large) is only downloaded when used.
      const { createWorker } = await import('tesseract.js');
      setStatusText('Loading text reader (first time takes a few seconds)...');

      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setStatusText('Reading prescription...');
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data } = await worker.recognize(canvas);
      setRawText(data.text);
      setConfidence(Math.round(data.confidence));

      const parsed = parsePrescription(data.text);
      if (parsed.length === 0) {
        setError(
          'No medicines found. Use a clear, well-lit photo of a printed prescription, or add medicines manually.'
        );
      } else {
        setRows(buildRows(parsed, activeMedicines));
        try {
          const names = [...new Set(parsed.map((p) => p.name))];
          const res = await axiosInstance.post('/medicines/purposes', { names });
          setSuggestions(res.data.purposes || {});
        } catch {
          setSuggestions({}); // the suggestions are a bonus; scanning still works without them
        }
      }
    } catch (err) {
      setError(err.message || 'Scanning failed. Check your internet connection and try again.');
    } finally {
      if (worker) await worker.terminate();
      setScanning(false);
      setStatusText('');
    }
  };

  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  const selected = rows ? rows.filter((r) => r.include && !isBlocked(r)) : [];

  const handleSave = async () => {
    setError('');
    setSaveMsg('');

    for (const r of selected) {
      if (!r.name.trim()) return setError('Every selected medicine needs a name.');
      if (!r.compartment) return setError(`Choose a compartment for ${r.name}.`);
      if (r.durationDays !== '' && (!Number.isInteger(Number(r.durationDays)) || Number(r.durationDays) < 1 || Number(r.durationDays) > 365)) {
        return setError(`Course length for ${r.name} must be 1 to 365 days (or leave it empty).`);
      }
    }
    if (selected.length === 0) return setError('Tick at least one medicine to add.');

    setSaving(true);
    try {
      await axiosInstance.post('/medicines/bulk', {
        medicines: selected.map((r) => ({
          medicineName: r.name.trim(),
          doseTime: r.doseTime,
          compartmentNumber: Number(r.compartment),
          pillColor: r.pillColor,
          pillShape: r.pillShape,
          purpose: r.purpose.trim() || undefined,
          durationDays: r.durationDays === '' ? undefined : Number(r.durationDays),
        })),
      });
      setSaveMsg(`${selected.length} medicine${selected.length === 1 ? '' : 's'} added.`);
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add the medicines.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-page">
      <header className="page-header">
        <div>
          <h1>Scan prescription</h1>
          <p className="page-subtitle">
            Take a photo of a printed prescription and MedBox reads the medicines and dose times for you.
          </p>
        </div>
      </header>

      <div className="card-panel form-panel-wide">
        {error && <div className="alert-banner">{error}</div>}
        {saveMsg && <div className="alert-banner alert-success">{saveMsg}</div>}

        <div className="scan-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="scan-file-input"
            disabled={scanning}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : rows || rawText ? 'Scan another' : 'Choose or take a photo'}
          </button>
          <p className="compartment-hint">
            Works best on printed prescriptions with good light. Handwriting is often unreadable.
            Your photo is read inside your browser and is not uploaded anywhere.
          </p>
        </div>

        {scanning && (
          <div className="scan-progress">
            <div className="scan-progress-bar">
              <div className="scan-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{statusText} {progress > 0 ? `${progress}%` : ''}</span>
          </div>
        )}

        {previewUrl && <img src={previewUrl} alt="Prescription preview" className="scan-preview" />}

        {rows && (
          <>
            <h2 className="profile-section-title">Check what was found</h2>
            <div className="alert-banner scan-warning">
              Text scanning can make mistakes. Compare each row with the prescription and fix
              anything wrong before adding.
              {confidence !== null && confidence < 75 && ' The photo quality looks low, so double-check everything.'}
            </div>

            <div className="scan-rows">
              {rows.map((r) => (
                <div className={`scan-row ${r.include && !isBlocked(r) ? '' : 'scan-row-off'}`} key={r.key}>
                  <label className="scan-check">
                    <input
                      type="checkbox"
                      checked={r.include && !isBlocked(r)}
                      disabled={isBlocked(r)}
                      onChange={(e) => updateRow(r.key, { include: e.target.checked })}
                    />
                    <span>Add</span>
                  </label>

                  <div className="scan-fields">
                    <div className="field-row">
                      <div className="field-group">
                        <label>Medicine</label>
                        <input
                          type="text"
                          value={r.name}
                          onChange={(e) => updateRow(r.key, { name: e.target.value })}
                        />
                      </div>
                      <div className="field-group">
                        <label>Dose time</label>
                        <TimePicker value={r.doseTime} onChange={(v) => updateRow(r.key, { doseTime: v })} />
                      </div>
                    </div>

                    <div className="field-row">
                      <div className="field-group">
                        <label>Compartment</label>
                        <select
                          value={r.compartment ?? ''}
                          onChange={(e) => updateRow(r.key, { compartment: e.target.value ? Number(e.target.value) : null })}
                        >
                          <option value="">Choose</option>
                          {Array.from({ length: TOTAL_COMPARTMENTS }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group">
                        <label>Pill color</label>
                        <select value={r.pillColor} onChange={(e) => updateRow(r.key, { pillColor: e.target.value })}>
                          {PILL_COLORS.map((c) => (
                            <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field-group">
                        <label>Pill shape</label>
                        <select value={r.pillShape} onChange={(e) => updateRow(r.key, { pillShape: e.target.value })}>
                          <option value="circle">Round</option>
                          <option value="oval">Oval / capsule</option>
                        </select>
                      </div>
                      <div className="field-group">
                        <label>Course (days)</label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="ongoing"
                          value={r.durationDays}
                          onChange={(e) => updateRow(r.key, { durationDays: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label>What is it for? (optional)</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={r.purpose}
                        placeholder={(r.name === r.originalName && suggestions[r.originalName]) || 'e.g. For blood pressure'}
                        onChange={(e) => updateRow(r.key, { purpose: e.target.value })}
                      />
                    </div>

                    <div className="scan-tags">
                      {!r.purpose && r.name === r.originalName && suggestions[r.originalName] && (
                        <span className="scan-tag" data-testid="scan-purpose">Used for: {suggestions[r.originalName]}</span>
                      )}
                      {r.note && <span className="scan-tag">{r.note}</span>}
                      {r.assumed && <span className="scan-tag scan-tag-warn">No schedule found, guessed 8:00 AM</span>}
                      {r.skipReason && <span className="scan-tag scan-tag-warn">{r.skipReason}</span>}
                      {isBlocked(r) && (
                        <span className="scan-tag scan-tag-warn">
                          Already in your list. Remove it first, or add it after its course ends.
                        </span>
                      )}
                    </div>
                  </div>

                  <button type="button" className="card-delete" onClick={() => removeRow(r.key)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || selected.length === 0}>
              {saving ? 'Adding...' : `Add ${selected.length} to my medicines`}
            </button>
          </>
        )}

        {rawText && (
          <details className="scan-raw">
            <summary>Show the text that was read{confidence !== null ? ` (confidence ${confidence}%)` : ''}</summary>
            <pre>{rawText}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default PrescriptionScanner;
