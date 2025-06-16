const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  isSolved: {
    type: Boolean,
    default: false
  },
  solutionUrl: {
    type: String
  },
  code: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  },
  notes: {
    type: String,
    default: ''
  },
  bookmarked: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure unique user-question combination
userProgressSchema.index({ userId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('UserProgress', userProgressSchema); 