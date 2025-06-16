const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Progress = require('../models/Progress');
const { protect, authorize } = require('../middleware/auth');

// Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, leetcodeUsername } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (leetcodeUsername) user.leetcodeUsername = leetcodeUsername;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Public route to get top 10 users
router.get('/leaderboard', async (req, res) => {
  try {
    // Get all users
    const users = await User.find().select('name leetcodeUsername');
    
    // Get progress for all users
    const progress = await Progress.find({
      isSolved: true
    });

    // Create a map of user progress
    const userProgressMap = new Map();
    progress.forEach(p => {
      const userId = p.user.toString();
      if (!userProgressMap.has(userId)) {
        userProgressMap.set(userId, 0);
      }
      userProgressMap.set(userId, userProgressMap.get(userId) + 1);
    });

    // Add progress information to each user
    const usersWithProgress = users.map(user => ({
      name: user.name,
      leetcodeUsername: user.leetcodeUsername,
      totalSolved: userProgressMap.get(user._id.toString()) || 0
    }));

    // Sort by totalSolved and get top 10
    const topUsers = usersWithProgress
      .sort((a, b) => b.totalSolved - a.totalSolved)
      .slice(0, 10);

    res.json(topUsers);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 