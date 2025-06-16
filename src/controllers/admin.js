const User = require('../models/User');
const Progress = require('../models/Progress');
const Question = require('../models/Question');
const mongoose = require('mongoose');

exports.getAllUsers = async (req, res) => {
  try {
    // Get all users
    const users = await User.find().select('name leetcodeUsername _id');
    
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
      _id: user._id,
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
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's solved questions with proper population
    const solvedProgress = await Progress.find({
      user: userId,
      isSolved: true
    }).populate({
      path: 'question',
      select: 'difficulty topics'
    });

    // Get total questions count
    const totalQuestions = await Question.countDocuments();
    const totalSolved = solvedProgress.length;

    // Calculate difficulty-wise stats
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

    // Calculate topic-wise stats
    const topicStats = {
      counts: {},
      percentages: {}
    };

    // Count solved questions by difficulty and topic
    solvedProgress.forEach(progress => {
      if (progress.question) {
        // Count by difficulty
        difficultyStats.counts[progress.question.difficulty]++;

        // Count by topics
        progress.question.topics.forEach(topic => {
          topicStats.counts[topic] = (topicStats.counts[topic] || 0) + 1;
        });
      }
    });

    // Calculate total questions by difficulty
    const totalByDifficulty = await Question.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate percentages
    totalByDifficulty.forEach(({ _id, count }) => {
      difficultyStats.percentages[_id] = (difficultyStats.counts[_id] / count) * 100;
    });

    // Calculate topic percentages
    const totalByTopic = await Question.aggregate([
      { $unwind: '$topics' },
      {
        $group: {
          _id: '$topics',
          count: { $sum: 1 }
        }
      }
    ]);

    totalByTopic.forEach(({ _id, count }) => {
      topicStats.percentages[_id] = ((topicStats.counts[_id] || 0) / count) * 100;
    });

    // Calculate completion percentage
    const completionPercentage = (totalSolved / totalQuestions) * 100;

    res.json({
      totalQuestions,
      totalSolved,
      completionPercentage,
      difficultyStats,
      topicStats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Progress.find()
      .populate({
        path: 'user',
        select: 'name'
      })
      .populate({
        path: 'question',
        select: 'title topics'
      })
      .sort({ createdAt: -1 });

    const formattedSubmissions = submissions.map(submission => ({
      _id: submission._id,
      userName: submission.user.name,
      questionTitle: submission.question.title,
      topic: submission.question.topics[0],
      submittedAt: submission.createdAt,
      reviewStatus: submission.reviewStatus,
      reviewFeedback: submission.reviewFeedback,
      solutionUrl: submission.solutionUrl
    }));

    res.json(formattedSubmissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllTopics = async (req, res) => {
  try {
    const topics = await Question.distinct('topics');
    res.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUsersList = async (req, res) => {
  try {
    const users = await User.find().select('name _id');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users list:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reviewSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { reviewStatus, reviewFeedback } = req.body;

    if (!['correct', 'incorrect', 'needs_optimization'].includes(reviewStatus)) {
      return res.status(400).json({ message: 'Invalid review status' });
    }

    const submission = await Progress.findByIdAndUpdate(
      submissionId,
      {
        reviewStatus,
        reviewFeedback,
        reviewedAt: new Date(),
        reviewedBy: req.user._id
      },
      { new: true }
    ).populate({
      path: 'user',
      select: 'name'
    }).populate({
      path: 'question',
      select: 'title topics'
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const formattedSubmission = {
      _id: submission._id,
      userName: submission.user.name,
      questionTitle: submission.question.title,
      topic: submission.question.topics[0],
      submittedAt: submission.submittedAt,
      reviewStatus: submission.reviewStatus,
      reviewFeedback: submission.reviewFeedback,
      solutionUrl: submission.solutionUrl
    };

    res.json(formattedSubmission);
  } catch (error) {
    console.error('Error reviewing submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 