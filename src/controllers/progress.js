const UserProgress = require('../models/UserProgress');
const Question = require('../models/Question');
const mongoose = require('mongoose');
const Progress = require('../models/Progress');

exports.updateProgress = async (req, res) => {
  try {
    const questionId = mongoose.Types.ObjectId.createFromHexString(req.params.questionId);
    const { isSolved, solutionUrl, notes, code, language } = req.body;
    const userId = req.user._id;

    console.log('Updating progress:', { questionId, isSolved, solutionUrl, userId });

    // Verify question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Prepare update object
    const updateData = {
      isSolved,
      solutionUrl,
      notes,
      code,
      language,
      lastUpdated: new Date()
    };

    // Set solvedAt if the problem is being marked as solved
    if (isSolved) {
      updateData.solvedAt = new Date();
    }

    const progress = await Progress.findOneAndUpdate(
      { user: userId, question: questionId },
      updateData,
      { new: true, upsert: true }
    );

    console.log('Updated progress:', progress);
    res.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const progress = await Progress.find({ user: userId })
      .populate('question', 'title difficulty topics dayPlan leetcodeSlug leetcodeUrl')
      .select('isSolved solutionUrl notes code language bookmarked lastUpdated')
      .lean();

    res.json(progress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserTopicProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    // Get all questions grouped by topic
    const questions = await Question.find();
    const progress = await Progress.find({
      user: userId,
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
    console.error('Error fetching topic progress (controller):', error); 
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserDailyProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    // Get all questions grouped by day
    const questions = await Question.find();
    const progress = await Progress.find({
      user: userId,
      question: { $in: questions.map(q => q._id) }
    });

    // Create a map of question progress
    const progressMap = new Map(
      progress.map(p => [p.question.toString(), p])
    );

    // Calculate progress for each day
    const dailyProgress = {};
    questions.forEach(question => {
      const day = question.dayPlan;
      if (!dailyProgress[day]) {
        dailyProgress[day] = {
          total: 0,
          solved: 0
        };
      }
      dailyProgress[day].total++;
      if (progressMap.get(question._id.toString())?.isSolved) {
        dailyProgress[day].solved++;
      }
    });

    res.json(dailyProgress);
  } catch (error) {
    console.error('Error fetching daily progress (controller):', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserDailyProgressByDay = async (req, res) => {
  try {
    const userId = req.user._id;
    const day = parseInt(req.params.day);

    // Find all questions related to the specific day
    const questionsInDay = await Question.find({ dayPlan: day });
    const totalQuestionsInDay = questionsInDay.length;

    // Find user's solved progress for questions in this day
    const solvedProgressInDay = await Progress.find({
      user: userId,
      question: { $in: questionsInDay.map(q => q._id) },
      isSolved: true
    });
    const solvedCountInDay = solvedProgressInDay.length;

    res.json({
      day: day,
      total: totalQuestionsInDay,
      solved: solvedCountInDay
    });
  } catch (error) {
    console.error('Error fetching progress for specific day (controller):', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserOverallProgress = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all questions
    const totalQuestions = await Question.countDocuments();

    // Get user's solved questions
    const solvedProgress = await Progress.find({
      user: userId,
      isSolved: true
    }).populate('question', 'title difficulty topics dayPlan leetcodeSlug leetcodeUrl');

    // Calculate difficulty-wise counts
    const difficultyCounts = {
      Easy: 0,
      Medium: 0,
      Hard: 0
    };

    // Calculate topic-wise counts
    const topicCounts = {};

    solvedProgress.forEach(progress => {
      if (progress.question) {
        // Count by difficulty
        difficultyCounts[progress.question.difficulty]++;

        // Count by topics
        progress.question.topics.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });

    // Calculate completion percentages
    const difficultyPercentages = {};
    const totalByDifficulty = await Question.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);

    totalByDifficulty.forEach(({ _id, count }) => {
      difficultyPercentages[_id] = (difficultyCounts[_id] / count) * 100;
    });

    // Get topic-wise total questions
    const topicTotals = await Question.aggregate([
      { $unwind: '$topics' },
      {
        $group: {
          _id: '$topics',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate topic-wise percentages
    const topicPercentages = {};
    topicTotals.forEach(({ _id, count }) => {
      topicPercentages[_id] = ((topicCounts[_id] || 0) / count) * 100;
    });

    const response = {
      totalSolved: solvedProgress.length,
      totalQuestions,
      completionPercentage: (solvedProgress.length / totalQuestions) * 100,
      difficultyStats: {
        counts: difficultyCounts,
        percentages: difficultyPercentages
      },
      topicStats: {
        counts: topicCounts,
        percentages: topicPercentages
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching overall progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// New exports.getUserProgressByTopic function
exports.getUserProgressByTopic = async (req, res) => {
  try {
    const userId = req.user._id;
    const topic = req.params.topic;
    
    // Find all questions related to the specific topic
    const questionsInTopic = await Question.find({ topics: topic });
    const totalQuestionsInTopic = questionsInTopic.length;

    // Find user's solved progress for questions in this topic
    const solvedProgressInTopic = await Progress.find({
      user: userId,
      question: { $in: questionsInTopic.map(q => q._id) },
      isSolved: true
    });
    const solvedCountInTopic = solvedProgressInTopic.length;

    res.json({
      topic: topic,
      total: totalQuestionsInTopic,
      solved: solvedCountInTopic
    });
  } catch (error) {
    console.error('Error fetching user progress by topic (controller):', error); 
    res.status(500).json({ message: 'Server error' });
  }
};

// New exports.updateOrCreateProgress function
exports.updateOrCreateProgress = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { isSolved, solutionUrl, notes, code, language } = req.body;
    const userId = req.user._id;

    const updateFields = {
      isSolved,
      solutionUrl,
      notes,
      code,
      language,
      lastUpdated: new Date()
    };

    if (isSolved) {
      updateFields.solvedAt = new Date();
    }

    const progress = await Progress.findOneAndUpdate(
      { user: userId, question: questionId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    res.json(progress);
  } catch (error) {
    console.error('Error updating progress (controller):', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// New exports.getSpecificUserProgress function
exports.getSpecificUserProgress = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user._id;

    const progress = await Progress.findOne({ user: userId, question: questionId })
      .populate('question', 'title difficulty topics dayPlan leetcodeSlug leetcodeUrl');

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error fetching specific progress (controller):', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 