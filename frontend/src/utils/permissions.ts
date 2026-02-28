/**
 * Role-based permissions (mirrors backend permissions.js).
 * Use for UI visibility and route guards.
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
  manage_teams: ['admin'],
  manage_users: ['admin'],
  manage_settings: ['admin'],
  manage_metric_types: ['admin'],
  add_health_records: ['admin', 'medical_staff', 'fitness_coach'],
  edit_health_records: ['admin', 'medical_staff', 'fitness_coach'],
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

export function canAddHealthRecords(role: string | undefined): boolean {
  return hasPermission(role, 'add_health_records');
}

export function canViewAllPlayers(role: string | undefined): boolean {
  return hasPermission(role, 'view_all_players');
}

export function canExportData(role: string | undefined): boolean {
  return hasPermission(role, 'export_data');
}

export function isPlayerRole(role: string | undefined): boolean {
  return role === 'player';
}
