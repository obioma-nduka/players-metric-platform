import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5400/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const loginUser = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const login = loginUser;

export const getMe = () => api.get('/auth/me');

export const registerUser = (data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  team_id?: string | null;
}) => api.post('/auth/register', data);

export const getTeams = () => api.get('/teams');
export const createTeam = (data: {
  name: string;
  sport?: string;
  league?: string;
  country?: string;
  founded_year?: number;
}) => api.post('/teams', data);
export const updateTeam = (
  teamId: string,
  data: {
    name?: string;
    sport?: string;
    league?: string;
    country?: string;
    founded_year?: number;
    is_active?: boolean | number;
  }
) => api.patch(`/teams/${teamId}`, data);

export const getPlayers = (teamId?: string) =>
  api.get('/players', { params: teamId ? { team_id: teamId } : undefined });
export const getPlayer = (playerId: string) => api.get(`/players/${playerId}`);
export const getMyPlayerProfile = () => api.get('/players/me/profile');
export const patchMyPlayerProfile = (data: Record<string, unknown>) => api.patch('/players/me/profile', data);
export const getCoachCandidates = () => api.get('/users/coach-candidates');
export const getTeamCoaches = (teamId: string) => api.get(`/teams/${teamId}/coaches`);
export const assignCoachToTeam = (teamId: string, userId: string) =>
  api.post(`/teams/${teamId}/assign-coach`, { user_id: userId });
export const createPlayer = (data: {
  team_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  position?: string;
  jersey_number?: number;
  nationality?: string;
  height_cm?: number;
  weight_kg?: number;
}) => api.post('/players', data);
export const updatePlayer = (
  playerId: string,
  data: {
    team_id?: string | null;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: string;
    position?: string;
    jersey_number?: number;
    nationality?: string;
    height_cm?: number;
    weight_kg?: number;
    is_active?: boolean | number;
  }
) => api.patch(`/players/${playerId}`, data);

export const getMetrics = () => api.get('/health-metrics');
export const getMetricsAll = () => api.get('/health-metrics/all');
export const createMetricType = (data: Record<string, unknown>) => api.post('/health-metrics', data);
export const updateMetricType = (id: string, data: Record<string, unknown>) =>
  api.patch(`/health-metrics/${id}`, data);

export const getPlayerRecords = (playerId: string, limit = 50) =>
  api.get(`/health-records/player/${playerId}`, { params: { limit } });
export const getPlayerReadiness = (playerId: string) =>
  api.get(`/health-records/player/${playerId}/readiness`);
export const createHealthRecord = (data: {
  player_id: string;
  metric_type_id: string;
  recorded_at: string;
  value: string | number | boolean;
  notes?: string;
  context?: Record<string, unknown>;
}) => api.post('/health-records', data);
export const updateHealthRecord = (
  recordId: string,
  data: { recorded_at?: string; value?: string | number | boolean; notes?: string; context?: Record<string, unknown> }
) => api.patch(`/health-records/${recordId}`, data);
export const deleteHealthRecord = (recordId: string) => api.delete(`/health-records/${recordId}`);
export const listRecordAttachments = (recordId: string) => api.get(`/health-records/${recordId}/attachments`);
export const uploadRecordAttachment = (recordId: string, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/health-records/${recordId}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getUsers = () => api.get('/users');
export const updateUser = (
  userId: string,
  data: { role?: string; team_id?: string | null; player_id?: string | null; is_active?: boolean | number }
) => api.patch(`/users/${userId}`, data);

export const exportData = (params: { resource?: string; format?: string; team_id?: string }) =>
  api.get('/export', {
    params,
    responseType: params.format === 'csv' ? 'blob' : 'json',
  });

export async function downloadAttachmentFile(attachmentId: string, fileName: string) {
  const res = await api.get(`/attachments/${attachmentId}/file`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'download';
  a.click();
  window.URL.revokeObjectURL(url);
}

export const getMedicalReport = (params: { player_id?: string; team_id?: string }) =>
  api.get('/reports/medical', { params });
export const getAnalyticalReport = (params: { team_id?: string }) =>
  api.get('/reports/analytical', { params });

export const getSettings = () => api.get('/settings');
export const patchSettings = (data: Record<string, string>) => api.patch('/settings', data);

export default api;
