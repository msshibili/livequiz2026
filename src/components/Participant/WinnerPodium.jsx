import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Trophy, Medal, Sparkles } from 'lucide-react';

export default function WinnerPodium({ cumulativeLeaderboard = [] }) {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  }, []);

  const champion = cumulativeLeaderboard[0];
  const runnerUp = cumulativeLeaderboard[1];
  const thirdPlace = cumulativeLeaderboard[2];
  const top10 = cumulativeLeaderboard.slice(3, 10);

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto 40px auto', padding: '0 16px', textAlign: 'center' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 14px',
          borderRadius: '9999px',
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#fbbf24',
          fontSize: '0.8rem',
          fontWeight: '700',
          marginBottom: '12px'
        }}>
          <Sparkles size={14} /> LIVE QUIZ CHAMPIONSHIP CONCLUDED
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>Grand Championship Podium</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
          Celebrating accuracy and lightning speed excellence!
        </p>
      </div>

      {/* Champion Card */}
      {champion && (
        <div className="glass-panel animate-scale-up" style={{
          padding: '28px 20px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%)',
          border: '2px solid rgba(245, 158, 11, 0.6)',
          boxShadow: '0 0 35px rgba(245, 158, 11, 0.3)'
        }}>
          <Crown size={42} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.8))' }} />
          <div style={{ fontSize: '0.78rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800', marginTop: '6px' }}>
            OVERALL CHAMPION
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#fff', margin: '6px 0' }}>
            {champion.display_name}
          </h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Category: {champion.gender || 'Participant'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', maxWidth: '440px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Final Score</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fbbf24' }}>{champion.total_score}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Correct Qs</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#34d399' }}>{champion.correct_count}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg Speed</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{champion.avg_response_time_sec}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium Visual */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
        {runnerUp && (
          <div className="glass-panel" style={{ flex: 1, padding: '20px 10px', borderTop: '4px solid #94a3b8' }}>
            <Medal size={28} color="#94a3b8" />
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', marginTop: '4px' }}>2ND PLACE</div>
            <h3 style={{ fontSize: '0.98rem', marginTop: '4px', color: '#fff' }}>{runnerUp.display_name}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{runnerUp.gender}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fbbf24', marginTop: '6px' }}>{runnerUp.total_score} pts</div>
          </div>
        )}

        {champion && (
          <div className="glass-panel" style={{ flex: 1, padding: '26px 10px', borderTop: '4px solid #f59e0b', transform: 'scale(1.03)' }}>
            <Trophy size={34} color="#f59e0b" />
            <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '700', marginTop: '4px' }}>CHAMPION</div>
            <h3 style={{ fontSize: '1.1rem', marginTop: '4px', color: '#fff' }}>{champion.display_name}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{champion.gender}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fbbf24', marginTop: '6px' }}>{champion.total_score} pts</div>
          </div>
        )}

        {thirdPlace && (
          <div className="glass-panel" style={{ flex: 1, padding: '20px 10px', borderTop: '4px solid #b45309' }}>
            <Medal size={28} color="#b45309" />
            <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '700', marginTop: '4px' }}>3RD PLACE</div>
            <h3 style={{ fontSize: '0.98rem', marginTop: '4px', color: '#fff' }}>{thirdPlace.display_name}</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{thirdPlace.gender}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fbbf24', marginTop: '6px' }}>{thirdPlace.total_score} pts</div>
          </div>
        )}
      </div>

      {/* Top 10 List */}
      {top10.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '14px', color: '#fff' }}>Top Finalists</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {top10.map((item) => (
              <div key={item.participant_id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: '700', color: 'var(--text-dim)', width: '20px' }}>#{item.rank}</span>
                  <span style={{ fontWeight: '600', color: '#fff' }}>{item.display_name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({item.gender})</span>
                </div>

                <div style={{ fontWeight: '800', color: '#fbbf24' }}>
                  {item.total_score} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
