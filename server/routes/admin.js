import { Hono } from 'hono';
import crypto from 'crypto';
import { db } from '../db.js';
import { verifyAdminSession } from '../middleware/adminAuth.js';
import { eventRoom } from '../eventRoom.js';
import { calculateQuestionScore } from '../scoringEngine.js';

const adminApp = new Hono();

adminApp.use('*', verifyAdminSession);

// 1. Dashboard Stats
adminApp.get('/dashboard-stats', (c) => {
  const totalRegistered = db.prepare("SELECT COUNT(*) as count FROM participants").get().count;
  const publishedQCount = db.prepare("SELECT COUNT(*) as count FROM questions WHERE status IN ('LIVE', 'CLOSED', 'SCORED')").get().count;
  const completedQCount = db.prepare("SELECT COUNT(*) as count FROM questions WHERE status IN ('CLOSED', 'SCORED')").get().count;
  const submissionsCount = db.prepare("SELECT COUNT(*) as count FROM submissions").get().count;

  const scoreStats = db.prepare(`
    SELECT MAX(total_score) as highest, AVG(total_score) as avgScore
    FROM (
      SELECT SUM(score) as total_score FROM question_results GROUP BY participant_id
    )
  `).get();

  return c.json({
    registeredUsers: totalRegistered,
    activePlayers: eventRoom.getActiveParticipantsCount(),
    questionsPublished: publishedQCount,
    questionsCompleted: completedQCount,
    submissionsReceived: submissionsCount,
    currentQuestionNumber: eventRoom.currentQuestion ? eventRoom.currentQuestion.question_number : 0,
    highestScore: scoreStats?.highest || 0,
    averageScore: Math.round(scoreStats?.avgScore || 0),
    eventStatus: eventRoom.status,
    answerDistribution: eventRoom.answerDistribution,
    liveActivityFeed: eventRoom.liveActivityFeed.slice(0, 30)
  });
});

// 2. Multiple Quizzes Management Endpoints
adminApp.get('/quizzes', (c) => {
  const quizzes = db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all();
  return c.json({ quizzes, activeQuizId: eventRoom.quizId });
});

