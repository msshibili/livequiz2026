import { db } from './db.js';
import { calculateQuestionScore, sortLeaderboard } from './scoringEngine.js';

class LiveEventRoom {
  constructor() {
    this.quizId = 'default_quiz';
    this.status = 'REGISTRATION_OPEN'; // REGISTRATION_OPEN, READY, QUESTION_ACTIVE, QUESTION_RESULTS, PAUSED, FINISHED
    this.currentQuestion = null;
    this.questionStartTime = null;
    this.questionEndTime = null;
    this.pausedTimeRemainingSec = 0;
    this.timerInterval = null;

    this.clients = new Map();
    this.answersMap = new Map();
    this.answerDistribution = { A: 0, B: 0, C: 0, D: 0 };
    this.liveActivityFeed = [];
    this.fastestCorrect = [];

    this.initFromDatabase();
  }

  initFromDatabase() {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(this.quizId);
    if (quiz) {
      this.status = quiz.status;
    }
  }

  setQuizId(newQuizId) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.quizId = newQuizId;
    this.currentQuestion = null;
    this.answersMap.clear();
    this.answerDistribution = { A: 0, B: 0, C: 0, D: 0 };
    this.liveActivityFeed = [];
    
    const activeQuiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(newQuizId);
    if (activeQuiz) {
      this.status = activeQuiz.status || 'REGISTRATION_OPEN';
    } else {
      this.status = 'REGISTRATION_OPEN';
    }

    // Broadcast QUIZ_EVENT_ACTIVATED to ALL connected participants and admins instantly!
    this.broadcast({
      type: 'QUIZ_EVENT_ACTIVATED',
      payload: {
        activeQuizId: newQuizId,
        quizTitle: activeQuiz ? activeQuiz.title : 'Live Quiz Competition',
        eventStatus: this.status,
        serverTime: Date.now()
      }
    });

