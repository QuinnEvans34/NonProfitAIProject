import { Routes, Route, Link, useLocation } from 'react-router-dom';
import IntakeChat from './pages/IntakeChat.jsx';
import Dashboard from './pages/Dashboard.jsx';
import IntakeDetail from './pages/IntakeDetail.jsx';
import Admin from './pages/Admin.jsx';
import Reports from './pages/Reports.jsx';
import {
  MessageSquare,
  LayoutDashboard,
  Settings,
  BarChart3,
} from './lib/icons.js';

export default function App() {
  const { pathname } = useLocation();

  return (
    <>
      <nav>
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark">CI</span>
          Community Intake
        </Link>
        <Link to="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
          <MessageSquare size={16} aria-hidden />
          New Intake
        </Link>
        <Link
          to="/dashboard"
          className={`nav-link ${pathname.startsWith('/dashboard') ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} aria-hidden />
          Dashboard
        </Link>
        <Link
          to="/admin"
          className={`nav-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
        >
          <Settings size={16} aria-hidden />
          Admin
        </Link>
        <Link
          to="/reports"
          className={`nav-link ${pathname.startsWith('/reports') ? 'active' : ''}`}
        >
          <BarChart3 size={16} aria-hidden />
          Reports
        </Link>
      </nav>
      <Routes>
        <Route path="/" element={<IntakeChat />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:id" element={<IntakeDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </>
  );
}
