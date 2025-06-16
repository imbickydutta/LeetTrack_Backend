const { GoogleGenerativeAI } = require('@google/generative-ai');
const Question = require('../models/Question');
const Progress = require('../models/Progress');

// Debug environment variables
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Set' : 'Not set',
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set'
});

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getFallbackRecommendations = async (userId) => {
  try {
    // Get all questions ordered by dayPlan (excluding dayPlan -1)
    const allQuestions = await Question.find({ dayPlan: { $ne: -1 } }).sort({ dayPlan: 1 });
    console.log('Total questions found for fallback:', allQuestions.length);
    
    // Get user's solved questions
    const userProgress = await Progress.find({ user: userId, isSolved: true });
    console.log('User solved questions:', userProgress.length);
    const solvedQuestionIds = userProgress.map(progress => progress.question);
    
    // Filter out solved questions
    const unsolvedQuestions = allQuestions.filter(
      question => !solvedQuestionIds.some(id => id.equals(question._id))
    );
    console.log('Unsolved questions for fallback:', unsolvedQuestions.length);
    
    if (unsolvedQuestions.length === 0) {
      console.log('No unsolved questions found for fallback');
      return [];
    }

    // Log the first few questions to debug dayPlan values
    console.log('First few unsolved questions:', unsolvedQuestions.slice(0, 3).map(q => ({
      title: q.title,
      dayPlan: q.dayPlan
    })));
    
    // Get the lowest dayPlan value from unsolved questions
    const lowestDay = unsolvedQuestions.reduce((min, question) => {
      const dayPlan = question.dayPlan;
      return (dayPlan !== undefined && dayPlan !== null && (min === undefined || dayPlan < min)) ? dayPlan : min;
    }, undefined);

    console.log('Lowest day found:', lowestDay);
    
    if (lowestDay === undefined || lowestDay === null) {
      console.log('No valid day found in unsolved questions');
      return [];
    }
    
    // Get 3 questions from the lowest dayPlan
    const fallbackQuestions = unsolvedQuestions
      .filter(q => q.dayPlan === lowestDay)
      .slice(0, 3)
      .map(question => ({
        ...question.toObject(),
        reason: `Recommended from Day ${lowestDay} - Build your foundation with these fundamental problems`
      }));
    
    console.log('Fallback questions generated:', fallbackQuestions.length);
    return fallbackQuestions;
  } catch (error) {
    console.error('Error in fallback recommendations:', error);
    throw error;
  }
};

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Getting recommendations for user:', userId);

    // Get all questions
    const allQuestions = await Question.find({});
    console.log('Total questions found:', allQuestions.length);
    
    // Get user's progress
    const userProgress = await Progress.find({ user: userId }).populate('question');
    console.log('User progress found:', userProgress.length);
    
    // Separate solved and unsolved questions
    const solvedQuestions = userProgress
      .filter(progress => progress.isSolved)
      .map(progress => progress.question);
    
    console.log('Solved questions:', solvedQuestions.length);
    
    const unsolvedQuestions = allQuestions
      .filter(question => !solvedQuestions.some(solved => solved._id.equals(question._id)))
      .map(question => ({
        title: question.title,
        difficulty: question.difficulty,
        topics: question.topics,
        description: question.description
      }));

    console.log('Unsolved questions:', unsolvedQuestions.length);

    if (unsolvedQuestions.length === 0) {
      console.log('No unsolved questions available for recommendations');
      return res.json([]);
    }

    // Prepare context for AI
    const context = {
      solvedQuestions: solvedQuestions.map(q => ({
        title: q.title,
        difficulty: q.difficulty,
        topics: q.topics
      })),
      unsolvedQuestions: unsolvedQuestions
    };

    if (!process.env.GEMINI_API_KEY) {
      console.error('Environment variables:', process.env);
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Prepare prompt for Gemini
    const prompt = `As an AI coding mentor, analyze the following data and recommend the next 3 questions to solve:

Solved Questions:
${JSON.stringify(context.solvedQuestions, null, 2)}

Available Unsolved Questions:
${JSON.stringify(context.unsolvedQuestions, null, 2)}

Please recommend 3 questions that would be most beneficial to solve next, considering:
1. The user's current progress and skill level
2. Topic progression and learning path
3. Difficulty progression
4. Prerequisites and dependencies

Return only a JSON array of 3 question titles in this format:
{
  "recommendations": [
    {
      "title": "Question Title 1",
      "reason": "Brief explanation why this question is recommended"
    },
    {
      "title": "Question Title 2",
      "reason": "Brief explanation why this question is recommended"
    },
    {
      "title": "Question Title 3",
      "reason": "Brief explanation why this question is recommended"
    }
  ]
}`;

    console.log('Sending request to Gemini API...');
    
    try {
      // Get model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });

      // Get AI response
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('Received response from Gemini API');
      
      // Parse the response
      let recommendations;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
        const jsonStr = jsonMatch[1].trim();
        recommendations = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('Invalid response format from Gemini API');
      }

      if (!recommendations.recommendations || !Array.isArray(recommendations.recommendations)) {
        throw new Error('Invalid recommendations format from Gemini API');
      }

      // Get full question details for recommendations
      const recommendedQuestions = await Question.find({
        title: { $in: recommendations.recommendations.map(r => r.title) }
      });

      if (recommendedQuestions.length === 0) {
        console.log('No matching questions found for AI recommendations, using fallback');
        const fallbackRecommendations = await getFallbackRecommendations(userId);
        return res.json(fallbackRecommendations);
      }

      // Combine question details with AI reasons
      const finalRecommendations = recommendedQuestions.map(question => {
        const recommendation = recommendations.recommendations.find(r => r.title === question.title);
        return {
          ...question.toObject(),
          reason: recommendation.reason
        };
      });

      console.log('Successfully generated AI recommendations');
      res.json(finalRecommendations);
    } catch (aiError) {
      console.error('AI recommendation failed, using fallback:', aiError);
      const fallbackRecommendations = await getFallbackRecommendations(userId);
      res.json(fallbackRecommendations);
    }
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    res.status(500).json({ 
      error: 'Failed to get recommendations',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getRecommendations
}; 