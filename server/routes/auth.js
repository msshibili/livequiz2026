import { Hono } from 'hono';
import crypto from 'crypto';
import { db, hashPassword } from '../db.js';
import { rateLimitAdminLogin } from '../middleware/adminAuth.js';
import { eventRoom } from '../eventRoom.js';

const authApp = new Hono();

function maskPhoneNumber(phone) {
  if (!phone) return 'N/A';
  return phone.trim();
}

// Participant Registration
authApp.post('/register-participant', async (c) => {
  try {
    const { displayName, gender, phone } = await c.req.json();

    if (!displayName || !gender) {
      return c.json({ error: 'MISSING_FIELDS', message: 'Display Name and Gender are required.' }, 400);
    }

    const maskedPhone = maskPhoneNumber(phone);
    const cleanName = displayName.trim();

    // Check if participant already exists by phone or name to handle re-login seamlessly
    let existingParticipant = null;
    if (phone && phone.trim() !== '') {
      existingParticipant = db.prepare('SELECT * FROM participants WHERE phone_masked = ?').get(maskedPhone);
    }
    if (!existingParticipant) {
      existingParticipant = db.prepare('SELECT * FROM participants WHERE LOWER(display_name) = ?').get(cleanName.toLowerCase());
    }

    if (existingParticipant) {
      if (existingParticipant.status === 'disabled') {
        db.prepare("UPDATE participants SET status = 'active' WHERE id = ?").run(existingParticipant.id);
        existingParticipant.status = 'active';
      }
      return c.json({
        success: true,
        participant: {
          id: existingParticipant.id,
          displayName: existingParticipant.display_name,
          gender: existingParticipant.gender,
          phoneMasked: existingParticipant.phone_masked,
          authToken: existingParticipant.auth_token
        }
      });
    }

    const authToken = 'ptoken_' + crypto.randomBytes(16).toString('hex');
    const participantId = 'p_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');

    db.prepare(`
      INSERT INTO participants (id, display_name, gender, phone_masked, auth_token, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(participantId, cleanName, gender.trim(), maskedPhone, authToken, Date.now());

    // Broadcast live participant registration event to all Admin Control Room sessions!
    eventRoom.broadcastStatsUpdate();
    eventRoom.broadcastToAdmins({
      type: 'ADMIN_PARTICIPANT_REGISTERED',
      payload: {
        participant: {
          id: participantId,
          display_name: displayName.trim(),
          gender: gender.trim(),
          phone_masked: maskedPhone,
          status: 'active',
          created_at: Date.now()
        }
      }
    });

    return c.json({
      success: true,
      participant: {
        id: participantId,
        displayName: displayName.trim(),
        gender: gender.trim(),
        phoneMasked: maskedPhone,
        authToken
      }
    });
  } catch (err) {
    return c.json({ error: 'REGISTRATION_FAILED', message: err.message }, 500);
  }
});

// Participant Sync via Token
authApp.post('/participant-sync', async (c) => {
  try {
    const { token } = await c.req.json();
    if (!token) return c.json({ error: 'NO_TOKEN' }, 400);

    const p = db.prepare('SELECT * FROM participants WHERE auth_token = ?').get(token);
    if (!p || p.status !== 'active') {
      return c.json({ error: 'INVALID_PARTICIPANT' }, 401);
    }

    return c.json({
      success: true,
      participant: {
        id: p.id,
        displayName: p.display_name,
        gender: p.gender,
        phoneMasked: p.phone_masked,
        authToken: p.auth_token
      }
    });
  } catch (err) {
    return c.json({ error: 'SYNC_FAILED', message: err.message }, 500);
  }
});

// Secret Admin Login
authApp.post('/admin-login', rateLimitAdminLogin, async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: 'MISSING_CREDENTIALS', message: 'Username and password required.' }, 400);
    }

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
      return c.json({ error: 'INVALID_CREDENTIALS', message: 'Invalid admin credentials.' }, 401);
    }

    const pwdHash = hashPassword(password);
    if (pwdHash !== admin.password_hash) {
      return c.json({ error: 'INVALID_CREDENTIALS', message: 'Invalid admin credentials.' }, 401);
    }

    const sessionToken = 'adm_sess_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + (12 * 60 * 60 * 1000);

    db.prepare(`
      INSERT INTO admin_sessions (id, admin_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('sess_' + Date.now(), admin.id, sessionToken, expiresAt, Date.now());

    db.prepare(`
      INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, timestamp, metadata)
      VALUES (?, ?, 'ADMIN_LOGIN', 'session', ?, ?, ?)
    `).run('act_' + Date.now(), admin.id, sessionToken, Date.now(), JSON.stringify({ username }));

    return c.json({
      success: true,
      adminToken: sessionToken,
      adminUser: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    return c.json({ error: 'LOGIN_ERROR', message: err.message }, 500);
  }
});

authApp.post('/admin-logout', async (c) => {
  const token = c.req.header('Authorization')?.substring(7);
  if (token) {
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
  }
  return c.json({ success: true });
});

export { authApp };
