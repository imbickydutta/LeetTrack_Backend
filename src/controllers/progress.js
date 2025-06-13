const UserProgress = require('../models/UserProgress');
const Question = require('../models/Question');
const mongoose = require('mongoose');

exports.updateProgress = async (req, res) => {
  try {
    const questionId = mongoose.Types.ObjectId.createFromHexString(req.params.questionId);
    const { isSolved, solutionUrl, notes, code, language } = req.body;
    const userId = req.user.userId;

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

    const progress = await UserProgress.findOneAndUpdate(
      { userId, questionId },
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
    const userId = req.user.userId;
    const progress = await UserProgress.find({ userId })
      .populate('questionId', 'title difficulty topics dayPlan leetcodeSlug leetcodeUrl')
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
    const userId = req.user.userId;
    const topic = req.params.topic;

    if (!topic) {
      return res.status(400).json({ message: 'Topic parameter is required' });
    }

    console.log('Fetching progress for topic:', topic);

    const questions = await Question.find({ topics: topic })
      .select('title difficulty topics dayPlan leetcodeSlug leetcodeUrl')
      .lean();

    console.log('Found questions for topic:', questions.length);

    const progress = await UserProgress.find({
      userId,
      questionId: { $in: questions.map(q => q._id) }
    })
    .select('isSolved solutionUrl notes code language bookmarked lastUpdated')
    .lean();

    const progressMap = new Map(
      progress.map(p => [p.questionId.toString(), p])
    );

    const topicProgress = questions.map(question => ({
      ...question,
      userProgress: progressMap.get(question._id.toString()) || null
    }));

    // Calculate solved and total counts
    const solved = topicProgress.filter(q => q.userProgress?.isSolved).length;
    const total = topicProgress.length;

    res.json({
      solved,
      total,
      questions: topicProgress
    });
  } catch (error) {
    console.error('Error fetching topic progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserDailyProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dayPlan = req.params.dayPlan || req.query.dayPlan;

    console.log('Fetching daily progress:', { userId, dayPlan });

    if (!dayPlan) {
      return res.status(400).json({ message: 'Day parameter is required' });
    }

    const questions = await Question.find({ dayPlan: parseInt(dayPlan) })
      .select('title difficulty topics dayPlan leetcodeSlug leetcodeUrl')
      .lean();

    console.log('Found questions for day:', questions.length, questions);

    const progress = await UserProgress.find({
      userId,
      questionId: { $in: questions.map(q => q._id) }
    })
    .select('isSolved solutionUrl notes code language bookmarked lastUpdated')
    .lean();

    console.log('Found user progress:', progress.length, progress);

    const progressMap = new Map(
      progress.map(p => [p.questionId.toString(), p])
    );

    const dailyProgress = questions.map(question => ({
      ...question,
      userProgress: progressMap.get(question._id.toString()) || null
    }));

    console.log('Final daily progress:', dailyProgress.length, dailyProgress);

    res.json(dailyProgress);
  } catch (error) {
    console.error('Error fetching daily progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserOverallProgress = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all questions
    const totalQuestions = await Question.countDocuments();

    // Get user's solved questions
    const solvedProgress = await UserProgress.find({
      userId,
      isSolved: true
    }).populate('questionId', 'title difficulty topics dayPlan leetcodeSlug leetcodeUrl');

    // Calculate difficulty-wise counts
    const difficultyCounts = {
      Easy: 0,
      Medium: 0,
      Hard: 0
    };

    // Calculate topic-wise counts
    const topicCounts = {};

    solvedProgress.forEach(progress => {
      if (progress.questionId) {
        // Count by difficulty
        difficultyCounts[progress.questionId.difficulty]++;

        // Count by topics
        progress.questionId.topics.forEach(topic => {
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