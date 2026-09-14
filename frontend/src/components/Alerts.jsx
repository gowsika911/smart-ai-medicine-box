import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/alerts');
      setAlerts(response.data.alerts);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="alerts-page">
      <header className="page-header">
        <div>
          <h1>Alerts</h1>
          <p className="page-subtitle">Missed, mismatched, or duplicate dose events.</p>
        </div>
      </header>

      {error && <div className="alert-banner">{error}</div>}

      {!error && alerts.length === 0 && (
        <div className="empty-state">
          <p>No alerts right now. Everything is on track.</p>
        </div>
      )}

      <div className="alert-list">
        {alerts.map((alert) => (
          <div className="alert-row" key={alert.id} data-severity={alert.severity}>
            <span className="alert-compartment">{alert.compartmentNumber ?? '?'}</span>
            <div className="alert-body">
              <strong>{alert.medicineName}</strong>
              <span className="alert-type">{alert.type} · scheduled {alert.scheduledTime}</span>
            </div>
            <span className="alert-time">{formatTime(alert.occurredAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Alerts;
