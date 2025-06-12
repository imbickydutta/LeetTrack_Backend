const Question = require('../models/Question');
const UserProgress = require('../models/UserProgress');

exports.getAllQuestions = async (req, res) => {
  try {
    console.log('Fetching all questions');
    const questions = await Question.find().lean();
    console.log('Total questions found:', questions.length);
    
    // Log day distribution
    const dayDistribution = questions.reduce((acc, q) => {
      acc[q.dayPlan] = (acc[q.dayPlan] || 0) + 1;
      return acc;
    }, {});
    console.log('Day distribution:', dayDistribution);
    
    // Log sample questions with their day values
    console.log('Sample questions:', questions.slice(0, 5).map(q => ({
      title: q.title,
      dayPlan: q.dayPlan,
      dayPlanType: typeof q.dayPlan
    })));
    
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).lean();
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // If user is authenticated, get their progress
    if (req.user) {
      const userProgress = await UserProgress.findOne({
        userId: req.user.userId,
        questionId: question._id
      }).lean();

      question.userProgress = userProgress || null;
    }

    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { topic, dayPlan, difficulty, status } = req.query;
    const query = {};

    if (topic) query.topics = topic;
    if (dayPlan) {
      const dayNumber = Number(dayPlan);
      if (!isNaN(dayNumber)) {
        query['dayPlan.$numberInt'] = dayNumber.toString();
      }
    }
    if (difficulty) query.difficulty = difficulty;

    console.log('Query parameters received:', { topic, dayPlan, difficulty, status });
    console.log('MongoDB query being used:', query);

    // First verify the query
    const count = await Question.countDocuments(query);
    console.log('Number of questions matching query:', count);

    const questions = await Question.find(query).lean();
    console.log('Number of questions found:', questions.length);
    console.log('First few questions:', questions.slice(0, 2).map(q => ({ 
      title: q.title, 
      dayPlan: q.dayPlan,
      dayPlanType: typeof q.dayPlan 
    })));

    // If user is authenticated, merge with progress
    if (req.user) {
      console.log('User ID for progress lookup:', req.user.userId);
      const userProgress = await UserProgress.find({
        userId: req.user.userId,
        questionId: { $in: questions.map(q => q._id) }
      }).lean();

      console.log('Found user progress entries:', userProgress.length);
      console.log('Sample progress:', userProgress.slice(0, 2));

      const progressMap = new Map(
        userProgress.map(p => [p.questionId.toString(), p])
      );

      questions.forEach(question => {
        question.userProgress = progressMap.get(question._id.toString()) || null;
      });

      // Filter by solved/unsolved status
      if (status === 'solved') {
        const solvedQuestions = questions.filter(q => q.userProgress?.isSolved);
        console.log('Filtered to solved questions:', solvedQuestions.length);
        return res.json(solvedQuestions);
      } else if (status === 'unsolved') {
        const unsolvedQuestions = questions.filter(q => !q.userProgress?.isSolved);
        console.log('Filtered to unsolved questions:', unsolvedQuestions.length);
        return res.json(unsolvedQuestions);
      }
    }

    console.log('Sending all questions:', questions.length);
    res.json(questions);
  } catch (error) {
    console.error('Error in getQuestions:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

exports.getAllDays = async (req, res) => {
  try {
    console.log('Fetching all distinct days');
    
    // Get distinct days using distinct()
    const days = await Question.distinct('dayPlan');
    console.log('Raw days from distinct:', days);
    
    // Filter out -1 and sort
    const dayNumbers = days
      .filter(day => day !== -1)
      .sort((a, b) => a - b);
    
    console.log('Final day numbers:', dayNumbers);
    
    res.json(dayNumbers);
  } catch (error) {
    console.error('Error fetching days:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllTopics = async (req, res) => {
  try {
    const topics = await Question.distinct('topics');
    res.json(topics.sort());
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAllQuestions = async (req, res) => {
  try {
    // Check if the user is authorized
    if (req.user.email !== 'imbickydutta@gmail.com') {
      return res.status(403).json({ 
        message: 'Unauthorized: Only the admin user can delete all questions' 
      });
    }

    // Delete all questions
    const result = await Question.deleteMany({});
    
    // Also delete all associated user progress
    await UserProgress.deleteMany({});

    console.log(`Deleted ${result.deletedCount} questions and their associated progress by user: ${req.user.email}`);
    
    res.json({ 
      message: 'All questions and their progress have been deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting all questions:', error);
    res.status(500).json({ message: 'Error deleting questions' });
  }
}; 