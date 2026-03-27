import { Routes, Route, Link, useLocation } from 'react-router-dom';
import IntakeChat from './pages/IntakeChat.jsx';
import Dashboard from './pages/Dashboard.jsx';
import IntakeDetail from './pages/IntakeDetail.jsx';

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
          New Intake
        </Link>
        <Link to="/dashboard" className={`nav-link ${pathname.startsWith('/dashboard') ? 'active' : ''}`}>
          Dashboard
        </Link>
      </nav>
      <Routes>
        <Route path="/" element={<IntakeChat />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:id" element={<IntakeDetail />} />
      </Routes>
    </>
  );
}
