import React, { useState } from 'react';
import { Sliders, Calculator, Zap, CheckCircle2 } from 'lucide-react';

export default function ScoringConfig({ adminToken }) {
  const [baseMarks, setBaseMarks] = useState(100);
  const [maxSpeedBonus, setMaxSpeedBonus] = useState(100);
  const [durationSec, setDurationSec] = useState(20);
  const [timeTakenSec, setTimeTakenSec] = useState(3.5);
  const [selectedMode, setSelectedMode] = useState('LINEAR_SPEED');
  const [simResult, setSimResult] = useState(null);

  const handleRunSimulation = async () => {
    try {
      const res = await fetch('/api/admin/scoring-simulator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          selectedAnswer: 'A',
          correctAnswer: 'A',
          timeTakenSec: parseFloat(timeTakenSec),
          durationSec: parseInt(durationSec),
          baseMarks: parseInt(baseMarks),
          maxSpeedBonus: parseInt(maxSpeedBonus),
          mode: selectedMode
        })
      });

      const data = await res.json();
      setSimResult(data.simulationResult);
    } catch (e) {
      alert('Simulation error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={22} color="var(--accent-primary)" /> Configurable Scoring Engine
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Preview how correctness + speed bonuses are calculated by the authoritative server engine.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Formula Selector & Simulator Controls */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={18} /> Interactive Scoring Simulator
          </h3>

          <div className="form-group">
            <label className="form-label">Scoring Formula Mode</label>
            <select
              className="form-select"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
            >
              <option value="LINEAR_SPEED">LINEAR_SPEED (Linear decay over duration)</option>
              <option value="TIME_DECAY">TIME_DECAY (Exponential 1.5 decay)</option>
              <option value="FIXED">FIXED (No speed bonus, base marks only)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Base Correct Marks</label>
              <input
                type="number"
                className="form-input"
                value={baseMarks}
                onChange={(e) => setBaseMarks(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Speed Bonus</label>
              <input
                type="number"
                className="form-input"
                value={maxSpeedBonus}
                onChange={(e) => setMaxSpeedBonus(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Question Duration (Sec)</label>
              <input
                type="number"
                className="form-input"
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Simulated Answer Time (Sec)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={timeTakenSec}
                onChange={(e) => setTimeTakenSec(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleRunSimulation}>
            <Zap size={16} /> Run Formula Simulation
          </button>
        </div>

        {/* Simulation Output Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {!simResult ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              Adjust parameters on the left and click "Run Formula Simulation" to see score output.
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SIMULATED AUTHORITATIVE RESULT
              </div>
              
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', margin: '12px 0' }}>
                {simResult.score} Points
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Base Correct Marks:</span>
                  <span style={{ fontWeight: '700', color: '#fff' }}>+{baseMarks}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Speed Bonus Earned:</span>
                  <span style={{ fontWeight: '700', color: '#38bdf8' }}>+{simResult.speedBonus}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Response Speed:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{(simResult.responseTimeMs / 1000).toFixed(2)} sec</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Formula Mode:</span>
                  <span style={{ fontWeight: '700', color: '#a78bfa' }}>{selectedMode}</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
