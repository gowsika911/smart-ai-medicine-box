import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

function Dashboard() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/medicines');
      setMedicines(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login first to view your medicines.');
      } else {
        setError(err.response?.data?.error || 'Failed to load medicines.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medicine?')) return;
    try {
      await axiosInstance.delete(`/medicines/${id}`);
      setMedicines((prev) => prev.filter((med) => med._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete medicine.');
    }
  };

  const getStatusClass = (status) => {
    if (status === 'taken') return 'status-taken';
    if (status === 'missed' || status === 'mismatched') return 'status-due';
    return 'status-upcoming';
  };

  if (loading) return <div className="dashboard-container"><p>Loading medicines...</p></div>;

  return (
    <div className="dashboard-container">
      <h2>Today's Medicines</h2>

      {error && <p className="error-text">{error}</p>}

      {!error && medicines.length === 0 && (
        <p>No medicines added yet. Go to "Add Medicine" to create one.</p>
      )}

      <div className="medicine-cards">
        {medicines.map((med) => (
          <div className="medicine-card" key={med._id}>
            <h3>{med.medicineName}</h3>
            <p>Time: {med.doseTime}</p>
            <p>Compartment: {med.compartmentNumber}</p>
            <span className={`status-badge ${getStatusClass(med.status)}`}>
              {med.status}
            </span>
            <button onClick={() => handleDelete(med._id)} className="delete-btn">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
