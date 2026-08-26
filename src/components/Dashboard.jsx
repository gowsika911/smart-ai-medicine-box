function Dashboard() {
  const medicines = [
    { id: 1, name: 'Metformin 500mg', time: '8:00 AM', compartment: 1, status: 'Taken' },
    { id: 2, name: 'Amlodipine 5mg', time: '2:00 PM', compartment: 2, status: 'Due' },
    { id: 3, name: 'Aspirin 75mg', time: '9:00 PM', compartment: 3, status: 'Upcoming' },
  ];

  const getStatusClass = (status) => {
    if (status === 'Taken') return 'status-taken';
    if (status === 'Due') return 'status-due';
    return 'status-upcoming';
  };

  return (
    <div className="dashboard-container">
      <h2>Today's Medicines</h2>
      <div className="medicine-cards">
        {medicines.map((med) => (
          <div className="medicine-card" key={med.id}>
            <h3>{med.name}</h3>
            <p>Time: {med.time}</p>
            <p>Compartment: {med.compartment}</p>
            <span className={`status-badge ${getStatusClass(med.status)}`}>
              {med.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;