import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';
import { initDatabase, db } from './db.js';
import { eventRoom } from './eventRoom.js';
import { authApp } from './routes/auth.js';
import { adminApp } from './routes/admin.js';
import { quizApp } from './routes/quiz.js';

// Initialize Database Schema and Seeds
initDatabase();

const app = new Hono();

// Mount REST Route Modules
app.route('/api/auth', authApp);
app.route('/api/admin', adminApp);
app.route('/api/quiz', quizApp);

app.get('/api/health', (c) => c.json({ status: 'ok', serverTime: Date.now() }));

const PORT = 3001;

// Launch Hono Node server
const server = serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`⚡ Live Competitive Quiz Server running on http://localhost:${info.port}`);
  console.log(`🔌 WebSocket Server active on ws://localhost:${info.port}/ws`);
  console.log(`🔒 Secret Admin Control Room Route: /control-room-x7`);
});

// Attach WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const socketId = 'sock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'AUTH_INIT': {
          const { token, role } = data.payload || {};
          let participant = null;

          if (role === 'admin') {
            const session = db.prepare(`
              SELECT s.*, u.username FROM admin_sessions s 
              JOIN admin_users u ON s.admin_id = u.id 
              WHERE s.token = ? AND s.expires_at > ?
            `).get(token, Date.now());

            if (session) {
              eventRoom.addClient(socketId, ws, 'admin', { id: session.admin_id, displayName: session.username });
            } else {
              ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Invalid admin token' }));
            }
          } else {
            if (token) {
              participant = db.prepare('SELECT * FROM participants WHERE auth_token = ?').get(token);
            }
            eventRoom.addClient(socketId, ws, 'participant', participant ? {
              id: participant.id,
              displayName: participant.display_name,
              district: participant.district
            } : null);
          }
          break;
        }

        case 'PING': {
          ws.send(JSON.stringify({
            type: 'PONG',
            payload: { clientTimestamp: data.payload?.clientTimestamp, serverTime: Date.now() }
          }));
          break;
        }

        case 'SUBMIT_ANSWER': {
          const { token, questionId, selectedAnswer, clientTimestamp } = data.payload || {};
          if (!token || !questionId || !selectedAnswer) return;

          const participant = db.prepare('SELECT * FROM participants WHERE auth_token = ?').get(token);
          if (!participant || participant.status !== 'active') {
            ws.send(JSON.stringify({ type: 'SUBMIT_ERROR', error: 'UNAUTHORIZED_PARTICIPANT' }));
            return;
          }

          const res = eventRoom.submitAnswer(participant.id, questionId, selectedAnswer, clientTimestamp);
          ws.send(JSON.stringify({
            type: 'SUBMIT_RESPONSE',
            payload: res
          }));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('WS Message Error:', err);
    }
  });

  ws.on('close', () => {
    eventRoom.removeClient(socketId);
  });

  ws.on('error', () => {
    eventRoom.removeClient(socketId);
  });
});
