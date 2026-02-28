/**
 * Role-based permissions for the Player Metrics Platform.
 * Matches thesis spec: Admin, Medical Staff, Fitness Coach, Coach, Head Coach, Performance Analyst, Player.
 */

const ROLES = [
  'admin',
  'medical_staff',
  'fitness_coach',
  'coach',
  'head_coach',
  'performance_analyst',
  'player',
];

/** Which roles have each permission (admin has all) */
const PERMISSION_BY_ROLE = {
  // Admin-only
  manage_teams: ['admin'],
  manage_users: ['admin'],
  manage_settings: ['admin'],
  manage_metric_types: ['admin'],

  // Health records: add/edit (medical, fitness, admin)
  add_health_records: ['admin', 'medical_staff', 'fitness_coach'],
  edit_health_records: ['admin', 'medical_staff', 'fitness_coach'],

  // View all metrics / all players (not player role)
  view_all_players: ['admin', 'medical_staff', 'fitness_coach', 'coach', 'head_coach', 'performance_analyst'],
  view_all_metrics: ['admin', 'medical_staff', 'fitness_coach', 'coach', 'head_coach', 'performance_analyst'],

  // Export & reports
  export_data: ['admin', 'performance_analyst'],
  generate_medical_reports: ['admin', 'medical_staff'],
  generate_analytical_reports: ['admin', 'performance_analyst'],

  // Player: view only own metrics (enforced by resource check, not just role)
  view_personal_metrics: ['player'],
};

function hasPermission(role, permission) {
  if (!role) return false;
  if (role === 'admin') return true;
  const allowed = PERMISSION_BY_ROLE[permission];
  return Array.isArray(allowed) && allowed.includes(role);
}

/**
 * Middleware factory: require one of the given permissions.
 * Use after authenticateToken + loadUser so req.user.role is set.
 */
function requirePermission(...permissions) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const allowed = permissions.some((p) => hasPermission(role, p));
    if (!allowed) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * For player role: require that the requested playerId is the user's linked player.
 * Call after loadUser. If user is not a player, next(); otherwise check playerId.
 */
function requireOwnPlayerOrPermission(permission) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (role !== 'player') {
      if (hasPermission(role, permission)) return next();
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const requestedPlayerId = req.params.playerId || req.params.id;
    if (req.user.playerId && requestedPlayerId === req.user.playerId) {
      return next();
    }
    return res.status(403).json({ error: 'You can only access your own data' });
  };
}

module.exports = {
  ROLES,
  hasPermission,
  requirePermission,
  requireOwnPlayerOrPermission,
};
