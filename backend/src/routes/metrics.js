const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  const db = req.app.locals.db;

  try {
    const metrics = db.prepare(`
      SELECT metric_type_id, code, name, unit, data_type,
             min_value, max_value, normal_range_low, normal_range_high, description
      FROM health_metric_types
      WHERE is_active = 1
      ORDER BY name ASC
    `).all();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;