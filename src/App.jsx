import React, { useState, useEffect } from 'react';
import { QuizSocketProvider, useQuizSocket } from './context/QuizSocketContext';

// Participant Components
import Registration from './components/Participant/Registration';
import Lobby from './components/Participant/Lobby';
import QuestionScreen from './components/Participant/QuestionScreen';
import QuestionResult from './components/Participant/QuestionResult';
import Scoreboard from './components/Participant/Scoreboard';
import WinnerPodium from './components/Participant/WinnerPodium';

// Admin Components
import AdminLogin from './components/Admin/AdminLogin';
import AdminLayout from './components/Admin/AdminLayout';
import LiveControlRoom from './components/Admin/LiveControlRoom';
import QuestionEditor from './components/Admin/QuestionEditor';
import UserManagement from './components/Admin/UserManagement';
import ScoringConfig from './components/Admin/ScoringConfig';
import AuditLogs from './components/Admin/AuditLogs';

import { Trophy, Radio, KeyRound, LogOut } from 'lucide-react';

function QuizAppContainer() {
  const { eventStatus } = useQuizSocket();
  const [participant, setParticipant] = useState(null);
  const [activeView, setActiveView] = useState('arena');
  const [cumulativeLeaderboard, setCumulativeLeaderboard] = useState([]);

  const isSecretAdminRoute = window.location.pathname === '/control-room-x7';

  const [adminUser, setAdminUser] = useState(null);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('ssf_admin_token') || '');
  const [adminTab, setAdminTab] = useState('control-room');

  useEffect(() => {
    const savedP = localStorage.getItem('ssf_participant_data');
    if (savedP) {
      try {
        setParticipant(JSON.parse(savedP));
      } catch (e) {}
    }

    const savedAdmin = localStorage.getItem('ssf_admin_user');
    if (savedAdmin) {
      try {
        setAdminUser(JSON.parse(savedAdmin));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [eventStatus]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/quiz/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setCumulativeLeaderboard(data.topLeaderboard || []);
      }
    } catch (e) {}
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('ssf_admin_token');
    localStorage.removeItem('ssf_admin_user');
    setAdminToken('');
    setAdminUser(null);
  };

  const handleParticipantLogout = () => {
    localStorage.removeItem('ssf_participant_token');
    localStorage.removeItem('ssf_participant_data');
    setParticipant(null);
  };

  const navigateToAdminBypass = () => {
    window.history.pushState({}, '', '/control-room-x7');
    window.location.reload();
  };

  // Secret Admin Route
  if (isSecretAdminRoute) {
    if (!adminToken || !adminUser) {
      return (
        <AdminLogin
          onLoginSuccess={(user, token) => {
            setAdminUser(user);
            setAdminToken(token);
          }}
        />
      );
    }

    return (
      <AdminLayout
        activeTab={adminTab}
        setActiveTab={setAdminTab}
        adminUser={adminUser}
        onLogout={handleAdminLogout}
      >
        {adminTab === 'control-room' && <LiveControlRoom adminToken={adminToken} />}
        {adminTab === 'questions' && <QuestionEditor adminToken={adminToken} />}
        {adminTab === 'participants' && <UserManagement adminToken={adminToken} />}
        {adminTab === 'scoring-config' && <ScoringConfig adminToken={adminToken} />}
        {adminTab === 'audit-logs' && <AuditLogs adminToken={adminToken} />}
      </AdminLayout>
    );
  }

  // Public Participant Site
  if (!participant) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={navigateToAdminBypass}
          title="Admin Control Room Bypass"
          style={{
            position: 'fixed',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-dim)',
            padding: '8px 12px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 100
          }}
        >
          <KeyRound size={14} color="#818cf8" /> Admin Portal
        </button>

        <Registration onRegistered={(pData) => setParticipant(pData)} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header style={{
        height: '60px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '900',
            flexShrink: 0
          }}>
            <Trophy size={18} />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '0.92rem', lineHeight: '1.2' }}>Live Quiz Competition</div>
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: '700' }}>SSF Kurukathani Unit</div>
          </div>
        </div>

        {/* Navigation, Admin Shortcut & Logout Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setActiveView('arena')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeView === 'arena' ? 'var(--accent-primary)' : 'transparent',
                color: activeView === 'arena' ? '#fff' : 'var(--text-muted)',
                fontWeight: '600',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Arena
            </button>
            <button
              onClick={() => setActiveView('scoreboard')}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeView === 'scoreboard' ? 'var(--accent-primary)' : 'transparent',
                color: activeView === 'scoreboard' ? '#fff' : 'var(--text-muted)',
                fontWeight: '600',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Ranks
            </button>
          </div>

          <button
            onClick={navigateToAdminBypass}
            title="Open Admin Control Room"
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              padding: '6px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}
          >
            <KeyRound size={14} /> Admin
          </button>

          {/* Participant Logout Button */}
          <button
            onClick={handleParticipantLogout}
            title="Logout Participant"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '6px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}
          >
            <LogOut size={14} /> Exit
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, paddingBottom: '30px' }}>
        {activeView === 'scoreboard' ? (
          <Scoreboard participant={participant} />
        ) : (
          <>
            {eventStatus === 'FINISHED' ? (
              <WinnerPodium cumulativeLeaderboard={cumulativeLeaderboard} />
            ) : eventStatus === 'QUESTION_ACTIVE' || eventStatus === 'PAUSED' ? (
              <QuestionScreen participant={participant} />
            ) : eventStatus === 'QUESTION_RESULTS' ? (
              <QuestionResult participant={participant} cumulativeLeaderboard={cumulativeLeaderboard} />
            ) : (
              <Lobby participant={participant} onLogout={handleParticipantLogout} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QuizSocketProvider>
      <QuizAppContainer />
    </QuizSocketProvider>
  );
}