adminApp.post('/quizzes', async (c) => {
  const admin = c.get('adminUser');
  const { title } = await c.req.json();
  if (!title) return c.json({ error: 'TITLE_REQUIRED' }, 400);

  const quizId = 'quiz_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  db.prepare(`
    INSERT INTO quizzes (id, title, status, created_at)
    VALUES (?, ?, 'REGISTRATION_OPEN', ?)
  `).run(quizId, title.trim(), Date.now());

  eventRoom.logAdminAction(admin.id, 'CREATE_QUIZ', 'quiz', quizId, { title });

  return c.json({ success: true, quizId, title });
});

adminApp.post('/select-quiz', async (c) => {
  const admin = c.get('adminUser');
  const { quizId } = await c.req.json();
  if (!quizId) return c.json({ error: 'QUIZ_ID_REQUIRED' }, 400);

  eventRoom.setQuizId(quizId);
  eventRoom.logAdminAction(admin.id, 'SELECT_QUIZ', 'quiz', quizId, {});

  return c.json({ success: true, quizId: eventRoom.quizId });
});

// 3. Live Event Control Bar Actions (Start, Pause, Resume, End, Publish, Reset)
adminApp.post('/event-control', async (c) => {
  const admin = c.get('adminUser');
  const { action, payload } = await c.req.json();

  switch (action) {
    case 'OPEN_REGISTRATION':
      eventRoom.setEventStatus('REGISTRATION_OPEN', admin.id);
      break;
    case 'CLOSE_REGISTRATION':
      eventRoom.setEventStatus('REGISTRATION_CLOSED', admin.id);
      break;
    case 'START_QUIZ':
      eventRoom.setEventStatus('READY', admin.id);
      break;
    case 'PAUSE_QUIZ':
      eventRoom.pauseQuiz(admin.id);
      break;
    case 'RESUME_QUIZ':
      eventRoom.resumeQuiz(admin.id);
      break;
    case 'STOP_QUIZ':
    case 'END_QUIZ':
      eventRoom.stopQuiz(admin.id);
      break;
    case 'PUBLISH_NEXT_QUESTION': {
      const qId = payload?.questionId;
      const res = eventRoom.publishNextQuestion(qId, admin.id);
      if (!res.success) return c.json(res, 400);
      break;
    }
    case 'EXTEND_TIME': {
      const extraSec = payload?.extraSec || 10;
      const res = eventRoom.extendQuestionTime(extraSec, admin.id);
      if (!res.success) return c.json(res, 400);
      break;
    }
    case 'CLOSE_QUESTION': {
      const res = eventRoom.closeCurrentQuestion('ADMIN_MANUAL_CLOSE', admin.id);
      if (!res.success) return c.json(res, 400);
      break;
    }
    case 'RESET_EVENT': {
      db.prepare("DELETE FROM submissions").run();
      db.prepare("DELETE FROM question_results").run();
      db.prepare("DELETE FROM leaderboard_snapshots").run();
      db.prepare("UPDATE questions SET status = 'READY'").run();
      eventRoom.answersMap.clear();
      eventRoom.answerDistribution = { A: 0, B: 0, C: 0, D: 0 };
      eventRoom.currentQuestion = null;
      eventRoom.liveActivityFeed = [];
      eventRoom.setEventStatus('REGISTRATION_OPEN', admin.id);
      break;
    }
    default:
      return c.json({ error: 'UNKNOWN_ACTION' }, 400);
  }

  return c.json({ success: true, eventStatus: eventRoom.status });
});

// 4. Question Management
adminApp.get('/questions', (c) => {
  const quizId = c.req.query('quizId') || eventRoom.quizId;
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_number ASC').all(quizId);
  return c.json({ questions });
});

adminApp.post('/questions', async (c) => {
  const admin = c.get('adminUser');
  const body = await c.req.json();

  const targetQuizId = body.quiz_id || eventRoom.quizId;
  const qId = 'q_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const count = db.prepare("SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?").get(targetQuizId).count;

  const newQuestion = {
    id: qId,
    quiz_id: targetQuizId,
    question_number: body.question_number || (count + 1),
    version: 1,
    question_text: body.question_text || 'New Question Text',
    option_a: body.option_a || 'Option A',
    option_b: body.option_b || 'Option B',
    option_c: body.option_c || 'Option C',
    option_d: body.option_d || 'Option D',
    correct_answer: (body.correct_answer || 'A').toUpperCase(),
    max_marks: body.max_marks || 100,
    duration_sec: body.duration_sec || 20,
    speed_bonus_max: body.speed_bonus_max || 100,
    wrong_penalty: body.wrong_penalty || 0,
    unanswered_score: body.unanswered_score || 0,
    scoring_mode: body.scoring_mode || 'LINEAR_SPEED',
    explanation: body.explanation || '',
    category: body.category || 'General',
    difficulty: body.difficulty || 'Medium',
    status: body.status || 'DRAFT',
    created_at: Date.now()
  };

  db.prepare(`
    INSERT INTO questions (
      id, quiz_id, question_number, version, question_text,
      option_a, option_b, option_c, option_d, correct_answer,
      max_marks, duration_sec, speed_bonus_max, wrong_penalty, unanswered_score,
      scoring_mode, explanation, category, difficulty, status, created_at
    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newQuestion.id,
    newQuestion.quiz_id,
    newQuestion.question_number,
    newQuestion.question_text,
    newQuestion.option_a,
    newQuestion.option_b,
    newQuestion.option_c,
    newQuestion.option_d,
    newQuestion.correct_answer,
    newQuestion.max_marks,
    newQuestion.duration_sec,
    newQuestion.speed_bonus_max,
    newQuestion.wrong_penalty,
    newQuestion.unanswered_score,
    newQuestion.scoring_mode,
    newQuestion.explanation,
    newQuestion.category,
    newQuestion.difficulty,
    newQuestion.status,
    newQuestion.created_at
  );

  eventRoom.logAdminAction(admin.id, 'CREATE_QUESTION', 'question', qId, { text: newQuestion.question_text });

  return c.json({ success: true, id: qId, question: newQuestion });
});

adminApp.put('/questions/:id', async (c) => {
  const admin = c.get('adminUser');
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'QUESTION_NOT_FOUND' }, 404);

  if (existing.status === 'LIVE' && (body.correct_answer !== existing.correct_answer || body.question_text !== existing.question_text)) {
    return c.json({
      error: 'QUESTION_LOCKED',
      message: 'Cannot modify correct answer or question text while question is LIVE.'
    }, 400);
  }

  const newVersion = existing.version + 1;

  db.prepare(`
    UPDATE questions SET
      question_number = ?, version = ?, question_text = ?,
      option_a = ?, option_b = ?, option_c = ?, option_d = ?,
      correct_answer = ?, max_marks = ?, duration_sec = ?,
      speed_bonus_max = ?, wrong_penalty = ?, unanswered_score = ?,
      scoring_mode = ?, explanation = ?, category = ?, difficulty = ?, status = ?
    WHERE id = ?
  `).run(
    body.question_number ?? existing.question_number,
    newVersion,
    body.question_text ?? existing.question_text,
    body.option_a ?? existing.option_a,
    body.option_b ?? existing.option_b,
    body.option_c ?? existing.option_c,
    body.option_d ?? existing.option_d,
    (body.correct_answer ?? existing.correct_answer).toUpperCase(),
    body.max_marks ?? existing.max_marks,
    body.duration_sec ?? existing.duration_sec,
    body.speed_bonus_max ?? existing.speed_bonus_max,
    body.wrong_penalty ?? existing.wrong_penalty,
    body.unanswered_score ?? existing.unanswered_score,
    body.scoring_mode ?? existing.scoring_mode,
    body.explanation ?? existing.explanation,
    body.category ?? existing.category,
    body.difficulty ?? existing.difficulty,
    body.status ?? existing.status,
    id
  );

  eventRoom.logAdminAction(admin.id, 'UPDATE_QUESTION', 'question', id, { newVersion, status: body.status });

  return c.json({ success: true, version: newVersion });
});

