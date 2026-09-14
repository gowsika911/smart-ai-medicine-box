import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="brand-mark">
            <BrandIllustration />
          </div>
          <h1 className="brand-title">MedBox</h1>
          <p className="brand-tagline">
            Right dose, right time, right pill — verified automatically,
            so families can worry less.
          </p>
          <ul className="brand-points">
            <li>Scheduled dosage tracking per compartment</li>
            <li>Webcam pill verification before it's logged</li>
            <li>Live compliance score for caregivers</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-panel">
        <Outlet />
      </div>
    </div>
  );
}

function BrandIllustration() {
  return (
    <svg viewBox="0 0 120 120" width="64" height="64" fill="none">
      <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="3" opacity="0.35" />
      <path
        d="M40 60 L54 74 L82 46"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="60" r="4" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export default AuthLayout;
