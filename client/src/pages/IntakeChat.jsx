import { useState, useEffect } from 'react';

export default function IntakeChat() {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.ok ? 'connected' : 'disconnected'))
      .catch(() => setBackendStatus('disconnected'));
  }, []);

  return (
    <div className="page">
      <div className="card">
        <h1>Intake Chat</h1>
        <p style={{ margin: '0.75rem 0', color: '#666' }}>
          This is where clients will have a guided conversation with the AI intake
          assistant. The assistant will collect basic information and a human case
          manager will review it.
        </p>

        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9f4', borderRadius: '6px' }}>
          <strong>Backend status: </strong>
          <span className={`status-dot ${backendStatus}`} />
          {backendStatus === 'connected' && 'Connected'}
          {backendStatus === 'disconnected' && 'Not reachable'}
          {backendStatus === 'checking' && 'Checking...'}
        </div>

        <div style={{
          marginTop: '1.5rem',
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          color: '#999',
        }}>
          Chat interface will be built in Phase 5
        </div>
      </div>
    </div>
  );
}
