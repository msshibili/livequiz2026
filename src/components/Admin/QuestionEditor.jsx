import React, { useState, useEffect } from 'react';
import { Plus, Save, Lock, Layers, CheckCircle2 } from 'lucide-react';

export default function QuestionEditor({ adminToken }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('default_quiz');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);

  const [formData, setFormData] = useState({
    question_number: 1,
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    max_marks: 100,
    duration_sec: 20,
    speed_bonus_max: 100,
    wrong_penalty: 0,
    scoring_mode: 'LINEAR_SPEED',
    category: 'General Knowledge',
    difficulty: 'Medium',
    explanation: '',
    status: 'READY'
  });

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    const quizToLoad = selectedQuizId || 'default_quiz';
    loadQuestions(quizToLoad);
  }, [selectedQuizId]);

  const loadQuizzes = async () => {
    try {
      const res = await fetch('/api/admin/quizzes', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
        if (data.activeQuizId) {
          setSelectedQuizId(data.activeQuizId);
        } else if (data.quizzes.length > 0) {
          setSelectedQuizId(data.quizzes[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadQuestions = async (quizId) => {
    const targetQuiz = quizId || selectedQuizId || 'default_quiz';
    try {
      const res = await fetch(`/api/admin/questions?quizId=${targetQuiz}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.questions || [];
        setQuestions(list);
        if (list.length > 0) {
          selectQuestionForEdit(list[0]);
        } else {
          setSelectedQuestion(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;

    try {
      const res = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ title: newQuizTitle.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setNewQuizTitle('');
        setShowCreateQuiz(false);
        await loadQuizzes();
        setSelectedQuizId(data.quizId);
      }
    } catch (e) {
      alert('Failed to create quiz');
    }
  };

  const selectQuestionForEdit = (q) => {
    setSelectedQuestion(q);
    setFormData({
      question_number: q.question_number || 1,
      question_text: q.question_text || '',
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer || 'A',
      max_marks: q.max_marks || 100,
      duration_sec: q.duration_sec || 20,
      speed_bonus_max: q.speed_bonus_max || 100,
      wrong_penalty: q.wrong_penalty || 0,
      scoring_mode: q.scoring_mode || 'LINEAR_SPEED',
      category: q.category || 'General',
      difficulty: q.difficulty || 'Medium',
      explanation: q.explanation || '',
      status: q.status || 'READY'
    });
  };

  const handleCreateNewQuestion = async () => {
    const activeQuiz = selectedQuizId || 'default_quiz';
    const nextNum = questions.length + 1;

    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          quiz_id: activeQuiz,
          question_number: nextNum,
          question_text: `Enter Question #${nextNum} Text Here`,
          option_a: 'Option A',
          option_b: 'Option B',
          option_c: 'Option C',
          option_d: 'Option D',
          correct_answer: 'A',
          max_marks: 100,
          duration_sec: 20,
          status: 'READY'
        })
      });

      const data = await res.json();
      if (res.ok && data.question) {
        setQuestions(prev => [...prev, data.question]);
        selectQuestionForEdit(data.question);
        setSaveStatus('New question created!');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        alert(data.message || 'Error creating question.');
      }
    } catch (e) {
      alert('Failed to create question: ' + e.message);
    }
  };

  const handleSaveQuestion = async (e) => {
    if (e) e.preventDefault();
    if (!selectedQuestion) return;

    setSaveStatus('Saving...');
    try {
      const res = await fetch(`/api/admin/questions/${selectedQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          ...formData,
          quiz_id: selectedQuizId || 'default_quiz'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to save question.');
        setSaveStatus('Error saving');
      } else {
        setSaveStatus(`Saved! (v${data.version})`);
        setTimeout(() => setSaveStatus(''), 3000);
        // Refresh local list item
        setQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? { ...q, ...formData, version: data.version } : q));
      }
    } catch (e) {
      setSaveStatus('Failed to save');
    }
  };

  const isLocked = selectedQuestion?.status === 'LIVE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Quiz Selector Bar */}
      <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Active Quiz Event:</span>
          <select
            className="form-select"
            style={{ width: '260px', padding: '6px 12px', fontSize: '0.85rem' }}
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
          >
            {quizzes.length === 0 ? (
              <option value="default_quiz">Default Quiz Event</option>
            ) : (
              quizzes.map(q => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))
            )}
          </select>
        </div>

        <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => setShowCreateQuiz(!showCreateQuiz)}>
          <Plus size={14} /> Create New Quiz Title
        </button>
      </div>

      {/* Create New Quiz Form */}
      {showCreateQuiz && (
        <form onSubmit={handleCreateQuiz} className="glass-panel animate-fade-in" style={{ padding: '14px 18px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Enter Quiz Title (e.g. SSF Kurukathani Grand Quiz 2026)"
            value={newQuizTitle}
            onChange={(e) => setNewQuizTitle(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '8px 14px' }}>
            Save Title
          </button>
        </form>
      )}

      {/* Main Question Editor Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px' }}>
        
        {/* Left Sidebar List */}
        <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem' }}>Questions ({questions.length})</h3>
            <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.78rem' }} onClick={handleCreateNewQuestion}>
              <Plus size={14} /> Add New
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {questions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px 8px', fontSize: '0.82rem' }}>
                No questions yet. Click "+ Add New" above to create one.
              </div>
            ) : (
              questions.map((q) => {
                const isSelected = selectedQuestion?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => selectQuestionForEdit(q)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.82rem' }}>Q#{q.question_number}</span>
                      <span className={`badge badge-${(q.status || 'READY').toLowerCase()}`} style={{ fontSize: '0.6rem' }}>
                        {q.status || 'READY'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {q.question_text}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Form Editor */}
        <div className="glass-panel" style={{ padding: '20px', overflowY: 'auto', height: 'calc(100vh - 200px)' }}>
          {!selectedQuestion ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '80px' }}>
              <p style={{ fontSize: '1.05rem', marginBottom: '16px' }}>No question selected for editing.</p>
              <button className="btn btn-primary" onClick={handleCreateNewQuestion}>
                <Plus size={16} /> Click Here to Add Question #1
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveQuestion}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', pb: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Edit Question #{formData.question_number}
                    {isLocked && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={14} /> LIVE Locked
                      </span>
                    )}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {saveStatus && <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: '700' }}>{saveStatus}</span>}
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                    <Save size={16} /> Save Question
                  </button>
                </div>
              </div>

              {/* Form Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Question Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="READY">READY</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="LIVE">LIVE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Scoring Mode</label>
                  <select
                    className="form-select"
                    value={formData.scoring_mode}
                    onChange={(e) => setFormData({ ...formData, scoring_mode: e.target.value })}
                    disabled={isLocked}
                  >
                    <option value="LINEAR_SPEED">LINEAR_SPEED (Default)</option>
                    <option value="TIME_DECAY">TIME_DECAY (Exponential)</option>
                    <option value="FIXED">FIXED (Base Marks Only)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    disabled={isLocked}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  disabled={isLocked}
                  required
                />
              </div>

              {/* Options A, B, C, D */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '12px 0' }}>
                {['A', 'B', 'C', 'D'].map((opt) => (
                  <div key={opt} className="form-group">
                    <label className="form-label" style={{ color: formData.correct_answer === opt ? '#34d399' : 'inherit' }}>
                      Option {opt} {formData.correct_answer === opt && '(CORRECT ANSWER)'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData[`option_${opt.toLowerCase()}`]}
                      onChange={(e) => setFormData({ ...formData, [`option_${opt.toLowerCase()}`]: e.target.value })}
                      disabled={isLocked}
                      style={{
                        borderColor: formData.correct_answer === opt ? 'var(--accent-success)' : 'var(--border-subtle)'
                      }}
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Correct Answer & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Correct Option</label>
                  <select
                    className="form-select"
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    disabled={isLocked}
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (Sec)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.duration_sec}
                    onChange={(e) => setFormData({ ...formData, duration_sec: parseInt(e.target.value) || 20 })}
                    disabled={isLocked}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Base Marks</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.max_marks}
                    onChange={(e) => setFormData({ ...formData, max_marks: parseInt(e.target.value) || 100 })}
                    disabled={isLocked}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Speed Bonus</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.speed_bonus_max}
                    onChange={(e) => setFormData({ ...formData, speed_bonus_max: parseInt(e.target.value) || 100 })}
                    disabled={isLocked}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div className="form-group">
                <label className="form-label">Solution Explanation (Revealed after question closes)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  disabled={isLocked}
                />
              </div>

            </form>
          )}
        </div>

      </div>

    </div>
  );
}
