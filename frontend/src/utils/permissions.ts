/**
 * Role-based permissions (mirrors backend permissions.js).
 */

export const ROLES = [
  'admin',
  'medical_staff',
  'fitness_coach',
  'coach',
  'head_coach',
  'performance_analyst',
  'player',
] as const;

export type Role = (typeof ROLES)[number];

const PERMISSION_BY_ROLE: Record<string, Role[]> = {
  manage_teams: ['admin', 'head_coach', 'coach'],
  manage_users: ['admin'],
  manage_settings: ['admin'],
  manage_metric_types: ['admin'],
  manage_team_roster: ['admin', 'head_coach', 'coach'],
  assign_team_coaches: ['admin', 'head_coach'],
  add_health_records: ['admin', 'medical_staff', 'fitness_coach', 'performance_analyst'],
  edit_health_records: ['admin', 'medical_staff', 'fitness_coach', 'performance_analyst'],
  view_all_players: ['admin', 'medical_staff', 'fitness_coach', 'coach', 'head_coach', 'performance_analyst'],
  view_all_metrics: ['admin', 'medical_staff', 'fitness_coach', 'coach', 'head_coach', 'performance_analyst'],
  export_data: ['admin', 'performance_analyst'],
  generate_medical_reports: ['admin', 'medical_staff'],
  generate_analytical_reports: ['admin', 'performance_analyst'],
  view_personal_metrics: ['player'],
};

export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  const allowed = PERMISSION_BY_ROLE[permission];
  return Array.isArray(allowed) && allowed.includes(role as Role);
}

export function canManageUsers(role: string | undefined): boolean {
  return hasPermission(role, 'manage_users');
}

export function canManageTeams(role: string | undefined): boolean {
  return hasPermission(role, 'manage_teams');
}

export function canManageTeamRoster(role: string | undefined): boolean {
  return hasPermission(role, 'manage_team_roster');
}

export function canAssignTeamCoaches(role: string | undefined): boolean {
  return hasPermission(role, 'assign_team_coaches');
}

export function canManageSettings(role: string | undefined): boolean {
  return hasPermission(role, 'manage_settings');
}

export function canManageMetricTypes(role: string | undefined): boolean {
  return hasPermission(role, 'manage_metric_types');
}

export function canAddHealthRecords(role: string | undefined): boolean {
  return hasPermission(role, 'add_health_records');
}

export function canEditHealthRecords(role: string | undefined): boolean {
  return hasPermission(role, 'edit_health_records');
}

export function canViewAllPlayers(role: string | undefined): boolean {
  return hasPermission(role, 'view_all_players');
}

export function canViewDirectoryPlayers(role: string | undefined): boolean {
  return (
    role === 'admin' ||
    role === 'medical_staff' ||
    role === 'fitness_coach' ||
    role === 'performance_analyst'
  );
}

export function canViewAllMetrics(role: string | undefined): boolean {
  return hasPermission(role, 'view_all_metrics');
}

export function canExportData(role: string | undefined): boolean {
  return hasPermission(role, 'export_data');
}

export function canGenerateMedicalReports(role: string | undefined): boolean {
  return hasPermission(role, 'generate_medical_reports');
}

export function canGenerateAnalyticalReports(role: string | undefined): boolean {
  return hasPermission(role, 'generate_analytical_reports');
}

export function isPlayerRole(role: string | undefined): boolean {
  return role === 'player';
}
