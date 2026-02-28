const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission } = require('../permissions');

const router = express.Router();

// GET /teams – list teams (authenticated)
router.get('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  try {
    const teams = db.prepare(`
      SELECT team_id, name, sport, league, country, founded_year, is_active
      FROM teams
      WHERE is_active = 1
      ORDER BY name ASC
    `).all();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /teams – create team (admin only)
router.post('/', authenticateToken, loadUser, requirePermission('manage_teams'), (req, res) => {
  const db = req.app.locals.db;
  const { name, sport, league, country, founded_year } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  const teamId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO teams (team_id, name, sport, league, country, founded_year)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(teamId, name.trim(), sport || null, league || null, country || null, founded_year || null);

    res.status(201).json({
      team_id: teamId,
      name: name.trim(),
      message: 'Team created'
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;