adminApp.get('/participants', (c) => {
  const query = c.req.query('q') || '';
  const statusFilter = c.req.query('status') || 'all';

  let sql = `
    SELECT 
      p.id, p.display_name, p.gender, p.phone_masked, p.status, p.created_at,
      COALESCE(SUM(r.score), 0) as total_score,
      COALESCE(SUM(r.is_correct), 0) as correct_count,
      COALESCE(AVG(r.response_time_ms), 0) as avg_response_time_ms
    FROM participants p
    LEFT JOIN question_results r ON p.id = r.participant_id
    WHERE 1=1
  `;

  const params = [];
  if (query) {
    sql += ` AND (p.display_name LIKE ? OR p.gender LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
  }
  if (statusFilter !== 'all') {
    sql += ` AND p.status = ?`;
    params.push(statusFilter);
  }

  sql += ` GROUP BY p.id ORDER BY total_score DESC LIMIT 200`;

  const list = db.prepare(sql).all(...params);
  return c.json({ participants: list });
});

adminApp.post('/participants/:id/toggle-status', async (c) => {
  const admin = c.get('adminUser');
  const id = c.req.param('id');
  const p = db.prepare('SELECT * FROM participants WHERE id = ?').get(id);
  if (!p) return c.json({ error: 'NOT_FOUND' }, 404);

  const newStatus = p.status === 'active' ? 'disabled' : 'active';
  db.prepare('UPDATE participants SET status = ? WHERE id = ?').run(newStatus, id);

  eventRoom.logAdminAction(admin.id, 'TOGGLE_USER_STATUS', 'participant', id, { newStatus });

  return c.json({ success: true, newStatus });
});

adminApp.get('/export-csv', (c) => {
  const type = c.req.query('type') || 'leaderboard';
  let csvData = '';

  if (type === 'participants') {
    const rows = db.prepare('SELECT id, display_name, gender, phone_masked, status, created_at FROM participants').all();
    csvData = 'ID,Name,Gender,PhoneMasked,Status,RegisteredAt\n' +
      rows.map(r => `"${r.id}","${r.display_name}","${r.gender}","${r.phone_masked}","${r.status}","${new Date(r.created_at).toISOString()}"`).join('\n');
  } else {
    const rows = eventRoom.getCumulativeLeaderboard();
    csvData = 'Rank,ParticipantID,Name,Gender,TotalScore,CorrectAnswers,AvgResponseTimeSec\n' +
      rows.map(r => `${r.rank},"${r.participant_id}","${r.display_name}","${r.gender}",${r.total_score},${r.correct_count},${r.avg_response_time_sec}`).join('\n');
  }

  return c.text(csvData, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="${type}_export_${Date.now()}.csv"`
  });
});

adminApp.get('/audit-logs', (c) => {
  const logs = db.prepare(`
    SELECT a.*, u.username
    FROM admin_actions a
    LEFT JOIN admin_users u ON a.admin_id = u.id
    ORDER BY a.timestamp DESC LIMIT 100
  `).all();
  return c.json({ logs });
});

adminApp.post('/scoring-simulator', async (c) => {
  const { selectedAnswer, correctAnswer, timeTakenSec, durationSec, baseMarks, maxSpeedBonus, mode } = await c.req.json();
  const startTime = Date.now();
  const receivedAt = startTime + (timeTakenSec * 1000);

  const res = calculateQuestionScore({
    selectedAnswer,
    correctAnswer,
    serverReceivedAt: receivedAt,
    questionStartTime: startTime,
    durationSec,
    maxMarks: baseMarks,
    speedBonusMax: maxSpeedBonus,
    wrongPenalty: 0,
    scoringMode: mode
  });

  return c.json({ simulationResult: res });
});

export { adminApp };
