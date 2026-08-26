import { Hono } from 'hono';
import { eventRoom } from '../eventRoom.js';
import { db } from '../db.js';

const quizApp = new Hono();

// 1. Participant State Sync Endpoint (HTTP short-polling fallback)
quizApp.get('/sync-state', (c) => {
  return c.json({
    serverTime: Date.now(),
    eventStatus: eventRoom.status,
    currentQuestion: eventRoom.currentQuestion ? eventRoom.getSanitizedQuestion(eventRoom.currentQuestion) : null,
    questionStartTime: eventRoom.questionStartTime,
    questionEndTime: eventRoom.questionEndTime,
    timeRemainingSec: eventRoom.getTimeRemainingSec()
  });
});

// 2. Answer Submission HTTP Fallback (in case WebSockets drop)
quizApp.post('/submit-answer', async (c) => {
  try {
    const { token, questionId, selectedAnswer, clientTimestamp } = await c.req.json();
    if (!token || !questionId || !selectedAnswer) {
      return c.json({ error: 'MISSING_FIELDS' }, 400);
    }

    const participant = db.prepare('SELECT * FROM participants WHERE auth_token = ?').get(token);
    if (!participant || participant.status !== 'active') {
      return c.json({ error: 'UNAUTHORIZED_PARTICIPANT' }, 401);
    }

    const res = eventRoom.submitAnswer(participant.id, questionId, selectedAnswer, clientTimestamp);
    if (!res.success) {
      return c.json(res, 400);
    }

    return c.json(res);
  } catch (err) {
    return c.json({ error: 'SUBMISSION_ERROR', message: err.message }, 500);
  }
});

// 3. Cumulative Leaderboard & Personal Rank Search
quizApp.get('/leaderboard', (c) => {
  const token = c.req.query('token');
  const cumulative = eventRoom.getCumulativeLeaderboard();

  let userPosition = null;
  if (token && cumulative.length > 0) {
    const p = db.prepare('SELECT id FROM participants WHERE auth_token = ?').get(token);
    if (p) {
      const idx = cumulative.findIndex(entry => entry.participant_id === p.id);
      if (idx !== -1) {
        const userEntry = cumulative[idx];
        if (userEntry.correct_count > 0 || userEntry.total_score > 0) {
          const aheadEntry = idx > 0 ? cumulative[idx - 1] : null;
          userPosition = {
            rank: idx + 1,
            score: userEntry.total_score,
            pointsBehindAhead: aheadEntry ? (aheadEntry.total_score - userEntry.total_score) : 0,
            aheadParticipantName: aheadEntry ? aheadEntry.display_name : null
          };
        }
      }
    }
  }

  return c.json({
    topLeaderboard: cumulative.slice(0, 50),
    userPosition
  });
});

export { quizApp };
