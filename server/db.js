import crypto from 'crypto';

class PureJSDatabase {
  constructor() {
    this.tables = {
      participants: new Map(),
      admin_users: new Map(),
      admin_sessions: new Map(),
      admin_actions: new Map(),
      quizzes: new Map(),
      questions: new Map(),
      submissions: new Map(),
      question_results: new Map(),
      leaderboard_snapshots: new Map()
    };
  }

  exec(sql) {}
  pragma(sql) {}

  prepare(sql) {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    const self = this;

    return {
      run(...args) {
        return self.executeRun(cleanSql, args);
      },
      get(...args) {
        return self.executeGet(cleanSql, args);
      },
      all(...args) {
        return self.executeAll(cleanSql, args);
      }
    };
  }

  executeRun(sql, args) {
    if (sql.startsWith('INSERT INTO participants')) {
      if (args.length === 6) {
        const [id, display_name, gender, phone_masked, auth_token, created_at] = args;
        this.tables.participants.set(id, { id, display_name, gender, phone_masked, auth_token, status: 'active', created_at });
      } else {
        const [id, display_name, gender, phone_masked, auth_token, status, created_at] = args;
        this.tables.participants.set(id, { id, display_name, gender, phone_masked, auth_token, status: status || 'active', created_at });
      }
      return { changes: 1 };
    }

    if (sql.startsWith('INSERT INTO admin_users')) {
      const [id, username, password_hash, role, created_at] = args;
      this.tables.admin_users.set(id, { id, username, password_hash, role, created_at });
      return { changes: 1 };
    }

    if (sql.startsWith('INSERT INTO admin_sessions')) {
      const [id, admin_id, token, expires_at, created_at] = args;
      this.tables.admin_sessions.set(id, { id, admin_id, token, expires_at, created_at });
      return { changes: 1 };
    }

    if (sql.startsWith('DELETE FROM admin_sessions WHERE token = ?')) {
      const [token] = args;
      for (const [key, sess] of this.tables.admin_sessions.entries()) {
        if (sess.token === token) this.tables.admin_sessions.delete(key);
      }
      return { changes: 1 };
    }

    if (sql.startsWith('INSERT INTO admin_actions')) {
      const [id, admin_id, action, target_type, target_id, timestamp, metadata] = args;
      this.tables.admin_actions.set(id, { id, admin_id, action, target_type, target_id, timestamp, metadata });
      return { changes: 1 };
    }

    if (sql.startsWith('INSERT INTO quizzes')) {
      const [id, title, status, created_at] = args;
      this.tables.quizzes.set(id, { id, title, status: status || 'REGISTRATION_OPEN', created_at });
      return { changes: 1 };
    }

    if (sql.startsWith('UPDATE quizzes SET status = ? WHERE id = ?')) {
      const [status, id] = args;
      const q = this.tables.quizzes.get(id);
      if (q) q.status = status;
      return { changes: 1 };
    }

    if (sql.startsWith('INSERT INTO questions')) {
      const [
        id, quiz_id, question_number, text, opt_a, opt_b, opt_c, opt_d,
        correct, max_marks, duration_sec, speed_bonus_max, wrong_penalty, unanswered_score,
        mode, explanation, category, difficulty, status, created_at
      ] = args;

      this.tables.questions.set(id, {
        id, quiz_id: quiz_id || 'default_quiz', question_number: question_number || 1, version: 1, question_text: text || '',
        option_a: opt_a || '', option_b: opt_b || '', option_c: opt_c || '', option_d: opt_d || '',
        correct_answer: correct || 'A', max_marks: max_marks || 100, duration_sec: duration_sec || 20, speed_bonus_max: speed_bonus_max || 100,
        wrong_penalty: wrong_penalty || 0, unanswered_score: unanswered_score || 0, scoring_mode: mode || 'LINEAR_SPEED',
        explanation: explanation || '', category: category || 'General', difficulty: difficulty || 'Medium', status: status || 'DRAFT', created_at: created_at || Date.now()
      });
      return { changes: 1 };
    }

    if (sql.includes("UPDATE questions SET status = 'LIVE'") || sql.includes("UPDATE questions SET status = 'CLOSED'") || sql.includes("UPDATE questions SET status = 'READY'")) {
      const statusMatch = sql.match(/status = '(\w+)'/);
      const targetStatus = statusMatch ? statusMatch[1] : 'READY';
      if (args.length > 0) {
        const id = args[0];
        const q = this.tables.questions.get(id);
        if (q) q.status = targetStatus;
      } else {
        for (const q of this.tables.questions.values()) {
          q.status = targetStatus;
        }
      }
      return { changes: 1 };
    }

    if (sql.startsWith('UPDATE questions SET question_number = ?') || sql.startsWith('UPDATE questions SET quiz_id = ?')) {
      const [
        q_quiz_id, num, ver, text, a, b, c, d, correct, marks, dur, bonus, penalty, unans,
        mode, exp, cat, diff, status, id
      ] = args.length === 20 ? args : [undefined, ...args];
      
      const targetId = id || args[args.length - 1];
      const q = this.tables.questions.get(targetId);
      if (q) {
        if (q_quiz_id) q.quiz_id = q_quiz_id;
        q.question_number = num ?? q.question_number;
        q.version = ver ?? q.version;
        q.question_text = text ?? q.question_text;
        q.option_a = a ?? q.option_a;
        q.option_b = b ?? q.option_b;
        q.option_c = c ?? q.option_c;
        q.option_d = d ?? q.option_d;
        q.correct_answer = correct ?? q.correct_answer;
        q.max_marks = marks ?? q.max_marks;
        q.duration_sec = dur ?? q.duration_sec;
        q.speed_bonus_max = bonus ?? q.speed_bonus_max;
        q.wrong_penalty = penalty ?? q.wrong_penalty;
        q.unanswered_score = unans ?? q.unanswered_score;
        q.scoring_mode = mode ?? q.scoring_mode;
        q.explanation = exp ?? q.explanation;
        q.category = cat ?? q.category;
        q.difficulty = diff ?? q.difficulty;
        q.status = status ?? q.status;
      }
      return { changes: 1 };
    }

    if (sql.startsWith('INSERT INTO submissions')) {
      const [id, quiz_id, question_id, question_version, participant_id, selected_answer, client_timestamp, server_received_at] = args;
      for (const sub of this.tables.submissions.values()) {
        if (sub.question_id === question_id && sub.participant_id === participant_id) {
          throw new Error('UNIQUE constraint failed');
        }
      }
      this.tables.submissions.set(id, { id, quiz_id, question_id, question_version, participant_id, selected_answer, client_timestamp, server_received_at });
      return { changes: 1 };
    }

    if (sql.startsWith('INSERT INTO question_results')) {
      const [id, quiz_id, question_id, participant_id, selected_answer, is_correct, score, speed_bonus, response_time_ms, server_received_at] = args;
      this.tables.question_results.set(id, { id, quiz_id, question_id, participant_id, selected_answer, is_correct, score, speed_bonus, response_time_ms, server_received_at, question_rank: null });
      return { changes: 1 };
    }

    if (sql.startsWith('UPDATE question_results SET question_rank = ? WHERE id = ?')) {
      const [rank, id] = args;
      const res = this.tables.question_results.get(id);
      if (res) res.question_rank = rank;
      return { changes: 1 };
    }

    if (sql.startsWith('INSERT INTO leaderboard_snapshots')) {
      const [id, quiz_id, question_id, snapshot_json, created_at] = args;
      this.tables.leaderboard_snapshots.set(id, { id, quiz_id, question_id, snapshot_json, created_at });
      return { changes: 1 };
    }

    if (sql.startsWith('UPDATE participants SET status = ? WHERE id = ?')) {
      const [newStatus, id] = args;
      const p = this.tables.participants.get(id);
      if (p) p.status = newStatus;
      return { changes: 1 };
    }

    if (sql.startsWith('DELETE FROM submissions')) {
      this.tables.submissions.clear();
      return { changes: 1 };
    }
    if (sql.startsWith('DELETE FROM question_results')) {
      this.tables.question_results.clear();
      return { changes: 1 };
    }
    if (sql.startsWith('DELETE FROM leaderboard_snapshots')) {
      this.tables.leaderboard_snapshots.clear();
      return { changes: 1 };
    }
    if (sql.startsWith('DELETE FROM participants')) {
      this.tables.participants.clear();
      return { changes: 1 };
    }
    if (sql.startsWith('DELETE FROM questions')) {
      this.tables.questions.clear();
      return { changes: 1 };
    }

    return { changes: 0 };
  }

