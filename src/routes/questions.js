const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Progress = require('../models/Progress');
const { protect, authorize } = require('../middleware/auth');
const questionsController = require('../controllers/questions'); // Import the questions controller

// Get all available days
router.get('/days/all', protect, async (req, res) => {
  try {
    const days = await Question.distinct('dayPlan');
    // Filter out null/undefined values and sort numerically
    const validDays = days.filter(day => day !== null && day !== undefined).sort((a, b) => a - b);
    res.json(validDays);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all available topics
router.get('/topics/all', protect, async (req, res) => {
  try {
    const topics = await Question.distinct('topics');
    // Flatten array and remove duplicates
    const uniqueTopics = [...new Set(topics.flat())].filter(topic => topic);
    res.json(uniqueTopics);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all questions (main endpoint) - now uses controller
router.get('/', protect, questionsController.getQuestions);

// Get question by ID
router.get('/:id', protect, questionsController.getQuestionById);

// Create question (admin only)
router.post('/', protect, authorize('admin'), questionsController.createQuestion);

// Update question (admin only)
router.put('/:id', protect, authorize('admin'), questionsController.updateQuestion);

// Delete question (admin only)
router.delete('/:id', protect, authorize('admin'), questionsController.deleteQuestion);

module.exports = router; 