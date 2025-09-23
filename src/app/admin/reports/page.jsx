'use client';
import React from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

export default function ReportsPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    try {
      setLoading(true);
  const res = await fetch(`${API_BASE}/admin/reports/broken`, { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (json?.ok) setItems(json.data || []);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Reportes de links caídos</h2>
      {loading ? <p>Cargando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Asset ID</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Nota</th>
                <th style={{ textAlign: 'left', padding: 8 }}>IP</th>
                <th style={{ textAlign: 'left', padding: 8 }}>UA</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{new Date(r.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{r.assetId}</td>
                  <td style={{ padding: 8, whiteSpace: 'pre-wrap' }}>{r.note}</td>
                  <td style={{ padding: 8 }}>{r.ip || '-'}</td>
                  <td style={{ padding: 8, maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.ua}</td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={5} style={{ padding: 8, opacity: .7 }}>Sin reportes</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
