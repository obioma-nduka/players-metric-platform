const express = require('express');
const { uuidv4 } = require('../utils/id');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission } = require('../permissions');
const { headCoachOwnsTeam } = require('../utils/teamAccess');

const router = express.Router();

function teamsSelectExtra(db) {
  try {
    db.prepare('SELECT created_by_user_id FROM teams LIMIT 1').get();
    return 't.created_by_user_id,';
  } catch (_) {
    return '';
  }
}

function buildTeamsListSql(db) {
  const extra = teamsSelectExtra(db);
  return `
      SELECT t.team_id, t.name, t.sport, t.league, t.country, t.founded_year, t.is_active,
             ${extra}
             (
               (SELECT COUNT(*) FROM players p WHERE p.team_id = t.team_id AND p.is_active = 1)
               + (SELECT COUNT(*) FROM users u
                  WHERE u.team_id = t.team_id AND u.is_active = 1
                  AND (
                    u.player_id IS NULL
                    OR NOT EXISTS (
                      SELECT 1 FROM players p2
                      WHERE p2.player_id = u.player_id AND p2.team_id = t.team_id AND p2.is_active = 1
                    )
                  ))
             ) AS player_count
      FROM teams t
      WHERE t.is_active = 1
      ORDER BY t.name ASC
    `;
}

function canListAllTeamsForFilter(role) {
  return (
    role === 'admin' ||
    role === 'medical_staff' ||
    role === 'fitness_coach' ||
    role === 'performance_analyst'
  );
}

