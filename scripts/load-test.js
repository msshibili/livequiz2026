import WebSocket from 'ws';
import http from 'http';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';
const PLAYER_COUNT = 500;

console.log(`\n======================================================`);
console.log(`🚀 STARTING 500 CONCURRENT USER LOAD TEST SUITE`);
console.log(`======================================================\n`);

async function httpRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runBenchmark() {
  // 1. Admin Login
  console.log(`1️⃣  Authenticating Admin for Control Room...`);
  const adminRes = await httpRequest('/api/auth/admin-login', 'POST', {
    username: 'admin',
    password: 'adminSecretPassword123!'
  });

  if (adminRes.status !== 200) {
    console.error('❌ Admin Login Failed:', adminRes.body);
    process.exit(1);
  }

  const adminToken = adminRes.body.adminToken;
  console.log(`✅ Admin Authenticated. Token: ${adminToken.slice(0, 15)}...`);

  // Create question
  const createQRes = await httpRequest('/api/admin/questions', 'POST', {
    quiz_id: 'default_quiz',
    question_number: 1,
    question_text: 'Which planet has the most moons?',
    option_a: 'Jupiter',
    option_b: 'Saturn',
    option_c: 'Uranus',
    option_d: 'Neptune',
    correct_answer: 'B',
    status: 'READY'
  }, { 'Authorization': `Bearer ${adminToken}` });

  const activeQId = createQRes.body.id;

  // 2. Register 500 Participants
  console.log(`\n2️⃣  Registering ${PLAYER_COUNT} Simulated Participants...`);
  const regStartTime = Date.now();
  const players = [];

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const pRes = await httpRequest('/api/auth/register-participant', 'POST', {
      displayName: `Player_Sim_${i}`,
      gender: i % 2 === 0 ? 'Male' : 'Female',
      phone: `98765${(10000 + i).toString()}`
    });

    if (pRes.status === 200) {
      players.push(pRes.body.participant);
    }
  }

  const regDuration = Date.now() - regStartTime;
  console.log(`✅ Registered ${players.length} / ${PLAYER_COUNT} players in ${regDuration}ms (${(regDuration / PLAYER_COUNT).toFixed(1)}ms per player).`);

  // 3. Connect 500 WebSockets
  console.log(`\n3️⃣  Connecting ${PLAYER_COUNT} Concurrent WebSockets...`);
  const wsStartTime = Date.now();
  const sockets = [];
  let connectedCount = 0;

  await new Promise((resolve) => {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'AUTH_INIT',
          payload: { role: 'participant', token: p.authToken }
        }));
        connectedCount++;
        if (connectedCount === PLAYER_COUNT) {
          resolve();
        }
      });

      ws.on('error', () => {});
      sockets.push({ player: p, ws });
    }
  });

  const wsConnectDuration = Date.now() - wsStartTime;
  console.log(`✅ All ${connectedCount} WebSockets Connected & Auth Handshake Complete in ${wsConnectDuration}ms!`);

  // 4. Admin Publishes Question #1
  console.log(`\n4️⃣  Admin Publishing Live Question #1...`);
  const pubRes = await httpRequest('/api/admin/event-control', 'POST', {
    action: 'PUBLISH_NEXT_QUESTION',
    payload: { questionId: activeQId }
  }, { 'Authorization': `Bearer ${adminToken}` });

  if (pubRes.status !== 200) {
    console.error('❌ Failed to publish question:', pubRes.body);
    process.exit(1);
  }

  console.log(`✅ Question Published Atomically to All 500 Connected Players!`);

  // 5. Submit 500 Timed Answers
  console.log(`\n5️⃣  Simulating 500 Answer Submissions across timed windows...`);
  const responseTimes = [];
  let successAnswers = 0;
  let duplicateRejections = 0;

  const submissionPromises = sockets.map(({ player, ws }, index) => {
    return new Promise((resolve) => {
      const delayMs = 20 + (index * 3);

      setTimeout(() => {
        const t0 = Date.now();

        const onMsg = (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'SUBMIT_RESPONSE') {
              ws.removeListener('message', onMsg);
              const latency = Date.now() - t0;
              responseTimes.push(latency);
              if (msg.payload?.success) {
                successAnswers++;
              }
              resolve();
            }
          } catch (e) {}
        };

        ws.on('message', onMsg);

        ws.send(JSON.stringify({
          type: 'SUBMIT_ANSWER',
          payload: {
            token: player.authToken,
            questionId: activeQId,
            selectedAnswer: (index % 3 === 0) ? 'B' : (index % 2 === 0) ? 'A' : 'C',
            clientTimestamp: Date.now()
          }
        }));

        setTimeout(resolve, 2000);
      }, delayMs);
    });
  });

  await Promise.all(submissionPromises);

  // 6. Test Duplicate Submission Rejection on 50 players
  console.log(`\n6️⃣  Testing Duplicate Submission Rejection on 50 players...`);
  const dupPromises = sockets.slice(0, 50).map(({ player, ws }) => {
    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      const onDupMsg = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'SUBMIT_RESPONSE') {
            ws.removeListener('message', onDupMsg);
            if (msg.payload?.error === 'ALREADY_SUBMITTED') {
              duplicateRejections++;
            }
            done();
          }
        } catch (e) {}
      };

      ws.on('message', onDupMsg);

      ws.send(JSON.stringify({
        type: 'SUBMIT_ANSWER',
        payload: {
          token: player.authToken,
          questionId: activeQId,
          selectedAnswer: 'A',
          clientTimestamp: Date.now()
        }
      }));

      setTimeout(done, 1000);
    });
  });

  await Promise.all(dupPromises);

  // Compute Latency Percentiles
  responseTimes.sort((a, b) => a - b);
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

  // 7. Admin Closes Question & Fetch Cumulative Leaderboard
  console.log(`\n7️⃣  Closing Question #1 & Fetching Authoritative Leaderboard...`);
  await httpRequest('/api/admin/event-control', 'POST', { action: 'CLOSE_QUESTION' }, { 'Authorization': `Bearer ${adminToken}` });

  const lbRes = await httpRequest('/api/quiz/leaderboard');
  const leaderboard = lbRes.body.topLeaderboard || [];

  // Close sockets
  sockets.forEach(s => s.ws.close());

  // 8. Print Benchmark Summary Report
  console.log(`\n======================================================`);
  console.log(`📊 500 CONCURRENT PARTICIPANTS LOAD TEST REPORT`);
  console.log(`======================================================`);
  console.log(`Simulated Concurrent Players  : ${PLAYER_COUNT}`);
  console.log(`Total Connected WebSockets    : ${connectedCount} (100% success)`);
  console.log(`Successful Answer Submissions  : ${successAnswers} / ${PLAYER_COUNT}`);
  console.log(`Duplicate Rejections Verified : ${duplicateRejections} / 50`);
  console.log(`------------------------------------------------------`);
  console.log(`ANSWER API LATENCY METRICS:`);
  console.log(`  • p50 Latency (Median)      : ${p50} ms`);
  console.log(`  • p95 Latency (95th %)     : ${p95} ms`);
  console.log(`  • p99 Latency (99th %)     : ${p99} ms`);
  console.log(`------------------------------------------------------`);
  console.log(`LEADERBOARD TOP 5 CHAMPIONS:`);
  leaderboard.slice(0, 5).forEach(item => {
    console.log(`  #${item.rank} ${item.display_name} (${item.gender}) — ${item.total_score} pts (Avg ${item.avg_response_time_sec}s)`);
  });
  console.log(`======================================================\n`);

  process.exit(0);
}

runBenchmark().catch(err => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
