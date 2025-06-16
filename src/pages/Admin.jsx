import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3030/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch users');
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId) => {
    try {
      setUserStats(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3030/api/admin/users/${userId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserStats(response.data);
    } catch (err) {
      setError('Failed to fetch user stats');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default Admin; 