  executeGet(sql, args) {
    if (sql.includes('SELECT * FROM admin_users WHERE username = ?')) {
      const [username] = args;
      for (const u of this.tables.admin_users.values()) {
        if (u.username === username) return { ...u };
      }
      return undefined;
    }

    if (sql.includes('FROM admin_sessions s JOIN admin_users u')) {
      const [token, now] = args;
      for (const s of this.tables.admin_sessions.values()) {
        if (s.token === token && s.expires_at > (now || 0)) {
          const u = this.tables.admin_users.get(s.admin_id);
          return { ...s, username: u?.username, role: u?.role };
        }
      }
      return undefined;
    }

    if (sql.includes('SELECT * FROM quizzes WHERE id = ?')) {
      const [id] = args;
      return this.tables.quizzes.get(id) ? { ...this.tables.quizzes.get(id) } : undefined;
    }

    if (sql.includes('SELECT * FROM questions WHERE id = ?')) {
      const [id] = args;
      return this.tables.questions.get(id) ? { ...this.tables.questions.get(id) } : undefined;
    }

    if (sql.includes('SELECT * FROM questions WHERE quiz_id = ? AND status IN')) {
      const [quizId] = args;
      const list = Array.from(this.tables.questions.values())
        .filter(q => q.quiz_id === quizId && (q.status === 'READY' || q.status === 'DRAFT'))
        .sort((a, b) => a.question_number - b.question_number);
      return list[0] ? { ...list[0] } : undefined;
    }

    if (sql.includes('SELECT * FROM participants WHERE auth_token = ?')) {
      const [token] = args;
      for (const p of this.tables.participants.values()) {
        if (p.auth_token === token) return { ...p };
      }
      return undefined;
    }

    if (sql.includes('SELECT * FROM participants WHERE id = ?')) {
      const [id] = args;
      return this.tables.participants.get(id) ? { ...this.tables.participants.get(id) } : undefined;
    }

    if (sql.includes('SELECT COUNT(*) as count FROM participants')) {
      return { count: this.tables.participants.size };
    }

    if (sql.includes('SELECT COUNT(*) as count FROM question_results')) {
      return { count: this.tables.question_results.size };
    }

    if (sql.includes('SELECT COUNT(*) as count FROM questions WHERE status IN')) {
      if (sql.includes("('LIVE', 'CLOSED', 'SCORED')")) {
        const c = Array.from(this.tables.questions.values()).filter(q => ['LIVE', 'CLOSED', 'SCORED'].includes(q.status)).length;
        return { count: c };
      }
      if (sql.includes("('CLOSED', 'SCORED')")) {
        const c = Array.from(this.tables.questions.values()).filter(q => ['CLOSED', 'SCORED'].includes(q.status)).length;
        return { count: c };
      }
    }

    if (sql.includes('SELECT COUNT(*) as count FROM questions')) {
      return { count: this.tables.questions.size };
    }

    if (sql.includes('SELECT COUNT(*) as count FROM submissions')) {
      return { count: this.tables.submissions.size };
    }

    if (sql.includes('SELECT MAX(total_score) as highest, AVG(total_score) as avgScore')) {
      const totalsMap = new Map();
      for (const r of this.tables.question_results.values()) {
        totalsMap.set(r.participant_id, (totalsMap.get(r.participant_id) || 0) + r.score);
      }
      const vals = Array.from(totalsMap.values());
      if (vals.length === 0) return { highest: 0, avgScore: 0 };
      const highest = Math.max(...vals);
      const avgScore = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { highest, avgScore };
    }

    return undefined;
  }

