import React, { useState, useEffect } from 'react';
import { Trophy, Users, Zap, Clock } from 'lucide-react';

export default function Scoreboard({ participant }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [genderFilter, setGenderFilter] = useState('all');

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('ssf_participant_token') || '';
      const res = await fetch(`/api/quiz/leaderboard?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.topLeaderboard || []);
        setUserPos(data.userPosition || null);
      }
    } catch (e) {}
  };

  const filteredLeaderboard = genderFilter === 'all' 
    ? leaderboard 
    : leaderboard.filter(item => item.gender === genderFilter);

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto 0 auto', padding: '0 16px' }}>
      
      {/* Header & Filter */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy color="#fbbf24" size={24} /> Live Championship Leaderboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Real-time standings • Accuracy + Speed bonus points
          </p>
        </div>

        {/* Gender Filter: All / Male / Female */}
        <select
          className="form-select"
          style={{ width: '160px', padding: '8px 12px', fontSize: '0.85rem' }}
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
        >
          <option value="all">All Genders</option>
          <option value="Male">Male Division</option>
          <option value="Female">Female Division</option>
        </select>
      </div>

      {/* User Position Highlight Widget */}
      {userPos && (
        <div className="glass-panel animate-scale-up" style={{
          padding: '16px 20px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)',
          border: '1px solid var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: '900',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
            }}>
              #{userPos.rank}
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>YOUR LIVE POSITION</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>
                {userPos.score} Points
              </div>
            </div>
          </div>

          {userPos.pointsBehindAhead > 0 ? (
            <div style={{ fontSize: '0.82rem', color: '#38bdf8', textAlign: 'right' }}>
              <strong>{userPos.pointsBehindAhead} pts</strong> behind #{userPos.rank - 1}
            </div>
          ) : (
            <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: '700' }}>
              🥇 1st Place!
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table with Mobile Horizontal Scroll */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px', width: '60px' }}>Rank</th>
              <th style={{ padding: '12px 16px' }}>Participant</th>
              <th style={{ padding: '12px 16px' }}>Gender</th>
              <th style={{ padding: '12px 16px' }}>Correct</th>
              <th style={{ padding: '12px 16px' }}>Avg Speed</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaderboard.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No participants registered or scores submitted yet.
                </td>
              </tr>
            ) : (
              filteredLeaderboard.map((item) => {
                const isUser = participant && item.participant_id === participant.id;
                const isTop3 = item.rank <= 3;
                return (
                  <tr
                    key={item.participant_id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isUser ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      fontWeight: isUser ? '700' : '400'
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: item.rank === 1 ? '#f59e0b' : item.rank === 2 ? '#94a3b8' : item.rank === 3 ? '#b45309' : 'rgba(255,255,255,0.05)',
                        color: isTop3 ? '#000' : 'var(--text-muted)',
                        fontWeight: '800',
                        fontSize: '0.75rem'
                      }}>
                        {item.rank}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: isUser ? '#818cf8' : '#fff' }}>
                      {item.display_name} {isUser && '(You)'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.gender}</td>
                    <td style={{ padding: '12px 16px', color: '#34d399' }}>{item.correct_count}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{item.avg_response_time_sec}s</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#fbbf24', fontSize: '0.98rem' }}>
                      {item.total_score} pts
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
