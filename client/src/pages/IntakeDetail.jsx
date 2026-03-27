import { useParams, Link } from 'react-router-dom';

export default function IntakeDetail() {
  const { id } = useParams();

  return (
    <div className="page">
      <Link to="/dashboard" style={{ color: '#1a5632', fontSize: '0.9rem' }}>
        &larr; Back to Dashboard
      </Link>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        <h1>Intake Detail</h1>
        <p style={{ margin: '0.75rem 0', color: '#666' }}>
          Viewing intake: <code>{id}</code>
        </p>

        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {/* Structured data section */}
          <section style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Client Information</h3>
            <p style={{ color: '#999' }}>Structured intake data will appear here (Phase 6)</p>
          </section>

          {/* Triage section */}
          <section style={{ padding: '1rem', background: '#f0f9f4', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Triage Result</h3>
            <p style={{ color: '#999' }}>Categories, priority, and reasoning will appear here (Phase 6)</p>
          </section>

          {/* Conversation transcript section */}
          <section style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Conversation Transcript</h3>
            <p style={{ color: '#999' }}>Full chat transcript will appear here (Phase 6)</p>
          </section>

          {/* Status controls */}
          <section style={{ padding: '1rem', background: '#fff7ed', borderRadius: '6px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Status</h3>
            <p style={{ color: '#999' }}>Status update controls will appear here (Phase 6)</p>
          </section>
        </div>
      </div>
    </div>
  );
}
