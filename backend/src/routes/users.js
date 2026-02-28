const express = require('express');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission } = require('../permissions');

const router = express.Router();

// GET /users – list all users (admin only)
router.get('/', authenticateToken, loadUser, requirePermission('manage_users'), (req, res) => {
  const db = req.app.locals.db;
  try {
    const users = db.prepare(`
      SELECT u.user_id, u.email, u.first_name, u.last_name, u.role, u.team_id, u.player_id, u.is_active, u.last_login, u.created_at,
             t.name AS team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.team_id
      ORDER BY u.created_at DESC
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /users/:id – update role, team_id, is_active, player_id (admin only)
router.patch('/:id', authenticateToken, loadUser, requirePermission('manage_users'), (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { role, team_id, player_id, is_active } = req.body;

  try {
    const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const updates = [];
    const params = [];

    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (team_id !== undefined) {
      updates.push('team_id = ?');
      params.push(team_id === '' || team_id === null ? null : team_id);
    }
    if (player_id !== undefined) {
      updates.push('player_id = ?');
      params.push(player_id === '' || player_id === null ? null : player_id);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      // Accept boolean or number 0/1
      const value = is_active === true || is_active === 1 || is_active === '1';
      params.push(value ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    db.prepare(`UPDATE users SET updated_at = datetime('now'), ${updates.join(', ')} WHERE user_id = ?`).run(...params);

    try {
      const user = db.prepare(`
        SELECT user_id, email, first_name, last_name, role, team_id, is_active, last_login, created_at
        FROM users WHERE user_id = ?
      `).get(id);
      let playerId = null;
      try {
        const row = db.prepare('SELECT player_id FROM users WHERE user_id = ?').get(id);
        if (row) playerId = row.player_id;
      } catch (_) { /* column may not exist */ }
      res.json({ ...user, player_id: playerId });
    } catch (selectErr) {
      res.json({ user_id: id, message: 'Updated' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
