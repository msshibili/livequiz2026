import React from 'react';
import { Award, Zap, CheckCircle2, XCircle, Trophy, ArrowUpRight, HelpCircle } from 'lucide-react';
import { useQuizSocket } from '../../context/QuizSocketContext';

export default function QuestionResult({ participant, cumulativeLeaderboard }) {
  const { lastQuestionResult, userSubmission } = useQuizSocket();

  if (!lastQuestionResult) return null;

  const isCorrect = userSubmission?.isCorrect === 1;
  const scoreEarned = userSubmission?.score || 0;
  const speedBonus = userSubmission?.speedBonus || 0;
  const responseTimeSec = userSubmission?.responseTimeMs ? (userSubmission.responseTimeMs / 1000).toFixed(2) : null;

  // Find user rank in cumulative leaderboard
  let userRank = null;
  let pointsBehind = 0;
  let aheadName = null;

  if (cumulativeLeaderboard && participant) {
    const idx = cumulativeLeaderboard.findIndex(entry => entry.participant_id === participant.id);
    if (idx !== -1) {
      userRank = idx + 1;
      if (idx > 0) {
        const aheadEntry = cumulativeLeaderboard[idx - 1];
        pointsBehind = aheadEntry.total_score - cumulativeLeaderboard[idx].total_score;
        aheadName = aheadEntry.display_name;
      }
    }
  }

  return (
    <div style={{ maxWidth: '780px', margin: '30px auto 0 auto', padding: '0 20px' }}>
      
      {/* Result Card */}
      <div className="glass-panel animate-scale-up" style={{
        padding: '36px',
        textAlign: 'center',
        borderTop: isCorrect ? '4px solid var(--accent-success)' : '4px solid var(--accent-danger)'
      }}>
        
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          border: isCorrect ? '2px solid rgba(16, 185, 129, 0.5)' : '2px solid rgba(239, 68, 68, 0.5)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isCorrect ? '#34d399' : '#f87171',
          marginBottom: '16px'
        }}>
          {isCorrect ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
        </div>

        <h2 style={{ fontSize: '2rem', marginBottom: '4px', color: '#fff' }}>
          {isCorrect ? 'Correct Answer!' : 'Incorrect / Time Expired'}
        </h2>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
          Official Correct Answer: <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>Option {lastQuestionResult.correctAnswer}</strong>
        </p>

        {/* Score & Time Deduction Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Points Earned</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: isCorrect ? '#fbbf24' : 'var(--text-muted)', marginTop: '4px' }}>
              +{scoreEarned} pts
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time Deduction</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: isCorrect ? '#f87171' : 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              -{userSubmission?.elapsedSec ?? (responseTimeSec ? Math.floor(parseFloat(responseTimeSec)) : 0)} pts
            </div>
          </div>

          {responseTimeSec && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Response Time</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#a78bfa', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                {responseTimeSec}s
              </div>
            </div>
          )}
        </div>

        {/* Explanation Card */}
        {lastQuestionResult.explanation && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px 20px',
            textAlign: 'left',
            marginBottom: '28px',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: '700', marginBottom: '4px' }}>
              <HelpCircle size={16} /> Solution Explanation
            </div>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {lastQuestionResult.explanation}
            </p>
          </div>
        )}

        {/* Fastest Correct Answer Spotlight */}
        {lastQuestionResult.fastestCorrect && lastQuestionResult.fastestCorrect.length > 0 && (
          <div style={{ marginBottom: '28px', textAlign: 'left' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#fbbf24', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} /> Fastest Correct Responders
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lastQuestionResult.fastestCorrect.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.88rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#b45309',
                      color: '#000',
                      fontWeight: '800',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: '600', color: '#fff' }}>{item.displayName}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{item.responseTimeSec}s</span>
                    <span style={{ fontWeight: '700', color: '#fbbf24' }}>+{item.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal Position Rank Banner */}
        {userRank && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid var(--border-glow)',
            borderRadius: '12px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>YOUR CURRENT CUMULATIVE POSITION</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                Rank #{userRank}
              </div>
            </div>

            {pointsBehind > 0 && aheadName && (
              <div style={{ fontSize: '0.85rem', color: '#38bdf8', textAlign: 'right' }}>
                <div>You are <strong>{pointsBehind} pts</strong> behind #{userRank - 1}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({aheadName})</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
