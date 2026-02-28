const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me-please', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

router.post('/', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { player_id, metric_type_id, recorded_at, value, notes, context } = req.body;

  if (!player_id || !metric_type_id || !recorded_at || value == null) {
    return res.status(400).json({ error: 'player_id, metric_type_id, recorded_at, value required' });
  }

  const recordId = uuidv4();

  try {
    db.prepare(`
      INSERT INTO health_records (
        record_id, player_id, metric_type_id, recorded_at, value,
        notes, entered_by_user_id, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recordId,
      player_id,
      metric_type_id,
      recorded_at,
      String(value),
      notes || null,
      req.user.userId,
      context ? JSON.stringify(context) : null
    );

    res.status(201).json({ record_id: recordId, message: 'Record created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/player/:playerId', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { playerId } = req.params;
  const { limit = 50, metric_code } = req.query;

  try {
    let query = `
      SELECT r.record_id, r.recorded_at, r.value, r.notes, r.context,
             m.code, m.name, m.unit, m.data_type
      FROM health_records r
      JOIN health_metric_types m ON r.metric_type_id = m.metric_type_id
      WHERE r.player_id = ?
    `;
    const params = [playerId];

    if (metric_code) {
      query += ' AND m.code = ?';
      params.push(metric_code);
    }

    query += ' ORDER BY r.recorded_at DESC LIMIT ?';
    params.push(Number(limit) || 50);

    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/player/:playerId/readiness', authenticateToken, (req, res) => {
  const db = req.app.locals.db;
  const { playerId } = req.params;

  try {
    const latestRmssd = db.prepare(`
      SELECT r.value, r.recorded_at, m.normal_range_low, m.normal_range_high
      FROM health_records r
      JOIN health_metric_types m ON r.metric_type_id = m.metric_type_id
      WHERE r.player_id = ? AND m.code = 'hrv_rmssd'
      ORDER BY r.recorded_at DESC
      LIMIT 1
    `).get(playerId);

    if (!latestRmssd) {
      return res.json({ status: 'unknown', message: 'No HRV data found' });
    }

    const value = Number(latestRmssd.value);
    const low  = latestRmssd.normal_range_low  ?? 20;
    const high = latestRmssd.normal_range_high ?? 100;

    let status = 'unknown';
    let color = 'gray';

    if      (value >= high * 0.9) { status = 'optimal';   color = 'green'; }
    else if (value >= low * 1.1)  { status = 'good';      color = 'lime';  }
    else if (value >= low)        { status = 'moderate';  color = 'yellow';}
    else                          { status = 'poor';      color = 'red';   }

    res.json({
      latest_rmssd: value,
      recorded_at: latestRmssd.recorded_at,
      status,
      color,
      reference_range: { low, high }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;