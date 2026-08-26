import React, { useState } from 'react';
import { User, Phone, Trophy, ArrowRight, Zap, Check, Sparkles } from 'lucide-react';
import { useQuizSocket } from '../../context/QuizSocketContext';

export default function Registration({ onRegistered }) {
  const { reauthenticate } = useQuizSocket() || {};
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredData, setRegisteredData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error('Backend API Server is offline. Please deploy on Render.com or start Node.js server (npm start).');
      }

      if (!res.ok) throw new Error(data.message || 'Registration failed. Please check backend server.');

      localStorage.setItem('ssf_participant_token', data.participant.authToken);
      localStorage.setItem('ssf_participant_data', JSON.stringify(data.participant));
      setRegisteredData(data.participant);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLobby = () => {
    if (registeredData) {
      if (reauthenticate) reauthenticate();
      onRegistered(registeredData);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      {/* Post-Registration Welcome Modal Popup */}
      {registeredData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel animate-scale-up" style={{ width: '100%', maxWidth: '440px', padding: '32px 24px', textAlign: 'center', border: '2px solid var(--accent-primary)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.15) 100%)',
              border: '2px solid #34d399',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              marginBottom: '16px'
            }}>
              <Sparkles size={32} />
            </div>

            <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '10px' }}>
              Registration Successful!
            </h2>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              Welcome <strong>{registeredData.displayName}</strong>! You have successfully registered for the <strong>Live Quiz Competition by SSF Kurukathani Unit</strong>. Please stand by in the lobby—the host will release questions live.
            </div>

            <button
              onClick={handleProceedToLobby}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              <Zap size={18} /> Proceed to Waiting Lobby <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Registration Card */}
      <div className="glass-panel animate-scale-up" style={{ width: '100%', maxWidth: '460px', padding: '28px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '12px',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.4)'
          }}>
            <Trophy size={28} />
          </div>
          <h1 style={{ fontSize: '1.45rem', marginBottom: '4px', lineHeight: '1.3' }}>
            Live Quiz Competition
          </h1>
          <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: '700', marginBottom: '4px' }}>
            SSF Kurukathani Unit
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Compete in real-time. Accuracy + Speed determine ranking!
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Participant Display Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '42px' }}
                placeholder="Enter your name or alias"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Gender</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {['Male', 'Female', 'Other'].map((g) => {
                const isSelected = gender === g;
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGender(g)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      fontWeight: '700',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {isSelected && <Check size={16} color="var(--accent-primary)" />}
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="tel"
                className="form-input"
                style={{ paddingLeft: '42px' }}
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '16px', padding: '14px', fontSize: '1rem' }}
          >
            {loading ? 'Joining Arena...' : (
              <>
                <Zap size={18} /> Enter Live Quiz Arena <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
