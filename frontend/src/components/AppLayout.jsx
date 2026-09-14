import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.trim().split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-dot" />
          MedBox
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="sidebar-link">
            <IconGrid />
            Dashboard
          </NavLink>
          <NavLink to="/medicines/new" className="sidebar-link">
            <IconPlus />
            Add Medicine
          </NavLink>
          <NavLink to="/verify" className="sidebar-link">
            <IconCamera />
            Verify Medicine
          </NavLink>
          <NavLink to="/alerts" className="sidebar-link">
            <IconBell />
            Alerts
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-avatar">{initials}</span>
            <span className="sidebar-username">{user?.name || 'Account'}</span>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1.5" y="5" width="15" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10.25" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 5L7.5 3h3l1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 2.5c-2.2 0-4 1.8-4 4v2.3c0 .5-.2 1-.5 1.4L3.5 11.8c-.5.6 0 1.5.8 1.5h9.4c.8 0 1.3-.9.8-1.5l-1-1.6c-.3-.4-.5-.9-.5-1.4V6.5c0-2.2-1.8-4-4-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7.5 14.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default AppLayout;
