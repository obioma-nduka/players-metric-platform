const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission } = require('../permissions');

const router = express.Router();

// GET /players – list players (by team). Player role sees only themselves.
router.get('/', authenticateToken, loadUser, (req, res) => {
  const db = req.app.locals.db;
  const { team_id } = req.query;
  const { role, playerId } = req.user;

  try {
    if (role === 'player') {
      if (!playerId) return res.json([]);
      const player = db.prepare(`
        SELECT p.player_id, p.first_name, p.last_name, p.position, p.jersey_number,
               p.height_cm, p.weight_kg, p.is_active, t.name AS team_name
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.team_id
        WHERE p.player_id = ? AND p.is_active = 1
      `).get(playerId);
      return res.json(player ? [player] : []);
    }

    let query = `
      SELECT p.player_id, p.first_name, p.last_name, p.position, p.jersey_number,
             p.height_cm, p.weight_kg, p.is_active, t.name AS team_name
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.is_active = 1
    `;
    const params = [];
    if (team_id) {
      query += ' AND p.team_id = ?';
      params.push(team_id);
    }
    query += ' ORDER BY p.last_name ASC, p.first_name ASC';

    const players = db.prepare(query).all(...params);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /players – create player (admin only)
router.post('/', authenticateToken, loadUser, requirePermission('manage_teams'), (req, res) => {
  const db = req.app.locals.db;
  const {
    team_id, first_name, last_name, date_of_birth, gender,
    position, jersey_number, nationality, height_cm, weight_kg
  } = req.body;

  if (!team_id || !first_name?.trim() || !last_name?.trim()) {
    return res.status(400).json({ error: 'team_id, first_name and last_name are required' });
  }

  const teamExists = db.prepare('SELECT 1 FROM teams WHERE team_id = ?').get(team_id);
  if (!teamExists) {
    return res.status(400).json({ error: 'Invalid team_id' });
  }

  const playerId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO players (
        player_id, team_id, first_name, last_name, date_of_birth, gender,
        position, jersey_number, nationality, height_cm, weight_kg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      playerId, team_id, first_name.trim(), last_name.trim(),
      date_of_birth || null, gender || null, position || null,
      jersey_number || null, nationality || null,
      height_cm != null ? Number(height_cm) : null,
      weight_kg != null ? Number(weight_kg) : null
    );

    res.status(201).json({ player_id: playerId, message: 'Player created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;