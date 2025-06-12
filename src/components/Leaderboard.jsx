import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/users/leaderboard');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch leaderboard');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {users.map((user, index) => (
          <div
            key={user.leetcodeUsername}
            className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                {index + 1}
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-500">@{user.leetcodeUsername}</div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {user.totalSolved} solved
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard; 