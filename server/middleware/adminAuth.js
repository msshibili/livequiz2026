import { db } from '../db.js';

export function verifyAdminSession(c, next) {
  const authHeader = c.req.header('Authorization');
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Check cookie or query param
    token = c.req.header('X-Admin-Token');
  }

  if (!token) {
    return c.json({ error: 'UNAUTHORIZED_MISSING_TOKEN', message: 'Secret Admin authentication required.' }, 401);
  }

  const session = db.prepare(`
    SELECT s.*, u.username, u.role
    FROM admin_sessions s
    JOIN admin_users u ON s.admin_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, Date.now());

  if (!session) {
    return c.json({ error: 'INVALID_OR_EXPIRED_SESSION', message: 'Admin session expired or invalid.' }, 401);
  }

  c.set('adminUser', {
    id: session.admin_id,
    username: session.username,
    role: session.role
  });

  return next();
}

// In-Memory Rate Limiter for Login Attempts
const loginAttemptsMap = new Map();

export function rateLimitAdminLogin(c, next) {
  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const now = Date.now();
  const attempts = loginAttemptsMap.get(ip) || [];

  // Filter attempts in last 60 seconds
  const recentAttempts = attempts.filter(t => now - t < 60000);

  if (recentAttempts.length >= 5) {
    return c.json({
      error: 'TOO_MANY_REQUESTS',
      message: 'Too many admin login attempts. Please try again in 60 seconds.'
    }, 429);
  }

  recentAttempts.push(now);
  loginAttemptsMap.set(ip, recentAttempts);

  return next();
}
