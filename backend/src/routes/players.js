const express = require('express');
const { uuidv4 } = require('../utils/id');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { hasPermission } = require('../permissions');
const { headCoachOwnsTeam } = require('../utils/teamAccess');

const router = express.Router();

function rosterForTeam(db, teamId) {
  const fromTable = db.prepare(`
    SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.position, p.jersey_number,
           p.height_cm, p.weight_kg, p.is_active, t.name AS team_name, NULL AS user_id
    FROM players p
    LEFT JOIN teams t ON p.team_id = t.team_id
    WHERE p.is_active = 1 AND p.team_id = ?
  `).all(teamId);

  const coveredPlayerIds = new Set(fromTable.map((r) => r.player_id).filter(Boolean));

  const teamUsers = db.prepare(`
    SELECT u.user_id, u.email, u.first_name, u.last_name, u.player_id, u.role, t.name AS team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.team_id
    WHERE u.team_id = ? AND u.is_active = 1
  `).all(teamId);

  const supplemental = [];
  for (const u of teamUsers) {
    if (u.player_id && coveredPlayerIds.has(u.player_id)) continue;
    const fn = (u.first_name && String(u.first_name).trim()) || '';
    const ln = (u.last_name && String(u.last_name).trim()) || '';
    supplemental.push({
      player_id: null,
      team_id: teamId,
      first_name: fn || u.email || 'User',
      last_name: ln,
      position: null,
      jersey_number: null,
      height_cm: null,
      weight_kg: null,
      is_active: 1,
      team_name: u.team_name,
      user_id: u.user_id,
    });
  }

  const merged = fromTable.concat(supplemental);
  merged.sort((a, b) => {
    const lc = String(a.last_name || '').localeCompare(String(b.last_name || ''), undefined, { sensitivity: 'base' });
    if (lc !== 0) return lc;
    return String(a.first_name || '').localeCompare(String(b.first_name || ''), undefined, { sensitivity: 'base' });
  });
  return merged;
}

