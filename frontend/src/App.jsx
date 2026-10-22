
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import AuthLayout from './components/AuthLayout';
import AppLayout from './components/AppLayout';

import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';

import MedicineForm from './components/MedicineForm';
import EditMedicine from './components/EditMedicine';
import WebcamCapture from './components/WebcamCapture';

import Alerts from './components/Alerts';
import Profile from './components/Profile';
import PrescriptionScanner from './components/PrescriptionScanner';
import Assistant from './components/Assistant';

import './App.css';
import './ui-polish.css';

function RootRedirect() {
  const { isAuthenticated } = useAuth();

  return (
    <Navigate
      to={isAuthenticated ? '/dashboard' : '/login'}
      replace
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Home redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public authentication pages */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Protected application pages */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/medicines/new"
                element={<MedicineForm />}
              />

              <Route
                path="/medicines/:id/edit"
                element={<EditMedicine />}
              />

              <Route
                path="/scan"
                element={<PrescriptionScanner />}
              />

              <Route
                path="/assistant"
                element={<Assistant />}
              />

              <Route
                path="/verify"
                element={<WebcamCapture />}
              />

              <Route
                path="/alerts"
                element={<Alerts />}
              />

              <Route
                path="/profile"
                element={<Profile />}
              />
            </Route>
          </Route>

          {/* Unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
