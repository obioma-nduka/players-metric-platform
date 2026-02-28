const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-please';

/**
 * Verify JWT and attach decoded payload to req.user (userId, role, teamId).
 * Does not load full user from DB; use requireAuth for that if needed.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded; // { userId, role, teamId }
    next();
  });
}

/**
 * Load full user from DB (including player_id) and attach to req.user.
 * Use after authenticateToken when you need role/player_id from DB.
 */
function loadUser(req, res, next) {
  const db = req.app.locals.db;
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = db.prepare(
    'SELECT user_id, email, role, team_id, is_active FROM users WHERE user_id = ?'
  ).get(req.user.userId);
  if (!user || !user.is_active) {
    return res.status(403).json({ error: 'User not found or inactive' });
  }
  let playerId = null;
  try {
    const row = db.prepare('SELECT player_id FROM users WHERE user_id = ?').get(req.user.userId);
    if (row && row.player_id) playerId = row.player_id;
  } catch (_) { /* column may not exist in old DBs */ }
  req.user = {
    userId: user.user_id,
    email: user.email,
    role: user.role,
    teamId: user.team_id,
    playerId,
    isActive: !!user.is_active,
  };
  next();
}

module.exports = {
  authenticateToken,
  loadUser,
  JWT_SECRET,
};
