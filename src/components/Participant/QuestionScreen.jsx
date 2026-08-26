import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Lock, Zap, PauseCircle } from 'lucide-react';
import { useQuizSocket } from '../../context/QuizSocketContext';

export default function QuestionScreen({ participant }) {
  const { 
    currentQuestion, 
    timeRemainingSec, 
    submitAnswer, 
    userSubmission,
    eventStatus 
  } = useQuizSocket();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentQuestion) {
      if (userSubmission?.selectedAnswer) {
        setSelectedOption(userSubmission.selectedAnswer);
      } else {
        const savedKey = `ssf_ans_${currentQuestion.id}`;
        const saved = localStorage.getItem(savedKey);
        if (saved) {
          setSelectedOption(saved);
        }
      }
    }
  }, [currentQuestion, userSubmission]);

  if (!currentQuestion) return null;

  const handleSelectOption = (optionKey) => {
    if (selectedOption || userSubmission || isSubmitting || eventStatus === 'PAUSED') return;

    setSelectedOption(optionKey);
    setIsSubmitting(true);

    localStorage.setItem(`ssf_ans_${currentQuestion.id}`, optionKey);
    submitAnswer(currentQuestion.id, optionKey);
    setIsSubmitting(false);
  };

  const durationSec = currentQuestion.duration_sec || 20;
  const progressPct = Math.max(0, Math.min(100, (timeRemainingSec / durationSec) * 100));
  const isTimeCritical = timeRemainingSec <= 5;
  const isPaused = eventStatus === 'PAUSED';

  return (
    <div style={{ maxWidth: '720px', margin: '20px auto 0 auto', padding: '0 16px' }}>
      
      {/* Paused State Banner */}
      {isPaused && (
        <div className="glass-panel animate-fade-in" style={{
          padding: '14px 20px',
          marginBottom: '16px',
          background: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid #f59e0b',
          color: '#fbbf24',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: '700'
        }}>
          <PauseCircle size={22} />
          <span>QUIZ IS PAUSED BY ADMINISTRATOR. Timer & submissions frozen.</span>
        </div>
      )}

      {/* Main Question Card */}
      <div className="glass-panel animate-scale-up" style={{ padding: '24px 20px', borderTop: '4px solid var(--accent-primary)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>
              QUESTION #{currentQuestion.question_number} • {currentQuestion.category || 'General'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', marginTop: '2px', fontWeight: '600' }}>
              {currentQuestion.max_marks} Base Marks (-1 pt per second elapsed)
            </div>
          </div>

          {/* Dynamic SVG Timer Ring */}
          <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="64" height="64" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={isPaused ? '#f59e0b' : isTimeCritical ? '#ef4444' : 'var(--accent-primary)'}
                strokeWidth="8"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * progressPct) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{
              position: 'absolute',
              fontSize: '1.15rem',
              fontWeight: '800',
              fontFamily: 'var(--font-mono)',
              color: isPaused ? '#fbbf24' : isTimeCritical ? '#ef4444' : '#fff'
            }}>
              {timeRemainingSec}
            </div>
          </div>
        </div>

        {/* Question Text */}
        <h2 style={{ fontSize: '1.35rem', lineHeight: '1.4', marginBottom: '24px', color: '#fff' }}>
          {currentQuestion.question_text}
        </h2>

        {/* Options Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '20px' }}>
          {['A', 'B', 'C', 'D'].map((optionKey) => {
            const text = currentQuestion[`option_${optionKey.toLowerCase()}`];
            const isChosen = selectedOption === optionKey;
            const isLocked = selectedOption !== null || isPaused;

            return (
              <div
                key={optionKey}
                onClick={() => handleSelectOption(optionKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isChosen ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)' : 'rgba(15, 23, 42, 0.6)',
                  border: isChosen ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  cursor: isLocked ? 'default' : 'pointer',
                  opacity: (isLocked && !isChosen) ? 0.5 : 1,
                  transition: 'all var(--transition-bounce)',
                  boxShadow: isChosen ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: isChosen ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  flexShrink: 0
                }}>
                  {optionKey}
                </div>

                <div style={{ flex: 1, fontSize: '0.98rem', fontWeight: '500', color: '#fff' }}>
                  {text}
                </div>

                {isChosen && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8', fontWeight: '700', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={18} /> Locked
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lock Confirmation & Points Preview Banner */}
        {selectedOption && (
          <div className="animate-fade-in" style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            padding: '14px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} />
              <span>Option <strong>{selectedOption}</strong> submitted & locked!</span>
            </div>

            {userSubmission && (
              <div style={{ fontWeight: '800', color: '#fbbf24', fontSize: '0.95rem' }}>
                Calculated Score: +{userSubmission.score} pts
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: '400' }}>
                  (-{userSubmission.elapsedSec ?? Math.floor((userSubmission.responseTimeMs || 0) / 1000)} pts for {userSubmission.elapsedSec ?? Math.floor((userSubmission.responseTimeMs || 0) / 1000)}s elapsed)
                </span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