    this.broadcastStatsUpdate();
  }

  addClient(socketId, ws, role = 'participant', participantData = null) {
    this.clients.set(socketId, {
      ws,
      role,
      participantId: participantData?.id,
      displayName: participantData?.displayName,
      gender: participantData?.gender,
      connectedAt: Date.now()
    });

    const activeQuiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(this.quizId);

    let existingSubmission = null;
    if (participantData?.id && this.currentQuestion) {
      const key = `${this.currentQuestion.id}_${participantData.id}`;
      if (this.answersMap.has(key)) {
        existingSubmission = this.answersMap.get(key);
      } else {
        const subRow = db.prepare('SELECT * FROM submissions WHERE question_id = ? AND participant_id = ?').get(this.currentQuestion.id, participantData.id);
        const resRow = db.prepare('SELECT * FROM question_results WHERE question_id = ? AND participant_id = ?').get(this.currentQuestion.id, participantData.id);
        if (subRow) {
          existingSubmission = {
            participantId: participantData.id,
            displayName: participantData.displayName || 'Participant',
            selectedAnswer: subRow.selected_answer,
            isCorrect: resRow ? resRow.is_correct : 0,
            score: resRow ? resRow.score : 0,
            speedBonus: resRow ? resRow.speed_bonus : 0,
            responseTimeMs: resRow ? resRow.response_time_ms : 0,
            serverReceivedAt: subRow.server_received_at
          };
          this.answersMap.set(key, existingSubmission);
        }
      }
    }

    this.sendToSocket(ws, {
      type: 'INIT_SYNC',
      payload: {
        serverTime: Date.now(),
        activeQuizId: this.quizId,
        quizTitle: activeQuiz ? activeQuiz.title : 'Live Quiz Competition',
        eventStatus: this.status,
        currentQuestion: this.currentQuestion ? this.getSanitizedQuestion(this.currentQuestion) : null,
        questionStartTime: this.questionStartTime,
        questionEndTime: this.questionEndTime,
        timeRemainingSec: this.getTimeRemainingSec(),
        activePlayersCount: this.getActiveParticipantsCount(),
        userSubmission: existingSubmission
      }
    });

    this.broadcastStatsUpdate();
  }

  removeClient(socketId) {
    this.clients.delete(socketId);
    this.broadcastStatsUpdate();
  }

  getActiveParticipantsCount() {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.role === 'participant') count++;
    }
    return count;
  }

  getTimeRemainingSec() {
    if (this.status === 'PAUSED') return this.pausedTimeRemainingSec;
    if (!this.questionEndTime || this.status !== 'QUESTION_ACTIVE') return 0;
    const remaining = Math.max(0, Math.ceil((this.questionEndTime - Date.now()) / 1000));
    return remaining;
  }

  getSanitizedQuestion(question) {
    if (!question) return null;
    return {
      id: question.id,
      question_number: question.question_number,
      version: question.version,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      max_marks: question.max_marks,
      duration_sec: question.duration_sec,
      scoring_mode: question.scoring_mode,
      category: question.category,
      difficulty: question.difficulty
    };
  }

  setEventStatus(newStatus, adminId = 'admin') {
    if (newStatus === 'PAUSED') {
      return this.pauseQuiz(adminId);
    }
    if (newStatus === 'RESUME') {
      return this.resumeQuiz(adminId);
    }
    if (newStatus === 'FINISHED' || newStatus === 'STOPPED') {
      return this.stopQuiz(adminId);
    }

    this.status = newStatus;
    db.prepare('UPDATE quizzes SET status = ? WHERE id = ?').run(newStatus, this.quizId);
    this.logAdminAction(adminId, 'SET_EVENT_STATUS', 'quiz', this.quizId, { newStatus });

    this.broadcast({
      type: 'EVENT_STATUS_CHANGED',
      payload: {
        eventStatus: this.status,
        serverTime: Date.now()
      }
    });
    return { success: true };
  }

  stopQuiz(adminId = 'admin') {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.status = 'FINISHED';
    this.currentQuestion = null;
    this.questionStartTime = null;
    this.questionEndTime = null;
    this.pausedTimeRemainingSec = 0;

    db.prepare('UPDATE quizzes SET status = ? WHERE id = ?').run('FINISHED', this.quizId);
    this.logAdminAction(adminId, 'STOP_QUIZ', 'quiz', this.quizId, {});

    this.broadcast({
      type: 'EVENT_STATUS_CHANGED',
      payload: {
        eventStatus: 'FINISHED',
        currentQuestion: null,
        serverTime: Date.now()
      }
    });

    this.broadcastStatsUpdate();
    return { success: true };
  }

  pauseQuiz(adminId = 'admin') {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.pausedTimeRemainingSec = this.getTimeRemainingSec();
    this.status = 'PAUSED';

    db.prepare('UPDATE quizzes SET status = ? WHERE id = ?').run('PAUSED', this.quizId);
    this.logAdminAction(adminId, 'PAUSE_QUIZ', 'quiz', this.quizId, { remainingSec: this.pausedTimeRemainingSec });

    this.broadcast({
      type: 'EVENT_STATUS_CHANGED',
      payload: {
        eventStatus: 'PAUSED',
        timeRemainingSec: this.pausedTimeRemainingSec,
        serverTime: Date.now()
      }
    });
    return { success: true, remainingSec: this.pausedTimeRemainingSec };
  }

  resumeQuiz(adminId = 'admin') {
    if (!this.currentQuestion) {
      this.status = 'READY';
    } else {
      this.status = 'QUESTION_ACTIVE';
      this.questionStartTime = Date.now();
      this.questionEndTime = Date.now() + (this.pausedTimeRemainingSec * 1000);

      this.timerInterval = setInterval(() => {
        const remainingSec = this.getTimeRemainingSec();
        if (remainingSec <= 0) {
          this.closeCurrentQuestion('TIMER_EXPIRED');
        } else {
          this.broadcast({
            type: 'TIMER_TICK',
            payload: { remainingSec, serverTime: Date.now() }
          });
        }
      }, 1000);
    }

    db.prepare('UPDATE quizzes SET status = ? WHERE id = ?').run(this.status, this.quizId);
    this.logAdminAction(adminId, 'RESUME_QUIZ', 'quiz', this.quizId, { status: this.status });

    this.broadcast({
      type: 'EVENT_STATUS_CHANGED',
      payload: {
        eventStatus: this.status,
        questionStartTime: this.questionStartTime,
        questionEndTime: this.questionEndTime,
        timeRemainingSec: this.pausedTimeRemainingSec,
        serverTime: Date.now()
      }
    });
    return { success: true };
  }

  publishNextQuestion(questionId = null, adminId = 'admin') {
    if (this.timerInterval) clearInterval(this.timerInterval);

    let nextQ = null;
    if (questionId && typeof questionId === 'string' && questionId.trim() !== '') {
      nextQ = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId.trim());
    }
    
    if (!nextQ) {
      nextQ = db.prepare(`
        SELECT * FROM questions 
        WHERE quiz_id = ? AND status IN ('READY', 'DRAFT')
        ORDER BY question_number ASC LIMIT 1
      `).get(this.quizId);
    }

    if (!nextQ) {
      return { success: false, message: 'No available question to publish. Please select a question or create one in Question Editor.' };
    }

    db.prepare("UPDATE questions SET status = 'LIVE' WHERE id = ?").run(nextQ.id);

    this.currentQuestion = nextQ;
    this.status = 'QUESTION_ACTIVE';
    this.questionStartTime = Date.now();
    this.questionEndTime = this.questionStartTime + (nextQ.duration_sec * 1000);
    this.pausedTimeRemainingSec = nextQ.duration_sec;
    this.answerDistribution = { A: 0, B: 0, C: 0, D: 0 };
    this.fastestCorrect = [];

    this.logAdminAction(adminId, 'PUBLISH_QUESTION', 'question', nextQ.id, {
      questionNumber: nextQ.question_number
    });

    this.broadcast({
      type: 'NEW_QUESTION_AVAILABLE',
      payload: {
        currentQuestion: this.getSanitizedQuestion(nextQ),
        questionStartTime: this.questionStartTime,
        questionEndTime: this.questionEndTime,
        durationSec: nextQ.duration_sec,
        serverTime: Date.now()
      }
    });

    this.timerInterval = setInterval(() => {
      const remainingSec = this.getTimeRemainingSec();
      if (remainingSec <= 0) {
        this.closeCurrentQuestion('TIMER_EXPIRED');
      } else {
        this.broadcast({
          type: 'TIMER_TICK',
          payload: { remainingSec, serverTime: Date.now() }
        });
      }
    }, 1000);

    return { success: true, question: nextQ };
  }

  extendQuestionTime(extraSec = 10, adminId = 'admin') {
    if (!this.currentQuestion || (this.status !== 'QUESTION_ACTIVE' && this.status !== 'PAUSED')) {
      return { success: false, message: 'No active question to extend.' };
    }

    if (this.status === 'PAUSED') {
      this.pausedTimeRemainingSec += extraSec;
    } else {
      this.questionEndTime += extraSec * 1000;
    }

    this.logAdminAction(adminId, 'EXTEND_TIME', 'question', this.currentQuestion.id, { extraSec });

    this.broadcast({
      type: 'QUESTION_TIME_EXTENDED',
      payload: {
        extraSec,
        newEndTime: this.questionEndTime,
        timeRemainingSec: this.getTimeRemainingSec(),
        serverTime: Date.now()
      }
    });

    return { success: true, newEndTime: this.questionEndTime };
  }

  closeCurrentQuestion(reason = 'ADMIN_ACTION', adminId = 'admin') {
    if (this.timerInterval) clearInterval(this.timerInterval);

    if (!this.currentQuestion) {
      return { success: false, message: 'No active question to close.' };
    }

    this.status = 'QUESTION_RESULTS';
    db.prepare("UPDATE questions SET status = 'CLOSED' WHERE id = ?").run(this.currentQuestion.id);

    if (adminId !== 'system') {
      this.logAdminAction(adminId, 'CLOSE_QUESTION', 'question', this.currentQuestion.id, { reason });
    }

    const results = this.computeQuestionRankings(this.currentQuestion.id);
    const cumulativeLeaderboard = this.getCumulativeLeaderboard();

    db.prepare(`
      INSERT INTO leaderboard_snapshots (id, quiz_id, question_id, snapshot_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('snap_' + Date.now(), this.quizId, this.currentQuestion.id, JSON.stringify(cumulativeLeaderboard), Date.now());

    this.broadcast({
      type: 'QUESTION_CLOSED',
      payload: {
        questionId: this.currentQuestion.id,
        correctAnswer: this.currentQuestion.correct_answer,
        explanation: this.currentQuestion.explanation,
        fastestCorrect: this.fastestCorrect.slice(0, 3),
        cumulativeLeaderboard: cumulativeLeaderboard.slice(0, 20),
        serverTime: Date.now()
      }
    });

    return { success: true };
  }

  submitAnswer(participantId, questionId, selectedAnswer, clientTimestamp = Date.now()) {
    const serverReceivedAt = Date.now();

    if (this.status === 'PAUSED') {
      return { success: false, error: 'QUIZ_PAUSED', message: 'Quiz is currently paused by administrator.' };
    }

    if (this.status !== 'QUESTION_ACTIVE' || !this.currentQuestion || this.currentQuestion.id !== questionId) {
      return { success: false, error: 'QUESTION_NOT_ACTIVE' };
    }

    const key = `${questionId}_${participantId}`;
    if (this.answersMap.has(key)) {
      return { success: false, error: 'ALREADY_SUBMITTED', result: this.answersMap.get(key) };
    }

    const scoringResult = calculateQuestionScore({
      selectedAnswer,
      correctAnswer: this.currentQuestion.correct_answer,
      serverReceivedAt,
      questionStartTime: this.questionStartTime,
      durationSec: this.currentQuestion.duration_sec,
      maxMarks: this.currentQuestion.max_marks,
      speedBonusMax: this.currentQuestion.speed_bonus_max,
      wrongPenalty: this.currentQuestion.wrong_penalty,
      scoringMode: this.currentQuestion.scoring_mode
    });

    const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantId);
    const displayName = participant ? participant.display_name : 'Participant';

    const submissionEntry = {
      participantId,
      displayName,
      selectedAnswer,
      isCorrect: scoringResult.isCorrect,
      score: scoringResult.score,
      speedBonus: 0,
      elapsedSec: scoringResult.elapsedSec,
      responseTimeMs: scoringResult.responseTimeMs,
      serverReceivedAt
    };

    this.answersMap.set(key, submissionEntry);

    if (['A', 'B', 'C', 'D'].includes(selectedAnswer.toUpperCase())) {
      this.answerDistribution[selectedAnswer.toUpperCase()]++;
    }

    try {
      db.prepare(`
        INSERT INTO submissions (
          id, quiz_id, question_id, question_version, participant_id,
          selected_answer, client_timestamp, server_received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        this.quizId, questionId, this.currentQuestion.version, participantId,
        selectedAnswer, clientTimestamp, serverReceivedAt
      );

      db.prepare(`
        INSERT INTO question_results (
          id, quiz_id, question_id, participant_id, selected_answer,
          is_correct, score, speed_bonus, response_time_ms, server_received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        this.quizId, questionId, participantId, selectedAnswer,
        scoringResult.isCorrect, scoringResult.score, 0,
        scoringResult.responseTimeMs, serverReceivedAt
      );
    } catch (e) {}

    if (scoringResult.isCorrect) {
      this.fastestCorrect.push({
        participantId,
        displayName,
        score: scoringResult.score,
        responseTimeSec: (scoringResult.responseTimeMs / 1000).toFixed(2)
      });
      this.fastestCorrect.sort((a, b) => parseFloat(a.responseTimeSec) - parseFloat(b.responseTimeSec));
    }

    this.liveActivityFeed.unshift({
      time: new Date(serverReceivedAt).toLocaleTimeString(),
      displayName,
      questionNumber: this.currentQuestion.question_number,
      isCorrect: scoringResult.isCorrect,
      score: scoringResult.score,
      elapsedSec: scoringResult.elapsedSec,
      selectedAnswer
    });
    if (this.liveActivityFeed.length > 50) this.liveActivityFeed.pop();

    this.broadcastToAdmins({
      type: 'ADMIN_LIVE_ANSWER_EVENT',
      payload: {
        answerDistribution: this.answerDistribution,
        totalAnswers: this.answersMap.size,
        latestFeedItem: this.liveActivityFeed[0],
        fastestLeader: this.fastestCorrect[0] || null
      }
    });

    this.broadcastStatsUpdate();

    return {
      success: true,
      result: submissionEntry
    };
  }

  computeQuestionRankings(questionId) {
    const rows = db.prepare(`
      SELECT r.*, p.display_name, p.gender
      FROM question_results r
      JOIN participants p ON r.participant_id = p.id
      WHERE r.question_id = ?
      ORDER BY r.score DESC, r.response_time_ms ASC
    `).all(questionId);

    let rank = 1;
    const updateStmt = db.prepare('UPDATE question_results SET question_rank = ? WHERE id = ?');
    for (const row of rows) {
      row.question_rank = rank;
      updateStmt.run(rank, row.id);
      rank++;
    }

    return rows;
  }

  getCumulativeLeaderboard() {
    const totalResults = db.prepare("SELECT COUNT(*) as count FROM question_results").get().count;
    if (totalResults === 0) {
      return [];
    }

    const rows = db.prepare(`
      SELECT 
        p.id as participant_id,
        p.display_name,
        p.gender,
        COALESCE(SUM(r.score), 0) as total_score,
        COALESCE(SUM(r.is_correct), 0) as correct_count,
        COALESCE(AVG(r.response_time_ms), 0) as avg_response_time_ms,
        COALESCE(MAX(r.server_received_at), 0) as latest_submission_time
      FROM participants p
      LEFT JOIN question_results r ON p.id = r.participant_id
      WHERE p.status = 'active'
      GROUP BY p.id
    `).all();

    const sorted = sortLeaderboard(rows);
    return sorted.map((entry, index) => ({
      rank: index + 1,
      participant_id: entry.participant_id,
      display_name: entry.display_name,
      gender: entry.gender,
      total_score: entry.total_score,
      correct_count: entry.correct_count,
      avg_response_time_sec: (entry.avg_response_time_ms / 1000).toFixed(2)
    }));
  }

  sendToSocket(ws, data) {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === 1) client.ws.send(payload);
    }
  }

  broadcastToAdmins(data) {
    const payload = JSON.stringify(data);
    for (const client of this.clients.values()) {
      if (client.role === 'admin' && client.ws.readyState === 1) {
        client.ws.send(payload);
      }
    }
  }

  broadcastStatsUpdate() {
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

    const activeQuiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(this.quizId);

    this.broadcastToAdmins({
      type: 'ADMIN_STATS_UPDATE',
      payload: {
        registeredUsers: totalRegistered,
        activePlayers: this.getActiveParticipantsCount(),
        questionsPublished: publishedQCount,
        questionsCompleted: completedQCount,
        submissionsReceived: submissionsCount,
        currentQuestionNumber: this.currentQuestion ? this.currentQuestion.question_number : 0,
        highestScore: scoreStats?.highest || 0,
        averageScore: Math.round(scoreStats?.avgScore || 0),
        activeQuizId: this.quizId,
        quizTitle: activeQuiz ? activeQuiz.title : 'Live Quiz Competition'
      }
    });
  }

  logAdminAction(adminId, action, targetType, targetId, metadata) {
    db.prepare(`
      INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      adminId, action, targetType, targetId, Date.now(), JSON.stringify(metadata)
    );
  }
}

export const eventRoom = new LiveEventRoom();
