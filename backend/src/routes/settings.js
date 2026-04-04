const express = require('express');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission } = require('../permissions');

const router = express.Router();

// GET /settings – admin
router.get('/', authenticateToken, loadUser, requirePermission('manage_settings'), (req, res) => {
  const db = req.app.locals.db;
  try {
    const rows = db.prepare('SELECT setting_key, setting_value, updated_at FROM platform_settings ORDER BY setting_key').all();
    const map = {};
    for (const r of rows) {
      map[r.setting_key] = r.setting_value;
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /settings – body: { key: value, ... }
router.patch('/', authenticateToken, loadUser, requirePermission('manage_settings'), (req, res) => {
  const db = req.app.locals.db;
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'JSON object of key/value settings required' });
  }
  const upsert = db.prepare(`
    INSERT INTO platform_settings (setting_key, setting_value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = datetime('now')
  `);
  try {
    for (const [k, v] of Object.entries(body)) {
      if (typeof k !== 'string' || !k.trim()) continue;
      upsert.run(k.trim(), v == null ? '' : String(v));
    }
    const rows = db.prepare('SELECT setting_key, setting_value, updated_at FROM platform_settings ORDER BY setting_key').all();
    const map = {};
    for (const r of rows) {
      map[r.setting_key] = r.setting_value;
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
