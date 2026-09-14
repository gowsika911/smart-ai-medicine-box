import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

const EXPECTED_COLOR_MIN = { r: 150, g: 0, b: 0 };
const EXPECTED_COLOR_MAX = { r: 255, g: 80, b: 80 };
const EXPECTED_SHAPE = 'circle';

function getAverageColor(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;

  let rTotal = 0, gTotal = 0, bTotal = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    rTotal += data[i];
    gTotal += data[i + 1];
    bTotal += data[i + 2];
  }

  return {
    r: Math.round(rTotal / pixelCount),
    g: Math.round(gTotal / pixelCount),
    b: Math.round(bTotal / pixelCount),
  };
}

function isColorInRange(color, min, max) {
  return (
    color.r >= min.r && color.r <= max.r &&
    color.g >= min.g && color.g <= max.g &&
    color.b >= min.b && color.b <= max.b
  );
}

function isImageTooDark(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;

  let total = 0;
  const pixelCount = width * height;
  for (let i = 0; i < pixelCount; i++) {
    total += (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
  }
  return total / pixelCount < 40;
}

function detectShape(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;

  const threshold = 100;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const brightness = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    mask[i] = brightness > threshold ? 1 : 0;
  }

  let minX = width, maxX = 0, minY = height, maxY = 0, pixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        pixelCount++;
      }
    }
  }

  if (pixelCount < 50) return 'no-object-detected';

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const fillRatio = pixelCount / (boxWidth * boxHeight);
  const aspectRatio = boxWidth / boxHeight;

  if (fillRatio > 0.75 && aspectRatio > 0.85 && aspectRatio < 1.15) return 'circle';
  if (fillRatio > 0.6 && (aspectRatio <= 0.85 || aspectRatio >= 1.15)) return 'oval';
  return 'irregular';
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

  useEffect(() => {
    startCamera();
    fetchMedicines();
    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((track) => track.stop());
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

  const handleCapture = () => {
    if (!selectedMedicineId) {
      alert('Add a medicine first, then select it here.');
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setLogMessage('');

    if (isImageTooDark(canvas)) {
      setResult({ matched: false, message: 'Image is too dark. Improve lighting and try again.' });
      return;
    }

    const detectedShape = detectShape(canvas);
    if (detectedShape === 'no-object-detected') {
      setResult({ matched: false, message: 'No pill detected. Place the pill clearly in view.' });
      return;
    }

    const avgColor = getAverageColor(canvas);
    const colorMatch = isColorInRange(avgColor, EXPECTED_COLOR_MIN, EXPECTED_COLOR_MAX);
    const shapeMatch = detectedShape === EXPECTED_SHAPE;

    if (colorMatch && shapeMatch) {
      setResult({ matched: true, message: 'Pill verified successfully.' });
      logDose(selectedMedicineId, 'taken');
    } else {
      setResult({ matched: false, message: 'Pill does not match expected color or shape.' });
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