  executeAll(sql, args = []) {
    if (sql.includes('SELECT * FROM quizzes ORDER BY created_at DESC')) {
      return Array.from(this.tables.quizzes.values())
        .sort((a, b) => b.created_at - a.created_at);
    }

    if (sql.includes('SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_number ASC')) {
      const [quizId] = args;
      return Array.from(this.tables.questions.values())
        .filter(q => !quizId || q.quiz_id === quizId)
        .sort((a, b) => a.question_number - b.question_number);
    }

    if (sql.includes('SELECT * FROM questions ORDER BY question_number ASC')) {
      return Array.from(this.tables.questions.values())
        .sort((a, b) => a.question_number - b.question_number);
    }

    if (sql.includes('SELECT r.*, p.display_name, p.gender FROM question_results r') || sql.includes('SELECT r.*, p.display_name, p.district FROM question_results r')) {
      const [questionId] = args;
      const list = [];
      for (const r of this.tables.question_results.values()) {
        if (r.question_id === questionId) {
          const p = this.tables.participants.get(r.participant_id);
          list.push({ ...r, display_name: p?.display_name || 'Player', gender: p?.gender || 'Male' });
        }
      }
      return list.sort((a, b) => b.score !== a.score ? b.score - a.score : a.response_time_ms - b.response_time_ms);
    }

    if (sql.includes('FROM participants p LEFT JOIN question_results r') || sql.includes('FROM participants p JOIN question_results r')) {
      const results = [];
      for (const p of this.tables.participants.values()) {
        let total_score = 0;
        let correct_count = 0;
        let total_time_ms = 0;
        let q_count = 0;
        let latest_submission_time = 0;

        for (const r of this.tables.question_results.values()) {
          if (r.participant_id === p.id) {
            total_score += r.score;
            if (r.is_correct) correct_count++;
            total_time_ms += r.response_time_ms;
            q_count++;
            if (r.server_received_at > latest_submission_time) {
              latest_submission_time = r.server_received_at;
            }
          }
        }

        const avg_response_time_ms = q_count > 0 ? (total_time_ms / q_count) : 0;
        results.push({
          id: p.id,
          participant_id: p.id,
          display_name: p.display_name,
          gender: p.gender || 'Male',
          phone_masked: p.phone_masked,
          status: p.status,
          created_at: p.created_at,
          total_score,
          correct_count,
          avg_response_time_ms,
          latest_submission_time
        });
      }

      let filtered = results;
      if (sql.includes('LIKE ?')) {
        const query = (args[0] || '').replace(/%/g, '').toLowerCase();
        filtered = filtered.filter(item => item.display_name.toLowerCase().includes(query) || (item.gender && item.gender.toLowerCase().includes(query)));
      }
      return filtered;
    }

    if (sql.includes('SELECT a.*, u.username FROM admin_actions a')) {
      const list = [];
      for (const a of this.tables.admin_actions.values()) {
        const u = this.tables.admin_users.get(a.admin_id);
        list.push({ ...a, username: u?.username || 'Admin' });
      }
      return list.sort((a, b) => b.timestamp - a.timestamp);
    }

    if (sql.includes('SELECT id, display_name, gender, phone_masked, status, created_at FROM participants') || sql.includes('SELECT id, display_name, district, phone_masked, status, created_at FROM participants')) {
      return Array.from(this.tables.participants.values());
    }

    return [];
  }
}

