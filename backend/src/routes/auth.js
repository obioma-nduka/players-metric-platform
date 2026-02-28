const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

module.exports = function (db) {  
  const router = express.Router();

router.post('/login', (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = db.prepare(`
      SELECT user_id, email, role, team_id, password_hash, is_active
      FROM users WHERE email = ?
    `).get(email.trim().toLowerCase());

    if (!user || !user.is_active || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.role, teamId: user.team_id },
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
        team_id: user.team_id
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

  try {
    // Check if email already exists
    const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12); // 12 rounds is good balance

    db.prepare(`
      INSERT INTO users (
        user_id, email, password_hash, first_name, last_name, role, team_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      userId,
      email.trim().toLowerCase(),
      passwordHash,
      first_name.trim(),
      last_name.trim(),
      role,
      team_id || null
    );

    // Optionally auto-login after register (create JWT)
    const token = jwt.sign(
      { userId, role, teamId: team_id || null },
      process.env.JWT_SECRET || 'dev-secret-change-me',
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
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

return router;
};