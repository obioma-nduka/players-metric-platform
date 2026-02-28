const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

module.exports = router;