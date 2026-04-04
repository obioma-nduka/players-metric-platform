/**
 * Helpers for team ownership (created_by_user_id) and roster scope.
 */

function getTeam(db, teamId) {
  if (!teamId) return null;
  try {
    return db.prepare(
      'SELECT team_id, created_by_user_id, is_active FROM teams WHERE team_id = ?'
    ).get(teamId);
  } catch (_) {
    return db.prepare('SELECT team_id, is_active FROM teams WHERE team_id = ?').get(teamId);
  }
}

function headCoachCreatedTeamIds(db, userId) {
  try {
    return db
      .prepare(
        'SELECT team_id FROM teams WHERE created_by_user_id = ? AND (is_active = 1 OR is_active IS NULL)'
      )
      .all(userId)
      .map((r) => r.team_id);
  } catch (_) {
    return [];
  }
}

function headCoachOwnsTeam(db, userId, teamId) {
  const t = getTeam(db, teamId);
  return !!(t && t.created_by_user_id && t.created_by_user_id === userId);
}

function adminOrHeadCoachOwnsTeam(role, db, userId, teamId) {
  if (role === 'admin') return true;
  if (role === 'head_coach') return headCoachOwnsTeam(db, userId, teamId);
  return false;
}

module.exports = {
  getTeam,
  headCoachCreatedTeamIds,
  headCoachOwnsTeam,
  adminOrHeadCoachOwnsTeam,
};