function requireStaffViewPlayers(req, res, next) {
  if (req.user.role === 'player') return next();
  if (!hasPermission(req.user.role, 'view_all_players')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}

const GLOBAL_PLAYER_LIST_ROLES = new Set(['admin', 'medical_staff', 'fitness_coach', 'performance_analyst']);

// GET /players
router.get('/', authenticateToken, loadUser, requireStaffViewPlayers, (req, res) => {
  const db = req.app.locals.db;
  let { team_id } = req.query;
  const { role, playerId, teamId: userTeamId, userId } = req.user;

  try {
    if (role === 'player') {
      if (team_id && userTeamId && team_id === userTeamId) {
        return res.json(rosterForTeam(db, team_id));
      }
      if (!playerId) return res.json([]);
      const player = db.prepare(`
        SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.position, p.jersey_number,
               p.height_cm, p.weight_kg, p.is_active, t.name AS team_name, NULL AS user_id
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.team_id
        WHERE p.player_id = ? AND p.is_active = 1
      `).get(playerId);
      return res.json(player ? [player] : []);
    }

    if (GLOBAL_PLAYER_LIST_ROLES.has(role)) {
      if (team_id) {
        return res.json(rosterForTeam(db, team_id));
      }
      const players = db.prepare(`
        SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.position, p.jersey_number,
               p.height_cm, p.weight_kg, p.is_active, t.name AS team_name, NULL AS user_id
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.team_id
        WHERE p.is_active = 1
        ORDER BY p.last_name ASC, p.first_name ASC
      `).all();
      return res.json(players);
    }

    if (role === 'head_coach' || role === 'coach') {
      if (team_id) {
        const allowed =
          headCoachOwnsTeam(db, userId, team_id) || (userTeamId && team_id === userTeamId);
        if (!allowed) {
          return res.status(403).json({ error: 'You can only view rosters for your team or teams you created' });
        }
        return res.json(rosterForTeam(db, team_id));
      }
      let rows;
      try {
        rows = db.prepare(`
          SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.position, p.jersey_number,
                 p.height_cm, p.weight_kg, p.is_active, t.name AS team_name, NULL AS user_id
          FROM players p
          LEFT JOIN teams t ON p.team_id = t.team_id
          WHERE p.is_active = 1
            AND (
              p.team_id IS NULL
              OR p.team_id IN (SELECT team_id FROM teams WHERE created_by_user_id = ?)
            )
          ORDER BY p.last_name ASC, p.first_name ASC
        `).all(userId);
      } catch (_) {
        rows = db.prepare(`
          SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.position, p.jersey_number,
                 p.height_cm, p.weight_kg, p.is_active, t.name AS team_name, NULL AS user_id
          FROM players p
          LEFT JOIN teams t ON p.team_id = t.team_id
          WHERE p.is_active = 1 AND (p.team_id IS NULL OR p.team_id = ?)
          ORDER BY p.last_name ASC, p.first_name ASC
        `).all(userTeamId || '');
      }
      return res.json(rows);
    }

    if (team_id) {
      return res.json(rosterForTeam(db, team_id));
    }

    const players = db.prepare(`
      SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.position, p.jersey_number,
             p.height_cm, p.weight_kg, p.is_active, t.name AS team_name, NULL AS user_id
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.is_active = 1
      ORDER BY p.last_name ASC, p.first_name ASC
    `).all();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function requireOwnPlayerOrViewAllPlayers(req, res, next) {
  const { role, playerId } = req.user;
  const id = req.params.id;
  if (role === 'player') {
    if (playerId && id === playerId) return next();
    return res.status(403).json({ error: 'You can only access your own data' });
  }
  if (hasPermission(role, 'view_all_players')) return next();
  return res.status(403).json({ error: 'Insufficient permissions' });
}

// GET /players/me/profile
router.get('/me/profile', authenticateToken, loadUser, (req, res) => {
  const db = req.app.locals.db;
  if (req.user.role !== 'player' || !req.user.playerId) {
    return res.status(403).json({ error: 'Player profile only' });
  }
  try {
    const row = db.prepare(`
      SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.date_of_birth, p.gender,
             p.position, p.jersey_number, p.nationality, p.height_cm, p.weight_kg,
             p.is_active, t.name AS team_name, NULL AS user_id
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.player_id = ? AND p.is_active = 1
    `).get(req.user.playerId);
    if (!row) return res.status(404).json({ error: 'Player not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /players/me/profile — no team_id
router.patch('/me/profile', authenticateToken, loadUser, (req, res) => {
  const db = req.app.locals.db;
  if (req.user.role !== 'player' || !req.user.playerId) {
    return res.status(403).json({ error: 'Player profile only' });
  }
  if (req.body.team_id !== undefined) {
    return res.status(403).json({ error: 'Team assignment is managed by your coach or head coach' });
  }
  const id = req.user.playerId;
  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    position,
    jersey_number,
    nationality,
    height_cm,
    weight_kg,
  } = req.body;

  const updates = [];
  const params = [];
  if (first_name !== undefined) {
    if (!String(first_name).trim()) return res.status(400).json({ error: 'first_name cannot be empty' });
    updates.push('first_name = ?');
    params.push(String(first_name).trim());
  }
  if (last_name !== undefined) {
    if (!String(last_name).trim()) return res.status(400).json({ error: 'last_name cannot be empty' });
    updates.push('last_name = ?');
    params.push(String(last_name).trim());
  }
  if (date_of_birth !== undefined) {
    updates.push('date_of_birth = ?');
    params.push(date_of_birth || null);
  }
  if (gender !== undefined) {
    updates.push('gender = ?');
    params.push(gender || null);
  }
  if (position !== undefined) {
    updates.push('position = ?');
    params.push(position || null);
  }
  if (jersey_number !== undefined) {
    updates.push('jersey_number = ?');
    params.push(jersey_number != null ? Number(jersey_number) : null);
  }
  if (nationality !== undefined) {
    updates.push('nationality = ?');
    params.push(nationality || null);
  }
  if (height_cm !== undefined) {
    updates.push('height_cm = ?');
    params.push(height_cm != null ? Number(height_cm) : null);
  }
  if (weight_kg !== undefined) {
    updates.push('weight_kg = ?');
    params.push(weight_kg != null ? Number(weight_kg) : null);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  try {
    params.push(id);
    db.prepare(`UPDATE players SET ${updates.join(', ')}, updated_at = datetime('now') WHERE player_id = ?`).run(...params);
    const row = db.prepare(`
      SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.date_of_birth, p.gender,
             p.position, p.jersey_number, p.nationality, p.height_cm, p.weight_kg,
             p.is_active, t.name AS team_name
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.player_id = ?
    `).get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /players/:id
router.get('/:id', authenticateToken, loadUser, requireOwnPlayerOrViewAllPlayers, (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  try {
    const row = db.prepare(`
      SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.date_of_birth, p.gender,
             p.position, p.jersey_number, p.nationality, p.height_cm, p.weight_kg,
             p.is_active, t.name AS team_name, NULL AS user_id
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.player_id = ? AND p.is_active = 1
    `).get(id);
    if (!row) return res.status(404).json({ error: 'Player not found' });
    if (req.user.role === 'coach' && row.team_id) {
      const onAssigned = req.user.teamId && row.team_id === req.user.teamId;
      const onCreated = headCoachOwnsTeam(db, req.user.userId, row.team_id);
      if (!onAssigned && !onCreated) {
        return res.status(403).json({ error: 'Cannot access players outside your team' });
      }
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function coachMayChangeTeam(db, coachTeamId, playerRow, newTeamId) {
  const oldT = playerRow.team_id;
  const nid = newTeamId === '' || newTeamId === undefined ? undefined : newTeamId;
  if (nid === null || nid === '') {
    return oldT === coachTeamId;
  }
  if (nid !== coachTeamId) return false;
  return !oldT || oldT === coachTeamId;
}

function headCoachMayChangeTeam(db, hcUserId, playerRow, newTeamId) {
  const oldT = playerRow.team_id;
  const nid = newTeamId === '' ? null : newTeamId;
  if (nid === null || nid === '') {
    return !oldT || headCoachOwnsTeam(db, hcUserId, oldT);
  }
  if (!headCoachOwnsTeam(db, hcUserId, nid)) return false;
  return !oldT || headCoachOwnsTeam(db, hcUserId, oldT) || oldT === null;
}

/** Coach: roster moves allowed on assigned team (coachMayChangeTeam) or teams they created (headCoachMayChangeTeam). */
function rosterCoachMayChangeTeam(db, userId, userTeamId, playerRow, newTeamId) {
  if (headCoachMayChangeTeam(db, userId, playerRow, newTeamId)) return true;
  return coachMayChangeTeam(db, userTeamId, playerRow, newTeamId);
}

function requireRosterPermission(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (hasPermission(req.user.role, 'manage_team_roster')) return next();
  return res.status(403).json({ error: 'Insufficient permissions' });
}

// POST /players
router.post('/', authenticateToken, loadUser, requireRosterPermission, (req, res) => {
  const db = req.app.locals.db;
  const {
    team_id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    position,
    jersey_number,
    nationality,
    height_cm,
    weight_kg,
  } = req.body;
  const { role, userId, teamId: userTeamId } = req.user;

  if (!first_name?.trim() || !last_name?.trim()) {
    return res.status(400).json({ error: 'first_name and last_name are required' });
  }

  let tid = team_id === undefined || team_id === '' ? null : team_id;
  if (tid) {
    const teamExists = db.prepare('SELECT 1 FROM teams WHERE team_id = ? AND is_active = 1').get(tid);
    if (!teamExists) {
      return res.status(400).json({ error: 'Invalid or inactive team_id' });
    }
  }

  if (role === 'coach') {
    const onAssigned = userTeamId && tid === userTeamId;
    const onCreated = tid && headCoachOwnsTeam(db, userId, tid);
    if (!onAssigned && !onCreated) {
      return res.status(403).json({ error: 'You can only add players to your assigned team or a team you created' });
    }
  } else if (role === 'head_coach') {
    if (tid && !headCoachOwnsTeam(db, userId, tid)) {
      return res.status(403).json({ error: 'You can only add players to teams you created' });
    }
  }

  const playerId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO players (
        player_id, team_id, first_name, last_name, date_of_birth, gender,
        position, jersey_number, nationality, height_cm, weight_kg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      playerId,
      tid,
      first_name.trim(),
      last_name.trim(),
      date_of_birth || null,
      gender || null,
      position || null,
      jersey_number != null ? Number(jersey_number) : null,
      nationality || null,
      height_cm != null ? Number(height_cm) : null,
      weight_kg != null ? Number(weight_kg) : null
    );

    res.status(201).json({ player_id: playerId, message: 'Player created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /players/:id — admin (full); coach / head coach (team_id, is_active only)
router.patch('/:id', authenticateToken, loadUser, requireRosterPermission, (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const {
    team_id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    position,
    jersey_number,
    nationality,
    height_cm,
    weight_kg,
    is_active,
  } = req.body;
  const { role, userId, teamId: userTeamId } = req.user;

  const playerRow = db.prepare('SELECT player_id, team_id FROM players WHERE player_id = ?').get(id);
  if (!playerRow) return res.status(404).json({ error: 'Player not found' });

  const updates = [];
  const params = [];

  if (role === 'admin') {
    if (team_id !== undefined) {
      const tid = team_id === '' || team_id === null ? null : team_id;
      if (tid) {
        const teamOk = db.prepare('SELECT 1 FROM teams WHERE team_id = ? AND is_active = 1').get(tid);
        if (!teamOk) return res.status(400).json({ error: 'Invalid or inactive team_id' });
      }
      updates.push('team_id = ?');
      params.push(tid);
    }
    if (first_name !== undefined) {
      if (!String(first_name).trim()) return res.status(400).json({ error: 'first_name cannot be empty' });
      updates.push('first_name = ?');
      params.push(String(first_name).trim());
    }
    if (last_name !== undefined) {
      if (!String(last_name).trim()) return res.status(400).json({ error: 'last_name cannot be empty' });
      updates.push('last_name = ?');
      params.push(String(last_name).trim());
    }
    if (date_of_birth !== undefined) {
      updates.push('date_of_birth = ?');
      params.push(date_of_birth || null);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      params.push(gender || null);
    }
    if (position !== undefined) {
      updates.push('position = ?');
      params.push(position || null);
    }
    if (jersey_number !== undefined) {
      updates.push('jersey_number = ?');
      params.push(jersey_number != null ? Number(jersey_number) : null);
    }
    if (nationality !== undefined) {
      updates.push('nationality = ?');
      params.push(nationality || null);
    }
    if (height_cm !== undefined) {
      updates.push('height_cm = ?');
      params.push(height_cm != null ? Number(height_cm) : null);
    }
    if (weight_kg !== undefined) {
      updates.push('weight_kg = ?');
      params.push(weight_kg != null ? Number(weight_kg) : null);
    }
    if (is_active !== undefined) {
      const v = is_active === true || is_active === 1 || is_active === '1';
      updates.push('is_active = ?');
      params.push(v ? 1 : 0);
    }
  } else {
    if (
      first_name !== undefined ||
      last_name !== undefined ||
      date_of_birth !== undefined ||
      gender !== undefined ||
      position !== undefined ||
      jersey_number !== undefined ||
      nationality !== undefined ||
      height_cm !== undefined ||
      weight_kg !== undefined
    ) {
      return res.status(403).json({
        error: 'Only administrators can edit player profile fields; use your profile page to update your own details',
      });
    }
    if (team_id !== undefined) {
      const tid = team_id === '' || team_id === null ? null : team_id;
      if (tid) {
        const teamOk = db.prepare('SELECT 1 FROM teams WHERE team_id = ? AND is_active = 1').get(tid);
        if (!teamOk) return res.status(400).json({ error: 'Invalid or inactive team_id' });
      }
      if (role === 'coach') {
        if (!rosterCoachMayChangeTeam(db, userId, userTeamId, playerRow, tid)) {
          return res.status(403).json({ error: 'Invalid roster change for your role' });
        }
      } else if (role === 'head_coach') {
        if (!headCoachMayChangeTeam(db, userId, playerRow, tid)) {
          return res.status(403).json({ error: 'Invalid roster change for your teams' });
        }
      }
      updates.push('team_id = ?');
      params.push(tid);
    }
    if (is_active !== undefined) {
      if (role === 'coach' && playerRow.team_id) {
        const onAssigned = userTeamId && playerRow.team_id === userTeamId;
        const onCreated = headCoachOwnsTeam(db, userId, playerRow.team_id);
        if (!onAssigned && !onCreated) {
          return res.status(403).json({ error: 'Cannot change players outside your team' });
        }
      }
      if (
        role === 'head_coach' &&
        playerRow.team_id &&
        !headCoachOwnsTeam(db, userId, playerRow.team_id)
      ) {
        return res.status(403).json({ error: 'Cannot change players outside your teams' });
      }
      const v = is_active === true || is_active === 1 || is_active === '1';
      updates.push('is_active = ?');
      params.push(v ? 1 : 0);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    params.push(id);
    db.prepare(`UPDATE players SET ${updates.join(', ')}, updated_at = datetime('now') WHERE player_id = ?`).run(...params);
    const row = db.prepare(`
      SELECT p.player_id, p.team_id, p.first_name, p.last_name, p.position, p.jersey_number,
             p.height_cm, p.weight_kg, p.is_active, t.name AS team_name
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.player_id = ?
    `).get(id);

    const linked = db.prepare('SELECT user_id FROM users WHERE player_id = ?').get(id);
    if (linked) {
      db.prepare(`UPDATE users SET team_id = ?, updated_at = datetime('now') WHERE user_id = ?`).run(
        row.team_id ?? null,
        linked.user_id
      );
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
