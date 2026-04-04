const express = require('express');
const { uuidv4 } = require('../utils/id');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission, hasPermission } = require('../permissions');

const router = express.Router();

function requireViewMetrics(req, res, next) {
  if (req.user.role === 'player') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  if (!hasPermission(req.user.role, 'view_all_metrics')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}

// GET /health-metrics – list metric types
router.get('/', authenticateToken, loadUser, requireViewMetrics, (req, res) => {
  const db = req.app.locals.db;
  try {
    const metrics = db.prepare(`
      SELECT metric_type_id, code, name, unit, data_type,
             min_value, max_value, normal_range_low, normal_range_high, description, is_active
      FROM health_metric_types
      WHERE is_active = 1
      ORDER BY name ASC
    `).all();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /health-metrics/all – include inactive (admin)
router.get('/all', authenticateToken, loadUser, requirePermission('manage_metric_types'), (req, res) => {
  const db = req.app.locals.db;
  try {
    const metrics = db.prepare(`
      SELECT metric_type_id, code, name, unit, data_type,
             min_value, max_value, normal_range_low, normal_range_high, description, is_active
      FROM health_metric_types
      ORDER BY name ASC
    `).all();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /health-metrics
router.post('/', authenticateToken, loadUser, requirePermission('manage_metric_types'), (req, res) => {
  const db = req.app.locals.db;
  const {
    code, name, unit, data_type, min_value, max_value,
    normal_range_low, normal_range_high, description,
  } = req.body;
  if (!code?.trim() || !name?.trim() || !data_type) {
    return res.status(400).json({ error: 'code, name, and data_type are required' });
  }
  const allowed = ['numeric', 'integer', 'text', 'boolean', 'json'];
  if (!allowed.includes(data_type)) {
    return res.status(400).json({ error: 'Invalid data_type' });
  }
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO health_metric_types (
        metric_type_id, code, name, unit, data_type, min_value, max_value,
        normal_range_low, normal_range_high, description, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      code.trim(),
      name.trim(),
      unit || null,
      data_type,
      min_value != null ? Number(min_value) : null,
      max_value != null ? Number(max_value) : null,
      normal_range_low != null ? Number(normal_range_low) : null,
      normal_range_high != null ? Number(normal_range_high) : null,
      description || null
    );
    res.status(201).json({ metric_type_id: id, message: 'Metric type created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /health-metrics/:id
router.patch('/:id', authenticateToken, loadUser, requirePermission('manage_metric_types'), (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const {
    code, name, unit, data_type, min_value, max_value,
    normal_range_low, normal_range_high, description, is_active,
  } = req.body;

  const exists = db.prepare('SELECT metric_type_id FROM health_metric_types WHERE metric_type_id = ?').get(id);
  if (!exists) return res.status(404).json({ error: 'Metric type not found' });

  const updates = [];
  const params = [];
  if (code !== undefined) {
    updates.push('code = ?');
    params.push(String(code).trim());
  }
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: 'name cannot be empty' });
    updates.push('name = ?');
    params.push(String(name).trim());
  }
  if (unit !== undefined) {
    updates.push('unit = ?');
    params.push(unit || null);
  }
  if (data_type !== undefined) {
    const allowed = ['numeric', 'integer', 'text', 'boolean', 'json'];
    if (!allowed.includes(data_type)) return res.status(400).json({ error: 'Invalid data_type' });
    updates.push('data_type = ?');
    params.push(data_type);
  }
  if (min_value !== undefined) {
    updates.push('min_value = ?');
    params.push(min_value != null ? Number(min_value) : null);
  }
  if (max_value !== undefined) {
    updates.push('max_value = ?');
    params.push(max_value != null ? Number(max_value) : null);
  }
  if (normal_range_low !== undefined) {
    updates.push('normal_range_low = ?');
    params.push(normal_range_low != null ? Number(normal_range_low) : null);
  }
  if (normal_range_high !== undefined) {
    updates.push('normal_range_high = ?');
    params.push(normal_range_high != null ? Number(normal_range_high) : null);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description || null);
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
    db.prepare(`UPDATE health_metric_types SET ${updates.join(', ')}, updated_at = datetime('now') WHERE metric_type_id = ?`).run(...params);
    const row = db.prepare('SELECT * FROM health_metric_types WHERE metric_type_id = ?').get(id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
