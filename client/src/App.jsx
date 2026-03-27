import { Routes, Route, Link } from 'react-router-dom';
import IntakeChat from './pages/IntakeChat.jsx';
import Dashboard from './pages/Dashboard.jsx';
import IntakeDetail from './pages/IntakeDetail.jsx';

export default function App() {
  return (
    <>
      <nav>
        <span className="brand">Community Intake Assistant</span>
        <Link to="/">New Intake</Link>
        <Link to="/dashboard">Staff Dashboard</Link>
      </nav>
      <Routes>
        <Route path="/" element={<IntakeChat />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:id" element={<IntakeDetail />} />
      </Routes>
    </>
  );
}
