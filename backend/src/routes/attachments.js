const path = require('path');
const fs = require('fs');
const express = require('express');
const { authenticateToken, loadUser } = require('../middleware/auth');
const { hasPermission } = require('../permissions');

const router = express.Router();

function canAccessPlayerHealthData(req, playerId) {
  const { role, playerId: uidPlayer, teamId: userTeamId } = req.user;
  if (role === 'player') {
    return uidPlayer && uidPlayer === playerId;
  }
  if (!hasPermission(role, 'view_all_metrics')) return false;
  if (role === 'admin' || !userTeamId) return true;
  const db = req.app.locals.db;
  const row = db.prepare('SELECT team_id FROM players WHERE player_id = ?').get(playerId);
  return !row || !row.team_id || row.team_id === userTeamId;
}

// GET /attachments/:attachmentId/file – download binary
router.get('/:attachmentId/file', authenticateToken, loadUser, (req, res) => {
  const db = req.app.locals.db;
  const { attachmentId } = req.params;
  try {
    const row = db.prepare(`
      SELECT a.storage_path, a.file_name, a.mime_type, r.player_id
      FROM attachments a
      JOIN health_records r ON r.record_id = a.record_id
      WHERE a.attachment_id = ?
    `).get(attachmentId);
    if (!row) return res.status(404).json({ error: 'Attachment not found' });
    if (!canAccessPlayerHealthData(req, row.player_id)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const uploadDir = req.app.locals.uploadDir || path.join(__dirname, '..', '..', 'uploads');
    const fullPath = path.join(uploadDir, row.storage_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File missing on server' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.file_name || 'file')}"`);
    if (row.mime_type) res.setHeader('Content-Type', row.mime_type);
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
