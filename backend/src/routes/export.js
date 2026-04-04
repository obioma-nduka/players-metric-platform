const express = require('express');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission } = require('../permissions');

const router = express.Router();

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// GET /export?resource=health_records|players|users&format=json|csv&team_id=
router.get('/', authenticateToken, loadUser, requirePermission('export_data'), (req, res) => {
  const db = req.app.locals.db;
  const { resource = 'health_records', format = 'json', team_id } = req.query;
  const userTeamId = req.user.teamId;
  const isAdmin = req.user.role === 'admin';
  const fullOrgExport = isAdmin || req.user.role === 'performance_analyst';

  try {
    if (resource === 'players') {
      let rows;
      if (team_id) {
        if (!fullOrgExport && userTeamId && team_id !== userTeamId) {
          return res.status(403).json({ error: 'Cannot export other teams' });
        }
        rows = db.prepare(`
          SELECT player_id, team_id, first_name, last_name, position, jersey_number, date_of_birth, is_active
          FROM players WHERE team_id = ? ORDER BY last_name, first_name
        `).all(team_id);
      } else if (!fullOrgExport && userTeamId) {
        rows = db.prepare(`
          SELECT player_id, team_id, first_name, last_name, position, jersey_number, date_of_birth, is_active
          FROM players WHERE team_id = ? ORDER BY last_name, first_name
        `).all(userTeamId);
      } else {
        rows = db.prepare(`
          SELECT player_id, team_id, first_name, last_name, position, jersey_number, date_of_birth, is_active
          FROM players ORDER BY last_name, first_name
        `).all();
      }
      if (format === 'csv') {
        const cols = ['player_id', 'team_id', 'first_name', 'last_name', 'position', 'jersey_number', 'date_of_birth', 'is_active'];
        const lines = [cols.join(',')].concat(
          rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))
        );
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="players_export.csv"');
        return res.send(lines.join('\n'));
      }
      return res.json({ resource: 'players', count: rows.length, data: rows });
    }

    if (resource === 'users') {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only administrators can export users' });
      }
      const rows = db.prepare(`
        SELECT user_id, email, first_name, last_name, role, team_id, player_id, is_active, last_login, created_at
        FROM users ORDER BY created_at DESC
      `).all();
      if (format === 'csv') {
        const cols = ['user_id', 'email', 'first_name', 'last_name', 'role', 'team_id', 'player_id', 'is_active', 'last_login', 'created_at'];
        const lines = [cols.join(',')].concat(
          rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))
        );
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
        return res.send(lines.join('\n'));
      }
      return res.json({ resource: 'users', count: rows.length, data: rows });
    }

    // health_records (default)
    let query = `
      SELECT r.record_id, r.player_id, r.recorded_at, r.value, r.notes, m.code AS metric_code, m.name AS metric_name
      FROM health_records r
      JOIN health_metric_types m ON r.metric_type_id = m.metric_type_id
    `;
    const params = [];
    if (team_id) {
      if (!fullOrgExport && userTeamId && team_id !== userTeamId) {
        return res.status(403).json({ error: 'Cannot export other teams' });
      }
      query += ' JOIN players p ON p.player_id = r.player_id WHERE p.team_id = ?';
      params.push(team_id);
    } else if (!fullOrgExport && userTeamId) {
      query += ' JOIN players p ON p.player_id = r.player_id WHERE p.team_id = ?';
      params.push(userTeamId);
    }
    query += ' ORDER BY r.recorded_at DESC LIMIT 10000';
    const rows = db.prepare(query).all(...params);
    if (format === 'csv') {
      const cols = ['record_id', 'player_id', 'recorded_at', 'value', 'notes', 'metric_code', 'metric_name'];
      const lines = [cols.join(',')].concat(
        rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="health_records_export.csv"');
      return res.send(lines.join('\n'));
    }
    return res.json({ resource: 'health_records', count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
