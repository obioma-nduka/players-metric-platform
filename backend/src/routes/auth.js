const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { uuidv4 } = require('../utils/id');

module.exports = function (db) {  
  const router = express.Router();

router.post('/login', (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    let user;
    try {
      user = db.prepare(`
        SELECT user_id, email, role, team_id, player_id, password_hash, is_active
        FROM users WHERE email = ?
      `).get(email.trim().toLowerCase());
    } catch (_) {
      user = db.prepare(`
        SELECT user_id, email, role, team_id, password_hash, is_active
        FROM users WHERE email = ?
      `).get(email.trim().toLowerCase());
    }

    if (!user || !user.is_active || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const playerId = user.player_id || null;
    const token = jwt.sign(
      {
        userId: user.user_id,
        role: user.role,
        teamId: user.team_id,
        playerId,
      },
      process.env.JWT_SECRET || 'dev-secret-change-me-please',
      { expiresIn: '24h' }
    );

    db.prepare('UPDATE users SET last_login = ? WHERE user_id = ?')
      .run(new Date().toISOString(), user.user_id);

    res.json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        team_id: user.team_id,
        player_id: playerId,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me-please');
    const db = req.app.locals.db;
    let row;
    try {
      row = db.prepare(
        'SELECT user_id, email, role, team_id, is_active, player_id FROM users WHERE user_id = ?'
      ).get(decoded.userId);
    } catch (_) {
      row = db.prepare(
        'SELECT user_id, email, role, team_id, is_active FROM users WHERE user_id = ?'
      ).get(decoded.userId);
    }
    if (!row || !row.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    res.json({
      userId: row.user_id,
      email: row.email,
      role: row.role,
      teamId: row.team_id,
      playerId: row.player_id || null,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.post('/register', async (req, res) => {
  const {
    email,
    password,
    first_name,
    last_name,
    role = 'medical_staff',
    team_id,
  } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'All fields are required (email, password, first_name, last_name)' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be self-registered' });
  }

  try {
    // Check if email already exists
    const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12); // 12 rounds is good balance

    let linkedPlayerId = null;

    const insertUser = db.prepare(`
      INSERT INTO users (
        user_id, email, password_hash, first_name, last_name, role, team_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    let assignedTeamId = team_id || null;
    if (role === 'coach' || role === 'head_coach') {
      if (team_id) {
        return res.status(400).json({
          error: 'Coaches and head coaches are not assigned a team at sign-up. Create your team from the dashboard after logging in.',
        });
      }
      assignedTeamId = null;
    }

    if (role === 'player') {
      if (team_id) {
        return res.status(400).json({ error: 'Players cannot choose a team at registration; you will be assigned by staff.' });
      }
      const playerId = uuidv4();
      linkedPlayerId = playerId;
      const run = db.transaction(() => {
        insertUser.run(
          userId,
          email.trim().toLowerCase(),
          passwordHash,
          first_name.trim(),
          last_name.trim(),
          role,
          null
        );
        db.prepare(`
          INSERT INTO players (
            player_id, team_id, first_name, last_name
          ) VALUES (?, NULL, ?, ?)
        `).run(playerId, first_name.trim(), last_name.trim());
        db.prepare(`UPDATE users SET player_id = ? WHERE user_id = ?`).run(playerId, userId);
      });
      run();
    } else {
      insertUser.run(
        userId,
        email.trim().toLowerCase(),
        passwordHash,
        first_name.trim(),
        last_name.trim(),
        role,
        assignedTeamId
      );
    }

    const token = jwt.sign(
      {
        userId,
        role,
        teamId: role === 'player' ? null : assignedTeamId,
        playerId: linkedPlayerId,
      },
      process.env.JWT_SECRET || 'dev-secret-change-me-please',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: userId,
        email,
        first_name,
        last_name,
        role,
        team_id: role === 'player' ? null : assignedTeamId,
        player_id: linkedPlayerId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

return router;
};