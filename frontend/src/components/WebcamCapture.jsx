import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { loadPillModel, interpretPrediction } from '../utils/pillModel';

const MIN_OBJECT_PIXELS = 150;

function getImageData(canvas) {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

function isImageTooDark(data, width, height) {
  let total = 0;
  const pixelCount = width * height;
  for (let i = 0; i < pixelCount; i++) {
    total += (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
  }
  return total / pixelCount < 40;
}

// Estimate the background colour from the image border (pill is placed in the middle).
function estimateBackground(data, width, height) {
  let r = 0, g = 0, b = 0, n = 0;
  const margin = 10;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < margin || x >= width - margin || y < margin || y >= height - margin) {
        const i = (y * width + x) * 4;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

// Separate the pill from the background: any pixel clearly different from the
// background counts as "object". Works for light AND dark pills.
function segmentObject(data, width, height) {
  const bg = estimateBackground(data, width, height);
  const mask = new Uint8Array(width * height);
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let count = 0, rSum = 0, gSum = 0, bSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dist = Math.abs(data[i] - bg.r) + Math.abs(data[i + 1] - bg.g) + Math.abs(data[i + 2] - bg.b);
      if (dist > 90) {
        mask[y * width + x] = 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
        rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
      }
    }
  }

  if (count < MIN_OBJECT_PIXELS) return null;

  return {
    pixelCount: count,
    boxWidth: maxX - minX + 1,
    boxHeight: maxY - minY + 1,
    avgColor: { r: rSum / count, g: gSum / count, b: bSum / count },
  };
}

function detectShape(obj) {
  const fillRatio = obj.pixelCount / (obj.boxWidth * obj.boxHeight);
  const aspectRatio = obj.boxWidth / obj.boxHeight;
  // A filled circle covers ~78% of its bounding box; a rectangle/capsule more.
  const longSide = Math.max(aspectRatio, 1 / aspectRatio);

  if (fillRatio < 0.55) return 'irregular';
  if (longSide < 1.2) return 'circle';
  return 'oval';
}

// Convert an RGB average to one of our named pill colours.
function classifyColor({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min; // "chroma": how far the colour is from grey

  // White/off-white pills have almost no chroma. (HSL saturation is unreliable
  // near white - a tiny tint looks "saturated" - so we use chroma instead.)
  if (d < 0.15 && l > 0.5) return 'white';

  let h;
  if (d === 0) h = 0;
  else if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h = (h * 60 + 360) % 360;

  if (h >= 330 || h < 15) return l > 0.68 ? 'pink' : 'red';
  if (h < 40) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 260) return 'blue';
  return 'pink';
}

function WebcamCapture() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [medicines, setMedicines] = useState([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState(null);
  const [logging, setLogging] = useState(false);
  const [logMessage, setLogMessage] = useState('');
  const [pillModel, setPillModel] = useState(null); // trained AI model, if one is published
  const [modelState, setModelState] = useState('checking'); // checking | ready | none | error

  useEffect(() => {
    startCamera();
    fetchMedicines();
    const videoElement = videoRef.current;
    return () => {
      const stream = videoElement?.srcObject;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded = null;
    const load = async () => {
      try {
        loaded = await loadPillModel();
        if (cancelled) return loaded?.dispose();
        setPillModel(loaded);
        setModelState(loaded ? 'ready' : 'none');
      } catch (err) {
        console.error('Could not load pill model:', err);
        if (!cancelled) setModelState('error'); // falls back to the colour/shape check
      }
    };
    load();
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      if (err.name === 'NotAllowedError') setCameraError('Camera permission denied. Allow camera access to continue.');
      else if (err.name === 'NotFoundError') setCameraError('No camera found on this device.');
      else setCameraError('Camera error: ' + err.message);
    }
  };

  const fetchMedicines = async () => {
    try {
      const response = await axiosInstance.get('/medicines');
      setMedicines(response.data);
      if (response.data.length > 0) setSelectedMedicineId(response.data[0]._id);
    } catch (err) {
      console.error('Failed to load medicines:', err.message);
    }
  };

  const handleCapture = async () => {
    if (!selectedMedicineId) {
      alert('Add a medicine first, then select it here.');
      return;
    }

    const medicine = medicines.find((m) => m._id === selectedMedicineId);
    const expectedColor = medicine?.pillColor || 'white';
    const expectedShape = medicine?.pillShape || 'circle';

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setLogMessage('');

    // 1) Trained AI model (when available)
    if (pillModel) {
      try {
        const predictions = await pillModel.predict(canvas);
        const verdict = interpretPrediction(predictions, medicine?.medicineName || '');
        if (verdict.status === 'match') {
          setResult({ matched: true, message: verdict.message });
          logDose(selectedMedicineId, 'taken');
        } else if (verdict.status === 'mismatch') {
          setResult({ matched: false, message: verdict.message });
          logDose(selectedMedicineId, 'mismatched');
        } else {
          // unsure / no pill: ask the user to retry, do not record anything
          setResult({ matched: false, message: verdict.message });
        }
        return;
      } catch (err) {
        console.error('AI model failed, using colour/shape check:', err);
      }
    }

    // 2) Fallback: simple colour + shape check
    const data = getImageData(canvas);

    if (isImageTooDark(data, canvas.width, canvas.height)) {
      setResult({ matched: false, message: 'Image is too dark. Improve lighting and try again.' });
      return;
    }

    const obj = segmentObject(data, canvas.width, canvas.height);
    if (!obj) {
      setResult({ matched: false, message: 'No pill detected. Place the pill clearly in view on a plain background.' });
      return;
    }

    const detectedShape = detectShape(obj);
    const detectedColor = classifyColor(obj.avgColor);
    const colorMatch = detectedColor === expectedColor;
    const shapeMatch = detectedShape === expectedShape;

    if (colorMatch && shapeMatch) {
      setResult({ matched: true, message: `Pill verified: ${detectedColor} ${detectedShape} matches ${medicine?.medicineName || 'the medicine'}.` });
      logDose(selectedMedicineId, 'taken');
    } else {
      setResult({
        matched: false,
        message: `Pill does not match. Expected ${expectedColor} ${expectedShape}, saw ${detectedColor} ${detectedShape}.`,
      });
      logDose(selectedMedicineId, 'mismatched');
    }
  };

  const logDose = async (medicineId, status) => {
    setLogging(true);
    setLogMessage('');
    try {
      await axiosInstance.post('/doselogs', { medicineId, status });
      setLogMessage(`Dose logged as "${status}".`);
    } catch (err) {
      setLogMessage(err.response?.data?.error || 'Failed to log dose.');
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="verify-page">
      <header className="page-header">
        <div>
          <h1>Verify medicine</h1>
          <p className="page-subtitle">Show the pill to the camera to confirm and log the dose.</p>
          <span className="risk-model-badge" data-testid="verify-mode">
            {modelState === 'ready' && 'AI pill recognition active'}
            {modelState === 'checking' && 'Checking for AI model...'}
            {(modelState === 'none' || modelState === 'error') && 'Colour & shape check'}
          </span>
        </div>
      </header>

      <div className="verify-layout">
        <div className="card-panel camera-panel">
          <div className="camera-frame">
            <video ref={videoRef} autoPlay playsInline />
          </div>
          {cameraError && <div className="alert-banner">{cameraError}</div>}
          <button className="btn-primary btn-block" onClick={handleCapture} disabled={!!cameraError || logging}>
            {logging ? 'Logging...' : 'Capture & verify'}
          </button>
          <canvas ref={canvasRef} width="400" height="300" className="hidden-canvas" />
        </div>

        <div className="card-panel verify-side">
          <div className="field-group">
            <label htmlFor="verify-medicine">Medicine</label>
            <select
              id="verify-medicine"
              value={selectedMedicineId}
              onChange={(e) => setSelectedMedicineId(e.target.value)}
              disabled={medicines.length === 0}
            >
              {medicines.length === 0 && <option>No medicines yet</option>}
              {medicines.map((med) => (
                <option key={med._id} value={med._id}>
                  {med.medicineName} · {med.doseTime}
                </option>
              ))}
            </select>
          </div>

          {result && (
            <div className={`verify-result ${result.matched ? 'verify-success' : 'verify-fail'}`}>
              {result.message}
            </div>
          )}

          {logMessage && <p className="verify-log">{logMessage}</p>}
        </div>
      </div>
    </div>
  );
}

export default WebcamCapture;
