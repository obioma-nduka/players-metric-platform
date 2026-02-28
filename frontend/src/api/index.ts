import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5400/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request (if exists)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: handle 401 globally → logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export const loginUser = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const registerUser = (data: {
  email: string
  password: string
  first_name: string
  last_name: string
  role: string
  team_id?: string | null
}) => api.post('/auth/register', data)

export const getTeams = () => api.get('/teams')
export const createTeam = (data: { name: string; sport?: string; league?: string; country?: string; founded_year?: number }) =>
  api.post('/teams', data)
export const getPlayers = (teamId?: string) =>
  api.get('/players', { params: teamId ? { team_id: teamId } : undefined })
export const getMetrics = () => api.get('/health-metrics');
export const getPlayerRecords = (playerId: string, limit = 50) =>
  api.get(`/health-records/player/${playerId}`, { params: { limit } });
export const getPlayerReadiness = (playerId: string) =>
  api.get(`/health-records/player/${playerId}/readiness`)

export const getUsers = () => api.get('/users')
export const updateUser = (userId: string, data: { role?: string; team_id?: string | null; player_id?: string | null; is_active?: boolean }) =>
  api.patch(`/users/${userId}`, data)

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export default api