// GET /teams
router.get('/', authenticateToken, loadUser, (req, res) => {
  const db = req.app.locals.db;
  try {
    const { role, userId, teamId: userTeamId } = req.user;
    const teamsListSql = buildTeamsListSql(db);

    if (role === 'player' && !userTeamId) {
      return res.json([]);
    }

    if (canListAllTeamsForFilter(role)) {
      const teams = db.prepare(teamsListSql).all();
      return res.json(teams);
    }

    if (role === 'head_coach' || role === 'coach') {
      const sql = teamsListSql.replace(
        'WHERE t.is_active = 1',
        'WHERE t.is_active = 1 AND (t.created_by_user_id = ? OR (? IS NOT NULL AND t.team_id = ?))'
      );
      try {
        const teams = db.prepare(sql).all(userId, userTeamId || null, userTeamId || null);
        return res.json(teams);
      } catch (err) {
        if (userTeamId) {
          const scopedSql = teamsListSql.replace('WHERE t.is_active = 1', 'WHERE t.is_active = 1 AND t.team_id = ?');
          const team = db.prepare(scopedSql).get(userTeamId);
          return res.json(team ? [team] : []);
        }
        return res.json([]);
      }
    }

    if (role !== 'admin' && userTeamId) {
      const scopedSql = teamsListSql.replace('WHERE t.is_active = 1', 'WHERE t.is_active = 1 AND t.team_id = ?');
      const team = db.prepare(scopedSql).get(userTeamId);
      return res.json(team ? [team] : []);
    }

    const teams = db.prepare(teamsListSql).all();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /teams – admin (no creator); head coach / coach (creator recorded; coach is linked to the new team)
router.post('/', authenticateToken, loadUser, requirePermission('manage_teams'), (req, res) => {
  const db = req.app.locals.db;
  const { name, sport, league, country, founded_year } = req.body;
  const { role, userId } = req.user;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  if (role === 'coach') {
    try {
      const { c } = db
        .prepare(
          `SELECT COUNT(*) AS c FROM teams WHERE created_by_user_id = ? AND is_active = 1`
        )
        .get(userId);
      if (c > 0) {
        return res.status(400).json({
          error: 'You already have a team you created. Edit it from the dashboard or ask an admin to deactivate it before creating another.',
        });
      }
    } catch (_) {
      /* no column — skip guard */
    }
  }

  const recordsCreator = role === 'head_coach' || role === 'coach';
  const teamId = uuidv4();
  try {
    try {
      db.prepare(`
        INSERT INTO teams (team_id, name, sport, league, country, founded_year, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        teamId,
        name.trim(),
        sport || null,
        league || null,
        country || null,
        founded_year || null,
        recordsCreator ? userId : null
      );
    } catch (e) {
      if (!e.message || !String(e.message).includes('no such column')) throw e;
      db.prepare(`
        INSERT INTO teams (team_id, name, sport, league, country, founded_year)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(teamId, name.trim(), sport || null, league || null, country || null, founded_year || null);
    }

    if (recordsCreator) {
      try {
        db.prepare(`UPDATE teams SET created_by_user_id = ? WHERE team_id = ? AND (created_by_user_id IS NULL OR created_by_user_id = '')`).run(
          userId,
          teamId
        );
      } catch (_) { /* ignore */ }
    }

    if (role === 'coach') {
      try {
        db.prepare(`UPDATE users SET team_id = ?, updated_at = datetime('now') WHERE user_id = ?`).run(teamId, userId);
      } catch (_) { /* ignore */ }
    }

    res.status(201).json({
      team_id: teamId,
      name: name.trim(),
      message: 'Team created',
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /teams/:teamId/coaches — users with role coach on this team
router.get('/:teamId/coaches', authenticateToken, loadUser, requirePermission('assign_team_coaches'), (req, res) => {
  const db = req.app.locals.db;
  const { teamId } = req.params;
  const { role, userId } = req.user;
  if (role === 'head_coach' && !headCoachOwnsTeam(db, userId, teamId)) {
    return res.status(403).json({ error: 'You can only view coaches for teams you created' });
  }
  try {
    const rows = db.prepare(`
      SELECT u.user_id, u.email, u.first_name, u.last_name
      FROM users u
      WHERE u.team_id = ? AND u.role = 'coach' AND u.is_active = 1
      ORDER BY u.last_name ASC, u.first_name ASC
    `).all(teamId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /teams/:teamId/assign-coach — body: { user_id } (user must already have role coach)
router.post('/:teamId/assign-coach', authenticateToken, loadUser, requirePermission('assign_team_coaches'), (req, res) => {
  const db = req.app.locals.db;
  const { teamId } = req.params;
  const { user_id } = req.body;
  const { role, userId } = req.user;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  if (role === 'head_coach' && !headCoachOwnsTeam(db, userId, teamId)) {
    return res.status(403).json({ error: 'You can only assign coaches to teams you created' });
  }
  const teamOk = db.prepare('SELECT 1 FROM teams WHERE team_id = ? AND is_active = 1').get(teamId);
  if (!teamOk) return res.status(404).json({ error: 'Team not found' });

  const target = db.prepare('SELECT user_id, role FROM users WHERE user_id = ? AND is_active = 1').get(user_id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin' || target.role === 'player') {
    return res.status(400).json({ error: 'This user cannot be assigned as a coach' });
  }
  if (target.role !== 'coach') {
    return res.status(400).json({
      error: 'User must have the coach role. An administrator can change their role under Users.',
    });
  }

  try {
    db.prepare(`UPDATE users SET team_id = ?, updated_at = datetime('now') WHERE user_id = ?`).run(teamId, user_id);
    res.json({ message: 'Coach assigned to team', user_id, team_id: teamId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /teams/:id – admin any; head coach only teams they created
router.patch('/:id', authenticateToken, loadUser, requirePermission('manage_teams'), (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { name, sport, league, country, founded_year, is_active } = req.body;
  const { role, userId } = req.user;

  const exists = db.prepare('SELECT team_id FROM teams WHERE team_id = ?').get(id);
  if (!exists) return res.status(404).json({ error: 'Team not found' });

  if ((role === 'head_coach' || role === 'coach') && !headCoachOwnsTeam(db, userId, id)) {
    return res.status(403).json({ error: 'You can only edit teams you created' });
  }

  const updates = [];
  const params = [];
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: 'name cannot be empty' });
    updates.push('name = ?');
    params.push(String(name).trim());
  }
  if (sport !== undefined) {
    updates.push('sport = ?');
    params.push(sport || null);
  }
  if (league !== undefined) {
    updates.push('league = ?');
    params.push(league || null);
  }
  if (country !== undefined) {
    updates.push('country = ?');
    params.push(country || null);
  }
  if (founded_year !== undefined) {
    updates.push('founded_year = ?');
    params.push(founded_year != null ? Number(founded_year) : null);
  }
  if (is_active !== undefined) {
    const v = is_active === true || is_active === 1 || is_active === '1';
    updates.push('is_active = ?');
    params.push(v ? 1 : 0);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  try {
    params.push(id);
    db.prepare(`UPDATE teams SET ${updates.join(', ')}, updated_at = datetime('now') WHERE team_id = ?`).run(...params);
    let row;
    try {
      row = db
        .prepare(
          'SELECT team_id, name, sport, league, country, founded_year, is_active, created_by_user_id FROM teams WHERE team_id = ?'
        )
        .get(id);
    } catch (_) {
      row = db
        .prepare('SELECT team_id, name, sport, league, country, founded_year, is_active FROM teams WHERE team_id = ?')
        .get(id);
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
