const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  isSolved: {
    type: Boolean,
    default: false
  },
  solutionUrl: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  solvedAt: {
    type: Date
  },
  reviewStatus: {
    type: String,
    enum: ['pending', 'correct', 'incorrect', 'needs_optimization'],
    default: 'pending'
  },
  reviewFeedback: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index to ensure one progress entry per user-question pair
progressSchema.index({ user: 1, question: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema); 