const db = new PureJSDatabase();

export function initDatabase() {
  db.exec('');
  seedDefaultAdminAndQuiz();
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'SSF_QUIZ_SALT_2026').digest('hex');
}

function seedDefaultAdminAndQuiz() {
  const adminId = 'admin_super_1';
  const pwdHash = hashPassword('adminSecretPassword123!');
  db.prepare(`
    INSERT INTO admin_users (id, username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'admin', pwdHash, 'admin', Date.now());

  const quizId = 'default_quiz';
  db.prepare(`
    INSERT INTO quizzes (id, title, status, created_at)
    VALUES (?, ?, ?, ?)
  `).run(quizId, 'Live Quiz Competition by SSF Kurukathani Unit', 'REGISTRATION_OPEN', Date.now());

  // Seed default sample questions if questions table is empty
  const sampleQuestions = [
    {
      id: 'q_seed_1',
      quiz_id: quizId,
      question_number: 1,
      question_text: 'Which state is known as the Land of 5 Rivers in India?',
      option_a: 'Punjab',
      option_b: 'Kerala',
      option_c: 'Tamil Nadu',
      option_d: 'Gujarat',
      correct_answer: 'A',
      max_marks: 100,
      duration_sec: 20,
      speed_bonus_max: 100,
      explanation: 'Punjab derives its name from five rivers: Beas, Jhelum, Chenab, Ravi, and Sutlej.',
      category: 'General Knowledge',
      difficulty: 'Easy',
      status: 'READY'
    },
    {
      id: 'q_seed_2',
      quiz_id: quizId,
      question_number: 2,
      question_text: 'What is the capital city of India?',
      option_a: 'Mumbai',
      option_b: 'New Delhi',
      option_c: 'Kolkata',
      option_d: 'Chennai',
      correct_answer: 'B',
      max_marks: 100,
      duration_sec: 20,
      speed_bonus_max: 100,
      explanation: 'New Delhi was declared as the capital of India in 1911.',
      category: 'General Knowledge',
      difficulty: 'Easy',
      status: 'READY'
    },
    {
      id: 'q_seed_3',
      quiz_id: quizId,
      question_number: 3,
      question_text: 'Which element has the chemical symbol "O"?',
      option_a: 'Gold',
      option_b: 'Osmium',
      option_c: 'Oxygen',
      option_d: 'Zinc',
      correct_answer: 'C',
      max_marks: 100,
      duration_sec: 20,
      speed_bonus_max: 100,
      explanation: 'Oxygen is represented by the symbol O and atomic number 8.',
      category: 'Science',
      difficulty: 'Easy',
      status: 'READY'
    },
    {
      id: 'q_seed_4',
      quiz_id: quizId,
      question_number: 4,
      question_text: 'Which organ pumps blood throughout the human body?',
      option_a: 'Lungs',
      option_b: 'Brain',
      option_c: 'Liver',
      option_d: 'Heart',
      correct_answer: 'D',
      max_marks: 100,
      duration_sec: 20,
      speed_bonus_max: 100,
      explanation: 'The heart is the primary organ responsible for circulating blood.',
      category: 'Science',
      difficulty: 'Easy',
      status: 'READY'
    },
    {
      id: 'q_seed_5',
      quiz_id: quizId,
      question_number: 5,
      question_text: 'What is the largest planet in our solar system?',
      option_a: 'Jupiter',
      option_b: 'Saturn',
      option_c: 'Mars',
      option_d: 'Earth',
      correct_answer: 'A',
      max_marks: 100,
      duration_sec: 20,
      speed_bonus_max: 100,
      explanation: 'Jupiter is the largest planet, with a mass more than two and a half times that of all other planets combined.',
      category: 'Science',
      difficulty: 'Medium',
      status: 'READY'
    }
  ];

  for (const q of sampleQuestions) {
    db.prepare(`
      INSERT INTO questions (
        id, quiz_id, question_number, version, question_text,
        option_a, option_b, option_c, option_d, correct_answer,
        max_marks, duration_sec, speed_bonus_max, wrong_penalty, unanswered_score,
        scoring_mode, explanation, category, difficulty, status, created_at
      ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'LINEAR_SPEED', ?, ?, ?, ?, ?)
    `).run(
      q.id, q.quiz_id, q.question_number, q.question_text,
      q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer,
      q.max_marks, q.duration_sec, q.speed_bonus_max, q.explanation,
      q.category, q.difficulty, q.status, Date.now()
    );
  }
}

export { db, hashPassword };
