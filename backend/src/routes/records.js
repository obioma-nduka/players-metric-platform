const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uuidv4 } = require('../utils/id');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission, requireOwnPlayerOrPermission, hasPermission } = require('../permissions');

const router = express.Router();

function canAccessPlayerHealthData(req, playerId) {
  const { role, playerId: uidPlayer, teamId: userTeamId } = req.user;
  if (role === 'player') {
    return uidPlayer && uidPlayer === playerId;
  }
  if (!hasPermission(role, 'view_all_metrics')) return false;
  if (role === 'admin') return true;
  if (['medical_staff', 'fitness_coach', 'performance_analyst'].includes(role)) return true;
  if (!userTeamId) return true;
  const row = dbPlayerTeam(req.app.locals.db, playerId);
  return !row || !row.team_id || row.team_id === userTeamId;
}

function dbPlayerTeam(db, playerId) {
  return db.prepare('SELECT team_id FROM players WHERE player_id = ?').get(playerId);
}

// POST /health-records – add record (medical_staff, fitness_coach, admin)
router.post('/', authenticateToken, loadUser, requirePermission('add_health_records'), (req, res) => {
  const db = req.app.locals.db;
  const { player_id, metric_type_id, recorded_at, value, notes, context } = req.body;

  if (!player_id || !metric_type_id || !recorded_at || value == null) {
    return res.status(400).json({ error: 'player_id, metric_type_id, recorded_at, value required' });
  }

  if (!canAccessPlayerHealthData(req, player_id)) {
    return res.status(403).json({ error: 'Cannot add records for this player' });
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

// GET /health-records/player/:playerId – player can only access own
router.get('/player/:playerId', authenticateToken, loadUser, requireOwnPlayerOrPermission('view_all_metrics'), (req, res) => {
  const db = req.app.locals.db;
  const { playerId } = req.params;
  const { limit = 50, metric_code } = req.query;

  if (req.user.role !== 'player' && !canAccessPlayerHealthData(req, playerId)) {
    return res.status(403).json({ error: 'Cannot access this player\'s records' });
  }

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

// GET /health-records/player/:playerId/readiness
router.get('/player/:playerId/readiness', authenticateToken, loadUser, requireOwnPlayerOrPermission('view_all_metrics'), (req, res) => {
  const db = req.app.locals.db;
  const { playerId } = req.params;

  if (req.user.role !== 'player' && !canAccessPlayerHealthData(req, playerId)) {
    return res.status(403).json({ error: 'Cannot access this player\'s data' });
  }

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
    const low = latestRmssd.normal_range_low ?? 20;
    const high = latestRmssd.normal_range_high ?? 100;

    let status = 'unknown';
    let color = 'gray';

    if (value >= high * 0.9) { status = 'optimal'; color = 'green'; }
    else if (value >= low * 1.1) { status = 'good'; color = 'lime'; }
    else if (value >= low) { status = 'moderate'; color = 'yellow'; }
    else { status = 'poor'; color = 'red'; }

    res.json({
      latest_rmssd: value,
      recorded_at: latestRmssd.recorded_at,
      status,
      color,
      reference_range: { low, high },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function loadRecord(db, recordId) {
  return db.prepare(`
    SELECT r.record_id, r.player_id, r.metric_type_id, r.recorded_at, r.value, r.notes, r.context, r.entered_by_user_id
    FROM health_records r
    WHERE r.record_id = ?
  `).get(recordId);
}

// PATCH /health-records/:recordId
router.patch('/:recordId', authenticateToken, loadUser, requirePermission('edit_health_records'), (req, res) => {
  const db = req.app.locals.db;
  const { recordId } = req.params;
  const { recorded_at, value, notes, context } = req.body;

  const rec = loadRecord(db, recordId);
  if (!rec) return res.status(404).json({ error: 'Record not found' });
  if (!canAccessPlayerHealthData(req, rec.player_id)) {
    return res.status(403).json({ error: 'Cannot edit records for this player' });
  }

  const updates = [];
  const params = [];
  if (recorded_at !== undefined) {
    updates.push('recorded_at = ?');
    params.push(recorded_at);
  }
  if (value !== undefined) {
    updates.push('value = ?');
    params.push(String(value));
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes || null);
  }
  if (context !== undefined) {
    updates.push('context = ?');
    params.push(context ? JSON.stringify(context) : null);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  try {
    params.push(recordId);
    db.prepare(`UPDATE health_records SET ${updates.join(', ')}, updated_at = datetime('now') WHERE record_id = ?`).run(...params);
    const updated = loadRecord(db, recordId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /health-records/:recordId
router.delete('/:recordId', authenticateToken, loadUser, requirePermission('edit_health_records'), (req, res) => {
  const db = req.app.locals.db;
  const { recordId } = req.params;
  const rec = loadRecord(db, recordId);
  if (!rec) return res.status(404).json({ error: 'Record not found' });
  if (!canAccessPlayerHealthData(req, rec.player_id)) {
    return res.status(403).json({ error: 'Cannot delete records for this player' });
  }
  try {
    db.prepare('DELETE FROM attachments WHERE record_id = ?').run(recordId);
    db.prepare('DELETE FROM health_records WHERE record_id = ?').run(recordId);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, req.app.locals.uploadDir || path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

// POST /health-records/:recordId/attachments
router.post('/:recordId/attachments', authenticateToken, loadUser, requirePermission('add_health_records'), upload.single('file'), (req, res) => {
  const db = req.app.locals.db;
  const { recordId } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'file is required (multipart field name: file)' });
  }
  const rec = loadRecord(db, recordId);
  if (!rec) {
    try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
    return res.status(404).json({ error: 'Record not found' });
  }
  if (!canAccessPlayerHealthData(req, rec.player_id)) {
    try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
    return res.status(403).json({ error: 'Cannot attach files to this record' });
  }
  const attachmentId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO attachments (
        attachment_id, record_id, file_name, storage_path, mime_type, file_size_bytes, uploaded_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      attachmentId,
      recordId,
      req.file.originalname || 'upload',
      req.file.filename,
      req.file.mimetype || null,
      req.file.size || null,
      req.user.userId
    );
    res.status(201).json({
      attachment_id: attachmentId,
      file_name: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size_bytes: req.file.size,
    });
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
    res.status(500).json({ error: err.message });
  }
});

// GET /health-records/:recordId/attachments – list metadata
router.get('/:recordId/attachments', authenticateToken, loadUser, (req, res) => {
  const db = req.app.locals.db;
  const { recordId } = req.params;
  const rec = loadRecord(db, recordId);
  if (!rec) return res.status(404).json({ error: 'Record not found' });
  if (!canAccessPlayerHealthData(req, rec.player_id)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    const rows = db.prepare(`
      SELECT attachment_id, file_name, mime_type, file_size_bytes, uploaded_at, description
      FROM attachments WHERE record_id = ?
      ORDER BY uploaded_at DESC
    `).all(recordId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
