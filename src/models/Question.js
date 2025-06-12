const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  leetcodeSlug: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  topics: [{ type: String }],
  dayPlan: { type: Number },
  leetcodeUrl: { type: String, required: true },
  description: {
    type: String
  },
  solution: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
questionSchema.index({ dayPlan: 1 });
questionSchema.index({ topics: 1 });
questionSchema.index({ difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema); 