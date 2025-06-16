const User = require('../models/User');
const Progress = require('../models/Progress');
const mongoose = require('mongoose');

// Helper function to get user stats with solved count
const getUserStats = async (matchQuery, limit = 10) => {
  try {
    console.log('Executing aggregation with match query:', matchQuery);
    
    const stats = await Progress.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$user',
          solvedCount: { $sum: 1 },
          lastSolvedAt: { $max: '$solvedAt' }
        }
      },
      { $sort: { solvedCount: -1, lastSolvedAt: -1 } },
      { $limit: limit }
    ]);

    console.log('Aggregation results:', stats);

    // Get user details for each stat
    const userIds = stats.map(stat => stat._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name leetcodeUsername');

    console.log('Found users:', users);

    // Create a map of user details
    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Combine stats with user details
    const result = stats.map(stat => ({
      _id: stat._id,
      name: userMap.get(stat._id.toString())?.name || 'Unknown User',
      leetcodeUsername: userMap.get(stat._id.toString())?.leetcodeUsername || '',
      solvedCount: stat.solvedCount,
      lastSolvedAt: stat.lastSolvedAt
    }));

    console.log('Final result:', result);
    return result;
  } catch (error) {
    console.error('Error in getUserStats:', error);
    throw error;
  }
};

exports.getDailyLeaderboard = async (req, res) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(0, 0, 0, 0);

    console.log('Fetching daily leaderboard from:', oneDayAgo);

    const stats = await getUserStats(
      {
        isSolved: true,
        solvedAt: { $gte: oneDayAgo }
      },
      5
    );

    res.json(stats);
  } catch (error) {
    console.error('Error fetching daily leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    console.log('Fetching weekly leaderboard from:', oneWeekAgo);

    const stats = await getUserStats(
      {
        isSolved: true,
        solvedAt: { $gte: oneWeekAgo }
      },
      5
    );

    res.json(stats);
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllTimeLeaderboard = async (req, res) => {
  try {
    console.log('Fetching all-time leaderboard');
    
    const stats = await getUserStats(
      { isSolved: true },
      10
    );

    res.json(stats);
  } catch (error) {
    console.error('Error fetching all-time leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 