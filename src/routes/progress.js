const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Question = require('../models/Question');
const { protect } = require('../middleware/auth');
const progressController = require('../controllers/progress'); // Import the progress controller

// Debug middleware
router.use((req, res, next) => {
  console.log('Progress route accessed:', {
    method: req.method,
    path: req.path,
    params: req.params,
    body: req.body
  });
  next();
});

// Get overall progress with detailed statistics
router.get('/user/overall', protect, progressController.getUserOverallProgress);

// Get progress for all topics
router.get('/user/topics', protect, progressController.getUserTopicProgress);

// Get progress for all days
router.get('/user/daily', protect, progressController.getUserDailyProgress);

// Get progress for a specific day
router.get('/user/daily/:day', protect, progressController.getUserDailyProgressByDay);

// Get user progress by topic
router.get('/user/topics/:topic', protect, progressController.getUserProgressByTopic);

// Update or create user progress for a question
router.post('/:questionId', protect, progressController.updateOrCreateProgress);

// Get specific user progress by question ID
router.get('/:questionId', protect, progressController.getSpecificUserProgress);

module.exports = router; 