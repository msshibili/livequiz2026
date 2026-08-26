import React from 'react';
import { Users, Clock, Zap, Radio, LogOut } from 'lucide-react';
import { useQuizSocket } from '../../context/QuizSocketContext';

export default function Lobby({ participant, onLogout }) {
  const { eventStatus, activePlayersCount, isConnected, isReconnecting, quizTitle } = useQuizSocket();

  return (
    <div style={{
      maxWidth: '640px',
      margin: '20px auto 0 auto',
      padding: '0 16px',
      textAlign: 'center'
    }}>
      <div className="glass-panel animate-scale-up" style={{ padding: '28px 20px' }}>
        
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: '#818cf8',
          fontSize: '0.82rem',
          fontWeight: '700',
          marginBottom: '16px'
        }}>
          <Radio size={14} className="badge-live" /> LIVE EVENT LOBBY
        </div>

        <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
          Welcome, {participant?.displayName}!
        </h1>
        
        <div style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: '800', marginBottom: '8px', letterSpacing: '0.02em' }}>
          {quizTitle || 'Live Quiz By SSF Kurukathani Unit'}
        </div>

        {/* Live Broadcast Standby Banner */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          margin: '16px 0 24px 0',
          color: '#38bdf8',
          fontSize: '0.88rem',
          fontWeight: '600'
        }}>
          📡 Standby in Lobby! The host will release Question #1 live.
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '400' }}>
            When the host clicks "Publish Question" in the Admin Control Room, the question will automatically appear here on your screen.
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Players Online</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#38bdf8', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Users size={18} /> {activePlayersCount}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quiz Status</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#34d399', marginTop: '6px' }}>
              {eventStatus}
            </div>
          </div>
        </div>

        {/* Rules Card */}
        <div style={{
          textAlign: 'left',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '0.85rem',
          lineHeight: '1.5'
        }}>
          <h4 style={{ fontSize: '0.92rem', color: '#fbbf24', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={16} /> Competition Rules
          </h4>
          <ul style={{ paddingLeft: '18px', color: 'var(--text-muted)' }}>
            <li><strong>Accuracy + Speed:</strong> Correct answers yield base marks + speed bonus.</li>
            <li><strong>Authoritative Timing:</strong> Timer is synchronized with the server.</li>
            <li><strong>Single Lock:</strong> One answer submission permitted per question.</li>
          </ul>
        </div>

        <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Clock size={14} color={isConnected ? '#10b981' : '#ef4444'} />
          {isReconnecting ? 'Reconnecting to Server...' : (isConnected ? 'Server Clock Synced • Ready for Question' : 'Connecting to live room...')}
        </div>

        {/* Change Account / Logout Button */}
        {onLogout && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={onLogout}
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '6px 14px', color: '#f87171' }}
            >
              <LogOut size={14} /> Exit / Change Participant Name
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
