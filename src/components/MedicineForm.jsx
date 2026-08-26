import { useState } from 'react';

function MedicineForm() {
  const [medicineName, setMedicineName] = useState('');
  const [doseTime, setDoseTime] = useState('');
  const [compartment, setCompartment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Medicine added:', { medicineName, doseTime, compartment });
    // Reset form
    setMedicineName('');
    setDoseTime('');
    setCompartment('');
  };

  return (
    <div className="form-container">
      <h2>Add New Medicine</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Medicine Name</label>
          <input
            type="text"
            value={medicineName}
            onChange={(e) => setMedicineName(e.target.value)}
            placeholder="e.g. Metformin"
            required
          />
        </div>

        <div className="form-group">
          <label>Dose Time</label>
          <input
            type="time"
            value={doseTime}
            onChange={(e) => setDoseTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Compartment Number</label>
          <input
            type="number"
            value={compartment}
            onChange={(e) => setCompartment(e.target.value)}
            placeholder="e.g. 1"
            required
          />
        </div>

        <button type="submit">Add Medicine</button>
      </form>
    </div>
  );
}

export default MedicineForm;