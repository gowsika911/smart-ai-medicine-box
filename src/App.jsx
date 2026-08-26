import { useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import MedicineForm from './components/MedicineForm';
import './App.css';

function App() {
  const [page, setPage] = useState('login');

  return (
    <div className="app">
      <nav className="navbar">
        <button onClick={() => setPage('login')}>Login</button>
        <button onClick={() => setPage('signup')}>Signup</button>
        <button onClick={() => setPage('dashboard')}>Dashboard</button>
        <button onClick={() => setPage('form')}>Add Medicine</button>
      </nav>

      {page === 'login' && <Login />}
      {page === 'signup' && <Signup />}
      {page === 'dashboard' && <Dashboard />}
      {page === 'form' && <MedicineForm />}
    </div>
  );
}

export default App;