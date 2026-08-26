import React, { useState, useEffect } from 'react';
import { Shield, Clock, FileText } from 'lucide-react';

export default function AuditLogs({ adminToken }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={22} color="var(--accent-purple)" /> Control Room Audit Log
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Immutable log of all administrative operations, question releases, and emergency controls.
        </p>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 20px' }}>Timestamp</th>
              <th style={{ padding: '14px 20px' }}>Admin ID</th>
              <th style={{ padding: '14px 20px' }}>Action</th>
              <th style={{ padding: '14px 20px' }}>Target Type</th>
              <th style={{ padding: '14px 20px' }}>Target ID</th>
              <th style={{ padding: '14px 20px' }}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  {loading ? 'Loading audit logs...' : 'No audit records found.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: '600', color: '#fff' }}>{log.username || log.admin_id}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-ready" style={{ fontSize: '0.7rem' }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>{log.target_type}</td>
                  <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{log.target_id}</td>
                  <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {log.metadata}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
