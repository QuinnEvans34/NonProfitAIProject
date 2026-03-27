import { Link } from 'react-router-dom';

export default function Dashboard() {
  // Placeholder data to show the intended layout
  const placeholderIntakes = [
    { id: 'ink_example1', clientName: 'Example Client', status: 'new', priority: 'High', categories: ['Housing'], createdAt: '2026-03-27' },
    { id: 'ink_example2', clientName: 'Another Client', status: 'in_review', priority: 'Medium', categories: ['Food', 'Healthcare'], createdAt: '2026-03-27' },
  ];

  return (
    <div className="page">
      <div className="card">
        <h1>Staff Dashboard</h1>
        <p style={{ margin: '0.75rem 0', color: '#666' }}>
          All submitted intakes will appear here for case manager review.
        </p>

        <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>Client</th>
              <th style={{ padding: '0.5rem' }}>Categories</th>
              <th style={{ padding: '0.5rem' }}>Priority</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {placeholderIntakes.map((intake) => (
              <tr key={intake.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.5rem' }}>
                  <Link to={`/dashboard/${intake.id}`} style={{ color: '#1a5632' }}>
                    {intake.clientName}
                  </Link>
                </td>
                <td style={{ padding: '0.5rem' }}>{intake.categories.join(', ')}</td>
                <td style={{ padding: '0.5rem' }}>{intake.priority}</td>
                <td style={{ padding: '0.5rem' }}>{intake.status}</td>
                <td style={{ padding: '0.5rem' }}>{intake.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: '1rem', color: '#999', fontSize: '0.85rem' }}>
          This table shows placeholder data. Live data will be loaded in Phase 6.
        </p>
      </div>
    </div>
  );
}
