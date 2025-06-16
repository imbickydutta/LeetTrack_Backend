const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard');
const { protect } = require('../middleware/auth');

// Protect all leaderboard routes
router.use(protect);

// Leaderboard routes
router.get('/daily', leaderboardController.getDailyLeaderboard);
router.get('/weekly', leaderboardController.getWeeklyLeaderboard);
router.get('/all-time', leaderboardController.getAllTimeLeaderboard);

module.exports = router; 