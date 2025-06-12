const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Progress = require('../models/Progress');
const { protect, authorize } = require('../middleware/auth');

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

// Get all questions
router.get('/', protect, async (req, res) => {
  try {
    const { difficulty, topics, topic, dayPlan } = req.query;
    const query = {};

    if (difficulty) query.difficulty = difficulty;
    
    // Handle both 'topics' and 'topic' parameters
    if (topics) {
      query.topics = { $in: topics.split(',') };
    } else if (topic) {
      query.topics = { $in: [topic] }; // Search for topic in the topics array
    }
    
    if (dayPlan) query.dayPlan = parseInt(dayPlan);

    // Get questions
    const questions = await Question.find(query);

    // Get user's progress for these questions
    const progress = await Progress.find({
      user: req.user._id,
      question: { $in: questions.map(q => q._id) }
    });

    // Create a map of question progress
    const progressMap = new Map(
      progress.map(p => [p.question.toString(), p])
    );

    // Add progress information to each question
    const questionsWithProgress = questions.map(question => {
      const questionProgress = progressMap.get(question._id.toString());
      return {
        ...question.toObject(),
        userProgress: questionProgress ? {
          isSolved: questionProgress.isSolved,
          solutionUrl: questionProgress.solutionUrl,
          notes: questionProgress.notes,
          solvedAt: questionProgress.solvedAt
        } : {
          isSolved: false,
          solutionUrl: '',
          notes: '',
          solvedAt: null
        }
      };
    });

    res.json(questionsWithProgress);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get question by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Get user's progress for this question
    const progress = await Progress.findOne({
      user: req.user._id,
      question: question._id
    });

    // Add progress information to the question
    const questionWithProgress = {
      ...question.toObject(),
      userProgress: progress ? {
        isSolved: progress.isSolved,
        solutionUrl: progress.solutionUrl,
        notes: progress.notes,
        solvedAt: progress.solvedAt
      } : {
        isSolved: false,
        solutionUrl: '',
        notes: '',
        solvedAt: null
      }
    };

    res.json(questionWithProgress);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create question (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, leetcodeSlug, difficulty, topics, dayPlan, leetcodeUrl } = req.body;

    const question = new Question({
      title,
      leetcodeSlug,
      difficulty,
      topics,
      dayPlan,
      leetcodeUrl
    });

    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update question (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, leetcodeSlug, difficulty, topics, dayPlan, leetcodeUrl } = req.body;
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (title) question.title = title;
    if (leetcodeSlug) question.leetcodeSlug = leetcodeSlug;
    if (difficulty) question.difficulty = difficulty;
    if (topics) question.topics = topics;
    if (dayPlan) question.dayPlan = dayPlan;
    if (leetcodeUrl) question.leetcodeUrl = leetcodeUrl;

    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete question (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 