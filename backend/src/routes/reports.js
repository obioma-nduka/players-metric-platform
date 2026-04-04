const express = require('express');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { requirePermission } = require('../permissions');

const router = express.Router();

// GET /reports/medical?player_id=&team_id=
router.get('/medical', authenticateToken, loadUser, requirePermission('generate_medical_reports'), (req, res) => {
  const db = req.app.locals.db;
  const { player_id, team_id } = req.query;
  const { role, teamId: userTeamId } = req.user;
  const isAdmin = role === 'admin';
  const fullOrg = isAdmin || role === 'medical_staff';

  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (player_id) {
      where += ' AND r.player_id = ?';
      params.push(player_id);
    }
    if (team_id) {
      if (!fullOrg && userTeamId && team_id !== userTeamId) {
        return res.status(403).json({ error: 'Cannot access other teams' });
      }
      where += ' AND p.team_id = ?';
      params.push(team_id);
    } else if (!fullOrg && userTeamId) {
      where += ' AND p.team_id = ?';
      params.push(userTeamId);
    }

    const summary = db.prepare(`
      SELECT m.code, m.name, COUNT(*) AS record_count,
             MAX(r.recorded_at) AS latest_recorded_at
      FROM health_records r
      JOIN health_metric_types m ON m.metric_type_id = r.metric_type_id
      JOIN players p ON p.player_id = r.player_id
      ${where}
      GROUP BY m.metric_type_id
      ORDER BY m.name
    `).all(...params);

    const recent = db.prepare(`
      SELECT r.record_id, r.player_id, p.first_name, p.last_name, r.recorded_at, r.value, m.code, m.name
      FROM health_records r
      JOIN health_metric_types m ON m.metric_type_id = r.metric_type_id
      JOIN players p ON p.player_id = r.player_id
      ${where}
      ORDER BY r.recorded_at DESC
      LIMIT 25
    `).all(...params);

    res.json({
      report_type: 'medical_summary',
      generated_at: new Date().toISOString(),
      filters: { player_id: player_id || null, team_id: team_id || null },
      metric_summary: summary,
      recent_entries: recent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reports/analytical?team_id=
router.get('/analytical', authenticateToken, loadUser, requirePermission('generate_analytical_reports'), (req, res) => {
  const db = req.app.locals.db;
  const { team_id } = req.query;
  const { role, teamId: userTeamId } = req.user;
  const isAdmin = role === 'admin';
  const fullOrg = isAdmin || role === 'performance_analyst';

  try {
    let scopedTeam = null;
    if (team_id) {
      if (!fullOrg && userTeamId && team_id !== userTeamId) {
        return res.status(403).json({ error: 'Cannot access other teams' });
      }
      scopedTeam = team_id;
    } else if (!fullOrg && userTeamId) {
      scopedTeam = userTeamId;
    }

    const condNumeric = scopedTeam
      ? 'WHERE p.team_id = ? AND m.data_type IN (\'numeric\', \'integer\')'
      : 'WHERE m.data_type IN (\'numeric\', \'integer\')';
    const paramsNumeric = scopedTeam ? [scopedTeam] : [];

    const byMetric = db.prepare(`
      SELECT m.code, m.name, m.unit,
             COUNT(r.record_id) AS n,
             AVG(CAST(r.value AS REAL)) AS avg_value,
             MIN(CAST(r.value AS REAL)) AS min_value,
             MAX(CAST(r.value AS REAL)) AS max_value
      FROM health_records r
      JOIN health_metric_types m ON m.metric_type_id = r.metric_type_id
      JOIN players p ON p.player_id = r.player_id
      ${condNumeric}
      GROUP BY m.metric_type_id
      ORDER BY m.name
    `).all(...paramsNumeric);

    const condPlayers = scopedTeam ? 'WHERE p.team_id = ?' : '';
    const paramsPlayers = scopedTeam ? [scopedTeam] : [];

    const playerLoad = db.prepare(`
      SELECT p.player_id, p.first_name, p.last_name, COUNT(r.record_id) AS record_count
      FROM players p
      LEFT JOIN health_records r ON r.player_id = p.player_id
      ${condPlayers}
      GROUP BY p.player_id
      ORDER BY record_count DESC
      LIMIT 30
    `).all(...paramsPlayers);

    res.json({
      report_type: 'team_analytics',
      generated_at: new Date().toISOString(),
      filters: { team_id: scopedTeam },
      numeric_metric_stats: byMetric,
      records_per_player: playerLoad,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
