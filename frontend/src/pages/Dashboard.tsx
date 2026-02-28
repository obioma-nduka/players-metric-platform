import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/context/AuthContext';
import { getTeams } from '@/api';

interface Team {
  team_id: string;
  name: string;
  sport?: string;
  league?: string;
  country?: string;
}

export default function Dashboard() {
  const { user, logout, token } = useAuthStore();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  
  useEffect(() => {
    if (!token) return;

    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        setError(null);
        const res = await getTeams();
        setTeams(res.data || []);
      } catch (err: any) {
        console.error('Failed to load teams:', err);
        setError(err.response?.data?.error || 'Failed to load teams');
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [token]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Player Metrics
              </h1>
              <span className="ml-3 text-sm text-gray-500">
                Dashboard
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 hidden sm:block">
                {user?.email || 'User'}
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome & quick stats */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.email?.split('@')[0] || 'User'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Here's an overview of your teams and player data
          </p>
        </div>

        {/* Teams section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Your Teams
            </h3>
          </div>

          {loadingTeams ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p>Loading teams...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-red-600">
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
              >
                Try again
              </button>
            </div>
          ) : teams.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p>No teams found.</p>
              <p className="mt-2 text-sm">
                You may need to be assigned to a team by an administrator.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {teams.map((team) => (
                <li key={team.team_id} className="px-6 py-5 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {team.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {team.sport || 'Football'} • {team.league || 'N/A'} • {team.country || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                     
                        alert(`Selected team: ${team.name}`);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View Players
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

       
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Activity
            </h3>
            <p className="text-sm text-gray-500">
              Coming soon: player readiness updates, alerts, etc.
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Stats
            </h3>
            <p className="text-sm text-gray-500">
              Coming soon: recovery trends, workload ratios...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}