/**
 * Authoritative Server-Side Scoring Engine
 * Computes scores based on correctness, speed, wrong penalties, and mode rules.
 */

export function calculateQuestionScore({
  selectedAnswer,
  correctAnswer,
  serverReceivedAt,
  questionStartTime,
  durationSec,
  maxMarks = 100
}) {
  const isCorrect = (selectedAnswer && selectedAnswer.toUpperCase() === correctAnswer.toUpperCase()) ? 1 : 0;
  const responseTimeMs = Math.max(0, serverReceivedAt - questionStartTime);
  const elapsedSec = Math.max(0, Math.floor(responseTimeMs / 1000));
  const durationMs = durationSec * 1000;
  const questionEndTime = questionStartTime + durationMs;

  // Check deadline (allow 1s network buffer)
  if (serverReceivedAt > questionEndTime + 1000) {
    return {
      isCorrect: 0,
      score: 0,
      speedBonus: 0,
      elapsedSec,
      responseTimeMs,
      status: 'LATE'
    };
  }

  if (!isCorrect) {
    return {
      isCorrect: 0,
      score: 0,
      speedBonus: 0,
      elapsedSec,
      responseTimeMs,
      status: 'INCORRECT'
    };
  }

  // 1 point deducted from base marks for every second elapsed
  const finalScore = Math.max(0, maxMarks - elapsedSec);

  return {
    isCorrect: 1,
    score: finalScore,
    speedBonus: 0,
    elapsedSec,
    responseTimeMs,
    status: 'CORRECT'
  };
}

/**
 * Sorts participants for cumulative leaderboard with deterministic tie-breaking.
 * Tie-breaking rules:
 * 1. Total Score (DESC)
 * 2. Total Correct Answers (DESC)
 * 3. Average Response Time (ASC)
 * 4. Latest Submission Timestamp (ASC)
 */
export function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => {
    // 1. Total Score
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    // 2. Questions Correct
    if (b.correct_count !== a.correct_count) {
      return b.correct_count - a.correct_count;
    }
    // 3. Average Response Time (lower is better)
    if (a.avg_response_time_ms !== b.avg_response_time_ms) {
      return a.avg_response_time_ms - b.avg_response_time_ms;
    }
    // 4. Earliest final submission
    return (a.latest_submission_time || 0) - (b.latest_submission_time || 0);
  });
}
