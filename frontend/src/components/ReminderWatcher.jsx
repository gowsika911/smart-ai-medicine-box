import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const POLL_INTERVAL_MS = 20000; // check schedule every 20 seconds
const REBEEP_INTERVAL_MS = 20000; // re-alert every 20 seconds while unacknowledged

function currentHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// Plays a short 3-beep alert tone using the Web Audio API.
// No audio file needed, so it works offline and needs no asset hosting.
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    [0, 260, 520].forEach((delay) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.15;
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + delay / 1000;
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.18);
    });

    setTimeout(() => ctx.close(), 1000);
  } catch (err) {
    console.error('Could not play reminder sound:', err.message);
  }
}

function ReminderWatcher() {
  const navigate = useNavigate();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const firedTodayRef = useRef(new Set());

  useEffect(() => {
    const checkSchedule = async () => {
      try {
        const response = await axiosInstance.get('/medicines');
        const medicines = response.data;
        const nowHHMM = currentHHMM();
        const today = todayString();

        medicines.forEach((med) => {
          const fireKey = `${med._id}-${today}`;
          if (
            med.status === 'pending' &&
            med.doseTime === nowHHMM &&
            !firedTodayRef.current.has(fireKey)
          ) {
            firedTodayRef.current.add(fireKey);
            setActiveAlerts((prev) => [...prev, med]);
          }
        });
      } catch (err) {
        // Silent fail — reminders are a convenience layer, not critical path.
        console.error('Reminder check failed:', err.message);
      }
    };

    checkSchedule();
    const pollId = setInterval(checkSchedule, POLL_INTERVAL_MS);
    return () => clearInterval(pollId);
  }, []);

  useEffect(() => {
    if (activeAlerts.length === 0) return undefined;

    playBeep();
    const beepId = setInterval(playBeep, REBEEP_INTERVAL_MS);
    return () => clearInterval(beepId);
  }, [activeAlerts.length]);

  const dismiss = (medicineId) => {
    setActiveAlerts((prev) => prev.filter((med) => med._id !== medicineId));
  };

  const verifyNow = (medicineId) => {
    dismiss(medicineId);
    navigate('/verify');
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="reminder-stack">
      {activeAlerts.map((med) => (
        <div className="reminder-banner" key={med._id}>
          <div className="reminder-text">
            <strong>Time to take {med.medicineName}</strong>
            <span>Compartment {med.compartmentNumber} · scheduled {med.doseTime}</span>
          </div>
          <div className="reminder-actions">
            <button className="btn-primary" onClick={() => verifyNow(med._id)}>Verify now</button>
            <button className="btn-secondary" onClick={() => dismiss(med._id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReminderWatcher;
