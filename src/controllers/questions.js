const Question = require('../models/Question');
const UserProgress = require('../models/UserProgress');
const Progress = require('../models/Progress');

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
    console.error('Error fetching question by ID:', error); // More specific logging
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const { title, leetcodeSlug, difficulty, topics, dayPlan, leetcodeUrl, description, solution } = req.body;

    const question = new Question({
      title,
      leetcodeSlug,
      difficulty,
      topics,
      dayPlan,
      leetcodeUrl,
      description,
      solution
    });

    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question (controller):', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const { title, leetcodeSlug, difficulty, topics, dayPlan, leetcodeUrl, description, solution } = req.body;
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
    if (description) question.description = description;
    if (solution) question.solution = solution;

    await question.save();
    res.json(question);
  } catch (error) {
    console.error('Error updating question (controller):', error);
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
    console.error('Error deleting question (controller):', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const { topic, dayPlan, difficulty, status } = req.query; 
    const query = {};

    if (difficulty) query.difficulty = difficulty;

    if (topic) {
      query.topics = topic;
    } else if (req.query.topics) {
      query.topics = { $in: req.query.topics.split(',') };
    }

    if (dayPlan) {
      const dayNumber = Number(dayPlan);
      if (!isNaN(dayNumber)) {
        query.dayPlan = dayNumber;
      }
    }

    console.log('Query parameters received:', { topic, dayPlan, difficulty, status });
    console.log('MongoDB query being used:', query);

    let questions = await Question.find(query).lean();
    console.log('Number of questions found before progress merge:', questions.length);
    console.log('First few questions (pre-merge):', questions.slice(0, 2).map(q => ({
      title: q.title,
      dayPlan: q.dayPlan,
      dayPlanType: typeof q.dayPlan
    })));

    if (req.user) {
      console.log('User ID for progress lookup:', req.user._id); 

      const userProgress = await Progress.find({
        user: req.user._id,
        question: { $in: questions.map(q => q._id) }
      }).lean();

      console.log('Found user progress entries:', userProgress.length);
      console.log('Sample progress:', userProgress.slice(0, 2).map(p => ({
        questionId: p.question.toString(),
        isSolved: p.isSolved
      })));

      const progressMap = new Map(
        userProgress.map(p => [p.question.toString(), p])
      );

      questions.forEach(question => {
        const questionProgress = progressMap.get(question._id.toString());
        question.userProgress = questionProgress ? {
          isSolved: questionProgress.isSolved,
          solutionUrl: questionProgress.solutionUrl,
          notes: questionProgress.notes,
          solvedAt: questionProgress.solvedAt
        } : {
          isSolved: false,
          solutionUrl: '',
          notes: '',
          solvedAt: null
        };
      });

      console.log('Questions after progress merge (first 5):', questions.slice(0, 5).map(q => ({
        title: q.title,
        userProgressSolved: q.userProgress?.isSolved,
        userProgressExists: !!q.userProgress
      })));

      const preFilterSolvedCount = questions.filter(q => q.userProgress?.isSolved).length;
      const preFilterUnsolvedCount = questions.filter(q => !q.userProgress?.isSolved).length;
      console.log('Counts before final status filter: Solved -', preFilterSolvedCount, 'Unsolved -', preFilterUnsolvedCount);

      if (status === 'solved') {
        questions = questions.filter(q => q.userProgress?.isSolved);
        console.log('Filtered to solved questions:', questions.length);
      } else if (status === 'unsolved') {
        questions = questions.filter(q => !q.userProgress?.isSolved);
        console.log('Filtered to unsolved questions:', questions.length);
      }
    } else {
      console.log('No user authenticated. Status filter not applied.');
    }

    console.log('Sending final questions:', questions.length);
    res.json(questions);
  } catch (error) {
    console.error('Error in getQuestions (controller):', error);
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
    res.status(500).json({ message: 'Server error' });
  }
}; 