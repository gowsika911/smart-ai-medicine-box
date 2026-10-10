import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function ComplianceRing({ score, riskLevel }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const filled = circumference - (score / 100) * circumference;
    const timer = setTimeout(() => setOffset(filled), 80);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  const ringColor =
    riskLevel === 'Low' ? 'var(--color-success)' :
    riskLevel === 'Medium' ? 'var(--color-warning)' :
    'var(--color-danger)';

  return (
    <div className="compliance-ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} className="ring-track" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          className="ring-progress"
          style={{
            stroke: ringColor,
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="compliance-ring-label">
        <span className="compliance-score">{score}</span>
        <span className="compliance-max">out of 100</span>
      </div>
    </div>
  );
}

function RiskPanel({ risk }) {
  if (!risk) return null;

  const usingModel = risk.model === 'logistic-regression';

  return (
    <section className="risk-panel">
      <div className="risk-panel-header">
        <h2>AI missed-dose prediction</h2>
        <span className="risk-model-badge">
          {usingModel ? `Learned from ${risk.trainedOn} past doses` : 'Basic estimate'}
        </span>
      </div>
      {risk.note && <p className="risk-note">{risk.note}</p>}

      {risk.predictions.length === 0 && (
        <p className="risk-note">Add a medicine to see predictions.</p>
      )}

      <div className="risk-list">
        {risk.predictions.map((p) => (
          <div className="risk-row" key={p.medicineId}>
            <div className="risk-row-top">
              <div>
                <strong>{p.medicineName}</strong>
                <span className="risk-time"> · next dose {p.doseTime}</span>
              </div>
              <span className="risk-level" data-level={p.level}>
                {Math.round(p.probability * 100)}% · {p.level}
              </span>
            </div>
            <div className="risk-bar">
              <div
                className="risk-bar-fill"
                data-level={p.level}
                style={{ width: `${Math.max(3, Math.round(p.probability * 100))}%` }}
              />
            </div>
            {p.reasons.length > 0 && <p className="risk-reason">Why: {p.reasons.join('; ')}</p>}
          </div>
        ))}
      </div>
      <p className="risk-footnote">
        Chance of missing the next dose, predicted from this patient's own dose history
        (time of day, weekday vs weekend, recent misses). It is a guide, not medical advice.
      </p>
    </section>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [medRes, compRes] = await Promise.all([
        axiosInstance.get('/medicines'),
        axiosInstance.get('/compliance'),
      ]);
      setMedicines(medRes.data);
      setCompliance(compRes.data);

      // The prediction is a bonus - never let it break the rest of the dashboard.
      try {
        const riskRes = await axiosInstance.get('/risk');
        setRisk(riskRes.data);
      } catch (riskErr) {
        console.error('Risk prediction unavailable:', riskErr.message);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this medicine?')) return;
    try {
      await axiosInstance.delete(`/medicines/${id}`);
      setMedicines((prev) => prev.filter((med) => med._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete medicine.');
    }
  };

  const statusClass = (status) => {
    if (status === 'taken') return 'status-taken';
    if (status === 'missed' || status === 'mismatched') return 'status-missed';
    return 'status-pending';
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>{greeting()}, {user?.name || 'there'}</h1>
          <p className="page-subtitle">Here's how today's dosage schedule is tracking.</p>
        </div>
        <Link to="/medicines/new" className="btn-primary">+ Add medicine</Link>
      </header>

      {error && <div className="alert-banner">{error}</div>}

      {compliance && (
        <section className="compliance-panel">
          <ComplianceRing score={compliance.score} riskLevel={compliance.riskLevel} />
          <div className="compliance-details">
            <div className="risk-pill" data-risk={compliance.riskLevel}>
              {compliance.riskLevel} risk
            </div>
            <div className="compliance-stats">
              <div className="stat-tile">
                <span className="stat-value">{compliance.totalDoses}</span>
                <span className="stat-label">Total doses</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{compliance.takenCount}</span>
                <span className="stat-label">Taken</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{compliance.missedCount}</span>
                <span className="stat-label">Missed</span>
              </div>
              <div className="stat-tile">
                <span className="stat-value">{compliance.avgDelayMinutes}m</span>
                <span className="stat-label">Avg delay</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <RiskPanel risk={risk} />

      <section className="medicines-section">
        <h2>Today's medicines</h2>

        {medicines.filter((m) => !m.completed).length === 0 && (
          <div className="empty-state">
            <p>No medicines added yet.</p>
            <Link to="/medicines/new" className="btn-secondary">Add your first medicine</Link>
          </div>
        )}

        <div className="medicine-grid">
          {medicines.filter((m) => !m.completed).map((med) => (
            <div className="medicine-card" key={med._id} data-status={med.status}>
              <div className="medicine-card-top">
                <span className="compartment-badge">{med.compartmentNumber}</span>
                <span className={`status-pill ${statusClass(med.status)}`}>{med.status}</span>
              </div>
              <h3>{med.medicineName}</h3>
              <p className="medicine-time">Scheduled {med.doseTime}</p>
              {med.endDate && (
                <p className="medicine-ends">Course ends {new Date(med.endDate).toLocaleDateString()}</p>
              )}
              <button className="card-delete" onClick={() => handleDelete(med._id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {medicines.some((m) => m.completed) && (
        <section className="medicines-section completed-section">
          <h2>Completed courses</h2>
          <p className="risk-note">
            These courses have ended, so they are no longer tracked. You can add the same medicine again.
          </p>
          <div className="medicine-grid">
            {medicines.filter((m) => m.completed).map((med) => (
              <div className="medicine-card medicine-card-done" key={med._id}>
                <div className="medicine-card-top">
                  <span className="compartment-badge">{med.compartmentNumber}</span>
                  <span className="status-pill">completed</span>
                </div>
                <h3>{med.medicineName}</h3>
                <p className="medicine-time">Ended {new Date(med.endDate).toLocaleDateString()}</p>
                <button className="card-delete" onClick={() => handleDelete(med._id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
