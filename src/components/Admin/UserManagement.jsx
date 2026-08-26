import React, { useState, useEffect } from 'react';
import { Search, Download, UserX, UserCheck, RefreshCw } from 'lucide-react';
import { useQuizSocket } from '../../context/QuizSocketContext';

export default function UserManagement({ adminToken }) {
  const { adminStats } = useQuizSocket();
  const [participants, setParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 3000);
    return () => clearInterval(interval);
  }, [searchQuery, statusFilter, adminStats?.registeredUsers]);

  const fetchParticipants = async () => {
    try {
      const queryParams = new URLSearchParams({
        q: searchQuery,
        status: statusFilter
      });
      const res = await fetch(`/api/admin/participants?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`/api/admin/participants/${id}/toggle-status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        fetchParticipants();
      }
    } catch (e) {
      alert('Failed to toggle status');
    }
  };

  const handleExportCSV = (type) => {
    window.open(`/api/admin/export-csv?type=${type}&adminToken=${adminToken}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Export Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Registered Participant Directory
            <span style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              LIVE ({participants.length})
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Live updating list of all registered participants, privacy-masked details & disable controls.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }} onClick={fetchParticipants}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => handleExportCSV('participants')}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '220px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '40px' }}
            placeholder="Search by participant name or gender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="disabled">Disabled Only</option>
        </select>
      </div>

      {/* Participants Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem', minWidth: '600px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Participant Name</th>
              <th style={{ padding: '12px 16px' }}>Gender</th>
              <th style={{ padding: '12px 16px' }}>Mobile Number</th>
              <th style={{ padding: '12px 16px' }}>Total Score</th>
              <th style={{ padding: '12px 16px' }}>Correct Qs</th>
              <th style={{ padding: '12px 16px' }}>Avg Speed</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No participants registered yet.
                </td>
              </tr>
            ) : (
              participants.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#fff' }}>{p.display_name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{p.gender || 'Male'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{p.phone_masked}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: '#fbbf24' }}>{p.total_score} pts</td>
                  <td style={{ padding: '12px 16px', color: '#34d399' }}>{p.correct_count}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{(p.avg_response_time_ms / 1000).toFixed(2)}s</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${p.status === 'active' ? 'badge-ready' : 'badge-closed'}`} style={{ fontSize: '0.65rem' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      className={`btn ${p.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                      style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      onClick={() => handleToggleStatus(p.id)}
                    >
                      {p.status === 'active' ? <><UserX size={12} /> Disable</> : <><UserCheck size={12} /> Restore</>}
                    </button>
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
