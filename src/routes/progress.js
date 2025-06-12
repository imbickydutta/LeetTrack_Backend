const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Question = require('../models/Question');
const { protect } = require('../middleware/auth');

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
router.get('/user/overall', protect, async (req, res) => {
  try {
    // Get total questions count
    const totalQuestions = await Question.countDocuments();
    
    // Get solved questions count
    const solvedQuestions = await Progress.countDocuments({
      user: req.user._id,
      isSolved: true
    });

    // Get all questions with their progress
    const questions = await Question.find();
    const progress = await Progress.find({
      user: req.user._id,
      question: { $in: questions.map(q => q._id) }
    });

    // Create a map of question progress
    const progressMap = new Map(
      progress.map(p => [p.question.toString(), p])
    );

    // Calculate topic statistics
    const topicStats = {
      counts: {},
      percentages: {}
    };

    // Calculate difficulty statistics
    const difficultyStats = {
      counts: {
        Easy: 0,
        Medium: 0,
        Hard: 0
      },
      percentages: {
        Easy: 0,
        Medium: 0,
        Hard: 0
      }
    };

    // Process each question
    questions.forEach(question => {
      // Update topic stats
      question.topics.forEach(topic => {
        if (!topicStats.counts[topic]) {
          topicStats.counts[topic] = 0;
        }
        if (progressMap.get(question._id.toString())?.isSolved) {
          topicStats.counts[topic]++;
        }
      });

      // Update difficulty stats
      const isSolved = progressMap.get(question._id.toString())?.isSolved;
      if (isSolved) {
        difficultyStats.counts[question.difficulty]++;
      }
    });

    // Calculate percentages for topics
    Object.keys(topicStats.counts).forEach(topic => {
      const totalQuestionsInTopic = questions.filter(q => 
        q.topics.includes(topic)
      ).length;
      topicStats.percentages[topic] = totalQuestionsInTopic > 0 
        ? (topicStats.counts[topic] / totalQuestionsInTopic) * 100 
        : 0;
    });

    // Calculate percentages for difficulties
    const difficultyCounts = {
      Easy: questions.filter(q => q.difficulty === 'Easy').length,
      Medium: questions.filter(q => q.difficulty === 'Medium').length,
      Hard: questions.filter(q => q.difficulty === 'Hard').length
    };

    Object.keys(difficultyStats.counts).forEach(difficulty => {
      difficultyStats.percentages[difficulty] = difficultyCounts[difficulty] > 0
        ? (difficultyStats.counts[difficulty] / difficultyCounts[difficulty]) * 100
        : 0;
    });

    res.json({
      totalQuestions,
      totalSolved: solvedQuestions,
      completionPercentage: totalQuestions > 0 ? (solvedQuestions / totalQuestions) * 100 : 0,
      topicStats,
      difficultyStats
    });
  } catch (error) {
    console.error('Error fetching overall progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get progress for all topics
router.get('/user/topics', protect, async (req, res) => {
  try {
    // Get all questions grouped by topic
    const questions = await Question.find();
    const progress = await Progress.find({
      user: req.user._id,
      question: { $in: questions.map(q => q._id) }
    });

    // Create a map of question progress
    const progressMap = new Map(
      progress.map(p => [p.question.toString(), p])
    );

    // Calculate progress for each topic
    const topicProgress = {};
    questions.forEach(question => {
      question.topics.forEach(topic => {
        if (!topicProgress[topic]) {
          topicProgress[topic] = {
            total: 0,
            solved: 0
          };
        }
        topicProgress[topic].total++;
        if (progressMap.get(question._id.toString())?.isSolved) {
          topicProgress[topic].solved++;
        }
      });
    });

    res.json(topicProgress);
  } catch (error) {
    console.error('Error fetching topic progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get progress for all days
router.get('/user/daily', protect, async (req, res) => {
  try {
    // Get all questions grouped by day
    const questions = await Question.find();
    const progress = await Progress.find({
      user: req.user._id,
      question: { $in: questions.map(q => q._id) }
    });

    // Create a map of question progress
    const progressMap = new Map(
      progress.map(p => [p.question.toString(), p])
    );

    // Calculate progress for each day
    const dayProgress = {};
    questions.forEach(question => {
      if (question.dayPlan) {
        if (!dayProgress[question.dayPlan]) {
          dayProgress[question.dayPlan] = {
            total: 0,
            solved: 0
          };
        }
        dayProgress[question.dayPlan].total++;
        if (progressMap.get(question._id.toString())?.isSolved) {
          dayProgress[question.dayPlan].solved++;
        }
      }
    });

    res.json(dayProgress);
  } catch (error) {
    console.error('Error fetching daily progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get progress for a specific day
router.get('/user/daily/:day', protect, async (req, res) => {
  try {
    const day = parseInt(req.params.day);
    
    // Get all questions for the day
    const questions = await Question.find({ dayPlan: day });
    const questionIds = questions.map(q => q._id);
    
    // Get progress for these questions
    const progress = await Progress.find({
      user: req.user._id,
      question: { $in: questionIds }
    });

    const solvedCount = progress.filter(p => p.isSolved).length;
    
    res.json({
      day,
      total: questions.length,
      solved: solvedCount,
      percentage: questions.length > 0 ? (solvedCount / questions.length) * 100 : 0
    });
  } catch (error) {
    console.error('Error fetching daily progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get progress for a specific topic
router.get('/user/topics/:topic', protect, async (req, res) => {
  try {
    const topic = req.params.topic;
    
    // Get all questions for the topic
    const questions = await Question.find({ topics: topic });
    const questionIds = questions.map(q => q._id);
    
    // Get progress for these questions
    const progress = await Progress.find({
      user: req.user._id,
      question: { $in: questionIds }
    });

    const solvedCount = progress.filter(p => p.isSolved).length;
    
    res.json({
      topic,
      total: questions.length,
      solved: solvedCount,
      percentage: questions.length > 0 ? (solvedCount / questions.length) * 100 : 0
    });
  } catch (error) {
    console.error('Error fetching topic progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update progress for a specific question
router.post('/:questionId', protect, async (req, res) => {
  try {
    const { isSolved, solutionUrl, notes } = req.body;
    const questionId = req.params.questionId;

    // Check if question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Find or create progress
    let progress = await Progress.findOne({
      user: req.user._id,
      question: questionId
    });

    if (!progress) {
      progress = new Progress({
        user: req.user._id,
        question: questionId
      });
    }

    // Update progress
    progress.isSolved = isSolved;
    progress.solutionUrl = solutionUrl || '';
    progress.notes = notes || '';
    progress.solvedAt = isSolved ? new Date() : null;

    await progress.save();

    res.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 