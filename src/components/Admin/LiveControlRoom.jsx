import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Send, 
  RotateCcw, 
  Clock, 
  Users, 
  Zap, 
  AlertTriangle, 
  BarChart2, 
  Square,
  Layers,
  CheckCircle2,
  Radio,
  Trophy
} from 'lucide-react';
import { useQuizSocket } from '../../context/QuizSocketContext';

export default function LiveControlRoom({ adminToken }) {
  const { 
    adminStats, 
    eventStatus, 
    currentQuestion, 
    timeRemainingSec 
  } = useQuizSocket();

  const [loadingAction, setLoadingAction] = useState(null);
  const [quizzesList, setQuizzesList] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedQuizId) {
      fetchQuestions(selectedQuizId);
    }
  }, [selectedQuizId]);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/admin/quizzes', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzesList(data.quizzes || []);
        if (data.quizzes.length > 0) {
          setSelectedQuizId(data.activeQuizId || data.quizzes[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQuestions = async (quizId) => {
    try {
      const res = await fetch(`/api/admin/questions?quizId=${quizId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.questions || [];
        setQuestionsList(list);
        if (list.length > 0) {
          const firstReady = list.find(q => q.status === 'READY');
          if (firstReady) {
            setSelectedQuestionId(firstReady.id);
          } else {
            setSelectedQuestionId(list[0].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleActivateQuizEvent = async (quizId) => {
    setLoadingAction('ACTIVATING_QUIZ');
    try {
      const res = await fetch('/api/admin/select-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ quizId })
      });
      if (res.ok) {
        await fetchQuizzes();
      }
    } catch (e) {
      alert('Failed to activate quiz event.');
    } finally {
      setLoadingAction(null);
    }
  };

  const executeControlAction = async (action, payload = {}, requiresConfirm = false, confirmMessage = '') => {
    if (requiresConfirm && !confirmModal) {
      setConfirmModal({ action, payload, message: confirmMessage });
      return;
    }

    setConfirmModal(null);
    setLoadingAction(action);

    try {
      const res = await fetch('/api/admin/event-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ action, payload })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Action failed');
      } else {
        fetchQuestions(selectedQuizId);
      }
    } catch (err) {
      alert('Failed to execute command: ' + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const activeQuizId = adminStats?.activeQuizId || selectedQuizId;
  const isCurrentlyActive = selectedQuizId === activeQuizId;

  const distribution = adminStats?.answerDistribution || { A: 0, B: 0, C: 0, D: 0 };
  const totalAnswers = (distribution.A + distribution.B + distribution.C + distribution.D) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel animate-scale-up" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f59e0b', marginBottom: '14px' }}>
              <AlertTriangle size={26} />
              <h3 style={{ fontSize: '1.2rem' }}>Confirm Action</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.92rem' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button 
                className="btn btn-danger"
                onClick={() => executeControlAction(confirmModal.action, confirmModal.payload)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Active Quiz Selector Header */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="var(--accent-primary)" />
            <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>Quiz Event Selection:</span>
          </div>

          <select 
            className="form-select" 
            style={{ width: '280px', padding: '8px 12px', fontSize: '0.88rem' }}
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
          >
            {quizzesList.map(q => (
              <option key={q.id} value={q.id}>
                {q.title} {q.id === activeQuizId ? '(ACTIVE EVENT)' : ''}
              </option>
            ))}
          </select>

          {isCurrentlyActive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                color: '#34d399',
                fontWeight: '800',
                fontSize: '0.8rem'
              }}>
                <CheckCircle2 size={14} /> CURRENTLY LIVE BROADCASTING
              </span>

              <button
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => executeControlAction('STOP_QUIZ', {}, true, 'Are you sure you want to STOP and DEACTIVATE this active quiz event?')}
                disabled={loadingAction === 'STOP_QUIZ'}
              >
                <Square size={13} fill="currentColor" /> Stop / Deactivate Event
              </button>
            </div>
          ) : (
            <button
              className="btn btn-success"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => handleActivateQuizEvent(selectedQuizId)}
              disabled={loadingAction === 'ACTIVATING_QUIZ'}
            >
              <Radio size={14} /> Activate This Quiz For All Players
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {questionsList.length} Questions Prepared
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid-stats">
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registered Players</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: '#fff' }}>{adminStats?.registeredUsers || 0}</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderLeft: '3px solid var(--accent-secondary)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Players Online</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {adminStats?.activePlayers || 0}
            <Users size={16} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Published / Completed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: '#fff' }}>
            {adminStats?.questionsPublished || 0} / {adminStats?.questionsCompleted || 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Submissions Received</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: '#a78bfa' }}>{adminStats?.submissionsReceived || 0}</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderLeft: '3px solid var(--accent-gold)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highest / Avg Score</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: '#fbbf24' }}>
            {adminStats?.highestScore || 0} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({adminStats?.averageScore || 0} avg)</span>
          </div>
        </div>
      </div>

      {/* Main Event Command Controls */}
      <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="var(--accent-primary)" /> Event Command Controls
        </h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button 
            className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => executeControlAction('OPEN_REGISTRATION')}
            disabled={loadingAction === 'OPEN_REGISTRATION'}
          >
            Open Registration
          </button>

          <button 
            className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => executeControlAction('CLOSE_REGISTRATION')}
            disabled={loadingAction === 'CLOSE_REGISTRATION'}
          >
            Close Registration
          </button>

          <button 
            className="btn btn-success"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => executeControlAction('START_QUIZ')}
            disabled={loadingAction === 'START_QUIZ'}
          >
            <Play size={14} /> Start Quiz
          </button>

          {eventStatus === 'PAUSED' ? (
            <button 
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              onClick={() => executeControlAction('RESUME_QUIZ')}
              disabled={loadingAction === 'RESUME_QUIZ'}
            >
              <Play size={14} /> Resume Quiz
            </button>
          ) : (
            <button 
              className="btn btn-warning"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              onClick={() => executeControlAction('PAUSE_QUIZ')}
              disabled={loadingAction === 'PAUSE_QUIZ'}
            >
              <Pause size={14} /> Pause Quiz
            </button>
          )}

          {/* Question Selector & Publisher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 0, 0, 0.3)', padding: '4px 8px', borderRadius: '8px' }}>
            <select 
              className="form-select" 
              style={{ width: '200px', padding: '6px 10px', fontSize: '0.82rem' }}
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
            >
              <option value="">-- Select Question --</option>
              {questionsList.map(q => (
                <option key={q.id} value={q.id}>Q{q.question_number}: {q.question_text.slice(0, 25)}... ({q.status})</option>
              ))}
            </select>

            <button 
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              onClick={() => executeControlAction('PUBLISH_NEXT_QUESTION', { questionId: selectedQuestionId })}
              disabled={loadingAction === 'PUBLISH_NEXT_QUESTION'}
            >
              <Send size={14} /> Publish Question
            </button>
          </div>

          <button 
            className="btn btn-warning"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => executeControlAction('END_QUIZ')}
            disabled={loadingAction === 'END_QUIZ'}
          >
            <Trophy size={14} /> End Quiz (Podium)
          </button>

          <button 
            className="btn btn-danger"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => executeControlAction('RESET_EVENT', {}, true, 'Are you sure you want to RESET the entire event? This will clear all scores and submissions!')}
            disabled={loadingAction === 'RESET_EVENT'}
          >
            <RotateCcw size={14} /> Reset Event
          </button>
        </div>
      </div>

      {/* Current Question & Live Monitor */}
      {currentQuestion && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PUBLISHED QUESTION</span>
                <h3 style={{ fontSize: '1.2rem', marginTop: '2px' }}>Question #{currentQuestion.question_number}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-live" style={{ fontSize: '0.8rem' }}>
                  {eventStatus}
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  00:{timeRemainingSec.toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.98rem', color: '#fff', marginBottom: '16px', lineHeight: '1.4' }}>
              {currentQuestion.question_text}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              {['A', 'B', 'C', 'D'].map((opt) => {
                const text = currentQuestion[`option_${opt.toLowerCase()}`];
                const count = distribution[opt] || 0;
                const pct = Math.round((count / totalAnswers) * 100);
                return (
                  <div key={opt} style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '3px' }}>
                      <span>{opt}. {text}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-warning"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => executeControlAction('EXTEND_TIME', { extraSec: 10 })}
              >
                <Clock size={14} /> +10 Sec
              </button>

              <button 
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => executeControlAction('CLOSE_QUESTION')}
              >
                <Square size={14} /> Close Question Now
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} color="var(--accent-secondary)" /> Live Answer Feed
            </h3>

            <div style={{
              flex: 1,
              maxHeight: '240px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {(!adminStats?.liveActivityFeed || adminStats.liveActivityFeed.length === 0) ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px 0', fontSize: '0.85rem' }}>
                  Waiting for participant submissions...
                </div>
              ) : (
                adminStats.liveActivityFeed.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: item.isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: item.isCorrect ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{item.time}</span>
                      <span style={{ fontWeight: '600' }}>{item.displayName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Option {item.selectedAnswer}</span>
                    </div>

                    <div style={{ color: item.isCorrect ? '#34d399' : '#f87171', fontWeight: '700', fontSize: '0.78rem' }}>
                      {item.isCorrect ? `Correct (+${item.score ?? 0} pts)` : 'Incorrect (0 pts)'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
